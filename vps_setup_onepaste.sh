#!/bin/bash
set -e
echo ">>> Starting setup..."

# 1. System update + packages
apt-get update -y
apt-get install -y git curl nano ca-certificates gnupg

# 2. Install Docker (official method - works on Ubuntu 24.04)
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
echo ">>> Docker ready"

# 3. Clone repo
rm -rf /opt/app
git clone https://github.com/jassi2019/IOS-APP.git /opt/app
cd /opt/app
echo ">>> Repo cloned"

# 4. Create backend .env
cat > /opt/app/backend-main/.env << 'ENVEOF'
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=7aec2989a427cad7ab0bedcab0642f64
DB_NAME=education_app
JWT_SECRET=cf0f0fb46a034df64c1e5b706e45028c9f20a363c00657cd977ceebf0981edc86a3f9966d0ce06bc859a369e40c43458
RAZORPAY_KEY_ID=rzp_live_RhvQOAzK6nNUQm
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET_KEY_HERE
APPLE_SHARED_SECRET=YOUR_APPLE_SHARED_SECRET_HERE
APPLE_BUNDLE_ID=com.taiyarineetki.educationapp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=jkaur460468@gmail.com
SMTP_PASSWORD=ltaumymiqnvtcgxm
SMTP_FROM=jkaur460468@gmail.com
SMTP_TIMEOUT_MS=10000
CANVA_AUTH_REDIRECT_URI=https://api.taiyarineetki.com/api/v1/canva/oauth/redirect
SWAGGER_HOST=api.taiyarineetki.com
DEVELOPER_EMAILS=jkaur460468@gmail.com
ALLOW_DEV_OTP=false
ENVEOF
echo ">>> .env created"

# 5. Create docker-compose.prod.yml
cat > /opt/app/docker-compose.prod.yml << 'COMPOSEEOF'
services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: education_app
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 7aec2989a427cad7ab0bedcab0642f64
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend-main
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - ./backend-main/.env
    networks:
      - app_network

  portal:
    build:
      context: ./portal-main
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://api.taiyarineetki.com
    restart: unless-stopped
    networks:
      - app_network

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - app_network
    depends_on:
      - backend
      - portal

networks:
  app_network:
    driver: bridge

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
COMPOSEEOF
echo ">>> docker-compose.prod.yml created"

# 6. Create Caddyfile
cat > /opt/app/Caddyfile << 'CADDYEOF'
api.taiyarineetki.com {
    reverse_proxy backend:8000
}

admin.taiyarineetki.com {
    reverse_proxy portal:3000
}
CADDYEOF
echo ">>> Caddyfile created"

# 7. Build and start everything
cd /opt/app
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo ">>> Waiting 40 seconds for services to start..."
sleep 40

docker compose -f docker-compose.prod.yml ps

echo ""
echo "========================================"
echo "  SETUP COMPLETE!"
echo "  Admin: https://admin.taiyarineetki.com"
echo "  API:   https://api.taiyarineetki.com"
echo "========================================"
