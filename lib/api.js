import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const sb = await getSupabaseServer();
  const {
    data: { user },
    error,
  } = await sb.auth.getUser();
  if (error || !user) throw new HttpError(401, "unauthorized");
  return { user, sb };
}

export async function requireAdmin() {
  const { user, sb } = await requireUser();
  const { data: p } = await getSupabaseAdmin()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (p?.role !== "admin") throw new HttpError(403, "forbidden");
  return { user, sb };
}

export function route(handler) {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ success: false, message: e.message }, { status: e.status });
      }
      console.error("API error:", e);
      return NextResponse.json({ success: false, message: "server_error" }, { status: 500 });
    }
  };
}
