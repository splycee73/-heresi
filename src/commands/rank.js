const { SlashCommandBuilder } = require('discord.js');
const { UserLevel } = require('../db');
const { calc } = require('../utils/levels');
const { V2, buildEmbed } = require('../utils/embed');

const data = new SlashCommandBuilder().setName('rank').setDescription('Mira tu nivel y XP')
  .addUserOption((o) => o.setName('usuario').setDescription('Usuario a consultar'));

async function execute(i) {
  const user = i.options.getUser('usuario') || i.user;
  const u = await UserLevel.findOne({ guildId: i.guildId, userId: user.id });
  const xp = u ? u.xp : 0, { level, cur, need } = calc(xp);
  const pos = (await UserLevel.countDocuments({ guildId: i.guildId, xp: { $gt: xp } })) + 1;
  const filled = Math.round((cur / need) * 12);
  const bar = '▰'.repeat(filled) + '▱'.repeat(12 - filled);
  await i.reply({
    components: [buildEmbed({ color: '#000000', blocks: [{ t: 'sec', thumb: user.displayAvatarURL({ extension: 'png', size: 256 }),
      c: `## ${user.displayName}\n**Nivel ${level}** · Puesto **#${pos}**\n${bar}  \`${cur}/${need} XP\`\n-# ${u ? u.messages : 0} mensajes` }] })],
    flags: V2, allowedMentions: { parse: [] },
  });
}
module.exports = { data, execute };
