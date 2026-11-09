const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { V2, buildEmbed, notice } = require('../utils/embed');

const DANGER = [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers];

const data = (() => {
  const b = new SlashCommandBuilder().setName('autorol').setDescription('Envía un panel de roles con botones (los usuarios se auto-asignan)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) => o.setName('rol1').setDescription('Rol 1').setRequired(true));
  for (let n = 2; n <= 8; n++) b.addRoleOption((o) => o.setName(`rol${n}`).setDescription(`Rol ${n}`));
  return b
    .addChannelOption((o) => o.setName('canal').setDescription('Canal donde enviar el panel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('titulo').setDescription('Título del panel'))
    .addStringOption((o) => o.setName('descripcion').setDescription('Descripción (usa \\n para salto de línea)'))
    .addStringOption((o) => o.setName('banner').setDescription('URL de imagen arriba del panel'))
    .addStringOption((o) => o.setName('color').setDescription('Color HEX, por defecto #000000'));
})();

async function execute(i) {
  const me = i.guild.members.me;
  const roles = [];
  for (let n = 1; n <= 8; n++) { const r = i.options.getRole(`rol${n}`); if (r && !roles.find((x) => x.id === r.id)) roles.push(r); }
  const bad = roles.filter((r) => r.managed || r.id === i.guild.id || r.position >= me.roles.highest.position || r.permissions.any(DANGER));
  if (bad.length) return i.reply(notice(`❌ No puedo usar: ${bad.map((r) => r.name).join(', ')}\n-# Deben estar por debajo de mi rol, no ser de integración ni tener permisos peligrosos.`));

  const blocks = [];
  const banner = i.options.getString('banner');
  if (banner) blocks.push({ t: 'img', urls: [banner] });
  const desc = (i.options.getString('descripcion') || 'Pulsa un botón para obtener o quitarte el rol.').replace(/\\n/g, '\n');
  blocks.push({ t: 'text', c: `## ${i.options.getString('titulo') || 'Elige tus roles'}\n${desc}` }, { t: 'sep', line: true });
  const c = buildEmbed({ color: i.options.getString('color') || '#000000', blocks });
  for (let k = 0; k < roles.length; k += 5) {
    c.addActionRowComponents(new ActionRowBuilder().addComponents(roles.slice(k, k + 5).map((r) =>
      new ButtonBuilder().setCustomId(`ar:${r.id}`).setLabel(r.name.slice(0, 80)).setStyle(ButtonStyle.Secondary))));
  }
  const ch = i.options.getChannel('canal') || i.channel;
  try {
    await ch.send({ components: [c], flags: V2, allowedMentions: { parse: [] } });
    await i.reply(notice(`✅ Panel enviado en ${ch}`));
  } catch (e) { await i.reply(notice(`❌ No pude enviar el panel: ${e.message}`)); }
}

async function handleButton(i) {
  const id = i.customId.slice(3);
  const role = i.guild.roles.cache.get(id);
  if (!role) return i.reply(notice('❌ Ese rol ya no existe.'));
  const has = i.member.roles.cache.has(id);
  try {
    if (has) await i.member.roles.remove(id, 'Autorol panel'); else await i.member.roles.add(id, 'Autorol panel');
    return i.reply(notice(has ? `➖ Te quité ${role}` : `➕ Te di ${role}`));
  } catch { return i.reply(notice('❌ No pude cambiar tu rol (revisa mi jerarquía).')); }
}

module.exports = { data, execute, handleButton };
