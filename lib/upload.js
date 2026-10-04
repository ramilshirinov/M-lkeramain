import * as tus from "tus-js-client";
import { createBrowserSupabase } from "@/lib/supabase/client";

const SIX_MB = 6 * 1024 * 1024;

export async function uploadMedia(file, { bucket = "listings", userId, onProgress }) {
  const sb = createBrowserSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) throw new Error("not_authenticated");

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  if (file.size <= SIX_MB) {
    const { error } = await sb.storage.from(bucket).upload(path, file, {
      contentType: file.type || undefined,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    onProgress?.(100);
  } else {
    let hostname = "";
    try {
      const { getSanitizedSupabaseUrl } = await import("@/lib/supabase/config");
      hostname = new URL(getSanitizedSupabaseUrl()).hostname;
    } catch {
      hostname = "localhost";
    }
    const ref = hostname.split(".")[0];
    await new Promise((resolve, reject) => {
      const up = new tus.Upload(file, {
        endpoint: `https://${ref}.storage.supabase.co/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: SIX_MB,
        metadata: {
          bucketName: bucket,
          objectName: path,
          contentType: file.type || "application/octet-stream",
          cacheControl: "31536000",
        },
        onError: reject,
        onProgress: (sent, total) => onProgress?.(Math.round((sent / total) * 100)),
        onSuccess: resolve,
      });
      up.findPreviousUploads().then((prev) => {
        if (prev.length) up.resumeFromPreviousUpload(prev[0]);
        up.start();
      });
    });
  }
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, name: file.name, size: file.size };
}

export async function uploadTelegramVideo(file, { onProgress } = {}) {
  const formData = new FormData();
  formData.append("video", file);

  const res = await fetch("/api/telegram/upload", {
    method: "POST",
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Video Telegram-a yüklənə bilmədi");
  }

  onProgress?.(100);
  return {
    url: json.url,
    path: json.path,
    name: json.name || file.name,
    size: json.size || file.size,
    audio: json.audio,
  };
}
