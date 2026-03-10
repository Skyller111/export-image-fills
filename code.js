figma.showUI(__html__, { width: 360, height: 740, title: "Export Image Fills", themeColors: true });

var FRAME_LIKE = { FRAME: true, COMPONENT: true, INSTANCE: true, COMPONENT_SET: true };
var PREVIEW_CONCURRENCY = 8;
var _imageByteCache = {};

function isDescendantOf(node, ancestor) {
  var p = node.parent;
  while (p) {
    if (p.id === ancestor.id) return true;
    p = p.parent;
  }
  return false;
}

function yieldToUI() {
  return new Promise(function(resolve) { setTimeout(resolve, 0); });
}

async function runPooled(tasks, poolSize) {
  if (!tasks.length) return;
  var idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      var i = idx++;
      try { await tasks[i](); } catch (_) {}
    }
  }
  var workers = [];
  var n = Math.min(poolSize, tasks.length);
  for (var w = 0; w < n; w++) workers.push(worker());
  await Promise.all(workers);
}

function extractNodes(nodes, pageName, frameName, seen, entries) {
  for (var i = 0; i < nodes.length; i++) {
    var node  = nodes[i];
    var fills = node.fills;
    if (!fills || typeof fills === "symbol" || !fills.length) continue;
    for (var j = 0; j < fills.length; j++) {
      var fill = fills[j];
      if (!fill || fill.type !== "IMAGE" || !fill.imageHash) continue;
      var hash = fill.imageHash;
      if (!figma.getImageByHash(hash)) continue;
      var key = hash + "|" + pageName + "|" + frameName;
      if (seen[key]) continue;
      seen[key] = true;
      entries.push({
        hash:       hash,
        nodeId:     node.id,
        previewKey: hash,
        nodeName:   node.name,
        width:      typeof node.width  === "number" ? Math.round(node.width)  : 0,
        height:     typeof node.height === "number" ? Math.round(node.height) : 0,
        pageName:   pageName,
        frameName:  frameName,
      });
    }
  }
}

function findImageNodes(node) {
  return typeof node.findAll === "function"
    ? node.findAll(function(n) {
        var f = n.fills;
        if (!f || typeof f === "symbol" || !f.length) return false;
        return f.some(function(p) { return p && p.type === "IMAGE" && p.imageHash; });
      })
    : [];
}

async function doScan(scope) {
  _imageByteCache = {};
  var entries        = [];
  var seen           = {};
  var selFrames      = [];
  var defaultZipName = "";

  if (scope === "selection") {
    var sel = figma.currentPage.selection;
    var allFrames = [];
    for (var i = 0; i < sel.length; i++) {
      if (FRAME_LIKE[sel[i].type]) allFrames.push(sel[i]);
    }
    for (var i = 0; i < allFrames.length; i++) {
      var nested = false;
      for (var j = 0; j < allFrames.length; j++) {
        if (i !== j && isDescendantOf(allFrames[i], allFrames[j])) { nested = true; break; }
      }
      if (!nested) selFrames.push(allFrames[i]);
    }
    if (!selFrames.length) {
      figma.ui.postMessage({ type: "scan-error", code: "no-selection" });
      return;
    }
    var pageName = figma.currentPage.name;
    for (var i = 0; i < selFrames.length; i++) {
      await yieldToUI();
      var fr = selFrames[i];
      extractNodes([fr].concat(findImageNodes(fr)), pageName, fr.name, seen, entries);
      figma.ui.postMessage({ type: "scan-progress", done: i + 1, total: selFrames.length });
    }
    defaultZipName = selFrames.length === 1 ? selFrames[0].name : figma.root.name;

  } else if (scope === "page") {
    var pg       = figma.currentPage;
    var children = pg.children;
    var fnCount  = {};
    for (var i = 0; i < children.length; i++) {
      if (FRAME_LIKE[children[i].type]) {
        var n = children[i].name;
        fnCount[n] = (fnCount[n] || 0) + 1;
      }
    }
    var fnIdx = {};
    for (var i = 0; i < children.length; i++) {
      if (i % 20 === 0) await yieldToUI();
      var child     = children[i];
      var frameName = "";
      if (FRAME_LIKE[child.type]) {
        var base = child.name;
        if (fnCount[base] > 1) {
          fnIdx[base] = (fnIdx[base] || 0) + 1;
          frameName   = base + " (" + fnIdx[base] + ")";
        } else {
          frameName = base;
        }
      }
      extractNodes([child].concat(findImageNodes(child)), pg.name, frameName, seen, entries);
      figma.ui.postMessage({ type: "scan-progress", done: i + 1, total: children.length });
    }
    defaultZipName = pg.name;

  } else {
    var pages = figma.root.children;
    for (var p = 0; p < pages.length; p++) {
      await yieldToUI();
      var pg = pages[p];
      await pg.loadAsync();
      var children = pg.children;
      var fnCount  = {};
      for (var i = 0; i < children.length; i++) {
        if (FRAME_LIKE[children[i].type]) {
          var n = children[i].name;
          fnCount[n] = (fnCount[n] || 0) + 1;
        }
      }
      var fnIdx = {};
      for (var c = 0; c < children.length; c++) {
        var child     = children[c];
        var frameName = "";
        if (FRAME_LIKE[child.type]) {
          var base = child.name;
          if (fnCount[base] > 1) {
            fnIdx[base] = (fnIdx[base] || 0) + 1;
            frameName   = base + " (" + fnIdx[base] + ")";
          } else {
            frameName = base;
          }
        }
        extractNodes([child].concat(findImageNodes(child)), pg.name, frameName, seen, entries);
      }
      figma.ui.postMessage({ type: "scan-progress", done: p + 1, total: pages.length });
    }
    defaultZipName = figma.root.name;
  }

  figma.ui.postMessage({
    type:           "scan-result",
    entries:        entries,
    scope:          scope,
    selFrameCount:  selFrames.length,
    defaultZipName: defaultZipName,
  });

  var previewSeen  = {};
  var previewTasks = [];
  for (var k = 0; k < entries.length; k++) {
    var entry = entries[k];
    if (previewSeen[entry.previewKey]) continue;
    previewSeen[entry.previewKey] = true;
    (function(e) {
      previewTasks.push(function() {
        var img = figma.getImageByHash(e.hash);
        if (!img) return Promise.resolve();
        return img.getBytesAsync().then(function(bytes) {
          _imageByteCache[e.hash] = bytes;
          figma.ui.postMessage({ type: "preview", previewKey: e.previewKey, bytes: bytes });
        }).catch(function() {});
      });
    })(entry);
  }
  await runPooled(previewTasks, PREVIEW_CONCURRENCY);
}

async function doExport(items) {
  var byteCache     = {};
  var uniqueOps     = [];
  var seenKeys      = {};
  var hashItemCount = {};

  for (var i = 0; i < items.length; i++) {
    var eid = "img:" + items[i].hash;
    hashItemCount[eid] = (hashItemCount[eid] || 0) + 1;
    if (!seenKeys[eid]) {
      seenKeys[eid] = true;
      uniqueOps.push({ item: items[i], exportId: eid });
    }
  }

  var done  = 0;
  var total = items.length;

  await Promise.all(uniqueOps.map(function(u) {
    var count   = hashItemCount[u.exportId] || 1;
    var advance = function() {
      done += count;
      figma.ui.postMessage({ type: "progress", done: done, total: total });
    };
    if (_imageByteCache[u.item.hash]) {
      byteCache[u.exportId] = _imageByteCache[u.item.hash];
      advance();
      return Promise.resolve();
    }
    var img = figma.getImageByHash(u.item.hash);
    if (!img) { advance(); return Promise.resolve(); }
    return img.getBytesAsync()
      .then(function(bytes) {
        byteCache[u.exportId] = bytes;
        _imageByteCache[u.item.hash] = bytes;
      })
      .catch(function(err) { console.error("Fetch error:", u.exportId, err); })
      .then(advance);
  }));

  var results = [];
  for (var i = 0; i < items.length; i++) {
    var item  = items[i];
    var bytes = byteCache["img:" + item.hash];
    if (!bytes) continue;
    results.push({
      hash:      item.hash,
      filename:  item.filename,
      pageName:  item.pageName,
      frameName: item.frameName,
      width:     item.width,
      height:    item.height,
      bytes:     bytes,
    });
  }
  figma.ui.postMessage({ type: "export-result", results: results });
}

figma.ui.onmessage = function(msg) {
  if (msg.type === "resize") { figma.ui.resize(360, Math.max(400, Math.min(1200, msg.height))); return; }
  if (msg.type === "scan")   doScan(msg.scope);
  if (msg.type === "export") doExport(msg.items);
  if (msg.type === "close")  figma.closePlugin();
};
