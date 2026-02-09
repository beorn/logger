# @beorn/logger

Structured logging with spans. Logger-first architecture: Span = Logger + Duration.

## Quick Start

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
// → SPAN myapp:import (15ms) {count: 42, file: "data.csv"}
```

## Environment Variables

| Variable     | Values                                  | Effect                           |
| ------------ | --------------------------------------- | -------------------------------- |
| LOG_LEVEL    | trace, debug, info, warn, error, silent | Filter output by level           |
| DEBUG        | *, namespace prefixes, -prefix          | Filter output by namespace       |
| TRACE        | 1, true, or namespace prefixes          | Enable span output               |
| TRACE_FORMAT | json                                    | Force JSON output                |
| NODE_ENV     | production                              | Auto-enable JSON format          |

### Examples

```bash
LOG_LEVEL=debug bun run app         # Enable debug logging
DEBUG=km:storage bun run app        # Only show km:storage (+ children), auto-enables debug level
DEBUG='km:*,-km:sql' bun run app    # Show all km namespaces except km:sql
DEBUG='*' bun run app               # Show all namespaces at debug level
TRACE=1 bun run app                 # Enable all span timing output
TRACE=myapp:import bun run app      # Enable spans for specific namespace
TRACE=myapp,other bun run app       # Enable spans for multiple prefixes
```

## API

### createLogger(name, props?)

Create a logger. Props are inherited by children.

```typescript
const log = createLogger("myapp", { version: "1.0" })
```

### Logger Methods

| Method                        | Purpose            |
| ----------------------------- | ------------------ |
| `.trace(msg, data?)`          | Verbose debugging  |
| `.debug(msg, data?)`          | Debug information  |
| `.info(msg, data?)`           | Normal operation   |
| `.warn(msg, data?)`           | Recoverable issues |
| `.error(msg \| Error, data?)` | Failures           |

### Child Loggers

```typescript
// Extend namespace, inherit props
const child = log.logger("import", { file: "data.csv" })
// → namespace: "myapp:import", props: { version: "1.0", file: "data.csv" }

// Create span (child with timing)
{
  using span = log.span("import")
  span.info("working...")
}
```

### Spans

Spans are loggers with timing. They implement `Disposable` for use with `using`:

```typescript
{
  using span = log.span("operation", { context: "value" })
  span.debug("step 1")
  span.spanData.processed = 100 // Set custom attributes
}
// On block exit: SPAN myapp:operation (15ms) {processed: 100, context: "value"}
```

For environments without `using` support, call `.end()` manually:

```typescript
const span = log.span("operation")
try {
  span.info("working...")
  span.spanData.count = 42
} finally {
  span.end()
}
```

### Span Data

| Property             | Type                      | Description                           |
| -------------------- | ------------------------- | ------------------------------------- |
| `spanData.id`        | string (readonly)         | Unique span ID (sp_1, sp_2...)        |
| `spanData.traceId`   | string (readonly)         | Trace ID (shared across nested spans) |
| `spanData.parentId`  | string \| null (readonly) | Parent span ID                        |
| `spanData.startTime` | number (readonly)         | Start timestamp (ms)                  |
| `spanData.duration`  | number (readonly)         | Live duration since start             |
| `spanData.custom`    | any (writable)            | Set custom attributes                 |

### Configuration Functions

```typescript
import {
  setLogLevel,
  getLogLevel,
  enableSpans,
  disableSpans,
  spansAreEnabled,
  setTraceFilter,
  getTraceFilter,
  setDebugFilter,
  getDebugFilter,
} from "@beorn/logger"

setLogLevel("debug") // Set minimum level
getLogLevel() // Get current level: "debug"
enableSpans() // Enable span output
disableSpans() // Disable span output
spansAreEnabled() // Check if spans are enabled
setTraceFilter(["myapp"]) // Only output spans for "myapp" and "myapp:*"
setTraceFilter(null) // Clear filter, output all spans
getTraceFilter() // Get current filter: ["myapp"] or null
setDebugFilter(["myapp"]) // Only show output for "myapp" and "myapp:*"
setDebugFilter(["myapp", "-myapp:sql"]) // Show myapp but exclude myapp:sql
setDebugFilter(null) // Clear filter, show all namespaces
getDebugFilter() // Get current filter: ["myapp", "-myapp:sql"] or null
```

## Output Format

### Console (development)

```
14:32:15 INFO myapp starting
14:32:15 DEBUG myapp:import loading {file: "data.csv"}
14:32:16 SPAN myapp:import (1234ms) {count: 42}
```

### JSON (production / TRACE_FORMAT=json)

```json
{"time":"2024-01-15T14:32:15.123Z","level":"info","name":"myapp","msg":"starting"}
{"time":"2024-01-15T14:32:16.456Z","level":"span","name":"myapp:import","msg":"(1234ms)","duration":1234,"count":42}
```

## Zero-Overhead Pattern (Optional Chaining)

`createLogger` returns `undefined` for disabled log levels, enabling zero-overhead logging.

**Log levels** (most → least verbose): `trace < debug < info < warn < error < silent`
**Default level**: `warn` for km CLI (trace, debug, and info disabled)

```typescript
import { createLogger } from "@beorn/logger"

const log = createLogger("km:tui")

// All methods support ?. for zero-overhead when their level is disabled
log.trace?.(`very verbose: ${expensiveDebug()}`) // Skipped at default (warn)
log.debug?.(`state: ${getState()}`) // Skipped at default (warn)
log.info?.("starting") // Skipped at default (warn)
log.warn?.("deprecated") // Enabled at default (warn)
log.error?.("failed") // Enabled at default

// With -v flag or LOG_LEVEL=info, info is enabled:
log.info?.("starting") // Enabled when level=info
```

### Why optional chaining?

**Benchmark results** (10M iterations, Bun 1.1.x):

| Scenario                  | ops/s    | ns/op   | Notes                               |
| ------------------------- | -------- | ------- | ----------------------------------- |
| noop (cheap args)         | 2168M    | 0.5     | Fastest for trivial args            |
| `?.` (cheap args)         | 1406M    | 0.7     | ~0.2ns overhead - negligible        |
| noop (expensive args)     | 17M      | 57.6    | Args still evaluated - wasted!      |
| **`?.` (expensive args)** | **408M** | **2.5** | Args NOT evaluated - **22x faster** |

**Key insight**: Optional chaining is only ~0.2ns slower for cheap args, but **22x faster** for expensive args because it skips argument evaluation entirely.

- `log.debug?.()` skips the entire call including argument evaluation when debug is disabled
- TypeScript enforces `?.` at compile time (methods are typed as possibly undefined)
- Main benefit: expensive string formatting and function calls are completely skipped

See [docs/conditional-logging-research.md](docs/conditional-logging-research.md) for detailed research and external references.

## Best Practices

1. **Namespace hierarchy**: Use `:` to create hierarchy (`myapp:db:query`)
2. **Props for context**: Pass structured data, not string interpolation
3. **Spans for timing**: Wrap operations you want to measure
4. **Level filtering**: Use `LOG_LEVEL` to control verbosity
5. **Conditional logging**: Use `?.` pattern in hot paths to skip arg evaluation
