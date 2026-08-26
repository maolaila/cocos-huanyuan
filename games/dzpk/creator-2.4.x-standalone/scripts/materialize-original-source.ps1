param(
  [string]$SourceProject = 'C:\total\kg-cocos-client\728_mobile_restore',
  [string]$TargetProject = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$expectedSourceCommit = 'b5694d576c482e02dc00a33f51eea633b9cd647f'
$allowedTargetRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$sourceRoot = [System.IO.Path]::GetFullPath($SourceProject)
$targetRoot = [System.IO.Path]::GetFullPath($TargetProject)

if (-not $targetRoot.StartsWith($allowedTargetRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "TargetProject must remain under $allowedTargetRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'assets\DZPK'))) {
  throw "DZPK source directory is missing under $sourceRoot"
}
$sourceCommit = (& git -C $sourceRoot rev-parse HEAD).Trim()
if ($sourceCommit -ne $expectedSourceCommit) {
  throw "Unexpected KG Cocos source commit: $sourceCommit"
}

function Copy-AuthorityFile([string]$relativePath) {
  $sourceFile = Join-Path $sourceRoot $relativePath
  $targetFile = Join-Path $targetRoot $relativePath
  if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
    throw "Required authority file is missing: $relativePath"
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetFile) | Out-Null
  Copy-Item -LiteralPath $sourceFile -Destination $targetFile -Force
}

function Copy-AuthorityTree([string]$relativePath) {
  $sourceDirectory = Join-Path $sourceRoot $relativePath
  $targetDirectory = Join-Path $targetRoot $relativePath
  if (-not (Test-Path -LiteralPath $sourceDirectory -PathType Container)) {
    throw "Required authority directory is missing: $relativePath"
  }
  New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
  Copy-Item -Path (Join-Path $sourceDirectory '*') -Destination $targetDirectory -Recurse -Force
}

# Copy the complete DZPK bundle first so every original prefab, script, resource,
# animation and .meta UUID remains available for study and low-probability paths.
Copy-AuthorityTree 'assets\DZPK'
Copy-AuthorityFile 'assets\DZPK.meta'

$sharedComponentScripts = @(
  'AdaptView',
  'Config',
  'DropDown',
  'GameBank',
  'NodePool',
  'PokerBase',
  'PopupBase',
  'RoomChoose',
  'Rule',
  'Set'
)
$legacyProviderScripts = @(
  'AudioManager',
  'CountUp',
  'EventDispatcher',
  'LogManager',
  'ResLoader',
  'UIHelp',
  'Utils'
)
Copy-AuthorityFile 'assets\_script.meta'
foreach ($scriptName in ($sharedComponentScripts + $legacyProviderScripts)) {
  Copy-AuthorityFile "assets\_script\$scriptName.js"
  Copy-AuthorityFile "assets\_script\$scriptName.js.meta"
}

$externalResourceFiles = @(
  'assets\BJL.meta',
  'assets\BJL\_res.meta',
  'assets\BJL\_res\Atlas_plist.meta',
  'assets\BJL\_res\Atlas_plist\BRNNResult.meta',
  'assets\BJL\_res\Atlas_plist\BRNNResult\plist_puke.plist',
  'assets\BJL\_res\Atlas_plist\BRNNResult\plist_puke.plist.meta',
  'assets\BJL\_res\Atlas_plist\BRNNResult\plist_puke.png',
  'assets\BJL\_res\Atlas_plist\BRNNResult\plist_puke.png.meta',
  'assets\resources.meta',
  'assets\resources\Hall.meta',
  'assets\resources\Hall\THead.meta',
  'assets\resources\Hall\THead\7.png',
  'assets\resources\Hall\THead\7.png.meta',
  'assets\resources\Hall\Head.meta',
  'assets\resources\Hall\Head\plist_head.plist',
  'assets\resources\Hall\Head\plist_head.plist.meta',
  'assets\resources\Hall\Head\plist_head.png',
  'assets\resources\Hall\Head\plist_head.png.meta',
  'assets\resources\sound.meta',
  'assets\resources\sound\effect.meta',
  'assets\resources\sound\effect\btn_click.mp3',
  'assets\resources\sound\effect\btn_click.mp3.meta',
  'assets\resources\sound\effect\btn_close.mp3',
  'assets\resources\sound\effect\btn_close.mp3.meta',
  'assets\resources\sound\effect\BT_GET.mp3',
  'assets\resources\sound\effect\BT_GET.mp3.meta'
)
foreach ($relativePath in $externalResourceFiles) {
  Copy-AuthorityFile $relativePath
}

foreach ($projectCompanion in @('creator.d.ts', 'jsconfig.json', 'tsconfig.json')) {
  Copy-AuthorityFile $projectCompanion
}

# Exact byte comparison protects the original bundle from accidental cleanup or
# line-ending rewrites before Creator imports it.
$sourceFiles = Get-ChildItem -LiteralPath (Join-Path $sourceRoot 'assets\DZPK') -File -Recurse
$targetDzpkRoot = Join-Path $targetRoot 'assets\DZPK'
$targetFiles = @(
  Get-ChildItem -LiteralPath $targetDzpkRoot -File -Recurse |
    Where-Object {
      $targetRelativePath = $_.FullName.Substring($targetDzpkRoot.Length + 1)
      $targetRelativePath -notmatch '^_semantic(?:\.meta|\\)'
    }
)
if ($sourceFiles.Count -ne $targetFiles.Count) {
  throw "DZPK file-count mismatch: source=$($sourceFiles.Count), target=$($targetFiles.Count)"
}
$sourceBytes = ($sourceFiles | Measure-Object Length -Sum).Sum
$targetBytes = ($targetFiles | Measure-Object Length -Sum).Sum
if ($sourceBytes -ne $targetBytes) {
  throw "DZPK byte-count mismatch: source=$sourceBytes, target=$targetBytes"
}
$sourceDirectoryPrefix = (Join-Path $sourceRoot 'assets\DZPK').Length + 1
foreach ($sourceFile in $sourceFiles) {
  $relativeFilePath = $sourceFile.FullName.Substring($sourceDirectoryPrefix)
  $targetFile = Join-Path (Join-Path $targetRoot 'assets\DZPK') $relativeFilePath
  $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourceFile.FullName).Hash
  $targetHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $targetFile).Hash
  if ($sourceHash -ne $targetHash) {
    throw "DZPK byte mismatch at $relativeFilePath"
  }
}

# The authority prefab contains two serialized click handlers whose target
# component belongs to ERNN/BJL and is absent from DZPK. Keep every original
# node, component and array index, but detach those two dead cross-game
# handlers after proving the copied bundle was byte-identical to authority.
$targetMainPrefab = Join-Path $targetRoot 'assets\DZPK\prefab\DZPKMain.prefab'
$targetMainText = [System.IO.File]::ReadAllText($targetMainPrefab)
$staleRuleClickEvents = @(
  '    "clickEvents": [',
  '      {',
  '        "__id__": 977',
  '      },',
  '      {',
  '        "__id__": 978',
  '      }',
  '    ],'
) -join "`n"
$repairedRuleClickEvents = @(
  '    "clickEvents": [',
  '      {',
  '        "__id__": 978',
  '      }',
  '    ],'
) -join "`n"
$staleSetClickEvents = @(
  '    "clickEvents": [',
  '      {',
  '        "__id__": 985',
  '      },',
  '      {',
  '        "__id__": 986',
  '      }',
  '    ],'
) -join "`n"
$repairedSetClickEvents = @(
  '    "clickEvents": [',
  '      {',
  '        "__id__": 986',
  '      }',
  '    ],'
) -join "`n"
$sourceDefectRepairs = @(
  @($staleRuleClickEvents, $repairedRuleClickEvents),
  @($staleSetClickEvents, $repairedSetClickEvents)
)
foreach ($repair in $sourceDefectRepairs) {
  $matchCount = [System.Text.RegularExpressions.Regex]::Matches(
    $targetMainText,
    [System.Text.RegularExpressions.Regex]::Escape($repair[0])
  ).Count
  if ($matchCount -ne 1) {
    throw "Expected exactly one stale cross-game click binding, found $matchCount"
  }
  $targetMainText = $targetMainText.Replace($repair[0], $repair[1])
}
[System.IO.File]::WriteAllText(
  $targetMainPrefab,
  $targetMainText,
  [System.Text.UTF8Encoding]::new($false)
)
$semanticMappingScript = Join-Path $targetRoot 'scripts\apply-semantic-prefab-mapping.ps1'
if (-not (Test-Path -LiteralPath $semanticMappingScript)) {
  throw 'Semantic Prefab mapping script is missing'
}
$semanticMapping = & $semanticMappingScript -ProjectRoot $targetRoot | ConvertFrom-Json
$postRepairDzpkBytes = (
  Get-ChildItem -LiteralPath (Join-Path $targetRoot 'assets\DZPK') -File -Recurse |
    Measure-Object Length -Sum
).Sum

[PSCustomObject]@{
  verdict = 'OriginalDzpkSourceMaterialized'
  sourceCommit = $sourceCommit
  sourceProject = $sourceRoot
  targetProject = $targetRoot
  dzpkFileCount = $targetFiles.Count
  authorityDzpkBytes = $targetBytes
  postRepairDzpkBytes = $postRepairDzpkBytes
  sourceDefectRepairCount = $sourceDefectRepairs.Count
  semanticPrefabMappingVerdict = $semanticMapping.verdict
  sharedComponentScriptCount = $sharedComponentScripts.Count
  legacyProviderScriptCount = $legacyProviderScripts.Count
  externalResourceFileCount = $externalResourceFiles.Count
} | ConvertTo-Json
