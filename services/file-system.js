const path = require('path');


const getFilePath = filePath => path.join(path.resolve(), filePath);


module.exports = {
  getFilePath
};

