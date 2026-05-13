// Lightweight Telegram notification — uses global fetch (Node 22), no extra dep.
export async function notifyTelegram(message) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
  } catch (err) {
    console.error('[telegram] Notification failed:', err.message);
  }
}
