# Instalação — TransportSaaS

## Pré-requisitos

| Ferramenta | Versão mínima |
|-----------|---------------|
| Node.js   | 20.x          |
| npm       | 10.x          |
| PostgreSQL | 15.x         |

---

## 1. Clonar e instalar dependências

```bash
# Entrar na pasta do projeto
cd transport-saas

# Instalar dependências
npm install
```

---

## 2. Configurar variáveis de ambiente

```bash
# Copiar o arquivo de exemplo
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Banco de dados
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/transport_saas"

# Segredo JWT (mínimo 32 caracteres, aleatório)
JWT_SECRET="gere-uma-string-aleatoria-de-pelo-menos-32-caracteres-aqui"

# URL da aplicação
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="TransportSaaS"

# Email SMTP (Gmail exemplo)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app-google"
EMAIL_FROM="TransportSaaS <noreply@seudominio.com>"
```

### Gerar JWT_SECRET seguro

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Configurar senha de app do Gmail

1. Acesse sua conta Google > Segurança
2. Ative a Verificação em 2 etapas
3. Crie uma **Senha de app** para "Mail"
4. Use essa senha no campo `SMTP_PASS`

---

## 3. Configurar banco de dados

### Criar banco no PostgreSQL

```sql
CREATE DATABASE transport_saas;
CREATE USER transport_user WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE transport_saas TO transport_user;
```

### Aplicar o schema Prisma

```bash
# Criar e aplicar as migrações
npm run db:push

# OU usando migrations (recomendado para produção)
npm run db:migrate
```

---

## 4. Popular o banco com dados de exemplo (opcional)

```bash
npm run db:seed
```

Isso cria:
- **Organização:** Clínica Demo Transportes
- **Usuário admin:** `admin@demo.com` / senha: `admin123456`
- 2 veículos, 2 motoristas, 2 clínicas, 2 pacientes e 1 corrida de exemplo

---

## 5. Instalar componentes shadcn/ui

```bash
# Inicializar shadcn (selecione Default, Slate, CSS variables: yes)
npx shadcn@latest init

# Instalar componentes necessários
npx shadcn@latest add button input label card badge dialog form select separator toast avatar dropdown-menu tabs progress
```

---

## 6. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## Estrutura de pastas

```
transport-saas/
├── prisma/
│   ├── schema.prisma       # Schema completo do banco
│   └── seed.ts             # Dados de exemplo
├── src/
│   ├── app/
│   │   ├── (auth)/         # Páginas de autenticação
│   │   ├── (dashboard)/    # Páginas do dashboard
│   │   └── api/            # API Routes REST
│   ├── components/         # Componentes React
│   ├── lib/                # Utilitários (auth, prisma, email)
│   ├── types/              # Types TypeScript
│   └── middleware.ts       # Proteção de rotas
└── docs/                   # Documentação
```

---

## Problemas comuns

### `prisma generate` não encontrado
```bash
npx prisma generate
```

### Erro de conexão com banco
Verifique se o PostgreSQL está rodando e a `DATABASE_URL` está correta.

### Erro de SMTP
Para Gmail, use **Senha de app**, não a senha normal da conta.
