# @happy/errors - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

## Package Overview

**@happy/errors** provides unified error handling for the Happy monorepo. It exports:

- **AppError class**: Standardized error with codes, retry support, and cause chaining
- **ErrorCodes**: Centralized error code constants organized by project

## Commands

```bash
# Build ESM + CJS output
yarn build

# Type check without emitting
yarn typecheck

# Run tests
yarn test
yarn test:watch

# Remove dist folder
yarn clean
```

## Structure

```
src/
└── index.ts          # All exports: ErrorCodes, AppError, types
```

## Usage Examples

### Basic Usage

```typescript
import { AppError, ErrorCodes } from '@happy/errors';

// Throw with error code constant
throw new AppError(ErrorCodes.AUTH_FAILED, 'Session expired');
```

### With Retry Support

```typescript
// Mark error as retryable (UI shows retry button)
throw new AppError(ErrorCodes.FETCH_FAILED, 'Network error', {
    canTryAgain: true
});
```

### Error Chaining

```typescript
try {
    await fetch(url);
} catch (error) {
    throw new AppError(ErrorCodes.API_ERROR, 'Failed to fetch data', {
        canTryAgain: true,
        cause: error instanceof Error ? error : undefined,
        context: { url, attemptNumber: 3 }
    });
}
```

### Static Factories

```typescript
// Wrap unknown errors
catch (error) {
    throw AppError.fromUnknown(ErrorCodes.OPERATION_FAILED, 'Failed', error, true);
}

// CLI-style (no retry flag)
throw AppError.withCause(ErrorCodes.AUTH_FAILED, 'Auth failed', originalError);
```

### Type Guard

```typescript
if (AppError.isAppError(error)) {
    console.log(error.code, error.canTryAgain);
}
```

## ErrorCodes Organization

Error codes are organized by scope:

| Category | Examples | Used By |
|----------|----------|---------|
| **Shared** | `AUTH_FAILED`, `ENCRYPTION_ERROR`, `NOT_FOUND` | All projects |
| **CLI-specific** | `DAEMON_START_FAILED`, `LOCK_ACQUISITION_FAILED` | happy-cli |
| **App-specific** | `RPC_FAILED`, `SOCKET_NOT_CONNECTED`, `FETCH_ABORTED` | happy-app |
| **Server-specific** | `AUTH_NOT_INITIALIZED`, `INVARIANT_VIOLATION` | happy-server |

## Development Guidelines

### Adding New Error Codes

1. **Determine category**: Shared, CLI, App, or Server?
2. **Add constant with JSDoc**: Include description comment
3. **Use SCREAMING_SNAKE_CASE**: Match existing naming
4. **Update documentation** (docs/errors/) if CLI error

### AppError Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `canTryAgain` | boolean | false | UI shows retry button |
| `cause` | Error | undefined | Original error for chaining |
| `context` | Record | undefined | Debug metadata |

### Serialization

AppError implements `toJSON()` for structured logging:

```typescript
const error = new AppError(ErrorCodes.API_ERROR, 'Failed', {
    canTryAgain: true,
    context: { url: '/api/data' }
});

console.log(JSON.stringify(error));
// {
//   "code": "API_ERROR",
//   "message": "Failed",
//   "name": "AppError",
//   "canTryAgain": true,
//   "context": { "url": "/api/data" }
// }
```

## Consumer Projects

| Project | Module Format | Primary Usage |
|---------|---------------|---------------|
| happy-cli | ESM | Error throwing with codes |
| happy-app | ESM (Expo) | Error display with retry |
| happy-server | CommonJS | API error responses |
| happy-server-workers | ESM | HTTP error responses |

## Important Rules

1. **Never remove error codes** - May break existing error handling
2. **Use specific codes** - Avoid `UNKNOWN_ERROR` when a specific code exists
3. **Document CLI errors** - Update docs/errors/ for user-facing CLI errors
4. **Test both formats** - ESM and CJS consumers must work
