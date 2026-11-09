const { Events } = require('discord.js');
const { notice } = require('../utils/embed');
const embed = require('../commands/embed');
const autorol = require('../commands/autorol');

module.exports = {
  name: Events.InteractionCreate,
  async execute(i, client) {
    try {
      if (i.isChatInputCommand()) return await client.commands.get(i.commandName)?.execute(i);
      const id = i.customId || '';
      if (id.startsWith('eb:')) {
        if (!i.memberPermissions?.has('ManageGuild')) return i.reply(notice('❌ No tienes permiso.'));
        return await embed.handle(i);
      }
      if (id.startsWith('ar:')) return await autorol.handleButton(i);
    } catch (e) {
      console.error('interaction error:', e);
      const p = notice('❌ Ocurrió un error ejecutando esto.');
      if (i.replied || i.deferred) i.followUp(p).catch(() => {}); else i.reply(p).catch(() => {});
    }
  },
};
