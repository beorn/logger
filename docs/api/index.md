# API Reference

## Exports from `loggily`

### Core

| Export                                                   | Description                              |
| -------------------------------------------------------- | ---------------------------------------- |
| `createLogger(name, props?)`                             | Create a conditional logger              |
| `setLogLevel(level)` / `getLogLevel()`                   | Log level control                        |
| `setLogFormat(format)` / `getLogFormat()`                | Output format (`"console"` or `"json"`)  |
| `enableSpans()` / `disableSpans()` / `spansAreEnabled()` | Span output control                      |
| `setTraceFilter(ns)` / `getTraceFilter()`                | Namespace-based span filtering           |
| `setDebugFilter(ns)` / `getDebugFilter()`                | Namespace-based log filtering            |
| `setOutputMode(mode)` / `getOutputMode()`                | Output destination                       |
| `setSuppressConsole(bool)`                               | Suppress console (writers still receive) |

### Writers

| Export                          | Description                       |
| ------------------------------- | --------------------------------- |
| `addWriter(fn)`                 | Subscribe to all formatted output |
| `createFileWriter(path, opts?)` | Buffered file writer              |

### Testing

| Export                                          | Description                    |
| ----------------------------------------------- | ------------------------------ |
| `startCollecting()` / `stopCollecting()`        | Collect span data for analysis |
| `getCollectedSpans()` / `clearCollectedSpans()` | Access collected spans         |
| `resetIds()`                                    | Reset span/trace ID counters   |

### Types

| Export              | Description                               |
| ------------------- | ----------------------------------------- |
| `Logger`            | Full logger interface                     |
| `SpanLogger`        | Logger + Disposable + SpanData            |
| `ConditionalLogger` | Logger with optional methods              |
| `SpanData`          | Span timing and attributes                |
| `LogLevel`          | `"trace" \| "debug" \| ... \| "silent"`   |
| `LogFormat`         | `"console" \| "json"`                     |
| `LazyMessage`       | `string \| (() => string)`                |
| `OutputMode`        | `"console" \| "stderr" \| "writers-only"` |
| `FileWriter`        | `{ write, flush, close }`                 |

## Exports from `loggily/worker`

| Export                                        | Description                       |
| --------------------------------------------- | --------------------------------- |
| `createWorkerLogger(postMessage, ns, props?)` | Logger for worker threads         |
| `createWorkerLogHandler(opts?)`               | Main thread handler               |
| `createWorkerConsoleHandler(opts?)`           | Console message handler           |
| `forwardConsole(postMessage, ns?)`            | Forward console.\* from worker    |
| `restoreConsole()`                            | Restore original console methods  |
| `isWorkerMessage(msg)`                        | Type guard for any worker message |
| `isWorkerConsoleMessage(msg)`                 | Type guard for console messages   |
| `isWorkerLogMessage(msg)`                     | Type guard for log messages       |
| `isWorkerSpanMessage(msg)`                    | Type guard for span messages      |
