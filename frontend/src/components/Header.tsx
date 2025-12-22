"use client";

import { Sun, Moon, Ghost, User, LogOut } from "lucide-react";

interface HeaderProps {
    isAuthenticated: boolean;
    onAuthClick: () => void;
    isDarkMode: boolean;
    onThemeToggle: () => void;
}

export default function Header({
    isAuthenticated,
    onAuthClick,
    isDarkMode,
    onThemeToggle
}: HeaderProps) {
    return (
        <header
            className="sticky top-0 z-50 glass-card"
            style={{
                borderRadius: 0,
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                width: "100%",
            }}
        >
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "16px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}
            >
                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                        className="animate-pulse-glow"
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "linear-gradient(135deg, var(--ghost-primary), var(--ghost-accent))"
                        }}
                    >
                        <Ghost className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--text-primary)" }}>
                            Audio<span className="gradient-text">Ghost</span>
                        </h1>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            v1.0 MVP
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* Theme Toggle */}
                    <button
                        onClick={onThemeToggle}
                        style={{
                            padding: "8px",
                            borderRadius: "8px",
                            background: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.3s ease"
                        }}
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* Auth Button */}
                    {isAuthenticated ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                background: "var(--bg-tertiary)"
                            }}
                        >
                            <div
                                style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "linear-gradient(135deg, var(--ghost-success), var(--ghost-secondary))"
                                }}
                            >
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Connected</span>
                        </div>
                    ) : (
                        <button
                            onClick={onAuthClick}
                            className="btn-primary"
                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                        >
                            <Ghost className="w-4 h-4" />
                            Connect HuggingFace
                        </button>
                    )}
                </div>
            </div>
        </header>
    );

}
