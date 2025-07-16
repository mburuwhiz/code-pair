const express = require("express");
const app = express();
const fs = require("fs-extra");
const path = require("path");
const pino = require("pino");
const { Boom } = require("@hapi/boom");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers,
  delay,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const PORT = process.env.PORT || 5000;

const AUTH_DIR = path.join(__dirname, "auth_info_baileys");
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR);

const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" })
});

app.use(express.static("public"));

app.get("/", async (req, res) => {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["🔧 𝐖𝐇𝐈𝐙-𝐌𝐃 𝐏𝐑𝐎", "9.0.0", "Android"],
    generateHighQualityLinkPreview: true
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ Connected to WhatsApp");
    }

    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log("Connection closed:", code);
      if (code === DisconnectReason.restartRequired) {
        process.exit(1);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  try {
    const code = await sock.requestPairingCode("254740841168"); // Update with your default or user input
    const creds = fs.readFileSync(path.join(AUTH_DIR, "creds.json"));
    const sessionID = "WHIZMD_" + Buffer.from(creds).toString("base64");

    console.log(`Generated Session ID: ${sessionID}`);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WHIZ-MD Pairing</title>
        <link rel="stylesheet" href="/style.css">
        <script src="/script.js" defer></script>
      </head>
      <body>
        <div class="container">
          <h1>🔗 Pair Your WhatsApp</h1>
          <p class="pairing-code" onclick="copyCode('${code}')">${code}</p>
          <p id="copy-status">Click the code to copy</p>
        </div>

        <div class="message">
          <pre>
━━━━━━━━━━━━━━━━━━━━━━━
✅ 𝐖𝐇𝐈𝐙-𝐌𝐃 𝐋𝐈𝐍𝐊𝐄𝐃 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘
━━━━━━━━━━━━━━━━━━━━━━━

📌 You can Continue to Deploy now

📁 GitHub:
https://github.com/mburuwhiz/whiz-md

🔍 Scan QR Code:
https://pairwithwhizmd.onrender.com

💬 Contact Owner:
+254 754 783 683

💡 Support Group:
https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM

⚠️ Keep your SESSION_ID private!
Unauthorized sharing allows others to access your chats.

━━━━━━━━━━━━━━━━━━━━━━━
🔧 Powered by WHIZ-MD • Built with 💡
━━━━━━━━━━━━━━━━━━━━━━━

<b>Session ID:</b> <code>${sessionID}</code>
          </pre>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Pairing error:", err);
    res.send("❌ Failed to generate pairing code. Try again.");
  }
});

app.listen(PORT, () => console.log(`==> Available at your primary URL http://localhost:${PORT}`));
