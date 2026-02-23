param(
  [ValidateSet("docker-postgres", "docker-sqlite", "docker-mysql")]
  [string]$Mode = "docker-postgres",
  [string]$Service = "",
  [int]$Tail = 200,
  [switch]$Follow
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

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI is not available in PATH."
}
cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  throw "Docker daemon is not running. Start Docker Desktop and retry."
}

if ($Service -and $Mode -eq "docker-sqlite" -and $Service -eq "db") {
  throw "Service 'db' is not available in docker-sqlite mode."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$flags = Get-ComposeFlags -SelectedMode $Mode
$args = @("compose") + $flags + @("logs", "--tail", "$Tail")
if ($Follow) {
  $args += "-f"
}
if ($Service) {
  $args += $Service
}

& docker @args
