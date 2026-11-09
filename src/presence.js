const { ActivityType } = require('discord.js');
const { statuses, STATUS_ROTATION_MS } = require('./config');

module.exports = function startPresence(client) {
  let i = 0;
  const tick = () => {
    const s = statuses[i++ % statuses.length];
    const members = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const activity = s.kind === 'custom'
      ? { type: ActivityType.Custom, name: 'custom', state: s.text }
      : { type: ActivityType.Watching, name: s.text(members) };
    client.user.setPresence({ status: 'online', activities: [activity] });
  };
  tick();
  setInterval(tick, STATUS_ROTATION_MS);
};
