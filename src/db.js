const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const B = (d = false) => ({ type: Boolean, default: d });
const N = (d) => ({ type: Number, default: d });
const S = (d = null) => ({ type: String, default: d });

const guildSchema = new Schema({
  _id: String,
  welcome: { enabled: B(), channel: S() },
  goodbye: { enabled: B(), channel: S() },
  levels: {
    enabled: B(true), channel: S(), xpMin: N(15), xpMax: N(25), cooldown: N(60),
    roles: [{ _id: false, level: Number, role: String }],
  },
  boost: { enabled: B(), channel: S(), roles: [{ _id: false, boosts: Number, role: String }] },
  autoroles: { humans: [String], bots: [String] },
  antinuke: { enabled: B(), limit: N(3), window: N(15), punishment: S('ban'), whitelist: [String], log: S(), restore: B(true) },
  antiraid: { enabled: B(), joins: N(5), window: N(10), minAge: N(0), action: S('kick'), lockMinutes: N(5), log: S(), noAvatar: B() },
  templates: { type: Schema.Types.Mixed, default: {} },
}, { minimize: false });

const userSchema = new Schema({
  guildId: String, userId: String,
  xp: { type: Number, default: 0 }, level: { type: Number, default: 0 },
  messages: { type: Number, default: 0 }, boosts: { type: Number, default: 0 },
});
userSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const GuildConfig = model('GuildConfig', guildSchema);
const UserLevel = model('UserLevel', userSchema);

const cache = new Map();
async function getConfig(id) {
  const c = cache.get(id);
  if (c && c.exp > Date.now()) return c.cfg;
  let cfg = await GuildConfig.findById(id);
  if (!cfg) cfg = await GuildConfig.create({ _id: id });
  cache.set(id, { cfg, exp: Date.now() + 60000 });
  return cfg;
}
async function saveConfig(cfg) {
  await cfg.save();
  cache.set(cfg._id, { cfg, exp: Date.now() + 60000 });
}

module.exports = { GuildConfig, UserLevel, getConfig, saveConfig };
