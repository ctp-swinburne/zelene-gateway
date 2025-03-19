// src/utils/logger.ts
enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.context}] ${message}`;
  }

  debug(message: string, ...meta: any[]): void {
    console.debug(this.formatMessage(LogLevel.DEBUG, message), ...meta);
  }

  info(message: string, ...meta: any[]): void {
    console.info(this.formatMessage(LogLevel.INFO, message), ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    console.warn(this.formatMessage(LogLevel.WARN, message), ...meta);
  }

  error(message: string, error?: Error, ...meta: any[]): void {
    console.error(
      this.formatMessage(LogLevel.ERROR, message),
      error ? { message: error.message, stack: error.stack } : "",
      ...meta
    );
  }
}

export const createLogger = (context: string): Logger => {
  return new Logger(context);
};
