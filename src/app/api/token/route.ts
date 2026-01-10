import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
const PARTICIPANT_REGEX = /^[A-Za-z0-9 _.-]{1,20}$/;

export async function POST(request: NextRequest) {
  try {
    const { roomName, participantName } = await request.json();

    const normalizedRoom = (roomName ?? "").toString().trim().toUpperCase();
    const normalizedParticipant = (participantName ?? "").toString().trim();

    if (!ROOM_CODE_REGEX.test(normalizedRoom)) {
      return NextResponse.json(
        { error: "ルームコードは英大文字と数字6桁で指定してください" },
        { status: 400 }
      );
    }

    if (!PARTICIPANT_REGEX.test(normalizedParticipant)) {
      return NextResponse.json(
        { error: "参加者名は1〜20文字の英数字と _ . - 空白のみ使用できます" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit の設定が不完全です" },
        { status: 500 }
      );
    }

    // ルーム内の既存参加者をチェック
    if (livekitUrl) {
      try {
        const roomService = new RoomServiceClient(
          livekitUrl,
          apiKey,
          apiSecret
        );
        const participants = await roomService.listParticipants(normalizedRoom);

        // 同じ名前の参加者が既に存在するかチェック
        const existingParticipant = participants.find(
          (p) => p.identity === normalizedParticipant
        );

        if (existingParticipant) {
          return NextResponse.json(
            {
              error:
                "この名前は既に使用されています。別の名前を入力してください",
            },
            { status: 409 } // Conflict
          );
        }
      } catch (err) {
        // ルームが存在しない場合は参加者もいないのでOK
        // その他のエラーはログに出力して続行
        console.log("Room check skipped:", err);
      }
    }

    const ttlEnv = Number(process.env.TOKEN_TTL_SECONDS ?? 3600);
    const ttlSeconds = Number.isFinite(ttlEnv)
      ? Math.min(Math.max(ttlEnv, 300), 6 * 60 * 60) // clamp 5分〜6時間
      : 3600;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: normalizedParticipant,
      ttl: ttlSeconds,
    });

    at.addGrant({
      roomJoin: true,
      room: normalizedRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "トークンの生成に失敗しました" },
      { status: 500 }
    );
  }
}
