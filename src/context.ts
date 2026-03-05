/**
 * AsyncLocalStorage-based context propagation for @beorn/logger — Node.js/Bun only.
 *
 * Separated from core logger to allow tree-shaking in browser bundles.
 * When enabled, new spans automatically parent to the current context span,
 * and writeLog() auto-tags with trace_id/span_id from context.
 *
 * @example
 * ```typescript
 * import { enableContextPropagation, getCurrentSpan } from "@beorn/logger/context"
 *
 * enableContextPropagation()
 *
 * const log = createLogger("myapp")
 * {
 *   using span = log.span("request")
 *   // All logs and child spans within this async context
 *   // automatically inherit trace_id and span_id
 *   log.info("inside span") // auto-tagged with trace_id, span_id
 *
 *   const current = getCurrentSpan()
 *   // current === { spanId: "sp_1", traceId: "tr_1", parentId: null }
 * }
 * ```
 */

import { AsyncLocalStorage } from "node:async_hooks"
import { _setContextHooks, _clearContextHooks } from "./core.js"

// ============ Types ============

/** Minimal span context stored in AsyncLocalStorage */
export interface SpanContext {
  readonly spanId: string
  readonly traceId: string
  readonly parentId: string | null
}

// ============ State ============

let storage: AsyncLocalStorage<SpanContext> | null = null
let contextEnabled = false

// ============ API ============

/**
 * Enable AsyncLocalStorage-based context propagation.
 * Once enabled, new spans automatically parent to the current context span,
 * and log messages are auto-tagged with trace_id/span_id.
 *
 * **Node.js/Bun only** — not available in browser environments.
 */
export function enableContextPropagation(): void {
  if (!storage) {
    storage = new AsyncLocalStorage<SpanContext>()
  }
  contextEnabled = true

  // Register hooks with core.ts
  _setContextHooks({
    getContextTags,
    getContextParent() {
      const span = getCurrentSpan()
      if (!span) return null
      return { spanId: span.spanId, traceId: span.traceId }
    },
    enterContext: enterSpanContext,
    exitContext: exitSpanContext,
  })
}

/**
 * Disable context propagation.
 * Existing spans continue to work, but new spans won't auto-parent.
 */
export function disableContextPropagation(): void {
  contextEnabled = false
  _clearContextHooks()
}

/** Check if context propagation is enabled */
export function isContextPropagationEnabled(): boolean {
  return contextEnabled
}

/**
 * Get the current span context from AsyncLocalStorage.
 * Returns null if no span is active in the current async context,
 * or if context propagation is not enabled.
 */
export function getCurrentSpan(): SpanContext | null {
  if (!contextEnabled || !storage) return null
  return storage.getStore() ?? null
}

/**
 * Enter a span context for the remainder of the current synchronous execution
 * and any async operations started from it. Used by the logger when creating
 * spans with `using` — since `using` doesn't wrap user code in a callback,
 * `enterWith()` is the right primitive.
 *
 * @internal
 */
export function enterSpanContext(spanId: string, traceId: string, parentId: string | null): void {
  if (!contextEnabled || !storage) return
  storage.enterWith({ spanId, traceId, parentId })
}

/**
 * Restore the parent span context (called when a span ends).
 * Re-enters the parent's context, or clears the context if there is no parent.
 *
 * @internal
 */
export function exitSpanContext(parentId: string | null, parentTraceId: string | null): void {
  if (!contextEnabled || !storage) return
  if (parentId && parentTraceId) {
    // Restore parent context — note: we don't have the parent's parentId
    // but that's fine since this context is only used for auto-tagging and
    // auto-parenting new child spans (which will read spanId and traceId).
    storage.enterWith({ spanId: parentId, traceId: parentTraceId, parentId: null })
  } else {
    // No parent — exit the context entirely
    // enterWith(undefined as any) is not ideal, but there's no "exitWith"
    // We use a sentinel to indicate "no active span"
    storage.enterWith(undefined as unknown as SpanContext)
  }
}

/**
 * Run a function within a span context.
 * Used for explicit context scoping (e.g., in request handlers).
 *
 * @param context - The span context to set
 * @param fn - The function to run within the context
 * @returns The return value of fn
 */
export function runInSpanContext<T>(context: SpanContext, fn: () => T): T {
  if (!contextEnabled || !storage) return fn()
  return storage.run(context, fn)
}

/**
 * Get the context tags (trace_id, span_id) for the current async context.
 * Used by writeLog() to auto-tag log messages.
 * Returns empty object if context propagation is disabled or no span is active.
 */
export function getContextTags(): Record<string, string> {
  const span = getCurrentSpan()
  if (!span) return {}
  return {
    trace_id: span.traceId,
    span_id: span.spanId,
  }
}
