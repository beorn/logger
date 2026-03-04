# Worker Thread Support

@beorn/logger provides typed message protocols for forwarding logs from worker threads to the main thread.

## Full Logger Forwarding

### Worker Side

```typescript
import { createWorkerLogger } from "@beorn/logger/worker"

const log = createWorkerLogger(postMessage, "myapp:worker")

log.info?.("processing", { file: "data.csv" })

{
  using span = log.span("parse")
  span.info?.("parsing rows")
  span.spanData.lines = 100
}
// Span events forwarded to main thread automatically
```

### Main Thread Side

```typescript
import { createWorkerLogHandler, isWorkerMessage } from "@beorn/logger/worker"

const handle = createWorkerLogHandler()

worker.onmessage = (e) => {
  if (isWorkerMessage(e.data)) {
    handle(e.data)
  } else {
    // Handle other message types
  }
}
```

## Console Forwarding

For simpler cases, forward `console.*` calls:

### Worker Side

```typescript
import { forwardConsole } from "@beorn/logger/worker"

forwardConsole(postMessage, "myapp:worker")

// All console.* calls are now forwarded
console.log("processing", { file: "data.csv" })
console.error(new Error("failed"))
```

### Main Thread Side

```typescript
import { createWorkerConsoleHandler } from "@beorn/logger/worker"

const handle = createWorkerConsoleHandler({
  defaultNamespace: "myapp:worker",
})

worker.onmessage = (e) => {
  if (e.data.type === "console") {
    handle(e.data)
  }
}
```

## Message Types

All messages are fully typed. Use the type guards to safely handle them:

```typescript
import {
  isWorkerConsoleMessage,
  isWorkerLogMessage,
  isWorkerSpanMessage,
  isWorkerMessage,
  type WorkerMessage,
} from "@beorn/logger/worker"
```

| Type Guard               | Message Type             |
| ------------------------ | ------------------------ |
| `isWorkerConsoleMessage` | `console.*` forwarding   |
| `isWorkerLogMessage`     | Structured log messages  |
| `isWorkerSpanMessage`    | Span start/end events    |
| `isWorkerMessage`        | Any of the above         |

## Serialization

Arguments are automatically serialized for `postMessage`:

- Functions become `"[Function: name]"`
- Symbols become their `toString()` representation
- BigInts become `"123n"` strings
- Circular references become `"[Circular]"`
- Errors become `{ name, message, stack }` objects
- Depth is capped at 5 levels

## Restoring Console

If you need to disable console forwarding:

```typescript
import { restoreConsole } from "@beorn/logger/worker"

// Later:
restoreConsole() // Original console methods restored
```
