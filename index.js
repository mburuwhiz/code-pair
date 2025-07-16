const express = require("express");
const app = express();
const pino = require("pino");
const path = require('path');
const fs = require("fs-extra");
const { Boom } = require("@hapi/boom");

const PORT = process.env.PORT || 5000;

const MESSAGE = process.env.MESSAGE || `
━━━━━━━━━━━━━━━━━━━━━━━
  *✅ 𝐖𝐇𝐈𝐙-𝐌𝐃 𝐋𝐈𝐍𝐊𝐄𝐃 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘*
━━━━━━━━━━━━━━━━━━━━━━━

📌 You can Continue to Deploy now

*📁 GitHub:*
https://github.com/mburuwhiz/whiz-md

*🔍 Scan QR Code:*
https://pairwithwhizmd.onrender.com

*💬 Contact Owner:*
+254 754 783 683

*💡 Support Group:*
https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM

⚠️ Keep your SESSION_ID private!
Unauthorized sharing allows others to access your chats.

━━━━━━━━━━━━━━━━━━━━━━━
🔧 Powered by WHIZ-MD • Built with 💡
━━━━━━━━━━━━━━━━━━━━━━━
`;

if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

app.get("/", async (req, res) => {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    delay,
    DisconnectReason,
    makeInMemoryStore
  } = require("@whiskeysockets/baileys");

  const store = makeInMemoryStore({
    logger: pino().child({ level: 'silent', stream: 'store' }),
  });

  async function startPairing() {
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + "/auth_info_baileys");
    let responseSent = false;

    try {
      const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["🔧 𝐖𝐇𝐈𝐙-𝐌𝐃 𝐏𝐑𝐎", "9.0.0", "Android"],
        auth: state
      });

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

        if (connection === "close") {
          if (reason === DisconnectReason.connectionClosed) {
            console.log("Connection closed.");
          } else if (reason === DisconnectReason.connectionLost) {
            console.log("Connection lost.");
          } else if (reason === DisconnectReason.restartRequired) {
            console.log("Restart required.");
            startPairing();
          } else if (reason === DisconnectReason.timedOut) {
            console.log("Connection timed out.");
          } else {
            console.log("Unknown disconnect reason:", reason);
          }
        }

        if (connection === "open") {
          await delay(3000);
          const user = sock.user.id;
          const credsBuffer = fs.readFileSync(__dirname + '/auth_info_baileys/creds.json');
          const encodedSession = "WHIZMD_" + Buffer.from(credsBuffer).toString('base64');

          console.log("\n✅ SESSION-ID:", encodedSession);

          const msg = await sock.sendMessage(user, { text: encodedSession });
          await sock.sendMessage(user, { text: MESSAGE }, { quoted: msg });

          await delay(1000);
          await fs.emptyDirSync(__dirname + '/auth_info_baileys');
        }
      });

      try {
        const pairingCode = await sock.requestPairingCode("254740841168@s.whatsapp.net");

        if (!responseSent) {
          responseSent = true;
          res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WHIZ-MD Pairing</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(-45deg, #ff004c, #ff9000, #00f2ff, #8e2de2);
      background-size: 400% 400%;
      animation: gradient 15s ease infinite;
      font-family: Arial, sans-serif;
    }
    @keyframes gradient {
      0% {background-position: 0% 50%;}
      50% {background-position: 100% 50%;}
      100% {background-position: 0% 50%;}
    }
    .container {
      background: rgba(255, 255, 255, 0.1);
      padding: 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      text-align: center;
      color: #fff;
    }
    .pairing-code {
      font-size: 2.5em;
      font-weight: bold;
      margin-top: 1rem;
      cursor: pointer;
    }
    #copy-status {
      margin-top: 0.5rem;
      font-size: 1em;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 Pair Your WhatsApp</h1>
    <p class="pairing-code">Generating...</p>
    <p id="copy-status">Please wait...</p>
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
      const codeElement = document.querySelector(".pairing-code");
      const statusText = document.getElementById("copy-status");

      const code = "${pairingCode}";

      setTimeout(() => {
        codeElement.innerText = code;
        statusText.innerText = "Click the code to copy";

        codeElement.addEventListener("click", () => {
          navigator.clipboard.writeText(code).then(() => {
            statusText.innerText = "✅ Copied!";
            setTimeout(() => {
              statusText.innerText = "Click the code to copy";
            }, 3000);
          });
        });
      }, 300);
    });
  </script>
</body>
</html>
          `);
        }
      } catch (err) {
        console.error("Pairing error:", err);
        if (!responseSent) {
          res.status(500).send("❌ Failed to generate pairing code. Try again.");
        }
      }

    } catch (err) {
      console.error(err);
      await fs.emptyDirSync(__dirname + '/auth_info_baileys');
    }
  }

  startPairing();
});

app.listen(PORT, () =>
  console.log(`🚀 WHIZ‑MD Pair app running → http://localhost:${PORT}`)
);
