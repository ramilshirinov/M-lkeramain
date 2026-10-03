import * as tus from "tus-js-client";
import { createBrowserSupabase } from "@/lib/supabase/client";

const SIX_MB = 6 * 1024 * 1024;

export async function uploadMedia(file, { bucket = "listings", userId, onProgress }) {
  const sb = createBrowserSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) throw new Error("not_authenticated");

  // Əgər fayl videodursa, birbaşa Telegram API-yə göndəririk
  if (file.type && file.type.startsWith("video/")) {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("userId", userId || "guest");

    // İrəliləyişi (progress) simulyasiya edirik və ya fetch üzərindən izləyirik
    onProgress?.(30);

    const response = await fetch("/api/telegram/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Telegram-a video yükləmə xətası");
    }

    const data = await response.json();
    onProgress?.(100);
    return { url: data.url, path: data.path, name: file.name, size: file.size };
  }

  // Şəkillər üçün əvvəlki Supabase yükləmə məntiqi qalır
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