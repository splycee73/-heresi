const { Events } = require('discord.js');
const { UserLevel, getConfig } = require('../db');
const { registerBoost, applyBoostRoles } = require('../utils/boost');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(old, neu) {
    // Empezó a boostear: respaldo por si el mensaje de sistema de boost está desactivado
    if (!old.premiumSince && neu.premiumSince) {
      setTimeout(async () => {
        const u = await UserLevel.findOne({ guildId: neu.guild.id, userId: neu.id });
        if (!u || u.boosts < 1) await registerBoost(neu, { set: 1 });
      }, 8000);
    }
    // Dejó de boostear
    if (old.premiumSince && !neu.premiumSince) {
      const cfg = await getConfig(neu.guild.id);
      await UserLevel.updateOne({ guildId: neu.guild.id, userId: neu.id }, { $set: { boosts: 0 } });
      await applyBoostRoles(neu, cfg, 0);
    }
  },
};
