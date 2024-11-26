// src/utils/networkDebug.js

const DEBUG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const DEBUG_COLORS = {
  error: 'background: #ff5252; color: white; padding: 2px 5px; border-radius: 2px;',
  warn: 'background: #ffd740; color: black; padding: 2px 5px; border-radius: 2px;',
  info: 'background: #2196f3; color: white; padding: 2px 5px; border-radius: 2px;',
  debug: 'background: #4caf50; color: white; padding: 2px 5px; border-radius: 2px;'
};

class NetworkDebugger {
  constructor(enabled = process.env.NODE_ENV === 'development') {
    this.enabled = enabled;
    this.logs = [];
  }

  log(level, component, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component,
      message,
      data
    };

    this.logs.push(logEntry);

    const style = DEBUG_COLORS[level];
    console.groupCollapsed(
      `%c${level.toUpperCase()}%c ${component} - ${message}`,
      style,
      'color: inherit;'
    );
    
    if (data) {
      console.log('Data:', data);
    }
    console.log('Timestamp:', timestamp);
    console.groupEnd();
  }

  error(component, message, data) {
    this.log(DEBUG_LEVELS.ERROR, component, message, data);
  }

  warn(component, message, data) {
    this.log(DEBUG_LEVELS.WARN, component, message, data);
  }

  info(component, message, data) {
    this.log(DEBUG_LEVELS.INFO, component, message, data);
  }

  debug(component, message, data) {
    this.log(DEBUG_LEVELS.DEBUG, component, message, data);
  }

  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const networkDebugger = new NetworkDebugger();