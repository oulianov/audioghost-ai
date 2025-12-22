"use client";

import { useState, useRef } from "react";
import {
    Play,
    Pause,
    Download,
    Volume2,
    VolumeX,
    RefreshCw,
    Ghost,
    Leaf,
    type LucideIcon
} from "lucide-react";

interface StemMixerProps {
    taskId: string;
    description: string;
    onNewSeparation: () => void;
}

interface Track {
    id: "original" | "ghost" | "clean";
    label: string;
    icon: LucideIcon;
    color: string;
    description: string;
}

const TRACKS: Track[] = [

    {
        id: "original",
        label: "Original",
        icon: Volume2,
        color: "#8B5CF6",
        description: "Original audio file"
    },
    {
        id: "ghost",
        label: "Ghost",
        icon: Ghost,
        color: "#F472B6",
        description: "Extracted/separated sound"
    },
    {
        id: "clean",
        label: "Clean",
        icon: Leaf,
        color: "#10B981",
        description: "Audio with sound removed"
    },
];

export default function StemMixer({ taskId, description, onNewSeparation }: StemMixerProps) {
    const [playingTrack, setPlayingTrack] = useState<string | null>(null);
    const [volumes, setVolumes] = useState<Record<string, number>>({
        original: 80,
        ghost: 80,
        clean: 80,
    });
    const [muted, setMuted] = useState<Record<string, boolean>>({
        original: false,
        ghost: false,
        clean: false,
    });

    const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

    const getAudioUrl = (trackId: string) => {
        return `http://localhost:8000/api/tasks/${taskId}/download/${trackId}`;
    };

    const togglePlay = (trackId: string) => {
        const audio = audioRefs.current[trackId];
        if (!audio) return;

        if (playingTrack === trackId) {
            audio.pause();
            setPlayingTrack(null);
        } else {
            // Stop other tracks
            Object.entries(audioRefs.current).forEach(([id, a]) => {
                if (a && id !== trackId) a.pause();
            });
            audio.play();
            setPlayingTrack(trackId);
        }
    };

    const handleVolumeChange = (trackId: string, value: number) => {
        setVolumes(prev => ({ ...prev, [trackId]: value }));
        const audio = audioRefs.current[trackId];
        if (audio) {
            audio.volume = value / 100;
        }
    };

    const toggleMute = (trackId: string) => {
        setMuted(prev => ({ ...prev, [trackId]: !prev[trackId] }));
        const audio = audioRefs.current[trackId];
        if (audio) {
            audio.muted = !muted[trackId];
        }
    };

    const downloadTrack = (trackId: string, label: string) => {
        const link = document.createElement("a");
        link.href = getAudioUrl(trackId);
        link.download = `${taskId}_${label.toLowerCase()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
                        🎉 Separation Complete!
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Separated: "{description}"
                    </p>
                </div>
                <button
                    onClick={onNewSeparation}
                    className="btn-secondary flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    New Separation
                </button>
            </div>

            {/* Tracks */}
            <div className="space-y-4">
                {TRACKS.map((track) => {
                    const TrackIcon = track.icon;
                    const isPlaying = playingTrack === track.id;
                    const isMuted = muted[track.id];

                    return (
                        <div
                            key={track.id}
                            className={`stem-track ${track.id}`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Track Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${track.color}20` }}
                                >
                                    <TrackIcon className="w-6 h-6" stroke={track.color} />
                                </div>




                                {/* Track Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium" style={{ color: "var(--text-primary)" }}>
                                            {track.label}
                                        </h4>
                                        <span
                                            className="text-xs px-2 py-0.5 rounded-full"
                                            style={{ background: `${track.color}20`, color: track.color }}
                                        >
                                            {track.description}
                                        </span>
                                    </div>

                                    {/* Volume Slider */}
                                    <div className="flex items-center gap-3 mt-2">
                                        <button
                                            onClick={() => toggleMute(track.id)}
                                            className="p-1"
                                            style={{ color: isMuted ? "var(--ghost-error)" : "var(--text-muted)" }}
                                        >
                                            {isMuted ? (
                                                <VolumeX className="w-4 h-4" />
                                            ) : (
                                                <Volume2 className="w-4 h-4" />
                                            )}
                                        </button>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={volumes[track.id]}
                                            onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value))}
                                            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                                            style={{
                                                background: `linear-gradient(to right, ${track.color} ${volumes[track.id]}%, var(--bg-tertiary) ${volumes[track.id]}%)`
                                            }}
                                        />
                                        <span
                                            className="text-xs font-mono w-8"
                                            style={{ color: "var(--text-muted)" }}
                                        >
                                            {volumes[track.id]}%
                                        </span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => togglePlay(track.id)}
                                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                                        style={{
                                            background: isPlaying
                                                ? `linear-gradient(135deg, ${track.color}, ${track.color}cc)`
                                                : "var(--bg-tertiary)"
                                        }}
                                    >
                                        {isPlaying ? (
                                            <Pause className="w-5 h-5 text-white" />
                                        ) : (
                                            <Play className="w-5 h-5 ml-0.5" style={{ color: track.color }} />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => downloadTrack(track.id, track.label)}
                                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                                        style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Hidden Audio Element */}
                            <audio
                                ref={(el) => { audioRefs.current[track.id] = el; }}
                                src={getAudioUrl(track.id)}
                                onEnded={() => setPlayingTrack(null)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Download All */}
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--glass-border)" }}>
                <button
                    onClick={() => {
                        TRACKS.forEach((track) => downloadTrack(track.id, track.label));
                    }}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    Download All Stems
                </button>
            </div>
        </div>
    );
}
