const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig, saveConfig } = require('../db');
const { notice, V2, EPH, box } = require('../utils/embed');

const C = (n = 'canal') => (s) => s.addChannelOption((o) => o.setName(n).setDescription('Canal de texto').addChannelTypes(ChannelType.GuildText).setRequired(true));
const B = (n = 'activar') => (s) => s.addBooleanOption((o) => o.setName(n).setDescription('Activar o desactivar').setRequired(true));
const I = (n, d, min, max) => (s) => s.addIntegerOption((o) => o.setName(n).setDescription(d).setMinValue(min).setMaxValue(max).setRequired(true));
const U = () => (s) => s.addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true));
const CH = (n, d, choices) => (s) => s.addStringOption((o) => o.setName(n).setDescription(d).setRequired(true).addChoices(...choices.map((c) => ({ name: c, value: c }))));
const sub = (name, desc, ...opts) => (g) => { g.addSubcommand((s) => { s.setName(name).setDescription(desc); opts.forEach((f) => f(s)); return s; }); return g; };
const grp = (name, desc, ...subs) => (b) => b.addSubcommandGroup((g) => { g.setName(name).setDescription(desc); subs.forEach((f) => f(g)); return g; });

const root = new SlashCommandBuilder().setName('seguridad').setDescription('Antinuke y antiraid')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((s) => s.setName('ver').setDescription('Ver el estado de la seguridad'));
[
  grp('antinuke', 'Protección contra nukeos', sub('estado', 'Activar/desactivar', B()),
    sub('limite', 'Acciones destructivas permitidas en un tiempo', I('acciones', 'Cantidad', 1, 20), I('segundos', 'Ventana en segundos', 3, 300)),
    sub('castigo', 'Castigo al superar el límite', CH('tipo', 'Castigo', ['ban', 'kick', 'quitar-roles'])),
    sub('whitelist-agregar', 'Usuario de confianza (solo dueño)', U()), sub('whitelist-quitar', 'Quitar de la whitelist (solo dueño)', U()),
    sub('logs', 'Canal de logs', C()), sub('restaurar', 'Restaurar canales/roles borrados', B())),
  grp('antiraid', 'Protección contra raids', sub('estado', 'Activar/desactivar', B()),
    sub('joins', 'Entradas máximas en un tiempo', I('cantidad', 'Entradas', 2, 50), I('segundos', 'Ventana en segundos', 3, 120)),
    sub('edad-minima', 'Edad mínima de cuenta en días (0 = off)', I('dias', 'Días', 0, 365)),
    sub('accion', 'Acción contra raiders', CH('tipo', 'Acción', ['kick', 'ban', 'timeout'])),
    sub('bloqueo', 'Minutos de bloqueo de entradas tras raid', I('minutos', 'Minutos', 1, 120)),
    sub('logs', 'Canal de logs', C()), sub('sinavatar', 'Sancionar cuentas sin avatar', B())),
].forEach((f) => f(root));
const data = root;

const isOwner = (i) => i.user.id === i.guild.ownerId || i.user.id === process.env.OWNER_ID;
const onoff = (b) => (b ? '🟢 activo' : '🔴 apagado');
const ch = (id) => (id ? `<#${id}>` : '`sin canal`');

async function execute(i) {
  const cfg = await getConfig(i.guildId), o = i.options, a = cfg.antinuke, r = cfg.antiraid;
  const g = o.getSubcommandGroup(false), s = o.getSubcommand(), key = g ? `${g}.${s}` : s;
  if (!isOwner(i)) return i.reply(notice('❌ Solo el dueño del servidor puede cambiar la seguridad.'));
  let out;
  switch (key) {
    case 'ver': return i.reply({ components: [box([
      '## 🛡️ Seguridad',
      `**Antinuke** ${onoff(a.enabled)} · límite **${a.limit}** en **${a.window}s** · castigo **${a.punishment}** · restaurar ${a.restore ? 'sí' : 'no'} · logs ${ch(a.log)}`,
      `└ Whitelist: ${a.whitelist.map((u) => `<@${u}>`).join(' ') || '`vacía`'}`,
      `**Antiraid** ${onoff(r.enabled)} · **${r.joins}** entradas en **${r.window}s** · acción **${r.action}** · bloqueo **${r.lockMinutes}m** · edad mín. **${r.minAge}d** · sin avatar ${r.noAvatar ? 'sí' : 'no'} · logs ${ch(r.log)}`,
    ].join('\n'))], flags: V2 | EPH });
    case 'antinuke.estado': a.enabled = o.getBoolean('activar'); out = `Antinuke ${onoff(a.enabled)}`; break;
    case 'antinuke.limite': a.limit = o.getInteger('acciones'); a.window = o.getInteger('segundos'); out = `Límite: **${a.limit}** acciones en **${a.window}s**`; break;
    case 'antinuke.castigo': a.punishment = o.getString('tipo'); out = `Castigo: **${a.punishment}**`; break;
    case 'antinuke.whitelist-agregar': { const u = o.getUser('usuario'); if (!a.whitelist.includes(u.id)) a.whitelist.push(u.id); out = `${u} añadido a la whitelist`; break; }
    case 'antinuke.whitelist-quitar': { const u = o.getUser('usuario'); a.whitelist = a.whitelist.filter((x) => x !== u.id); out = `${u} quitado de la whitelist`; break; }
    case 'antinuke.logs': a.log = o.getChannel('canal').id; out = `Logs en <#${a.log}>`; break;
    case 'antinuke.restaurar': a.restore = o.getBoolean('activar'); out = `Restauración ${a.restore ? 'activada' : 'desactivada'}`; break;
    case 'antiraid.estado': r.enabled = o.getBoolean('activar'); out = `Antiraid ${onoff(r.enabled)}`; break;
    case 'antiraid.joins': r.joins = o.getInteger('cantidad'); r.window = o.getInteger('segundos'); out = `Raid = **${r.joins}** entradas en **${r.window}s**`; break;
    case 'antiraid.edad-minima': r.minAge = o.getInteger('dias'); out = `Edad mínima: **${r.minAge}** día(s)`; break;
    case 'antiraid.accion': r.action = o.getString('tipo'); out = `Acción: **${r.action}**`; break;
    case 'antiraid.bloqueo': r.lockMinutes = o.getInteger('minutos'); out = `Bloqueo: **${r.lockMinutes}** min`; break;
    case 'antiraid.logs': r.log = o.getChannel('canal').id; out = `Logs en <#${r.log}>`; break;
    case 'antiraid.sinavatar': r.noAvatar = o.getBoolean('activar'); out = `Sancionar sin avatar: ${r.noAvatar ? 'sí' : 'no'}`; break;
    default: return i.reply(notice('❌ Opción desconocida.'));
  }
  await saveConfig(cfg);
  return i.reply(notice(`✅ ${out}`));
}

module.exports = { data, execute };
