#!/bin/bash
set -e

echo "🚀 Starting Deployment Process..."

# Pull latest code
echo "📦 Pulling latest changes from Git..."
git pull

# Compile and start containers
echo "🏗️ Building and starting Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

# Run database migrations
echo "🗄️ Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy

echo "✅ Deployment completed successfully!"
