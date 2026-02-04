/**
 * Worker Thread Logger/Console Forwarding
 *
 * Provides utilities to forward @beorn/logger and console.* output from worker threads
 * to the main thread, ensuring proper integration with DEBUG_LOG and log files.
 *
 * ## Full Logger Forwarding (Recommended)
 *
 * @example Worker side:
 * ```typescript
 * import { createWorkerLogger } from "@beorn/logger/worker"
 * const log = createWorkerLogger(postMessage, "km:worker:parse")
 *
 * log.info("processing", { file: "test.md" })
 * {
 *   using span = log.span("parse")
 *   // ... work ...
 *   span.spanData.lines = 100
 * }
 * ```
 *
 * @example Main thread side:
 * ```typescript
 * import { createWorkerLogHandler } from "@beorn/logger/worker"
 *
 * const handleLog = createWorkerLogHandler()
 * worker.onmessage = (e) => {
 *   if (e.data.type === "log" || e.data.type === "span") handleLog(e.data)
 * }
 * ```
 *
 * ## Console Forwarding (Simple)
 *
 * @example Worker side:
 * ```typescript
 * import { forwardConsole } from "@beorn/logger/worker"
 * forwardConsole(postMessage)
 *
 * console.log("message")  // Forwarded to main thread
 * ```
 */
import { type Logger } from "./index.ts";
/** Message sent from worker to main thread for console output */
export interface WorkerConsoleMessage {
    type: "console";
    level: "log" | "debug" | "info" | "warn" | "error" | "trace";
    namespace?: string;
    args: unknown[];
    timestamp: number;
}
/** Message sent from worker to main thread for structured log output */
export interface WorkerLogMessage {
    type: "log";
    level: "trace" | "debug" | "info" | "warn" | "error";
    namespace: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: number;
}
/** Message sent from worker to main thread for span events */
export interface WorkerSpanMessage {
    type: "span";
    event: "start" | "end";
    namespace: string;
    spanId: string;
    traceId: string;
    parentId: string | null;
    startTime: number;
    endTime?: number;
    duration?: number;
    props: Record<string, unknown>;
    spanData: Record<string, unknown>;
    timestamp: number;
}
/** Union type for all worker messages */
export type WorkerMessage = WorkerConsoleMessage | WorkerLogMessage | WorkerSpanMessage;
/** Type guard for WorkerConsoleMessage */
export declare function isWorkerConsoleMessage(msg: unknown): msg is WorkerConsoleMessage;
/** Type guard for WorkerLogMessage */
export declare function isWorkerLogMessage(msg: unknown): msg is WorkerLogMessage;
/** Type guard for WorkerSpanMessage */
export declare function isWorkerSpanMessage(msg: unknown): msg is WorkerSpanMessage;
/** Type guard for any worker message */
export declare function isWorkerMessage(msg: unknown): msg is WorkerMessage;
type PostMessageFn = (message: WorkerConsoleMessage) => void;
/**
 * Forward console.* calls from worker to main thread.
 *
 * Monkey-patches console methods to send messages via postMessage.
 * Call this at the start of your worker script.
 *
 * @param postMessage - The worker's postMessage function
 * @param namespace - Optional namespace for log messages (e.g., "km:worker:parse")
 *
 * @example
 * ```typescript
 * // At top of worker file:
 * import { forwardConsole } from "@beorn/logger/worker"
 * forwardConsole(postMessage, "km:worker:parse")
 *
 * // Now all console.* calls are forwarded:
 * console.log("processing", { file: "test.md" })
 * console.error(new Error("failed"))
 * ```
 */
export declare function forwardConsole(postMessage: PostMessageFn, namespace?: string): void;
/**
 * Restore original console methods.
 * Call this if you need to disable console forwarding.
 */
export declare function restoreConsole(): void;
type PostMessageAnyFn = (message: WorkerMessage) => void;
/** Reset worker ID counters (for testing) */
export declare function resetWorkerIds(): void;
interface WorkerLoggerOptions {
    /** Parent span ID for nested spans */
    parentSpanId?: string | null;
    /** Trace ID for distributed tracing */
    traceId?: string | null;
}
/**
 * Create a logger instance for use in a worker thread.
 *
 * All log calls and span events are forwarded to the main thread via postMessage.
 * The main thread should use createWorkerLogHandler to process these messages.
 *
 * @param postMessage - The worker's postMessage function
 * @param namespace - Logger namespace (e.g., "km:worker:parse")
 * @param props - Optional initial props
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import { createWorkerLogger } from "@beorn/logger/worker"
 *
 * const log = createWorkerLogger(postMessage, "km:worker:parse")
 *
 * log.info("starting parse", { file: "test.md" })
 *
 * {
 *   using span = log.span("process")
 *   span.info("processing...")
 *   span.spanData.lineCount = 100
 * }
 * // Span end event automatically sent to main thread
 * ```
 */
export declare function createWorkerLogger(postMessage: PostMessageAnyFn, namespace: string, props?: Record<string, unknown>, options?: WorkerLoggerOptions): Logger;
export interface WorkerConsoleHandlerOptions {
    /** Default namespace if message doesn't include one */
    defaultNamespace?: string;
    /** Custom logger to use (defaults to creating one with the namespace) */
    logger?: Logger;
}
/**
 * Create a handler for worker console messages.
 *
 * Use this on the main thread to receive and output messages from workers.
 *
 * @param options - Handler options
 * @returns Handler function to call with worker messages
 *
 * @example
 * ```typescript
 * import { createWorkerConsoleHandler } from "@beorn/logger/worker"
 *
 * const handleConsole = createWorkerConsoleHandler({
 *   defaultNamespace: "km:worker:parse"
 * })
 *
 * worker.onmessage = (e) => {
 *   if (e.data.type === "console") {
 *     handleConsole(e.data)
 *   } else {
 *     // Handle other message types
 *   }
 * }
 * ```
 */
export declare function createWorkerConsoleHandler(options?: WorkerConsoleHandlerOptions): (message: WorkerConsoleMessage) => void;
export interface WorkerLogHandlerOptions {
    /** Enable span output (default: uses spansAreEnabled()) */
    enableSpans?: boolean;
}
/**
 * Create a handler for worker logger messages (logs and spans).
 *
 * Use this on the main thread to receive and output messages from workers
 * that use createWorkerLogger.
 *
 * @param options - Handler options
 * @returns Handler function to call with worker messages
 *
 * @example
 * ```typescript
 * import { createWorkerLogHandler, isWorkerMessage } from "@beorn/logger/worker"
 *
 * const handleLog = createWorkerLogHandler()
 *
 * worker.onmessage = (e) => {
 *   if (isWorkerMessage(e.data)) {
 *     handleLog(e.data)
 *   } else {
 *     // Handle other message types
 *   }
 * }
 * ```
 */
export declare function createWorkerLogHandler(options?: WorkerLogHandlerOptions): (message: WorkerMessage) => void;
export {};
//# sourceMappingURL=worker.d.ts.map