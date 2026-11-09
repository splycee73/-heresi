const {
  ContainerBuilder, TextDisplayBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, MessageFlags,
} = require('discord.js');

const V2 = MessageFlags.IsComponentsV2;
const EPH = MessageFlags.Ephemeral;
const isUrl = (s) => /^https?:\/\/\S+$/i.test(s || '');
const fill = (s, ctx = {}) => String(s || '').replace(/\{([\w.]+)\}/g, (m, k) => (k in ctx ? String(ctx[k]) : m));
const td = (s) => new TextDisplayBuilder().setContent(String(s || '').trim().slice(0, 4000) || '\u200b');

const defaultDoc = () => ({
  color: '#000000',
  blocks: [{ t: 'text', c: '## Título del embed\nEscribe aquí tu descripción.' }],
});

const TEMPLATE_DEFAULTS = {
  welcome: { color: '#000000', blocks: [
    { t: 'sec', c: '## Bienvenido/a, {user.name}\nYa somos **{memberCount}** miembros en **{server}**. ¡Disfruta tu estadía!', thumb: '{user.avatar}' },
    { t: 'sep', line: true }, { t: 'text', c: '-# {user}' }] },
  goodbye: { color: '#000000', blocks: [{ t: 'text', c: '### 👋 {user.name} salió de **{server}**\nAhora somos **{memberCount}** miembros.' }] },
  boost: { color: '#000000', blocks: [
    { t: 'sec', c: '## 💎 ¡Nuevo boost!\n{user} impulsó **{server}**.\nLleva **{boosts}** boost(s) · El servidor tiene **{serverBoosts}**.', thumb: '{user.avatar}' }] },
  levelup: { color: '#000000', blocks: [{ t: 'text', c: '### ⬆️ {user} subió al nivel **{level}**' }] },
};

function buildEmbed(doc, ctx = {}) {
  const c = new ContainerBuilder();
  const n = parseInt(String(doc.color || '#000000').replace('#', ''), 16);
  c.setAccentColor(Number.isNaN(n) ? 0 : n);
  let btns = [];
  const flush = () => { if (btns.length) { c.addActionRowComponents(new ActionRowBuilder().addComponents(btns)); btns = []; } };
  let count = 0;
  for (const b of doc.blocks || []) {
    if (b.t !== 'btn') flush();
    if (b.t === 'text') { c.addTextDisplayComponents(td(fill(b.c, ctx))); count++; }
    else if (b.t === 'sep') { c.addSeparatorComponents(new SeparatorBuilder().setDivider(b.line !== false).setSpacing(b.big ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)); count++; }
    else if (b.t === 'img') {
      const urls = (b.urls || []).map((u) => fill(u, ctx)).filter(isUrl).slice(0, 10);
      if (urls.length) { c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(urls.map((u) => new MediaGalleryItemBuilder().setURL(u)))); count++; }
    } else if (b.t === 'sec') {
      const th = fill(b.thumb, ctx);
      if (isUrl(th)) c.addSectionComponents(new SectionBuilder().addTextDisplayComponents(td(fill(b.c, ctx))).setThumbnailAccessory(new ThumbnailBuilder().setURL(th)));
      else c.addTextDisplayComponents(td(fill(b.c, ctx)));
      count++;
    } else if (b.t === 'btn') {
      const url = fill(b.url, ctx);
      if (isUrl(url)) {
        const bt = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel((b.label || 'Link').slice(0, 80)).setURL(url);
        if (b.emoji) { try { bt.setEmoji(b.emoji); } catch {} }
        btns.push(bt); count++;
        if (btns.length === 5) flush();
      }
    }
  }
  flush();
  if (!count) c.addTextDisplayComponents(td('*(embed vacío)*'));
  return c;
}

function ctxFromMember(m, extra = {}) {
  const g = m.guild;
  return {
    user: `<@${m.id}>`, 'user.name': m.displayName, 'user.tag': m.user.username, 'user.id': m.id,
    'user.avatar': m.displayAvatarURL({ size: 256, extension: 'png' }),
    server: g.name, 'server.icon': g.iconURL({ size: 256, extension: 'png' }) || '',
    memberCount: g.memberCount, serverBoosts: g.premiumSubscriptionCount || 0, ...extra,
  };
}

const box = (text) => new ContainerBuilder().setAccentColor(0x000000).addTextDisplayComponents(td(text));
const notice = (text) => ({ components: [box(text)], flags: V2 | EPH });

async function sendTemplate(guild, channelId, key, cfg, ctx) {
  const ch = channelId && guild.channels.cache.get(channelId);
  if (!ch || !ch.isTextBased()) return;
  const doc = (cfg.templates && cfg.templates[key]) || TEMPLATE_DEFAULTS[key];
  await ch.send({ components: [buildEmbed(doc, ctx)], flags: V2, allowedMentions: { parse: ['users'] } }).catch((e) => console.error('sendTemplate', e.message));
}

async function logTo(guild, channelId, text) {
  const ch = channelId && guild.channels.cache.get(channelId);
  if (ch && ch.isTextBased()) await ch.send({ components: [box(text)], flags: V2, allowedMentions: { parse: [] } }).catch(() => {});
}

module.exports = { V2, EPH, isUrl, fill, td, defaultDoc, TEMPLATE_DEFAULTS, buildEmbed, ctxFromMember, box, notice, sendTemplate, logTo };
