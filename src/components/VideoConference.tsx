"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  GridLayout,
  ParticipantTile,
  TrackRefContext,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useCallback, useState } from "react";

interface VideoConferenceProps {
  token: string;
  serverUrl: string;
  roomName: string;
  onDisconnect: () => void;
}

function ParticipantCount() {
  const participants = useParticipants();
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg border border-border">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      <span className="text-sm font-medium">
        {participants.length}人が参加中
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
    <div className="flex items-center gap-4">
      <button
        onClick={copyRoomCode}
        className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary-hover rounded-lg border border-border transition-all group"
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

function AudioOnlyGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Microphone, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

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
      <div className="flex flex-col h-full gap-4 p-4">
        {/* Screen share area */}
        <div className="flex-1 min-h-0">
          <GridLayout tracks={screenTracks}>
            <TrackRefContext.Consumer>
              {(track) => track && <ParticipantTile />}
            </TrackRefContext.Consumer>
          </GridLayout>
        </div>

        {/* Audio participants strip */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {audioParticipants.map((track) => (
            <AudioParticipantTile
              key={track.participant.identity}
              participant={track.participant}
              isSpeaking={track.participant.isSpeaking}
            />
          ))}
        </div>
      </div>
    );
  }

  // Audio-only grid view
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6 auto-rows-fr">
      {audioParticipants.map((track) => (
        <AudioParticipantTile
          key={track.participant.identity}
          participant={track.participant}
          isSpeaking={track.participant.isSpeaking}
          large
        />
      ))}
    </div>
  );
}

function AudioParticipantTile({
  participant,
  isSpeaking,
  large = false,
}: {
  participant: { identity: string; isSpeaking: boolean; audioLevel?: number };
  isSpeaking: boolean;
  large?: boolean;
}) {
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

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        bg-secondary rounded-2xl border border-border
        transition-all duration-300 overflow-hidden
        ${large ? "aspect-square min-h-[140px]" : "w-20 h-20 flex-shrink-0"}
        ${
          isSpeaking
            ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
            : ""
        }
      `}
    >
      {/* Speaking indicator ring */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-2xl animate-pulse-ring bg-accent/20" />
      )}

      {/* Avatar */}
      <div
        className={`
          flex items-center justify-center rounded-full bg-gradient-to-br ${gradientClass}
          ${large ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm"}
          font-semibold text-white shadow-lg
        `}
      >
        {initials}
      </div>

      {/* Name */}
      <span
        className={`
          mt-2 font-medium text-center px-2 truncate w-full
          ${large ? "text-sm" : "text-xs"}
        `}
      >
        {participant.identity}
      </span>

      {/* Mic indicator */}
      <div className={`absolute ${large ? "top-3 right-3" : "top-1 right-1"}`}>
        {isSpeaking ? (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20">
            <svg
              className="w-3.5 h-3.5 text-accent"
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
    </div>
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
      className="h-screen flex flex-col bg-background"
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          simulcast: true,
        },
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
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
          <h1 className="text-lg font-semibold">WebCall</h1>
        </div>

        <RoomInfo roomName={roomName} />

        <button
          onClick={onDisconnect}
          className="px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors"
        >
          退出
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <AudioOnlyGrid />
      </main>

      {/* Control bar */}
      <ControlBar
        variation="minimal"
        controls={{
          microphone: true,
          camera: false,
          screenShare: true,
          chat: false,
          leave: false,
        }}
      />

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
