/**
 * @beorn/logger - Structured logging with spans
 *
 * Full entry point for Node.js, Bun, and Deno.
 * Browser environments use index.browser.ts via the "browser" export condition.
 */

export * from "./core.js"
export { createFileWriter, type FileWriter, type FileWriterOptions } from "./file-writer.js"
export { setIdFormat, getIdFormat, type IdFormat, traceparent, setSampleRate, getSampleRate } from "./tracing.js"
