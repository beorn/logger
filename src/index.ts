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

import pc from "picocolors"

// ============ Types ============

/** Log levels that produce output */
export type OutputLogLevel = "trace" | "debug" | "info" | "warn" | "error"

/** All log levels including silent (for filtering) */
export type LogLevel = OutputLogLevel | "silent"

/** Span data accessible via logger.spanData */
export interface SpanData {
  readonly id: string
  readonly traceId: string
  readonly parentId: string | null
  readonly startTime: number
  readonly endTime: number | null
  readonly duration: number | null
  /** Custom attributes - set via direct property assignment */
  [key: string]: unknown
}

/** Logger interface */
export interface Logger {
  /** Logger namespace (e.g., 'myapp:import') */
  readonly name: string
  /** Props inherited from parent + own props */
  readonly props: Readonly<Record<string, unknown>>
  /** Span data (non-null for span loggers, null for regular loggers) */
  readonly spanData: SpanData | null

  // Logging methods
  trace(message: string, data?: Record<string, unknown>): void
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  /** Error overload - extracts message, stack, code from Error */
  error(error: Error, data?: Record<string, unknown>): void

  // Create children
  /** Create child logger (extends namespace, inherits props) */
  logger(namespace?: string, props?: Record<string, unknown>): Logger
  /** Create child span (extends namespace, inherits props, adds timing) */
  span(namespace?: string, props?: Record<string, unknown>): SpanLogger

  /** @deprecated Use .logger() instead */
  child(context: string): Logger

  /** End span manually (alternative to using keyword) */
  end(): void
}

/** Span logger - Logger with active span (spanData is non-null, implements Disposable) */
export interface SpanLogger extends Logger, Disposable {
  readonly spanData: SpanData & {
    /** Mutable attributes - set directly */
    [key: string]: unknown
  }
}

// ============ Writers ============

type LogWriter = (formatted: string, level: string) => void
const writers: LogWriter[] = []

/** Add a writer that receives all formatted log output. Returns unsubscribe. */
export function addWriter(writer: LogWriter): () => void {
  writers.push(writer)
  return () => {
    const idx = writers.indexOf(writer)
    if (idx !== -1) writers.splice(idx, 1)
  }
}

let suppressConsole = false

/** Suppress console output from the logger (writers still receive output). */
export function setSuppressConsole(value: boolean): void {
  suppressConsole = value
}

/** Output mode for writeLog */
export type OutputMode = "console" | "stderr" | "writers-only"
let outputMode: OutputMode = "console"

/** Set output mode for log messages (not spans — spans always use stderr). */
export function setOutputMode(mode: OutputMode): void {
  outputMode = mode
}

/** Get current output mode */
export function getOutputMode(): OutputMode {
  return outputMode
}

// ============ Configuration ============

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5,
}

// Initialize from environment
const envLogLevel = process.env.LOG_LEVEL?.toLowerCase()
let currentLogLevel: LogLevel =
  envLogLevel === "trace" ||
  envLogLevel === "debug" ||
  envLogLevel === "info" ||
  envLogLevel === "warn" ||
  envLogLevel === "error" ||
  envLogLevel === "silent"
    ? envLogLevel
    : "info"

// Span output control (TRACE=1 or TRACE=myapp,other)
const traceEnv = process.env.TRACE
let spansEnabled = traceEnv === "1" || traceEnv === "true"
let traceFilter: Set<string> | null = null
if (traceEnv && traceEnv !== "1" && traceEnv !== "true") {
  traceFilter = new Set(traceEnv.split(",").map((s) => s.trim()))
  spansEnabled = true
}

// Debug namespace filter (DEBUG=myapp or DEBUG=myapp,-myapp:noisy or DEBUG=*)
// Supports negative patterns with `-` prefix (like the `debug` npm package)
const debugEnv = process.env.DEBUG
let debugIncludes: Set<string> | null = null
let debugExcludes: Set<string> | null = null
if (debugEnv) {
  const parts = debugEnv.split(",").map((s) => s.trim())
  const includes: string[] = []
  const excludes: string[] = []
  for (const part of parts) {
    if (part.startsWith("-")) {
      excludes.push(part.slice(1))
    } else {
      includes.push(part)
    }
  }
  if (includes.length > 0) {
    debugIncludes = new Set(includes.some((p) => p === "*" || p === "1" || p === "true") ? ["*"] : includes)
  }
  if (excludes.length > 0) {
    debugExcludes = new Set(excludes)
  }
  // Auto-lower log level to at least debug when DEBUG is set
  if (LOG_LEVEL_PRIORITY[currentLogLevel] > LOG_LEVEL_PRIORITY.debug) {
    currentLogLevel = "debug"
  }
}

/** Set minimum log level */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level
}

/** Get current log level */
export function getLogLevel(): LogLevel {
  return currentLogLevel
}

/** Enable span output */
export function enableSpans(): void {
  spansEnabled = true
}

/** Disable span output */
export function disableSpans(): void {
  spansEnabled = false
}

/** Check if spans are enabled */
export function spansAreEnabled(): boolean {
  return spansEnabled
}

/**
 * Set trace filter for namespace-based span output control.
 * Only spans matching these namespace prefixes will be output.
 * @param namespaces - Array of namespace prefixes, or null to disable filtering
 */
export function setTraceFilter(namespaces: string[] | null): void {
  if (namespaces === null || namespaces.length === 0) {
    traceFilter = null
  } else {
    traceFilter = new Set(namespaces)
    spansEnabled = true
  }
}

/** Get current trace filter (null means no filtering) */
export function getTraceFilter(): string[] | null {
  return traceFilter ? [...traceFilter] : null
}

/**
 * Set debug namespace filter (like the `debug` npm package).
 * When set, only loggers matching these namespace prefixes produce output.
 * Supports negative patterns with `-` prefix (e.g., ["-km:noisy"]).
 * Also ensures log level is at least `debug`.
 * @param namespaces - Array of namespace prefixes (prefix with `-` to exclude), or null to disable
 */
export function setDebugFilter(namespaces: string[] | null): void {
  if (namespaces === null || namespaces.length === 0) {
    debugIncludes = null
    debugExcludes = null
  } else {
    const includes: string[] = []
    const excludes: string[] = []
    for (const ns of namespaces) {
      if (ns.startsWith("-")) {
        excludes.push(ns.slice(1))
      } else {
        includes.push(ns)
      }
    }
    debugIncludes = includes.length > 0 ? new Set(includes) : null
    debugExcludes = excludes.length > 0 ? new Set(excludes) : null
    if (LOG_LEVEL_PRIORITY[currentLogLevel] > LOG_LEVEL_PRIORITY.debug) {
      currentLogLevel = "debug"
    }
  }
}

/** Get current debug namespace filter (null means no filtering) */
export function getDebugFilter(): string[] | null {
  if (!debugIncludes && !debugExcludes) return null
  const result: string[] = []
  if (debugIncludes) result.push(...debugIncludes)
  if (debugExcludes) result.push(...[...debugExcludes].map((e) => `-${e}`))
  return result
}

// ============ ID Generation ============

let spanIdCounter = 0
let traceIdCounter = 0

function generateSpanId(): string {
  return `sp_${(++spanIdCounter).toString(36)}`
}

function generateTraceId(): string {
  return `tr_${(++traceIdCounter).toString(36)}`
}

// Reset for testing
export function resetIds(): void {
  spanIdCounter = 0
  traceIdCounter = 0
}

// ============ Formatting ============

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel]
}

function shouldTraceNamespace(namespace: string): boolean {
  if (!spansEnabled) return false
  if (!traceFilter) return true
  return matchesNamespaceSet(namespace, traceFilter)
}

function formatConsole(namespace: string, level: string, message: string, data?: Record<string, unknown>): string {
  const time = pc.dim(new Date().toISOString().split("T")[1]?.split(".")[0] || "")

  let levelStr = ""
  switch (level) {
    case "trace":
      levelStr = pc.dim("TRACE")
      break
    case "debug":
      levelStr = pc.dim("DEBUG")
      break
    case "info":
      levelStr = pc.blue("INFO")
      break
    case "warn":
      levelStr = pc.yellow("WARN")
      break
    case "error":
      levelStr = pc.red("ERROR")
      break
    case "span":
      levelStr = pc.magenta("SPAN")
      break
  }

  const ns = pc.cyan(namespace)
  let output = `${time} ${levelStr} ${ns} ${message}`

  if (data && Object.keys(data).length > 0) {
    output += ` ${pc.dim(JSON.stringify(data))}`
  }

  return output
}

function formatJSON(namespace: string, level: string, message: string, data?: Record<string, unknown>): string {
  const entry = {
    time: new Date().toISOString(),
    level,
    name: namespace,
    msg: message,
    ...data,
  }
  const seen = new WeakSet()
  return JSON.stringify(entry, (_key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]"
      seen.add(value)
    }
    return value
  })
}

function matchesNamespaceSet(namespace: string, set: Set<string>): boolean {
  if (set.has("*")) return true
  for (const filter of set) {
    if (namespace === filter || namespace.startsWith(filter + ":")) {
      return true
    }
  }
  return false
}

function shouldDebugNamespace(namespace: string): boolean {
  if (!debugIncludes && !debugExcludes) return true
  // Excludes take priority
  if (debugExcludes && matchesNamespaceSet(namespace, debugExcludes)) {
    return false
  }
  // If includes are set, namespace must match
  if (debugIncludes) return matchesNamespaceSet(namespace, debugIncludes)
  return true
}

function writeLog(namespace: string, level: OutputLogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return
  if (!shouldDebugNamespace(namespace)) return

  const formatted =
    process.env.NODE_ENV === "production" || process.env.TRACE_FORMAT === "json"
      ? formatJSON(namespace, level, message, data)
      : formatConsole(namespace, level, message, data)

  for (const w of writers) w(formatted, level)

  if (suppressConsole || outputMode === "writers-only") return

  if (outputMode === "stderr") {
    process.stderr.write(formatted + "\n")
    return
  }

  // Default: use console methods (captured by Ink's patchConsole for TUI panel)
  switch (level) {
    case "trace":
    case "debug":
      console.debug(formatted)
      break
    case "info":
      console.info(formatted)
      break
    case "warn":
      console.warn(formatted)
      break
    case "error":
      console.error(formatted)
      break
  }
}

function writeSpan(namespace: string, duration: number, attrs: Record<string, unknown>): void {
  if (!shouldTraceNamespace(namespace)) return
  if (!shouldDebugNamespace(namespace)) return

  const message = `(${duration}ms)`
  const formatted =
    process.env.NODE_ENV === "production" || process.env.TRACE_FORMAT === "json"
      ? formatJSON(namespace, "span", message, { duration, ...attrs })
      : formatConsole(namespace, "span", message, { duration, ...attrs })

  for (const w of writers) w(formatted, "span")
  if (!suppressConsole) process.stderr.write(formatted + "\n")
}

// ============ Implementation ============

interface MutableSpanData {
  id: string
  traceId: string
  parentId: string | null
  startTime: number
  endTime: number | null
  duration: number | null
  attrs: Record<string, unknown>
}

function createLoggerImpl(
  name: string,
  props: Record<string, unknown>,
  spanMeta: MutableSpanData | null,
  parentSpanId: string | null,
  traceId: string | null,
): Logger {
  const log = (level: OutputLogLevel, msgOrError: string | Error, data?: Record<string, unknown>): void => {
    if (msgOrError instanceof Error) {
      const err = msgOrError
      writeLog(name, level, err.message, {
        ...props,
        ...data,
        error_type: err.name,
        error_stack: err.stack,
        error_code: (err as NodeJS.ErrnoException).code,
      })
    } else {
      writeLog(name, level, msgOrError, { ...props, ...data })
    }
  }

  const logger: Logger = {
    name,
    props: Object.freeze({ ...props }),

    get spanData(): SpanData | null {
      if (!spanMeta) return null
      // Return proxy that allows attribute assignment
      return new Proxy(spanMeta.attrs, {
        get(_target, prop) {
          if (prop === "id") return spanMeta.id
          if (prop === "traceId") return spanMeta.traceId
          if (prop === "parentId") return spanMeta.parentId
          if (prop === "startTime") return spanMeta.startTime
          if (prop === "endTime") return spanMeta.endTime
          if (prop === "duration") {
            if (spanMeta.endTime !== null) {
              return spanMeta.endTime - spanMeta.startTime
            }
            return Date.now() - spanMeta.startTime
          }
          return spanMeta.attrs[prop as string]
        },
        set(_target, prop, value) {
          // Allow setting custom attributes
          if (
            prop !== "id" &&
            prop !== "traceId" &&
            prop !== "parentId" &&
            prop !== "startTime" &&
            prop !== "endTime" &&
            prop !== "duration"
          ) {
            spanMeta.attrs[prop as string] = value
            return true
          }
          return false
        },
      }) as SpanData
    },

    trace: (msg, data) => log("trace", msg, data),
    debug: (msg, data) => log("debug", msg, data),
    info: (msg, data) => log("info", msg, data),
    warn: (msg, data) => log("warn", msg, data),
    error: (msgOrError, data) => log("error", msgOrError as string, data),

    logger(namespace?: string, childProps?: Record<string, unknown>): Logger {
      const childName = namespace ? `${name}:${namespace}` : name
      const mergedProps = { ...props, ...childProps }
      return createLoggerImpl(childName, mergedProps, null, parentSpanId, traceId)
    },

    span(namespace?: string, childProps?: Record<string, unknown>): SpanLogger {
      const childName = namespace ? `${name}:${namespace}` : name
      const mergedProps = { ...props, ...childProps }
      const newSpanId = generateSpanId()
      const newTraceId = traceId || generateTraceId()

      const newSpanData: MutableSpanData = {
        id: newSpanId,
        traceId: newTraceId,
        parentId: parentSpanId,
        startTime: Date.now(),
        endTime: null,
        duration: null,
        attrs: {},
      }

      const spanLogger = createLoggerImpl(childName, mergedProps, newSpanData, newSpanId, newTraceId) as SpanLogger

      // Add disposal
      ;(spanLogger as unknown as { [Symbol.dispose]: () => void })[Symbol.dispose] = () => {
        if (newSpanData.endTime !== null) return // Already disposed

        newSpanData.endTime = Date.now()
        newSpanData.duration = newSpanData.endTime - newSpanData.startTime

        // Emit span event
        writeSpan(childName, newSpanData.duration, {
          span_id: newSpanData.id,
          trace_id: newSpanData.traceId,
          parent_id: newSpanData.parentId,
          ...mergedProps,
          ...newSpanData.attrs,
        })
      }

      return spanLogger
    },

    // Deprecated - use .logger() instead
    child(context: string): Logger {
      return this.logger(context)
    },

    end(): void {
      if (spanMeta?.endTime === null) {
        ;(this as unknown as { [Symbol.dispose]: () => void })[Symbol.dispose]?.()
      }
    },
  }

  return logger
}

/**
 * Create a plain logger for a component (internal use).
 * For application code, use createLogger() instead which returns undefined for disabled levels.
 */
function createPlainLogger(name: string, props?: Record<string, unknown>): Logger {
  return createLoggerImpl(name, props || {}, null, null, null)
}

// ============ Collected Spans (for analysis) ============

const collectedSpans: SpanData[] = []
let collectSpans = false

/** Enable span collection for analysis */
export function startCollecting(): void {
  collectSpans = true
  collectedSpans.length = 0
}

/** Stop collecting and return collected spans */
export function stopCollecting(): SpanData[] {
  collectSpans = false
  return [...collectedSpans]
}

/** Get collected spans */
export function getCollectedSpans(): SpanData[] {
  return [...collectedSpans]
}

/** Clear collected spans */
export function clearCollectedSpans(): void {
  collectedSpans.length = 0
}

// ============ Conditional Logger (Zero-Overhead Pattern) ============

/**
 * Logger with optional methods — returns undefined for disabled levels.
 * Use with optional chaining: `log.debug?.("msg")` for zero-overhead when disabled.
 *
 * Defined as an explicit interface (not Omit<Logger,...>) so that
 * oxlint's type-aware mode can resolve it without advanced type inference.
 */
export interface ConditionalLogger {
  readonly name: string
  readonly props: Readonly<Record<string, unknown>>
  readonly spanData: SpanData | null

  trace?: (message: string, data?: Record<string, unknown>) => void
  debug?: (message: string, data?: Record<string, unknown>) => void
  info?: (message: string, data?: Record<string, unknown>) => void
  warn?: (message: string, data?: Record<string, unknown>) => void
  error?: {
    (message: string, data?: Record<string, unknown>): void
    (error: Error, data?: Record<string, unknown>): void
  }

  logger(namespace?: string, props?: Record<string, unknown>): Logger
  span(namespace?: string, props?: Record<string, unknown>): SpanLogger
  end(): void
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
export function createLogger(name: string, props?: Record<string, unknown>): ConditionalLogger {
  const baseLog = createPlainLogger(name, props)

  return new Proxy(baseLog as ConditionalLogger, {
    get(target, prop: string) {
      if (prop in LOG_LEVEL_PRIORITY && prop !== "silent") {
        const current = LOG_LEVEL_PRIORITY[currentLogLevel]
        if (LOG_LEVEL_PRIORITY[prop as keyof typeof LOG_LEVEL_PRIORITY] < current) {
          return undefined
        }
      }
      return (target as unknown as Record<string, unknown>)[prop]
    },
  })
}
