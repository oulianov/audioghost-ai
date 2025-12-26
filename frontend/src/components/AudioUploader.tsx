"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Music, Video } from "lucide-react";

interface AudioUploaderProps {
    onFileUpload: (file: File) => void;
}

export default function AudioUploader({ onFileUpload }: AudioUploaderProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file && isMediaFile(file)) {
            onFileUpload(file);
        }
    }, [onFileUpload]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && isMediaFile(file)) {
            onFileUpload(file);
        }
    };

    const isMediaFile = (file: File) => {
        // Accept audio files
        if (file.type.startsWith("audio/") ||
            /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(file.name)) {
            return true;
        }
        // Accept video files
        if (file.type.startsWith("video/") ||
            /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name)) {
            return true;
        }
        return false;
    };

    return (
        <div
            className={`upload-zone ${isDragOver ? "dragover" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            <div className="flex flex-col items-center">
                {/* Icon */}
                <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 animate-float"
                    style={{
                        background: isDragOver
                            ? "linear-gradient(135deg, var(--ghost-primary), var(--ghost-accent))"
                            : "var(--bg-tertiary)"
                    }}
                >
                    {isDragOver ? (
                        <Music className="w-10 h-10 text-white" />
                    ) : (
                        <Upload className="w-10 h-10" style={{ color: "var(--ghost-primary)" }} />
                    )}
                </div>

                {/* Text */}
                <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {isDragOver ? "Drop your file here" : "Upload Audio or Video"}
                </h3>
                <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                    Drag & drop or click to browse
                </p>

                {/* Supported formats */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    {["MP3", "WAV", "FLAC", "MP4", "WebM", "MOV"].map((format) => (
                        <span
                            key={format}
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                                background: "var(--bg-tertiary)",
                                color: "var(--text-muted)"
                            }}
                        >
                            {format}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
