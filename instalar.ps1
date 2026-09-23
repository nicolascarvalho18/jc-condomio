$ErrorActionPreference = 'Stop'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker não foi encontrado. Instale e abra o Docker Desktop antes de continuar.'
}

docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'O Docker Desktop não está em execução.'
}

if (-not (Test-Path '.env')) {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $jwtSecret = [Convert]::ToHexString($bytes)
  $dbPassword = [Convert]::ToBase64String($bytes).Replace('+','A').Replace('/','B').TrimEnd('=')
  @"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jccondomiodb
DB_USERNAME=jcuser
DB_PASSWORD=$dbPassword
JWT_SECRET=$jwtSecret
JWT_EXPIRATION_MS=86400000
JWT_REFRESH_EXPIRATION_MS=604800000
CORS_ALLOWED_ORIGINS=http://localhost:5173
LOGIN_RATE_LIMIT_ATTEMPTS=5
LOGIN_RATE_LIMIT_MINUTES=15
PORT=8080
"@ | Set-Content -Encoding UTF8 '.env'
  Write-Host 'Arquivo .env criado com segredos aleatórios locais.' -ForegroundColor Green
}

docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
  throw 'Não foi possível iniciar os serviços Docker.'
}

Write-Host 'JC Condomínio iniciado em http://localhost:5173' -ForegroundColor Green
