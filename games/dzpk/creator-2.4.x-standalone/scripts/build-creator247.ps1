param(
  [string]$CocosCreatorExe = 'C:\ProgramData\cocos\editors\Creator\2.4.7\CocosCreator.exe',
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'
$project = [System.IO.Path]::GetFullPath($ProjectRoot)
$allowedProjectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
if (-not $project.StartsWith($allowedProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "ProjectRoot must remain under $allowedProjectRoot"
}
$creator = [System.IO.Path]::GetFullPath($CocosCreatorExe)
if (-not (Test-Path -LiteralPath $creator)) {
  throw "Cocos Creator is missing: $creator"
}
$creatorVersion = (Get-Item -LiteralPath $creator).VersionInfo.ProductVersion
if (-not $creatorVersion.StartsWith('2.4.7')) {
  throw "Expected Creator 2.4.7, got $creatorVersion"
}
$projectVersion = (Get-Content -LiteralPath (Join-Path $project 'project.json') -Raw | ConvertFrom-Json).version
if ($projectVersion -ne '2.4.7') {
  throw "Expected project version 2.4.7, got $projectVersion"
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('dzpk-original-import-' + [Guid]::NewGuid().ToString('N'))
$temporaryProject = Join-Path $temporaryRoot 'kg-dzpk-2.4.7-original'
$buildRoot = Join-Path $project 'build'
$buildOutput = Join-Path $buildRoot 'web-mobile'
$logRoot = Join-Path $project 'output\logs'
$buildLog = Join-Path $logRoot 'creator247-build.log'
$resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
if (-not ([System.IO.Path]::GetFullPath($temporaryRoot)).StartsWith($resolvedTempRoot)) {
  throw "Unsafe temporary root: $temporaryRoot"
}
if (-not ([System.IO.Path]::GetFullPath($buildRoot)).StartsWith($project)) {
  throw "Unsafe build root: $buildRoot"
}

New-Item -ItemType Directory -Force -Path $temporaryProject, $buildRoot, $logRoot | Out-Null
try {
  robocopy $project $temporaryProject /E /XD library temp local build output .git /NFL /NDL /NP | Out-Null
  $copyExitCode = $LASTEXITCODE
  if ($copyExitCode -ge 8) {
    throw "Temporary project copy failed: $copyExitCode"
  }

  $buildSpecification = "platform=web-mobile;debug=true;buildPath=$buildRoot;md5Cache=false;sourceMaps=true"
  $creatorArguments = @(
    '--path', $temporaryProject,
    '--force',
    '--logfile', $buildLog,
    '--build', $buildSpecification
  )
  Write-Host "Building original DZPK client with Creator $creatorVersion"
  $creatorProcess = Start-Process -FilePath $creator -ArgumentList $creatorArguments `
    -WorkingDirectory $temporaryProject -PassThru -WindowStyle Hidden
  if (-not $creatorProcess.WaitForExit($TimeoutSeconds * 1000)) {
    try { $creatorProcess.Kill() } catch {}
    throw "Creator build timed out after $TimeoutSeconds seconds"
  }
  if ($creatorProcess.ExitCode -ne 0) {
    $logTail = if (Test-Path -LiteralPath $buildLog) {
      (Get-Content -LiteralPath $buildLog -Tail 120) -join [Environment]::NewLine
    } else { '' }
    throw ("Creator build failed with exit code $($creatorProcess.ExitCode)" + [Environment]::NewLine + $logTail)
  }
  if (-not (Test-Path -LiteralPath $buildOutput)) {
    throw "Creator did not produce $buildOutput"
  }
  & (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'verify-original-client-boundary.ps1') `
    -ProjectRoot $project
  Write-Host "Original DZPK web-mobile build passed: $buildOutput"
  Write-Host "Creator log: $buildLog"
} finally {
  if ([System.IO.Directory]::Exists($temporaryRoot)) {
    [System.IO.Directory]::Delete($temporaryRoot, $true)
  }
}
