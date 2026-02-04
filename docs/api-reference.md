# API Reference

Complete API documentation for @beorn/logger.

## Table of Contents

- [createLogger](#createlogger)
- [Logger Interface](#logger-interface)
- [SpanLogger Interface](#spanlogger-interface)
- [Configuration Functions](#configuration-functions)
- [Zero-Overhead Logging](#zero-overhead-logging)
- [Types](#types)
- [Span Collection](#span-collection)

---

## createLogger

```typescript
function createLogger(
  name: string,
  props?: Record<string, unknown>,
): ConditionalLogger
```

Create a logger for a component. Returns a conditional logger where disabled log levels return `undefined` - use optional chaining (`?.`) to skip argument evaluation.

### Parameters

| Parameter | Type                      | Required | Description                                  |
| --------- | ------------------------- | -------- | -------------------------------------------- |
| `name`    | `string`                  | Yes      | Logger namespace (e.g., 'myapp', 'myapp:db') |
| `props`   | `Record<string, unknown>` | No       | Initial properties inherited by all children |

### Returns

`ConditionalLogger` - A logger where disabled levels return `undefined`.

### Examples

```typescript
// Basic usage
const log = createLogger("myapp")
log.info("starting")

// With initial props (inherited by children)
const log = createLogger("myapp", { version: "1.0", env: "prod" })

// Creates child with inherited props
const dbLog = log.logger("db") // namespace: 'myapp:db', props: { version: '1.0', env: 'prod' }
```

---

## Logger Interface

```typescript
interface Logger {
  readonly name: string
  readonly props: Readonly<Record<string, unknown>>
  readonly spanData: SpanData | null

  // Logging methods
  trace(message: string, data?: Record<string, unknown>): void
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  error(error: Error, data?: Record<string, unknown>): void

  // Child creation
  logger(namespace?: string, props?: Record<string, unknown>): Logger
  span(namespace?: string, props?: Record<string, unknown>): SpanLogger

  // Manual span control
  end(): void

  // Deprecated
  child(context: string): Logger
}
```

### Properties

| Property   | Type                      | Description                                                     |
| ---------- | ------------------------- | --------------------------------------------------------------- |
| `name`     | `string`                  | Logger namespace (e.g., 'myapp:import')                         |
| `props`    | `Record<string, unknown>` | Frozen props inherited from parent + own props                  |
| `spanData` | `SpanData \| null`        | Span data (non-null for span loggers, null for regular loggers) |

### Logging Methods

All logging methods accept a message string and optional data object.

```typescript
log.trace(message: string, data?: Record<string, unknown>): void
log.debug(message: string, data?: Record<string, unknown>): void
log.info(message: string, data?: Record<string, unknown>): void
log.warn(message: string, data?: Record<string, unknown>): void
log.error(message: string, data?: Record<string, unknown>): void
log.error(error: Error, data?: Record<string, unknown>): void
```

#### Log Levels

| Level   | Priority | Purpose                                      |
| ------- | -------- | -------------------------------------------- |
| `trace` | 0        | Verbose debugging (hot paths, detailed flow) |
| `debug` | 1        | Debug information (state changes, decisions) |
| `info`  | 2        | Normal operation (startup, completion)       |
| `warn`  | 3        | Recoverable issues (deprecations, retries)   |
| `error` | 4        | Failures (exceptions, critical errors)       |

#### Error Handling

The `error` method has a special overload for Error objects:

```typescript
try {
  await riskyOperation()
} catch (err) {
  log.error(err as Error)
  // Automatically extracts: message, name (error_type), stack (error_stack), code (error_code)
}

// With additional context
log.error(new Error("connection failed"), {
  host: "db.example.com",
  port: 5432,
})
```

#### Examples

```typescript
log.trace("entering function", { args: [1, 2, 3] })
log.debug("cache miss", { key: "user:123" })
log.info("server started", { port: 3000 })
log.warn("rate limited", { remaining: 0, resetIn: 60 })
log.error("query failed", { query: "SELECT *", code: "ETIMEDOUT" })
```

### Child Creation Methods

#### logger(namespace?, props?)

Create a child logger that extends the namespace and inherits props.

```typescript
const appLog = createLogger("myapp", { version: "1.0" })
const dbLog = appLog.logger("db", { pool: "primary" })
// namespace: 'myapp:db'
// props: { version: '1.0', pool: 'primary' }

dbLog.info("connected")
// → INFO myapp:db connected {version: "1.0", pool: "primary"}
```

#### span(namespace?, props?)

Create a child span logger with timing. Implements `Disposable` for use with `using`.

```typescript
{
  using span = log.span("import", { file: "data.csv" })
  span.info("processing")
  span.spanData.rowCount = 1000
}
// On block exit: SPAN myapp:import (234ms) {rowCount: 1000, file: "data.csv"}
```

### Manual Span Control

#### end()

Manually end a span (alternative to `using` keyword).

```typescript
const span = log.span("operation")
try {
  // ... work ...
  span.spanData.result = "success"
} finally {
  span.end() // Emits span with timing
}
```

### Deprecated Methods

#### child(context)

**Deprecated.** Use `.logger()` instead.

```typescript
// Old way (deprecated)
const child = log.child("db")

// New way
const child = log.logger("db")
```

---

## SpanLogger Interface

```typescript
interface SpanLogger extends Logger, Disposable {
  readonly spanData: SpanData & {
    [key: string]: unknown
  }
}
```

SpanLogger extends Logger with:

- Non-null `spanData` with mutable custom attributes
- Implements `Disposable` for automatic cleanup with `using`

### SpanData Properties

| Property    | Type             | Mutable | Description                                |
| ----------- | ---------------- | ------- | ------------------------------------------ |
| `id`        | `string`         | No      | Unique span ID (sp_1, sp_2, ...)           |
| `traceId`   | `string`         | No      | Trace ID (shared across nested spans)      |
| `parentId`  | `string \| null` | No      | Parent span ID (null for root spans)       |
| `startTime` | `number`         | No      | Start timestamp (milliseconds since epoch) |
| `endTime`   | `number \| null` | No      | End timestamp (null until span ends)       |
| `duration`  | `number \| null` | No      | Computed duration (live while span active) |
| `[custom]`  | `unknown`        | Yes     | Custom attributes via direct assignment    |

### Setting Custom Attributes

```typescript
{
  using span = log.span("import")

  // Set custom attributes directly on spanData
  span.spanData.rowCount = 0

  for (const row of rows) {
    await processRow(row)
    span.spanData.rowCount++
  }

  span.spanData.status = "complete"
}
// → SPAN myapp:import (1234ms) {rowCount: 500, status: "complete"}
```

### Nested Spans

Spans automatically track parent-child relationships:

```typescript
{
  using outer = log.span("request", { path: "/api/users" })

  {
    using db = outer.span("db:query")
    // db.spanData.parentId === outer.spanData.id
    // db.spanData.traceId === outer.spanData.traceId
    await fetchUsers()
  }

  {
    using cache = outer.span("cache:set")
    // cache.spanData.parentId === outer.spanData.id
    // cache.spanData.traceId === outer.spanData.traceId
    await cacheResults()
  }
}
```

---

## Configuration Functions

### setLogLevel(level)

```typescript
function setLogLevel(level: LogLevel): void
```

Set the minimum log level. Messages below this level are not output.

```typescript
import { setLogLevel } from "@beorn/logger"

setLogLevel("warn") // Only warn and error messages will appear
setLogLevel("trace") // All messages including trace
setLogLevel("silent") // No output at all
```

### getLogLevel()

```typescript
function getLogLevel(): LogLevel
```

Get the current log level.

```typescript
import { getLogLevel } from "@beorn/logger"

const level = getLogLevel() // 'info' (default)
```

### enableSpans()

```typescript
function enableSpans(): void
```

Enable span timing output. Equivalent to `TRACE=1`.

```typescript
import { enableSpans } from "@beorn/logger"

enableSpans()
// Now all spans will emit timing output when they end
```

### disableSpans()

```typescript
function disableSpans(): void
```

Disable span timing output.

```typescript
import { disableSpans } from "@beorn/logger"

disableSpans()
// Spans still track timing but don't emit output
```

### spansAreEnabled()

```typescript
function spansAreEnabled(): boolean
```

Check if span output is enabled.

```typescript
import { spansAreEnabled } from "@beorn/logger"

if (spansAreEnabled()) {
  // Span output is active
}
```

### setTraceFilter(namespaces)

```typescript
function setTraceFilter(namespaces: string[] | null): void
```

Set trace filter for namespace-based span output control. Only spans matching these namespace prefixes will be output.

```typescript
import { setTraceFilter } from "@beorn/logger"

setTraceFilter(["myapp"]) // Only 'myapp' and 'myapp:*' spans
setTraceFilter(["db", "cache"]) // Only 'db:*' and 'cache:*' spans
setTraceFilter(null) // Clear filter, output all spans
```

### getTraceFilter()

```typescript
function getTraceFilter(): string[] | null
```

Get the current trace filter.

```typescript
import { getTraceFilter } from "@beorn/logger"

const filter = getTraceFilter() // ['myapp'] or null
```

---

## Zero-Overhead Logging

`createLogger` returns a `ConditionalLogger` that returns `undefined` for disabled levels. This allows optional chaining (`?.`) to skip argument evaluation entirely.

### ConditionalLogger Type

```typescript
type ConditionalLogger = {
  readonly name: string
  readonly props: Readonly<Record<string, unknown>>
  readonly spanData: SpanData | null

  // Methods are possibly undefined when level is disabled
  trace?: (message: string, data?: Record<string, unknown>) => void
  debug?: (message: string, data?: Record<string, unknown>) => void
  info?: (message: string, data?: Record<string, unknown>) => void
  warn?: (message: string, data?: Record<string, unknown>) => void
  error?: (message: string | Error, data?: Record<string, unknown>) => void

  logger(namespace?: string, props?: Record<string, unknown>): ConditionalLogger
  span(namespace?: string, props?: Record<string, unknown>): SpanLogger
  end(): void
}
```

### Usage with Optional Chaining

```typescript
import { createLogger } from "@beorn/logger"

const log = createLogger("myapp")

// Info/warn/error always enabled at default level - safe without ?.
log.info("starting")

// Debug/trace use optional chaining - skips argument evaluation when disabled
log.debug?.(`expensive: ${computeExpensiveState()}`)
log.trace?.(`node ${node.id.slice(-8)} children=${children.length}`)
```

The logger responds dynamically to log level changes:

```typescript
import { createLogger, setLogLevel } from "@beorn/logger"

const log = createLogger("myapp")

setLogLevel("error")
log.debug // undefined

setLogLevel("debug")
log.debug // function
```

### createConditionalLogger (Deprecated)

```typescript
/** @deprecated Use createLogger() instead */
export const createConditionalLogger = createLogger
```

The deprecated `createConditionalLogger` is an alias for `createLogger`. Existing code will continue to work, but new code should use `createLogger` directly.

### Performance Benefits

| Scenario              | ops/s | ns/op | Notes                               |
| --------------------- | ----- | ----- | ----------------------------------- |
| noop (cheap args)     | 2168M | 0.5   | Fastest for trivial args            |
| `?.` (cheap args)     | 1406M | 0.7   | ~0.2ns overhead - negligible        |
| noop (expensive args) | 17M   | 57.6  | Args still evaluated                |
| `?.` (expensive args) | 408M  | 2.5   | Args NOT evaluated - **22x faster** |

---

## Types

### LogLevel

```typescript
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent"
```

All log levels including `silent` (disables all output).

### OutputLogLevel

```typescript
type OutputLogLevel = "trace" | "debug" | "info" | "warn" | "error"
```

Log levels that produce output (excludes `silent`).

### SpanData

```typescript
interface SpanData {
  readonly id: string
  readonly traceId: string
  readonly parentId: string | null
  readonly startTime: number
  readonly endTime: number | null
  readonly duration: number | null
  [key: string]: unknown // Custom attributes
}
```

---

## Span Collection

For testing and analysis, spans can be collected programmatically.

### startCollecting()

```typescript
function startCollecting(): void
```

Enable span collection and clear any existing collected spans.

### stopCollecting()

```typescript
function stopCollecting(): SpanData[]
```

Stop collecting and return all collected spans.

### getCollectedSpans()

```typescript
function getCollectedSpans(): SpanData[]
```

Get currently collected spans without stopping collection.

### clearCollectedSpans()

```typescript
function clearCollectedSpans(): void
```

Clear collected spans without stopping collection.

### resetIds()

```typescript
function resetIds(): void
```

Reset span and trace ID counters (useful for deterministic tests).

### Example

```typescript
import {
  createLogger,
  startCollecting,
  stopCollecting,
  resetIds,
} from "@beorn/logger"

// Reset for deterministic test output
resetIds()
startCollecting()

const log = createLogger("test")
{
  using span = log.span("operation")
  span.spanData.items = 42
}

const spans = stopCollecting()
// spans[0].id === 'sp_1'
// spans[0].duration === <measured duration>
// spans[0].items === 42
```

---

## Environment Variables

| Variable       | Values                                  | Effect                  |
| -------------- | --------------------------------------- | ----------------------- |
| `LOG_LEVEL`    | trace, debug, info, warn, error, silent | Filter output by level  |
| `TRACE`        | 1, true, or namespace prefixes          | Enable span output      |
| `TRACE_FORMAT` | json                                    | Force JSON output       |
| `NODE_ENV`     | production                              | Auto-enable JSON format |

### Examples

```bash
LOG_LEVEL=debug bun run app         # Enable debug logging
TRACE=1 bun run app                 # Enable all span timing output
TRACE=myapp:import bun run app      # Enable spans for specific namespace
TRACE=myapp,other bun run app       # Enable spans for multiple prefixes
```
