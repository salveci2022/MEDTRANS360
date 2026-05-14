# API Reference — TransportSaaS

Todos os endpoints (exceto autenticação) requerem o cookie `auth-token` com um JWT válido.

Base URL: `https://seudominio.com/api`

---

## Autenticação

### POST /api/auth/register
Criar nova organização e usuário administrador.

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "password": "minimo8chars",
  "organizationName": "Empresa de Transportes LTDA",
  "organizationCnpj": "00.000.000/0001-00"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "cuid...",
    "email": "joao@empresa.com",
    "name": "João Silva",
    "role": "ADMIN",
    "organizationId": "cuid...",
    "organizationName": "Empresa de Transportes LTDA"
  }
}
```

---

### POST /api/auth/login
Login com email e senha.

**Body:**
```json
{
  "email": "joao@empresa.com",
  "password": "minimo8chars"
}
```

**Response 200 (sem 2FA):** `{ "user": {...} }`

**Response 200 (com 2FA):** `{ "requiresTwoFactor": true, "userId": "cuid..." }`

---

### POST /api/auth/logout
Encerrar sessão.

**Response 200:** `{ "message": "Logout realizado" }`

---

### GET /api/auth/me
Obter usuário autenticado.

**Response 200:** `{ "user": { ...SessionUser } }`

---

### POST /api/auth/magic-link
Enviar link de acesso por email.

**Body:** `{ "email": "joao@empresa.com" }`

**Response 200:** `{ "message": "Se o email existir, você receberá o link em breve" }`

---

### GET /api/auth/magic-link/verify?token={token}
Verificar e autenticar via magic link.

**Response 200:** `{ "user": {...} }` + cookie `auth-token`

---

### POST /api/auth/2fa/setup
Gerar QR Code para configuração do 2FA.

**Response 200:** `{ "secret": "TOTP_SECRET", "qrCode": "data:image/png;base64,..." }`

---

### PUT /api/auth/2fa/setup
Confirmar e ativar o 2FA.

**Body:** `{ "code": "123456" }`

**Response 200:** `{ "message": "2FA ativado com sucesso" }`

---

### POST /api/auth/2fa/verify
Verificar código 2FA após login.

**Body:** `{ "userId": "cuid...", "code": "123456" }`

**Response 200:** `{ "user": {...} }` + cookie `auth-token`

---

## Corridas

### GET /api/trips
Listar corridas.

**Query params:**
- `page` (default: 1)
- `pageSize` (default: 20)
- `status`: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
- `driverId`: string
- `patientId`: string
- `dateFrom`: ISO date
- `dateTo`: ISO date

**Response 200:**
```json
{
  "data": [...trips],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

---

### POST /api/trips
Criar nova corrida.

**Body:**
```json
{
  "driverId": "cuid...",
  "vehicleId": "cuid...",
  "patientId": "cuid...",
  "clinicId": "cuid...",
  "origin": "Rua das Flores, 100 - São Paulo",
  "destination": "Av. Paulista, 1000 - São Paulo",
  "scheduledAt": "2025-01-20T08:00:00Z",
  "distanceKm": 15.5,
  "costPerKm": 2.50,
  "notes": "Observações"
}
```

---

### GET /api/trips/{id}
Obter corrida por ID (inclui logs GPS).

---

### PUT /api/trips/{id}
Atualizar corrida.

---

### PATCH /api/trips/{id}
Atualizar status da corrida.

**Body:**
```json
{
  "status": "IN_PROGRESS",
  "startedAt": "2025-01-20T08:05:00Z"
}
```

Status possíveis: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED` | `CANCELLED`

---

### DELETE /api/trips/{id}
Excluir corrida (apenas se não estiver em andamento).

---

## Motoristas

### GET /api/drivers
Listar motoristas.

**Query params:** `status`, `search`

### POST /api/drivers
Cadastrar motorista.

**Body:**
```json
{
  "name": "João Silva",
  "cpf": "123.456.789-00",
  "phone": "(11) 99999-9999",
  "licenseNumber": "12345678901",
  "licenseExpiry": "2027-12-31",
  "licenseCategory": "B",
  "vehicleId": "cuid..."
}
```

### GET /api/drivers/{id} | PUT /api/drivers/{id} | DELETE /api/drivers/{id}

---

## Veículos

### GET /api/vehicles
Listar veículos.

**Query params:** `status`, `search`

### POST /api/vehicles
Cadastrar veículo.

**Body:**
```json
{
  "plate": "ABC-1234",
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2022,
  "color": "Prata",
  "capacity": 4,
  "fuelType": "FLEX",
  "currentMileage": 0
}
```

### GET /api/vehicles/{id} | PUT /api/vehicles/{id} | DELETE /api/vehicles/{id}

---

## Pacientes

### GET /api/patients
Listar pacientes.

**Query params:** `search`, `clinicId`

### POST /api/patients
Cadastrar paciente.

**Body:**
```json
{
  "name": "Ana Oliveira",
  "cpf": "111.222.333-44",
  "birthDate": "1980-05-15",
  "phone": "(11) 98888-9999",
  "address": "Rua das Rosas, 100 - São Paulo",
  "clinicId": "cuid..."
}
```

### GET /api/patients/{id} | PUT /api/patients/{id} | DELETE /api/patients/{id}

---

## Clínicas

### GET /api/clinics | POST /api/clinics
### GET /api/clinics/{id} | PUT /api/clinics/{id} | DELETE /api/clinics/{id}

**Body (POST):**
```json
{
  "name": "Hospital Central",
  "cnpj": "00.000.000/0001-00",
  "phone": "(11) 3000-0000",
  "email": "contato@hospital.com",
  "address": "Av. Paulista, 1000 - São Paulo"
}
```

---

## Combustível

### GET /api/fuel
Listar abastecimentos.

**Query params:** `vehicleId`, `dateFrom`, `dateTo`, `page`, `pageSize`

**Response** inclui `summary`:
```json
{
  "summary": {
    "totalCost": 1250.50,
    "totalLiters": 200.5,
    "avgPricePerLiter": 5.89
  }
}
```

### POST /api/fuel
Registrar abastecimento.

**Body:**
```json
{
  "vehicleId": "cuid...",
  "liters": 40.5,
  "pricePerLiter": 5.89,
  "mileageAtFuel": 45000,
  "fuelType": "FLEX",
  "date": "2025-01-20",
  "station": "Posto Shell"
}
```

---

## Relatórios

### GET /api/reports?type={type}&dateFrom={date}&dateTo={date}

**Tipos disponíveis:**

| type | Descrição |
|------|-----------|
| `dashboard` | Estatísticas gerais + tendência 30 dias |
| `trips` | Lista de corridas no período com resumo |
| `fuel` | Lista de abastecimentos no período com resumo |

---

## Códigos de erro

| Código | Significado |
|--------|-------------|
| 400 | Dados inválidos |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Recurso não encontrado |
| 409 | Conflito (duplicado) |
| 500 | Erro interno |

**Formato de erro:**
```json
{ "error": "Descrição do erro" }
```
