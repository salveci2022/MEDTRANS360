<<<<<<< HEAD
# 🚑 MEDTRANS 360 — Plataforma de Transporte de Pacientes

**Versão 1.0 PRO** | SpyNet Tecnologia Forense | CNPJ: 64.000.808/0001-51

---

## 📋 Sobre o Sistema

Plataforma SaaS completa para empresas de transporte de pacientes, clínicas, hospitais e operadoras de saúde. Gerenciamento de corridas, motoristas, pacientes, financeiro e relatórios em uma única plataforma.

## 🚀 Funcionalidades

- **Dashboard** com métricas em tempo real
- **Gestão de corridas** — criar, iniciar, finalizar, cancelar
- **Cadastro de pacientes** com necessidades especiais
- **Controle de motoristas** com status online/offline
- **Cadastro de clínicas** vinculadas ao sistema
- **Controle financeiro** — faturamento, despesas, lucro, custo/km
- **Relatório PDF** por corrida e mensal com visual premium
- **Exportação Excel** com todos os dados
- **Autenticação segura** com RBAC por perfil
- **PWA** — instala no celular sem app store

## ⚙️ Setup Local

```bash
git clone https://github.com/salveci2022/MEDTRANS360.git
cd MEDTRANS360
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edite o .env com suas configurações
python app.py
```

## 🌐 Deploy no Render

1. Push para o GitHub
2. Render → Web Service → conectar repositório
3. **Build:** `pip install -r requirements.txt`
4. **Start:** `gunicorn -c gunicorn.conf.py app:app`
5. Configurar variáveis de ambiente (ver `.env.example`)

## 🔑 Acesso Padrão

| Perfil | Email | Senha |
|--------|-------|-------|
| Master Admin | admin@medtrans360.com.br | Admin@2025! |

**⚠️ Troque a senha no primeiro acesso!**

## 💰 Planos Comerciais

| Plano | Preço | Clínicas | Motoristas |
|-------|-------|----------|-----------|
| Starter | R$147/mês | 1 | Até 3 |
| Profissional | R$297/mês | Até 5 | Ilimitado |
| Enterprise | R$597/mês | Ilimitado | Ilimitado |

## 📞 Contato

- **WhatsApp:** (61) 99396-2090
- **Email:** spynetintelligence@proton.me
- **CNPJ:** 64.000.808/0001-51

---
*MEDTRANS 360 © 2025 SpyNet Tecnologia Forense — Todos os direitos reservados*
=======
# TransportSaaS

**SaaS multi-tenant para gestão de transporte de pacientes** para clínicas, hospitais e empresas terceirizadas.

## Funcionalidades

- **Multi-tenant** — múltiplas empresas com dados totalmente isolados
- **Planos com limites** — FREE (5 users/10 veículos), Starter, Profissional, Enterprise
- **Motoristas** — cadastro, CNH, status, vínculo com veículo
- **Veículos** — frota, quilometragem, combustível, manutenção
- **Pacientes** — cadastro, vínculo com clínica
- **Clínicas** — endereço, contato, histórico
- **Corridas** — agendamento, status em tempo real, custos, distância
- **Combustível** — controle de abastecimentos, custo por litro
- **Relatórios** — dashboards, gráficos de corridas e custos
- **Autenticação** — Email + Senha, Magic Link por email, 2FA TOTP

## Stack

| Tecnologia | Uso |
|-----------|-----|
| Next.js 14 (App Router) | Frontend + API |
| TypeScript | Tipagem |
| Prisma ORM | Acesso ao banco |
| PostgreSQL | Banco de dados |
| shadcn/ui + Tailwind CSS | UI |
| JWT + Cookies HTTP-only | Sessões |
| otplib | 2FA TOTP |
| Nodemailer | Emails |
| recharts | Gráficos |
| react-hook-form + Zod | Formulários |

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# edite o .env

# 3. Configurar banco
npm run db:push

# 4. Popular com dados de exemplo
npm run db:seed

# 5. Instalar componentes UI
npx shadcn@latest init
npx shadcn@latest add button input label card badge dialog form select separator toast avatar

# 6. Rodar
npm run dev
```

## Credenciais de demo (após seed)

```
Email:  admin@demo.com
Senha:  admin123456
```

## Documentação

- [Instalação detalhada](./docs/INSTALLATION.md)
- [Deploy em produção](./docs/DEPLOY.md)
- [API Reference](./docs/API.md)

## Estrutura do banco (Prisma)

```
Organization (empresa/tenant)
  ├── User (usuários: ADMIN, MANAGER, OPERATOR, DRIVER)
  ├── Vehicle (veículos da frota)
  ├── Driver (motoristas, vínculo com veículo)
  ├── Patient (pacientes)
  ├── Clinic (clínicas/hospitais de destino)
  ├── Trip (corridas: agendadas, em andamento, concluídas)
  │   └── GpsLog (logs de GPS por corrida)
  ├── FuelRecord (registros de abastecimento)
  └── Subscription (assinatura/plano ativo)
```

## Scripts disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run start        # Iniciar produção
npm run db:push      # Aplicar schema (sem migrations)
npm run db:migrate   # Criar migration
npm run db:studio    # Prisma Studio (visualizar banco)
npm run db:seed      # Popular banco com dados de exemplo
npm run db:reset     # Resetar banco (CUIDADO: apaga tudo)
```

## Licença

MIT
>>>>>>> bfab080ae7030946297b40c9b9571d7c1a1b0732
