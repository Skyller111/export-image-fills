const UI_WIDTH = 360;
const UI_HEIGHT = 740;
const UI_MIN_HEIGHT = 400;
const UI_MAX_HEIGHT = 1200;

const PREVIEW_CONCURRENCY = 8;
const EXPORT_CONCURRENCY = 4;
const YIELD_EVERY = 20;

const FRAME_TYPES = {
  FRAME: true,
  COMPONENT: true,
  INSTANCE: true,
  COMPONENT_SET: true,
};

const IMAGE_FILL_TYPES = {
  RECTANGLE: true,
  ELLIPSE: true,
  POLYGON: true,
  STAR: true,
  VECTOR: true,
  LINE: true,
  BOOLEAN_OPERATION: true,
  FRAME: true,
  COMPONENT: true,
  INSTANCE: true,
  COMPONENT_SET: true,
};

let imageByteCache = Object.create(null);
const inFlightBytes = Object.create(null);

figma.showUI(__html__, {
  width: UI_WIDTH,
  height: UI_HEIGHT,
  title: "Export Image Fills",
  themeColors: true,
});

function isDescendantOf(node, ancestor) {
  let parent = node.parent;
  while (parent) {
    if (parent.id === ancestor.id) return true;
    parent = parent.parent;
  }
  return false;
}

function yieldToUI() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function runPooled(tasks, poolSize) {
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const task = tasks[index++];
      try {
        await task();
      } catch (err) {
        console.warn("Pooled task failed:", err);
      }
    }
  }

  const workers = [];
  const count = Math.min(poolSize, tasks.length);
  for (let i = 0; i < count; i++) workers.push(worker());
  await Promise.all(workers);
}

function errorMessage(err) {
  if (!err) return "";
  return String(err.message || err);
}

function releaseImageCache() {
  imageByteCache = Object.create(null);
}

function fetchSourceBytes(hash) {
  const cached = imageByteCache[hash];
  if (cached) return Promise.resolve(cached);
  if (inFlightBytes[hash]) return inFlightBytes[hash];

  const image = figma.getImageByHash(hash);
  if (!image) return Promise.resolve(null);

  const pending = image.getBytesAsync()
    .then((bytes) => {
      delete inFlightBytes[hash];
      imageByteCache[hash] = bytes;
      return bytes;
    })
    .catch((err) => {
      delete inFlightBytes[hash];
      throw err;
    });

  inFlightBytes[hash] = pending;
  return pending;
}

function fetchExportBytes(item, containerSize, scale) {
  if (!containerSize) return fetchSourceBytes(item.hash);

  return figma.getNodeByIdAsync(item.nodeId).then((node) => {
    if (!node || typeof node.exportAsync !== "function") {
      return fetchSourceBytes(item.hash);
    }

    return node
      .exportAsync({ format: "PNG", constraint: { type: "SCALE", value: scale } })
      .catch((err) => {
        console.warn("exportAsync failed, using source bytes:", item.nodeId, err);
        return fetchSourceBytes(item.hash);
      });
  });
}

function normalizeScale(value) {
  const scale = Math.round(Number(value));
  if (!isFinite(scale) || scale <= 1) return 1;
  return Math.min(scale, 4);
}

function collectImageFills(node, pageName, frameName, seen, entries) {
  const fills = node.fills;
  if (!fills || typeof fills === "symbol" || !fills.length) return;

  for (let i = 0; i < fills.length; i++) {
    const paint = fills[i];
    if (!paint || paint.type !== "IMAGE" || !paint.imageHash) continue;

    const hash = paint.imageHash;
    const key = hash + "|" + pageName + "|" + frameName;
    if (seen[key]) continue;
    if (!figma.getImageByHash(hash)) continue;

    seen[key] = true;
    entries.push({
      hash,
      nodeId: node.id,
      previewKey: hash,
      nodeName: node.name,
      width: typeof node.width === "number" ? Math.round(node.width) : 0,
      height: typeof node.height === "number" ? Math.round(node.height) : 0,
      pageName,
      frameName,
    });
  }
}

function findImageNodes(node) {
  if (typeof node.findAll !== "function") return [];

  return node.findAll((n) => {
    if (!IMAGE_FILL_TYPES[n.type]) return false;
    const fills = n.fills;
    if (!fills || typeof fills === "symbol" || !fills.length) return false;
    for (let i = 0; i < fills.length; i++) {
      const paint = fills[i];
      if (paint && paint.type === "IMAGE" && paint.imageHash) return true;
    }
    return false;
  });
}

function collectFromFrame(frame, pageName, frameName, seen, entries) {
  collectImageFills(frame, pageName, frameName, seen, entries);

  const found = findImageNodes(frame);
  for (let i = 0; i < found.length; i++) {
    collectImageFills(found[i], pageName, frameName, seen, entries);
  }
}

function createFrameLabeler(children) {
  const totals = Object.create(null);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (FRAME_TYPES[child.type]) {
      totals[child.name] = (totals[child.name] || 0) + 1;
    }
  }

  const used = Object.create(null);
  return (name) => {
    if (!(totals[name] > 1)) return name;
    used[name] = (used[name] || 0) + 1;
    return name + " (" + used[name] + ")";
  };
}

async function scanPage(page, seen, entries, onProgress) {
  const children = page.children;
  const labelFor = createFrameLabeler(children);

  for (let i = 0; i < children.length; i++) {
    if (i % YIELD_EVERY === 0) await yieldToUI();

    const child = children[i];
    const frameName = FRAME_TYPES[child.type] ? labelFor(child.name) : "";
    collectFromFrame(child, page.name, frameName, seen, entries);

    if (onProgress) onProgress(i + 1, children.length);
  }
}

function topLevelSelection() {
  const selection = figma.currentPage.selection;
  const frames = [];

  for (let i = 0; i < selection.length; i++) {
    if (FRAME_TYPES[selection[i].type]) frames.push(selection[i]);
  }

  return frames.filter(
    (candidate, index) =>
      !frames.some(
        (other, otherIndex) => otherIndex !== index && isDescendantOf(candidate, other)
      )
  );
}

async function doScan(scope) {
  releaseImageCache();

  const entries = [];
  const seen = Object.create(null);
  let selFrameCount = 0;
  let defaultZipName = "";

  if (scope === "selection") {
    const frames = topLevelSelection();
    if (!frames.length) {
      figma.ui.postMessage({ type: "scan-error", code: "no-selection" });
      return;
    }

    selFrameCount = frames.length;
    const pageName = figma.currentPage.name;

    for (let i = 0; i < frames.length; i++) {
      await yieldToUI();
      collectFromFrame(frames[i], pageName, frames[i].name, seen, entries);
      figma.ui.postMessage({ type: "scan-progress", done: i + 1, total: frames.length });
    }

    defaultZipName = frames.length === 1 ? frames[0].name : figma.root.name;
  } else if (scope === "page") {
    const page = figma.currentPage;
    await scanPage(page, seen, entries, (done, total) => {
      figma.ui.postMessage({ type: "scan-progress", done, total });
    });
    defaultZipName = page.name;
  } else {
    const pages = figma.root.children;
    for (let p = 0; p < pages.length; p++) {
      await yieldToUI();
      const page = pages[p];
      await page.loadAsync();
      await scanPage(page, seen, entries, null);
      figma.ui.postMessage({ type: "scan-progress", done: p + 1, total: pages.length });
    }
    defaultZipName = figma.root.name;
  }

  figma.ui.postMessage({
    type: "scan-result",
    entries,
    scope,
    selFrameCount,
    defaultZipName,
  });

  await sendPreviews(entries);
}

async function sendPreviews(entries) {
  const queued = Object.create(null);
  const tasks = [];

  for (let i = 0; i < entries.length; i++) {
    const hash = entries[i].hash;
    if (queued[hash]) continue;
    queued[hash] = true;
    tasks.push(() => sendPreview(hash));
  }

  await runPooled(tasks, PREVIEW_CONCURRENCY);
}

async function sendPreview(hash) {
  let bytes;
  try {
    bytes = await fetchSourceBytes(hash);
  } catch (err) {
    return;
  }
  if (!bytes) return;

  figma.ui.postMessage({ type: "preview", previewKey: hash, bytes });
}

function exportKey(item, containerSize) {
  return containerSize ? "node:" + item.nodeId : "img:" + item.hash;
}

function groupExportOps(items, containerSize) {
  const ops = [];
  const byKey = Object.create(null);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = exportKey(item, containerSize);
    const existing = byKey[key];
    if (existing) {
      existing.count++;
      continue;
    }
    const op = { key, item, count: 1 };
    byKey[key] = op;
    ops.push(op);
  }

  return ops;
}

async function doExport(items, containerSize, scale) {
  const ops = groupExportOps(items, containerSize);
  const bytesByOp = Object.create(null);
  const total = items.length;
  const renderScale = containerSize ? normalizeScale(scale) : 1;
  let done = 0;

  await runPooled(
    ops.map((op) => async () => {
      try {
        const bytes = await fetchExportBytes(op.item, containerSize, renderScale);
        if (bytes) bytesByOp[op.key] = bytes;
      } catch (err) {
        console.error("Export fetch failed:", op.key, err);
      }
      done += op.count;
      figma.ui.postMessage({ type: "progress", done, total });
    }),
    EXPORT_CONCURRENCY
  );

  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const bytes = bytesByOp[exportKey(item, containerSize)];
    if (!bytes) continue;

    results.push({
      hash: item.hash,
      filename: item.filename,
      pageName: item.pageName,
      frameName: item.frameName,
      width: item.width,
      height: item.height,
      bytes,
    });
  }

  figma.ui.postMessage({ type: "export-result", results });
}

async function runScan(scope) {
  try {
    await doScan(scope);
  } catch (err) {
    console.error("Scan failed:", err);
    figma.ui.postMessage({
      type: "scan-error",
      code: "scan-failed",
      message: errorMessage(err),
    });
  }
}

async function runExport(items, containerSize, scale) {
  try {
    await doExport(items, containerSize, scale);
  } catch (err) {
    console.error("Export failed:", err);
    figma.ui.postMessage({ type: "export-error", message: errorMessage(err) });
  }
}

function handleResize(height) {
  const next = Math.round(Number(height));
  if (!isFinite(next)) return;
  figma.ui.resize(UI_WIDTH, Math.max(UI_MIN_HEIGHT, Math.min(UI_MAX_HEIGHT, next)));
}

figma.ui.onmessage = (msg) => {
  if (!msg || typeof msg.type !== "string") return;

  switch (msg.type) {
    case "resize":
      handleResize(msg.height);
      return;
    case "scan":
      runScan(msg.scope);
      return;
    case "export":
      if (!Array.isArray(msg.items) || !msg.items.length) return;
      runExport(msg.items, !!msg.containerSize, msg.scale);
      return;
    case "close":
      figma.closePlugin();
      return;
  }
};
