# @beorn/logger

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Structured logging with spans. Logger-first architecture: Span = Logger + Duration.

## Installation

```bash
bun add @beorn/logger
```

## Quickstart

```typescript
import { createLogger } from "@beorn/logger"

const log = createLogger("myapp")

log.info("starting")
log.error(new Error("failed"))

// Spans for timing (implements Disposable)
{
  using span = log.span("import", { file: "data.csv" })
  span.info("working...")
  span.spanData.count = 42
}
// Output: SPAN myapp:import (15ms) {count: 42, file: "data.csv"}
```

## Features

- **Namespace hierarchy** - Organize logs with `:` separators (`myapp:db:query`)
- **Spans for timing** - TC39 `using` keyword with automatic duration tracking
- **Conditional logging** - Optional chaining skips argument evaluation when disabled
- **Environment control** - Configure via `LOG_LEVEL`, `TRACE`, `TRACE_FORMAT`
- **Dual output** - Pretty console in dev, JSON in production

## Zero-Overhead Logging

`createLogger` returns `undefined` for disabled levels. Use optional chaining to skip expensive argument evaluation:

```typescript
import { createLogger } from "@beorn/logger"

const log = createLogger("myapp")

// Info/warn/error always enabled at default level
log.info("starting")

// Debug/trace use optional chaining - args NOT evaluated when disabled
log.debug?.(`expensive: ${computeExpensiveState()}`)
```

### Benchmark Results

| Scenario                  | ops/s    | ns/op   | Notes                               |
| ------------------------- | -------- | ------- | ----------------------------------- |
| noop (cheap args)         | 2168M    | 0.5     | Fastest for trivial args            |
| `?.` (cheap args)         | 1406M    | 0.7     | ~0.2ns overhead - negligible        |
| noop (expensive args)     | 17M      | 57.6    | Args still evaluated                |
| **`?.` (expensive args)** | **408M** | **2.5** | Args NOT evaluated - **22x faster** |

## Environment Variables

| Variable       | Values                                  | Effect                  |
| -------------- | --------------------------------------- | ----------------------- |
| `LOG_LEVEL`    | trace, debug, info, warn, error, silent | Filter output by level  |
| `TRACE`        | 1, true, or namespace prefixes          | Enable span output      |
| `TRACE_FORMAT` | json                                    | Force JSON output       |
| `NODE_ENV`     | production                              | Auto-enable JSON format |

```bash
LOG_LEVEL=debug bun run app         # Enable debug logging
TRACE=1 bun run app                 # Enable all span timing output
TRACE=myapp:import bun run app      # Enable spans for specific namespace
```

## Documentation

See [docs/](docs/) for detailed API documentation and research notes.

## License

MIT
