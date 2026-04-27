#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Taiyari NEET Ki - VPS One-Click Setup
# Run on VPS: bash deploy.sh
# ═══════════════════════════════════════════════════════════════
set -e

echo "============================================"
echo "  Taiyari NEET Ki - Starting VPS Setup"
echo "============================================"

# Step 1: System update
echo "[1/5] Updating system..."
apt-get update -y && apt-get upgrade -y
apt-get install -y git curl nano

# Step 2: Install Docker
echo "[2/5] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi
apt-get install -y docker-compose-plugin
echo "Docker ready."

# Step 3: Check env file
echo "[3/5] Checking config..."
if grep -q "YOUR_RAZORPAY_SECRET_KEY_HERE" /opt/app/backend-main/.env; then
    echo ""
    echo "  ⚠️  WARNING: Razorpay Secret Key still not set!"
    echo "  Edit: nano /opt/app/backend-main/.env"
    echo "  Fill: RAZORPAY_KEY_SECRET=..."
    echo ""
fi

# Step 4: Build and start
echo "[4/5] Building and starting all services..."
cd /opt/app
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build

# Step 5: Status
echo "[5/5] Checking status..."
sleep 20
docker compose -f docker-compose.prod.yml ps

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "  Admin Portal: https://admin.taiyarineetki.com"
echo "  Backend API:  https://api.taiyarineetki.com"
echo ""
echo "  View logs: docker compose -f docker-compose.prod.yml logs -f"
echo ""
