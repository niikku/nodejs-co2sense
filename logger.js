const os = require('os');
const winston = require('winston');
require('winston-syslog');

const logFormatting = winston.format.combine(
  winston.format.simple(),
  winston.format.errors(),
  winston.format.colorize()
)

const papertrail = new winston.transports.Syslog({
  host: 'logs6.papertrailapp.com',
  port: 44121,
  protocol: 'tls4',
  localhost: os.hostname(),
  eol: '\n',
  app_name: 'CO2sense',
  level: 'info',
  format: logFormatting
});

papertrail.on('error', () => {
  console.log('papertrail error');
});

papertrail.on('closed', () => {
  console.log('papertrail closed');
});

papertrail.on('connect', () => {
  console.log('papertrail connected');
});

const consoleTransport = new winston.transports.Console({
  level: 'debug',
  format: logFormatting
});

const logger = winston.createLogger({
  format: logFormatting,
  levels: winston.config.syslog.levels,
  transports: []
});


if(process.env.NODE_ENV === 'production') {
    console.log(`Logger has started in PRODUCTION mode, and logs will be sent to Papertrail.`);
    logger.add(papertrail);
} else {
    console.log('Logger has started in DEVELOPMENT mode, and logs will be printed to the console.');
    logger.add(consoleTransport);
}

module.exports = logger;