// Edita aquí el estado del bot
module.exports = {
  VOICE_CHANNEL_ID: process.env.VOICE_CHANNEL_ID || '1569156109342875698',
  STATUS_ROTATION_MS: 12000,
  // Cada elemento se muestra de forma rotativa
  statuses: [
    { kind: 'custom', text: 'sal deidad' },
    { kind: 'custom', text: './heresi On Top' },
    { kind: 'watching', text: (n) => `a ${n.toLocaleString('es')} miembros` },
  ],
};
