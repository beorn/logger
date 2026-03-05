/**
 * @beorn/logger Benchmark Suite
 *
 * Compares zero-overhead disabled logging and enabled logging performance
 * against popular alternatives: pino, winston, debug, consola, loglevel.
 *
 * Run: bun benchmarks/overhead.ts
 */

import { createLogger, setLogLevel, setOutputMode, setSuppressConsole, disableSpans } from "../src/index.ts"

// ── Helpers ──────────────────────────────────────────────────────────────────

function measure(
  name: string,
  fn: () => void,
  iterations: number,
): { name: string; opsPerSec: number; nsPerOp: number } {
  // Warmup
  for (let i = 0; i < 1000; i++) fn()

  const start = Bun.nanoseconds()
  for (let i = 0; i < iterations; i++) fn()
  const elapsed = Bun.nanoseconds() - start

  const nsPerOp = elapsed / iterations
  const opsPerSec = 1e9 / nsPerOp

  return { name, opsPerSec, nsPerOp }
}

function formatOps(ops: number): string {
  if (ops >= 1e9) return `${(ops / 1e9).toFixed(0)}B`
  if (ops >= 1e6) return `${(ops / 1e6).toFixed(0)}M`
  if (ops >= 1e3) return `${(ops / 1e3).toFixed(0)}K`
  return `${ops.toFixed(0)}`
}

function formatNs(ns: number): string {
  if (ns >= 1e6) return `${(ns / 1e6).toFixed(1)}ms`
  if (ns >= 1e3) return `${(ns / 1e3).toFixed(1)}µs`
  return `${ns.toFixed(1)}ns`
}

function printResults(title: string, results: Array<{ name: string; opsPerSec: number; nsPerOp: number }>) {
  console.log(`\n${title}`)
  console.log("─".repeat(70))

  const maxNameLen = Math.max(...results.map((r) => r.name.length))

  for (const r of results) {
    const name = r.name.padEnd(maxNameLen)
    const ops = formatOps(r.opsPerSec).padStart(6)
    const ns = formatNs(r.nsPerOp).padStart(8)
    console.log(`  ${name}  ${ops} ops/s  ${ns}/op`)
  }
}

// ── Expensive argument simulation ────────────────────────────────────────────

function expensiveArg(): string {
  return JSON.stringify({ a: 1, b: 2, c: [3, 4, 5], d: { e: "hello", f: true } })
}

// ── @beorn/logger setup ──────────────────────────────────────────────────────

const beornLog = createLogger("bench")
// Suppress all output for benchmarking
setSuppressConsole(true)
setOutputMode("writers-only")
disableSpans()

// ── Pino setup ───────────────────────────────────────────────────────────────

let pinoLog: { debug: (msg: string) => void; info: (msg: string) => void; warn: (msg: string) => void }
try {
  const pino = (await import("pino")).default
  pinoLog = pino({
    level: "warn", // debug disabled
    transport: undefined, // no transport overhead
    // Write to devnull equivalent
    destination: { write: () => true } as unknown as ReturnType<typeof pino.destination>,
  })
} catch {
  console.log("⚠ pino not installed — install with: bun add -d pino")
  pinoLog = { debug: () => {}, info: () => {}, warn: () => {} }
}

// ── Winston setup ────────────────────────────────────────────────────────────

let winstonLog: { debug: (msg: string) => void; info: (msg: string) => void; warn: (msg: string) => void }
try {
  const winston = await import("winston")
  winstonLog = winston.createLogger({
    level: "warn", // debug disabled
    silent: false,
    transports: [new winston.transports.Console({ silent: true })],
  })
} catch {
  console.log("⚠ winston not installed — install with: bun add -d winston")
  winstonLog = { debug: () => {}, info: () => {}, warn: () => {} }
}

// ── Debug setup ──────────────────────────────────────────────────────────────

let debugFn: (msg: string) => void
try {
  const debug = (await import("debug")).default
  debugFn = debug("bench") // DEBUG env not set → disabled
} catch {
  console.log("⚠ debug not installed — install with: bun add -d debug")
  debugFn = () => {}
}

// ── Baseline: noop ───────────────────────────────────────────────────────────

const noop = (): void => {}

// ── Benchmarks ───────────────────────────────────────────────────────────────

const N = 10_000_000

console.log("@beorn/logger Benchmark Suite")
console.log(`Iterations: ${(N / 1e6).toFixed(0)}M per test`)
console.log(`Runtime: Bun ${Bun.version}`)
console.log(`Platform: ${process.platform} ${process.arch}`)

// 1. Disabled debug call — cheap args
{
  setLogLevel("warn") // debug disabled

  const results = [
    measure("noop()", () => noop(), N),
    measure("beorn: log.debug?.(str)", () => beornLog.debug?.("hello"), N),
    measure("pino: log.debug(str)", () => pinoLog.debug("hello"), N),
    measure("winston: log.debug(str)", () => winstonLog.debug("hello"), N),
    measure('debug: debug("hello")', () => debugFn("hello"), N),
  ]

  printResults("DISABLED DEBUG — cheap argument (string literal)", results)
}

// 2. Disabled debug call — expensive args
{
  setLogLevel("warn") // debug disabled

  const results = [
    measure("noop(expensive)", () => noop(), N),
    measure("beorn: log.debug?.(expensive)", () => beornLog.debug?.(`state: ${expensiveArg()}`), N),
    measure("pino: log.debug(expensive)", () => pinoLog.debug(`state: ${expensiveArg()}`), N),
    measure("winston: log.debug(expensive)", () => winstonLog.debug(`state: ${expensiveArg()}`), N),
    measure("debug: debug(expensive)", () => debugFn(`state: ${expensiveArg()}`), N),
  ]

  printResults("DISABLED DEBUG — expensive argument (JSON.stringify)", results)
}

// 3. Enabled info call — cheap args
{
  setLogLevel("info") // info enabled

  const results = [
    measure("beorn: log.info?.(str)", () => beornLog.info?.("hello"), N / 10),
    measure("pino: log.info(str)", () => pinoLog.info("hello"), N / 10),
    measure("winston: log.info(str)", () => winstonLog.info("hello"), N / 10),
  ]

  printResults("ENABLED INFO — cheap argument (string literal)", results)
}

// 4. Span creation + disposal
{
  setLogLevel("warn")
  disableSpans()

  const results = [
    measure(
      "beorn: span create+dispose",
      () => {
        using _s = beornLog.span("op")
      },
      N / 10,
    ),
  ]

  printResults("SPAN — create + dispose (no output)", results)
}

console.log("\n" + "─".repeat(70))
console.log("Key: ops/s = operations per second, /op = time per operation")
console.log("beorn uses ?. for zero-overhead: disabled calls skip argument evaluation")
console.log("")
