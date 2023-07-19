function generateString() {
  const symbols = '0123456789ABCDEFGHJKLMNPQRTUVWXY'.split('');
  const objects = {};
  symbols.forEach((c, i) => {
    objects[c] = i;
  });
  const parts = [];
  let part;
  let i;
  let j;
  function promoCheckDigit(data, check) {
    data.split('').forEach((v) => {
      const k = objects[v];
      check = (check * 19) + k;
    });
    return symbols[check % 31];
  }
  for (i = 0; i < 3; i++) {
    part = '';
    for (j = 0; j < 2; j++) {
      part += symbols[parseInt(Math.random() * symbols.length, 10)];
    }
    part += promoCheckDigit(part, i + 1);
    parts.push(part);
  }
  return parts.join('-');
}
function generateNumbers(min = 10000000, max = 99999999) {
  return Math.floor(Math.random() * ((max - min) + 1)) + min;
}

module.exports = {
  generateString,
  generateNumbers
};
