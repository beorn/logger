/**
 * @beorn/logger - Structured logging with colors/JSON output
 *
 * Generic logger that can be used in any project.
 * Logs to stderr by default to not interfere with stdout data output.
 * Supports component tagging and log levels.
 */

import pc from "picocolors";

/** Log levels that produce output */
export type OutputLogLevel = "trace" | "debug" | "info" | "warn" | "error";

/** All log levels including silent (for filtering) */
export type LogLevel = OutputLogLevel | "silent";

export type Component = string; // Allow any string for flexible component naming

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: Component;
  context?: string; // Optional context shown after component, e.g. email address
  message: string;
  data?: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5, // Suppresses all logs - useful for tests
};

// Initialize log level from environment variable or default to "info"
const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
const defaultLevel: LogLevel =
  envLogLevel === "trace" ||
  envLogLevel === "debug" ||
  envLogLevel === "info" ||
  envLogLevel === "warn" ||
  envLogLevel === "error" ||
  envLogLevel === "silent"
    ? envLogLevel
    : "info";

let currentLogLevel: LogLevel = defaultLevel;

/**
 * Set the minimum log level (filters out lower priority logs)
 */
export function setLogLevel(level: LogLevel) {
  currentLogLevel = level;
}

/**
 * Get current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * Format log entry for console output (pretty format)
 */
function formatConsole(entry: LogEntry): string {
  const time = pc.dim(entry.timestamp.split("T")[1]?.split(".")[0] || "");
  const component = pc.cyan(`[${entry.component}]`);
  const context = entry.context ? pc.magenta(` <${entry.context}>`) : "";

  let levelStr = "";
  switch (entry.level) {
    case "trace":
      levelStr = pc.dim("TRACE");
      break;
    case "debug":
      levelStr = pc.dim("DEBUG");
      break;
    case "info":
      levelStr = pc.blue("INFO");
      break;
    case "warn":
      levelStr = pc.yellow("WARN");
      break;
    case "error":
      levelStr = pc.red("ERROR");
      break;
  }

  let output = `${time} ${levelStr} ${component}${context} ${entry.message}`;

  if (entry.data !== undefined)
    output += ` ${pc.dim(JSON.stringify(entry.data))}`;

  return output;
}

/**
 * Format log entry as JSON (production format)
 * Handles circular references safely
 */
function formatJSON(entry: LogEntry): string {
  const seen = new WeakSet();
  return JSON.stringify(entry, (_key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  });
}

/**
 * Map log levels to console methods
 * Using console.* allows Ink's patchConsole to intercept and render logs
 * cleanly above the TUI without corruption
 */
const consoleMethod: Record<LogLevel, (msg: string) => void> = {
  trace: (msg) => console.debug(msg),
  debug: (msg) => console.debug(msg),
  info: (msg) => console.info(msg),
  warn: (msg) => console.warn(msg),
  error: (msg) => console.error(msg),
  silent: () => {}, // No-op - silent level never logs
};

/**
 * Write log entry using appropriate console method
 */
function writeLog(entry: LogEntry) {
  if (!shouldLog(entry.level)) return;

  const formatted =
    process.env.NODE_ENV === "production"
      ? formatJSON(entry)
      : formatConsole(entry);

  consoleMethod[entry.level](formatted);
}

export interface Logger {
  trace(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  /** Create a child logger with additional context */
  child(childContext: string): Logger;
}

/**
 * Create a logger for a specific component
 * @param component - Component name (e.g. "@cloudi/mail")
 * @param context - Optional context shown after component (e.g. email address)
 */
export function createLogger(component: Component, context?: string): Logger {
  return {
    trace(message: string, data?: unknown) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: "trace",
        component,
        context,
        message,
        data,
      });
    },

    debug(message: string, data?: unknown) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: "debug",
        component,
        context,
        message,
        data,
      });
    },

    info(message: string, data?: unknown) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: "info",
        component,
        context,
        message,
        data,
      });
    },

    warn(message: string, data?: unknown) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: "warn",
        component,
        context,
        message,
        data,
      });
    },

    error(message: string, data?: unknown) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: "error",
        component,
        context,
        message,
        data,
      });
    },

    child(childContext: string): Logger {
      const newContext = context ? `${context}:${childContext}` : childContext;
      return createLogger(component, newContext);
    },
  };
}
