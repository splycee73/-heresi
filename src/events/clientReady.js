const { Events } = require('discord.js');
const startPresence = require('../presence');
const voice = require('../voice');

module.exports = {
  name: Events.ClientReady, once: true,
  async execute(client) {
    console.log(`✅ Conectado como ${client.user.tag}`);
    const body = [...client.commands.values()].map((c) => c.data.toJSON());
    if (process.env.GUILD_ID) {
      const g = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
      if (g) await g.commands.set(body);
    } else await client.application.commands.set(body);
    startPresence(client);
    voice.keepAlive(client);
  },
};
