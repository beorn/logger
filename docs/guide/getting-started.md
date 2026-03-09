# Getting Started

## Installation

::: code-group

```bash [npm]
npm install loggily
```

```bash [bun]
bun add loggily
```

```bash [pnpm]
pnpm add loggily
```

```bash [yarn]
yarn add loggily
```

:::

## Create a Logger

```typescript
import { createLogger } from "loggily"

const log = createLogger("myapp")
```

The string argument is the **namespace** -- it appears in every log message and is used for filtering.

## Log Messages

Every log method accepts a message string and optional structured data:

```typescript
log.info?.("server started", { port: 3000 })
log.debug?.("cache hit", { key: "user:42", ttl: 300 })
log.warn?.("rate limited", { remaining: 0, resetIn: 60 })
log.error?.(new Error("connection lost"))
```

Notice the `?.` -- this is intentional. When a log level is disabled, the method returns `undefined`, and optional chaining skips the entire call including argument evaluation. This is the core performance feature of Loggily.

## Log Levels

From most to least verbose:

| Level    | Purpose               | Default |
| -------- | --------------------- | ------- |
| `trace`  | Hot path debugging    | Off     |
| `debug`  | Development debugging | Off     |
| `info`   | Normal operation      | **On**  |
| `warn`   | Recoverable issues    | On      |
| `error`  | Failures              | On      |
| `silent` | Disable all output    | --      |

Control via environment variable or programmatically:

```bash
LOG_LEVEL=debug bun run app     # Enable debug and above
LOG_LEVEL=error bun run app     # Only errors
```

```typescript
import { setLogLevel } from "loggily"
setLogLevel("debug")
```

## Child Loggers

Build a namespace hierarchy with `.logger()`:

```typescript
const log = createLogger("myapp")
const db = log.logger("db") // namespace: "myapp:db"
const cache = log.logger("cache") // namespace: "myapp:cache"

db.info?.("connected", { host: "localhost" })
// 14:32:15 INFO myapp:db connected {host: "localhost"}
```

Props are inherited by children:

```typescript
const log = createLogger("myapp", { version: "2.1" })
const db = log.logger("db")
// db.props includes { version: "2.1" }
```

## Context Loggers

Add structured context that appears in every message:

```typescript
const reqLog = log.child({ requestId: "abc-123" })
reqLog.info?.("handling request")
// 14:32:15 INFO myapp handling request {requestId: "abc-123"}
```

## Spans

Time any operation with `using`:

```typescript
{
  using span = log.span("import", { file: "data.csv" })
  span.info?.("parsing")
  const rows = await importFile()
  span.spanData.rowCount = rows.length
}
// SPAN myapp:import (1234ms) {rowCount: 500, file: "data.csv"}
```

Spans are disabled by default. Enable with:

```bash
TRACE=1 bun run app              # All spans
TRACE=myapp:import bun run app   # Specific namespace
```

See [Spans](/guide/spans) for the full guide.

## Namespace Filtering

Filter output by namespace, just like the `debug` package:

```bash
DEBUG=myapp bun run app                  # Only myapp and children
DEBUG='myapp,-myapp:noisy' bun run app   # Exclude noisy sub-namespace
DEBUG='*' bun run app                    # Everything
```

## Output Format

Pretty console in development, JSON in production:

```bash
# Development (default)
bun run app
# 14:32:15 INFO myapp server started {port: 3000}

# Production (automatic)
NODE_ENV=production bun run app
# {"time":"2026-01-15T14:32:15.123Z","level":"info","name":"myapp","msg":"server started","port":3000}

# Explicit
LOG_FORMAT=json bun run app
```

## Next Steps

- [Zero-Overhead Logging](/guide/zero-overhead) -- How optional chaining works and benchmarks
- [Spans](/guide/spans) -- Timing, nesting, trace IDs
- [Worker Threads](/guide/workers) -- Forward logs from workers
- [API Reference](/api/) -- Complete API documentation
