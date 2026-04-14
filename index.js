import 'dotenv/config';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs';
import Groq from 'groq-sdk';
import { systemPrompt } from './prompt.js';
import IoTHandler from './iot_handler.js';
import qrcode from 'qrcode-terminal';

// Global error catcher
process.on('uncaughtException', (err) => {
    console.error('🔥 CRITICAL ERROR:', err);
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey: GROQ_API_KEY });
const HISTORY_FILE = './history.json';
const PORT = process.env.PORT || 3000;

let chatHistory = {};
if (fs.existsSync(HISTORY_FILE)) {
    try { chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch (e) { chatHistory = {}; }
}

function saveHistory() {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
}

// Inisialisasi Server IoT agar proses tidak Clean Exit
const iot = new IoTHandler(async (msg) => {
    console.log("[Hardware Alert]:", msg);
});
iot.init(PORT);

async function startBot() {
    console.log('🔄 Menghubungkan ke WhatsApp...');

    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { version } = await fetchLatestBaileysVersion();

        // Menggunakan factory function Baileys secara langsung
        const sock = (makeWASocket.default || makeWASocket)({
            version,
            logger: pino({ level: 'silent' }),
            auth: state,
            browser: ['IoTDevBot', 'Chrome', '1.0.0']
        });

        // Store kita matikan dulu karena sering menyebabkan crash di Node v25
        // store.bind(sock.ev);

        iot.broadcastFunc = async (msg) => {
            const target = process.env.WA_NUMBER;
            if (target && sock.user) await sock.sendMessage(target, { text: msg });
        };

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                console.log("📲 SCAN QR CODE DI BAWAH INI:");
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error?.output?.statusCode : null;
                console.log('❌ Putus. Status:', statusCode);
                if (statusCode !== DisconnectReason.loggedOut) {
                    setTimeout(() => startBot(), 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp Terhubung!');
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const sender = msg.key.remoteJid;
            let text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            if (!text) return;

            // --- MODE BEBAS: Respon semua pesan tanpa perlu tag/mention ---
            const isGroup = sender.endsWith('@g.us');
            
            // Log untuk memantau trafik masuk
            console.log(`📩 [${isGroup ? 'GROUP' : 'JAPRI'}] - ${sender.split('@')[0]} : ${text}`);

            console.log(`📩 [${sender}] : ${text}`);

            if (text.startsWith('!status')) {
                await sock.sendMessage(sender, { text: `📊 *Status Sensor:*\n\n${iot.getLatestData()}` });
                return;
            }

            if (text.toLowerCase().startsWith('!led ')) {
                const cmd = text.split(' ')[1]?.toUpperCase();
                if (cmd === 'ON' || cmd === 'OFF') {
                    iot.setDeviceStatus('led', cmd);
                    await sock.sendMessage(sender, { text: `✅ LED diatur ke ${cmd}` });
                }
                return;
            }

            try {
                if (!chatHistory[sender]) chatHistory[sender] = [];
                chatHistory[sender].push({ role: "user", content: text });
                const context = chatHistory[sender].slice(-10);
                const completion = await groq.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }, ...context],
                    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
                });
                const reply = completion.choices[0]?.message?.content || "Sistem AI sibuk.";
                chatHistory[sender].push({ role: "assistant", content: reply });
                saveHistory();
                await sock.sendMessage(sender, { text: reply });
            } catch (err) {
                console.error('❌ Error Groq:', err.message);
            }
        });
    } catch (error) {
        console.error('🔥 Error saat mulai:', error);
    }
}

startBot();
