const { logTo } = require('../utils/embed');

const joins = new Map(); // guildId -> [{id,t}]
const lock = new Map();  // guildId -> timestamp hasta cuando

async function act(member, how, reason) {
  try {
    await member.send(`Fuiste expulsado de **${member.guild.name}** por el sistema anti-raid: ${reason}`).catch(() => {});
    if (how === 'ban') await member.ban({ reason: `Antiraid: ${reason}` });
    else if (how === 'timeout') await member.timeout(28 * 24 * 60 * 60 * 1000, `Antiraid: ${reason}`);
    else await member.kick(`Antiraid: ${reason}`);
    return true;
  } catch { return false; }
}

// Devuelve true si el miembro fue sancionado
async function check(member, cfg) {
  const a = cfg.antiraid;
  if (!a.enabled || member.user.bot) return false;
  const g = member.guild, now = Date.now();
  let arr = (joins.get(g.id) || []).filter((x) => now - x.t < a.window * 1000);
  arr.push({ id: member.id, t: now });
  joins.set(g.id, arr);

  let reason = null;
  if ((lock.get(g.id) || 0) > now) reason = 'Modo anti-raid activo';
  else if (arr.length >= a.joins) {
    lock.set(g.id, now + a.lockMinutes * 60000);
    await logTo(g, a.log, `🚨 **Raid detectada** · ${arr.length} entradas en ${a.window}s. Bloqueo de entradas por **${a.lockMinutes} min**.`);
    for (const x of arr) {
      if (x.id === member.id) continue;
      const m = await g.members.fetch(x.id).catch(() => null);
      if (m) await act(m, a.action, 'Raid detectada');
    }
    reason = 'Raid detectada';
  } else if (a.minAge && now - member.user.createdTimestamp < a.minAge * 86400000) reason = `Cuenta con menos de ${a.minAge} día(s)`;
  else if (a.noAvatar && !member.user.avatar) reason = 'Cuenta sin avatar';

  if (!reason) return false;
  const ok = await act(member, a.action, reason);
  await logTo(g, a.log, `🚫 **Antiraid** · ${member} (${member.user.username}) → **${a.action}** · ${reason}${ok ? '' : ' (no pude sancionar, revisa mi jerarquía)'}`);
  return ok;
}

module.exports = { check };
