# Migration from debug

See the [full migration guide](https://github.com/beorn/logger/blob/main/docs/migration-from-debug.md) for step-by-step instructions.

## Quick Overview

```typescript
// Before (debug)
import createDebug from "debug"
const debug = createDebug("myapp")
debug("user %s logged in from %s", username, ip)

// After (@beorn/logger)
import { createLogger } from "@beorn/logger"
const log = createLogger("myapp")
log.info?.("user logged in", { username, ip })
```

The `DEBUG` environment variable works the same way:

```bash
DEBUG=myapp bun run app
DEBUG='myapp,-myapp:noisy' bun run app
```
