param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$project = [System.IO.Path]::GetFullPath($ProjectRoot)
$allowedRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
if (-not $project.StartsWith($allowedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "ProjectRoot must remain under $allowedRoot"
}

$requiredPrefabIdentity = @(
  @('Bank', '8c9ac144-1168-4a02-b5ee-f895a4d6591e'),
  @('DZPKMain', 'faea1885-c01d-4a4b-8d14-69319aef5c50'),
  @('Load', '07af51a2-d569-4a18-978c-537bf728840b'),
  @('Room', 'efa3b3c7-d745-4874-b161-ae25276fb74a'),
  @('Rule', '1eb86003-fa02-4609-b85f-317c3ed33efc'),
  @('Set', '31f79f27-4c2e-440d-9ad2-edaa10454baf')
)
foreach ($prefabIdentity in $requiredPrefabIdentity) {
  $prefabPath = Join-Path $project "assets\DZPK\prefab\$($prefabIdentity[0]).prefab"
  $prefabMetaPath = "$prefabPath.meta"
  if (-not (Test-Path -LiteralPath $prefabPath)) {
    throw "Missing original prefab: $prefabPath"
  }
  $prefabMetadata = Get-Content -LiteralPath $prefabMetaPath -Raw | ConvertFrom-Json
  if ($prefabMetadata.uuid -ne $prefabIdentity[1]) {
    throw "Original prefab UUID mismatch for $($prefabIdentity[0])"
  }
}

$requiredOriginalScriptHashes = @{
  'DZPKLoad.js' = 'bdeedb2cf5f643a995a61f48eda419c18aa3949169b634ec9fe8821a018a92e7'
  'DZPKRoom.js' = '482cd858453a1117c21a6300db1dc7ca63dc8cced02efccafa61718091515e73'
  'DZPKMode.js' = 'f688053c68b0acf4c3d2cb1c359ec4a42dc049312578c8a448252905f2f93304'
  'DZPKControlle.js' = '7b055de7bf2cf0bb4f25500c67247c8e0949b302833dcee1d2412e899304ab6f'
  'DZPKView.js' = '4a0cd231d02b58b11195025475c997448b9071cb104881332ae986841b31407c'
}
foreach ($originalScriptName in $requiredOriginalScriptHashes.Keys) {
  $originalScriptPath = Join-Path $project "assets\DZPK\_script\$originalScriptName"
  $actualOriginalScriptHash = (
    Get-FileHash -Algorithm SHA256 -LiteralPath $originalScriptPath
  ).Hash.ToLowerInvariant()
  if ($actualOriginalScriptHash -ne $requiredOriginalScriptHashes[$originalScriptName]) {
    throw "Original DZPK source-evidence script changed: $originalScriptName"
  }
}

$requiredActiveComponentClassIds = @(
  '6b8f4AeDNVOdaQkSDFsDwLn',
  '2de8849XWxHsblCkTlm5qw/',
  '41f21+8TLlAnLWc/P9hpsrY',
  '84ec95q06xDTpmQT8hjRm0+',
  'dd06ck0p19G2JW5MXup71gd',
  'f27484xFSZDh7iuSO2idoNn',
  'd3efcryMUdN4pvxegoyrfhQ',
  '54b1fUbldVKFbGa96khzXcp',
  'a1620EgCLtEJIt9xU6fN9HW'
)
$activePrefabText = @(
  'Load', 'Room', 'DZPKMain', 'Rule', 'Set'
) | ForEach-Object {
  Get-Content -LiteralPath (Join-Path $project "assets\DZPK\prefab\$_.prefab") -Raw
}
$activePrefabText = $activePrefabText -join [Environment]::NewLine
foreach ($classId in $requiredActiveComponentClassIds) {
  if (-not $activePrefabText.Contains($classId)) {
    throw "Required active component class ID missing: $classId"
  }
}
$retiredOriginalCoreComponentClassIds = @(
  'e45b6rAZhdG87JEInxfZr/2',
  '3dc3c0cOyZGKoLtv0D/b2m/',
  '39d81r3ir9KKp/jByesNis5',
  '337d4IIgaFKZqbZRbcW+YNw'
)
foreach ($retiredClassId in $retiredOriginalCoreComponentClassIds) {
  if ($activePrefabText.Contains($retiredClassId)) {
    throw "Minified original core component remains active instead of semantic component: $retiredClassId"
  }
}
$requiredSemanticSourceFiles = @(
  'DzpkLoadingScreenController.js',
  'DzpkRoomSelectionController.js',
  'DzpkTableStateModel.js',
  'DzpkTableGameController.js',
  'DzpkTablePresentation.js'
)
$semanticSourceRoot = Join-Path $project 'assets\DZPK\_semantic'
foreach ($semanticSourceFileName in $requiredSemanticSourceFiles) {
  $semanticSourcePath = Join-Path $semanticSourceRoot $semanticSourceFileName
  if (-not (Test-Path -LiteralPath $semanticSourcePath)) {
    throw "Required semantic DZPK source is missing: $semanticSourceFileName"
  }
  $singleLetterDeclaration = Select-String -LiteralPath $semanticSourcePath `
    -Pattern '\b(?:var|let|const)\s+[A-Za-z]\b'
  if ($singleLetterDeclaration) {
    throw "Semantic source contains single-letter declaration: $semanticSourceFileName"
  }
}

$tablePresentationSource = Get-Content -LiteralPath (
  Join-Path $semanticSourceRoot 'DzpkTablePresentation.js'
) -Raw
if ($tablePresentationSource -notmatch 'xh:\s*cardFrameNames\.largeSuitFrameName') {
  throw 'Original poker-face mapping mismatch: xh must use the large suit frame'
}
if ($tablePresentationSource -notmatch 'dh:\s*cardFrameNames\.smallSuitFrameName') {
  throw 'Original poker-face mapping mismatch: dh must use the small suit frame'
}
foreach ($addedPotRowMarker in @('StandardPotLayerRow', 'createPotLayerLabel')) {
  if ($tablePresentationSource.Contains($addedPotRowMarker)) {
    throw "Non-source settlement text overlay remains: $addedPotRowMarker"
  }
}

$tableControllerSource = Get-Content -LiteralPath (
  Join-Path $semanticSourceRoot 'DzpkTableGameController.js'
) -Raw
if ($tableControllerSource -notmatch 'requestReturnToRoomSelection:\s*function') {
  throw 'Table back action must return to the original Room selection'
}
if ($tableControllerSource -notmatch 'wNetWork\.send\(SOURCE_EVENT\.PARTICIPANT_LEFT') {
  throw 'Table back action must use the original Msg_DZPK_Out flow'
}

$uiMessageServiceSource = Get-Content -LiteralPath (
  Join-Path $project 'assets\Standalone\DzpkUiMessageService.js'
) -Raw
if ($uiMessageServiceSource -match 'window\.confirm') {
  throw 'Browser-native confirmation UI must not replace original Cocos navigation'
}

$forbiddenSelfDrawnNames = @(
  'DzpkPhaseAController',
  'DzpkPhaseATypes',
  'DzpkTableView',
  'DzpkUiFactory',
  'DzpkPhaseA.fire',
  'ResultPanel',
  'NEXT_HAND',
  'cc.Graphics',
  'OriginalDzpkRuntimeCompatibility'
)
$projectTextFiles = Get-ChildItem -LiteralPath (Join-Path $project 'assets') -File -Recurse |
  Where-Object { $_.Extension -in @('.js', '.ts', '.json', '.fire') }
foreach ($forbiddenName in $forbiddenSelfDrawnNames) {
  $matches = $projectTextFiles | Select-String -SimpleMatch $forbiddenName
  if ($matches) {
    throw "Rejected self-drawn client artifact remains: $forbiddenName"
  }
}

$forbiddenClientAuthorityPatterns = @(
  'completeDeck',
  'candidateDeals',
  'botPrivateState',
  'controlDirection',
  'controlIntent',
  'WalletGateway',
  'RoundService',
  'appSecret',
  'Applications/GAME_DZPK'
)
$scanRoots = @((Join-Path $project 'assets'))
$buildRoot = Join-Path $project 'build\web-mobile'
if (Test-Path -LiteralPath $buildRoot) {
  $scanRoots += $buildRoot
  foreach ($relativeBuildFile in @('index.html', 'main.js', 'src\settings.js')) {
    if (-not (Test-Path -LiteralPath (Join-Path $buildRoot $relativeBuildFile))) {
      throw "Cocos build output is missing $relativeBuildFile"
    }
  }
}
$scannedTextFiles = @()
foreach ($scanRoot in $scanRoots) {
  $scannedTextFiles += Get-ChildItem -LiteralPath $scanRoot -File -Recurse |
    Where-Object { $_.Extension -in @('.js', '.ts', '.json', '.html', '.fire') }
}
foreach ($forbiddenPattern in $forbiddenClientAuthorityPatterns) {
  $matches = $scannedTextFiles | Select-String -SimpleMatch $forbiddenPattern
  if ($matches) {
    $matchedPaths = ($matches | Select-Object -ExpandProperty Path -Unique) -join ', '
    throw "Client authority leak '$forbiddenPattern' found in $matchedPaths"
  }
}

$dzpkMainText = Get-Content -LiteralPath (Join-Path $project 'assets\DZPK\prefab\DZPKMain.prefab') -Raw
if ($dzpkMainText -match '"clickEvents"\s*:\s*\[\s*\{\s*"__id__"\s*:\s*977') {
  throw 'Targetless ERNN rule ClickEvent is still active'
}

$bootScenePath = Join-Path $project 'assets\Scene\DzpkStandaloneBoot.fire'
$bootScene = Get-Content -LiteralPath $bootScenePath -Raw | ConvertFrom-Json
$bootSceneNodeNames = @(
  $bootScene |
    Where-Object { $_.__type__ -eq 'cc.Node' } |
    ForEach-Object { $_._name }
)
$allowedBootSceneNodeNames = @(
  'Canvas',
  'Camera',
  'Main Camera',
  'Game',
  'Room',
  'UIShow',
  'MessageOverlay'
  'Night'
  'New Sprite(Splash)'
)
$unexpectedBootSceneNodeNames = @(
  $bootSceneNodeNames | Where-Object { $_ -notin $allowedBootSceneNodeNames }
)
if ($unexpectedBootSceneNodeNames.Count -gt 0) {
  throw "Standalone Boot scene contains business UI nodes: $($unexpectedBootSceneNodeNames -join ', ')"
}
if ($dzpkMainText -match '"clickEvents"\s*:\s*\[\s*\{\s*"__id__"\s*:\s*985') {
  throw 'Targetless BJL set ClickEvent is still active'
}

[PSCustomObject]@{
  verdict = 'OriginalClientBoundaryVerified'
  creatorVersion = (Get-Content -LiteralPath (Join-Path $project 'project.json') -Raw | ConvertFrom-Json).version
  originalPrefabCount = $requiredPrefabIdentity.Count
  activeOriginalPrefabCount = 5
  activeComponentClassIdCount = $requiredActiveComponentClassIds.Count
  byteIdenticalOriginalScriptCount = $requiredOriginalScriptHashes.Count
  semanticCoreSourceCount = $requiredSemanticSourceFiles.Count
  bootSceneNodeCount = $bootSceneNodeNames.Count
  projectFileCount = (Get-ChildItem -LiteralPath $project -File -Recurse).Count
  buildPresent = (Test-Path -LiteralPath $buildRoot)
  scannedTextFileCount = $scannedTextFiles.Count
  forbiddenSelfDrawnNameCount = $forbiddenSelfDrawnNames.Count
  forbiddenAuthorityPatternCount = $forbiddenClientAuthorityPatterns.Count
  bankStatus = 'SourcePresentButGameRuntimeNotApplicable'
} | ConvertTo-Json
