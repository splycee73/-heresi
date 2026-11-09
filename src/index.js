require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const antinuke = require('./security/antinuke');

// Servidor web mínimo (Render lo necesita para mantener el servicio "web" vivo)
const app = express();
app.get('/', (_, res) => res.send('heresi bot online'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web lista'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildWebhooks,
  ],
});

client.commands = new Collection();
for (const f of fs.readdirSync(path.join(__dirname, 'commands')).filter((x) => x.endsWith('.js'))) {
  const cmd = require(`./commands/${f}`);
  client.commands.set(cmd.data.name, cmd);
}
for (const f of fs.readdirSync(path.join(__dirname, 'events')).filter((x) => x.endsWith('.js'))) {
  const ev = require(`./events/${f}`);
  client[ev.once ? 'once' : 'on'](ev.name, (...args) => ev.execute(...args, client).catch?.((e) => console.error(ev.name, e)));
}
antinuke.register(client);

process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));
process.on('uncaughtException', (e) => console.error('uncaughtException', e));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('🍃 MongoDB conectado');
  await client.login(process.env.TOKEN);
})();
