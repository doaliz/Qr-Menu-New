# QR Menü Yönetim Sistemi - Kendi Sunucunuzda Kurulum Rehberi

## 📋 Gereksinimler

### Sunucu Gereksinimleri
- **İşletim Sistemi:** Ubuntu 20.04+ veya CentOS 8+
- **RAM:** Minimum 2GB (önerilen 4GB)
- **CPU:** 2 vCPU
- **Disk:** 20GB SSD

### Yazılım Gereksinimleri
- **Python:** 3.10+
- **Node.js:** 18+ 
- **MongoDB:** 6.0+
- **Nginx:** (reverse proxy için)

---

## 🔧 Kurulum Adımları

### 1. Kodu İndirin

**GitHub üzerinden:**
```bash
# Emergent'te "Save to GitHub" yaptıktan sonra
git clone https://github.com/KULLANICI_ADINIZ/REPO_ADI.git
cd REPO_ADI
```

### 2. MongoDB Kurulumu

```bash
# Ubuntu için
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 3. Backend Kurulumu

```bash
cd backend

# Virtual environment oluştur
python3 -m venv venv
source venv/bin/activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# .env dosyasını oluştur
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=qrmenu
JWT_SECRET=GUCLU_BIR_SECRET_KEY_OLUSTURUN
SUPER_ADMIN_EMAIL=admin@sizindomain.com
EOF
```

### 4. Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükle
yarn install
# veya
npm install

# .env dosyasını oluştur
cat > .env << EOF
REACT_APP_BACKEND_URL=https://api.sizindomain.com
EOF

# Production build oluştur
yarn build
# veya
npm run build
```

---

## 🚀 Çalıştırma

### Geliştirme Ortamı

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend:**
```bash
cd frontend
yarn start
```

### Production Ortamı

#### Backend için systemd servisi oluşturun:

```bash
sudo nano /etc/systemd/system/qrmenu-backend.service
```

```ini
[Unit]
Description=QR Menu Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/qrmenu/backend
Environment="PATH=/var/www/qrmenu/backend/venv/bin"
ExecStart=/var/www/qrmenu/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start qrmenu-backend
sudo systemctl enable qrmenu-backend
```

#### Nginx Konfigürasyonu:

```bash
sudo nano /etc/nginx/sites-available/qrmenu
```

```nginx
# Frontend
server {
    listen 80;
    server_name sizindomain.com www.sizindomain.com;
    
    root /var/www/qrmenu/frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.sizindomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/qrmenu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL Sertifikası (Let's Encrypt):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d sizindomain.com -d www.sizindomain.com -d api.sizindomain.com
```

---

## 📁 Dosya Yapısı

```
/var/www/qrmenu/
├── backend/
│   ├── server.py          # Ana FastAPI uygulaması
│   ├── requirements.txt   # Python bağımlılıkları
│   ├── .env               # Ortam değişkenleri
│   └── venv/              # Python sanal ortam
├── frontend/
│   ├── src/               # React kaynak kodları
│   ├── build/             # Production build
│   ├── package.json       # Node.js bağımlılıkları
│   └── .env               # Frontend ortam değişkenleri
└── uploads/               # Yüklenen dosyalar
```

---

## ⚙️ Ortam Değişkenleri

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=qrmenu
JWT_SECRET=cok_guclu_rastgele_bir_key
SUPER_ADMIN_EMAIL=admin@sizindomain.com

# PayTR entegrasyonu için (opsiyonel)
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://api.sizindomain.com
```

---

## 🔒 Güvenlik Kontrol Listesi

- [ ] JWT_SECRET güçlü ve rastgele olmalı (32+ karakter)
- [ ] MongoDB'ye dışarıdan erişim kapalı olmalı
- [ ] SSL sertifikası kurulmalı
- [ ] Firewall ayarları yapılmalı (sadece 80, 443 portları açık)
- [ ] .env dosyaları git'e eklenmemeli
- [ ] Regular backup planı oluşturulmalı

---

## 🐳 Docker ile Kurulum (Alternatif)

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    volumes:
      - mongo_data:/data/db
    restart: always

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=qrmenu
      - JWT_SECRET=${JWT_SECRET}
      - SUPER_ADMIN_EMAIL=${SUPER_ADMIN_EMAIL}
    depends_on:
      - mongodb
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: always

volumes:
  mongo_data:
```

```bash
docker-compose up -d
```

---

## 📞 Destek

Sorularınız için: [Email adresiniz]

---

## 📝 Notlar

- İlk kurulumda super admin hesabı oluşturmak için `SUPER_ADMIN_EMAIL` ile kayıt olun
- Uploads klasörü için yazma izinleri gerekli: `chmod 755 uploads`
- MongoDB backup: `mongodump --db qrmenu --out /backup/$(date +%Y%m%d)`
