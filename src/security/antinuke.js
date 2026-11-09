const { AuditLogEvent, Events } = require('discord.js');
const { getConfig } = require('../db');
const { logTo } = require('../utils/embed');

const hits = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function executor(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const e = logs.entries.find((x) => (!targetId || x.targetId === targetId) && Date.now() - x.createdTimestamp < 15000);
    return e ? e.executor : null;
  } catch { return null; }
}

async function punish(guild, id, how, reason) {
  try {
    if (how === 'ban') await guild.members.ban(id, { reason: `Antinuke: ${reason}` });
    else {
      const m = await guild.members.fetch(id);
      if (how === 'kick') await m.kick(`Antinuke: ${reason}`);
      else await m.roles.remove(m.roles.cache.filter((r) => r.id !== guild.id && r.editable), `Antinuke: ${reason}`);
    }
    return true;
  } catch { return false; }
}

async function track(guild, type, targetId, label, restore) {
  const cfg = await getConfig(guild.id);
  const a = cfg.antinuke;
  if (!a.enabled) return null;
  await sleep(1200);
  const ex = await executor(guild, type, targetId);
  if (!ex || ex.id === guild.client.user.id || ex.id === guild.ownerId || ex.id === process.env.OWNER_ID || a.whitelist.includes(ex.id)) return null;
  if (a.restore && restore) await restore().catch(() => {});
  const k = `${guild.id}:${ex.id}`, now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < a.window * 1000);
  arr.push(now); hits.set(k, arr);
  await logTo(guild, a.log, `🛡️ **Antinuke** · <@${ex.id}> ${label} (${arr.length}/${a.limit})`);
  if (arr.length >= a.limit) {
    hits.delete(k);
    const ok = await punish(guild, ex.id, a.punishment, label);
    await logTo(guild, a.log, `⛔ **Antinuke** · <@${ex.id}> sancionado con **${a.punishment}**${ok ? '' : ' — falló, mi rol debe estar por encima del suyo'}`);
  }
  return ex;
}

function register(client) {
  client.on(Events.ChannelDelete, (ch) => ch.guild && track(ch.guild, AuditLogEvent.ChannelDelete, ch.id, 'eliminó un canal', () =>
    ch.guild.channels.create({
      name: ch.name, type: ch.type, parent: ch.parentId, topic: ch.topic ?? undefined, nsfw: ch.nsfw,
      position: ch.rawPosition,
      permissionOverwrites: ch.permissionOverwrites.cache.map((o) => ({ id: o.id, type: o.type, allow: o.allow, deny: o.deny })),
    })));

  client.on(Events.ChannelCreate, (ch) => ch.guild && track(ch.guild, AuditLogEvent.ChannelCreate, ch.id, 'creó un canal', () => ch.delete('Antinuke')));

  client.on(Events.GuildRoleDelete, (r) => track(r.guild, AuditLogEvent.RoleDelete, r.id, 'eliminó un rol', () =>
    r.guild.roles.create({ name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: r.permissions, reason: 'Antinuke: restaurado' })));

  client.on(Events.GuildRoleCreate, (r) => track(r.guild, AuditLogEvent.RoleCreate, r.id, 'creó un rol', () => r.delete('Antinuke')));

  client.on(Events.GuildBanAdd, (b) => track(b.guild, AuditLogEvent.MemberBanAdd, b.user.id, `baneó a ${b.user.username}`, () => b.guild.members.unban(b.user.id, 'Antinuke')));

  client.on(Events.GuildMemberRemove, (m) => track(m.guild, AuditLogEvent.MemberKick, m.id, `expulsó a ${m.user.username}`, null));

  client.on(Events.WebhooksUpdate, async (ch) => {
    const ex = await track(ch.guild, AuditLogEvent.WebhookCreate, null, 'creó un webhook', null);
    if (ex) { const hooks = await ch.fetchWebhooks().catch(() => null); hooks?.filter((h) => h.owner?.id === ex.id).forEach((h) => h.delete('Antinuke').catch(() => {})); }
  });

  client.on(Events.GuildMemberAdd, async (m) => {
    if (!m.user.bot) return;
    const ex = await track(m.guild, AuditLogEvent.BotAdd, m.id, `añadió al bot ${m.user.username}`, () => m.kick('Antinuke: bot no autorizado'));
    return ex;
  });
}

module.exports = { register };
