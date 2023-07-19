function convertHex(hex, opacity) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r},${g},${b},${opacity / 100})`;
}

function color() {
  const color = `#${Math.floor((Math.abs(Math.random() * 16777215)) % 16777215).toString(16)}`;

  return {
    hex: color,
    opacity: convertHex(color, 40)
  };
}

function dateRange(startDate, endDate, addFn, interval) {
  addFn = addFn || Date.prototype.addDays;
  interval = interval || 1;

  const retVal = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    retVal.push(new Date(current));
    current = addFn.call(current, interval);
  }

  return retVal;
}


const self = module.exports;
self.color = color;
self.dateRange = dateRange;

