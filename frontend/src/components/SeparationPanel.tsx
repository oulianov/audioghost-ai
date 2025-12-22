"use client";

import { useState } from "react";
import {
    Mic,
    Music,
    Volume2,
    Trash2,
    Sparkles,
    Clock,
    AlertCircle
} from "lucide-react";

interface SeparationPanelProps {
    onSeparate: (description: string, mode: "extract" | "remove") => void;
    isAuthenticated: boolean;
    onAuthRequired: () => void;
    hasRegion: boolean;
}

const QUICK_PROMPTS = [
    { icon: Mic, label: "Voice", prompt: "singing voice", color: "#8B5CF6" },
    { icon: Music, label: "Music", prompt: "background music", color: "#06B6D4" },
    { icon: Volume2, label: "Drums", prompt: "drums and percussion", color: "#F472B6" },
    { icon: Sparkles, label: "Guitar", prompt: "acoustic guitar", color: "#10B981" },
    { icon: Volume2, label: "Bass", prompt: "bass", color: "#F59E0B" },
    { icon: Volume2, label: "Piano", prompt: "piano", color: "#EF4444" },
];

export default function SeparationPanel({
    onSeparate,
    isAuthenticated,
    onAuthRequired,
    hasRegion
}: SeparationPanelProps) {
    const [customPrompt, setCustomPrompt] = useState("");
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
    const [mode, setMode] = useState<"extract" | "remove">("extract");

    const handleQuickSelect = (prompt: string) => {
        setSelectedPrompt(prompt);
        setCustomPrompt(prompt);
    };

    const handleSeparate = () => {
        if (!isAuthenticated) {
            onAuthRequired();
            return;
        }

        const prompt = customPrompt || selectedPrompt;
        if (!prompt) return;

        onSeparate(prompt, mode);
    };

    const activePrompt = customPrompt || selectedPrompt;

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
                    Separation Controls
                </h3>

                {hasRegion && (
                    <div
                        className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                        style={{
                            background: "rgba(244, 114, 182, 0.2)",
                            color: "var(--ghost-accent)"
                        }}
                    >
                        <Clock className="w-4 h-4" />
                        Temporal Lock Active
                    </div>
                )}
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setMode("extract")}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${mode === "extract" ? "text-white" : ""
                        }`}
                    style={{
                        background: mode === "extract"
                            ? "linear-gradient(135deg, var(--ghost-primary), #7C3AED)"
                            : "var(--bg-tertiary)",
                        color: mode === "extract" ? "white" : "var(--text-secondary)"
                    }}
                >
                    ✨ Extract Sound
                </button>
                <button
                    onClick={() => setMode("remove")}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${mode === "remove" ? "text-white" : ""
                        }`}
                    style={{
                        background: mode === "remove"
                            ? "linear-gradient(135deg, var(--ghost-error), #DC2626)"
                            : "var(--bg-tertiary)",
                        color: mode === "remove" ? "white" : "var(--text-secondary)"
                    }}
                >
                    🗑️ Remove Sound
                </button>
            </div>

            {/* Quick Prompts */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                    Quick Select
                </label>
                <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map(({ icon: Icon, label, prompt, color }) => (
                        <button
                            key={prompt}
                            onClick={() => handleQuickSelect(prompt)}
                            className={`quick-tag ${selectedPrompt === prompt && !customPrompt ? "selected" : ""}`}
                            style={
                                selectedPrompt === prompt && !customPrompt
                                    ? { background: `linear-gradient(135deg, ${color}, ${color}dd)` }
                                    : {}
                            }
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Prompt */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                    Or describe the sound you want to {mode}
                </label>
                <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => {
                        setCustomPrompt(e.target.value);
                        setSelectedPrompt(null);
                    }}
                    placeholder="e.g., police siren, crowd noise, background conversation..."
                    className="input-ghost"
                />
            </div>

            {/* Auth Warning */}
            {!isAuthenticated && (
                <div
                    className="mb-6 p-4 rounded-xl flex items-start gap-3"
                    style={{
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.3)"
                    }}
                >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--ghost-warning)" }} />
                    <div>
                        <p className="font-medium" style={{ color: "var(--ghost-warning)" }}>
                            Authentication Required
                        </p>
                        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                            Connect your HuggingFace account to use SAM Audio models.
                        </p>
                    </div>
                </div>
            )}

            {/* Action Button */}
            <button
                onClick={handleSeparate}
                disabled={!activePrompt}
                className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {mode === "extract" ? "✨ Extract" : "🗑️ Remove"} "{activePrompt || "..."}"
            </button>

            {/* Info */}
            <p className="mt-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                Processing typically takes 30-60 seconds depending on audio length
            </p>
        </div>
    );
}
