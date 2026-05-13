import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CONTROL_URL = 'http://127.0.0.1:3001';
const CONTROL_AUTH = `Bearer ${process.env.VPS_CONTROL_TOKEN || 'run-newsroom-2026'}`;

if (!BOT_TOKEN) {
  console.error('[telegram-bot] TELEGRAM_BOT_TOKEN is not set — exiting');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '✅ *AI Newsroom bot is active*\n\n/run — trigger pipeline\n/logs — fetch recent logs',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/run/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, '⏳ Triggering pipeline...');
  try {
    const res = await fetch(`${CONTROL_URL}/run-pipeline`, {
      method:  'POST',
      headers: { Authorization: CONTROL_AUTH, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      await bot.sendMessage(chatId, '✅ Pipeline started. You\'ll get a notification when it finishes.');
    } else {
      const data = await res.json().catch(() => ({}));
      await bot.sendMessage(chatId, `❌ Failed to start: ${data.error || `HTTP ${res.status}`}`);
    }
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

bot.onText(/\/logs/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await fetch(`${CONTROL_URL}/logs`, {
      headers: { Authorization: CONTROL_AUTH },
    });
    const data = await res.json();
    const lines = (data.lines ?? []).slice(-20);
    const text  = lines.length > 0 ? lines.join('\n') : 'No logs available.';
    // Plain text — log lines may contain special chars that break Markdown
    await bot.sendMessage(chatId, `📋 Recent logs:\n\n${text}`);
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Error fetching logs: ${err.message}`);
  }
});

bot.on('polling_error', (err) => {
  console.error('[telegram-bot] Polling error:', err.message);
});

console.log('[telegram-bot] Started, polling for updates...');
