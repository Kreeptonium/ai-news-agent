import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

export class LoggingService {
  private logDir: string;
  private currentLogFile: string;
  private logStream: fs.WriteStream | null = null;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(logDir: string = 'logs') {
    this.logDir = logDir;
    this.currentLogFile = this.generateLogFileName();
    this.initialize();
  }

  private initialize() {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.rotateLogFileIfNeeded();
    this.openLogStream();
  }

  private generateLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `agent-${date}.log`);
  }

  private openLogStream() {
    this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    
    this.logStream.on('error', (error) => {
      console.error('Error writing to log file:', error);
    });
  }

  private rotateLogFileIfNeeded() {
    if (!fs.existsSync(this.currentLogFile)) {
      return;
    }

    const stats = fs.statSync(this.currentLogFile);
    if (stats.size >= this.maxFileSize) {
      if (this.logStream) {
        this.logStream.end();
        this.logStream = null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newName = this.currentLogFile.replace('.log', `-${timestamp}.log`);
      fs.renameSync(this.currentLogFile, newName);
    }
  }

  private formatLogEntry(level: LogLevel, module: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data
    };
  }

  private writeLog(entry: LogEntry) {
    this.rotateLogFileIfNeeded();
    
    if (!this.logStream) {
      this.openLogStream();
    }

    const logLine = JSON.stringify(entry) + '\n';
    this.logStream!.write(logLine);

    // Also output to console for development
    if (process.env.NODE_ENV !== 'production') {
      const consoleMessage = `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.module}] ${entry.message}`;
      switch (entry.level) {
        case 'error':
          console.error(consoleMessage, entry.data || '');
          break;
        case 'warn':
          console.warn(consoleMessage, entry.data || '');
          break;
        default:
          console.log(consoleMessage, entry.data || '');
      }
    }
  }

  debug(module: string, message: string, data?: any) {
    this.writeLog(this.formatLogEntry('debug', module, message, data));
  }

  info(module: string, message: string, data?: any) {
    this.writeLog(this.formatLogEntry('info', module, message, data));
  }

  warn(module: string, message: string, data?: any) {
    this.writeLog(this.formatLogEntry('warn', module, message, data));
  }

  error(module: string, message: string, error?: Error, data?: any) {
    this.writeLog(this.formatLogEntry('error', module, message, {
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined,
      ...data
    }));
  }

  async getLogs(options: {
    level?: LogLevel,
    module?: string,
    startTime?: Date,
    endTime?: Date,
    limit?: number
  } = {}): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];
    const fileContent = await fs.promises.readFile(this.currentLogFile, 'utf-8');
    
    const lines = fileContent.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const entry: LogEntry = JSON.parse(line);
      
      if (options.level && entry.level !== options.level) continue;
      if (options.module && entry.module !== options.module) continue;
      if (options.startTime && new Date(entry.timestamp) < options.startTime) continue;
      if (options.endTime && new Date(entry.timestamp) > options.endTime) continue;
      
      logs.push(entry);
    }

    return options.limit ? logs.slice(-options.limit) : logs;
  }

  cleanup() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}