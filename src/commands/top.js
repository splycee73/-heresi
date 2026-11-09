const { SlashCommandBuilder } = require('discord.js');
const { UserLevel } = require('../db');
const { calc } = require('../utils/levels');
const { V2, buildEmbed } = require('../utils/embed');

const data = new SlashCommandBuilder().setName('top').setDescription('Top 10 de niveles del servidor');

async function execute(i) {
  const list = await UserLevel.find({ guildId: i.guildId, xp: { $gt: 0 } }).sort({ xp: -1 }).limit(10);
  const medals = ['🥇', '🥈', '🥉'];
  const text = list.length ? list.map((u, n) => `${medals[n] || `**${n + 1}.**`} <@${u.userId}> · Nivel **${calc(u.xp).level}** · ${u.xp} XP`).join('\n') : 'Aún no hay datos.';
  await i.reply({ components: [buildEmbed({ color: '#000000', blocks: [{ t: 'text', c: `## 🏆 Top niveles\n${text}` }] })], flags: V2, allowedMentions: { parse: [] } });
}
module.exports = { data, execute };
