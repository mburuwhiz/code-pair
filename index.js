const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const SESSION_DIR = "./sessions";
const AUTH_FOLDER = SESSION_DIR + "/auth_info_baileys";
const PREFIX = "WHIZMD_";

// ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.post("/pair", async (req, res) => {
  const phone = req.body.phoneNumber?.trim();
  if (!phone || !/^\d{7,15}$/.test(phone)) {
    return res.status(400).send("Invalid phone number.");
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["WHIZMD-MD", "Chrome", "1.0"],
  });

  try {
    const code = await sock.requestPairingCode(phone);
    sock.ev.on("creds.update", async () => {
      await saveCreds();
      const sessionFiles = fs.readdirSync(AUTH_FOLDER);
      const sessionData = sessionFiles
        .map((f) => fs.readFileSync(`${AUTH_FOLDER}/${f}`))
        .join("");
      const sessionId = PREFIX + Buffer.from(sessionData).toString("base64");

      res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>WHIZ‑MD Linked</title><style>
body{font-family:sans-serif;text-align:center;padding:2rem}
pre{background:#f1f1f1;padding:1rem;overflow-x:auto;}
a{display:inline-block;margin-top:1rem;color:#007BFF;}
</style></head><body>
<h1>✅ WHIZ‑MD LINKED SUCCESSFULLY!</h1>
<pre id="session">${sessionId}</pre>
<a href="/">➕ Pair Another Device</a>
</body></html>
      `);
      sock.end();
    });

    res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pairing</title><style>
body{font-family:sans-serif;text-align:center;padding:2rem}
#code{font-size:2rem;margin:1rem 0}
button{padding:0.5rem 1rem;cursor:pointer}
#toast{visibility:hidden;margin-top:1rem;color:green}
</style></head><body>
<h1>📲 Enter this 8‑char code in WhatsApp</h1>
<div id="code">${code}</div>
<button id="copy">Copy Code</button>
<div id="toast">✅ Copied!</div>
<script>
document.getElementById("copy").onclick = () => {
  navigator.clipboard.writeText("${code}");
  const toast = document.getElementById("toast");
  toast.style.visibility = "visible";
  setTimeout(() => toast.style.visibility = "hidden", 3000);
};
</script>
</body></html>
    `);
  } catch (e) {
    console.error("Pairing error:", e);
    res.status(500).send("Failed to generate pairing code. Try again.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`WHIZ‑MD Pair app at http://localhost:${PORT}`));
