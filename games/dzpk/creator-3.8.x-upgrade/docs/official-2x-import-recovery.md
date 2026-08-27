# Creator 2.4.x serialization recovery

Status: `PostImportUiNormalizationHumanVerified`

## Failure

The first 3.8 checkpoint copied the 2.4 `.fire` and `.prefab` files directly
into a 3.8 project. Creator rewrote asset metadata, but the seven serialized
assets failed to open with null `anchorPoint` / `contentSize` access.

## Root cause

Creator 2.x stores UI size and anchor data on `cc.Node`. Creator 3.x stores
them on a `UITransform` component. Directly placing the old JSON in a 3.8
project bypasses Cocos' dedicated 2.x resource importer and leaves an invalid
mixed serialization state.

## Recovery decision

1. Keep the frozen 2.4.7 standalone project as the source authority.
2. Create a clean temporary project from Creator 3.8.8 `empty-2d`.
3. In that project, run **File -> Import Cocos Creator 2.x Project** against:
   `C:\works\cocos-huanyuan\games\dzpk\creator-2.4.x-standalone`.
4. Import the complete dependency set and at least one scene.
5. Audit the imported Scene and all six Prefabs before integrating anything
   into the canonical 3.8 project.
6. Preserve original resource/component UUID mappings wherever the official
   importer preserves them. Any remap must be recorded explicitly.
7. Re-apply the readable TypeScript controllers only after the official
   serialization output is stable.

Temporary workbench:
`C:\works\dzpk-creator38-official-import-workbench`

This workbench is not a runtime wrapper and will not be shipped. It exists only
to obtain authoritative Creator-generated 3.x serialization output.

## 2026-08-26 human import result

- Creator displayed `导入完毕` and generated `DzpkStandaloneBoot.scene` plus converted resources in
  `C:\works\dzpk-creator38-official-import-workbench`.
- The previous common `anchorPoint/contentSize` open failure is no longer the first blocker.
- The supplied full Console log contains 64 timestamped warning/error entries, grouped as:
  - 22 `__extends is not defined`;
  - 12 `exports is not defined`;
  - 6 `__awaiter is not defined`;
  - 4 `__spreadArrays is not defined`;
  - 8 missing legacy module resolutions (`AudioManager`, `GameContext`, `ResLoader`, `Utils`);
  - 8 syntax errors across four imported `_semantic` scripts;
  - 3 `RoomChoose` Prefab component warnings;
  - 1 design-resolution mismatch warning.
- Decision: official importer output is authoritative for Scene/Prefab/resource serialization only.
  Importer-generated `.ts` that still contains transpiled ES5/CommonJS is not repaired with global
  helpers. It will be replaced by the maintained 3.8 TypeScript modules while preserving component UUID,
  serialized property and click-handler identity.
- The original `1334 x 750` Canvas resolution will be reconciled with 3.8 project settings instead of
  modifying the imported layout node-by-node.

## Canonical integration

- Integrated the official `DzpkStandaloneBoot.scene`, six Prefabs, converted animations/plists,
  resources, audio and their 3.x metadata into the canonical project.
- Excluded workbench `_script`, `_semantic` and `Standalone` generated code.
- Kept maintained TypeScript with the same 11 serialized component UUIDs.
- Static source/importer node counts match for every Prefab: Bank 39, DZPKMain 321, Load 4,
  Room 58, Rule 11 and Set 58; the imported Boot Scene has 8 nodes.
- The official Room Prefab still contains three serialized `RoomChoose` components and their `img1`
  arrays. The previous warning must be rechecked only after maintained TypeScript registration.
- Added the original `1334 x 750`, fit-width and fit-height values to 3.8 project settings.
- Current boundary: no compilation or runtime claim; the canonical project now awaits human Creator
  Scene/Prefab opening and Inspector review.

## Manual Checkpoint 02 findings and normalization

- Human screenshots proved Bank, DZPKMain, Load, Rule and Set could enter Prefab edit mode, but their
  scene view was black while their hierarchy and serialized Sprite resources remained present.
- All 499 serialized nodes were on `DEFAULT`. Normalization now assigns 491 Prefab nodes and seven
  Canvas-subtree Scene nodes to `UI_2D`; the Main Camera remains `DEFAULT`, matching Creator's 2D
  default scene contract.
- Room failed because `info` had `cc.Widget` without `cc.UITransform`, and `jxlw_quickstart` had
  `sp.Skeleton` without `cc.UITransform`.
- The same importer omission existed on six table `cc.ParticleSystem2D` nodes, one table Spine node and
  one Sprite/Button node. Ten importer-shaped default UITransforms were added in total without changing
  node position, source resource, explicit imported size or custom component data.
- The repeatable postprocessor is `scripts/normalize-creator38-imported-ui.mjs`.
- Spine JSON `3.6.37` versus runtime `3.8.99` remains a warning-only pending visual item. The source JSON
  version string is not rewritten because that would not perform a real Spine data conversion.

## Manual Checkpoint 03 result

- On 2026-08-27 the user confirmed Room and all other Prefabs displayed normally in the editor.
- No red Console error remained after the layer/UITransform normalization.
- This closes the official serialization import/open/display gate only. Table Controller/Presentation behavior,
  runtime play and original-client parity remain pending.
