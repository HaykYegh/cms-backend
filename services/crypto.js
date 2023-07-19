const crypto = require('crypto');

module.exports = {
  encrypt(value, algorithm, password) {
    const cipher = crypto.createCipher(algorithm, password);
    let crypted = cipher.update(value, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  },
  decrypt(code, algorithm, password) {
    const decipher = crypto.createDecipher(algorithm, password);
    let dec = decipher.update(code, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  },
  encryptBuffer(buffer, algorithm, password) {
    const cipher = crypto.createCipher(algorithm, password);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
  },
  decryptBuffer(buffer, algorithm, password) {
    const decipher = crypto.createDecipher(algorithm, password);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  }
};

