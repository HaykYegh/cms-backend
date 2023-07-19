const winston = require('winston');
const WinstonDailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');

const env = process.env.NODE_ENV || 'development';
const logDir = 'log';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

winston.emitErrs = true;
const tsFormat = () => (new Date()).toLocaleTimeString();

const logger = new winston.Logger({
  transports: [
    // new (WinstonDailyRotateFile)({
    //   filename: `${logDir}/-results.log`,
    //   datePattern: 'yyyy-MM-dd',
    //   timestamp: tsFormat,
    //   prepend: true,
    //   level: env === 'development' ? 'verbose' : 'info',
    //   handleExceptions: true,
    //   json: true
    // }),
    new winston.transports.Console({
      level: 'verbose',
      handleExceptions: true,
      json: true,
      colorize: true
    })
  ],
  exitOnError: false
});

/* This registrar must be removed */
const temporaryLogger = new winston.Logger({
  transports: [
    new (WinstonDailyRotateFile)({
      filename: `${logDir}/-results.log`,
      datePattern: 'yyyy-MM-dd',
      timestamp: tsFormat,
      prepend: true,
      level: env === 'development' ? 'verbose' : 'info',
      handleExceptions: true,
      json: true
    }),
    new winston.transports.Console({
      level: 'verbose',
      handleExceptions: true,
      json: true,
      colorize: true
    })
  ],
  exitOnError: false
});

module.exports = logger;
module.exports.stream = {
  write(message) {
    logger.info(message);
  }
};
module.exports.temporaryVersion = temporaryLogger;
