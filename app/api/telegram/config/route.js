import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  const botConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  return NextResponse.json({
    success: true,
    chatId,
    botConfigured,
  });
}
