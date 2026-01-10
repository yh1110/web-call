"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import VideoConference to avoid SSR issues
const VideoConference = dynamic(() => import("@/components/VideoConference"), {
  ssr: false,
});

const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string)?.toUpperCase() || "";

  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const [inputName, setInputName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 名前入力して参加
  const handleJoin = useCallback(async () => {
    if (!inputName.trim()) {
      setError("名前を入力してください");
      return;
    }

    if (!ROOM_CODE_REGEX.test(roomCode)) {
      setError("無効なルームコードです");
      return;
    }

    setIsConnecting(true);
    setError("");

    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomCode,
          participantName: inputName.trim(),
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
      setIsConnecting(false);
    }
  }, [inputName, roomCode]);

  // 初期ロード完了
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // 切断時の処理
  const handleDisconnect = useCallback(() => {
    setToken("");
    setIsConnecting(false);
    // ルームページには留まる（名前入力に戻る）
  }, []);

  // 初期ロード中
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-bg">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <svg
              className="w-8 h-8 text-white"
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
          <p className="text-muted">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ルームコードが無効な場合
  if (!ROOM_CODE_REGEX.test(roomCode)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-bg p-4">
        <div className="bg-secondary/80 backdrop-blur-sm rounded-2xl p-6 border border-border shadow-2xl shadow-black/20 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-danger/20 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-danger"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">無効なルームコード</h1>
          <p className="text-muted mb-6">
            ルームコードは英大文字と数字6桁で構成されます
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all"
          >
            ホームに戻る
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-secondary hover:bg-secondary-hover border border-border rounded-xl transition-all text-muted hover:text-foreground"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  // 名前入力画面（トークンがなければ常に表示）
  if (!token) {
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
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">ルームに参加</h1>
              <p className="text-muted">
                ルームコード:{" "}
                <span className="font-mono text-foreground">{roomCode}</span>
              </p>
            </div>

            <div className="bg-secondary/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border shadow-2xl shadow-black/20">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">
                    あなたの名前
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="名前を入力"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    maxLength={20}
                    autoFocus
                  />
                </div>

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

                <button
                  onClick={handleJoin}
                  disabled={!inputName.trim() || isConnecting}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  {isConnecting ? (
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
                    "参加する"
                  )}
                </button>

                <button
                  onClick={() => router.push("/")}
                  className="w-full py-3 bg-secondary hover:bg-secondary-hover border border-border rounded-xl transition-all text-muted hover:text-foreground"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 通話画面
  return (
    <VideoConference
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ""}
      roomName={roomCode}
      onDisconnect={handleDisconnect}
    />
  );
}
