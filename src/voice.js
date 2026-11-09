const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { VOICE_CHANNEL_ID } = require('./config');

let timer = null;
async function connect(client) {
  const ch = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
  if (!ch || !ch.isVoiceBased()) return console.log('[voz] No encuentro el canal de voz', VOICE_CHANNEL_ID);
  const old = getVoiceConnection(ch.guild.id);
  if (old && old.state.status !== VoiceConnectionStatus.Destroyed) return;
  const conn = joinVoiceChannel({
    channelId: ch.id, guildId: ch.guild.id, adapterCreator: ch.guild.voiceAdapterCreator,
    selfDeaf: true, selfMute: false,
  });
  conn.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(conn, VoiceConnectionStatus.Signalling, 5000),
        entersState(conn, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch { try { conn.destroy(); } catch {} schedule(client); }
  });
  conn.on('error', (e) => console.error('[voz]', e.message));
  console.log('[voz] Conectado a', ch.name);
}
function schedule(client) {
  if (timer) return;
  timer = setTimeout(async () => { timer = null; await connect(client).catch(() => {}); }, 5000);
}
function keepAlive(client) {
  connect(client).catch(() => {});
  setInterval(() => connect(client).catch(() => {}), 30000); // revisa cada 30s
}
module.exports = { keepAlive, schedule, connect };
