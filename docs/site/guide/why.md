# Why @beorn/logger?

## The Problem

Most loggers waste work when logging is disabled. Even when `debug` level is off:

```typescript
// Pino, Winston, Bunyan
log.debug(`state: ${JSON.stringify(computeExpensiveState())}`)
```

`computeExpensiveState()` runs, `JSON.stringify()` runs, the string is concatenated -- all discarded because debug is off. In hot code paths (rendering loops, per-node operations), this adds up.

## The Solution

@beorn/logger uses optional chaining to skip argument evaluation entirely:

```typescript
log.debug?.(`state: ${JSON.stringify(computeExpensiveState())}`)
```

When `debug` is disabled, `log.debug` is `undefined`. JavaScript's `?.` operator short-circuits: `computeExpensiveState()` never runs, `JSON.stringify()` never runs, the string is never built.

## Benchmarks

10M iterations, Bun 1.1.x, M1 Mac:

| Scenario                         | ops/s    | ns/op   |
| -------------------------------- | -------- | ------- |
| Traditional noop (cheap args)    | 2168M    | 0.5     |
| Optional chaining (cheap args)   | 1406M    | 0.7     |
| Traditional noop (expensive args)| 17M      | 57.6    |
| **Optional chaining (expensive args)** | **408M** | **2.5** |

For cheap arguments the overhead is ~0.2ns -- negligible. For expensive arguments, **22x faster**.

## Compared to Others

| Feature              | @beorn/logger | Pino  | Winston | debug |
| -------------------- | ------------- | ----- | ------- | ----- |
| Zero-cost disabled   | `?.` (22x)    | noop  | noop    | check |
| Built-in spans       | Yes           | No    | No      | No    |
| Bundle size          | ~3KB          | ~17KB | ~200KB+ | ~2KB  |
| TypeScript native    | Yes           | Types | Types   | Types |
| Worker threads       | Yes           | No    | No      | No    |

See [Comparison](https://github.com/beorn/logger/blob/main/docs/comparison.md) for detailed analysis of each.

## Design Principles

1. **Logger = Span**: Every logger can become a span. No separate tracing library needed.
2. **Zero cost**: Disabled levels skip everything, including argument evaluation.
3. **Minimal surface**: Few functions, each does one thing well.
4. **Type enforced**: TypeScript makes `?.` mandatory -- you can't accidentally call a disabled level.
5. **Structured**: JSON in production, readable console in development.
