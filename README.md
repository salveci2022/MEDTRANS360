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
