# Comparison with Other Loggers

How @beorn/logger compares to popular Node.js logging libraries.

## Feature Comparison Table

| Feature                | @beorn/logger | Pino    | Winston   | Bunyan    | debug     |
| ---------------------- | ------------- | ------- | --------- | --------- | --------- |
| **Log Levels**         | Yes (5)       | Yes (6) | Yes (7)   | Yes (6)   | No        |
| **Structured Logging** | Yes           | Yes     | Yes       | Yes       | No        |
| **JSON Output**        | Yes           | Yes     | Yes       | Yes       | No        |
| **Spans/Tracing**      | Built-in      | No      | No        | No        | No        |
| **Zero-cost Disabled** | Yes (`?.`)    | No      | No        | No        | No        |
| **Child Loggers**      | Yes           | Yes     | Yes       | Yes       | Manual    |
| **Transports**         | No            | Yes     | Yes       | Yes       | No        |
| **Pretty Print**       | Auto (dev)    | Plugin  | Plugin    | Plugin    | Yes       |
| **Browser Support**    | Partial       | Yes     | Yes       | Yes       | Yes       |
| **Bundle Size**        | ~3KB          | ~17KB   | ~200KB+   | ~30KB     | ~2KB      |
| **TypeScript**         | Native        | Yes     | Types pkg | Types pkg | Types pkg |

## vs Pino

[Pino](https://github.com/pinojs/pino) is the gold standard for high-performance Node.js logging.

### Similarities

- Performance-focused design
- JSON output in production
- Child loggers with inherited context
- Minimal overhead

### Differences

| Aspect             | Pino                           | @beorn/logger                    |
| ------------------ | ------------------------------ | -------------------------------- |
| Zero-cost disabled | Noop function (args evaluated) | Optional chaining (args skipped) |
| Spans              | External (pino-opentelemetry)  | Built-in                         |
| Transports         | Built-in (worker threads)      | None (stdout only)               |
| Formatters         | Plugin system                  | Console/JSON auto-switch         |
| Serializers        | Configurable                   | Fixed (Error auto-handled)       |

### When to Choose

**Choose Pino if:**

- You need transport plugins (file rotation, remote logging)
- You need custom serializers for complex objects
- You're building a large production system with multiple log destinations

**Choose @beorn/logger if:**

- You want zero-cost disabled logging via optional chaining
- You need built-in span timing
- You prefer simplicity over configuration
- Bundle size matters

### Code Comparison

```typescript
// Pino
import pino from "pino"
const log = pino({ level: "debug" })
const child = log.child({ requestId: "123" })
child.info({ user: "alice" }, "logged in")

// @beorn/logger
import { createLogger } from "@beorn/logger"
const log = createLogger("myapp")
const child = log.logger("request", { requestId: "123" })
child.info("logged in", { user: "alice" })
```

---

## vs Winston

[Winston](https://github.com/winstonjs/winston) is the most popular Node.js logger with extensive transport support.

### Similarities

- Multiple log levels
- Structured logging support
- Child loggers

### Differences

| Aspect        | Winston                | @beorn/logger       |
| ------------- | ---------------------- | ------------------- |
| Philosophy    | Flexible, configurable | Simple, opinionated |
| Transports    | 10+ built-in           | stdout only         |
| Configuration | Extensive              | Minimal (env vars)  |
| Performance   | Moderate               | High                |
| Bundle Size   | ~200KB+                | ~3KB                |
| Spans         | No                     | Built-in            |

### When to Choose

**Choose Winston if:**

- You need multiple transports (file, HTTP, database)
- You need custom formatters and filters
- You have complex logging requirements

**Choose @beorn/logger if:**

- You want minimal configuration
- Performance is critical
- You're logging to stdout (12-factor app)
- You need built-in timing spans

### Code Comparison

```typescript
// Winston
import winston from "winston"
const log = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
})
log.info("starting", { port: 3000 })

// @beorn/logger
import { createLogger } from "@beorn/logger"
const log = createLogger("myapp")
log.info("starting", { port: 3000 })
```

---

## vs Bunyan

[Bunyan](https://github.com/trentm/node-bunyan) focuses on JSON logging with built-in CLI tools.

### Similarities

- JSON-first output
- Child loggers
- Structured data

### Differences

| Aspect        | Bunyan                 | @beorn/logger               |
| ------------- | ---------------------- | --------------------------- |
| Output Format | JSON only              | Console (dev) / JSON (prod) |
| CLI Tools     | bunyan CLI for viewing | None                        |
| Streams       | Multiple streams       | stdout only                 |
| Spans         | No                     | Built-in                    |
| API           | Verbose                | Simple                      |

### When to Choose

**Choose Bunyan if:**

- You want the bunyan CLI for log viewing
- You need multiple output streams
- JSON-only output is fine for development

**Choose @beorn/logger if:**

- You want readable console output in development
- You need built-in spans
- You prefer a simpler API

### Code Comparison

```typescript
// Bunyan
import bunyan from "bunyan"
const log = bunyan.createLogger({ name: "myapp" })
const child = log.child({ requestId: "123" })
child.info({ user: "alice" }, "logged in")

// @beorn/logger
import { createLogger } from "@beorn/logger"
const log = createLogger("myapp")
const child = log.logger("request", { requestId: "123" })
child.info("logged in", { user: "alice" })
```

---

## vs debug

[debug](https://github.com/debug-js/debug) is a tiny debugging utility.

### Similarities

- Minimal footprint
- Namespace-based organization
- Environment variable control

### Differences

| Aspect        | debug             | @beorn/logger     |
| ------------- | ----------------- | ----------------- |
| Log Levels    | No (on/off)       | Yes (5 levels)    |
| Output Format | printf-style      | Structured JSON   |
| Spans         | No                | Built-in          |
| Conditional   | `.enabled` check  | Optional chaining |
| Data          | Inline in message | Separate object   |

### When to Choose

**Choose debug if:**

- You only need simple debugging output
- You don't need log levels
- You don't need structured data

**Choose @beorn/logger if:**

- You need log levels
- You need structured data
- You need timing spans
- You want zero-cost disabled logging

### Code Comparison

```typescript
// debug
import createDebug from "debug"
const debug = createDebug("myapp")
debug("user %s logged in", username)

// @beorn/logger
import { createLogger } from "@beorn/logger"
const log = createLogger("myapp")
log.info("user logged in", { username })
```

See [migration-from-debug.md](./migration-from-debug.md) for a detailed migration guide.

---

## Unique Features of @beorn/logger

### 1. Zero-cost Disabled Logging

Optional chaining skips argument evaluation entirely:

```typescript
// Other loggers - args always evaluated
pino.debug(`expensive: ${computeState()}`) // computeState() runs even if disabled

// @beorn/logger - args skipped when disabled
log.debug?.(`expensive: ${computeState()}`) // computeState() NOT called if disabled
```

**Benchmark (10M iterations):**

- Noop with expensive args: 17M ops/s (57.6ns)
- Optional chaining with expensive args: 408M ops/s (2.5ns) - **22x faster**

### 2. Built-in Spans

No external tracing library needed:

```typescript
{
  using span = log.span("db:query", { table: "users" })
  const users = await db.query("SELECT * FROM users")
  span.spanData.count = users.length
}
// → SPAN myapp:db:query (45ms) {count: 100, table: "users"}
```

Features:

- Automatic timing on block exit
- Parent-child relationships tracked
- Custom attributes via `spanData`
- Trace ID for request correlation

### 3. Disposable Pattern

Uses JavaScript's `using` keyword for automatic cleanup:

```typescript
{
  using span = log.span("operation")
  // ... work ...
} // Span automatically ends and emits timing

// No need for try/finally or .end() calls
```

### 4. Auto-format Switching

Console output in development, JSON in production:

```bash
# Development (pretty console)
bun run app
# → 14:32:15 INFO myapp starting {port: 3000}

# Production (JSON)
NODE_ENV=production bun run app
# → {"time":"2024-01-15T14:32:15.123Z","level":"info","name":"myapp","msg":"starting","port":3000}
```

---

## Summary

| Use Case                                | Recommended            |
| --------------------------------------- | ---------------------- |
| High-performance with optional chaining | @beorn/logger          |
| Built-in span timing                    | @beorn/logger          |
| Multiple transports                     | Pino or Winston        |
| Extensive configuration                 | Winston                |
| JSON CLI tools                          | Bunyan                 |
| Simple debugging only                   | debug                  |
| Minimal bundle size                     | debug or @beorn/logger |
| TypeScript-first                        | @beorn/logger or Pino  |
