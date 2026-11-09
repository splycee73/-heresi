const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { V2, EPH, isUrl, td, defaultDoc, TEMPLATE_DEFAULTS, buildEmbed, ctxFromMember, notice, box } = require('../utils/embed');
const { getConfig, saveConfig } = require('../db');

const states = new Map();
const TPL = { welcome: 'Bienvenida', goodbye: 'Despedida', boost: 'Boost', levelup: 'Subida de nivel' };
const NAMES = { text: 'Texto', sep: 'Separador', img: 'Imagen(es)', sec: 'Sección', btn: 'Botón' };

// [id, label, style(1 corto / 2 párrafo), max, requerido]
const FIELDS = {
  text: [['c', 'Contenido (markdown, ## títulos)', 2, 2000, true]],
  sep: [['line', '¿Mostrar línea? (si / no)', 1, 3, false], ['big', '¿Espacio grande? (si / no)', 1, 3, false]],
  img: [['urls', 'URLs de imágenes (una por línea)', 2, 2000, true]],
  sec: [['c', 'Texto de la sección', 2, 2000, true], ['thumb', 'Miniatura (URL o {user.avatar})', 1, 500, false]],
  btn: [['label', 'Texto del botón', 1, 80, true], ['url', 'URL del botón', 1, 500, true], ['emoji', 'Emoji (opcional)', 1, 50, false]],
};

const data = new SlashCommandBuilder().setName('embed').setDescription('Crea y envía embeds V2 totalmente personalizados')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((o) => o.setName('canal').setDescription('Canal donde enviarlo (por defecto este)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
  .addStringOption((o) => o.setName('plantilla').setDescription('Editar el diseño de un sistema (bienvenida, boost...)')
    .addChoices(...Object.entries(TPL).map(([value, name]) => ({ name, value }))));

const summary = (b) => (b.t === 'text' || b.t === 'sec' ? b.c : b.t === 'img' ? `${(b.urls || []).length} imagen(es)` : b.t === 'btn' ? `${b.label} → ${b.url}`
  : `línea: ${b.line !== false ? 'sí' : 'no'} · grande: ${b.big ? 'sí' : 'no'}`).replace(/\s+/g, ' ').slice(0, 100) || '—';

function valueOf(t, b, id) {
  if (!b) return id === 'line' ? 'si' : id === 'big' ? 'no' : '';
  if (id === 'line') return b.line === false ? 'no' : 'si';
  if (id === 'big') return b.big ? 'si' : 'no';
  if (id === 'urls') return (b.urls || []).join('\n');
  return b[id] || '';
}

function modalFor(t, b, customId) {
  const m = new ModalBuilder().setCustomId(customId).setTitle(`${b ? 'Editar' : 'Añadir'} ${NAMES[t]}`.slice(0, 45));
  for (const [id, label, style, max, req] of FIELDS[t]) {
    const inp = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style === 2 ? TextInputStyle.Paragraph : TextInputStyle.Short).setMaxLength(max).setRequired(req);
    const v = valueOf(t, b, id); if (v) inp.setValue(String(v).slice(0, max));
    m.addComponents(new ActionRowBuilder().addComponents(inp));
  }
  return m;
}

function toBlock(t, f) {
  if (t === 'text') return { t, c: f.c };
  if (t === 'sep') return { t, line: !/^n/i.test(f.line || 'si'), big: /^(s|y)/i.test(f.big || '') };
  if (t === 'img') { const urls = f.urls.split(/\s+/).filter(isUrl).slice(0, 10); return urls.length ? { t, urls } : null; }
  if (t === 'sec') return { t, c: f.c, thumb: f.thumb || '' };
  if (t === 'btn') return isUrl(f.url) ? { t, label: f.label, url: f.url, emoji: f.emoji || '' } : null;
}

function render(uid, member) {
  const s = states.get(uid), bl = s.doc.blocks;
  const rows = [];
  if (bl.length) rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('eb:sel').setPlaceholder('Selecciona un bloque para editarlo / moverlo')
    .addOptions(bl.map((b, i) => ({ label: `${i + 1}. ${NAMES[b.t]}`, description: summary(b), value: String(i), default: i === s.sel })))));
  const btn = (id, label, style = ButtonStyle.Secondary, dis = false) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(dis);
  const full = bl.length >= 25, none = !bl.length;
  rows.push(new ActionRowBuilder().addComponents(btn('eb:add:text', '+ Texto', 2, full), btn('eb:add:sep', '+ Separador', 2, full), btn('eb:add:img', '+ Imagen', 2, full), btn('eb:add:sec', '+ Sección', 2, full), btn('eb:add:btn', '+ Botón', 2, full)));
  rows.push(new ActionRowBuilder().addComponents(btn('eb:edit', 'Editar', 1, none), btn('eb:up', '↑', 2, none), btn('eb:down', '↓', 2, none), btn('eb:del', 'Eliminar', 4, none), btn('eb:color', '🎨 Color')));
  rows.push(new ActionRowBuilder().addComponents(btn('eb:send', 'Enviar', 3), btn('eb:cancel', 'Cerrar', 4)));
  rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('eb:save').setPlaceholder('Guardar como diseño de un sistema…')
    .addOptions(Object.entries(TPL).map(([value, label]) => ({ label, value })))));
  return {
    components: [
      box(`**Constructor de embeds V2** · se enviará en <#${s.channelId}>\n-# Variables: {user} {user.name} {user.avatar} {server} {server.icon} {memberCount} {level} {boosts}`),
      buildEmbed(s.doc, ctxFromMember(member)), ...rows,
    ],
  };
}

async function execute(i) {
  const key = i.options.getString('plantilla');
  let doc = defaultDoc();
  if (key) { const cfg = await getConfig(i.guildId); doc = JSON.parse(JSON.stringify((cfg.templates && cfg.templates[key]) || TEMPLATE_DEFAULTS[key])); }
  const ch = i.options.getChannel('canal') || i.channel;
  states.set(i.user.id, { doc, sel: 0, channelId: ch.id });
  await i.reply({ ...render(i.user.id, i.member), flags: V2 | EPH });
}

async function handle(i) {
  const s = states.get(i.user.id);
  if (!s) return i.reply(notice('⌛ Sesión expirada. Usa **/embed** otra vez.'));
  const bl = s.doc.blocks;
  const upd = () => i.update({ ...render(i.user.id, i.member), flags: V2 });
  const p = i.customId.split(':');

  if (i.isModalSubmit()) {
    const [, , mode, type] = p;
    if (mode === 'color') {
      const v = i.fields.getTextInputValue('color').trim();
      if (!/^#?[0-9a-f]{6}$/i.test(v)) return i.reply(notice('❌ Color inválido. Ej: #000000'));
      s.doc.color = '#' + v.replace('#', ''); return upd();
    }
    const f = {}; for (const [id] of FIELDS[type]) f[id] = i.fields.getTextInputValue(id);
    const blk = toBlock(type, f);
    if (!blk) return i.reply(notice('❌ Datos inválidos (revisa que las URLs empiecen por https://).'));
    if (mode === 'add') { bl.push(blk); s.sel = bl.length - 1; } else bl[s.sel] = blk;
    return upd();
  }

  const act = p[1];
  if (i.isStringSelectMenu() && act === 'sel') { s.sel = Number(i.values[0]); return upd(); }
  if (i.isStringSelectMenu() && act === 'save') {
    const cfg = await getConfig(i.guildId);
    cfg.templates = { ...(cfg.templates || {}), [i.values[0]]: JSON.parse(JSON.stringify(s.doc)) };
    cfg.markModified('templates'); await saveConfig(cfg);
    return i.reply(notice(`✅ Guardado como diseño de **${TPL[i.values[0]]}**. Ya se usará automáticamente.`));
  }
  if (act === 'add') {
    if (p[2] === 'sep') { bl.push({ t: 'sep', line: true, big: false }); s.sel = bl.length - 1; return upd(); }
    return i.showModal(modalFor(p[2], null, `eb:m:add:${p[2]}`));
  }
  if (act === 'edit') { const b = bl[s.sel]; if (b) return i.showModal(modalFor(b.t, b, `eb:m:edit:${b.t}`)); }
  if (act === 'up' && s.sel > 0) { [bl[s.sel - 1], bl[s.sel]] = [bl[s.sel], bl[s.sel - 1]]; s.sel--; }
  if (act === 'down' && s.sel < bl.length - 1) { [bl[s.sel + 1], bl[s.sel]] = [bl[s.sel], bl[s.sel + 1]]; s.sel++; }
  if (act === 'del' && bl.length) { bl.splice(s.sel, 1); s.sel = Math.max(0, s.sel - 1); }
  if (act === 'color') {
    return i.showModal(new ModalBuilder().setCustomId('eb:m:color').setTitle('Color del embed').addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('color').setLabel('Color HEX (ej: #000000)').setStyle(TextInputStyle.Short).setValue(s.doc.color).setMaxLength(7).setRequired(true))));
  }
  if (act === 'cancel') { states.delete(i.user.id); return i.update({ components: [box('Constructor cerrado.')], flags: V2 }); }
  if (act === 'send') {
    const ch = await i.guild.channels.fetch(s.channelId).catch(() => null);
    if (!ch) return i.reply(notice('❌ No encuentro el canal.'));
    try {
      await ch.send({ components: [buildEmbed(s.doc, ctxFromMember(i.member))], flags: V2, allowedMentions: { parse: [] } });
      return i.reply(notice(`✅ Enviado en ${ch}`));
    } catch (e) { return i.reply(notice(`❌ No pude enviarlo: ${e.message}`)); }
  }
  return upd();
}

module.exports = { data, execute, handle };
