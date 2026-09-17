# PDF Editor — Free Hosting Plan

## Overview

Host the PDF Editor (static frontend + stateless Java backend) for **$0/month**. No database, no file storage needed — the app processes PDFs in-memory and keeps everything in the user's browser.

### Architecture Options

| Criteria | Oracle Cloud (Recommended) | Render + Cloudflare Pages |
|---|---|---|
| RAM | 12 GB | 512 MB |
| Cold starts | None (always on) | 15s+ spin-up after idle |
| Code changes | 0 (just deploy) | 0 (just deploy) |
| Cost | $0 forever | $0 but tight limits |
| Complexity | One VM, everything together | Two services, simpler deploys |

---

## Architecture

```
[nginx :443 (Let's Encrypt SSL)]
  ├── /              → static files (frontend/dist)
  └── /api/*         → proxy_pass to Spring Boot :8080
                          └── stateless PDF processing (no DB, no storage)
```

The backend is purely stateless — it receives PDF bytes, processes them with PDFBox/POI, and returns the result. No database, no file storage, no authentication.

---

## Option A: Oracle Cloud Always Free (Recommended)

### Step 1: Create Oracle Cloud Account

1. Go to cloud.oracle.com and sign up (credit card for verification only, never charged)
2. You get: 2 OCPUs + 12 GB RAM ARM VM, 200 GB disk — Always Free

### Step 2: Provision the VM

1. **Compute > Instances > Create Instance**
   - Image: Ubuntu 22.04 Aarch64
   - Shape: VM.Standard.A1.Flex (2 OCPUs, 12 GB RAM)
   - Add your SSH key
2. Open ports 80 and 443 in security list

### Step 3: Server Setup

```bash
ssh ubuntu@<VM_IP>

# Java 21
sudo apt update && sudo apt upgrade -y
sudo apt install -y openjdk-21-jdk-headless

# nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Tesseract OCR (optional, for OCR features)
sudo apt install -y tesseract-ocr tesseract-ocr-eng
```

### Step 4: Deploy

Build locally and upload:
```bash
# Backend
cd backend && ./mvnw clean package -DskipTests -B
scp target/*.jar ubuntu@<VM_IP>:/home/ubuntu/app.jar

# Frontend
cd frontend && npm run build
scp -r dist/* ubuntu@<VM_IP>:/var/www/pdf-editor/
```

Create systemd service:
```bash
sudo tee /etc/systemd/system/pdf-editor.service <<'EOF'
[Unit]
Description=PDF Editor Backend
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/bin/java -Xms512m -Xmx4g -jar /home/ubuntu/app.jar
Environment=SPRING_PROFILES_ACTIVE=prod
Environment=CORS_ORIGINS=https://your-domain.com
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now pdf-editor
```

Configure nginx:
```bash
sudo tee /etc/nginx/sites-available/pdf-editor <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/pdf-editor;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 210M;
        proxy_read_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/pdf-editor /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d your-domain.com
```

### Step 5: Security Hardening

```bash
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable
sudo apt install -y unattended-upgrades
```

---

## Option B: Render + Cloudflare Pages (PaaS)

Simpler deploys, but 512 MB RAM on Render is tight for Java.

| Component | Service | Free Tier |
|---|---|---|
| Frontend | Cloudflare Pages | Unlimited |
| Backend | Render | 512 MB RAM, auto-sleeps |

### Frontend: Cloudflare Pages
1. Connect GitHub repo
2. Build command: `cd frontend && npm run build`
3. Output directory: `frontend/dist`

### Backend: Render
1. New Web Service, connect repo
2. Build: `cd backend && ./mvnw clean package -DskipTests -B`
3. Start: `java -Xms256m -Xmx400m -jar backend/target/*.jar`
4. Env vars: `CORS_ORIGINS=https://your-site.pages.dev`, `SPRING_PROFILES_ACTIVE=prod`

**Note:** With 512 MB RAM, reduce `max-file-size` to 50 MB to avoid OOM. The backend sleeps after 15 min of inactivity and has ~15s cold start.

---

## CI/CD

The `.github/workflows/ci.yml` includes a deploy job. Set these GitHub secrets:

| Secret | Value |
|---|---|
| `OCI_SSH_KEY` | VM private SSH key |
| `OCI_HOST` | VM public IP |
| `OCI_USER` | `ubuntu` |

---

## Quick Reference

```bash
# Check status
sudo systemctl status pdf-editor

# View logs
journalctl -u pdf-editor -f --no-pager

# Restart
sudo systemctl restart pdf-editor

# Redeploy backend
sudo systemctl stop pdf-editor
cp ~/app-new.jar ~/app.jar
sudo systemctl start pdf-editor

# Update frontend
sudo cp -r ~/frontend-dist/* /var/www/pdf-editor/
```
