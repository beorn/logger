/**
 * @beorn/logger - Structured logging with spans
 *
 * Logger-first architecture: Span = Logger + Duration
 *
 * @example
 * const log = createLogger('myapp')
 *
 * // Simple logging
 * log.info('starting')
 *
 * // With timing (span)
 * {
 *   using task = log.span('import', { file: 'data.csv' })
 *   task.info('importing')
 *   task.spanData.count = 42  // Set span attributes
 *   // Auto-disposal on block exit → SPAN myapp:import (15ms)
 * }
 */
/** Log levels that produce output */
export type OutputLogLevel = "trace" | "debug" | "info" | "warn" | "error";
/** All log levels including silent (for filtering) */
export type LogLevel = OutputLogLevel | "silent";
/** Span data accessible via logger.spanData */
export interface SpanData {
    readonly id: string;
    readonly traceId: string;
    readonly parentId: string | null;
    readonly startTime: number;
    readonly endTime: number | null;
    readonly duration: number | null;
    /** Custom attributes - set via direct property assignment */
    [key: string]: unknown;
}
/** Logger interface */
export interface Logger {
    /** Logger namespace (e.g., 'myapp:import') */
    readonly name: string;
    /** Props inherited from parent + own props */
    readonly props: Readonly<Record<string, unknown>>;
    /** Span data (non-null for span loggers, null for regular loggers) */
    readonly spanData: SpanData | null;
    trace(message: string, data?: Record<string, unknown>): void;
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    /** Error overload - extracts message, stack, code from Error */
    error(error: Error, data?: Record<string, unknown>): void;
    /** Create child logger (extends namespace, inherits props) */
    logger(namespace?: string, props?: Record<string, unknown>): Logger;
    /** Create child span (extends namespace, inherits props, adds timing) */
    span(namespace?: string, props?: Record<string, unknown>): SpanLogger;
    /** @deprecated Use .logger() instead */
    child(context: string): Logger;
    /** End span manually (alternative to using keyword) */
    end(): void;
}
/** Span logger - Logger with active span (spanData is non-null, implements Disposable) */
export interface SpanLogger extends Logger, Disposable {
    readonly spanData: SpanData & {
        /** Mutable attributes - set directly */
        [key: string]: unknown;
    };
}
type LogWriter = (formatted: string, level: string) => void;
/** Add a writer that receives all formatted log output. Returns unsubscribe. */
export declare function addWriter(writer: LogWriter): () => void;
/** Suppress console output from the logger (writers still receive output). */
export declare function setSuppressConsole(value: boolean): void;
/** Set minimum log level */
export declare function setLogLevel(level: LogLevel): void;
/** Get current log level */
export declare function getLogLevel(): LogLevel;
/** Enable span output */
export declare function enableSpans(): void;
/** Disable span output */
export declare function disableSpans(): void;
/** Check if spans are enabled */
export declare function spansAreEnabled(): boolean;
/**
 * Set trace filter for namespace-based span output control.
 * Only spans matching these namespace prefixes will be output.
 * @param namespaces - Array of namespace prefixes, or null to disable filtering
 */
export declare function setTraceFilter(namespaces: string[] | null): void;
/** Get current trace filter (null means no filtering) */
export declare function getTraceFilter(): string[] | null;
/**
 * Set debug namespace filter (like the `debug` npm package).
 * When set, only loggers matching these namespace prefixes produce output.
 * Supports negative patterns with `-` prefix (e.g., ["-km:noisy"]).
 * Also ensures log level is at least `debug`.
 * @param namespaces - Array of namespace prefixes (prefix with `-` to exclude), or null to disable
 */
export declare function setDebugFilter(namespaces: string[] | null): void;
/** Get current debug namespace filter (null means no filtering) */
export declare function getDebugFilter(): string[] | null;
export declare function resetIds(): void;
/** Enable span collection for analysis */
export declare function startCollecting(): void;
/** Stop collecting and return collected spans */
export declare function stopCollecting(): SpanData[];
/** Get collected spans */
export declare function getCollectedSpans(): SpanData[];
/** Clear collected spans */
export declare function clearCollectedSpans(): void;
/**
 * Logger with optional methods — returns undefined for disabled levels.
 * Use with optional chaining: `log.debug?.("msg")` for zero-overhead when disabled.
 *
 * Defined as an explicit interface (not Omit<Logger,...>) so that
 * oxlint's type-aware mode can resolve it without advanced type inference.
 */
export interface ConditionalLogger {
    readonly name: string;
    readonly props: Readonly<Record<string, unknown>>;
    readonly spanData: SpanData | null;
    trace?: (message: string, data?: Record<string, unknown>) => void;
    debug?: (message: string, data?: Record<string, unknown>) => void;
    info?: (message: string, data?: Record<string, unknown>) => void;
    warn?: (message: string, data?: Record<string, unknown>) => void;
    error?: {
        (message: string, data?: Record<string, unknown>): void;
        (error: Error, data?: Record<string, unknown>): void;
    };
    logger(namespace?: string, props?: Record<string, unknown>): Logger;
    span(namespace?: string, props?: Record<string, unknown>): SpanLogger;
    end(): void;
}
/**
 * Create a logger for a component.
 * Returns undefined for disabled levels - use with optional chaining for zero overhead.
 *
 * Log levels (most → least verbose): trace < debug < info < warn < error < silent
 * Default level: info (trace and debug disabled)
 *
 * @example
 * const log = createLogger('myapp')
 *
 * // All methods support ?. for zero-overhead when disabled
 * log.trace?.(`very verbose: ${expensiveDebug()}`)  // Skipped at info level
 * log.debug?.(`debug: ${getState()}`)               // Skipped at info level
 * log.info?.('starting')                            // Enabled at info level
 * log.warn?.('deprecated')                          // Enabled at info level
 * log.error?.('failed')                             // Enabled at info level
 *
 * // With -q flag or LOG_LEVEL=warn:
 * log.info?.('starting')  // Now skipped - info < warn
 *
 * // With initial props
 * const log = createLogger('myapp', { version: '1.0' })
 *
 * // Create spans
 * {
 *   using task = log.span('import', { file: 'data.csv' })
 *   task.info?.('importing')
 *   task.spanData.count = 42
 * }
 */
export declare function createLogger(name: string, props?: Record<string, unknown>): ConditionalLogger;
export {};
//# sourceMappingURL=index.d.ts.map