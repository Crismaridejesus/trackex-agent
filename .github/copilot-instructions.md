# TrackEx Copilot Instructions

## Architecture Overview

TrackEx is a **multi-tenant time tracking platform** with two interconnected components:

1. **Web Dashboard** (`Desktop/trackex/`) - Next.js 14 App Router with Prisma/PostgreSQL
2. **Desktop Agent** (`Desktop/trackex-agent/`) - Tauri 2.x (Rust backend + React frontend)

Data flows: Desktop Agent → `/api/ingest/*` endpoints → PostgreSQL → Dashboard displays analytics.

## Project Structure Patterns

### Web Application (Next.js)
- **API Routes**: `app/api/` - RESTful endpoints with Zod validation in `lib/validations/`
- **Protected Routes**: `app/app/` - Dashboard pages behind `middleware.ts` auth check
- **Marketing Pages**: `app/(marketing)/` - Public landing pages with route groups
- **Components**: `components/ui/` (shadcn), `components/app/` (dashboard), `components/landing/`

### Desktop Agent (Tauri)
- **Rust Backend**: `src-tauri/src/` - Commands in `commands.rs`, API client in `api/`
- **React Frontend**: `src/` - Uses `@tauri-apps/api/core` for `invoke()` calls
- **Local Storage**: SQLite via `storage/` module, credentials in system keyring

## Key Conventions

### Authentication
- **Web Users**: JWT sessions via `lib/simple-auth.ts`, validated in `lib/simple-middleware.ts`
- **Desktop Devices**: Bearer token auth via `lib/auth/device.ts` with SHA-256 hashing
- **RBAC**: Roles defined in `lib/auth/rbac.ts` - SUPER_ADMIN, OWNER, MANAGER, TEAM_LEAD
- Session cookie name: Check `getSimpleSession()` for the current implementation

### Database Patterns
- Prisma client: Always import from `@/lib/db` (singleton with connection pooling)
- Multi-tenant: Most tables have `organizationId` - always filter by org context
- Schema location: `prisma/schema.prisma` - uses `@@map` for snake_case table names
- Migrations: `npm run prisma:migrate` (dev) or `npx prisma migrate deploy` (prod)

### API Development
- Validate request bodies with Zod schemas from `lib/validations/`
- Device endpoints: Use `requireDeviceAuth(req)` from `lib/auth/device.ts`
- User endpoints: Check session via `getSession()` from `lib/auth/rbac.ts`
- Rate limiting: Priority events (clock_in/out, screenshots) bypass limits in `/api/ingest/events/`

### Real-time Features
- `lib/realtime/store.ts` - Database-backed presence with optional Redis pub/sub
- Presence updates written to `Device.currentApp` as JSON string
- Live view polls `/api/live/*` endpoints; Socket.IO available but optional

## Development Commands

```bash
# Web Dashboard
cd Desktop/trackex
npm run dev              # Start at localhost:3000
npm run typecheck        # TypeScript validation
npm run test             # Vitest unit tests
npm run test:integration # Integration tests with mocked Prisma
npm run e2e              # Playwright E2E (requires dev server)

# Desktop Agent
cd Desktop/trackex-agent
npm run tauri dev        # Development with hot reload
npm run tauri build      # Production build (.dmg/.exe)
```

## Testing Approach
- Unit tests in `tests/unit/` - pure function testing
- Integration tests in `tests/integration/` - use Prisma mocks from `tests/mocks/prisma.ts`
- E2E tests in root `e2e/` directory - Playwright with auto-started dev server
- Test fixtures and factories in `tests/mocks/fixtures.ts`

## Desktop Agent ↔ Server Integration

The agent sends events to these endpoints:
- `POST /api/ingest/events` - App focus, idle status, clock in/out events
- `POST /api/ingest/heartbeat` - Device presence updates
- `POST /api/ingest/jobs/[id]` - Screenshot upload responses

Key Rust modules:
- `commands.rs` - Tauri command handlers exposed to React
- `api/client.rs` - HTTP client for server communication
- `sampling/` - App focus detection, idle monitoring
- `screenshots/` - Screen capture with policy-based triggers

## Common Gotchas

1. **Prisma imports**: Use `@/lib/db`, not direct `@prisma/client` imports
2. **Org context**: Most queries need `organizationId` filter for multi-tenancy
3. **Time zones**: Employees have optional `timezone` field; server stores UTC
4. **App categorization**: Domain rules take priority over app rules (`lib/utils/categories.ts`)
5. **Desktop builds**: Require platform-specific toolchains (Xcode on macOS, VS 2022 on Windows)
