import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. JSON ilə base64 və ya birbaşa URL göndərildikdə
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { dataUrl, fileName, type = "image" } = body;

      if (!dataUrl) {
        return NextResponse.json({ success: false, message: "Fayl məlumatı tapılmadı" }, { status: 400 });
      }

      // Əgər dataUrl artıq http:// və ya data: şəklindədirsə
      if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
        return NextResponse.json({ success: true, url: dataUrl, name: fileName || "image.jpg", type });
      }

      try {
        ensureUploadsDir();
        const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
        const ext = fileName ? path.extname(fileName) || ".jpg" : ".jpg";
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const filePath = path.join(UPLOADS_DIR, safeName);

        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        const publicUrl = `/uploads/${safeName}`;

        return NextResponse.json({ success: true, url: publicUrl, name: fileName || safeName, type });
      } catch (e) {
        // Fallback: Data URL özünü qaytarırıq
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

      ensureUploadsDir();
      const ext = path.extname(file.name) || ".jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, safeName);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/${safeName}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        name: file.name,
        type: file.type.startsWith("video") ? "video" : "image"
      });
    }

    return NextResponse.json({ success: false, message: "Dəstəklənməyən məzmun növü" }, { status: 400 });
  } catch (err) {
    console.error("Yükləmə xətası:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
