# TrackEx - Time Tracking & Productivity Monitoring

A modern time tracking and productivity monitoring solution for remote teams, featuring a web dashboard and cross-platform desktop agent.

## 🎯 Overview

TrackEx provides complete visibility into remote team productivity through:

- Real-time activity monitoring and analytics
- Automated time tracking with idle detection
- Privacy-respecting screenshot capture
- Customizable tracking policies per team/employee
- App usage categorization (productive/neutral/unproductive)

## 📋 Prerequisites

- **Node.js** 18.17+ (recommended: 24.6.0+)
- **PostgreSQL** database (or [Neon](https://neon.tech) serverless)
- **npm** or **yarn**
- Optional: **Redis** for enhanced real-time features

## 🛠 Technology Stack

### Web Application

- Next.js 14 (App Router)
- React 18 + TypeScript
- Prisma ORM + PostgreSQL
- NextAuth.js v5
- TanStack Query
- Socket.IO
- Tailwind CSS + shadcn/ui

### Desktop Agent

- Tauri 2.x (Rust + React)
- Cross-platform: macOS & Windows

## 📁 Project Structure

\`\`\`
trackex/
├── app/ # Next.js pages & API routes
│ ├── api/ # Backend API endpoints
│ │ ├── auth/ # Authentication
│ │ ├── employees/ # Employee CRUD
│ │ ├── teams/ # Team management
│ │ ├── policies/ # Tracking policies
│ │ ├── app-rules/ # App categorization
│ │ ├── ingest/ # Desktop agent data ingestion
│ │ ├── analytics/ # Reports & analytics
│ │ └── live/ # Real-time endpoints
│ ├── app/ # Protected dashboard
│ │ ├── employees/ # Employee management
│ │ ├── live/ # Live activity view
│ │ └── settings/ # Configuration
│ └── (marketing)/ # Public pages
├── components/
│ ├── ui/ # shadcn/ui components
│ ├── app/ # Dashboard components
│ ├── landing/ # Landing page sections
│ └── providers/ # React context providers
├── lib/ # Utilities & configuration
│ ├── auth.ts # NextAuth configuration
│ ├── db.ts # Prisma client
│ ├── realtime/ # WebSocket/Redis
│ └── validations/ # Zod schemas
├── prisma/ # Database schema
├── desktop-agent/ # Tauri desktop app
├── hooks/ # Custom React hooks
├── types/ # TypeScript definitions
└── public/ # Static assets
\`\`\`

## ⚙️ Environment Variables

Create a `.env` file with:

\`\`\`env

# Database (required)

DATABASE_URL="postgresql://user:pass@host:5432/trackex"

# NextAuth (required)

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-char-secret"

# Admin credentials (required)

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD_HASH="$2a$12$..." # bcrypt hash

# Device authentication (required)

DEVICE_TOKEN_SECRET="your-device-secret"

# Optional

REDIS_URL="redis://localhost:6379"
DEFAULT_EVENTS_RETENTION_DAYS=90
DEFAULT_SCREENSHOTS_RETENTION_DAYS=30
\`\`\`

### Generate Password Hash

\`\`\`bash
node -e "require('bcryptjs').hash('yourpassword', 12).then(h=>console.log(h))"
\`\`\`

## 🚀 Installation

\`\`\`bash

# Clone repository

git clone https://github.com/your-org/trackex.git
cd trackex

# Install dependencies

npm install

# Configure environment

cp .env.example .env

# Edit .env with your values

# Run database migrations

npx prisma migrate dev

# Generate Prisma client

npx prisma generate
\`\`\`

## 💻 Development

\`\`\`bash

# Start development server

npm run dev

# With network access (for testing from other devices)

npm run dev:server

# Run type checking

npm run typecheck

# Run linting

npm run lint

# Run tests

npm run test
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Production Build

\`\`\`bash

# Build for production

npm run build

# Start production server

npm start

# Or with network access

npm run start:server
\`\`\`

## 📦 Deployment

### Hetzner (Pre-configured)

\`\`\`bash

# Full deployment

./deploy-to-hetzner.sh

# Quick update

./deploy-update.sh
\`\`\`

### Vercel

1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy

### Docker

\`\`\`bash
docker build -t trackex .
docker run -p 3000:3000 --env-file .env trackex
\`\`\`

## 🖥 Desktop Agent

### Build Requirements

- **macOS**: Xcode CLI Tools, macOS 10.15+
- **Windows**: Visual Studio 2022 C++ tools, Windows 10 1809+
- **Both**: Node.js 24.6.0+, Rust 1.89.0+

### Build

\`\`\`bash
cd desktop-agent/trackex-agent
npm install
npm run tauri build
\`\`\`

### Output

- macOS: `.dmg` and `.app`
- Windows: `.msi` and `.exe`

## 📜 Available Scripts

| Script                   | Description              |
| ------------------------ | ------------------------ |
| `npm run dev`            | Start development server |
| `npm run build`          | Build production bundle  |
| `npm start`              | Start production server  |
| `npm run lint`           | Run ESLint               |
| `npm run typecheck`      | TypeScript type checking |
| `npm run test`           | Run unit tests           |
| `npm run e2e`            | Run E2E tests            |
| `npm run prisma:migrate` | Run database migrations  |
| `npm run deploy`         | Deploy to Hetzner        |
| `npm run deploy:update`  | Quick deploy update      |

## 🗄 Database Models

| Model           | Purpose                    |
| --------------- | -------------------------- |
| **User**        | Admin accounts             |
| **Employee**    | Team members being tracked |
| **Team**        | Organizational groups      |
| **Policy**      | Tracking configuration     |
| **AppRule**     | App categorization rules   |
| **Device**      | Employee devices           |
| **WorkSession** | Clock in/out records       |
| **Event**       | Activity events            |
| **Screenshot**  | Screen captures            |
| **AppUsage**    | App usage tracking         |
| **AuditLog**    | Admin action logging       |

## 🔒 Authentication

- **Admin**: NextAuth.js with credentials provider
- **Devices**: Token-based authentication via `DEVICE_TOKEN_SECRET`
- **Sessions**: JWT-based, 24-hour expiry

## 📡 Real-time Features

- Socket.IO for WebSocket connections
- Redis for scalable pub/sub (optional)
- In-memory fallback when Redis unavailable
- Live employee status and activity updates

## 🔗 API Endpoints

| Endpoint                | Method         | Description           |
| ----------------------- | -------------- | --------------------- |
| `/api/auth/*`           | Various        | Authentication        |
| `/api/employees`        | GET/POST       | List/create employees |
| `/api/employees/[id]`   | GET/PUT/DELETE | Employee CRUD         |
| `/api/teams`            | GET/POST       | Team management       |
| `/api/policies`         | GET/POST       | Policy configuration  |
| `/api/app-rules`        | GET/POST       | App categorization    |
| `/api/ingest/events`    | POST           | Desktop agent events  |
| `/api/ingest/heartbeat` | POST           | Device heartbeats     |
| `/api/analytics/*`      | GET            | Analytics data        |
| `/api/live/*`           | GET            | Real-time status      |
| `/api/screenshots/*`    | GET            | Screenshot retrieval  |

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For support, contact: support@trackex.app
\`\`\`

---

## 7. Additional Context

### Further Considerations

1. **Environment Setup**: Do you need help setting up the PostgreSQL database or Neon account? I can provide specific instructions for either option.

2. **Desktop Agent Development**: Are you planning to modify the Tauri desktop agent? That requires additional Rust toolchain setup.

3. **Redis Configuration**: For production with multiple users, Redis is recommended for real-time features. Should I include Redis setup instructions?# TrackEx - Time Tracking & Productivity Monitoring

A modern time tracking and productivity monitoring solution for remote teams, featuring a web dashboard and cross-platform desktop agent.

## 🎯 Overview

TrackEx provides complete visibility into remote team productivity through:

- Real-time activity monitoring and analytics
- Automated time tracking with idle detection
- Privacy-respecting screenshot capture
- Customizable tracking policies per team/employee
- App usage categorization (productive/neutral/unproductive)

## 📋 Prerequisites

- **Node.js** 18.17+ (recommended: 24.6.0+)
- **PostgreSQL** database (or [Neon](https://neon.tech) serverless)
- **npm** or **yarn**
- Optional: **Redis** for enhanced real-time features

## 🛠 Technology Stack

### Web Application

- Next.js 14 (App Router)
- React 18 + TypeScript
- Prisma ORM + PostgreSQL
- NextAuth.js v5
- TanStack Query
- Socket.IO
- Tailwind CSS + shadcn/ui

### Desktop Agent

- Tauri 2.x (Rust + React)
- Cross-platform: macOS & Windows

## 📁 Project Structure

\`\`\`
trackex/
├── app/ # Next.js pages & API routes
│ ├── api/ # Backend API endpoints
│ │ ├── auth/ # Authentication
│ │ ├── employees/ # Employee CRUD
│ │ ├── teams/ # Team management
│ │ ├── policies/ # Tracking policies
│ │ ├── app-rules/ # App categorization
│ │ ├── ingest/ # Desktop agent data ingestion
│ │ ├── analytics/ # Reports & analytics
│ │ └── live/ # Real-time endpoints
│ ├── app/ # Protected dashboard
│ │ ├── employees/ # Employee management
│ │ ├── live/ # Live activity view
│ │ └── settings/ # Configuration
│ └── (marketing)/ # Public pages
├── components/
│ ├── ui/ # shadcn/ui components
│ ├── app/ # Dashboard components
│ ├── landing/ # Landing page sections
│ └── providers/ # React context providers
├── lib/ # Utilities & configuration
│ ├── auth.ts # NextAuth configuration
│ ├── db.ts # Prisma client
│ ├── realtime/ # WebSocket/Redis
│ └── validations/ # Zod schemas
├── prisma/ # Database schema
├── desktop-agent/ # Tauri desktop app
├── hooks/ # Custom React hooks
├── types/ # TypeScript definitions
└── public/ # Static assets
\`\`\`

## ⚙️ Environment Variables

Create a `.env` file with:

\`\`\`env

# Database (required)

DATABASE_URL="postgresql://user:pass@host:5432/trackex"

# NextAuth (required)

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-char-secret"

# Admin credentials (required)

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD_HASH="$2a$12$..." # bcrypt hash

# Device authentication (required)

DEVICE_TOKEN_SECRET="your-device-secret"

# Optional

REDIS_URL="redis://localhost:6379"
DEFAULT_EVENTS_RETENTION_DAYS=90
DEFAULT_SCREENSHOTS_RETENTION_DAYS=30
\`\`\`

### Generate Password Hash

\`\`\`bash
node -e "require('bcryptjs').hash('yourpassword', 12).then(h=>console.log(h))"
\`\`\`

## 🚀 Installation

\`\`\`bash

# Clone repository

git clone https://github.com/your-org/trackex.git
cd trackex

# Install dependencies

npm install

# Configure environment

cp .env.example .env

# Edit .env with your values

# Run database migrations

npx prisma migrate dev

# Generate Prisma client

npx prisma generate
\`\`\`

## 💻 Development

\`\`\`bash

# Start development server

npm run dev

# With network access (for testing from other devices)

npm run dev:server

# Run type checking

npm run typecheck

# Run linting

npm run lint

# Run tests

npm run test
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Production Build

\`\`\`bash

# Build for production

npm run build

# Start production server

npm start

# Or with network access

npm run start:server
\`\`\`

## 📦 Deployment

### Hetzner (Pre-configured)

\`\`\`bash

# Full deployment

./deploy-to-hetzner.sh

# Quick update

./deploy-update.sh
\`\`\`

### Vercel

1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy

### Docker

\`\`\`bash
docker build -t trackex .
docker run -p 3000:3000 --env-file .env trackex
\`\`\`

## 🖥 Desktop Agent

### Build Requirements

- **macOS**: Xcode CLI Tools, macOS 10.15+
- **Windows**: Visual Studio 2022 C++ tools, Windows 10 1809+
- **Both**: Node.js 24.6.0+, Rust 1.89.0+

### Build

\`\`\`bash
cd desktop-agent/trackex-agent
npm install
npm run tauri build
\`\`\`

### Output

- macOS: `.dmg` and `.app`
- Windows: `.msi` and `.exe`

## 📜 Available Scripts

| Script                   | Description              |
| ------------------------ | ------------------------ |
| `npm run dev`            | Start development server |
| `npm run build`          | Build production bundle  |
| `npm start`              | Start production server  |
| `npm run lint`           | Run ESLint               |
| `npm run typecheck`      | TypeScript type checking |
| `npm run test`           | Run unit tests           |
| `npm run e2e`            | Run E2E tests            |
| `npm run prisma:migrate` | Run database migrations  |
| `npm run deploy`         | Deploy to Hetzner        |
| `npm run deploy:update`  | Quick deploy update      |

## 🗄 Database Models

| Model           | Purpose                    |
| --------------- | -------------------------- |
| **User**        | Admin accounts             |
| **Employee**    | Team members being tracked |
| **Team**        | Organizational groups      |
| **Policy**      | Tracking configuration     |
| **AppRule**     | App categorization rules   |
| **Device**      | Employee devices           |
| **WorkSession** | Clock in/out records       |
| **Event**       | Activity events            |
| **Screenshot**  | Screen captures            |
| **AppUsage**    | App usage tracking         |
| **AuditLog**    | Admin action logging       |

## 🔒 Authentication

- **Admin**: NextAuth.js with credentials provider
- **Devices**: Token-based authentication via `DEVICE_TOKEN_SECRET`
- **Sessions**: JWT-based, 24-hour expiry

## 📡 Real-time Features

- Socket.IO for WebSocket connections
- Redis for scalable pub/sub (optional)
- In-memory fallback when Redis unavailable
- Live employee status and activity updates

## 🔗 API Endpoints

| Endpoint                | Method         | Description           |
| ----------------------- | -------------- | --------------------- |
| `/api/auth/*`           | Various        | Authentication        |
| `/api/employees`        | GET/POST       | List/create employees |
| `/api/employees/[id]`   | GET/PUT/DELETE | Employee CRUD         |
| `/api/teams`            | GET/POST       | Team management       |
| `/api/policies`         | GET/POST       | Policy configuration  |
| `/api/app-rules`        | GET/POST       | App categorization    |
| `/api/ingest/events`    | POST           | Desktop agent events  |
| `/api/ingest/heartbeat` | POST           | Device heartbeats     |
| `/api/analytics/*`      | GET            | Analytics data        |
| `/api/live/*`           | GET            | Real-time status      |
| `/api/screenshots/*`    | GET            | Screenshot retrieval  |

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For support, contact: support@trackex.app
\`\`\`

---

## 7. Additional Context

### Further Considerations

1. **Environment Setup**: Do you need help setting up the PostgreSQL database or Neon account? I can provide specific instructions for either option.

2. **Desktop Agent Development**: Are you planning to modify the Tauri desktop agent? That requires additional Rust toolchain setup.

3. **Redis Configuration**: For production with multiple users, Redis is recommended for real-time features. Should I include Redis setup instructions?
2222222222222222222222222222222