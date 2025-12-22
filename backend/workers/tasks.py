"""
Celery Tasks - Audio Separation Workers
With SAM Audio Lite optimization for low VRAM usage
"""
import os
import sys
import gc
from pathlib import Path
from typing import Optional, List

from celery import current_task

from workers.celery_app import celery_app

# Add parent directory to path for SAM Audio imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

# Global model cache to avoid reloading
_model_cache = {}
_processor_cache = {}


def update_progress(progress: int, message: str):
    """Update task progress"""
    current_task.update_state(
        state="PROGRESS",
        meta={"progress": progress, "message": message}
    )


def create_lite_model(model_name: str, hf_token: str = None):
    """
    Create a memory-optimized SAM Audio model by removing unused components.
    
    Reduces VRAM usage from ~11GB to ~4-5GB by:
    - Replacing vision_encoder with a dummy
    - Disabling visual_ranker
    - Disabling text_ranker
    - Disabling span_predictor
    """
    import torch
    from sam_audio import SAMAudio, SAMAudioProcessor
    
    print(f"Loading {model_name} (lite mode)...")
    
    # Load model
    if hf_token:
        model = SAMAudio.from_pretrained(model_name, token=hf_token)
    else:
        model = SAMAudio.from_pretrained(model_name)
    
    processor = SAMAudioProcessor.from_pretrained(model_name)
    
    print("Optimizing model for low VRAM...")
    
    # Get vision encoder dim before deleting
    vision_dim = model.vision_encoder.dim if hasattr(model.vision_encoder, 'dim') else 1024
    
    # Delete heavy components
    del model.vision_encoder
    gc.collect()
    
    # Store the dim for _get_video_features
    model._vision_encoder_dim = vision_dim
    
    # Replace _get_video_features to not use vision_encoder
    def _get_video_features_lite(self, video, audio_features):
        B, T, _ = audio_features.shape
        return audio_features.new_zeros(B, self._vision_encoder_dim, T)
    
    import types
    model._get_video_features = types.MethodType(_get_video_features_lite, model)
    
    # Delete rankers
    if hasattr(model, 'visual_ranker') and model.visual_ranker is not None:
        del model.visual_ranker
        model.visual_ranker = None
        gc.collect()
    
    if hasattr(model, 'text_ranker') and model.text_ranker is not None:
        del model.text_ranker
        model.text_ranker = None
        gc.collect()
    
    # Delete span predictor
    if hasattr(model, 'span_predictor') and model.span_predictor is not None:
        del model.span_predictor
        model.span_predictor = None
        gc.collect()
    
    if hasattr(model, 'span_predictor_transform') and model.span_predictor_transform is not None:
        del model.span_predictor_transform
        model.span_predictor_transform = None
        gc.collect()
    
    # Force garbage collection
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    print("Model optimization complete!")
    
    return model, processor


def get_or_load_lite_model(model_name: str, hf_token: str, device: str, dtype):
    """Get cached lite model or create it"""
    import torch
    
    # Include dtype in cache key to ensure correct model is loaded
    dtype_str = "bf16" if dtype == torch.bfloat16 else "fp32"
    cache_key = f"{model_name}_lite_{device}_{dtype_str}"
    
    print(f"[DEBUG] Looking for cached model with key: {cache_key}")
    print(f"[DEBUG] Current cache keys: {list(_model_cache.keys())}")
    
    if cache_key not in _model_cache:
        print(f"[DEBUG] Cache miss - creating new lite model")
        model, processor = create_lite_model(model_name, hf_token)
        
        print(f"[DEBUG] Converting model to {device} with dtype {dtype}")
        model = model.eval().to(device, dtype)
        
        _model_cache[cache_key] = model
        _processor_cache[model_name] = processor
        
        if torch.cuda.is_available():
            print(f"[DEBUG] GPU Memory after loading: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
    else:
        print(f"[DEBUG] Cache hit - using existing model")
    
    return _model_cache[cache_key], _processor_cache[model_name]



def cleanup_gpu_memory():
    """Clean up GPU memory after task"""
    import torch
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()


@celery_app.task(bind=True)
def separate_audio_task(
    self,
    audio_path: str,
    description: str,
    mode: str = "extract",
    anchors: Optional[List] = None,
    model_size: str = "base"  # Changed default to base (better quality than small)
):
    """
    Separate audio using SAM Audio Lite (memory optimized)
    
    Args:
        audio_path: Path to input audio file
        description: Text prompt for separation
        mode: "extract" or "remove"
        anchors: Optional temporal anchors [["+", start, end], ...]
        model_size: Model size (small/base/large)
    
    Returns:
        Dictionary with paths to output files
    """
    import torch
    import torchaudio
    from huggingface_hub import login
    
    task_id = self.request.id
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.bfloat16 if device == "cuda" else torch.float32
    
    try:
        update_progress(5, "Initializing...")
        
        # Load HuggingFace token
        backend_dir = Path(__file__).parent.parent
        token_file = backend_dir / ".hf_token"
        if token_file.exists():
            with open(token_file, "r") as f:
                hf_token = f.read().strip()
            login(token=hf_token)
        else:
            raise Exception("HuggingFace token not found. Please authenticate first.")
        
        # Select model based on size
        model_name = f"facebook/sam-audio-{model_size}"
        
        update_progress(10, f"Loading {model_name} (lite mode)...")
        
        # Clean up before loading
        cleanup_gpu_memory()
        
        # Load lite model (with caching)
        model, processor = get_or_load_lite_model(model_name, hf_token, device, dtype)
        
        update_progress(30, "Processing audio...")
        
        # Prepare batch - NO anchors in lite mode (span_predictor disabled)
        batch = processor(
            audios=[audio_path],
            descriptions=[description]
        ).to(device)
        
        update_progress(50, "Running separation...")
        
        # Run separation with automatic mixed precision
        # predict_spans=False because we removed span_predictor
        with torch.inference_mode():
            with torch.cuda.amp.autocast(enabled=(device == "cuda")):
                result = model.separate(
                    batch,
                    predict_spans=False,  # Disabled in lite mode
                    reranking_candidates=1
                )

        
        update_progress(80, "Saving results...")
        
        # Get sample rate
        sample_rate = processor.audio_sampling_rate
        
        # Output paths
        output_base = OUTPUT_DIR / task_id
        original_path = output_base.with_suffix(".original.wav")
        ghost_path = output_base.with_suffix(".ghost.wav")
        clean_path = output_base.with_suffix(".clean.wav")
        
        # Load original audio for saving
        original_audio, orig_sr = torchaudio.load(audio_path)
        if orig_sr != sample_rate:
            resampler = torchaudio.transforms.Resample(orig_sr, sample_rate)
            original_audio = resampler(original_audio)
        
        # Save files based on mode
        torchaudio.save(str(original_path), original_audio, sample_rate)
        
        # Get the first result (batch size 1) and convert to float32 for saving
        target_audio = result.target[0].float().unsqueeze(0).cpu()
        residual_audio = result.residual[0].float().unsqueeze(0).cpu()

        
        if mode == "extract":
            # Ghost = target (what we extracted)
            # Clean = residual (everything else)
            torchaudio.save(str(ghost_path), target_audio, sample_rate)
            torchaudio.save(str(clean_path), residual_audio, sample_rate)
        else:
            # Remove mode: same as extract for now
            torchaudio.save(str(ghost_path), target_audio, sample_rate)
            torchaudio.save(str(clean_path), residual_audio, sample_rate)
        
        update_progress(100, "Complete!")
        
        # Aggressive cleanup after task
        print(f"[DEBUG] Cleaning up GPU memory...")
        del batch
        del result
        del target_audio
        del residual_audio
        del original_audio
        
        gc.collect()
        cleanup_gpu_memory()
        
        if torch.cuda.is_available():
            print(f"[DEBUG] GPU Memory after cleanup: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
        
        return {
            "original_path": str(original_path),
            "ghost_path": str(ghost_path),
            "clean_path": str(clean_path),
            "description": description,
            "mode": mode
        }
        
    except Exception as e:
        gc.collect()
        cleanup_gpu_memory()
        raise Exception(f"Separation failed: {str(e)}")



@celery_app.task(bind=True)
def match_pattern_task(
    self,
    audio_path: str,
    sample_path: str,
    threshold: float = 0.85,
    model_size: str = "base"
):
    """
    Find and remove sounds similar to a sample
    
    Args:
        audio_path: Path to input audio file
        sample_path: Path to sample audio file
        threshold: Similarity threshold (0-1)
        model_size: Model size (small/base/large)
    
    Returns:
        Dictionary with paths to output files and matched segments
    """
    # TODO: Implement pattern matching with CLAP embeddings
    # This is a placeholder for MVP v1.0
    
    update_progress(50, "Pattern matching not yet implemented in MVP")
    
    return {
        "status": "not_implemented",
        "message": "Pattern matching will be available in v1.1"
    }
