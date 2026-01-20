#!/bin/bash

# TrackEx Hetzner Server Deployment Script
# Deploy TrackEx to Hetzner server at 5.223.54.86

SERVER_IP="5.223.54.86"
SERVER_USER="root"
PROJECT_NAME="trackex"
REMOTE_DIR="/opt/$PROJECT_NAME"

echo "🚀 Deploying TrackEx to Hetzner Server..."
echo "📡 Server: $SERVER_IP"
echo "👤 User: $SERVER_USER"
echo ""

# Build the project locally
echo "🔨 Building project locally..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf trackex-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.next/cache \
  --exclude=desktop-agent \
  --exclude=tests \
  --exclude=playwright-report \
  --exclude=test-results \
  --exclude="*.log" \
  .

echo "📤 Uploading to server..."
scp trackex-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

echo "🔧 Installing on server..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
# Install Node.js and npm if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Create project directory
mkdir -p /opt/trackex
cd /opt/trackex

# Extract new version
tar -xzf /tmp/trackex-deploy.tar.gz

# Install dependencies
echo "Installing dependencies..."
npm ci --only=production

# Setup environment
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp env.hetzner.example .env
    echo "⚠️  Please edit /opt/trackex/.env with your actual values!"
    echo "💡 Generate password hash with: node -e \"require('bcryptjs').hash('admin123', 12).then(h=>console.log(h.replace(/\\\$/g, '\\\\\\\$')))\""
fi

# Run database migrations
echo "Running database migrations..."
npx prisma generate
npx prisma migrate deploy

# Stop existing PM2 process if running
pm2 stop trackex 2>/dev/null || true
pm2 delete trackex 2>/dev/null || true

# Start with PM2
echo "Starting TrackEx with PM2..."
pm2 start npm --name "trackex" -- run start:server
pm2 save
pm2 startup

# Setup firewall
echo "Configuring firewall..."
ufw allow 3000/tcp
ufw allow ssh

echo "✅ Deployment complete!"
echo "🌐 TrackEx is now running at: http://5.223.54.86:3000"
echo "📊 PM2 status: pm2 status"
echo "📋 PM2 logs: pm2 logs trackex"
EOF

# Clean up
rm trackex-deploy.tar.gz

echo ""
echo "🎉 Deployment finished!"
echo "🌐 Your TrackEx server is available at: http://$SERVER_IP:3000"
echo "📱 Desktop app is pre-configured to connect to this server"
echo ""
echo "Next steps:"
echo "1. Edit /opt/trackex/.env on the server with your actual values"
echo "2. Restart the service: ssh $SERVER_USER@$SERVER_IP 'cd /opt/trackex && pm2 restart trackex'"
echo "3. Monitor with: ssh $SERVER_USER@$SERVER_IP 'pm2 logs trackex'"
