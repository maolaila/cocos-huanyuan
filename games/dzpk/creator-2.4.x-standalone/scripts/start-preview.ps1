param(
  [int]$Port = 17419
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$previewServer = Join-Path $projectRoot 'scripts\static-preview-server.js'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw 'Node.js is required to serve the Creator web-mobile build'
}
& $nodeCommand.Source $previewServer --port $Port
exit $LASTEXITCODE

