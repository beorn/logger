# Configuration

## Log Level

```typescript
setLogLevel(level: LogLevel): void
getLogLevel(): LogLevel
```

Default: `"info"`. Override with `LOG_LEVEL` env var.

```typescript
setLogLevel("debug") // debug, info, warn, error
setLogLevel("error") // error only
setLogLevel("silent") // nothing
```

## Log Format

```typescript
setLogFormat(format: LogFormat): void
getLogFormat(): LogFormat
```

Default: `"console"`. Override with `LOG_FORMAT` env var. Also auto-enabled by `NODE_ENV=production`.

```typescript
setLogFormat("json") // {"time":"...","level":"info","name":"myapp","msg":"..."}
setLogFormat("console") // 14:32:15 INFO myapp message
```

## Span Control

```typescript
enableSpans(): void
disableSpans(): void
spansAreEnabled(): boolean
```

## Trace Filter

```typescript
setTraceFilter(namespaces: string[] | null): void
getTraceFilter(): string[] | null
```

Only emit spans matching these namespace prefixes.

```typescript
setTraceFilter(["myapp:db"]) // Only db spans
setTraceFilter(null) // All spans
```

## Debug Filter

```typescript
setDebugFilter(namespaces: string[] | null): void
getDebugFilter(): string[] | null
```

Filter log output by namespace. Supports negative patterns.

```typescript
setDebugFilter(["myapp"]) // Only myapp and children
setDebugFilter(["myapp", "-myapp:sql"]) // Exclude sql
setDebugFilter(null) // All namespaces
```

Auto-lowers log level to `debug` when set.

## Output Mode

```typescript
setOutputMode(mode: OutputMode): void
getOutputMode(): OutputMode
setSuppressConsole(value: boolean): void
```

| Mode             | Console | Writers |
| ---------------- | ------- | ------- |
| `"console"`      | Yes     | Yes     |
| `"stderr"`       | stderr  | Yes     |
| `"writers-only"` | No      | Yes     |

## Environment Variables

| Variable       | Values                                  | Default   |
| -------------- | --------------------------------------- | --------- |
| `LOG_LEVEL`    | trace, debug, info, warn, error, silent | `info`    |
| `LOG_FORMAT`   | console, json                           | `console` |
| `DEBUG`        | `*`, namespace prefixes, `-prefix`      | (none)    |
| `TRACE`        | `1`, `true`, namespace prefixes         | (none)    |
| `TRACE_FORMAT` | json                                    | (none)    |
| `NODE_ENV`     | production                              | (none)    |
