---
layout: home

hero:
  name: "loggily"
  text: "Clarity without the clutter"
  tagline: "Debug logging, structured logs, and distributed tracing — integrated into one ~3KB library. Zero dependencies, zero-overhead via optional chaining."
  actions:
    - theme: brand
      text: The Journey
      link: /guide/journey
    - theme: alt
      text: View on GitHub
      link: https://github.com/beorn/loggily

features:
  - title: "Debug Logging"
    details: "Namespace filtering with DEBUG=myapp,-myapp:noisy — same ergonomics as the debug package. Uses native console methods so source lines stay clickable in DevTools."
  - title: "Structured Logs"
    details: "Colorized console with timestamps and clickable source lines in development. Structured JSON in production. Same code, same API — output format switches automatically."
  - title: "Distributed Tracing"
    details: "Built-in spans with automatic timing, parent-child tracking, trace IDs, and traceparent headers. All integrated — no separate SDK to wire up."
  - title: Zero-Overhead via ?.
    details: "Optional chaining skips the entire call — including argument evaluation — when a level is disabled. Typically 10x+ faster for real-world logging with string interpolation and serialization."
  - title: ~3KB, Zero Dependencies
    details: "No external dependencies. Native TypeScript, ESM-only. Runs on Node, Bun, and Deno."
  - title: One Unified Pipeline
    details: "Most projects wire together debug, pino, and OpenTelemetry — three configs, three formats, three APIs. Loggily integrates all three: one namespace tree, one output pipeline, one import instead of three."
---

## Quick Start

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
