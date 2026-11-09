const need = (l) => 5 * l * l + 50 * l + 100;
function calc(total) {
  let level = 0, x = total;
  while (x >= need(level)) { x -= need(level); level++; }
  return { level, cur: x, need: need(level) };
}
module.exports = { need, calc };
