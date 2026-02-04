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
export declare function resetIds(): void;
/**
 * Create a logger for a component
 *
 * @example
 * const log = createLogger('myapp')
 * log.info('starting')
 *
 * // With initial props
 * const log = createLogger('myapp', { version: '1.0' })
 *
 * // Create spans
 * {
 *   using task = log.span('import', { file: 'data.csv' })
 *   task.info('importing')
 *   task.spanData.count = 42
 * }
 */
export declare function createLogger(name: string, props?: Record<string, unknown>): Logger;
/** Enable span collection for analysis */
export declare function startCollecting(): void;
/** Stop collecting and return collected spans */
export declare function stopCollecting(): SpanData[];
/** Get collected spans */
export declare function getCollectedSpans(): SpanData[];
/** Clear collected spans */
export declare function clearCollectedSpans(): void;
/** Logger with optional methods - returns undefined for disabled levels */
export type ConditionalLogger = Omit<Logger, "trace" | "debug" | "info" | "warn" | "error"> & {
    trace?: Logger["trace"];
    debug?: Logger["debug"];
    info?: Logger["info"];
    warn?: Logger["warn"];
    error?: Logger["error"];
};
/**
 * Create a conditional logger that returns undefined for disabled levels.
 * Use with optional chaining to skip argument evaluation for disabled levels.
 *
 * @example
 * const log = createConditionalLogger('myapp')
 * log.debug?.(`expensive: ${computeExpensiveState()}`)  // Skips if debug disabled
 */
export declare function createConditionalLogger(name: string, props?: Record<string, unknown>): ConditionalLogger;
//# sourceMappingURL=index.d.ts.map