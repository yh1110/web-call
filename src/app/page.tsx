"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamically import VideoConference to avoid SSR issues
const VideoConference = dynamic(() => import("@/components/VideoConference"), {
  ssr: false,
});

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function Home() {
  const [roomName, setRoomName] = useState("");
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleCreateRoom = useCallback(() => {
    const newCode = generateRoomCode();
    setRoomName(newCode);
  }, []);

  const handleJoinRoom = useCallback(async () => {
    if (!roomName.trim() || !userName.trim()) {
      setError("ルーム名と名前を入力してください");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName.toUpperCase().trim(),
          participantName: userName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "参加に失敗しました");
      }

      const { token } = await response.json();
      setToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setIsJoining(false);
    }
  }, [roomName, userName]);

  const handleDisconnect = useCallback(() => {
    setToken("");
    setIsJoining(false);
  }, []);

  // If connected, show the video conference
  if (token) {
    return (
      <VideoConference
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ""}
        roomName={roomName.toUpperCase().trim()}
        onDisconnect={handleDisconnect}
      />
    );
  }

  // Landing page
  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight">
            MetaLive
          </span>
        </div>
        <div className="hidden sm:block text-sm text-muted">
          最大20人 • 音声通話 • 画面共有
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto">
        <div className="w-full max-w-md space-y-6 sm:space-y-8 animate-fade-in">
          {/* Title */}
          <div className="text-center space-y-2 sm:space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Meta
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Live
              </span>
            </h1>
            <p className="text-muted text-base sm:text-lg">
              シンプルな音声通話と画面共有
            </p>
          </div>

          {/* Join form */}
          <div className="bg-secondary/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border shadow-2xl shadow-black/20 gradient-border">
            <div className="space-y-5">
              {/* Room code input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">
                  ルームコード
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-lg font-mono tracking-widest placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    maxLength={6}
                  />
                  <button
                    onClick={handleCreateRoom}
                    className="px-4 py-3 bg-secondary hover:bg-secondary-hover border border-border rounded-xl transition-all hover:border-primary group"
                    title="新しいルームを作成"
                  >
                    <svg
                      className="w-5 h-5 text-muted group-hover:text-primary transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Name input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">
                  あなたの名前
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="名前を入力"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  maxLength={20}
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 text-danger text-sm bg-danger/10 px-4 py-3 rounded-xl">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Join button */}
              <button
                onClick={handleJoinRoom}
                disabled={isJoining || !roomName.trim() || !userName.trim()}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                {isJoining ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    接続中...
                  </span>
                ) : (
                  "ルームに参加"
                )}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-secondary border border-border flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <p className="text-xs text-muted">高品質音声</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-secondary border border-border flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-xs text-muted">画面共有</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-secondary border border-border flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-xs text-muted">最大20人</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted border-t border-border/50">
        MetaLive - シンプルなグループ通話
      </footer>
    </div>
  );
}
