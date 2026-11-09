const { Events, MessageType } = require('discord.js');
const { UserLevel, getConfig } = require('../db');
const { calc } = require('../utils/levels');
const { sendTemplate, ctxFromMember } = require('../utils/embed');
const { registerBoost } = require('../utils/boost');

const cooldowns = new Map();
const BOOST_TYPES = [MessageType.GuildBoost, MessageType.GuildBoostTier1, MessageType.GuildBoostTier2, MessageType.GuildBoostTier3];
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

module.exports = {
  name: Events.MessageCreate,
  async execute(m) {
    if (!m.guild) return;

    // Cada boost genera un mensaje de sistema -> así contamos 1er boost, 2do boost, etc.
    if (BOOST_TYPES.includes(m.type)) {
      const member = m.member || (await m.guild.members.fetch(m.author.id).catch(() => null));
      if (member) await registerBoost(member);
      return;
    }
    if (m.author.bot || m.system) return;

    const cfg = await getConfig(m.guild.id);
    if (!cfg.levels.enabled) return;
    const key = `${m.guild.id}:${m.author.id}`;
    if ((cooldowns.get(key) || 0) > Date.now()) return;
    cooldowns.set(key, Date.now() + cfg.levels.cooldown * 1000);

    const gain = rand(cfg.levels.xpMin, cfg.levels.xpMax);
    const u = await UserLevel.findOneAndUpdate({ guildId: m.guild.id, userId: m.author.id },
      { $inc: { xp: gain, messages: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const { level } = calc(u.xp);
    if (level <= u.level) return;
    u.level = level; await u.save();

    const member = m.member || (await m.guild.members.fetch(m.author.id).catch(() => null));
    if (!member) return;
    const earned = cfg.levels.roles.filter((r) => r.level <= level).map((r) => r.role).filter((id) => m.guild.roles.cache.has(id));
    if (earned.length) await member.roles.add(earned, 'Premio de nivel').catch(() => {});
    await sendTemplate(m.guild, cfg.levels.channel || m.channel.id, 'levelup', cfg, ctxFromMember(member, { level }));
  },
};
