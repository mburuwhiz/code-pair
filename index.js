const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const Pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 5000;
const authDir = path.join(__dirname, 'auth_info');
fs.ensureDirSync(authDir);

app.use(express.static('public'));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const MESSAGE = `
━━━━━━━━━━━━━━━━━━━━━━━
  *✅  WHIZ-MD LINKED SUCCESSFULLY*
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

const pairing = {};
function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.get('/', (req, res) => res.render('pair'));
app.post('/generate', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone number' });

  const code = genCode();
  pairing[code] = { phone, used: false };
  res.json({ code });
  startPair(code);
});

async function startPair(code) {
  const entry = pairing[code];
  if (!entry) return;

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const sock = makeWASocket({
    logger: Pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: Browsers.macOS('WHIZ-MD'),
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection }) => {
    if (connection === 'open' && !entry.used) {
      entry.used = true;

      try {
        const sessionData = await fs.readFile(path.join(authDir, 'creds.json'));
        const sessionId = 'WHIZMD_' + Buffer.from(sessionData).toString('base64');

        await sock.sendMessage(sock.user.id, { text: `\`\`\`\nSESSION-ID ==> ${sessionId}\n\`\`\`` });
        await sock.sendMessage(sock.user.id, { text: MESSAGE });

        const audioUrl = 'https://s31.aconvert.com/convert/p3r68-cdx67/gmz3g-g051v.mp3';
        const audioResp = await axios.get(audioUrl, { responseType: 'arraybuffer' });

        await sock.sendMessage(sock.user.id, {
          audio: Buffer.from(audioResp.data),
          mimetype: 'audio/mpeg',
          ptt: false
        });

        await new Promise(r => setTimeout(r, 2000));
        sock.end();
        await fs.emptyDir(authDir);
      } catch (e) {
        console.error('❌ Error sending post-pair messages:', e);
      }
    }
  });
}

app.listen(PORT, () => console.log(`✅ WHIZ Pairing Service running at http://localhost:${PORT}`));
