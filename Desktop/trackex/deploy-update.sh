#!/bin/bash

# TrackEx Quick Update Deployment Script
# Quick update to existing Hetzner server installation
# Run this from your local machine

# === CONFIGURATION ===
SERVER_IP="46.62.193.56"
SERVER_USER="deploy"
PROJECT_NAME="trackex"
REMOTE_DIR="/home/$SERVER_USER/$PROJECT_NAME"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 TrackEx Update Deployment${NC}"
echo "================================="
echo "Server: $SERVER_IP"
echo "User: $SERVER_USER"
echo ""

# Build the project locally
echo -e "${GREEN}🔨 Building project locally...${NC}"
npm run build || {
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
}

# Create deployment package
echo -e "${GREEN}📦 Creating deployment package...${NC}"
tar -czf trackex-update.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.next/cache \
  --exclude=desktop-agent \
  --exclude=tests \
  --exclude=playwright-report \
  --exclude=test-results \
  --exclude=deploy-update.sh \
  --exclude=deploy-first-time.sh \
  --exclude=.env.production \
  --exclude="*.log" \
  .

echo -e "${GREEN}📤 Uploading to server...${NC}"
scp trackex-update.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

echo -e "${GREEN}🔄 Updating server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /home/deploy/trackex

# Stop the service
echo "Stopping application..."
pm2 stop trackex

# Backup current .env.production
echo "Backing up environment file..."
cp .env.production .env.production.backup

# Extract new version
echo "Extracting update..."
tar -xzf /tmp/trackex-update.tar.gz

# Restore .env.production
cp .env.production.backup .env.production

# Install any new dependencies
echo "Installing dependencies..."
npm ci --production

# Run database migrations
echo "Running database migrations..."
npx prisma generate
npx prisma migrate deploy

# Restart the service
echo "Restarting application..."
pm2 restart trackex

# Clean up
rm /tmp/trackex-update.tar.gz

echo ""
echo "✅ Update complete!"
echo ""
echo "📊 Application Status:"
pm2 status
ENDSSH

# Clean up local
rm trackex-update.tar.gz

echo ""
echo -e "${GREEN}🎉 Update Deployment Complete!${NC}"
echo ""
echo "🔗 Your application is running at:"
echo "   http://$SERVER_IP:3000"
echo ""
echo "📝 Useful commands:"
echo "   Status:  ssh $SERVER_USER@$SERVER_IP 'pm2 status'"
echo "   Logs:    ssh $SERVER_USER@$SERVER_IP 'pm2 logs trackex'"
echo "   Restart: ssh $SERVER_USER@$SERVER_IP 'pm2 restart trackex'"
echo ""

