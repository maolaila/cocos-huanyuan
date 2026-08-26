param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$project = [System.IO.Path]::GetFullPath($ProjectRoot)
$allowedRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
if (-not $project.StartsWith($allowedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "ProjectRoot must remain under $allowedRoot"
}

function Replace-ExpectedLiteral {
  param(
    [string]$SourceText,
    [string]$OriginalLiteral,
    [string]$SemanticLiteral,
    [int]$ExpectedCount,
    [string]$MappingName
  )
  $originalCount = [regex]::Matches(
    $SourceText,
    [regex]::Escape($OriginalLiteral)
  ).Count
  $semanticCount = [regex]::Matches(
    $SourceText,
    [regex]::Escape($SemanticLiteral)
  ).Count
  if ($originalCount -eq $ExpectedCount -and $semanticCount -eq 0) {
    return $SourceText.Replace($OriginalLiteral, $SemanticLiteral)
  }
  if ($originalCount -eq 0 -and $semanticCount -eq $ExpectedCount) {
    return $SourceText
  }
  throw "$MappingName expected original=$ExpectedCount/semantic=0 or original=0/semantic=$ExpectedCount; actual original=$originalCount semantic=$semanticCount"
}

function Save-Utf8WithoutBom([string]$FilePath, [string]$FileText) {
  [System.IO.File]::WriteAllText(
    $FilePath,
    $FileText,
    [System.Text.UTF8Encoding]::new($false)
  )
}

$prefabRoot = Join-Path $project 'assets\DZPK\prefab'
$loadPrefabPath = Join-Path $prefabRoot 'Load.prefab'
$roomPrefabPath = Join-Path $prefabRoot 'Room.prefab'
$mainPrefabPath = Join-Path $prefabRoot 'DZPKMain.prefab'

$loadText = [System.IO.File]::ReadAllText($loadPrefabPath)
$loadText = Replace-ExpectedLiteral $loadText `
  '"__type__": "39d81r3ir9KKp/jByesNis5"' `
  '"__type__": "41f21+8TLlAnLWc/P9hpsrY"' `
  1 `
  'Load semantic component'
Save-Utf8WithoutBom $loadPrefabPath $loadText

$roomText = [System.IO.File]::ReadAllText($roomPrefabPath)
$roomText = Replace-ExpectedLiteral $roomText `
  '337d4IIgaFKZqbZRbcW+YNw' `
  '84ec95q06xDTpmQT8hjRm0+' `
  5 `
  'Room semantic component and ClickEvents'
$roomText = Replace-ExpectedLiteral $roomText `
  '"handler": "onClick"' `
  '"handler": "handleSerializedMenuAction"' `
  4 `
  'Room semantic ClickEvent handlers'
$originalRoomProperties = @(
  '    "gold": {',
  '      "__id__": 157',
  '    },',
  '    "nickname": {',
  '      "__id__": 148',
  '    },',
  '    "head": {',
  '      "__id__": 145',
  '    },',
  '    "bottom": {',
  '      "__id__": 133',
  '    },',
  '    "top": {',
  '      "__id__": 114',
  '    },',
  '    "content": {',
  '      "__id__": 9',
  '    },'
) -join "`n"
$semanticRoomProperties = @(
  '    "viewerGoldLabel": {',
  '      "__id__": 157',
  '    },',
  '    "viewerNicknameLabel": {',
  '      "__id__": 148',
  '    },',
  '    "viewerAvatarSprite": {',
  '      "__id__": 145',
  '    },',
  '    "bottomPlayerPanelNode": {',
  '      "__id__": 133',
  '    },',
  '    "topToolbarNode": {',
  '      "__id__": 114',
  '    },',
  '    "roomChoiceContainer": {',
  '      "__id__": 9',
  '    },'
) -join "`n"
$roomText = Replace-ExpectedLiteral $roomText `
  $originalRoomProperties `
  $semanticRoomProperties `
  1 `
  'Room semantic serialized properties'
Save-Utf8WithoutBom $roomPrefabPath $roomText

$mainText = [System.IO.File]::ReadAllText($mainPrefabPath)
$mainText = Replace-ExpectedLiteral $mainText `
  'e45b6rAZhdG87JEInxfZr/2' `
  '6b8f4AeDNVOdaQkSDFsDwLn' `
  23 `
  'Main semantic controller component and events'
$mainText = Replace-ExpectedLiteral $mainText `
  '3dc3c0cOyZGKoLtv0D/b2m/' `
  '2de8849XWxHsblCkTlm5qw/' `
  2 `
  'Main semantic presentation component and SliderEvent'
$mainText = Replace-ExpectedLiteral $mainText `
  '"handler": "autoOnClick"' `
  '"handler": "toggleAutomaticActionSelection"' `
  3 `
  'Automatic action handlers'
$mainText = Replace-ExpectedLiteral $mainText `
  '"handler": "dmOnClick"' `
  '"handler": "requestPreflopPresetByIndex"' `
  3 `
  'Preflop preset handlers'
$mainText = Replace-ExpectedLiteral $mainText `
  '"handler": "dcOnClick"' `
  '"handler": "requestPostflopPresetByIndex"' `
  3 `
  'Postflop preset handlers'
$mainText = Replace-ExpectedLiteral $mainText `
  '"handler": "selectBet"' `
  '"handler": "submitRaiseSelectionFromButton"' `
  6 `
  'Raise selection handlers'
$mainText = Replace-ExpectedLiteral $mainText `
  '"handler": "sliderEvevt"' `
  '"handler": "handleRaiseSliderChanged"' `
  1 `
  'Raise slider handler'

$primaryActionMappings = @(
  @('qi', 'requestFoldAction'),
  @('gen', 'requestCallAction'),
  @('rang', 'requestCheckAction'),
  @('jia', 'openRaiseSelection'),
  @('closeJz', 'closeRaiseSelection'),
  @('bank', 'handleUnavailableBankRequest'),
  @('hall', 'requestReturnToRoomSelection')
)
foreach ($primaryActionMapping in $primaryActionMappings) {
  $originalPrimaryAction = @(
    '    "_componentId": "6b8f4AeDNVOdaQkSDFsDwLn",',
    '    "handler": "onClick",',
    "    `"customEventData`": `"$($primaryActionMapping[0])`""
  ) -join "`n"
  $semanticPrimaryAction = @(
    '    "_componentId": "6b8f4AeDNVOdaQkSDFsDwLn",',
    "    `"handler`": `"$($primaryActionMapping[1])`",",
    "    `"customEventData`": `"$($primaryActionMapping[0])`""
  ) -join "`n"
  $mainText = Replace-ExpectedLiteral $mainText `
    $originalPrimaryAction `
    $semanticPrimaryAction `
    1 `
    "Primary action $($primaryActionMapping[0])"
}

$originalPresentationProperties = @(
  '    "pokerImg": {',
  '      "__uuid__": "201ba0f7-26b3-4686-bbf4-7b78c65d2d26"',
  '    },',
  '    "typeImg": {',
  '      "__uuid__": "e1fce60e-f183-4ea2-a5d9-1a554b068571"',
  '    },',
  '    "currentBet": {',
  '      "__id__": 913',
  '    },',
  '    "allBet": {',
  '      "__id__": 910',
  '    },',
  '    "players": {',
  '      "__id__": 109',
  '    },',
  '    "othTips": {',
  '      "__id__": 941',
  '    },'
) -join "`n"
$semanticPresentationProperties = @(
  '    "cardSpriteAtlas": {',
  '      "__uuid__": "201ba0f7-26b3-4686-bbf4-7b78c65d2d26"',
  '    },',
  '    "handCategorySpriteAtlas": {',
  '      "__uuid__": "e1fce60e-f183-4ea2-a5d9-1a554b068571"',
  '    },',
  '    "collectedPotNode": {',
  '      "__id__": 913',
  '    },',
  '    "totalPotLabel": {',
  '      "__id__": 910',
  '    },',
  '    "participantSeatRootNode": {',
  '      "__id__": 109',
  '    },',
  '    "opponentWaitingTipNode": {',
  '      "__id__": 941',
  '    },'
) -join "`n"
$mainText = Replace-ExpectedLiteral $mainText `
  $originalPresentationProperties `
  $semanticPresentationProperties `
  1 `
  'Main semantic presentation serialized properties'
Save-Utf8WithoutBom $mainPrefabPath $mainText

[PSCustomObject]@{
  verdict = 'SemanticPrefabMappingApplied'
  mappedPrefabCount = 3
  semanticComponentCount = 4
  semanticHandlerFamilyCount = 13
} | ConvertTo-Json
