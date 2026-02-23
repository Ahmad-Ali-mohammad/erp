param(
  [ValidateSet("docker-postgres", "docker-sqlite", "docker-mysql")]
  [string]$Mode = "docker-postgres"
)

$ErrorActionPreference = "Stop"

function Get-ComposeFlags {
  param([string]$SelectedMode)

  if ($SelectedMode -eq "docker-postgres") {
    return @("--env-file", ".env.docker.postgres", "-f", "docker-compose.base.yml", "-f", "docker-compose.postgres.yml")
  } elseif ($SelectedMode -eq "docker-mysql") {
    return @("--env-file", ".env.docker.mysql", "-f", "docker-compose.base.yml", "-f", "docker-compose.mysql.yml")
  }
  return @("--env-file", ".env.docker.sqlite", "-f", "docker-compose.base.yml", "-f", "docker-compose.sqlite.yml")
}

function Get-RequiredPorts {
  param([string]$SelectedMode)

  if ($SelectedMode -eq "docker-postgres") {
    return @(3000, 8000, 5432)
  } elseif ($SelectedMode -eq "docker-mysql") {
    return @(3000, 8000, 3306, 8080)
  }
  return @(3000, 8000)
}

function Test-PortInUse {
  param([int]$Port)

  $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  return $null -ne $listener
}

function Wait-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 180
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 8
      if ($response.StatusCode -eq 200) {
        Write-Host "OK: $Url"
        return
      }
    } catch {
      Start-Sleep -Seconds 3
      continue
    }
    Start-Sleep -Seconds 3
  }

  throw "Timed out waiting for $Url"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI is not available in PATH."
}
cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  throw "Docker daemon is not running. Start Docker Desktop and retry."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$requiredFiles = @(
  "docker-compose.base.yml",
  "docker-compose.postgres.yml",
  "docker-compose.sqlite.yml",
  "docker-compose.mysql.yml",
  ".env.docker.postgres",
  ".env.docker.sqlite",
  ".env.docker.mysql"
)
foreach ($file in $requiredFiles) {
  if (-not (Test-Path $file)) {
    throw "Missing required file: $file"
  }
}

$composeFlags = Get-ComposeFlags -SelectedMode $Mode
$runningServices = & docker compose @composeFlags ps --status running --services 2>$null
$runningCount = @($runningServices | Where-Object { $_ -and $_.Trim() }).Count

if ($runningCount -eq 0) {
  foreach ($port in (Get-RequiredPorts -SelectedMode $Mode)) {
    if (Test-PortInUse -Port $port) {
      throw "Port $port is already in use. Stop conflicting services first or run scripts/stop.ps1."
    }
  }
}

Write-Host "Starting stack in mode: $Mode"
& docker compose @composeFlags up -d --build

Write-Host "Waiting for backend health endpoint..."
Wait-HttpOk -Url "http://localhost:8000/api/v1/core/health/"

Write-Host "Waiting for OpenAPI schema endpoint..."
Wait-HttpOk -Url "http://localhost:8000/api/schema/"

Write-Host "Waiting for frontend login page..."
Wait-HttpOk -Url "http://localhost:3000/login"

if ($Mode -eq "docker-mysql") {
  Write-Host "Waiting for phpMyAdmin..."
  Wait-HttpOk -Url "http://localhost:8080/"
}

try {
  $tokenResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "http://localhost:8000/api/auth/token/" `
    -ContentType "application/json" `
    -Body '{"username":"admin","password":"Admin@12345"}'
  if (-not $tokenResponse.access) {
    Write-Warning "Demo login check did not return access token. Ensure SEED_DEMO_DATA=true."
  } else {
    Write-Host "Demo login check passed (admin/Admin@12345)."
  }
} catch {
  Write-Warning "Demo login check failed: $($_.Exception.Message)"
}

Write-Host "Stack is ready."
Write-Host "Frontend: http://localhost:3000/login"
Write-Host "Backend docs: http://localhost:8000/api/docs/"
Write-Host "Backend schema: http://localhost:8000/api/schema/"
if ($Mode -eq "docker-mysql") {
  Write-Host "phpMyAdmin: http://localhost:8080/"
}
