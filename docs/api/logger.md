# Logger

## createLogger

```typescript
function createLogger(name: string, props?: Record<string, unknown>): ConditionalLogger
```

Create a conditional logger. Disabled log levels return `undefined` -- use `?.` for zero-overhead.

```typescript
const log = createLogger("myapp", { version: "2.1" })
log.info?.("started")
```

## Logger Methods

### Logging

All accept `LazyMessage` (string or `() => string`) and optional data:

```typescript
log.trace?.("verbose", { detail: "..." })
log.debug?.("debugging", { state: "..." })
log.info?.("normal operation")
log.warn?.("recoverable issue")
log.error?.(new Error("failed"))
log.error?.("manual error", { code: "ETIMEOUT" })
```

### Child Creation

```typescript
// Extend namespace, inherit props
const db = log.logger("db", { pool: "primary" })
// namespace: "myapp:db", props: { version: "2.1", pool: "primary" }

// Add context to every message (same namespace)
const req = log.child({ requestId: "abc" })

// Create timed span
{
  using span = log.span("import")
  span.spanData.count = 42
}
```

### Manual Span End

```typescript
const span = log.span("op")
try {
  /* ... */
} finally {
  span.end()
}
```

## ConditionalLogger

The return type of `createLogger()`. Log methods are possibly `undefined`:

```typescript
interface ConditionalLogger {
  readonly name: string
  readonly props: Readonly<Record<string, unknown>>
  trace?: (msg: LazyMessage, data?: Record<string, unknown>) => void
  debug?: (msg: LazyMessage, data?: Record<string, unknown>) => void
  info?: (msg: LazyMessage, data?: Record<string, unknown>) => void
  warn?: (msg: LazyMessage, data?: Record<string, unknown>) => void
  error?: (msg: LazyMessage | Error, data?: Record<string, unknown>) => void
  logger(ns?: string, props?: Record<string, unknown>): Logger
  span(ns?: string, props?: Record<string, unknown>): SpanLogger
  child(context: Record<string, unknown>): Logger
  end(): void
}
```

## SpanLogger

Logger + timing + Disposable:

```typescript
interface SpanLogger extends Logger, Disposable {
  readonly spanData: SpanData & { [key: string]: unknown }
}
```

### SpanData

| Property    | Type             | Writable | Description                 |
| ----------- | ---------------- | -------- | --------------------------- |
| `id`        | `string`         | No       | `sp_1`, `sp_2`, ...         |
| `traceId`   | `string`         | No       | Shared across nested spans  |
| `parentId`  | `string \| null` | No       | Parent span ID              |
| `startTime` | `number`         | No       | Start timestamp             |
| `endTime`   | `number \| null` | No       | End timestamp               |
| `duration`  | `number`         | No       | Live computed duration      |
| `[custom]`  | `unknown`        | **Yes**  | `span.spanData.key = value` |
