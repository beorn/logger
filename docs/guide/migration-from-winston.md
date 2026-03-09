# Migration from Winston

Step-by-step guide for migrating from Winston to Loggily.

## Why Migrate?

| Feature                   | Winston                 | Loggily                       |
| ------------------------- | ----------------------- | ----------------------------- |
| Log levels                | Customizable            | 5 fixed levels + silent       |
| Structured data           | Yes (metadata)          | Yes (data parameter)          |
| Disabled call overhead    | ~372ns                  | **~2.5ns** (?. pattern)       |
| Disabled + expensive args | ~741ns (args evaluated) | **~3.6ns (args skipped)**     |
| Built-in spans/tracing    | No                      | Yes (with `using` keyword)    |
| Transports                | Rich ecosystem          | Writers + file writer         |
| Pretty print              | Via formats             | Built-in                      |
| Bundle size               | ~60KB + transports      | ~3KB                          |
| Browser support           | Via browser transport   | Built-in (conditional export) |

## Quick Migration

### Before (Winston)

```typescript
import winston from "winston"

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
})

logger.info("server started", { port: 3000 })
logger.error("request failed", { error: err.message })
```

### After (Loggily)

```typescript
import { createLogger } from "loggily"

const log = createLogger("myapp")

log.info?.("server started", { port: 3000 })
log.error?.(err) // Automatic Error handling
```

## Pattern Mapping

### Logger Creation

```typescript
// Winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
})

// loggily
const log = createLogger("myapp")
// Level, format, and output configured via env vars or API:
// LOG_LEVEL=info, LOG_FORMAT=json, NODE_ENV=production
```

### Log Calls

```typescript
// Winston — message first, metadata spread or second arg
logger.info("starting", { port: 3000 })
logger.info({ message: "starting", port: 3000 })
logger.error("failed", { error: err.message, stack: err.stack })

// loggily — message + optional data
log.info?.("starting", { port: 3000 })
log.error?.(err) // Error: auto-extracts message, stack, code
log.error?.(err, { context: "startup" }) // With extra context
```

### Levels

| Winston Level | Loggily Level           |
| ------------- | ----------------------- |
| error         | error                   |
| warn          | warn                    |
| info          | info                    |
| http          | info (no separate http) |
| verbose       | debug                   |
| debug         | debug                   |
| silly         | trace                   |

### Child Loggers

```typescript
// Winston — child loggers via defaultMeta
const childLogger = logger.child({ requestId: "abc" })
childLogger.info("processing")

// loggily — two patterns
const child = log.child({ requestId: "abc" }) // Context fields
const dbLog = log.logger("db") // Namespace: myapp:db
```

### Transports / Writers

```typescript
// Winston transports
const logger = winston.createLogger({
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: "app.log" })],
})

// loggily writers
import { addWriter, createFileWriter } from "loggily"

// Console output is built-in (default)
// File output via createFileWriter
const writer = createFileWriter("/tmp/app.log")
const unsub = addWriter((formatted) => writer.write(formatted))

// Custom writer (e.g., send to external service)
addWriter((formatted, level) => {
  if (level === "error") sendToAlertService(formatted)
})
```

### Formats

```typescript
// Winston — format combinators
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
  ),
})

// loggily — built-in formats
// Development: colorized console with timestamp (default)
// Production: JSON (NODE_ENV=production or LOG_FORMAT=json)
// No configuration needed
```

### Timing

```typescript
// Winston (manual profiling)
logger.profile("operation")
await doWork()
logger.profile("operation") // logs duration

// loggily (built-in spans)
{
  using span = log.span("operation")
  await doWork()
}
// Automatic: SPAN myapp:operation (234ms)
```

## Environment Variables

| Winston                  | Loggily               | Effect             |
| ------------------------ | --------------------- | ------------------ |
| N/A (configured in code) | `LOG_LEVEL=debug`     | Set minimum level  |
| N/A                      | `DEBUG=myapp`         | Namespace filter   |
| N/A                      | `TRACE=1`             | Enable span output |
| N/A                      | `LOG_FORMAT=json`     | Force JSON output  |
| `NODE_ENV=production`    | `NODE_ENV=production` | Auto-enable JSON   |

## Migration Checklist

1. **Update dependencies**: `bun remove winston` and `bun add loggily`
2. **Update imports**: `import winston from "winston"` → `import { createLogger } from "loggily"`
3. **Replace `createLogger()`**: Winston's options → `createLogger("name")` + env vars
4. **Convert transports** to `addWriter()` + optional `createFileWriter()`
5. **Remove format configuration** — built-in formats handle dev/prod automatically
6. **Add `?.`** to all log calls for zero-overhead disabled logging
7. **Map custom levels**: http→info, verbose→debug, silly→trace
8. **Convert `logger.profile()`** to spans with `using`
9. **Replace `logger.child()`** with `.child()` (context) or `.logger()` (namespace)
