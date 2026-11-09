const { Events } = require('discord.js');
const { getConfig } = require('../db');
const { sendTemplate, ctxFromMember } = require('../utils/embed');
const antiraid = require('../security/antiraid');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(m) {
    const cfg = await getConfig(m.guild.id);
    if (await antiraid.check(m, cfg)) return;
    const ids = (m.user.bot ? cfg.autoroles.bots : cfg.autoroles.humans).filter((id) => m.guild.roles.cache.has(id));
    if (ids.length) await m.roles.add(ids, 'Autorol').catch(() => {});
    if (cfg.welcome.enabled && !m.user.bot) await sendTemplate(m.guild, cfg.welcome.channel, 'welcome', cfg, ctxFromMember(m));
  },
};
