# Deploy — TransportSaaS

## Opção 1: Vercel + Neon (Recomendado — gratuito para começar)

### 1. Configurar banco de dados Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta
2. Crie um novo projeto
3. Copie a **Connection String** (postgres://...)

### 2. Deploy na Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer deploy
vercel

# Configurar variáveis de ambiente
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXT_PUBLIC_APP_URL  # https://seu-app.vercel.app
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add EMAIL_FROM
```

### 3. Aplicar schema no banco de produção

```bash
# Configurar DATABASE_URL temporariamente
export DATABASE_URL="sua-url-do-neon"

# Aplicar schema
npx prisma db push
```

### 4. Deploy final

```bash
vercel --prod
```

---

## Opção 2: VPS (Ubuntu 22.04) com Docker

### docker-compose.yml

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/transport_saas
      JWT_SECRET: ${JWT_SECRET}
      NEXT_PUBLIC_APP_URL: https://seudominio.com
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      EMAIL_FROM: ${EMAIL_FROM}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: transport_saas
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Deploy

```bash
# Na VPS
git clone <seu-repo>
cd transport-saas
cp .env.example .env
# Edite o .env com suas variáveis

docker-compose up -d

# Aplicar schema
docker-compose exec app npx prisma db push

# Seed (opcional)
docker-compose exec app npm run db:seed
```

---

## Opção 3: Railway

1. Acesse [railway.app](https://railway.app)
2. **New Project** → Deploy from GitHub repo
3. Adicione um **PostgreSQL plugin**
4. Configure as variáveis de ambiente no painel
5. Railway faz o build e deploy automaticamente

---

## Configurar domínio personalizado

### Vercel
1. Acesse seu projeto → Settings → Domains
2. Adicione seu domínio
3. Configure o DNS conforme instruído

### Nginx (VPS)

```nginx
server {
    server_name seudominio.com www.seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
}

server {
    listen 80;
    server_name seudominio.com www.seudominio.com;
    return 301 https://$host$request_uri;
}
```

```bash
# Certificado SSL gratuito
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

---

## Checklist pré-produção

- [ ] `JWT_SECRET` com no mínimo 64 caracteres aleatórios
- [ ] `DATABASE_URL` aponta para banco de produção
- [ ] `NEXT_PUBLIC_APP_URL` com URL real (https)
- [ ] SMTP configurado e testado
- [ ] Schema aplicado (`prisma db push` ou `prisma migrate deploy`)
- [ ] Backup automático do banco configurado
- [ ] SSL/HTTPS ativo
- [ ] Variáveis de ambiente nunca commitadas no git
