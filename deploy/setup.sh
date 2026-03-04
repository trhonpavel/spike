#!/bin/bash
set -euo pipefail

echo "=== Spike deployment setup ==="

# 1. Clone repo
if [ ! -d /opt/spike ]; then
    git clone https://github.com/trhonpavel/spike.git /opt/spike
else
    cd /opt/spike && git pull origin master
fi
cd /opt/spike

# 2. Create .env if missing
if [ ! -f .env ]; then
    PASS=$(openssl rand -base64 24)
    cat > .env <<EOF
POSTGRES_DB=spike
POSTGRES_USER=spike
POSTGRES_PASSWORD=${PASS}
DATABASE_URL=postgresql+asyncpg://spike:${PASS}@db:5432/spike
ALLOWED_ORIGINS=https://spike.trhon.net
EOF
    echo "Created .env with generated password"
else
    echo ".env already exists, skipping"
fi

# 3. Pull images and start
COMPOSE="docker compose"
command -v docker &>/dev/null || COMPOSE="podman-compose"
$COMPOSE pull
$COMPOSE up -d
echo "Containers started"

# 4. Nginx vhost
cp deploy/spike.nginx.conf /etc/nginx/sites-available/spike.conf
ln -sf /etc/nginx/sites-available/spike.conf /etc/nginx/sites-enabled/spike.conf
nginx -t && systemctl reload nginx
echo "Nginx configured"

# 5. SSL
echo "Setting up SSL..."
certbot --nginx -d spike.trhon.net --non-interactive --agree-tos --email pavel@trhon.net
echo ""
echo "=== Done! Spike is live at https://spike.trhon.net ==="
