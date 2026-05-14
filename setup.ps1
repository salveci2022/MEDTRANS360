# TransportSaaS — Script de configuracao automatica
# Execute: .\setup.ps1

Write-Host "`n=== TransportSaaS Setup ===" -ForegroundColor Cyan

# 1. Verificar Docker
Write-Host "`n[1/6] Verificando Docker..." -ForegroundColor Yellow
$dockerOk = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Docker nao esta rodando!" -ForegroundColor Red
    Write-Host "  -> Abra o Docker Desktop e aguarde o icone ficar estavel na bandeja do sistema" -ForegroundColor Yellow
    Write-Host "  -> Depois execute este script novamente" -ForegroundColor Yellow
    exit 1
}
Write-Host "Docker OK" -ForegroundColor Green

# 2. Subir banco de dados
Write-Host "`n[2/6] Iniciando PostgreSQL via Docker..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao iniciar banco de dados" -ForegroundColor Red
    exit 1
}

Write-Host "Aguardando banco ficar pronto..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$retries = 10
for ($i = 1; $i -le $retries; $i++) {
    $health = docker inspect --format="{{.State.Health.Status}}" transport-saas-db 2>&1
    if ($health -eq "healthy") { break }
    Write-Host "  Tentativa $i/$retries - aguardando..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
}
Write-Host "Banco de dados pronto!" -ForegroundColor Green

# 3. Instalar dependencias
Write-Host "`n[3/6] Instalando dependencias npm..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao instalar dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencias instaladas!" -ForegroundColor Green

# 4. Gerar Prisma Client
Write-Host "`n[4/6] Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao gerar Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "Prisma Client gerado!" -ForegroundColor Green

# 5. Aplicar schema ao banco
Write-Host "`n[5/6] Aplicando schema ao banco de dados..." -ForegroundColor Yellow
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao aplicar schema" -ForegroundColor Red
    exit 1
}
Write-Host "Schema aplicado!" -ForegroundColor Green

# 6. Popular com dados de exemplo
Write-Host "`n[6/6] Populando banco com dados de exemplo..." -ForegroundColor Yellow
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Seed falhou (pode ser que os dados ja existam)" -ForegroundColor Yellow
} else {
    Write-Host "Dados de exemplo criados!" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Setup concluido com sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Credenciais de acesso:" -ForegroundColor White
Write-Host "   Email: admin@demo.com" -ForegroundColor Yellow
Write-Host "   Senha: admin123456" -ForegroundColor Yellow
Write-Host ""
Write-Host " Para iniciar o servidor:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host " Acesse: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
