"""
SAM Audio Lite - Lightweight version for low VRAM usage (4-6GB)
Disables vision_encoder, rankers, and span_predictor to reduce memory
NO CHUNKING VERSION - Full audio processing for better quality
"""
import torch
import gc


def create_lite_model(model_name: str = "facebook/sam-audio-base", token: str = None):
    """
    Create a memory-optimized SAM Audio model by removing unused components.
    
    This can reduce VRAM usage from ~11GB to ~4GB by:
    - Replacing vision_encoder with a dummy (saves ~2GB)
    - Disabling visual_ranker (saves ~2GB)
    - Disabling text_ranker (saves ~2GB)
    - Disabling span_predictor (saves ~1-2GB)
    
    Returns:
        model: Optimized SAM Audio model
        processor: SAM Audio processor
    """
    from sam_audio import SAMAudio, SAMAudioProcessor
    
    print(f"Loading {model_name}...")
    
    # Load model
    if token:
        model = SAMAudio.from_pretrained(model_name, token=token)
    else:
        model = SAMAudio.from_pretrained(model_name)
    
    processor = SAMAudioProcessor.from_pretrained(model_name)
    
    print("Optimizing model for low VRAM...")
    
    # Get vision encoder dim before deleting
    vision_dim = model.vision_encoder.dim if hasattr(model.vision_encoder, 'dim') else 1024
    
    # Delete heavy components
    del model.vision_encoder
    gc.collect()
    print("  - Removed vision_encoder")
    
    # Store the dim for _get_video_features
    model._vision_encoder_dim = vision_dim
    
    # Replace _get_video_features to not use vision_encoder
    def _get_video_features_lite(self, video, audio_features):
        B, T, _ = audio_features.shape
        # Always return zeros since we're not using video
        return audio_features.new_zeros(B, self._vision_encoder_dim, T)
    
    # Bind the new method
    import types
    model._get_video_features = types.MethodType(_get_video_features_lite, model)
    
    # Delete rankers
    if hasattr(model, 'visual_ranker') and model.visual_ranker is not None:
        del model.visual_ranker
        model.visual_ranker = None
        gc.collect()
        print("  - Removed visual_ranker")
    
    if hasattr(model, 'text_ranker') and model.text_ranker is not None:
        del model.text_ranker
        model.text_ranker = None
        gc.collect()
        print("  - Removed text_ranker")
    
    # Delete span predictor
    if hasattr(model, 'span_predictor') and model.span_predictor is not None:
        del model.span_predictor
        model.span_predictor = None
        gc.collect()
        print("  - Removed span_predictor")
    
    if hasattr(model, 'span_predictor_transform') and model.span_predictor_transform is not None:
        del model.span_predictor_transform
        model.span_predictor_transform = None
        gc.collect()
        print("  - Removed span_predictor_transform")
    
    # Force garbage collection
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    print("Model optimization complete!")
    
    return model, processor


if __name__ == "__main__":
    import torchaudio
    from pathlib import Path
    
    # Setup
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    dtype = torch.bfloat16
    print(f"Using device: {device}, dtype: {dtype}")
    
    # Clear GPU memory
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()
        print(f"GPU Memory before loading: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
    
    # Create lite model
    model, processor = create_lite_model()
    model = model.eval().to(device, dtype)
    
    if torch.cuda.is_available():
        print(f"GPU Memory after loading: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
    
    # Test audio
    test_audio = "output_original.wav"
    description = "A man speaking"
    
    if not Path(test_audio).exists():
        print(f"\nNo test file at {test_audio}, creating test tone...")
        sample_rate = 16000
        duration = 10
        t = torch.linspace(0, duration, int(sample_rate * duration))
        audio = 0.5 * torch.sin(2 * 3.14159 * 200 * t)
        audio = audio.unsqueeze(0)
        test_audio = "test_audio.wav"
        torchaudio.save(test_audio, audio, sample_rate)
    
    print(f"\nProcessing: {test_audio}")
    print(f"Description: '{description}'")
    
    # Prepare inputs - NO CHUNKING, process full audio
    print("\nPreparing batch...")
    batch = processor(
        audios=[test_audio],
        descriptions=[description],
    ).to(device)
    
    # Run separation
    print("Running separation...")
    if torch.cuda.is_available():
        print(f"GPU Memory before separation: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
    
    with torch.inference_mode(), torch.autocast(device_type=device, dtype=dtype):
        result = model.separate(
            batch, 
            predict_spans=False,
            reranking_candidates=1
        )
    
    if torch.cuda.is_available():
        print(f"GPU Memory after separation: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
    
    # Save results
    print("\nSaving results...")
    sample_rate = processor.audio_sampling_rate
    
    target_audio = result.target[0].float().unsqueeze(0).cpu()
    residual_audio = result.residual[0].float().unsqueeze(0).cpu()
    
    torchaudio.save("output_target.wav", target_audio, sample_rate)
    torchaudio.save("output_residual.wav", residual_audio, sample_rate)
    
    # Cleanup
    del batch, result
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()
        print(f"GPU Memory after cleanup: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
    
    print("\nDone!")
    print("- output_target.wav: Extracted audio")
    print("- output_residual.wav: Residual audio")
