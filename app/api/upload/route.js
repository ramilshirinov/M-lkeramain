import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBucket = searchParams.get("bucket") || "listings";
    const bucket = requestedBucket === "avatars" ? "avatars" : "listings";

    const contentType = req.headers.get("content-type") || "";

    // 1. JSON ilə (məsələn sıxılmış base64 DataURL)
    if (contentType.includes("application/json")) {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return NextResponse.json({ success: false, message: "Fayl məlumatı oxunmadı və ya çox böyükdür." }, { status: 400 });
      }
      const { dataUrl, fileName, type = "image" } = body;

      if (!dataUrl) {
        return NextResponse.json({ success: false, message: "Fayl məlumatı tapılmadı" }, { status: 400 });
      }

      if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
        return NextResponse.json({ success: true, url: dataUrl, name: fileName || "file.jpg", type });
      }

      const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : (type === "video" ? "video/mp4" : "image/jpeg");
      const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const ext = fileName ? path.extname(fileName) || (mimeType.includes("png") ? ".png" : ".jpg") : ".jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

      // Supabase Storage-ə birbaşa yükləyirik
      if (isSupabaseConfigured()) {
        try {
          const adminClient = getSupabaseAdminClient();
          const { data, error } = await adminClient.storage
            .from(bucket)
            .upload(safeName, buffer, {
              contentType: mimeType,
              upsert: true,
            });

          if (!error && data) {
            const { data: pubData } = adminClient.storage.from(bucket).getPublicUrl(safeName);
            return NextResponse.json({
              success: true,
              url: pubData.publicUrl,
              name: fileName || safeName,
              type,
              storage: "supabase",
              bucket,
            });
          }
        } catch (sbErr) {
          console.warn("Supabase storage upload error, falling back to local:", sbErr.message);
        }
      }

      // Fallback: local disk
      try {
        ensureUploadsDir();
        const filePath = path.join(UPLOADS_DIR, safeName);
        fs.writeFileSync(filePath, buffer);
        return NextResponse.json({
          success: true,
          url: `/uploads/${safeName}`,
          name: fileName || safeName,
          type,
          storage: "local",
        });
      } catch (localErr) {
        // Son çarə: dataUrl
        return NextResponse.json({ success: true, url: dataUrl, name: fileName || "image.jpg", type });
      }
    }

    // 2. FormData (fayl fayl kimi göndərildikdə)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file) {
        return NextResponse.json({ success: false, message: "Fayl tapılmadı" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || (file.type?.includes("png") ? ".png" : ".jpg");
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const isVideo = file.type?.startsWith("video");

      // Supabase Storage
      if (isSupabaseConfigured()) {
        try {
          const adminClient = getSupabaseAdminClient();
          const { data, error } = await adminClient.storage
            .from(bucket)
            .upload(safeName, buffer, {
              contentType: file.type || "application/octet-stream",
              upsert: true,
            });

          if (!error && data) {
            const { data: pubData } = adminClient.storage.from(bucket).getPublicUrl(safeName);
            return NextResponse.json({
              success: true,
              url: pubData.publicUrl,
              name: file.name,
              type: isVideo ? "video" : "image",
              storage: "supabase",
              bucket,
            });
          } else if (error) {
            console.warn("Supabase storage error:", error.message);
          }
        } catch (sbErr) {
          console.warn("Supabase storage error in formData:", sbErr.message);
        }
      }

      // Fallback: local disk
      ensureUploadsDir();
      const filePath = path.join(UPLOADS_DIR, safeName);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/${safeName}`,
        name: file.name,
        type: isVideo ? "video" : "image",
        storage: "local",
      });
    }

    return NextResponse.json({ success: false, message: "Dəstəklənməyən məzmun növü" }, { status: 400 });
  } catch (err) {
    console.error("Yükləmə ümumi xətası:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
