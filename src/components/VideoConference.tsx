"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  useTracks,
  ParticipantTile,
  TrackRefContext,
  useParticipants,
  useLocalParticipant,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import {
  Track,
  RemoteTrackPublication,
  RemoteParticipant,
} from "livekit-client";
import {
  useCallback,
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";

// 参加者ごとの音量を管理するコンテキスト
interface VolumeContextType {
  volumes: Record<string, number>;
  setVolume: (participantId: string, volume: number) => void;
}

const VolumeContext = createContext<VolumeContextType>({
  volumes: {},
  setVolume: () => {},
});

function useVolumeContext() {
  return useContext(VolumeContext);
}

// カスタムオーディオレンダラー（個別音量制御対応）
function CustomAudioRenderer() {
  const tracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    {
      onlySubscribed: true,
    }
  );
  const { volumes } = useVolumeContext();
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const currentAudioRefs = audioRefs.current;

    // 現在のトラックIDのセット
    const currentTrackIds = new Set(tracks.map((t) => t.participant.identity));

    // 不要なオーディオ要素を削除
    currentAudioRefs.forEach((audio, id) => {
      if (!currentTrackIds.has(id)) {
        audio.pause();
        audio.srcObject = null;
        currentAudioRefs.delete(id);
      }
    });

    // 各トラックのオーディオ要素を作成・更新
    tracks.forEach((trackRef) => {
      const participantId = trackRef.participant.identity;
      const publication = trackRef.publication as
        | RemoteTrackPublication
        | undefined;

      // ローカル参加者のトラックはスキップ
      if (!(trackRef.participant instanceof RemoteParticipant)) {
        return;
      }

      if (!publication?.track) return;

      let audio = currentAudioRefs.get(participantId);

      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        currentAudioRefs.set(participantId, audio);
      }

      // MediaStreamを設定
      const mediaStream = new MediaStream([publication.track.mediaStreamTrack]);
      if (audio.srcObject !== mediaStream) {
        audio.srcObject = mediaStream;
      }

      // 音量を設定（0-1の範囲）
      const volume = volumes[participantId] ?? 100;
      audio.volume = volume / 100;
    });

    return () => {
      // クリーンアップ
      currentAudioRefs.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
      });
      currentAudioRefs.clear();
    };
  }, [tracks, volumes]);

  // 音量変更時の更新
  useEffect(() => {
    audioRefs.current.forEach((audio, participantId) => {
      const volume = volumes[participantId] ?? 100;
      audio.volume = volume / 100;
    });
  }, [volumes]);

  return null;
}

// iOS/モバイル検出
function useDeviceDetection() {
  // SSR対応のため、初期値はサーバーサイドで安全な値を設定
  const getDeviceInfo = useCallback(() => {
    if (typeof window === "undefined") {
      return {
        isIOS: false,
        isMobile: false,
        canScreenShare: true,
        canFullscreen: true,
      };
    }

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      );

    // iOS Safari では getDisplayMedia がサポートされていない
    const canScreenShare =
      typeof navigator.mediaDevices?.getDisplayMedia === "function" && !isIOS;

    // iOS Safari では Fullscreen API が制限されている
    const canFullscreen =
      document.fullscreenEnabled ||
      // @ts-expect-error webkit prefix
      document.webkitFullscreenEnabled ||
      false;

    return {
      isIOS,
      isMobile,
      canScreenShare,
      canFullscreen: canFullscreen && !isIOS,
    };
  }, []);

  const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo);

  // クライアントサイドでのみ再計算
  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
  }, [getDeviceInfo]);

  return deviceInfo;
}

interface VideoConferenceProps {
  token: string;
  serverUrl: string;
  roomName: string;
  onDisconnect: () => void;
}

function ParticipantCount() {
  const participants = useParticipants();
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl border border-border min-h-[40px]">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      <span className="text-sm font-medium whitespace-nowrap">
        {participants.length}人
      </span>
    </div>
  );
}

function RoomInfo({ roomName }: { roomName: string }) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomName]);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        onClick={copyRoomCode}
        className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary-hover rounded-xl border border-border transition-all group min-h-[40px]"
        title="ルームコードをコピー"
      >
        <span className="font-mono text-sm text-muted group-hover:text-foreground transition-colors">
          {roomName}
        </span>
        {copied ? (
          <svg
            className="w-4 h-4 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-muted group-hover:text-foreground transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
      <ParticipantCount />
    </div>
  );
}

// 個別の画面共有タイル（全画面ボタン付き）
function ScreenShareTile({ track }: { track: TrackReferenceOrPlaceholder }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // iOS用の拡大表示
  const { canFullscreen } = useDeviceDetection();

  const toggleFullscreen = useCallback(async () => {
    // iOS/非対応ブラウザの場合はモーダル表示
    if (!canFullscreen) {
      setIsExpanded(!isExpanded);
      return;
    }

    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
      // フォールバック：モーダル表示
      setIsExpanded(!isExpanded);
    }
  }, [canFullscreen, isExpanded]);

  // Listen for fullscreen changes (e.g., user presses Escape)
  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  // Add event listener for fullscreen changes
  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  const isLarge = isFullscreen || isExpanded;

  // iOS用の拡大モーダル
  if (isExpanded && !canFullscreen) {
    return (
      <>
        {/* 背景オーバーレイ */}
        <div
          className="fixed inset-0 bg-black/90 z-50"
          onClick={() => setIsExpanded(false)}
        />

        {/* 拡大表示 */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-h-[90vh]">
            <TrackRefContext.Provider value={track}>
              <ParticipantTile />
            </TrackRefContext.Provider>

            {/* 閉じるボタン */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 z-10 flex items-center justify-center w-12 h-12 bg-secondary/80 backdrop-blur-sm rounded-xl border border-border/50"
            >
              <svg
                className="w-6 h-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* 参加者名 */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
              <span className="text-sm font-medium text-white">
                {track.participant.identity}の画面
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-secondary rounded-xl overflow-hidden ${
        isLarge ? "rounded-none h-screen w-screen" : "aspect-video"
      }`}
    >
      <TrackRefContext.Provider value={track}>
        <ParticipantTile />
      </TrackRefContext.Provider>

      {/* Fullscreen/Expand toggle button */}
      <button
        onClick={toggleFullscreen}
        className={`
          absolute bottom-3 right-3 z-10
          flex items-center justify-center
          w-10 h-10 sm:w-12 sm:h-12
          bg-secondary/80 hover:bg-secondary backdrop-blur-sm
          rounded-xl border border-border/50
          transition-all duration-200
          hover:scale-105 active:scale-95
          group
        `}
        title={isLarge ? "閉じる" : "拡大表示"}
      >
        {isLarge ? (
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-foreground/70 group-hover:text-foreground transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-foreground/70 group-hover:text-foreground transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        )}
      </button>

      {/* Participant name overlay */}
      <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
        <span className="text-sm font-medium text-white">
          {track.participant.identity}の画面
        </span>
      </div>
    </div>
  );
}

// 複数の画面共有をグリッド表示
function ScreenShareWithFullscreen({
  tracks,
}: {
  tracks: TrackReferenceOrPlaceholder[];
}) {
  // 1つの場合はシンプルに表示、複数の場合はグリッド表示
  if (tracks.length === 1) {
    return (
      <div className="h-full">
        <ScreenShareTile track={tracks[0]} />
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 h-full ${
        tracks.length === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : tracks.length <= 4
          ? "grid-cols-2"
          : "grid-cols-2 sm:grid-cols-3"
      }`}
    >
      {tracks.map((track) => (
        <ScreenShareTile key={track.participant.identity} track={track} />
      ))}
    </div>
  );
}

function AudioOnlyGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Microphone, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  const { localParticipant } = useLocalParticipant();

  // Screen share tracks
  const screenTracks = tracks.filter(
    (track) => track.source === Track.Source.ScreenShare
  );

  // Audio participants (unique by participant)
  const audioParticipants = tracks.filter(
    (track) => track.source === Track.Source.Microphone
  );

  if (screenTracks.length > 0) {
    return (
      <div className="flex flex-col min-h-[50vh] gap-2 sm:gap-4 p-3 sm:p-6">
        {/* Screen share area */}
        <div className="flex-1 min-h-0">
          <ScreenShareWithFullscreen tracks={screenTracks} />
        </div>

        {/* Audio participants strip */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {audioParticipants.map((track) => (
            <AudioParticipantTile
              key={track.participant.identity}
              participant={track.participant}
              isSpeaking={track.participant.isSpeaking}
              isLocalParticipant={
                track.participant.identity === localParticipant?.identity
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // Audio-only grid view
  return (
    <div className="p-3 sm:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {audioParticipants.map((track) => (
          <AudioParticipantTile
            key={track.participant.identity}
            participant={track.participant}
            isSpeaking={track.participant.isSpeaking}
            isLocalParticipant={
              track.participant.identity === localParticipant?.identity
            }
            large
          />
        ))}
      </div>
    </div>
  );
}

// 画質プリセット
const QUALITY_PRESETS = {
  ultra: {
    label: "超高画質",
    description: "4K / 60fps",
    resolution: { width: 3840, height: 2160 },
    frameRate: 60,
    icon: "✨",
    bitrate: 15_000_000,
  },
  high: {
    label: "高画質",
    description: "1080p / 30fps",
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    icon: "🎬",
    bitrate: 5_000_000,
  },
  balanced: {
    label: "バランス",
    description: "720p / 30fps",
    resolution: { width: 1280, height: 720 },
    frameRate: 30,
    icon: "⚖️",
    bitrate: 2_500_000,
  },
  light: {
    label: "軽量",
    description: "720p / 15fps",
    resolution: { width: 1280, height: 720 },
    frameRate: 15,
    icon: "🪶",
    bitrate: 1_500_000,
  },
} as const;

type QualityPreset = keyof typeof QUALITY_PRESETS;

function CustomControlBar() {
  const { localParticipant } = useLocalParticipant();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showUnsupportedMessage, setShowUnsupportedMessage] = useState(false);
  const { canScreenShare } = useDeviceDetection();

  const isMicEnabled = localParticipant?.isMicrophoneEnabled ?? false;

  const toggleMicrophone = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicEnabled);
    }
  }, [localParticipant, isMicEnabled]);

  const startScreenShare = useCallback(
    async (quality: QualityPreset) => {
      if (!localParticipant) return;

      const preset = QUALITY_PRESETS[quality];

      try {
        await localParticipant.setScreenShareEnabled(
          true,
          {
            resolution: preset.resolution,
            contentHint: quality === "light" ? "detail" : "motion",
          },
          {
            videoCodec: quality === "ultra" ? "vp9" : "vp8",
            screenShareEncoding: {
              maxFramerate: preset.frameRate,
              maxBitrate: preset.bitrate,
            },
          }
        );
        setIsScreenSharing(true);
        setShowQualityMenu(false);
      } catch (err) {
        console.error("Screen share error:", err);
        setShowQualityMenu(false);
      }
    },
    [localParticipant]
  );

  const stopScreenShare = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setScreenShareEnabled(false);
      setIsScreenSharing(false);
    }
  }, [localParticipant]);

  const handleScreenShareClick = useCallback(() => {
    if (!canScreenShare) {
      setShowUnsupportedMessage(true);
      setTimeout(() => setShowUnsupportedMessage(false), 3000);
      return;
    }

    if (isScreenSharing) {
      stopScreenShare();
    } else {
      setShowQualityMenu(true);
    }
  }, [isScreenSharing, stopScreenShare, canScreenShare]);

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50">
      {/* 画面共有非対応メッセージ (iOS等) */}
      {showUnsupportedMessage && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="px-4 py-2.5 bg-amber-500/90 text-black text-sm font-medium rounded-xl shadow-lg animate-fade-in">
            📱 この端末では画面共有できません
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 bg-secondary/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl shadow-black/30">
        {/* Microphone Button */}
        <button
          onClick={toggleMicrophone}
          className={`
            relative group flex items-center justify-center
            w-12 h-12 sm:w-14 sm:h-14 rounded-xl
            transition-all duration-300 ease-out
            ${
              isMicEnabled
                ? "bg-gradient-to-br from-accent/20 to-accent/10 hover:from-accent/30 hover:to-accent/20 border border-accent/30"
                : "bg-gradient-to-br from-danger/20 to-danger/10 hover:from-danger/30 hover:to-danger/20 border border-danger/30"
            }
            hover:scale-105 hover:shadow-lg active:scale-95
          `}
          title={isMicEnabled ? "マイクをオフ" : "マイクをオン"}
        >
          {/* Glow effect */}
          <div
            className={`
            absolute inset-0 rounded-xl blur-md opacity-0 group-hover:opacity-50 transition-opacity
            ${isMicEnabled ? "bg-accent" : "bg-danger"}
          `}
          />

          {isMicEnabled ? (
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-accent relative z-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-danger relative z-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          )}

          {/* Status indicator */}
          <div
            className={`
            absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-secondary
            ${isMicEnabled ? "bg-accent" : "bg-danger"}
          `}
          >
            {isMicEnabled && (
              <div className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
            )}
          </div>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-border/50" />

        {/* Screen Share Button with Quality Menu */}
        <div className="relative">
          <button
            onClick={handleScreenShareClick}
            className={`
              relative group flex items-center justify-center
              w-12 h-12 sm:w-14 sm:h-14 rounded-xl
              transition-all duration-300 ease-out
              ${
                isScreenSharing
                  ? "bg-gradient-to-br from-primary/30 to-accent/20 hover:from-primary/40 hover:to-accent/30 border border-primary/40"
                  : "bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 border border-white/10"
              }
              hover:scale-105 hover:shadow-lg active:scale-95
            `}
            title={isScreenSharing ? "画面共有を停止" : "画面を共有"}
          >
            {/* Glow effect */}
            <div
              className={`
              absolute inset-0 rounded-xl blur-md opacity-0 group-hover:opacity-50 transition-opacity
              ${isScreenSharing ? "bg-primary" : "bg-white/20"}
            `}
            />

            {isScreenSharing ? (
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-primary relative z-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 0l-2-2m2 2l2-2"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-foreground/70 group-hover:text-foreground relative z-10 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            )}

            {/* Live indicator when sharing */}
            {isScreenSharing && (
              <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-primary rounded text-[10px] font-bold text-white">
                LIVE
              </div>
            )}
          </button>

          {/* Quality Selection Menu */}
          {showQualityMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowQualityMenu(false)}
              />

              {/* Menu */}
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-48 sm:w-56">
                <div className="bg-secondary/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl shadow-black/40 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border/50">
                    <span className="text-xs font-medium text-muted">
                      画質を選択
                    </span>
                  </div>

                  <div className="p-1.5">
                    {(
                      Object.entries(QUALITY_PRESETS) as [
                        QualityPreset,
                        (typeof QUALITY_PRESETS)[QualityPreset]
                      ][]
                    ).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => startScreenShare(key)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors group"
                      >
                        <span className="text-lg">{preset.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {preset.label}
                          </div>
                          <div className="text-xs text-muted">
                            {preset.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AudioParticipantTile({
  participant,
  isSpeaking,
  large = false,
  isLocalParticipant = false,
}: {
  participant: { identity: string; isSpeaking: boolean; audioLevel?: number };
  isSpeaking: boolean;
  large?: boolean;
  isLocalParticipant?: boolean;
}) {
  const { volumes, setVolume } = useVolumeContext();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volume = volumes[participant.identity] ?? 100;

  const initials = participant.identity
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "from-indigo-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-blue-600",
  ];

  const colorIndex = participant.identity.charCodeAt(0) % colors.length;
  const gradientClass = colors[colorIndex];

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(participant.identity, Number(e.target.value));
    },
    [participant.identity, setVolume]
  );

  // 音量アイコンを取得
  const getVolumeIcon = () => {
    if (volume === 0) {
      return (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      );
    } else if (volume < 50) {
      return (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072M12 6.253v11.494m0-11.494l-4.707 4.707H6a1 1 0 00-1 1v2.08a1 1 0 001 1h1.293l4.707 4.707m0-11.494a3 3 0 000 11.494"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      );
    }
  };

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        bg-secondary rounded-xl sm:rounded-2xl border border-border
        transition-all duration-300 overflow-visible
        ${
          large
            ? "aspect-square min-h-[100px] sm:min-h-[140px]"
            : "w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0"
        }
        ${
          isSpeaking
            ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
            : ""
        }
      `}
    >
      {/* Speaking indicator ring */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl animate-pulse-ring bg-accent/20" />
      )}

      {/* Avatar */}
      <div
        className={`
          flex items-center justify-center rounded-full bg-gradient-to-br ${gradientClass}
          ${
            large
              ? "w-12 h-12 sm:w-16 sm:h-16 text-base sm:text-xl"
              : "w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm"
          }
          font-semibold text-white shadow-lg
        `}
      >
        {initials}
      </div>

      {/* Name */}
      <span
        className={`
          mt-1.5 sm:mt-2 font-medium text-center px-1.5 sm:px-2 truncate w-full
          ${large ? "text-xs sm:text-sm" : "text-[10px] sm:text-xs"}
        `}
      >
        {participant.identity}
      </span>

      {/* Mic indicator */}
      <div
        className={`absolute ${
          large ? "top-2 right-2 sm:top-3 sm:right-3" : "top-1 right-1"
        }`}
      >
        {isSpeaking ? (
          <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20">
            <svg
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ) : null}
      </div>

      {/* Volume control button - only for remote participants */}
      {!isLocalParticipant && (
        <div
          className={`absolute ${
            large
              ? "bottom-2 right-2 sm:bottom-3 sm:right-3"
              : "bottom-1 right-1"
          }`}
        >
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className={`
              flex items-center justify-center rounded-full
              transition-all duration-200
              ${large ? "w-7 h-7 sm:w-8 sm:h-8" : "w-5 h-5 sm:w-6 sm:h-6"}
              ${
                volume === 0
                  ? "bg-danger/20 text-danger"
                  : "bg-white/10 hover:bg-white/20 text-foreground/70 hover:text-foreground"
              }
            `}
            title="音量調整"
          >
            {getVolumeIcon()}
          </button>

          {/* Volume slider popup */}
          {showVolumeSlider && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowVolumeSlider(false)}
              />

              {/* Minimal Slider */}
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-black/80 backdrop-blur-xl rounded-full border border-white/10 shadow-xl">
                  {/* Mute toggle */}
                  <button
                    onClick={() =>
                      setVolume(participant.identity, volume === 0 ? 100 : 0)
                    }
                    className={`
                      flex items-center justify-center w-6 h-6 rounded-full
                      transition-all duration-200
                      ${
                        volume === 0
                          ? "text-rose-400 hover:text-rose-300"
                          : "text-white/60 hover:text-white"
                      }
                    `}
                    title={volume === 0 ? "ミュート解除" : "ミュート"}
                  >
                    {getVolumeIcon()}
                  </button>

                  {/* Sleek slider */}
                  <div className="relative w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    {/* Progress fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-primary rounded-full"
                      style={{ width: `${volume}%` }}
                    />
                    {/* Input */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {/* Thumb indicator */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md shadow-black/30 pointer-events-none"
                      style={{ left: `calc(${volume}% - 6px)` }}
                    />
                  </div>

                  {/* Volume percentage */}
                  <span className="text-[11px] font-medium text-white/50 w-7 text-right tabular-nums">
                    {volume}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 音量状態を管理するラッパーコンポーネント
function VolumeProvider({ children }: { children: React.ReactNode }) {
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  const setVolume = useCallback((participantId: string, volume: number) => {
    setVolumes((prev) => ({
      ...prev,
      [participantId]: Math.max(0, Math.min(100, volume)),
    }));
  }, []);

  return (
    <VolumeContext.Provider value={{ volumes, setVolume }}>
      {children}
    </VolumeContext.Provider>
  );
}

export default function VideoConference({
  token,
  serverUrl,
  roomName,
  onDisconnect,
}: VideoConferenceProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onDisconnected={onDisconnect}
      className="min-h-screen bg-background"
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          simulcast: true,
        },
      }}
    >
      <VolumeProvider>
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-6 py-3 border-b border-border bg-secondary/90 backdrop-blur-md gap-2">
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
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
            <h1 className="text-lg font-semibold">MetaLive</h1>
          </div>

          <RoomInfo roomName={roomName} />

          <button
            onClick={onDisconnect}
            className="px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 rounded-xl transition-colors whitespace-nowrap min-h-[40px]"
          >
            退出
          </button>
        </header>

        {/* Main content - scrollable with padding for fixed header and control bar */}
        <main className="pt-16 pb-24">
          <AudioOnlyGrid />
        </main>

        {/* Custom Control Bar */}
        <CustomControlBar />

        {/* Custom Audio Renderer with individual volume control */}
        <CustomAudioRenderer />
      </VolumeProvider>
    </LiveKitRoom>
  );
}
