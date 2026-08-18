#!/usr/bin/env bash
# ATC Projects — one-shot deploy on this VPS (run as ubuntu/debian via OVH KVM console)
set -euo pipefail

APP_DIR=/var/www/atc-projects
REPO=https://github.com/bahaeddinOs56/ATC-Projects.git
PORT=3002
DOMAIN="atc-projects.51.77.210.92.sslip.io"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-atcadmin2024}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 24)}"

echo "==> Installing deps if needed"
command -v node >/dev/null || { curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; sudo apt-get install -y nodejs; }
command -v nginx >/dev/null || sudo apt-get update && sudo apt-get install -y nginx
command -v pm2 >/dev/null || sudo npm i -g pm2
command -v certbot >/dev/null || sudo apt-get install -y certbot python3-certbot-nginx

echo "==> App files"
sudo mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  sudo git -C "$APP_DIR" fetch origin
  sudo git -C "$APP_DIR" reset --hard origin/master
else
  sudo rm -rf "$APP_DIR"
  sudo git clone "$REPO" "$APP_DIR"
fi
sudo chown -R "$USER:$USER" "$APP_DIR"
cd "$APP_DIR"
npm install --omit=dev

echo "==> Env"
cat > "$APP_DIR/.env" <<EOF
PORT=$PORT
NODE_ENV=production
ADMIN_PASSWORD=$ADMIN_PASSWORD
SESSION_SECRET=$SESSION_SECRET
EOF

# load env for pm2 via ecosystem
cat > "$APP_DIR/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [{
    name: "atc-projects",
    script: "server.js",
    cwd: "$APP_DIR",
    env: {
      PORT: "$PORT",
      NODE_ENV: "production",
      ADMIN_PASSWORD: "$ADMIN_PASSWORD",
      SESSION_SECRET: "$SESSION_SECRET",
    },
  }],
};
EOF

echo "==> PM2"
pm2 delete atc-projects 2>/dev/null || true
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || true

echo "==> Nginx"
sudo tee /etc/nginx/sites-available/atc-projects >/dev/null <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN;

  client_max_body_size 10m;

  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
sudo ln -sfn /etc/nginx/sites-available/atc-projects /etc/nginx/sites-enabled/atc-projects
sudo nginx -t
sudo systemctl reload nginx

echo "==> SSL (Let's Encrypt)"
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo "Certbot failed (sslip.io sometimes flaky) — HTTP still works on http://$DOMAIN"
}

echo
echo "DONE"
echo "Site : https://$DOMAIN  (or http:// if SSL failed)"
echo "Admin: https://$DOMAIN/admins"
echo "Pass : $ADMIN_PASSWORD"
echo "Change ADMIN_PASSWORD later in $APP_DIR/ecosystem.config.cjs then: pm2 restart atc-projects"
