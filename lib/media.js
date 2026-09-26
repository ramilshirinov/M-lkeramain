export function getMediaUrl(url, supabase) {
  if (!url) return "/images/placeholder-property.svg";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (supabase?.storage?.from) {
    const { data } = supabase.storage.from("listings").getPublicUrl(url);
    if (data?.publicUrl) return data.publicUrl;
  }
  return url;
}

/**
 * Şəkilləri brauzerdə sıxaraq (compression) 413 Payload Too Large xətalarının qarşısını alır.
 */
export async function compressImageFile(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
  if (!file || !file.type?.startsWith("image/")) {
    return file;
  }

  // Əgər fayl onsuz da 200KB-dan kiçikdirsə, sıxmağa ehtiyac yoxdur
  if (file.size <= 200 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}