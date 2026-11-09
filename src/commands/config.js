const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig, saveConfig } = require('../db');
const { notice, V2, EPH, box } = require('../utils/embed');
const { registerBoost } = require('../utils/boost');

const C = (n = 'canal') => (s) => s.addChannelOption((o) => o.setName(n).setDescription('Canal de texto').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true));
const R = (n = 'rol') => (s) => s.addRoleOption((o) => o.setName(n).setDescription('Rol').setRequired(true));
const B = (n = 'activar') => (s) => s.addBooleanOption((o) => o.setName(n).setDescription('Activar o desactivar').setRequired(true));
const I = (n, d, min, max) => (s) => s.addIntegerOption((o) => o.setName(n).setDescription(d).setMinValue(min).setMaxValue(max).setRequired(true));
const CH = (n, d, choices) => (s) => s.addStringOption((o) => o.setName(n).setDescription(d).setRequired(true).addChoices(...choices.map((c) => ({ name: c, value: c }))));
const sub = (name, desc, ...opts) => (g) => { g.addSubcommand((s) => { s.setName(name).setDescription(desc); opts.forEach((f) => f(s)); return s; }); return g; };
const grp = (name, desc, ...subs) => (b) => b.addSubcommandGroup((g) => { g.setName(name).setDescription(desc); subs.forEach((f) => f(g)); return g; });

const root = new SlashCommandBuilder().setName('config').setDescription('Configura los sistemas del bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((s) => s.setName('ver').setDescription('Ver la configuración actual'));
[
  grp('bienvenida', 'Sistema de bienvenidas', sub('canal', 'Canal de bienvenidas (lo activa)', C()), sub('estado', 'Activar/desactivar', B())),
  grp('despedida', 'Sistema de despedidas', sub('canal', 'Canal de despedidas (lo activa)', C()), sub('estado', 'Activar/desactivar', B())),
  grp('niveles', 'Sistema de niveles', sub('estado', 'Activar/desactivar', B()), sub('canal', 'Canal de avisos de nivel', C()),
    sub('xp', 'XP por mensaje', I('minimo', 'XP mínimo', 1, 500), I('maximo', 'XP máximo', 1, 500)),
    sub('cooldown', 'Segundos entre mensajes que dan XP', I('segundos', 'Segundos', 0, 600)),
    sub('premio', 'Rol al llegar a un nivel', I('nivel', 'Nivel', 1, 500), R()), sub('quitar-premio', 'Quitar premio de nivel', I('nivel', 'Nivel', 1, 500))),
  grp('boost', 'Sistema de boosts', sub('estado', 'Activar/desactivar anuncios', B()), sub('canal', 'Canal de anuncios de boost', C()),
    sub('rol', 'Rol según cantidad de boosts (1, 2...)', I('boosts', 'Cantidad de boosts', 1, 14), R()),
    sub('quitar-rol', 'Quitar rol de boost', I('boosts', 'Cantidad de boosts', 1, 14)),
    sub('sincronizar', 'Registrar 1 boost a quienes ya boostean')),
  grp('autoroles', 'Roles automáticos al entrar', sub('agregar', 'Añadir autorol', R(), CH('tipo', 'A quién', ['humanos', 'bots'])),
    sub('quitar', 'Quitar autorol', R(), CH('tipo', 'A quién', ['humanos', 'bots']))),
].forEach((f) => f(root));

const data = root;
const ch = (id) => (id ? `<#${id}>` : '`sin canal`');
const onoff = (b) => (b ? '🟢 activo' : '🔴 apagado');

function view(cfg) {
  const L = cfg.levels, Bo = cfg.boost;
  return { components: [box([
    '## ⚙️ Configuración',
    `**Bienvenida** ${onoff(cfg.welcome.enabled)} · ${ch(cfg.welcome.channel)}`,
    `**Despedida** ${onoff(cfg.goodbye.enabled)} · ${ch(cfg.goodbye.channel)}`,
    `**Niveles** ${onoff(L.enabled)} · avisos ${ch(L.channel)} · ${L.xpMin}-${L.xpMax} XP / ${L.cooldown}s`,
    `└ Premios: ${L.roles.length ? L.roles.sort((a, b) => a.level - b.level).map((r) => `Nv.${r.level} → <@&${r.role}>`).join(', ') : '`ninguno`'}`,
    `**Boost** ${onoff(Bo.enabled)} · ${ch(Bo.channel)}`,
    `└ Roles: ${Bo.roles.length ? Bo.roles.sort((a, b) => a.boosts - b.boosts).map((r) => `${r.boosts} boost → <@&${r.role}>`).join(', ') : '`ninguno`'}`,
    `**Autoroles** humanos: ${cfg.autoroles.humans.map((r) => `<@&${r}>`).join(' ') || '`ninguno`'} · bots: ${cfg.autoroles.bots.map((r) => `<@&${r}>`).join(' ') || '`ninguno`'}`,
    '-# Diseño de cada sistema: **/embed plantilla:...** · Seguridad: **/seguridad**',
  ].join('\n'))], flags: V2 | EPH };
}

async function execute(i) {
  const cfg = await getConfig(i.guildId), o = i.options;
  const g = o.getSubcommandGroup(false), s = o.getSubcommand(), key = g ? `${g}.${s}` : s;
  let out;
  switch (key) {
    case 'ver': return i.reply(view(cfg));
    case 'bienvenida.canal': cfg.welcome.channel = o.getChannel('canal').id; cfg.welcome.enabled = true; out = `Bienvenidas activas en <#${cfg.welcome.channel}>. Cambia el diseño con **/embed plantilla:Bienvenida**`; break;
    case 'bienvenida.estado': cfg.welcome.enabled = o.getBoolean('activar'); out = `Bienvenidas ${onoff(cfg.welcome.enabled)}`; break;
    case 'despedida.canal': cfg.goodbye.channel = o.getChannel('canal').id; cfg.goodbye.enabled = true; out = `Despedidas activas en <#${cfg.goodbye.channel}>`; break;
    case 'despedida.estado': cfg.goodbye.enabled = o.getBoolean('activar'); out = `Despedidas ${onoff(cfg.goodbye.enabled)}`; break;
    case 'niveles.estado': cfg.levels.enabled = o.getBoolean('activar'); out = `Niveles ${onoff(cfg.levels.enabled)}`; break;
    case 'niveles.canal': cfg.levels.channel = o.getChannel('canal').id; out = `Avisos de nivel en <#${cfg.levels.channel}>`; break;
    case 'niveles.xp': {
      const a = o.getInteger('minimo'), b = o.getInteger('maximo');
      if (a > b) return i.reply(notice('❌ El mínimo no puede ser mayor que el máximo.'));
      cfg.levels.xpMin = a; cfg.levels.xpMax = b; out = `XP por mensaje: **${a}-${b}**`; break;
    }
    case 'niveles.cooldown': cfg.levels.cooldown = o.getInteger('segundos'); out = `Cooldown de XP: **${cfg.levels.cooldown}s**`; break;
    case 'niveles.premio': {
      const n = o.getInteger('nivel'), r = o.getRole('rol');
      if (r.position >= i.guild.members.me.roles.highest.position) return i.reply(notice('❌ Ese rol está por encima de mi rol más alto.'));
      cfg.levels.roles = cfg.levels.roles.filter((x) => x.level !== n); cfg.levels.roles.push({ level: n, role: r.id });
      out = `Nivel **${n}** → ${r}`; break;
    }
    case 'niveles.quitar-premio': cfg.levels.roles = cfg.levels.roles.filter((x) => x.level !== o.getInteger('nivel')); out = 'Premio eliminado.'; break;
    case 'boost.estado': cfg.boost.enabled = o.getBoolean('activar'); out = `Anuncios de boost ${onoff(cfg.boost.enabled)}`; break;
    case 'boost.canal': cfg.boost.channel = o.getChannel('canal').id; cfg.boost.enabled = true; out = `Anuncios de boost en <#${cfg.boost.channel}>`; break;
    case 'boost.rol': {
      const n = o.getInteger('boosts'), r = o.getRole('rol');
      if (r.position >= i.guild.members.me.roles.highest.position) return i.reply(notice('❌ Ese rol está por encima de mi rol más alto.'));
      cfg.boost.roles = cfg.boost.roles.filter((x) => x.boosts !== n); cfg.boost.roles.push({ boosts: n, role: r.id });
      out = `**${n}** boost(s) → ${r}`; break;
    }
    case 'boost.quitar-rol': cfg.boost.roles = cfg.boost.roles.filter((x) => x.boosts !== o.getInteger('boosts')); out = 'Rol de boost eliminado.'; break;
    case 'boost.sincronizar': {
      await i.deferReply({ flags: EPH });
      const members = await i.guild.members.fetch();
      let n = 0;
      for (const m of members.values()) if (m.premiumSince) { await registerBoost(m, { set: 1, announce: false }); n++; }
      return i.editReply({ components: [box(`✅ Sincronizados **${n}** boosters (1 boost c/u). Los siguientes boosts se cuentan solos.`)], flags: V2 });
    }
    case 'autoroles.agregar': case 'autoroles.quitar': {
      const r = o.getRole('rol'), list = o.getString('tipo') === 'bots' ? cfg.autoroles.bots : cfg.autoroles.humans;
      if (s === 'agregar') {
        if (r.managed || r.position >= i.guild.members.me.roles.highest.position) return i.reply(notice('❌ No puedo asignar ese rol (jerarquía o rol de integración).'));
        if (!list.includes(r.id)) list.push(r.id);
      } else { const k = list.indexOf(r.id); if (k >= 0) list.splice(k, 1); }
      out = `Autoroles (${o.getString('tipo')}) actualizados: ${s === 'agregar' ? 'añadido' : 'quitado'} ${r}`; break;
    }
    default: return i.reply(notice('❌ Opción desconocida.'));
  }
  await saveConfig(cfg);
  return i.reply(notice(`✅ ${out}`));
}

module.exports = { data, execute };
