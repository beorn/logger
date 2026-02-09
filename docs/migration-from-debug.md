# Migration from debug

Step-by-step guide for migrating from the `debug` package to `@beorn/logger`.

## Why Migrate?

| Feature            | debug               | @beorn/logger                               |
| ------------------ | ------------------- | ------------------------------------------- |
| Log levels         | No (namespace only) | Yes (trace, debug, info, warn, error)       |
| Structured data    | No (printf-style)   | Yes (JSON objects)                          |
| Performance        | Good                | Better (conditional logging skips arg eval) |
| Timing/spans       | No                  | Built-in spans with auto-timing             |
| JSON output        | No                  | Yes (production/TRACE_FORMAT=json)          |
| Zero-cost disabled | No                  | Yes (optional chaining pattern)             |

## Quick Migration

### Before (debug)

```typescript
import createDebug from "debug"

const debug = createDebug("myapp")
const debugDb = createDebug("myapp:db")

debug("starting server on port %d", 3000)
debugDb("query: %s, params: %o", sql, params)
```

### After (@beorn/logger)

```typescript
import { createLogger } from "@beorn/logger"

const log = createLogger("myapp")
const dbLog = log.logger("db")

log.info("starting server", { port: 3000 })
dbLog.debug("query", { sql, params })
```

## Pattern Mapping

### Basic Logging

```typescript
// debug
debug("message")
debug("message %s", value)
debug("message %d items", count)
debug("object: %o", obj)
debug("json: %j", data)

// @beorn/logger
log.debug("message")
log.debug(`message ${value}`)
log.debug("message", { items: count })
log.debug("object", { obj })
log.debug("data", { data })
```

### Namespaces

```typescript
// debug - separate instances
const debug = createDebug("myapp")
const debugDb = createDebug("myapp:db")
const debugCache = createDebug("myapp:cache")

// @beorn/logger - hierarchy via .logger()
const log = createLogger("myapp")
const dbLog = log.logger("db") // myapp:db
const cacheLog = log.logger("cache") // myapp:cache
```

### Environment Variables

| debug            | @beorn/logger       | Effect                     |
| ---------------- | ------------------- | -------------------------- |
| `DEBUG=*`        | `DEBUG=*`           | Enable all debug output    |
| `DEBUG=myapp*`   | `DEBUG=myapp`       | Enable debug for namespace |
| `DEBUG=myapp:db` | `DEBUG=myapp:db`    | Enable specific namespace  |
| `DEBUG=*,-noisy` | `DEBUG=*,-noisy`    | Exclude specific namespace |
| N/A              | `LOG_LEVEL=debug`   | Set log level without namespace filter |
| N/A              | `TRACE=1`           | Enable span timing         |
| N/A              | `TRACE=myapp:db`    | Enable spans for namespace |

### Conditional Enabling

```typescript
// debug - checks if enabled
if (debug.enabled) {
  debug("expensive: %o", computeExpensive())
}

// @beorn/logger - optional chaining (cleaner, faster)
log.debug?.(`expensive: ${computeExpensive()}`)
```

## Common Patterns

### Printf-style to Template Literals

```typescript
// debug (printf-style)
debug("user %s logged in from %s", username, ip)
debug("processed %d items in %dms", count, duration)

// @beorn/logger (template literals or structured)
log.info(`user ${username} logged in from ${ip}`)
// or structured (preferred)
log.info("user logged in", { username, ip })
```

### Objects and JSON

```typescript
// debug
debug("config: %O", config) // multi-line
debug("data: %o", data) // single-line
debug("json: %j", obj) // JSON

// @beorn/logger (always structured JSON)
log.debug("config", { config })
log.debug("data", { data })
log.debug("obj", { obj })
```

### Error Logging

```typescript
// debug
debug("error: %s", err.message)
debug("stack: %s", err.stack)

// @beorn/logger (Error objects handled automatically)
log.error(err) // Extracts message, stack, code
log.error(err, { context: "additional info" })
```

### Timing Operations

```typescript
// debug (manual timing)
const start = Date.now()
await doWork()
debug("operation took %dms", Date.now() - start)

// @beorn/logger (built-in spans)
{
  using span = log.span("operation")
  await doWork()
}
// Automatic: SPAN myapp:operation (234ms)

// With data
{
  using span = log.span("import", { file: "data.csv" })
  span.spanData.rowCount = await importFile()
}
// SPAN myapp:import (1234ms) {rowCount: 500, file: "data.csv"}
```

### Extending/Inheriting

```typescript
// debug - new instance required
const debug = createDebug("myapp")
const debugReq = createDebug("myapp:request")

// @beorn/logger - props inherited
const log = createLogger("myapp", { version: "1.0" })
const reqLog = log.logger("request", { requestId: "abc" })
// reqLog has both version and requestId
```

## Migration Checklist

### 1. Update Dependencies

```bash
# Remove debug
bun remove debug @types/debug

# Add @beorn/logger
bun add @beorn/logger
```

### 2. Update Imports

```typescript
// Before
import createDebug from "debug"

// After
import { createLogger } from "@beorn/logger"
```

### 3. Replace Debug Instances

```typescript
// Before
const debug = createDebug("myapp")

// After
const log = createLogger("myapp")
```

### 4. Update Log Calls

| Pattern     | Before                       | After                      |
| ----------- | ---------------------------- | -------------------------- |
| Simple      | `debug('msg')`               | `log.debug('msg')`         |
| With values | `debug('msg %s', v)`         | `log.debug(\`msg ${v}\`)`  |
| Structured  | `debug('data %o', d)`        | `log.debug('data', { d })` |
| Error       | `debug('err %s', e.message)` | `log.error(e)`             |

### 5. Update Environment

```bash
# Before
DEBUG=myapp* node app.js

# After (DEBUG env var still works)
DEBUG=myapp node app.js
# Or set level globally without namespace filter
LOG_LEVEL=debug node app.js
# Or for spans
TRACE=1 LOG_LEVEL=debug node app.js
```

### 6. Add Log Levels

Debug package has only on/off. Add appropriate levels:

```typescript
// Choose appropriate level based on purpose
log.trace("...") // Very verbose, hot paths
log.debug("...") // Development debugging
log.info("...") // Normal operation
log.warn("...") // Recoverable issues
log.error("...") // Failures
```

### 7. Convert Timing to Spans

```typescript
// Before
const start = Date.now()
await operation()
debug("done in %dms", Date.now() - start)

// After
{
  using span = log.span("operation")
  await operation()
}
```

### 8. Enable Conditional Logging (Optional)

For hot paths, use the conditional logging pattern:

```typescript
// Create conditional logger
const baseLog = createLogger("myapp")
const LEVELS = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, silent: 5 }

export const log = new Proxy(baseLog, {
  get(target, prop: string) {
    if (prop in LEVELS) {
      const current = LEVELS[getLogLevel() as keyof typeof LEVELS]
      if (LEVELS[prop as keyof typeof LEVELS] < current) return undefined
    }
    return (target as any)[prop]
  },
})

// Use optional chaining
log.debug?.(`expensive: ${computeState()}`)
```

## Verification

After migration, verify:

1. **Development output works**: `LOG_LEVEL=debug bun run app`
2. **Production JSON works**: `NODE_ENV=production bun run app`
3. **Spans work**: `TRACE=1 bun run app`
4. **Level filtering works**: `LOG_LEVEL=warn bun run app` (should hide info/debug)

## Gotchas

### Namespace Filtering

@beorn/logger supports `DEBUG=myapp` for namespace filtering (like the `debug` package). It also supports negative patterns: `DEBUG=myapp,-myapp:noisy`. For span-specific namespace filtering, use `TRACE=myapp:db`.

### Printf Format Strings

debug uses printf-style `%s`, `%d`, `%o`. @beorn/logger uses template literals or structured data. Search for `%s`, `%d`, `%o`, `%j`, `%O` to find calls that need conversion.

### No Automatic Coloring by Namespace

debug auto-assigns colors to namespaces. @beorn/logger uses level-based colors. If you need namespace distinction, include it in the log output or use the `name` property.

### enabled Property

debug has `.enabled` property. @beorn/logger uses level comparison:

```typescript
// debug
if (debug.enabled) { ... }

// @beorn/logger
import { getLogLevel } from '@beorn/logger'
const LEVELS = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, silent: 5 }
if (LEVELS.debug >= LEVELS[getLogLevel()]) { ... }

// Or use conditional logger with optional chaining (preferred)
log.debug?.('msg')
```
