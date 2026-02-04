# Changelog

All notable changes to @beorn/logger will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `createConditionalLogger(name, props?)` - Built-in conditional logger for optional chaining pattern
- `setTraceFilter(namespaces)` - Programmatic trace filter for namespace-based span control
- `getTraceFilter()` - Get current trace filter
- Comprehensive test suite (61 tests covering all features)

### Changed

- Updated documentation with full API reference

## [0.1.0] - 2026-01-15

### Added

- Initial release
- `createLogger(name, props?)` - Create structured logger
- Logger methods: `trace`, `debug`, `info`, `warn`, `error`
- Child loggers with `.logger(namespace, props?)`
- Span timing with `.span(namespace, props?)` and `using` keyword support
- `SpanData` with id, traceId, parentId, startTime, endTime, duration
- Custom span attributes via `span.spanData.key = value`
- Configuration via environment variables: `LOG_LEVEL`, `TRACE`, `TRACE_FORMAT`
- Programmatic configuration: `setLogLevel`, `getLogLevel`, `enableSpans`, `disableSpans`, `spansAreEnabled`
- Dual output format: pretty console (dev) and JSON (production)
- Span collection for testing: `startCollecting`, `stopCollecting`, `getCollectedSpans`, `clearCollectedSpans`
- `resetIds()` for deterministic tests
