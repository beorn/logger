# Loggily

**Clarity without the clutter.**

[![Tests](https://github.com/beorn/loggily/actions/workflows/test.yml/badge.svg)](https://github.com/beorn/loggily/actions/workflows/test.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Debug logging, structured logs, and distributed tracing — integrated into one **~3KB** library with a single API. Zero dependencies.

Most projects wire together three separate tools that don't talk to each other: **debug** for conditional output, **pino/winston** for production logs, **OpenTelemetry** for tracing. Loggily integrates all three into one unified system — same namespace tree, same output pipeline, same `?.` zero-overhead pattern. Every logger is a potential span: call `.span()` and it becomes one, with automatic timing, parent-child tracking, and trace IDs. Nothing to sync, nothing to configure separately.

In development, you get colorized console output with timestamps, level colors, and clickable source lines — Loggily uses native `console` methods so stack traces stay intact in DevTools. In production, the same code emits structured JSON. No config change needed.

Read **[The Journey](docs/guide/journey.md)** for the full story.

## Install

```bash
npm install loggily
```

## Quick Start

```typescript
import { createLogger } from "loggily"

const log = createLogger("myapp")

// ?. skips the entire call — including argument evaluation — when the level is disabled (near-zero cost)
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

Beyond the integration story above, most loggers also waste work when logging is disabled. Even with a noop function, arguments are still evaluated:

```typescript
// Traditional — args are ALWAYS evaluated, even when debug is off
log.debug(`state: ${JSON.stringify(computeExpensiveState())}`)
```

Loggily uses optional chaining to skip the entire call — including argument evaluation:

```typescript
// Loggily — args are NOT evaluated when disabled
log.debug?.(`state: ${JSON.stringify(computeExpensiveState())}`)
```

For trivial arguments the difference is negligible. But for real-world logging — string interpolation, JSON serialization, state snapshots — optional chaining is typically **10x+ faster** because it skips the work entirely. The more expensive your arguments, the bigger the win.

## Features

- **Namespace hierarchy** — organize logs with `:` separators. `log.logger("db")` creates `myapp:db`. Children inherit parent context.
- **Spans** — time any operation with `using span = log.span("name")`. Automatic duration, parent-child tracking, and trace IDs. _(Uses TC39 [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management); call `span.end()` manually if your runtime doesn't support `using` yet.)_
- **Lazy messages** — `log.debug?.(() => expensiveString())` skips the function entirely when disabled.
- **Child context** — `log.child({ requestId })` adds structured fields to every message in the chain.
- **Dev & production** — colorized console with timestamps, level colors, and clickable source lines in development. Structured JSON in production. Switches automatically via `NODE_ENV` — same code, zero config.
- **File writer** — `addWriter()` + `createFileWriter()` for buffered file output with auto-flush.
- **Worker threads** — forward logs from workers to the main thread with full type safety (`loggily/worker`).
- **Drop-in debug replacement** — reads `DEBUG=myapp:*` just like the debug package. Swap your imports in minutes.

## Documentation

- **[The Journey](docs/guide/journey.md)** — progressive guide from first log to full observability
- **[Full docs site](https://beorn.codes/loggily/)** — guides, API reference, migration guides
- [Comparison](docs/guide/comparison.md) — vs Pino, Winston, Bunyan, debug
- [Migration from debug](docs/guide/migration-from-debug.md) — step-by-step migration guide

## Environment Variables

| Variable       | Values                                  | Effect                                  |
| -------------- | --------------------------------------- | --------------------------------------- |
| `LOG_LEVEL`    | trace, debug, info, warn, error, silent | Minimum output level                    |
| `LOG_FORMAT`   | console, json                           | Output format                           |
| `DEBUG`        | `*`, namespace prefixes, `-prefix`      | Namespace filter (like `debug` package) |
| `TRACE`        | `1`, `true`, or namespace prefixes      | Enable span output                      |
| `TRACE_FORMAT` | json                                    | Force JSON for spans                    |
| `NODE_ENV`     | production                              | Auto-enable JSON format                 |

## API

| Function                                                               | Description                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `createLogger(name, props?)`                                           | Create a logger (disabled levels return `undefined` for `?.`) |
| `.trace?.()` / `.debug?.()` / `.info?.()` / `.warn?.()` / `.error?.()` | Log at level (message + optional data)                        |
| `.logger(namespace)`                                                   | Create child logger with extended namespace                   |
| `.span(namespace, props?)`                                             | Create timed span (implements `Disposable`)                   |
| `.child(context)`                                                      | Create child with structured context fields                   |
| `addWriter(fn)` / `createFileWriter(path)`                             | Custom output writers                                         |
| `setLogLevel()` / `setLogFormat()` / `enableSpans()`                   | Runtime configuration                                         |
| `createWorkerLogger()` / `createWorkerLogHandler()`                    | Worker thread support (`loggily/worker`)                      |

See the [full API reference](https://beorn.codes/loggily/api/) for all functions and options.

## License

[MIT](LICENSE)
