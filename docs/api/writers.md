# Writers

## addWriter

```typescript
function addWriter(writer: (formatted: string, level: string) => void): () => void
```

Subscribe to all formatted log output. Returns an unsubscribe function.

```typescript
const lines: string[] = []
const unsub = addWriter((formatted, level) => {
  lines.push(formatted)
})

// Later:
unsub()
```

Writers receive output regardless of `setOutputMode()` or `setSuppressConsole()` settings.

## createFileWriter

```typescript
function createFileWriter(path: string, options?: FileWriterOptions): FileWriter
```

Create a buffered file writer that flushes automatically.

### Options

| Option          | Type     | Default | Description                            |
| --------------- | -------- | ------- | -------------------------------------- |
| `bufferSize`    | `number` | 4096    | Flush when buffer exceeds this (bytes) |
| `flushInterval` | `number` | 100     | Flush every N milliseconds             |

### FileWriter Methods

| Method        | Description                           |
| ------------- | ------------------------------------- |
| `write(line)` | Append line to buffer (adds `\n`)     |
| `flush()`     | Write buffer to disk immediately      |
| `close()`     | Flush remaining buffer and close file |

### Example

```typescript
import { createFileWriter, addWriter } from "loggily"

const writer = createFileWriter("/tmp/app.log", {
  bufferSize: 8192,
  flushInterval: 200,
})

const unsub = addWriter((formatted) => writer.write(formatted))

// On shutdown:
unsub()
writer.close()
```

### Safety

- The flush interval timer is `unref()`'d so it won't keep the process alive
- A `process.on("exit")` handler flushes remaining buffer on shutdown
- `close()` removes the exit handler and clears the interval
- Multiple `close()` calls are safe (idempotent)
- `write()` after `close()` is silently ignored
