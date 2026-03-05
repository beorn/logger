# @beorn/logger

[![Tests](https://github.com/beorn/logger/actions/workflows/test.yml/badge.svg)](https://github.com/beorn/logger/actions/workflows/test.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Clarity without the clutter. Ergonomic unified logs, spans, and debugs for modern TypeScript. **~3KB**, one dependency ([picocolors](https://github.com/alexeyraspopov/picocolors)).

The core idea: every logger is a potential span. Call `.span()` and it becomes one -- with automatic timing, parent-child tracking, and trace IDs. No separate tracing library needed. Read **[The Journey](docs/guide.md)** for the full story.

## Install

```bash
bun add @beorn/logger    # or: npm install @beorn/logger
```

## Quick Start

```typescript
import { createLogger } from "@beorn/logger"

const log = createLogger("myapp")

log.info?.("server started", { port: 3000 })
log.debug?.("cache hit", { key: "user:42" })
log.error?.(new Error("connection lost"))

// Spans time operations automatically
{
  using span = log.span("db:query", { table: "users" })
  const users = await db.query("SELECT * FROM users")
  span.spanData.count = users.length
}
// Output: SPAN myapp:db:query (45ms) {count: 100, table: "users"}
```

## Why Another Logger?

Most loggers waste work when logging is disabled:

```typescript
// Pino, Winston, Bunyan -- args are ALWAYS evaluated
log.debug(`state: ${JSON.stringify(computeExpensiveState())}`)
// computeExpensiveState() runs even when debug is off
```

@beorn/logger uses optional chaining to skip argument evaluation entirely:

```typescript
// @beorn/logger -- args are NOT evaluated when disabled
log.debug?.(`state: ${JSON.stringify(computeExpensiveState())}`)
// computeExpensiveState() never runs when debug is off -- 22x faster
```

| Scenario                    | Traditional (noop)     | Optional chaining (`?.`) |
| --------------------------- | ---------------------- | ------------------------ |
| Cheap args disabled         | 2168M ops/s (0.5ns)    | 1406M ops/s (0.7ns)      |
| **Expensive args disabled** | **17M ops/s (57.6ns)** | **408M ops/s (2.5ns)**   |

For cheap arguments the difference is negligible (~0.2ns). For expensive arguments -- string interpolation, JSON serialization, state computation -- optional chaining is **22x faster**.

## Features

### Namespace Hierarchy

Organize logs with `:` separators. Child loggers inherit parent context.

```typescript
const log = createLogger("myapp", { version: "2.1" })
const db = log.logger("db") // myapp:db
const cache = log.logger("cache") // myapp:cache

db.info?.("connected")
// 14:32:15 INFO myapp:db connected {version: "2.1"}
```

### Spans

Time any operation with `using`. Spans are loggers with duration tracking, parent-child relationships, and trace IDs.

```typescript
{
  using span = log.span("import", { file: "data.csv" })
  span.info?.("parsing rows")
  span.spanData.rowCount = await importFile()
}
// SPAN myapp:import (1234ms) {rowCount: 500, file: "data.csv"}
```

Spans nest automatically:

```typescript
{
  using request = log.span("request", { path: "/api/users" })
  {
    using db = request.span("db:query")
    // db.spanData.traceId === request.spanData.traceId
    await fetchUsers()
  }
  {
    using cache = request.span("cache:set")
    await cacheResults()
  }
}
```

### Lazy Messages

Pass a function when the message itself is expensive to construct:

```typescript
log.debug?.(() => `tree: ${JSON.stringify(buildDebugTree())}`)
// Function only called when debug is enabled
```

### Child Context

Create loggers with structured context that appears in every message:

```typescript
const reqLog = log.child({ requestId: "abc-123", userId: 42 })
reqLog.info?.("handling request")
// 14:32:15 INFO myapp handling request {requestId: "abc-123", userId: 42}

// Context accumulates through the chain
const dbLog = reqLog.child({ pool: "primary" })
// Has: requestId, userId, pool
```

### Dual Output Format

Pretty console in development, structured JSON in production:

```bash
# Development (default)
bun run app
# 14:32:15 INFO myapp server started {port: 3000}

# Production
NODE_ENV=production bun run app
# {"time":"2026-01-15T14:32:15.123Z","level":"info","name":"myapp","msg":"server started","port":3000}

# Explicit JSON
LOG_FORMAT=json bun run app
```

### File Writer

Buffer log output to files with automatic flushing:

```typescript
import { createFileWriter, addWriter } from "@beorn/logger"

const writer = createFileWriter("/tmp/app.log", {
  bufferSize: 4096, // Flush when buffer exceeds 4KB
  flushInterval: 100, // Or every 100ms, whichever comes first
})

const unsubscribe = addWriter((formatted) => writer.write(formatted))

// On shutdown:
unsubscribe()
writer.close()
```

### Worker Thread Support

Forward logs from worker threads to the main thread:

```typescript
// Worker side
import { createWorkerLogger } from "@beorn/logger/worker"
const log = createWorkerLogger(postMessage, "myapp:worker")

log.info?.("processing", { file: "data.csv" })
{
  using span = log.span("parse")
  span.spanData.lines = 100
}

// Main thread side
import { createWorkerLogHandler } from "@beorn/logger/worker"
const handle = createWorkerLogHandler()
worker.onmessage = (e) => handle(e.data)
```

## Environment Variables

| Variable       | Values                                  | Effect                                  |
| -------------- | --------------------------------------- | --------------------------------------- |
| `LOG_LEVEL`    | trace, debug, info, warn, error, silent | Minimum output level                    |
| `LOG_FORMAT`   | console, json                           | Output format                           |
| `DEBUG`        | `*`, namespace prefixes, `-prefix`      | Namespace filter (like `debug` package) |
| `TRACE`        | `1`, `true`, or namespace prefixes      | Enable span output                      |
| `TRACE_FORMAT` | json                                    | Force JSON for spans                    |
| `NODE_ENV`     | production                              | Auto-enable JSON format                 |

```bash
LOG_LEVEL=debug bun run app              # Show debug and above
DEBUG=myapp bun run app                  # Only myapp namespace (auto-enables debug level)
DEBUG='myapp,-myapp:noisy' bun run app   # Exclude noisy sub-namespace
TRACE=1 bun run app                      # Enable all span output
TRACE=myapp:db bun run app               # Spans for specific namespace only
```

## API

### Core

| Function                                                 | Description                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `createLogger(name, props?)`                             | Create a conditional logger (disabled levels return `undefined`) |
| `setLogLevel(level)` / `getLogLevel()`                   | Set/get minimum log level                                        |
| `setLogFormat(format)` / `getLogFormat()`                | Set/get output format (`"console"` or `"json"`)                  |
| `enableSpans()` / `disableSpans()` / `spansAreEnabled()` | Control span output                                              |
| `setTraceFilter(namespaces)` / `getTraceFilter()`        | Filter span output by namespace                                  |
| `setDebugFilter(namespaces)` / `getDebugFilter()`        | Filter log output by namespace                                   |

### Logger Methods

| Method                          | Description                                 |
| ------------------------------- | ------------------------------------------- |
| `.trace?.(msg, data?)`          | Verbose debugging                           |
| `.debug?.(msg, data?)`          | Debug information                           |
| `.info?.(msg, data?)`           | Normal operation                            |
| `.warn?.(msg, data?)`           | Recoverable issues                          |
| `.error?.(msg \| Error, data?)` | Failures                                    |
| `.logger(namespace?, props?)`   | Create child logger                         |
| `.span(namespace?, props?)`     | Create timed span (implements `Disposable`) |
| `.child(context)`               | Create child with context fields            |

### Writers

| Function                        | Description                                     |
| ------------------------------- | ----------------------------------------------- |
| `addWriter(fn)`                 | Add output writer, returns unsubscribe          |
| `createFileWriter(path, opts?)` | Buffered file writer with auto-flush            |
| `setOutputMode(mode)`           | `"console"`, `"stderr"`, or `"writers-only"`    |
| `setSuppressConsole(bool)`      | Suppress console output (writers still receive) |

### Worker Thread

| Function                                      | Module                 | Description                             |
| --------------------------------------------- | ---------------------- | --------------------------------------- |
| `createWorkerLogger(postMessage, ns, props?)` | `@beorn/logger/worker` | Logger that forwards to main thread     |
| `createWorkerLogHandler(opts?)`               | `@beorn/logger/worker` | Main thread handler for worker messages |
| `forwardConsole(postMessage, ns?)`            | `@beorn/logger/worker` | Forward `console.*` from worker         |

## Documentation

- **[The Journey](docs/guide.md)** -- Progressive guide from first log to full observability
- [API Reference](docs/api-reference.md) -- Complete API documentation
- [Comparison](docs/comparison.md) -- vs Pino, Winston, Bunyan, debug
- [Migration from debug](docs/migration-from-debug.md) -- Step-by-step migration guide
- [Conditional Logging Research](docs/conditional-logging-research.md) -- Benchmarks and design rationale

## License

[MIT](LICENSE)
