# Phase A Cocos Naming Mapping

DocumentId: `dzpk-creator247-phase-a-naming-mapping-v2`  
GameCode: `dzpk-955`  
SourceGameId: `119`  
SourceClientGameId: `19`  
CreatorVersion: `2.4.7`  
IndependentReviewStatus: `Passed`  
CompletionClaim: `NotMade`

## 1. Mapping rule and status vocabulary

This mapping records the current frozen independent Creator project. Learning names are now
real semantic source names where the current Prefabs reference them. Original names remain
preserved as byte-identical study evidence and, where required, one-line compatibility aliases.

This document does not authorize renaming original nodes, resources, bundle paths, event names,
Prefab UUIDs or retained source `.meta` files.

| Status | Meaning |
|---|---|
| `Match` | Current source data, visual binding, ordering or compatibility contract matches the selected original authority. |
| `SourceDefectRepair` | A source-proven invalid binding is narrowly repaired without replacing the intended behavior or visual. |
| `IntentionalDifference` | The independent Creator runtime intentionally replaces Hall-owned infrastructure or activates semantic code, with a recorded authority reason. |
| `PlannedLaterPhase` | Reserved boundary only; it is not implemented or independently accepted in Phase A. |

Authority roots:

- `C:\total\kg-cocos-client\728_mobile_restore`
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original`

Version and identity evidence:

- `C:\total\kg-cocos-client\728_mobile_restore\project.json:2`
- `C:\total\kg-cocos-client\728_mobile_restore\assets\_script\Config.js:213-222`
- `C:\total\kg-cocos-client\728_mobile_restore\assets\_script\Main.js:101-102`
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\project.json:2-4`

## 2. Product and source protocol naming

| Original name/value | Current semantic meaning | Status | Evidence |
|---|---|---|---|
| `DZPK` | original DZPK Asset Bundle | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK.meta:3-7` |
| KG `119` | external source game identity | `Match` | `C:\total\game-hub\KG_CLIENT_GAME_CATALOG.md:92` |
| client `19` | source protocol `gtype` used by Cocos | `Match` | `C:\total\kg-cocos-client\728_mobile_restore\assets\_script\Config.js:213-222`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameContext.js:3-5,12-18` |
| `dzpk-955` | independent runtime gameCode | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameContext.js:3-5,28-38` |
| `Msg_Hall_*` | preserved source protocol names, not visible Hall UI | `Match` | Loading/Room semantic controllers below |
| `Msg_DZPK_*` | preserved table source events | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:8-18,58-68` |

## 3. Six Prefab names and current runtime meaning

| Prefab | Original UUID | Current learning/runtime meaning | Status | Current evidence |
|---|---|---|---|---|
| `Load.prefab` | `07af51a2-d569-4a18-978c-537bf728840b` | original Loading visual driven by `DzpkLoadingScreenController` | `IntentionalDifference` for semantic class activation; visual `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Load.prefab:1-190` |
| `Room.prefab` | `efa3b3c7-d745-4874-b161-ae25276fb74a` | original three-room selection visual driven by `DzpkRoomSelectionController` | `IntentionalDifference` for semantic class activation; visual `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:1-3752` |
| `DZPKMain.prefab` | `faea1885-c01d-4a4b-8d14-69319aef5c50` | original 321-node table driven by `DzpkTableGameController` plus `DzpkTablePresentation` | `IntentionalDifference` plus recorded `SourceDefectRepair`; visual/resource tree retained | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:1-21043` |
| `Rule.prefab` | `1eb86003-fa02-4609-b85f-317c3ed33efc` | original Rule popup | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Rule.prefab:1-692` |
| `Set.prefab` | `31f79f27-4c2e-440d-9ad2-edaa10454baf` | original audio/day-night settings popup | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Set.prefab:1-3619` |
| `Bank.prefab` | `8c9ac144-1168-4a02-b5ee-f895a4d6591e` | Hall bank withdrawal source evidence only | `IntentionalDifference`: runtime NotApplicable | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Bank.prefab:1-2430` |

The Prefab names, root nodes and UUIDs are unchanged. Only their active script class bindings and
intended interaction handlers were migrated to semantic names.

## 4. Four active serialized semantic Class IDs

| Prefab node | Semantic class | UUID | Compressed Class ID | Status | Evidence |
|---|---|---|---|---|---|
| `Load` | `DzpkLoadingScreenController` | `41f21fbc-4cb9-409c-b59c-fcff61a6cad8` | `41f21+8TLlAnLWc/P9hpsrY` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Load.prefab:171-187`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:1-141` |
| `Room` | `DzpkRoomSelectionController` | `84ec9e6a-d3ac-434e-9990-4fc863466d3e` | `84ec95q06xDTpmQT8hjRm0+` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:1-288` |
| `DZPKMain` | `DzpkTableGameController` | `6b8f401e-0cd5-4e75-a424-48316c0f02e7` | `6b8f4AeDNVOdaQkSDFsDwLn` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:20997-21015`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:1-992` |
| `DZPKMain` | `DzpkTablePresentation` | `2de88e3d-5d6c-47b1-b942-913966e6ac3f` | `2de8849XWxHsblCkTlm5qw/` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTablePresentation.js:1-1178` |

`DzpkTableStateModel` is the fifth semantic source module but is not a serialized component. It is
constructed by the active table controller:

- UUID `f033a753-344e-4b21-baab-f7fab2491042`;
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:1-579`;
- construction at `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:43-57`.

## 5. Five semantic source modules

| Semantic source file | Learning responsibility | Current role | Status |
|---|---|---|---|
| `DzpkLoadingScreenController.js` | Loading/BGM/preload/GameSessions/Room handoff | active on `Load` | `IntentionalDifference`; source behavior mapping below |
| `DzpkRoomSelectionController.js` | room cards/animation/profile/entry/fast start/Rule/Exit/Main handoff | active on `Room` | `IntentionalDifference`; source behavior mapping below |
| `DzpkTableStateModel.js` | viewer-safe six-seat table and participant state | required by active table controller | `IntentionalDifference`; original field aliases retained |
| `DzpkTableGameController.js` | source event orchestration, player intent, queueing and settlement | active on `DZPKMain` | `IntentionalDifference`; one-line source aliases retained |
| `DzpkTablePresentation.js` | original Prefab nodes, card/chip/Spine/particle/action presentation | active on `DZPKMain` | `IntentionalDifference`; visual/resource bindings `Match` |

Absolute source root:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic`.

## 6. Original five scripts retained but inactive

| Retained original script | Original SHA-256 | Current activation | Status |
|---|---|---|---|
| `DZPKLoad.js` | `bdeedb2cf5f643a995a61f48eda419c18aa3949169b634ec9fe8821a018a92e7` | no current Prefab Class ID reference | bytes `Match`; activation `IntentionalDifference` |
| `DZPKRoom.js` | `482cd858453a1117c21a6300db1dc7ca63dc8cced02efccafa61718091515e73` | no current Prefab Class ID reference | bytes `Match`; activation `IntentionalDifference` |
| `DZPKMode.js` | `f688053c68b0acf4c3d2cb1c359ec4a42dc049312578c8a448252905f2f93304` | retained only as study evidence | bytes `Match`; activation `IntentionalDifference` |
| `DZPKControlle.js` | `7b055de7bf2cf0bb4f25500c67247c8e0949b302833dcee1d2412e899304ab6f` | no current Prefab Class ID reference | bytes `Match`; activation `IntentionalDifference` |
| `DZPKView.js` | `4a0cd231d02b58b11195025475c997448b9071cb104881332ae986841b31407c` | no current Prefab Class ID reference | bytes `Match`; activation `IntentionalDifference` |

Target evidence root:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_script`.
Authority comparison root:
`C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script`.

Byte equality is preservation evidence only; it is no longer used as a substitute for readable
active source.

## 7. Original DZPKLoad public methods to semantic methods

Original file:
`C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKLoad.js:1-104`.
Semantic file:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:1-141`.

| Original public method | Semantic method | Compatibility form | Status / line evidence |
|---|---|---|---|
| `onLoad` | `initializeOriginalLoadingFlow` | one-line Cocos lifecycle proxy | `Match`: original `:18-63`; semantic `:21-30` |
| source BGM block | `startOriginalBackgroundMusic` | direct semantic call | `Match`: original `:25-27`; semantic `:32-36` |
| source loading Spine block | `playOriginalLoadingIntroduction` | direct semantic call | `Match`: original `:28-36`; semantic `:47-64` |
| source reconnect/config branch | `continueAfterLoadingIntroduction` | direct semantic call | `Match`: original `:37-59`; semantic `:66-72` |
| `preloadGameRes` | `preloadOriginalEntryResources` | semantic only | `Match`: original `:72-76`; semantic `:38-45` |
| source GameSessions subscription/send | `requestOriginalRoomConfigurations` | semantic only | `Match`: original `:42-58`; semantic `:74-100` |
| `Msg_Hall_GameSessions` | `handleOriginalRoomConfigurationEnvelope` | semantic event callback | `Match`: original `:64-71`; semantic `:102-111` |
| `loadRoom` | `instantiateOriginalRoomSelection` | semantic only | `Match`: original `:77-101`; semantic `:113-139` |

## 8. Original DZPKRoom public methods to semantic methods

Original file:
`C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKRoom.js:1-192`.
Semantic file:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:1-288`.

| Original method | Semantic method | Compatibility form | Status / line evidence |
|---|---|---|---|
| `onLoad` | `initializeOriginalRoomSelection` | one-line Cocos lifecycle proxy | `Match`: original `:26-37`; semantic `:30-57` |
| `onEnable` | `refreshRoomSelectionWhenEnabled` | one-line Cocos lifecycle proxy | `Match`: original `:38-43`; semantic `:33,59-65` |
| `local_Event` | `handleLegacyLocalEvent` | semantic event subscription | `Match`: original `:44-50`; semantic `:67-75` |
| `initRoom` | `initializeOriginalRoomCardsAndViewerPanel` | semantic only | `Match`: original `:51-62`; semantic `:77-105` |
| `initShow` | `hideRoomSelectionAfterTableSnapshot` | semantic only | `Match`: original `:63-70`; semantic `:107-114` |
| `enterAni` | `playOriginalRoomEntranceAnimation` | semantic only | `Match`: original `:71-91`; semantic `:116-149` |
| `Msg_Hall_EnterRoom` | `handleOriginalEnterRoomEnvelope` | semantic event callback | `Match`: original `:92-101`; semantic `:151-162` |
| `enterRoom` | `requestOriginalRoomEntry` | semantic only | `Match`: original `:102-136`; semantic `:164-208` |
| `faststart` | `startFastRoomEntry` | semantic only | `Match`: original `:137-146`; semantic `:210-228` |
| `roomOnClick` | `handleRoomChoiceButtonPressed` | dynamic Node.on target is semantic | `Match`: original `:147-151`; semantic `:230-235` |
| `onClick` | `handleSerializedMenuAction` | one-line proxy at semantic `:284`; current Prefab calls semantic method directly | `Match`: original `:152-172`; semantic `:237-264,284` |
| `loadGame` | `instantiateOriginalMainTable` | semantic only | `Match`: original `:173-182`; semantic `:266-281` |

## 9. Original DZPKMode public methods to semantic methods

Original file:
`C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKMode.js:1-119`.
Semantic file:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:1-579`.

| Original method | Semantic method | Compatibility alias | Status / line evidence |
|---|---|---|---|
| `initRoom` | `initializeFromRoomSnapshot` | `initRoom` | `Match`: original `:47-65`; semantic `:175-228,552-554` |
| `addPlayer` | `addParticipantFromSourceSnapshot` | `addPlayer` | `Match`: original `:66-73`; semantic `:236-251,555-556` |
| `getPlayer` | `findParticipantByProperty` | `getPlayer` | `Match`: original `:74-82`; semantic `:260-277,557-558` |
| `getDCBet` | `calculatePostflopPotPresetContributions` | `getDCBet` | `Match`: original `:83-89`; semantic `:302-311,559-560` |
| `getDMBet` | `calculatePreflopBlindPresetContributions` | `getDMBet` | `Match`: original `:90-96`; semantic `:320-334,561-562` |
| `getSelectBet` | `calculateRaiseSelectionPresetContributions` | `getSelectBet` | `Match`: original `:97-109`; semantic `:345-377,563-564` |
| `getMaxObj` | `maximumNumericValue` | `getMaxObj` | `Match`: original `:110-116`; semantic `:386-391,565-566` |

## 10. Original DZPKControlle public methods to semantic methods

Original file:
`C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKControlle.js:1-570`.
Semantic file:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:1-992`.

| Original method | Semantic method | One-line compatibility alias | Status / semantic lines |
|---|---|---|---|
| `onLoad` | semantic initialization + event subscription + inherited `m_init` | Cocos lifecycle name retained | `Match`: `:32-36` |
| `initProxy` | `initializeSemanticController` | `:795` | `Match`: `:43-57` |
| `initEvevt` | `subscribeToSourceTableEvents` | typo-preserving alias `:796` | `Match`: `:58-68` |
| `m_roomInfo` | `handleRoomSnapshotReceived` | `:792` | `Match`: `:98-118` |
| `m_upGameGold` | `handleLegacyGoldRefreshRequested` | `:793` | `Match`: `:609-615` |
| `m_NetWorkState` | `handleNetworkStateChanged` | `:794` | `Match`: `:616-622` |
| `addPlayer` | `handleParticipantEntered` plus model `addParticipantFromSourceSnapshot` | none required | `Match`: controller `:194-208`; model `DzpkTableStateModel.js:236-251` |
| `Msg_DZPK_PlayerAct` | `handleParticipantEntered` | `:797` | `Match`: `:194-208` |
| `Msg_DZPK_FaCards` | `handlePrivateCardsDealt` | `:798` | `Match`: `:224-293` |
| `Msg_DZPK_StageBet` | `handleForcedWagersPosted` | `:799` | `Match`: `:295-320` |
| `Msg_DZPK_CallUserAct` | `handleActionTurnStarted` | `:800` | `Match`: `:321-381` |
| `Msg_DZPK_ActBet` | `handleParticipantActionApplied` | `:801` | `Match`: `:382-444` |
| `Msg_DZPK_PublicCards` | `handleCommunityCardsRevealed` | `:802` | `Match`: `:445-490` |
| `Msg_DZPK_Result` | `handleHandSettled` | `:803` | `Match`: `:491-599` |
| `Msg_DZPK_ChangGold` | `handleParticipantBalanceChanged` | `:804` | `Match`: `:600-608` |
| `Msg_DZPK_Out` | `handleParticipantLeft` | `:805` | `Match`: `:210-222` |
| `onClick` | `handleLegacyPrimaryButton` | `:806` | compatibility `Match`; Prefab uses semantic handlers |
| `autoOnClick` | `toggleAutomaticActionSelection` | `:807` | `Match`: `:670-681` |
| `dmOnClick` | `requestPreflopPresetByIndex` | `:808` | `Match`: `:651-654` |
| `dcOnClick` | `requestPostflopPresetByIndex` | `:809` | `Match`: `:655-658` |
| `selectBet` | `submitRaiseSelectionFromButton` | `:810` | `Match`: `:663-666` |
| `sliderEvevt` | `handleRaiseSliderChanged` | `:811` | `Match`: `:667-669` |
| `sendMsgActBet` | `submitPlayerActionContribution` | `:812` | `Match`: `:682-704` |

## 11. Original DZPKView public methods to semantic methods

Original file:
`C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKView.js:1-1090`.
Semantic file:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTablePresentation.js:1-1178`.

| Original method | Semantic method(s) | Status / semantic line evidence |
|---|---|---|
| `initShow` | `initializeTablePresentation` | `Match`: `:33-51` |
| `playBGAnim` | `playAmbientTableAnimation` | `Match`: `:69-76` |
| `add_Delete_Player` | `setParticipantSeatPresence` | `Match`: `:78-110` |
| `setPlayerInfo` | `renderParticipantProfile` | `Match`: `:112-128` |
| `setPlayerGold` | `renderParticipantChipBalance` | `Match`: `:130-135` |
| `initPlayer` | `resetParticipantSeatPresentation` | `Match`: `:137-143` |
| `setPlayerTips` | `renderParticipantActionBadge` | `Match`: `:145-187` |
| `setPlayerTime` | `renderParticipantActionCountdown` | `Match`: `:189-204` |
| `setPlayerBet` | `animateParticipantWager` | `Match`: `:206-256` |
| `setPlayerPoker` | `renderParticipantHoleCards` | `Match`: `:258-280` |
| `setPlayerOpacity` | `setParticipantFoldedAppearance` | `Match`: `:282-290` |
| `initAllPoker` | `hideAllOpponentHoleCards` plus `renderExistingCommunityCards` | `Match`: `:292-298,1002-1015` |
| `getPokerUrl` | `resolvePokerSpriteFrameNames` | `Match`: `:300-309` |
| `setPokerNode` | `renderCardFace` | `Match`: `:311-328` |
| `setPlayerBanker` | `renderDealerButtonAtSeat` | `Match`: `:330-343` |
| `setAllBet` | `renderTotalPotAmount` | `Match`: `:345-347` |
| `setCurrentBet` | `renderCollectedPotAmount` | `Match`: `:349-361` |
| `setThbBet` | `renderWagerDifferenceAmount` | `Match`: `:363-369` |
| `showTips` | `showTableStatusTip` | `Match`: `:371-380` |
| `showBtn` | `showPlayerActionControls` | `Match`: `:382-424` |
| `showAutoBtn` | `synchronizeAutomaticActionToggles` | `Match`: `:426-437` |
| `openSelectBet` | `setRaiseSelectionVisible` | `Match`: `:439-486` |
| `sliderEvevt` | `handleRaiseSliderChanged`; one-line alias retained | `Match`: `:488-524,1133-1137` |
| `showFaPai` | `animateHoleCardDeal` | `Match`: `:526-595` |
| `recoverBet` | `animateWagerCollectionToPot` | `Match`: `:597-630` |
| `showGetPlayerBet` | `animateStandardPotDistribution` and `animateCentralPotToParticipant` | `Match`: `:632-680` |
| `showWinGold` | `renderSettlementAwardLabels`, `renderPrimaryWinnerAward`, `renderClonedOriginalAmountLabel` | `Match` plus source-shaped multi-award extension: `:723-826` |
| `playerBrightCard` | `renderParticipantShowdown` | `Match`: `:828-900` |
| `recoveryPoker` | `animateParticipantCardsRecovery` | `Match`: `:902-973` |
| `initPlayerBetTips` | `hideParticipantActionBadge` plus `restoreParticipantHoleCardColors` | `Match`: `:975-986` |
| `setPlayerPokerOpacity` | `restoreParticipantHoleCardColors` | `Match`: `:981-986` |
| `setPlayerPokerTips` | `renderViewerHandCategory` | `Match`: `:988-995` |
| `getPokerType` | `parseLegacyHandCategory` | `Match`: `:997-1000` |
| `setPubliccards` | `renderExistingCommunityCards` | `Match`: `:1002-1015` |
| `showPubliccards` | `animateCommunityCardReveal` and two semantic paths | `Match`: `:1017-1109` |
| `setPubLiccardColor` | `highlightWinningCommunityCards` | `Match`: `:1111-1131` |

## 12. Serialized Room and Presentation properties

Room evidence:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745`.

| Original property | Semantic serialized property | Current target path | Status |
|---|---|---|---|
| `content` | `roomChoiceContainer` | `Room/main/content` | `Match` |
| `top` | `topToolbarNode` | `Room/main/top` | `Match` |
| `bottom` | `bottomPlayerPanelNode` | `Room/main/bottom` | `Match` |
| `head` | `viewerAvatarSprite` | Sprite at `Room/main/bottom/info/head` | `Match` |
| `nickname` | `viewerNicknameLabel` | Label at `Room/main/bottom/info/name` | `Match` |
| `gold` | `viewerGoldLabel` | Label at `Room/main/bottom/di/label` | `Match` |
| `bankGold` | `viewerBankGoldLabel` | unbound/null because Bank is NotApplicable | `IntentionalDifference` |

Presentation evidence:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039`.

| Original DZPKView property | Semantic property | Current binding | Status |
|---|---|---|---|
| `pokerImg` | `cardSpriteAtlas` | UUID `201ba0f7-26b3-4686-bbf4-7b78c65d2d26` | `Match` |
| `typeImg` | `handCategorySpriteAtlas` | UUID `e1fce60e-f183-4ea2-a5d9-1a554b068571` | `Match` |
| `currentBet` | `collectedPotNode` | `DZPKMain/label/allbet` | `Match` |
| `allBet` | `totalPotLabel` | Label at `DZPKMain/di` | `Match` |
| `players` | `participantSeatRootNode` | `DZPKMain/player` | `Match` |
| `othTips` | `opponentWaitingTipNode` | `DZPKMain/tips/oth` | `Match` |

## 13. Model and participant field mapping

Model field evidence:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:146-166,407-440`.

```text
playerList  -> participants
currentBet  -> collectedPreviousStreetPotChips
my_l_seat   -> viewerLocalSeatId
autoList    -> automaticActionSelections
genGold     -> callAmountChips
publiccards -> publicBoardCards
allBet      -> totalPotChips
notice      -> currentActionNotice
my_s_seat   -> viewerSourceSeatId
my_data     -> viewerParticipant
level       -> roomLevel
doublescore -> smallBlindChips
curbet      -> sourceActionsByParticipant
allbets     -> handContributionsByParticipant
bankeruid   -> dealerParticipantId
stage       -> sourceStageCode
```

Participant field evidence:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:75-140`.

```text
uid        -> participantId
seat       -> sourceSeatId
l_seat     -> viewerLocalSeatId
nickname   -> displayName
gold       -> stackChips
headimgurl -> avatarKey
cards      -> holeCards
betGold    -> displayedStreetContributionChips
act        -> sourceActionCode
join       -> isParticipating
```

## 14. Standalone modules are Cocos-internal

`assets/Standalone` is a non-bundle Creator asset folder, not an external renderer or shell:

- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone.meta:1-13`.

| Cocos-internal module | Responsibility | Status | Evidence |
|---|---|---|---|
| `StandaloneBoot.js` | Canvas composition, authenticated start, foreground/background | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\StandaloneBoot.js:1-112` |
| `GameContext.js` | viewer-safe `wGameData` state | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameContext.js:1-113` |
| `DzpkEventBus.js` | source event bus and `wGEvent` aliases | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkEventBus.js:1-51` |
| `DzpkResourceLoader.js` | original bundle/prefab loading and `wRes` adapter | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkResourceLoader.js:1-44` |
| `DzpkAudioService.js` | original AudioManager plus browser gesture gate | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkAudioService.js:1-79` |
| `DzpkUiMessageService.js` | Hall-only messages plus original Night control | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkUiMessageService.js:1-88` |
| `DzpkViewNavigator.js` | original Load/Room/Main/Rule/Set navigation | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkViewNavigator.js:1-79` |
| `SourceProtocolAdapter.js` | Base64 source envelope and viewer projection | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\SourceProtocolAdapter.js:1-106` |
| `GameHubAuthenticatedTransport.js` | authenticated session, WS, request IDs and reconnect state | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:1-325` |
| `LegacyGlobalBridge.js` | exact `w*` aliases | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\LegacyGlobalBridge.js:1-43` |
| `LegacyTypeScriptRuntimeHelpers.js` | Creator plug-in supplying five TypeScript helper globals | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\LegacyTypeScriptRuntimeHelpers.js:1-250`; meta `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\LegacyTypeScriptRuntimeHelpers.js.meta:1-10` |

## 15. Current entry chain

```text
DzpkStandaloneBoot.fire / StandaloneBoot
  -> configure 1334x750 Cocos Canvas
  -> construct Cocos-internal Standalone services
  -> expose required w* compatibility names
  -> initialize authenticated session and source-protocol websocket
  -> load original DZPK Asset Bundle
  -> original Load + semantic Loading controller
  -> original Room + semantic Room controller
  -> original DZPKMain + semantic Game controller and Presentation
  -> semantic TableStateModel
```

Evidence:

- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Scene\DzpkStandaloneBoot.fire:1-143`
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\StandaloneBoot.js:16-98`
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkViewNavigator.js:22-50`
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:113-139`
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:266-281`

## 16. Original Night node

The target reuses the original `Night/New Sprite(Splash)` structure, color, default SpriteFrame,
1334x750 size, Widget fill and opacity semantics. It is not an external overlay.

| Source node | Current node | Status | Evidence |
|---|---|---|---|
| `Main.fire/Night` | `DzpkStandaloneBoot.fire/Canvas/Night` | `IntentionalDifference`: moved under standalone Canvas; source semantics retained | source `C:\total\kg-cocos-client\728_mobile_restore\assets\Scene\Main.fire:169-268`; target `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Scene\DzpkStandaloneBoot.fire:103-143` |
| source day/night method | `DzpkUiMessageService.applyDayNightAppearance` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkUiMessageService.js:61-66,84-85` |
| source time query | `GameContext.get_day_night` | `Match` intent | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameContext.js:85-92` |

## 17. Session and reconnect naming

| Semantic name | Responsibility | Status | Evidence |
|---|---|---|---|
| `initializeAuthenticatedSession` | launch/session credential exchange, TRIAL validation and URL cleanup | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:29-95,254-263` |
| `readSessionReconnectState` | validates origin/game/session/room storage state | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:265-298` |
| `persistSessionReconnectState` | persists scoped session and room resume state | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:300-315` |
| `subscribeReconnectLocationUpdates` | tracks EnterRoom/RoomInfo/Out location changes | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:204-237` |
| `scheduleAuthenticatedReconnect` | bounded exponential reconnect | `IntentionalDifference`; fresh recovery review passed | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:168-188` |
| `restoreAuthenticatedConnection` | foreground socket restoration | `IntentionalDifference`; fresh recovery review passed | transport `:185-188`; Boot `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\StandaloneBoot.js:100-110` |
| `GameContext.isReconnect` | source Load/Room reconnect branch | compatibility `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameContext.js:12-19`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:45-51` |

## 18. Bank NotApplicable

`Bank = SourcePresentButStandaloneRuntimeNotApplicable`.

| Fact | Status | Evidence |
|---|---|---|
| Bank Prefab and GameBank source remain preserved | `Match` evidence | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Bank.prefab:1-2430`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\_script\GameBank.js:1-151` |
| Room bank action is an explicit no-op | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:237-264` |
| Table bank action shows unavailable and returns false | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:726-750` |
| Navigator allows only Rule/Set popup paths | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkViewNavigator.js:40-50` |

## 19. Future authenticated two-to-six-human boundary

- seat count and min/max reservation:
  `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:7-8,48-55`;
- Phase A rejects seat deltas:
  `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:393-405`.

| Reserved boundary | Status |
|---|---|
| 2-6 authenticated participants in existing `player/{0..5}` | `PlannedLaterPhase` |
| per-viewer private-hole-card projection | `PlannedLaterPhase` |
| action ownership, revision and deadline | `PlannedLaterPhase` |
| multi-viewer reconnect with stable local seats | `PlannedLaterPhase` |
| human/robot authority without alternate seat UI | `PlannedLaterPhase` |
| independent multi-winner/side-pot money reconciliation | `PlannedLaterPhase` |

## 20. Current mapping conclusion

```text
FourSemanticPrefabClassIdsActive: true
FiveSemanticSourceModulesPresent: true
OriginalFiveScriptsPreservedAsInactiveEvidence: true
OriginalNodesRenamed: false
BankStandaloneRuntimeApplicable: false
TwoToSixRealHumanAccepted: false
IndependentReviewPending: true
PhaseACompletionClaimed: false
```
