#!/bin/bash

# First Time Deployment Script
# Run this from your local machine

# === CONFIGURATION ===
SERVER_IP="46.62.193.56"  # Change this!
SERVER_USER="deploy"  # Using deploy user, not root
PROJECT_NAME="trackex"
REMOTE_DIR="/home/$SERVER_USER/$PROJECT_NAME"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 TrackEx First Time Deployment"
echo "================================="
echo "Server: $SERVER_IP"
echo "User: $SERVER_USER"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Error: .env.production not found${NC}"
    echo "Please create .env.production first!"
    exit 1
fi

# Build the project locally
echo -e "${GREEN}🔨 Building project locally...${NC}"
npm run build || {
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
}

# Create deployment package
echo -e "${GREEN}📦 Creating deployment package...${NC}"
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

echo -e "${GREEN}📤 Uploading to server...${NC}"
scp trackex-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/
scp .env.production $SERVER_USER@$SERVER_IP:/tmp/

echo -e "${GREEN}🔧 Installing on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Create project directory
mkdir -p /home/deploy/trackex
cd /home/deploy/trackex

# Extract deployment
echo "Extracting application..."
tar -xzf /tmp/trackex-deploy.tar.gz

# Move environment file
mv /tmp/.env.production .env.production
chmod 600 .env.production

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF2'
module.exports = {
  apps: [{
    name: 'trackex',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
EOF2

# Create logs directory
mkdir -p /home/deploy/logs

# Start with PM2
echo "Starting application..."
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
pm2 startup systemd -u deploy --hp /home/deploy | grep 'sudo' | bash

# Install PM2 log rotate
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30

# Clean up
rm /tmp/trackex-deploy.tar.gz

echo ""
echo "✅ Deployment complete!"
echo "📊 Application Status:"
pm2 status
ENDSSH

# Clean up local
rm trackex-deploy.tar.gz

echo ""
echo -e "${GREEN}🎉 First Time Deployment Complete!${NC}"
echo ""
echo "🔗 Your application is running at:"
echo "   http://$SERVER_IP:3000"
echo ""
echo "📋 Next steps:"
echo "1. Test the application: curl http://$SERVER_IP:3000"
echo "2. Setup Nginx reverse proxy (see below)"
echo "3. Setup SSL certificate"
echo "4. Test desktop agent connection"
echo ""
echo "📝 Useful commands:"
echo "   Status: ssh $SERVER_USER@$SERVER_IP 'pm2 status'"
echo "   Logs:   ssh $SERVER_USER@$SERVER_IP 'pm2 logs trackex'"
echo "   Restart: ssh $SERVER_USER@$SERVER_IP 'pm2 restart trackex'"
echo ""
