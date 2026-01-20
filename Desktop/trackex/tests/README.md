# TrackEx Testing Guide

This directory contains the test suite for TrackEx. The testing infrastructure uses industry-standard, battle-tested libraries.

## Testing Stack

| Test Type         | Tool                 | Directory            |
| ----------------- | -------------------- | -------------------- |
| Unit Tests        | Vitest               | `tests/unit/`        |
| Integration Tests | Vitest + Prisma Mock | `tests/integration/` |
| E2E Tests         | Playwright           | `e2e/`               |

## Running Tests

### Quick Commands

```bash
# Run all unit tests
npm run test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run integration tests
npm run test:integration

# Run E2E tests
npm run e2e

# Run E2E tests with UI
npm run e2e:ui

# Run E2E tests with browser visible
npm run e2e:headed

# Run ALL tests (unit + integration + E2E)
npm run test:all
```

### Before Running E2E Tests

E2E tests require the development server. Playwright will automatically start it, but you can also run it manually:

```bash
npm run dev
```

For tests requiring authentication, set environment variables:

```bash
export TEST_USER_EMAIL="your-test-email@example.com"
export TEST_USER_PASSWORD="your-test-password"
```

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── unit/                       # Unit tests (pure functions)
│   ├── time-calculations.test.ts
│   ├── categories.test.ts
│   ├── rate-limiter.test.ts
│   ├── live-cache.test.ts
│   └── validations/
│       ├── employee.test.ts
│       └── analytics.test.ts
├── integration/                # Integration tests (with mocks)
│   ├── time-tracking-service.test.ts
│   └── analytics.test.ts
└── mocks/
    ├── prisma.ts               # Prisma client mock
    └── fixtures.ts             # Test data factories

e2e/
├── auth.spec.ts                # Authentication flows
└── dashboard.spec.ts           # Dashboard functionality
```

## Writing Tests

### Unit Tests

Unit tests should test pure functions in isolation:

```typescript
import { describe, it, expect } from "vitest"
import { calculateIdleTime } from "@/lib/utils/time-calculations"

describe("calculateIdleTime", () => {
  it("should sum up all idle entry durations", () => {
    const entries = [
      { isIdle: true, duration: 300 },
      { isIdle: false, duration: 600 },
    ]
    expect(calculateIdleTime(entries)).toBe(300)
  })
})
```

### Integration Tests

Integration tests use mocked dependencies:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { prismaMock, resetPrismaMock } from '../mocks/prisma'
import { TimeTrackingService } from '@/lib/services/time-tracking.service'

describe('TimeTrackingService', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('should calculate session statistics', async () => {
    prismaMock.workSession.findUnique.mockResolvedValue({...})
    // ... test logic
  })
})
```

### E2E Tests

E2E tests use Playwright:

```typescript
import { test, expect } from "@playwright/test"

test("should display login form", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator('input[type="email"]')).toBeVisible()
})
```

## Test Fixtures

Use factory functions from `tests/mocks/fixtures.ts`:

```typescript
import {
  createMockAppUsageEntry,
  createMockEmployee,
  createMockWorkSession,
  createMockAppRule,
  createMockDomainRule,
} from "../mocks/fixtures"

const entry = createMockAppUsageEntry({
  duration: 3600,
  category: "PRODUCTIVE",
})
```

## Coverage

Generate coverage reports:

```bash
npm run test:coverage
```

Coverage reports are generated in:

- `coverage/` - HTML report (open `coverage/index.html`)
- Terminal output with summary

## CI/CD Integration

For CI environments, use:

```bash
# Run all tests with CI-appropriate settings
npm run test -- --reporter=json --outputFile=test-results.json
npm run e2e -- --reporter=junit --output-file=e2e-results.xml
```

## Debugging Tests

### Vitest

```bash
# Run a specific test file
npm run test -- tests/unit/time-calculations.test.ts

# Run tests matching a pattern
npm run test -- --grep "calculateIdleTime"

# Debug with verbose output
npm run test -- --reporter=verbose
```

### Playwright

```bash
# Debug mode (step through tests)
npm run e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run with trace
npx playwright test --trace on
```

## Best Practices

1. **Keep tests focused** - Each test should verify one behavior
2. **Use descriptive names** - Test names should describe the expected behavior
3. **Arrange-Act-Assert** - Structure tests clearly
4. **Mock external dependencies** - Don't hit real databases or APIs in unit tests
5. **Use fixtures** - Leverage factory functions for consistent test data
6. **Clean up** - Reset mocks in `beforeEach`
7. **Avoid flaky tests** - Use proper waits and assertions in E2E tests
