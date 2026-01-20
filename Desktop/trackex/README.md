# Trackex - Time & Productivity Tracking

**Phase 2: Dashboard & Analytics (COMPLETED)**

Modern time tracking and productivity monitoring solution that your team won't hate.

## 🚀 Features

### ✅ Phase 1 (Completed)
- **Landing Page**: Modern, responsive design with pricing and features
- **Authentication**: Secure owner-only login with NextAuth.js
- **Protected Routes**: Dashboard accessible only to authenticated users

### ✅ Phase 2 (Completed)
- **Dashboard**: Real-time analytics and productivity insights
- **Employee Management**: CRUD operations for team members
- **Team Management**: Organize employees into teams
- **Policy Management**: Configure work hours and idle time rules
- **App Rules**: Categorize applications (productive/neutral/unproductive)
- **Live View**: Real-time employee activity monitoring
- **CSV Exports**: Export analytics, sessions, and app usage data
- **Development Simulator**: Generate test data for development
- **Audit Logging**: Track all administrative actions
- **Real-time Updates**: WebSocket integration with Redis fallback

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: NextAuth.js v5 with JWT sessions
- **Real-time**: Socket.IO with Redis/in-memory fallback
- **Styling**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **State Management**: TanStack Query
- **Testing**: Playwright (E2E) + Vitest (Unit)
- **Icons**: Lucide React
- **Security**: bcrypt password hashing, RBAC, audit logs

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (we recommend [Neon](https://neon.tech))
- Optional: Redis for real-time features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/trackex.git
   cd trackex
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your values:
   ```env
   DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-super-secret-key
   OWNER_EMAIL=admin@trackex.com
   OWNER_PASSWORD_HASH=your-hashed-password
   
   # Optional Redis for real-time features
   REDIS_URL=redis://default:password@host:port
   
   # Data retention settings
   DEFAULT_EVENTS_RETENTION_DAYS=90
   DEFAULT_SCREENSHOTS_RETENTION_DAYS=30
   
   # Device authentication
   DEVICE_TOKEN_SECRET=your-device-secret
   ```

4. **Generate password hash**
   ```bash
   node -e "require('bcryptjs').hash('admin123', 12).then(h=>console.log(h.replace(/\$/g, '\\$')))"
   ```
   Copy the output to `OWNER_PASSWORD_HASH` in `.env`

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open http://localhost:3000** in your browser

### Login Credentials

- **Email**: `admin@trackex.com`
- **Password**: `admin123` (or whatever you set when generating the hash)

## 📊 Using the Development Simulator

1. Navigate to **Dev Tools** in the dashboard
2. Create an employee first (or use the API)
3. Select the employee in the simulator
4. Generate test data:
   - **Work Sessions**: Creates realistic work sessions for past days
   - **App Events**: Generates app focus events for analytics
   - **Screenshots**: Creates placeholder screenshot records
5. View the generated data in **Home** and **Live View** pages

### API Usage Examples

Create an employee:
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

Generate test sessions:
```bash
curl -X POST http://localhost:3000/api/dev/simulator \
  -H "Content-Type: application/json" \
  -d '{"action": "generateSessions", "employeeId": "employee-id", "amount": 7}'
```

## 🔄 Real-time Features

The application supports real-time updates through:

1. **WebSocket Server**: For live employee status updates
2. **Redis Integration**: Optional for scaling (falls back to in-memory)
3. **Presence Tracking**: Track online/offline employee status
4. **Live Dashboard**: Real-time activity monitoring

## 📈 Analytics & Reports

- **Home Dashboard**: Overview with productivity metrics
- **Live View**: Real-time employee activity
- **CSV Exports**: Download data for external analysis
- **App Categorization**: Automatic productivity scoring
- **Time Tracking**: Work sessions with idle time detection

## 🛡 Security & RBAC

- **Owner-only Access**: All routes protected with RBAC
- **Device Authentication**: Secure token-based device auth
- **Audit Logging**: Track all administrative actions
- **Password Security**: bcrypt hashing with 12 rounds
- **Environment Protection**: No secrets in codebase

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript check
- `npm test` - Run Vitest unit tests
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXTAUTH_URL` | Application URL | ✅ |
| `NEXTAUTH_SECRET` | NextAuth secret key | ✅ |
| `OWNER_EMAIL` | Owner login email | ✅ |
| `OWNER_PASSWORD_HASH` | Bcrypt hash of owner password | ✅ |
| `REDIS_URL` | Redis connection string | ❌ |
| `DEFAULT_EVENTS_RETENTION_DAYS` | Event retention period | ❌ |
| `DEFAULT_SCREENSHOTS_RETENTION_DAYS` | Screenshot retention period | ❌ |
| `DEVICE_TOKEN_SECRET` | Device authentication secret | ✅ |

## 🏗 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── analytics/     # Analytics endpoints
│   │   ├── employees/     # Employee management
│   │   ├── teams/         # Team management
│   │   ├── policies/      # Policy configuration
│   │   ├── app-rules/     # App categorization
│   │   ├── devices/       # Device registration
│   │   ├── ingest/        # Data ingestion
│   │   ├── live/          # Real-time data
│   │   ├── exports/       # CSV exports
│   │   └── dev/           # Development tools
│   ├── app/               # Protected dashboard
│   │   ├── live/          # Live view page
│   │   ├── employees/     # Employee management
│   │   ├── settings/      # Settings & policies
│   │   └── dev/           # Development tools
│   └── (marketing)/       # Public pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── app/              # Dashboard components
│   ├── layout/           # Layout components
│   └── auth/             # Auth components
├── lib/                   # Utility functions
│   ├── auth/             # Authentication & RBAC
│   ├── audit/            # Audit logging
│   ├── realtime/         # WebSocket & Redis
│   ├── utils/            # Helper functions
│   └── validations/      # Zod schemas
├── prisma/               # Database schema & migrations
├── tests/                # Test files
└── types/                # TypeScript definitions
```

## 🌐 Hetzner Server Deployment

TrackEx is pre-configured to run on a Hetzner server at IP `5.223.54.86`. The desktop app is already configured to connect to this server.

### Initial Deployment
```bash
# Deploy to Hetzner server (first time setup)
./deploy-to-hetzner.sh
```

### Quick Updates
```bash
# Update existing installation
./deploy-update.sh
```

### Manual Server Management
```bash
# SSH into the server
ssh root@5.223.54.86

# Check PM2 status
pm2 status

# View logs
pm2 logs trackex

# Restart service
pm2 restart trackex
```

### Server Information
- **IP Address**: `5.223.54.86`
- **Web Interface**: `http://5.223.54.86:3000`
- **Desktop App**: Pre-configured to use this server
- **Process Manager**: PM2 for production stability

### Local Development (Optional)
```bash
# Run development server locally
./start-dev-server.sh
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Docker

```bash
# Build image
docker build -t trackex .

# Run container
docker run -p 3000:3000 --env-file .env trackex
```

## 📋 Phase 3 Roadmap

- **Desktop Agents**: Native macOS/Windows tracking applications
- **Screenshot Capture**: Automated screenshot functionality
- **Advanced Analytics**: Detailed productivity reports
- **Team Insights**: Manager dashboard with team analytics
- **Integrations**: Slack, Teams, calendar integrations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

Found a bug? Please create an issue on [GitHub](https://github.com/your-username/trackex/issues).

---

Built with ❤️ for teams that value productivity and transparency.