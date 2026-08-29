import { promises as fs } from 'node:fs';
import path from 'node:path';

const UI_2D_LAYER = 1 << 25;
const DEFAULT_LAYER = 1 << 30;
// Creator 3.8.8 official empty-2d Camera mask: DEFAULT + IGNORE_RAYCAST + UI_2D.
const OFFICIAL_2D_CAMERA_VISIBILITY = 1108344832;
const OFFICIAL_2D_CAMERA_PROJECTION = 0;

// These Cocos 3.x components require a UITransform on the same node.
const UI_COMPONENT_TYPES = new Set([
  'cc.Canvas',
  'cc.Widget',
  'cc.Sprite',
  'cc.Label',
  'cc.LabelOutline',
  'cc.LabelShadow',
  'cc.RichText',
  'cc.Mask',
  'cc.Graphics',
  'cc.ParticleSystem2D',
  'cc.TiledMap',
  'cc.TiledTile',
  'cc.TiledLayer',
  'cc.TiledObjectGroup',
  'cc.Layout',
  'cc.Button',
  'cc.ScrollView',
  'cc.Slider',
  'cc.PageView',
  'cc.PageViewIndicator',
  'cc.ProgressBar',
  'cc.Toggle',
  'cc.ToggleContainer',
  'cc.EditBox',
  'cc.VideoPlayer',
  'cc.WebView',
  'sp.Skeleton',
  'dragonBones.ArmatureDisplay',
]);

function readArguments(argv) {
  let projectPath = '';
  let applyChanges = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--project') {
      projectPath = argv[index + 1] ?? '';
      index += 1;
    } else if (argument === '--apply') {
      applyChanges = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!projectPath) {
    throw new Error('Usage: node scripts/normalize-creator38-imported-ui.mjs --project <creator-project> [--apply]');
  }

  return {
    projectPath: path.resolve(projectPath),
    applyChanges,
  };
}

async function collectSerializedAssets(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSerializedAssets(entryPath));
    } else if (entry.isFile() && (entry.name.endsWith('.scene') || entry.name.endsWith('.prefab'))) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

function getComponentTypes(serializedObjects, node) {
  const componentTypes = [];
  for (const componentReference of node._components ?? []) {
    const component = serializedObjects[componentReference?.__id__];
    if (component?.__type__) {
      componentTypes.push(component.__type__);
    }
  }
  return componentTypes;
}

function findCanvasNodeIndexes(serializedObjects) {
  const canvasNodeIndexes = new Set();
  for (let index = 0; index < serializedObjects.length; index += 1) {
    const object = serializedObjects[index];
    if (object?.__type__ !== 'cc.Node') continue;
    if (getComponentTypes(serializedObjects, object).includes('cc.Canvas')) {
      canvasNodeIndexes.add(index);
    }
  }
  return canvasNodeIndexes;
}

function collectNodeSubtree(serializedObjects, rootNodeIndex, result) {
  if (result.has(rootNodeIndex)) return;
  const node = serializedObjects[rootNodeIndex];
  if (node?.__type__ !== 'cc.Node') return;

  result.add(rootNodeIndex);
  for (const childReference of node._children ?? []) {
    collectNodeSubtree(serializedObjects, childReference?.__id__, result);
  }
}

function createUiTransform(nodeIndex) {
  return {
    __type__: 'cc.UITransform',
    _name: '',
    _objFlags: 0,
    node: { __id__: nodeIndex },
    _enabled: true,
    __prefab: null,
    _priority: 0,
    _contentSize: {
      __type__: 'cc.Size',
      width: 100,
      height: 100,
    },
    _anchorPoint: {
      __type__: 'cc.Vec2',
      x: 0.5,
      y: 0.5,
    },
  };
}

function normalizeSerializedAsset(serializedObjects, extension) {
  if (!Array.isArray(serializedObjects)) {
    throw new Error('Expected the serialized root to be an array');
  }

  const nodeIndexes = [];
  for (let index = 0; index < serializedObjects.length; index += 1) {
    if (serializedObjects[index]?.__type__ === 'cc.Node') {
      nodeIndexes.push(index);
    }
  }

  const uiLayerNodeIndexes = new Set();
  if (extension === '.prefab') {
    for (const nodeIndex of nodeIndexes) uiLayerNodeIndexes.add(nodeIndex);
  } else {
    for (const canvasNodeIndex of findCanvasNodeIndexes(serializedObjects)) {
      collectNodeSubtree(serializedObjects, canvasNodeIndex, uiLayerNodeIndexes);
    }
  }

  const layerChanges = [];
  const cameraVisibilityChanges = [];
  const cameraProjectionChanges = [];
  const spinePremultipliedAlphaChanges = [];
  const addedUiTransforms = [];

  for (let index = 0; index < serializedObjects.length; index += 1) {
    const component = serializedObjects[index];
    if (component?.__type__ !== 'sp.Skeleton') continue;
    const hasLegacyPremultipliedAlpha = Object.hasOwn(component, 'premultipliedAlpha');
    if (component._premultipliedAlpha === false && !hasLegacyPremultipliedAlpha) continue;
    spinePremultipliedAlphaChanges.push({ componentIndex: index });
    // KG's source atlases contain straight-alpha textures. Treating them as
    // premultiplied in Creator 3.8 produces opaque white attachment regions.
    component._premultipliedAlpha = false;
    delete component.premultipliedAlpha;
  }

  for (const nodeIndex of nodeIndexes) {
    const node = serializedObjects[nodeIndex];
    const componentTypes = getComponentTypes(serializedObjects, node);
    const desiredLayer = componentTypes.includes('cc.Camera')
      ? DEFAULT_LAYER
      : (uiLayerNodeIndexes.has(nodeIndex) ? UI_2D_LAYER : node._layer);
    if (node._layer !== desiredLayer) {
      layerChanges.push({ nodeIndex, nodeName: node._name, previousLayer: node._layer });
      node._layer = desiredLayer;
    }

    if (componentTypes.includes('cc.Camera') && uiLayerNodeIndexes.has(nodeIndex)) {
      for (const componentReference of node._components ?? []) {
        const camera = serializedObjects[componentReference?.__id__];
        if (camera?.__type__ !== 'cc.Camera') continue;
        if (camera._visibility !== OFFICIAL_2D_CAMERA_VISIBILITY) {
          cameraVisibilityChanges.push({
            nodeIndex,
            nodeName: node._name,
            previousVisibility: camera._visibility,
          });
          camera._visibility = OFFICIAL_2D_CAMERA_VISIBILITY;
        }
        if (camera._projection !== OFFICIAL_2D_CAMERA_PROJECTION) {
          cameraProjectionChanges.push({
            nodeIndex,
            nodeName: node._name,
            previousProjection: camera._projection,
          });
          camera._projection = OFFICIAL_2D_CAMERA_PROJECTION;
        }
      }
    }

    const requiresUiTransform = componentTypes.some((componentType) => UI_COMPONENT_TYPES.has(componentType));
    const hasUiTransform = componentTypes.includes('cc.UITransform');
    if (!requiresUiTransform || hasUiTransform) continue;

    const uiTransformIndex = serializedObjects.length;
    serializedObjects.push(createUiTransform(nodeIndex));
    node._components ??= [];
    node._components.push({ __id__: uiTransformIndex });
    addedUiTransforms.push({
      nodeIndex,
      nodeName: node._name,
      componentTypes,
      uiTransformIndex,
    });
  }

  return {
    layerChanges,
    cameraVisibilityChanges,
    cameraProjectionChanges,
    spinePremultipliedAlphaChanges,
    addedUiTransforms,
  };
}

async function main() {
  const { projectPath, applyChanges } = readArguments(process.argv.slice(2));
  const assetsPath = path.join(projectPath, 'assets');
  const serializedAssets = await collectSerializedAssets(assetsPath);
  const plannedWrites = [];

  for (const assetPath of serializedAssets) {
    const originalText = await fs.readFile(assetPath, 'utf8');
    const serializedObjects = JSON.parse(originalText);
    const changes = normalizeSerializedAsset(serializedObjects, path.extname(assetPath));
    const relativePath = path.relative(projectPath, assetPath).replaceAll('\\', '/');

    if (
      changes.layerChanges.length
      || changes.cameraVisibilityChanges.length
      || changes.cameraProjectionChanges.length
      || changes.spinePremultipliedAlphaChanges.length
      || changes.addedUiTransforms.length
    ) {
      plannedWrites.push({
        assetPath,
        relativePath,
        serializedText: `${JSON.stringify(serializedObjects, null, 2)}\n`,
        ...changes,
      });
    }
  }

  for (const plan of plannedWrites) {
    process.stdout.write(
      `${plan.relativePath}: layerChanges=${plan.layerChanges.length}, cameraVisibilityChanges=${plan.cameraVisibilityChanges.length}, cameraProjectionChanges=${plan.cameraProjectionChanges.length}, spinePremultipliedAlphaChanges=${plan.spinePremultipliedAlphaChanges.length}, addedUiTransforms=${plan.addedUiTransforms.length}\n`,
    );
    for (const addition of plan.addedUiTransforms) {
      process.stdout.write(
        `  + UITransform node=${addition.nodeName} components=${addition.componentTypes.join(',')}\n`,
      );
    }
  }

  const totalLayerChanges = plannedWrites.reduce((sum, plan) => sum + plan.layerChanges.length, 0);
  const totalCameraVisibilityChanges = plannedWrites.reduce(
    (sum, plan) => sum + plan.cameraVisibilityChanges.length,
    0,
  );
  const totalCameraProjectionChanges = plannedWrites.reduce(
    (sum, plan) => sum + plan.cameraProjectionChanges.length,
    0,
  );
  const totalSpinePremultipliedAlphaChanges = plannedWrites.reduce(
    (sum, plan) => sum + plan.spinePremultipliedAlphaChanges.length,
    0,
  );
  const totalUiTransforms = plannedWrites.reduce((sum, plan) => sum + plan.addedUiTransforms.length, 0);
  process.stdout.write(
    `summary: assets=${serializedAssets.length}, filesChanged=${plannedWrites.length}, layerChanges=${totalLayerChanges}, cameraVisibilityChanges=${totalCameraVisibilityChanges}, cameraProjectionChanges=${totalCameraProjectionChanges}, spinePremultipliedAlphaChanges=${totalSpinePremultipliedAlphaChanges}, addedUiTransforms=${totalUiTransforms}, mode=${applyChanges ? 'apply' : 'plan'}\n`,
  );

  if (applyChanges) {
    for (const plan of plannedWrites) {
      await fs.writeFile(plan.assetPath, plan.serializedText, 'utf8');
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
