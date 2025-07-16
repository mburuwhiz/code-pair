const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useSingleFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const AUTH_FILE = "./auth_info.json";
const PREFIX = "WHIZMD_";

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Handle pairing request
app.post("/pair", async (req, res) => {
  const phone = req.body.phoneNumber;
  if (!phone || !/^\d{7,15}$/.test(phone)) return res.status(400).send("Invalid phone number");

  const { state, saveCreds } = useSingleFileAuthState(AUTH_FILE);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["🔧 𝐖𝐇𝐈𝐙-𝐌𝐃 𝐏𝐑𝐎", "9.0.0", "Android"]
  });

  try {
    const code = await sock.requestPairingCode(phone);
    sock.ev.on("creds.update", async () => {
      await saveCreds();
      const raw = fs.readFileSync(AUTH_FILE);
      const sessionId = PREFIX + Buffer.from(raw).toString("base64");

      res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>WHIZ‑MD Linked</title><style>
        body { font-family: sans-serif; text-align: center; padding: 2rem; }
        pre { text-align: left; background:#f1f1f1;padding:1rem; }
      </style></head>
      <body>
        <h1>✅ WHIZ-MD Linked Successfully!</h1>
        <pre>${sessionId}</pre>
        <div><a href="/">Pair Another Device</a></div>
      </body>
      </html>
      `);
      sock.end();
    });

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Pairing</title><style>
      body { text-align: center; font-family: sans-serif; padding: 2rem; }
      #code { font-size: 2rem; margin: 1rem 0; }
      button { padding: 0.5rem 1rem; cursor: pointer; }
      #toast {
        visibility: hidden;
        margin-top: 1rem;
        background: #3CB371;
        color: white;
        padding: 0.5rem 1rem;
      }
    </style></head>
    <body>
      <h1>Enter this 8‑char code in WhatsApp</h1>
      <div id="code">${code}</div>
      <button id="copy">Copy Code</button>
      <div id="toast">Copied!</div>
      <script>
        document.getElementById("copy").onclick = () => {
          navigator.clipboard.writeText("${code}");
          const t = document.getElementById("toast");
          t.style.visibility = "visible";
          setTimeout(() => t.style.visibility = "hidden", 3000);
        };
      </script>
    </body>
    </html>
    `);

  } catch (err) {
    console.error("Pairing failed", err);
    res.status(500).send("Error generating pairing code");
  }
});

app.listen(process.env.PORT || 3000, () => console.log("WHIZ‑MD Pair app at http://localhost:3000"));
