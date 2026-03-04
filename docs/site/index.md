---
layout: home

hero:
  name: "@beorn/logger"
  text: "Structured logging with spans"
  tagline: "~3KB, one dependency, zero-overhead disabled logging via optional chaining. Built-in spans with automatic timing."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/beorn/logger

features:
  - title: Zero-Overhead Disabled Logging
    details: "Optional chaining skips argument evaluation entirely when a level is disabled -- 22x faster than noop functions for expensive arguments."
  - title: Built-in Spans
    details: "Time any operation with the using keyword. Automatic duration tracking, parent-child relationships, and trace IDs. No separate tracing library."
  - title: ~3KB, One Dependency
    details: "Just picocolors for terminal colors. Native TypeScript, ESM-only. Runs on Node, Bun, and Deno."
  - title: Dual Output Format
    details: "Pretty console output in development, structured JSON in production. Automatic switching via NODE_ENV or LOG_FORMAT."
  - title: Namespace Filtering
    details: "DEBUG=myapp,-myapp:noisy works just like the debug package. TRACE=myapp:db filters span output per namespace."
  - title: Worker Thread Support
    details: "Forward structured logs and span events from worker threads to the main thread with full type safety."
---

## Quick Start

```bash
bun add @beorn/logger
```

```typescript
import { createLogger } from "@beorn/logger"

const log = createLogger("myapp")

log.info?.("server started", { port: 3000 })

// Spans time operations automatically
{
  using span = log.span("db:query", { table: "users" })
  const users = await db.query("SELECT * FROM users")
  span.spanData.count = users.length
}
// SPAN myapp:db:query (45ms) {count: 100, table: "users"}
```
