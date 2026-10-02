// İstifadə: node scripts/youtube-get-refresh-token.js
require("dotenv").config({ path: ".env.local" });
const http = require("http");

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const id = process.env.YOUTUBE_CLIENT_ID;
const secret = process.env.YOUTUBE_CLIENT_SECRET;
if (!id || !secret) {
  console.error("YOUTUBE_CLIENT_ID və YOUTUBE_CLIENT_SECRET .env.local-da olmalıdır.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: id,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube",
    access_type: "offline",
    prompt: "consent",
  });
console.log("\nBu linki brauzerdə aç və kanalın sahibi hesabla daxil ol:\n\n" + authUrl + "\n");

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT);
  if (u.pathname !== "/callback") { res.writeHead(404); return res.end(); }
  const code = u.searchParams.get("code");
  if (!code) { res.writeHead(400); return res.end("code yoxdur"); }

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: id, client_secret: secret, redirect_uri: REDIRECT, grant_type: "authorization_code",
    }),
  });
  const j = await r.json();
  res.end("Hazırdır. Terminala bax, bu pəncərəni bağlaya bilərsən.");
  if (j.refresh_token) {
    console.log("\n.env.local-a əlavə et:\n\nYOUTUBE_REFRESH_TOKEN=" + j.refresh_token + "\n");
  } else {
    console.error("refresh_token gəlmədi:", j);
  }
  server.close();
});
server.listen(PORT);
