# Benchmarks

Comparison of @beorn/logger against pino, winston, and debug.

**Test environment**: Bun 1.3.9, macOS arm64 (Apple Silicon), 10M iterations per test.

**Methodology**: All "enabled" benchmarks write to in-process noop sinks (no I/O syscalls) for a fair apples-to-apples comparison of formatting and serialization throughput:

- beorn: `addWriter(noop)` + `setSuppressConsole(true)` + `setOutputMode("writers-only")`
- pino: `pino(opts, noopWritableStream)`
- winston: `Stream` transport with noop `Writable`

## Disabled Debug — Cheap Argument

When debug logging is disabled and arguments are cheap (string literals):

| Library           | ops/s | ns/op | Relative |
| ----------------- | ----: | ----: | -------: |
| noop (baseline)   |    3B |   0.4 |     1.0x |
| pino              |    2B |   0.5 |     1.3x |
| **@beorn/logger** |  383M |   2.6 |     6.5x |
| debug             |   43M |  23.4 |      59x |
| winston           |    3M | 391.2 |     978x |

Pino wins here — its level check is a simple integer comparison without Proxy overhead. @beorn/logger's Proxy-based `?.` pattern adds ~2ns overhead for cheap args.

## Disabled Debug — Expensive Argument (the real story)

When debug logging is disabled but arguments require evaluation (JSON.stringify):

| Library           |    ops/s |   ns/op | Relative |
| ----------------- | -------: | ------: | -------: |
| noop (baseline)   |     414M |     2.4 |     1.0x |
| **@beorn/logger** | **248M** | **4.0** | **1.7x** |
| pino              |       8M |   133.1 |      55x |
| debug             |       7M |   153.3 |      64x |
| winston           |       1M |   774.6 |     323x |

**@beorn/logger is 31x faster than pino** for disabled calls with expensive arguments. The `?.` pattern skips argument evaluation entirely — `log.debug?.(\`state: ${expensiveArg()}\`)`never calls`expensiveArg()` when debug is disabled.

This is the key insight: real-world logging often involves string interpolation, `JSON.stringify`, or computed values. The `?.` pattern eliminates this cost entirely.

## Enabled Info — Cheap Argument

When info logging is enabled, all loggers writing to noop sinks (fair comparison):

| Library           | ops/s | ns/op | Relative |
| ----------------- | ----: | ----: | -------: |
| **@beorn/logger** |    3M | 371.4 |     1.0x |
| pino              |    2M | 471.7 |     1.3x |
| winston           |    1M | 748.3 |     2.0x |

With a fair noop-sink comparison, @beorn/logger is the fastest for enabled string logging -- ~1.3x faster than pino and ~2x faster than winston.

## Enabled Info — Structured Data

Logging with structured data (`{ key: "value", count: 42 }`), all to noop sinks:

| Library           | ops/s |   ns/op | Relative |
| ----------------- | ----: | ------: | -------: |
| **@beorn/logger** |    1M |   668.9 |     1.0x |
| pino              |    1M |   738.2 |     1.1x |
| winston           |  587K | 1,703.6 |     2.5x |

Beorn and pino are neck-and-neck for structured data. Both are roughly 2.5x faster than winston.

## Enabled Warn — Error Object

Logging with an Error object, all to noop sinks:

| Library           | ops/s | ns/op | Relative |
| ----------------- | ----: | ----: | -------: |
| **@beorn/logger** |    1M | 990.9 |     1.0x |
| winston           |  839K |   1.2 |     1.2x |
| pino              |  541K |   1.8 |     1.9x |

Beorn handles Error objects fastest, nearly 2x faster than pino. Pino's Error serialization is heavier due to its structured JSON pipeline.

## Span Creation

Span create + dispose (no output):

| Library           | ops/s | ns/op |
| ----------------- | ----: | ----: |
| **@beorn/logger** |    2M | 544.1 |

~544ns per span lifecycle including ID generation, timing, and disposal. No competitor offers built-in span support for comparison.

## Key Takeaways

1. **Disabled + expensive args**: @beorn/logger's `?.` pattern is 31x faster than pino, 194x faster than winston. This is the main differentiator.
2. **Disabled + cheap args**: Pino is faster due to no Proxy overhead. Both are sub-microsecond.
3. **Enabled + cheap args**: @beorn/logger is ~1.3x faster than pino when both write to the same kind of noop sink.
4. **Enabled + structured data**: @beorn/logger and pino are comparable; both are ~2x faster than winston.
5. **Enabled + Error objects**: @beorn/logger is fastest, ~1.9x faster than pino.
6. **The `?.` advantage grows with argument cost**: The more expensive your log arguments, the bigger the win.

## Reproducing

```bash
# Install benchmark dependencies
bun add -d pino winston debug @types/debug

# Run benchmarks
bun vendor/beorn-logger/benchmarks/overhead.ts
```
