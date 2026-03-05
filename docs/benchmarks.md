# Benchmarks

Comparison of @beorn/logger against pino, winston, and debug.

**Test environment**: Bun 1.3.9, macOS arm64 (Apple Silicon), 10M iterations per test.

## Disabled Debug — Cheap Argument

When debug logging is disabled and arguments are cheap (string literals):

| Library           | ops/s | ns/op | Relative |
| ----------------- | ----: | ----: | -------: |
| noop (baseline)   |    3B |   0.4 |     1.0x |
| pino              |    2B |   0.5 |     1.3x |
| **@beorn/logger** |  397M |   2.5 |     6.3x |
| debug             |   43M |  23.4 |      59x |
| winston           |    3M | 371.9 |     930x |

Pino wins here — its level check is a simple integer comparison without Proxy overhead. @beorn/logger's Proxy-based `?.` pattern adds ~2ns overhead for cheap args.

## Disabled Debug — Expensive Argument (the real story)

When debug logging is disabled but arguments require evaluation (JSON.stringify):

| Library           |    ops/s |   ns/op | Relative |
| ----------------- | -------: | ------: | -------: |
| noop (baseline)   |     421M |     2.4 |     1.0x |
| **@beorn/logger** | **280M** | **3.6** | **1.5x** |
| pino              |       8M |   129.1 |      54x |
| debug             |       7M |   147.4 |      61x |
| winston           |       1M |   741.3 |     309x |

**@beorn/logger is 35x faster than pino** for disabled calls with expensive arguments. The `?.` pattern skips argument evaluation entirely — `log.debug?.(\`state: ${expensiveArg()}\`)`never calls`expensiveArg()` when debug is disabled.

This is the key insight: real-world logging often involves string interpolation, `JSON.stringify`, or computed values. The `?.` pattern eliminates this cost entirely.

## Enabled Info — Cheap Argument

When info logging is enabled and output is consumed:

| Library           | ops/s | ns/op |
| ----------------- | ----: | ----: |
| pino              |  210M |   4.8 |
| **@beorn/logger** |    3M | 362.5 |
| winston           |    3M | 356.4 |

Pino is significantly faster for enabled output due to its optimized serialization pipeline. @beorn/logger's enabled performance is comparable to winston. Future optimization opportunity.

## Span Creation

Span create + dispose (no output):

| Library           | ops/s | ns/op |
| ----------------- | ----: | ----: |
| **@beorn/logger** |    2M | 479.3 |

~480ns per span lifecycle including ID generation, timing, and disposal. No competitor offers built-in span support for comparison.

## Key Takeaways

1. **Disabled + expensive args**: @beorn/logger's `?.` pattern is 35x faster than pino, 206x faster than winston. This is the main differentiator.
2. **Disabled + cheap args**: Pino is faster due to no Proxy overhead. Both are sub-microsecond.
3. **Enabled calls**: Pino has best-in-class enabled throughput. @beorn/logger matches winston.
4. **The `?.` advantage grows with argument cost**: The more expensive your log arguments, the bigger the win.

## Reproducing

```bash
# Install benchmark dependencies
bun add -d pino winston debug @types/debug

# Run benchmarks
bun vendor/beorn-logger/benchmarks/overhead.ts
```
