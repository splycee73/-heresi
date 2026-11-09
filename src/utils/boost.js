const { UserLevel, getConfig } = require('../db');
const { sendTemplate, ctxFromMember } = require('./embed');

// Da el rol del tier más alto alcanzado y quita los otros roles de boost
async function applyBoostRoles(member, cfg, count) {
  const tiers = [...cfg.boost.roles].sort((a, b) => a.boosts - b.boosts);
  const earned = tiers.filter((t) => t.boosts <= count).pop();
  for (const t of tiers) {
    const has = member.roles.cache.has(t.role);
    if (earned && t.role === earned.role) { if (!has) await member.roles.add(t.role, 'Boost').catch(() => {}); }
    else if (has) await member.roles.remove(t.role, 'Boost').catch(() => {});
  }
}

async function registerBoost(member, { set = null, announce = true } = {}) {
  const cfg = await getConfig(member.guild.id);
  const filter = { guildId: member.guild.id, userId: member.id };
  const update = set != null ? { $set: { boosts: set } } : { $inc: { boosts: 1 } };
  const u = await UserLevel.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  await applyBoostRoles(member, cfg, u.boosts);
  if (announce && cfg.boost.enabled) await sendTemplate(member.guild, cfg.boost.channel, 'boost', cfg, ctxFromMember(member, { boosts: u.boosts }));
  return u.boosts;
}

module.exports = { applyBoostRoles, registerBoost };
