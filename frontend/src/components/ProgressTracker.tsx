"use client";

import { Ghost, Loader2 } from "lucide-react";

interface ProgressTrackerProps {
    status: "pending" | "processing";
    progress: number;
    message: string;
}

export default function ProgressTracker({ status, progress, message }: ProgressTrackerProps) {
    return (
        <div className="glass-card p-8">
            <div className="flex flex-col items-center">
                {/* Animated Ghost */}
                <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 animate-pulse-glow"
                    style={{ background: "linear-gradient(135deg, var(--ghost-primary), var(--ghost-accent))" }}
                >
                    {status === "pending" ? (
                        <Ghost className="w-12 h-12 text-white animate-bounce" />
                    ) : (
                        <Loader2 className="w-12 h-12 text-white animate-spin" />
                    )}
                </div>

                {/* Status */}
                <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {status === "pending" ? "Waiting in Queue..." : "Processing Audio..."}
                </h3>

                <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
                    {message}
                </p>

                {/* Progress Bar */}
                <div className="w-full max-w-md">
                    <div className="flex justify-between text-sm mb-2">
                        <span style={{ color: "var(--text-muted)" }}>Progress</span>
                        <span style={{ color: "var(--ghost-primary)" }}>{progress}%</span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Steps */}
                <div className="mt-8 w-full max-w-md">
                    <div className="flex flex-col gap-3">
                        {[
                            { step: "Loading model", threshold: 10 },
                            { step: "Processing audio", threshold: 30 },
                            { step: "Running separation", threshold: 50 },
                            { step: "Saving results", threshold: 80 },
                        ].map(({ step, threshold }) => (
                            <div
                                key={step}
                                className="flex items-center gap-3 text-sm"
                            >
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: progress >= threshold
                                            ? "linear-gradient(135deg, var(--ghost-success), var(--ghost-secondary))"
                                            : "var(--bg-tertiary)"
                                    }}
                                >
                                    {progress >= threshold ? (
                                        <span className="text-white text-xs">✓</span>
                                    ) : progress >= threshold - 20 ? (
                                        <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--ghost-primary)" }} />
                                    ) : (
                                        <span style={{ color: "var(--text-muted)" }}>○</span>
                                    )}
                                </div>
                                <span
                                    style={{
                                        color: progress >= threshold
                                            ? "var(--text-primary)"
                                            : "var(--text-muted)"
                                    }}
                                >
                                    {step}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
