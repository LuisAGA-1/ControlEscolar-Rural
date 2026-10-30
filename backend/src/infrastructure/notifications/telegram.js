// Adaptador de salida: Bot de Telegram. Sin token, solo escribe en consola.
export function crearNotificadorTelegram(token = process.env.TELEGRAM_BOT_TOKEN) {
  return {
    async enviar(chatId, texto) {
      if (!token) {
        console.log(`[Telegram desactivado] a ${chatId}: ${texto}`);
        return false; // la alerta queda pendiente para cuando haya token
      }
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: texto }),
      });
      return r.ok;
    },
  };
}
