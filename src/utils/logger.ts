import * as winston from 'winston';
import 'winston-daily-rotate-file';
const { combine, timestamp, printf } = winston.format;

const myFormat = printf(({ message, timestamp, ...metadata }) => {
  let msg = `${timestamp} ${metadata.statusCode} ${metadata.url} : ${message} `;
  if (metadata) {
    msg += JSON.stringify(metadata.error);
  }
  return msg;
});

const fileTransport = new winston.transports.DailyRotateFile({
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});
  
export const logger = winston.createLogger({
  format: combine(
    timestamp(),
    myFormat,
  ),
  transports: [
    fileTransport,
    new winston.transports.Console(
      {
        format: combine(
          timestamp(),
          myFormat,
        ),
      }),
  ],
});
