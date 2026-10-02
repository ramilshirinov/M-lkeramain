// Brauzer tərəfi: YouTube resumable upload + köməkçilər.
// Fayl Next.js-dən keçmir; yalnız /api/youtube/* (kiçik JSON) çağırılır.

const YT_ID_RE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube(?:-nocookie)?\.com\/embed\/)([A-Za-z0-9_-]{11})/;

export function getYoutubeId(input) {
  if (!input) return null;
  if (typeof input === "object") {
    if (input.youtube_video_id) return input.youtube_video_id;
    if (input.videoId) return input.videoId;
    input = input.url;
  }
  const m = String(input || "").match(YT_ID_RE);
  return m ? m[1] : null;
}

export const youtubeWatchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const youtubeEmbedUrl = (id, { autoplay = false } = {}) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${
    autoplay ? "&autoplay=1" : ""
  }`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const err = new Error(json.message || "server_error");
    err.code = json.message || "server_error";
    err.status = res.status;
    throw err;
  }
  return json.data ?? {};
}

// Tək chunk-u PUT edir. XHR istifadə olunur (progress + 308 cavabını fetch kimi "redirect" saymır).
function putChunk({ uploadUrl, blob, start, total, contentType, onLoaded, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${start + blob.size - 1}/${total}`);
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onLoaded?.(e.loaded);
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          resolve({ done: true, body: JSON.parse(xhr.responseText) });
        } catch {
          reject(new Error("bad_response"));
        }
      } else if (xhr.status === 308) {
        resolve({ done: false });
      } else {
        const e = new Error("chunk_failed");
        e.status = xhr.status;
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error("network_error"));
    xhr.ontimeout = () => reject(new Error("network_error"));
    if (signal) {
      if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new DOMException("Aborted", "AbortError"));
      });
    }
    xhr.send(blob);
  });
}

// Kəsilmədən sonra serverdə nə qədər bayt olduğunu soruşur.
function queryStatus({ uploadUrl, total }) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Range", `bytes */${total}`);
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          return resolve({ done: true, body: JSON.parse(xhr.responseText) });
        } catch {
          return resolve({});
        }
      }
      if (xhr.status === 308) {
        const m = (xhr.getResponseHeader("Range") || "").match(/bytes=0-(\d+)/);
        return resolve({ offset: m ? Number(m[1]) + 1 : undefined });
      }
      resolve({});
    };
    xhr.onerror = () => resolve({});
    xhr.send();
  });
}

/**
 * Videonu YouTube-a yükləyir.
 * @returns {{ url, videoId, uploadId, embedUrl, name, type:"video", isNew:true }}
 * `url` = watch URL → mövcud media massivində `{ url, type: "video" }` kimi birbaşa işlənir.
 */
export async function uploadVideoToYouTube(file, { onProgress, signal } = {}) {
  const init = await api("/api/youtube/init", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "video/mp4",
    }),
    signal,
  });
  const { uploadId, uploadUrl, chunkSize } = init;

  let offset = 0;
  let videoId = null;
  let failures = 0;

  while (offset < file.size && !videoId) {
    const end = Math.min(offset + chunkSize, file.size);
    try {
      const r = await putChunk({
        uploadUrl,
        blob: file.slice(offset, end),
        start: offset,
        total: file.size,
        contentType: file.type,
        signal,
        onLoaded: (loaded) =>
          onProgress?.(Math.min(99, Math.round(((offset + loaded) / file.size) * 100))),
      });
      failures = 0;
      if (r.done) videoId = r.body?.id;
      else offset = end;
    } catch (e) {
      if (e.name === "AbortError") throw e;
      if (++failures > 5) {
        const err = new Error("upload_failed");
        err.code = "upload_failed";
        throw err;
      }
      await sleep(1000 * 2 ** failures);
      const s = await queryStatus({ uploadUrl, total: file.size });
      if (s.done) videoId = s.body?.id;
      else if (typeof s.offset === "number") offset = s.offset;
    }
  }

  if (!videoId) {
    const err = new Error("upload_failed");
    err.code = "upload_failed";
    throw err;
  }

  // complete: şəbəkə xətasına qarşı 3 cəhd
  let data;
  for (let i = 0; i < 3; i++) {
    try {
      data = await api("/api/youtube/complete", {
        method: "POST",
        body: JSON.stringify({ uploadId, videoId }),
      });
      break;
    } catch (e) {
      if (i === 2 || (e.status && e.status < 500)) throw e;
      await sleep(1500);
    }
  }
  onProgress?.(100);
  return { ...data, name: file.name, type: "video", isNew: true };
}

export async function deleteYoutubeVideo(videoId) {
  if (!videoId) return;
  return api("/api/youtube/video", { method: "DELETE", body: JSON.stringify({ videoId }) });
}

// Redaktədə: əvvəl olub, indi siyahıda olmayan YouTube ID-ləri
export function removedVideoIds(initialFiles = [], currentFiles = []) {
  const now = new Set(currentFiles.map((f) => getYoutubeId(f)).filter(Boolean));
  return initialFiles.map((f) => getYoutubeId(f)).filter((id) => id && !now.has(id));
}
