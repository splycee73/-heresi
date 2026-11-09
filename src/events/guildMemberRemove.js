const { Events } = require('discord.js');
const { getConfig } = require('../db');
const { sendTemplate, ctxFromMember } = require('../utils/embed');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(m) {
    if (m.user.bot) return;
    const cfg = await getConfig(m.guild.id);
    if (cfg.goodbye.enabled) await sendTemplate(m.guild, cfg.goodbye.channel, 'goodbye', cfg, ctxFromMember(m));
  },
};
