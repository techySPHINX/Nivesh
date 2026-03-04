import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  private initializeLogger() {
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const logsDir = this.configService.get<string>('LOG_DIR', 'logs');

    const jsonFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    const transports: winston.transport[] = [
      // Console transport (always active)
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            return `${timestamp} [${context || 'App'}] ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`;
          }),
        ),
      }),

      // Rotate daily log file — combined logs
      new (winston.transports as any).DailyRotateFile({
        dirname: logsDir,
        filename: 'nivesh-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '14d',
        format: jsonFormat,
      }),

      // Separate error log file
      new (winston.transports as any).DailyRotateFile({
        dirname: logsDir,
        filename: 'nivesh-error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: jsonFormat,
      }),
    ];

    this.logger = winston.createLogger({
      level: logLevel,
      format: jsonFormat,
      defaultMeta: { service: 'nivesh-backend', environment: nodeEnv },
      transports,
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context: context || this.context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }
}
