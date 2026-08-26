# Phase A Cocos Component Mapping

DocumentId: `dzpk-creator247-phase-a-component-mapping-v2`  
AuthoritySource: `C:\total\kg-cocos-client\728_mobile_restore`  
TargetProject: `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original`  
CreatorVersion: `2.4.7`  
IndependentReviewStatus: `Passed`  
CompletionClaim: `NotMade`

## 1. Component-map contract

The current frozen Prefabs now reference semantic Creator components directly. Original nodes,
Prefab UUIDs, resources, Spine/Particle/Animation bindings and source event names remain
authoritative. The retained original five scripts are byte evidence, not the active runtime.

| Status | Meaning |
|---|---|
| `Match` | Current component data or source behavior matches selected authority. |
| `SourceDefectRepair` | A source-invalid binding is narrowly repaired. |
| `IntentionalDifference` | Semantic components or Hall replacement infrastructure intentionally differ for the approved independent Creator target. |
| `PlannedLaterPhase` | Reserved and not independently accepted in Phase A. |

The exhaustive original-public-method naming table is in
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\docs\phase-a-cocos-naming-mapping.md`.

## 2. Current Prefab byte snapshot

| Prefab | Current SHA-256 | Current meaning | Status |
|---|---|---|---|
| `Bank.prefab` | `94ac7944b95c9811edce3db382e82af2a3373f5847bfbf9b00fc53aac93acda9` | exact source evidence | `Match` evidence; runtime NotApplicable |
| `Load.prefab` | `a8ba5b98036d45d57ff30b9dbddb88b146616bc4887f4bfee9eac55eac3a3449` | original visual with semantic Loading Class ID | `IntentionalDifference` |
| `Room.prefab` | `3bb185f13bf2ee145561a928fa080ea9445b037942ef376cbe02f3007709b967` | original visual/properties migrated to semantic Room Class ID | `IntentionalDifference` |
| `DZPKMain.prefab` | `e6ecda294f103b2c4da7ffc311a09806cf06c201a50c66be2c6074ec02a1245a` | original 321-node table with semantic Controller/Presentation and semantic handlers | `IntentionalDifference` plus `SourceDefectRepair` |
| `Rule.prefab` | `7e4366a86d0c65683506540d453934be0e6107b46bef31c4aeab07dc3e4a7291` | exact source Rule popup | `Match` |
| `Set.prefab` | `962f2e69dab8a9bb89c4c6d0e559d0fd20b44e43368249f9f047dce2d9b01191` | exact source Set popup | `Match` |

Current Prefab root:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab`.

## 3. Four active semantic Class IDs

| Prefab node | Original Prefab UUID | Active semantic component | UUID / Class ID | Status | Evidence |
|---|---|---|---|---|---|
| `Load` | `07af51a2-d569-4a18-978c-537bf728840b` | `DzpkLoadingScreenController` | `41f21fbc-4cb9-409c-b59c-fcff61a6cad8` / `41f21+8TLlAnLWc/P9hpsrY` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Load.prefab:171-187` |
| `Room` | `efa3b3c7-d745-4874-b161-ae25276fb74a` | `DzpkRoomSelectionController` | `84ec9e6a-d3ac-434e-9990-4fc863466d3e` / `84ec95q06xDTpmQT8hjRm0+` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745` |
| `DZPKMain` | `faea1885-c01d-4a4b-8d14-69319aef5c50` | `DzpkTableGameController` | `6b8f401e-0cd5-4e75-a424-48316c0f02e7` / `6b8f4AeDNVOdaQkSDFsDwLn` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:20997-21015` |
| `DZPKMain` | `faea1885-c01d-4a4b-8d14-69319aef5c50` | `DzpkTablePresentation` | `2de88e3d-5d6c-47b1-b942-913966e6ac3f` / `2de8849XWxHsblCkTlm5qw/` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |

Fifth semantic module, not serialized:

- `DzpkTableStateModel`, UUID `f033a753-344e-4b21-baab-f7fab2491042`;
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:1-579`;
- constructed at `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:43-57`.

## 4. Load Prefab component map

| Item | Current mapping | Status | Evidence |
|---|---|---|---|
| Prefab root | `Load`, 1334x750, four nodes | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Load.prefab:1-190` |
| active custom component | `DzpkLoadingScreenController`, no serialized fields | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Load.prefab:171-187`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:1-141` |
| Cocos lifecycle | `onLoad -> initializeOriginalLoadingFlow` | `Match` behavior | semantic source `:21-30` |
| BGM | stop old music then play `sound/back` from DZPK bundle | `Match` | semantic source `:32-36`; authority `C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKLoad.js:25-27` |
| preload | Main path then `prefab/Room` in original bundle order | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:38-45`; authority `C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKLoad.js:72-76` |
| animation | `Load/main/spine` plays `start -> idle(loop)` and waits 0.7 s | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:47-64`; `C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKLoad.js:28-36` |
| source event | subscribes/sends `Msg_Hall_GameSessions`; 10-second failure route | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:74-111` |
| handoff | `cc.instantiate(originalRoomPrefab)` under Canvas `Room` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:113-139` |

Load has no Button, Toggle or Slider component.

## 5. Room Prefab component map

### 5.1 Root and serialized properties

| Item | Current mapping | Status | Evidence |
|---|---|---|---|
| Prefab root | `Room`, 1334x750, 58 nodes | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:1-3752` |
| active component | `DzpkRoomSelectionController` | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745` |
| `roomChoiceContainer` | `Room/main/content` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745` |
| `topToolbarNode` | `Room/main/top` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745` |
| `bottomPlayerPanelNode` | `Room/main/bottom` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745` |
| `viewerAvatarSprite` | Sprite at `Room/main/bottom/info/head` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745` |
| `viewerNicknameLabel` | Label at `Room/main/bottom/info/name` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745` |
| `viewerGoldLabel` | Label at `Room/main/bottom/di/label` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3712-3745` |
| `viewerBankGoldLabel` | not serialized | `IntentionalDifference`: Bank NotApplicable | component property declared at `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:18-28` |

Three retained `RoomChoose` components remain at:

```text
Room/main/content/0/room/RoomChoose
Room/main/content/1/room/RoomChoose
Room/main/content/2/room/RoomChoose
```

They retain source class ID `d3efcryMUdN4pvxegoyrfhQ` and rotate original room art every ten
seconds. Evidence:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\_script\RoomChoose.js:24-44`.

### 5.2 Room Button handlers

| Serialized node | Current handler / data | Source event or effect | Status | Evidence |
|---|---|---|---|---|
| `Room/main/content/{0,1,2}` | no serialized ClickEvent; runtime `handleRoomChoiceButtonPressed` | calculates level 1-3 and requests EnterRoom | `Match` | dynamic binding `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:77-105,230-235` |
| `Room/main/top/rule` | `handleSerializedMenuAction("rule")` | opens original `prefab/Rule` | `IntentionalDifference` naming; behavior `Match` | Prefab `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:2518-2538`; controller `DzpkRoomSelectionController.js:237-264` |
| `Room/main/top/exit` | `handleSerializedMenuAction("exit")` | standalone exit boundary | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:2614-2634`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:237-264` |
| `Room/main/bottom/di/bank/bank` | `handleSerializedMenuAction("bank")` | explicit no-op | `IntentionalDifference`: Bank NotApplicable | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3425-3445`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:237-264` |
| `Room/main/bottom/btn/faststart` | `handleSerializedMenuAction("faststart")` | scans source room config and sends EnterRoom | naming `IntentionalDifference`; behavior `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:3641-3661`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:164-228` |

### 5.3 Room events and animations

| Component/event | Current behavior | Status | Evidence |
|---|---|---|---|
| `local_Event/up_Gold` | refreshes viewer gold and optional bank label | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:35-75` |
| `Msg_DZPK_RoomInfo` | hides Room after source table snapshot | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:35-57,107-114` |
| `Msg_Hall_EnterRoom` | records rid then loads Main; 20-second timeout | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:151-208` |
| top toolbar entrance | source delay/move to `(0,375)` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:116-126` |
| room character Spine entrance | source move/fade from `(-585)` to `(-435,-370.37)` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:127-139` |
| room choices entrance | source move/fade from x 265 to x 115 | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:140-149` |
| Room Spines | main character, three rooms, fast-start Spine | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:1-3752` |

## 6. DZPKMain Prefab component map

### 6.1 Active and retained components

| Node | Component | Current role | Status | Evidence |
|---|---|---|---|---|
| `DZPKMain` | `DzpkTableGameController` | event orchestration and player intent | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:20997-21015` |
| `DZPKMain` | `DzpkTablePresentation` | original visual presentation | `IntentionalDifference`; visual binding `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |
| `DZPKMain/DropDown` | original `DropDown` | original menu panel | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:20880-20930` |
| `DZPKMain/DropDown/switchBtn` | original `AdaptView`, twice | original wide-view positioning | `Match`; duplicate retained | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:20750-20885` |

### 6.2 Presentation serialized properties

| Property | Current target binding | Status | Evidence |
|---|---|---|---|
| `cardSpriteAtlas` | UUID `201ba0f7-26b3-4686-bbf4-7b78c65d2d26` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |
| `handCategorySpriteAtlas` | UUID `e1fce60e-f183-4ea2-a5d9-1a554b068571` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |
| `collectedPotNode` | `DZPKMain/label/allbet` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |
| `totalPotLabel` | Label at `DZPKMain/di` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |
| `participantSeatRootNode` | `DZPKMain/player` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |
| `opponentWaitingTipNode` | `DZPKMain/tips/oth` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |

### 6.3 Main Button handlers

| Serialized path | Current semantic handler | Data | Status |
|---|---|---|---|
| `btn/bet/btn_drop` | `requestFoldAction` | `qi` | `IntentionalDifference` naming; source behavior `Match` |
| `btn/bet/btn_green` | `requestCallAction` | `gen` | `IntentionalDifference` naming; source behavior `Match` |
| `btn/bet/btn_rang` | `requestCheckAction` | `rang` | `IntentionalDifference` naming; source behavior `Match` |
| `btn/bet/btn_yellow` | `openRaiseSelection` | `jia` | `IntentionalDifference` naming; source behavior `Match` |
| `btn/bet/dm/{0,1,2}` | `requestPreflopPresetByIndex` | `{0,1,2}` | `IntentionalDifference` naming; source values `Match` |
| `btn/bet/dichi/{0,1,2}` | `requestPostflopPresetByIndex` | `{0,1,2}` | `IntentionalDifference` naming; source values `Match` |
| `btn/jiabet/New Node` | `closeRaiseSelection` | `closeJz` | `IntentionalDifference` naming; source behavior `Match` |
| `btn/jiabet/{0..4}` | `submitRaiseSelectionFromButton` | `{0..4}` | `IntentionalDifference` naming; source values `Match` |
| `btn/jiabet/btn` | `submitRaiseSelectionFromButton` | empty | `IntentionalDifference` naming; source behavior `Match` |
| `DropDown/switchBtn/mask/panel/bank` | `handleUnavailableBankRequest`; `DropDown.onClickBtn` | `bank` | `IntentionalDifference`: Bank NotApplicable |
| `DropDown/switchBtn/mask/panel/rule` | `DropDown.onClickBtn` | `rule` | correct source handler `Match`; stale ERNN binding repaired |
| `DropDown/switchBtn/mask/panel/set` | `DropDown.onClickBtn` | `set` | correct source handler `Match`; stale BJL binding repaired |
| `DropDown/switchBtn/mask/panel/exit` | `requestReturnToRoomSelection`; `DropDown.onClickBtn` | `hall`; `close` | `IntentionalDifference`: source `Msg_DZPK_Out` returns to original Room; only Room exit ends the standalone game |
| `DropDown/switchBtn` | `DropDown.onClickBtn` | `switch` | `Match` |
| `DropDown/closeBtn` | `DropDown.onClickBtn` | `close` | `Match` |

Exact serialized handler evidence:

- actions and presets:
  `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:13278-15870,18883-18910`;
- Bank and Exit:
  `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:20212-20240,20647-20680`;
- semantic controller methods:
  `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:632-750`.

Buttons with no serialized ClickEvent remain:

```text
DZPKMain/btn/jiabet/slider/slider/Handle/btn_add
DZPKMain/btn/jiabet/slider/slider/Handle/btn_sub
DZPKMain/btn/jiabet/slider/slider/Handle
```

The Presentation binds add/sub dynamically using original nodes at
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTablePresentation.js:467-485`.

### 6.4 Main Toggle and Slider handlers

| Node | Event | Current handler | Data | Status | Evidence |
|---|---|---|---|---|---|
| `btn/auto/0` | Toggle | `toggleAutomaticActionSelection` | `0` | `IntentionalDifference` naming; behavior `Match` | Prefab `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:12485-12510` |
| `btn/auto/1` | Toggle | `toggleAutomaticActionSelection` | `1` | `IntentionalDifference` naming; behavior `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:12763-12788` |
| `btn/auto/2` | Toggle | `toggleAutomaticActionSelection` | `2` | `IntentionalDifference` naming; behavior `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:13041-13066` |
| `btn/jiabet/slider/slider` | Slider | `handleRaiseSliderChanged` on `DzpkTablePresentation` | empty | `IntentionalDifference` naming; source animation `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:18702-18730`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTablePresentation.js:488-524` |

### 6.5 Source event subscriptions

`DzpkTableGameController` preserves these source names at
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:8-18,58-96`:

```text
Msg_DZPK_PlayerAct  -> handleParticipantEntered
Msg_DZPK_FaCards    -> handlePrivateCardsDealt
Msg_DZPK_StageBet   -> handleForcedWagersPosted
Msg_DZPK_CallUserAct -> handleActionTurnStarted
Msg_DZPK_ActBet     -> handleParticipantActionApplied
Msg_DZPK_PublicCards -> handleCommunityCardsRevealed
Msg_DZPK_Result     -> handleHandSettled
Msg_DZPK_ChangGold  -> handleParticipantBalanceChanged
Msg_DZPK_Out        -> handleParticipantLeft
```

`PokerBase` still supplies RoomInfo, FinishLoad, Connect, local event and socket state lifecycle.
Compatibility aliases are one-line methods at
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:791-812`.

### 6.6 Main animation and state ownership

| Area | Semantic owner | Current behavior | Status | Evidence |
|---|---|---|---|---|
| full RoomInfo snapshot | Game controller + state model + presentation | cancels stale presentation epoch and rebuilds all six seats | `IntentionalDifference` readable orchestration; source state semantics `Match` | controller `:97-193` |
| private-card deal | Game controller + Presentation | source dealer-relative two-card order and 0.1-second spacing | `Match` | controller `:223-294`; presentation `DzpkTablePresentation.js:526-595` |
| forced bets and actions | controller + Presentation | authoritative contributions, badges, sounds, fold/all-in | `Match` | controller `:295-444` |
| community streets | controller + Presentation | collect wagers then original public-card animations | `Match` | controller `:445-490`; presentation `:1017-1109` |
| settlement | controller + Presentation | original delays/Spines/chips plus source-shaped pot layers | `IntentionalDifference` extension on original nodes; original effects `Match` | controller `:491-599`; presentation `:632-900` |
| presentation queue | controller | epoch invalidation protects reconnect/new-hand from stale delayed animations | `IntentionalDifference` | controller `:752-789` |

## 7. Rule Prefab component map

| Item | Mapping | Status | Evidence |
|---|---|---|---|
| UUID/root | `1eb86003-fa02-4609-b85f-317c3ed33efc`, `Rule`, 1334x750 | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Rule.prefab:1-692` |
| custom class | source `Rule`, class ID `54b1fUbldVKFbGa96khzXcp` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Rule.prefab:660-690` |
| `Rule/main/close` | `Rule.hide()` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Rule.prefab:600-690` |
| popup animation | source `PopupBase.show/hide` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\_script\PopupBase.js:22-86` |

Rule is loaded only through the in-project navigator at
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkViewNavigator.js:40-50`.

## 8. Set Prefab component map

| Item | Mapping | Status | Evidence |
|---|---|---|---|
| UUID/root | `31f79f27-4c2e-440d-9ad2-edaa10454baf`, `Set`, 1334x750 | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Set.prefab:1-3619` |
| custom class | source `Set`, class ID `a1620EgCLtEJIt9xU6fN9HW` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Set.prefab:3590-3619` |
| backdrop / close | `Set.hide()` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Set.prefab:50-135,220-295` |
| `m/{yl,yx,jy}` | Toggle `YXonClick({yl,yx,jy})` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Set.prefab:964-983,1471-1490,1978-1997` |
| `scene/{zd,bt,yj}` | Toggle `CJonClick({zd,bt,yj})` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Set.prefab:2529-2548,3036-3055,3543-3562` |
| day/night effect | `wUIManager.show_day_night` routes to original Night node | `IntentionalDifference` owner, original visual `Match` | source `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\_script\Set.js:42-63,95-119`; service `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkUiMessageService.js:61-66,84-85` |

## 9. Bank Prefab component map and NotApplicable proof

| Item | Mapping | Status | Evidence |
|---|---|---|---|
| UUID/root | `8c9ac144-1168-4a02-b5ee-f895a4d6591e`, `Bank`, 1334x750 | `Match` evidence | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Bank.prefab:1-2430` |
| source component | `GameBank`, class ID `5f912OUA+FHM7tmcUKZuinR` | source `Match`; runtime NotApplicable | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Bank.prefab:2378-2420`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\_script\GameBank.js:1-151` |
| close/backdrop | `hide` | source `Match`; unreachable runtime | Bank Prefab |
| purge/deposit/all/slider | source Hall bank handlers | source `Match`; unreachable runtime | `GameBank.js:28-33,54-149` |
| Room bank | semantic no-op | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:237-264` |
| table bank | semantic unavailable message/false | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableGameController.js:726-750` |
| popup routing | only Rule/Set accepted | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkViewNavigator.js:40-50` |

`Bank = SourcePresentButStandaloneRuntimeNotApplicable`.

## 10. State-model field and compatibility component map

Semantic fields and aliases are defined at:

- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:75-166`;
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:407-440,552-579`.

| Original model field | Semantic field | Status |
|---|---|---|
| `playerList` | `participants` | `Match` compatibility |
| `currentBet` | `collectedPreviousStreetPotChips` | `Match` compatibility |
| `my_l_seat` | `viewerLocalSeatId` | `Match` compatibility |
| `autoList` | `automaticActionSelections` | `Match` compatibility |
| `genGold` | `callAmountChips` | `Match` compatibility |
| `publiccards` | `publicBoardCards` | `Match` compatibility |
| `allBet` | `totalPotChips` | `Match` compatibility |
| `notice` | `currentActionNotice` | `Match` compatibility |
| `my_s_seat` | `viewerSourceSeatId` | `Match` compatibility |
| `my_data` | `viewerParticipant` | `Match` compatibility |
| `level` | `roomLevel` | `Match` compatibility |
| `doublescore` | `smallBlindChips` | `Match` compatibility |
| `curbet` | `sourceActionsByParticipant` | `Match` compatibility |
| `allbets` | `handContributionsByParticipant` | `Match` compatibility |
| `bankeruid` | `dealerParticipantId` | `Match` compatibility |
| `stage` | `sourceStageCode` | `Match` compatibility |

Participant aliases:

```text
uid/seat/l_seat/nickname/gold/headimgurl/cards/betGold/act/join
  -> participantId/sourceSeatId/viewerLocalSeatId/displayName/stackChips/
     avatarKey/holeCards/displayedStreetContributionChips/sourceActionCode/isParticipating
```

## 11. Original five scripts: preserved evidence, not active components

| Original script | Current evidence path | Active Prefab reference | Status |
|---|---|---|---|
| `DZPKLoad.js` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_script\DZPKLoad.js:1-104` | none | bytes `Match`; activation `IntentionalDifference` |
| `DZPKRoom.js` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_script\DZPKRoom.js:1-192` | none | bytes `Match`; activation `IntentionalDifference` |
| `DZPKMode.js` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_script\DZPKMode.js:1-119` | none | bytes `Match`; activation `IntentionalDifference` |
| `DZPKControlle.js` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_script\DZPKControlle.js:1-570` | none | bytes `Match`; activation `IntentionalDifference` |
| `DZPKView.js` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_script\DZPKView.js:1-1090` | none | bytes `Match`; activation `IntentionalDifference` |

The active readable components and their exact original method mappings are in
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\docs\phase-a-cocos-naming-mapping.md`.

## 12. Original animation and resource component bindings

| Binding | Current semantic owner | Status | Evidence |
|---|---|---|---|
| Load `start -> idle(loop)` | Loading controller | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkLoadingScreenController.js:47-64` |
| Room five Spines and source entrance Actions | Room controller / original Prefab | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkRoomSelectionController.js:116-149`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\Room.prefab:1-3752` |
| 25 main Spine components, six particles, seven Animations | Presentation / original Prefab | `Match` bindings | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:1-21043` |
| ambient `suiji1..4` | `playAmbientTableAnimation` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTablePresentation.js:69-76` |
| player countdown | `renderParticipantActionCountdown` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTablePresentation.js:189-204` |
| original card/chip cc.Action paths | semantic deal/wager/pot/community methods | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTablePresentation.js:206-256,526-680,902-973,1017-1109` |
| original winner/Big Win effects | semantic showdown/award methods | `Match` plus pot-layer extension on cloned original nodes | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTablePresentation.js:682-900` |
| shared BJL card atlas | `cardSpriteAtlas` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039`; `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\BJL\_res\Atlas_plist\BRNNResult\plist_puke.plist.meta:1-1991` |
| hand-type atlas | `handCategorySpriteAtlas` | `Match` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:21011-21039` |
| source audio paths | Loading/controller/Presentation through original AudioManager | `Match` paths; browser unlock `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkAudioService.js:1-79` |

No current component may substitute DOM, CSS, SVG, generated cards or a second table/result UI.

## 13. Cocos-internal Standalone component graph

`assets/Standalone` belongs to the Creator project and has `isBundle: false`; it is not an
external shell. Evidence:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone.meta:1-13`.

```text
DzpkStandaloneBoot.fire / Canvas
  -> StandaloneBoot
       -> GameContext
       -> DzpkEventBus
       -> DzpkResourceLoader -> original ResLoader
       -> DzpkAudioService -> original AudioManager
       -> DzpkUiMessageService -> MessageOverlay + original Night
       -> SourceProtocolAdapter
       -> GameHubAuthenticatedTransport
       -> DzpkViewNavigator
       -> LegacyGlobalBridge -> required w* aliases
  -> original DZPK bundle and semantic Prefab components
```

`LegacyTypeScriptRuntimeHelpers.js` is a Creator plug-in under the same assets tree and installs
`__extends`, `__decorate`, `__awaiter`, `__generator` and `__spreadArrays` before recovered
CommonJS modules. Evidence:

- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\LegacyTypeScriptRuntimeHelpers.js:1-14,242-250`
- `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\LegacyTypeScriptRuntimeHelpers.js.meta:1-10`

## 14. Boot Scene and original Night component

Current Boot Scene:
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Scene\DzpkStandaloneBoot.fire:1-143`.

```text
Canvas
  Main Camera
  Game
  Room
  UIShow
  MessageOverlay
  Night
    New Sprite(Splash)
```

| Component | Current mapping | Status | Evidence |
|---|---|---|---|
| Canvas | 1334x750, semantic Boot component | `IntentionalDifference` owner; source size `Match` | Scene `:22-101`; Boot `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\StandaloneBoot.js:16-98` |
| Night | original name, zIndex 999, opacity 0, 1334x750 | `IntentionalDifference`: moved under Canvas; visual `Match` | target Scene `:103-143`; authority `C:\total\kg-cocos-client\728_mobile_restore\assets\Scene\Main.fire:169-268` |
| Night child Sprite | original black 40-opacity child and Creator default SpriteFrame UUID | `Match` | target Scene `:117-143` |
| day/night control | `DzpkUiMessageService.applyDayNightAppearance` | `IntentionalDifference` owner | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\DzpkUiMessageService.js:61-66,84-85` |

## 15. Session and reconnect component map

| Component/method | Current responsibility | Status | Evidence |
|---|---|---|---|
| `GameContext` | keeps credentials out of `wGameData`; carries roomID/level/isReconnect | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameContext.js:7-40,42-92` |
| `initializeAuthenticatedSession` | context init from launch or stored session, TRIAL gate, URL cleanup | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:29-95,254-263` |
| `connectAuthenticatedWebSocket` | source WS, HallConnect handshake and source event projection | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:97-147` |
| `scheduleAuthenticatedReconnect` | bounded exponential retry | `IntentionalDifference`; fresh recovery review passed | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:168-188` |
| reconnect location subscriptions | EnterRoom/RoomInfo/Out update room resume state | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:204-237` |
| sessionStorage schema | gameCode+origin+backend+session+room validation | `IntentionalDifference` | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\GameHubAuthenticatedTransport.js:265-323` |
| foreground restoration | resume audio then restore socket | `IntentionalDifference`; fresh recovery review passed | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\Standalone\StandaloneBoot.js:100-110` |
| source reconnect UI chain | Loading/Room see `wGameData.isReconnect` and instantiate original views | compatibility `Match` | Loading `DzpkLoadingScreenController.js:66-72,113-139`; Room `DzpkRoomSelectionController.js:35-57,107-114` |

Session and reconnect code presence is not independent browser/recovery acceptance.

## 16. SourceDefectRepair ledger

| Source defect | Current repair | Status | Evidence |
|---|---|---|---|
| Rule Button carried a targetless ERNN `onClick("bank")` event | invalid reference removed; correct `DropDown.onClickBtn("rule")` retained | `SourceDefectRepair` | authority `C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\prefab\DZPKMain.prefab:20348-20375`; current target around `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:20340-20370` |
| Set Button carried a targetless BJL `onClick("bank")` event | invalid reference removed; correct `DropDown.onClickBtn("set")` retained | `SourceDefectRepair` | authority `C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\prefab\DZPKMain.prefab:20494-20521`; current target around `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\prefab\DZPKMain.prefab:20480-20515` |

No ERNN/BJL controller was added to the active component graph.

## 17. Planned two-to-six-human boundary

The original six seat nodes and viewer-relative mapping remain the only allowed UI:

- `DZPKMain/player/{0..5}`;
- mapping and future limit at
  `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:48-55,175-251`.

The current model explicitly rejects incremental authenticated human seat changes at
`C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original\assets\DZPK\_semantic\DzpkTableStateModel.js:393-405`.

| Future component boundary | Existing component reused | Status |
|---|---|---|
| 2-6 authenticated participant admission | StateModel participants and `player/{0..5}` | `PlannedLaterPhase` |
| viewer-private cards | existing seat poker nodes and source event projection | `PlannedLaterPhase` |
| authoritative action ownership/revision/deadline | semantic controller action turn and timer | `PlannedLaterPhase` |
| multi-viewer reconnect | current session state plus complete viewer-scoped RoomInfo | `PlannedLaterPhase` |
| human/robot participant kind | same seat nodes | `PlannedLaterPhase` |
| multi-winner/side-pot money reconciliation | current pot-layer presentation plus backend ledger facts | `PlannedLaterPhase` |

## 18. Current component-map conclusion

```text
FourSemanticPrefabClassIdsActive: true
FiveSemanticSourceModulesPresent: true
AllCurrentSemanticHandlersMapped: true
OriginalFiveScriptsActive: false
OriginalFiveScriptsPreserved: true
NightOriginalNodePresent: true
BankStandaloneRuntimeApplicable: false
IndependentReviewPending: true
PhaseACompletionClaimed: false
```
