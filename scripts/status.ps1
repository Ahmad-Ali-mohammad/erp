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

function Test-Endpoint {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
    return "HTTP $($response.StatusCode)"
  } catch {
    return "DOWN"
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI is not available in PATH."
}
cmd /c "docker info >nul 2>nul"
$dockerDaemonAvailable = $LASTEXITCODE -eq 0

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

foreach ($mode in @("docker-postgres", "docker-sqlite", "docker-mysql")) {
  Write-Host ""
  Write-Host "=== $mode ==="
  if ($dockerDaemonAvailable) {
    $flags = Get-ComposeFlags -SelectedMode $mode
    & docker compose @flags ps
  } else {
    Write-Host "Docker daemon is not running."
  }
}

Write-Host ""
Write-Host "=== Endpoints ==="
Write-Host "Backend health: $(Test-Endpoint -Url 'http://localhost:8000/api/v1/core/health/')"
Write-Host "OpenAPI schema: $(Test-Endpoint -Url 'http://localhost:8000/api/schema/')"
Write-Host "Frontend login: $(Test-Endpoint -Url 'http://localhost:3000/login')"
Write-Host "phpMyAdmin: $(Test-Endpoint -Url 'http://localhost:8080/')"
