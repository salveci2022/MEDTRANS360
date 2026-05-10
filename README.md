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
