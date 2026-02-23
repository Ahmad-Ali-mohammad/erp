param(
  [ValidateSet("docker-postgres", "docker-sqlite", "docker-mysql", "all")]
  [string]$Mode = "all",
  [switch]$RemoveVolumes
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Stop-Mode {
  param([string]$SelectedMode)

  $flags = Get-ComposeFlags -SelectedMode $SelectedMode
  $args = @("compose") + $flags + @("down", "--remove-orphans")
  if ($RemoveVolumes) {
    $args += "-v"
  }

  Write-Host "Stopping $SelectedMode ..."
  & docker @args
}

if ($Mode -eq "all") {
  Stop-Mode -SelectedMode "docker-postgres"
  Stop-Mode -SelectedMode "docker-sqlite"
  Stop-Mode -SelectedMode "docker-mysql"
} else {
  Stop-Mode -SelectedMode $Mode
}

Write-Host "Done."
