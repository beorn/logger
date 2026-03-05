/**
 * @beorn/logger browser entry point.
 *
 * Re-exports the full logger API except createFileWriter (which requires node:fs).
 * Bundlers resolve this via the "browser" condition in package.json exports.
 */

// Re-export everything from core logger
export {
  // Types
  type OutputLogLevel,
  type LogLevel,
  type LazyMessage,
  type SpanData,
  type Logger,
  type SpanLogger,
  type OutputMode,
  type LogFormat,
  type ConditionalLogger,

  // Writers
  addWriter,
  setSuppressConsole,
  setOutputMode,
  getOutputMode,

  // Configuration
  setLogLevel,
  getLogLevel,
  enableSpans,
  disableSpans,
  spansAreEnabled,
  setTraceFilter,
  getTraceFilter,
  setDebugFilter,
  getDebugFilter,
  setLogFormat,
  getLogFormat,

  // ID management
  resetIds,

  // Span collection
  startCollecting,
  stopCollecting,
  getCollectedSpans,
  clearCollectedSpans,

  // Logger creation
  createLogger,
} from "./core.js"

// File writer types (exported for type compatibility, but the function throws)
export type { FileWriterOptions, FileWriter } from "./file-writer.js"

/** @throws Always — createFileWriter is not available in browser environments */
export function createFileWriter(): never {
  throw new Error(
    "createFileWriter is not available in browser environments. Use addWriter() with a custom transport instead.",
  )
}
