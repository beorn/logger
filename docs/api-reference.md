# API Reference

Complete API documentation for @beorn/logger.

## Table of Contents

- [createLogger](#createlogger)
- [Logger Interface](#logger-interface)
- [SpanLogger Interface](#spanlogger-interface)
- [Configuration](#configuration)
- [Writers](#writers)
- [Types](#types)
- [Span Collection](#span-collection)

---

## createLogger

```typescript
function createLogger(name: string, props?: Record<string, unknown>): ConditionalLogger
```

Create a logger. Disabled log levels return `undefined` -- use optional chaining (`?.`) to skip argument evaluation.

### Parameters

| Parameter | Type                      | Required | Description                                  |
| --------- | ------------------------- | -------- | -------------------------------------------- |
| `name`    | `string`                  | Yes      | Logger namespace (e.g., `"myapp"`, `"myapp:db"`) |
| `props`   | `Record<string, unknown>` | No       | Properties included in every log message     |

### Returns

`ConditionalLogger` -- A logger where disabled levels return `undefined`.

### Examples

```typescript
const log = createLogger("myapp")
log.info?.("starting")

// With props (inherited by all children)
const log = createLogger("myapp", { version: "1.0", env: "prod" })
const dbLog = log.logger("db")
// dbLog.props === { version: "1.0", env: "prod" }
```

---

## Logger Interface

```typescript
interface Logger {
  readonly name: string
  readonly props: Readonly<Record<string, unknown>>
  readonly spanData: SpanData | null

  trace(message: LazyMessage, data?: Record<string, unknown>): void
  debug(message: LazyMessage, data?: Record<string, unknown>): void
  info(message: LazyMessage, data?: Record<string, unknown>): void
  warn(message: LazyMessage, data?: Record<string, unknown>): void
  error(message: LazyMessage, data?: Record<string, unknown>): void
  error(error: Error, data?: Record<string, unknown>): void

  logger(namespace?: string, props?: Record<string, unknown>): Logger
  span(namespace?: string, props?: Record<string, unknown>): SpanLogger
  child(context: Record<string, unknown>): Logger
  /** @deprecated Use .logger() instead */
  child(context: string): Logger
  end(): void
}
```

### Properties

| Property   | Type                      | Description                                   |
| ---------- | ------------------------- | --------------------------------------------- |
| `name`     | `string`                  | Logger namespace (e.g., `"myapp:import"`)     |
| `props`    | `Record<string, unknown>` | Frozen props (own + inherited from parent)    |
| `spanData` | `SpanData \| null`        | Non-null for span loggers, null for regular   |

### Logging Methods

All methods accept a string, a lazy function `() => string`, or (for `.error()`) an Error object:

```typescript
// String message
log.info?.("server started", { port: 3000 })

// Lazy message (function called only when level is enabled)
log.debug?.(() => `tree: ${JSON.stringify(buildDebugTree())}`)

// Error object (extracts message, stack, code automatically)
log.error?.(new Error("connection failed"), { host: "db.example.com" })
```

#### Log Levels

| Level   | Priority | Purpose                                      |
| ------- | -------- | -------------------------------------------- |
| `trace` | 0        | Verbose debugging (hot paths, detailed flow) |
| `debug` | 1        | Debug information (state changes, decisions) |
| `info`  | 2        | Normal operation (startup, completion)       |
| `warn`  | 3        | Recoverable issues (deprecations, retries)   |
| `error` | 4        | Failures (exceptions, critical errors)       |

### Child Creation

#### `.logger(namespace?, props?)`

Create a child logger that extends the namespace and inherits props.

```typescript
const appLog = createLogger("myapp", { version: "1.0" })
const dbLog = appLog.logger("db", { pool: "primary" })
// namespace: "myapp:db"
// props: { version: "1.0", pool: "primary" }
```

#### `.span(namespace?, props?)`

Create a timed span logger. Implements `Disposable` for use with `using`.

```typescript
{
  using span = log.span("import", { file: "data.csv" })
  span.info?.("processing")
  span.spanData.rowCount = 1000
}
// SPAN myapp:import (234ms) {rowCount: 1000, file: "data.csv"}
```

#### `.child(context)`

Create a child logger with additional context fields in every message.

```typescript
const reqLog = log.child({ requestId: "abc-123", userId: 42 })
reqLog.info?.("handling request")
// Includes requestId and userId in every log message

// Context accumulates through nesting
const dbLog = reqLog.child({ pool: "primary" })
// Has: requestId, userId, pool
```

#### `.end()`

Manually end a span (alternative to `using`).

```typescript
const span = log.span("operation")
try {
  span.spanData.result = "success"
} finally {
  span.end()
}
```

---

## SpanLogger Interface

```typescript
interface SpanLogger extends Logger, Disposable {
  readonly spanData: SpanData & { [key: string]: unknown }
}
```

SpanLogger extends Logger with non-null `spanData` and `Disposable` for automatic cleanup.

### SpanData Properties

| Property    | Type             | Mutable | Description                                |
| ----------- | ---------------- | ------- | ------------------------------------------ |
| `id`        | `string`         | No      | Unique span ID (`sp_1`, `sp_2`, ...)       |
| `traceId`   | `string`         | No      | Trace ID (shared across nested spans)      |
| `parentId`  | `string \| null` | No      | Parent span ID (null for root spans)       |
| `startTime` | `number`         | No      | Start timestamp (ms since epoch)           |
| `endTime`   | `number \| null` | No      | End timestamp (null until span ends)       |
| `duration`  | `number \| null` | No      | Computed duration (live while active)      |
| `[custom]`  | `unknown`        | Yes     | Set directly: `span.spanData.key = value`  |

### Nested Spans

Spans automatically track parent-child relationships and share trace IDs:

```typescript
{
  using outer = log.span("request")
  {
    using inner = outer.span("db:query")
    // inner.spanData.parentId === outer.spanData.id
    // inner.spanData.traceId === outer.spanData.traceId
  }
}
```

---

## Configuration

### Log Level

```typescript
setLogLevel(level: LogLevel): void
getLogLevel(): LogLevel
```

```typescript
setLogLevel("warn")   // Only warn and error
setLogLevel("trace")  // Everything
setLogLevel("silent") // Nothing
```

Default: `"info"`. Override with `LOG_LEVEL` env var.

### Log Format

```typescript
setLogFormat(format: LogFormat): void
getLogFormat(): LogFormat
```

```typescript
setLogFormat("json")    // Structured JSON output
setLogFormat("console") // Human-readable console output
```

Default: `"console"`. Override with `LOG_FORMAT` env var. Also auto-enabled by `NODE_ENV=production` or `TRACE_FORMAT=json`.

### Spans

```typescript
enableSpans(): void
disableSpans(): void
spansAreEnabled(): boolean
```

### Trace Filter

```typescript
setTraceFilter(namespaces: string[] | null): void
getTraceFilter(): string[] | null
```

Filter which namespaces produce span output:

```typescript
setTraceFilter(["myapp"])        // Only myapp and myapp:* spans
setTraceFilter(["db", "cache"])  // Only db:* and cache:* spans
setTraceFilter(null)             // All spans
```

### Debug Filter

```typescript
setDebugFilter(namespaces: string[] | null): void
getDebugFilter(): string[] | null
```

Filter which namespaces produce log output (like the `DEBUG` env var):

```typescript
setDebugFilter(["myapp"])              // Only myapp and myapp:*
setDebugFilter(["myapp", "-myapp:sql"]) // myapp but not myapp:sql
setDebugFilter(null)                    // All namespaces
```

Auto-lowers log level to `debug` when set.

### Output Mode

```typescript
setOutputMode(mode: OutputMode): void
getOutputMode(): OutputMode
setSuppressConsole(value: boolean): void
```

| Mode            | Console | Writers |
| --------------- | ------- | ------- |
| `"console"`     | Yes     | Yes     |
| `"stderr"`      | stderr  | Yes     |
| `"writers-only"` | No     | Yes     |

`setSuppressConsole(true)` suppresses console but writers still receive output.

### Environment Variables

| Variable       | Values                                  | Effect                     |
| -------------- | --------------------------------------- | -------------------------- |
| `LOG_LEVEL`    | trace, debug, info, warn, error, silent | Filter output by level     |
| `LOG_FORMAT`   | console, json                           | Output format              |
| `DEBUG`        | `*`, namespace prefixes, `-prefix`      | Filter by namespace        |
| `TRACE`        | `1`, `true`, or namespace prefixes      | Enable span output         |
| `TRACE_FORMAT` | json                                    | Force JSON output          |
| `NODE_ENV`     | production                              | Auto-enable JSON format    |

---

## Writers

### addWriter

```typescript
function addWriter(writer: (formatted: string, level: string) => void): () => void
```

Subscribe to all formatted log output. Returns an unsubscribe function.

```typescript
const lines: string[] = []
const unsub = addWriter((formatted) => lines.push(formatted))
// ... later:
unsub()
```

### createFileWriter

```typescript
function createFileWriter(path: string, options?: FileWriterOptions): FileWriter
```

Create a buffered file writer with automatic flushing.

| Option          | Type     | Default | Description                          |
| --------------- | -------- | ------- | ------------------------------------ |
| `bufferSize`    | `number` | 4096    | Flush when buffer exceeds this (bytes) |
| `flushInterval` | `number` | 100     | Flush every N milliseconds           |

```typescript
const writer = createFileWriter("/tmp/app.log")
const unsub = addWriter((formatted) => writer.write(formatted))

// On shutdown:
unsub()
writer.close() // Flushes remaining buffer and closes fd
```

The writer registers a `process.on("exit")` handler for data safety, and `unref()`s its interval timer so it won't keep the process alive.

---

## Types

```typescript
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent"
type OutputLogLevel = "trace" | "debug" | "info" | "warn" | "error"
type LogFormat = "console" | "json"
type OutputMode = "console" | "stderr" | "writers-only"
type LazyMessage = string | (() => string)
```

### ConditionalLogger

The return type of `createLogger()`. Log methods are `undefined` when their level is disabled:

```typescript
interface ConditionalLogger {
  readonly name: string
  readonly props: Readonly<Record<string, unknown>>
  readonly spanData: SpanData | null

  trace?: (message: LazyMessage, data?: Record<string, unknown>) => void
  debug?: (message: LazyMessage, data?: Record<string, unknown>) => void
  info?: (message: LazyMessage, data?: Record<string, unknown>) => void
  warn?: (message: LazyMessage, data?: Record<string, unknown>) => void
  error?: (message: LazyMessage | Error, data?: Record<string, unknown>) => void

  logger(namespace?: string, props?: Record<string, unknown>): Logger
  span(namespace?: string, props?: Record<string, unknown>): SpanLogger
  child(context: Record<string, unknown>): Logger
  end(): void
}
```

TypeScript enforces `?.` at compile time -- you can't call `log.debug()` without `?.` because the method may be undefined.

---

## Span Collection

For testing and analysis, spans can be collected programmatically.

```typescript
import {
  startCollecting,
  stopCollecting,
  getCollectedSpans,
  clearCollectedSpans,
  resetIds,
} from "@beorn/logger"

resetIds()          // Reset ID counters for deterministic tests
startCollecting()   // Enable span collection

const log = createLogger("test")
{
  using span = log.span("operation")
  span.spanData.items = 42
}

const spans = stopCollecting()
// spans[0].id === "sp_1"
// spans[0].duration === <measured>
```
