import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(({ level, message, timestamp, stack }) => {
      if (stack) {
        return `${timestamp} [${level}] ${message}\n${stack}`;
      }
      return `${timestamp} [${level}] ${message}`;
    })
  ),
  transports: [new transports.Console()]
});

export default logger;
