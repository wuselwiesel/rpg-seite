/* Bedienung: Reiter, Fotos, Stile, Aufkleber, Speichern */
(function (VB) {
  "use strict";
  var s = VB.s, R = VB.render, W = VB.W;
  var cv = document.getElementById("cv"), g = cv.getContext("2d");
  var KEY = "verkaufsbilder-v2", toastT, sid = 0;

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toast(t) {
    var el = $("toast"); el.textContent = t; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 2800);
  }
  function mkBtn(parent, label, pressed, onclick, cls) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = label;
    if (cls) b.className = cls;
    if (pressed != null) b.setAttribute("aria-pressed", String(pressed));
    b.onclick = onclick; parent.appendChild(b); return b;
  }

  /* Zeichnen */
  var pending = false;
  function render() {
    if (pending) return; pending = true;
    requestAnimationFrame(function () { pending = false; R.draw(g); });
  }
  function setSize() {
    var H = VB.H(); cv.width = W; cv.height = H;
    cv.style.width = "min(100%, " + (74 * W / H).toFixed(2) + "vh)"; cv.style.aspectRatio = W + " / " + H;
  }

  /* Merken */
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        format: s.format, style: s.style, collage: s.collage, font: s.font, col: s.col, t: s.t, g: s.g, radius: s.radius,
        texts: s.texts, article: s.article, byType: s.byType,
        stickers: s.stickers.map(function (k) { return { kind: k.kind, text: k.text, auto: k.auto, color: k.color, x: k.x, y: k.y, size: k.size, rot: k.rot }; })
      }));
    } catch (e) {}
  }
  function restore() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (!o) return;
      var has = function (list, v) { return list.some(function (x) { return x[0] === v; }); };
      if (has(VB.FORMATS, o.format)) s.format = o.format;
      if (has(VB.STYLES, o.style)) s.style = o.style;
      if (VB.COLL_N[o.collage]) s.collage = o.collage;
      if (typeof o.font === "number" && VB.FONTS[o.font]) s.font = o.font;
      if (typeof o.col === "number" && o.col >= -1 && o.col < VB.COLS.length) s.col = o.col;
      if (/^#[0-9a-f]{6}$/i.test(o.t)) s.t = o.t;
      if (/^#[0-9a-f]{6}$/i.test(o.g)) s.g = o.g;
      if (typeof o.radius === "number") s.radius = clamp(o.radius, 0, 90);
      if (VB.ARTICLES.some(function (a) { return a.id === o.article; })) s.article = o.article;
      if (o.byType && typeof o.byType === "object") Object.keys(o.byType).forEach(function (k) { var v = o.byType[k]; if (v && typeof v.size === "string" && typeof v.extra === "string") s.byType[k] = { size: v.size, extra: v.extra }; });
      if (o.texts) Object.keys(s.texts).forEach(function (k) { if (typeof o.texts[k] === "string") s.texts[k] = o.texts[k]; });
      if (Array.isArray(o.stickers)) {
        s.stickers = o.stickers.slice(0, 20).filter(function (k) { return k && typeof k.kind === "string"; }).map(function (k) {
          return { id: ++sid, kind: k.kind, text: String(k.text || ""), auto: k.auto === "price" ? "price" : undefined, color: /^#[0-9a-f]{6}$/i.test(k.color) ? k.color : "#ffffff",
            x: clamp(+k.x || 0.5, 0, 1), y: clamp(+k.y || 0.2, 0, 1), size: clamp(+k.size || 1, 0.4, 2.2), rot: clamp(+k.rot || 0, -45, 45) };
        });
      }
    } catch (e) {}
  }

  /* Reiter */
  var tabs = document.querySelectorAll("#tabs button");
  tabs.forEach(function (b) {
    b.onclick = function () {
      tabs.forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      document.querySelectorAll(".tabpane").forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== b.getAttribute("data-tab"); });
    };
  });
  function openTab(name) { document.querySelector('#tabs [data-tab="' + name + '"]').click(); }

  /* Format, Stil, Schrift, Farben */
  function buildFormats() {
    var box = $("formats"); box.textContent = "";
    VB.FORMATS.forEach(function (f) { mkBtn(box, f[1], s.format === f[0], function () { s.format = f[0]; setSize(); buildFormats(); render(); persist(); }); });
  }
  function buildStyles() {
    var box = $("styles"); box.textContent = "";
    VB.STYLES.forEach(function (f) { mkBtn(box, f[1], s.style === f[0], function () { s.style = f[0]; buildStyles(); render(); persist(); }); });
  }
  function buildFonts() {
    var box = $("fonts"); box.textContent = "";
    VB.FONTS.forEach(function (f, i) {
      var b = mkBtn(box, f.n, s.font === i, function () {
        s.font = i; buildFonts();
        if (document.fonts && document.fonts.load) document.fonts.load(VB.fontStr(60)).then(render).catch(render);
        render(); persist();
      });
      b.style.cssText = f.st;
    });
  }
  function buildCols() {
    var box = $("cols"); box.textContent = "";
    VB.COLS.forEach(function (c, i) {
      var el = document.createElement("button"); el.type = "button"; el.className = "sw" + (c.none ? " none" : ""); el.title = c.n;
      el.setAttribute("aria-label", c.n); el.setAttribute("aria-pressed", String(s.col === i));
      if (c.none) el.textContent = "⊘";
      else { el.style.background = c.g; var d = document.createElement("i"); d.style.background = c.t; el.appendChild(d); }
      el.onclick = function () {
        s.col = i;
        if (!c.none) { s.t = c.t; s.g = c.g; $("ct").value = c.t; $("cg").value = c.g; }
        buildCols(); render(); persist();
      };
      box.appendChild(el);
    });
  }
  $("ct").addEventListener("input", function () { s.t = this.value; s.col = -1; buildCols(); render(); persist(); });
  $("cg").addEventListener("input", function () { s.g = this.value; s.col = -1; buildCols(); render(); persist(); });
  $("radius").addEventListener("input", function () { s.radius = +this.value; render(); persist(); });

  $("fromPhoto").onclick = function () {
    var p = R.photoFor(s.sel) || R.photoFor(0); if (!p) return;
    var w = p.work, c = document.createElement("canvas"); c.width = c.height = 16;
    var x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(w, 0, w.height * 0.66, w.width, w.height * 0.34, 0, 0, 16, 16);
    var d = x.getImageData(0, 0, 16, 16).data, r = 0, gg = 0, b = 0, n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    var avg = VB.rgbHex([r / n, gg / n, b / n]);
    if (s.style === "tise") {
      if (VB.lum(avg) > 0.62) { s.g = VB.mix(avg, "#ffffff", 0.8); s.t = VB.mix(avg, "#000000", 0.7); }
      else { s.g = VB.mix(avg, "#000000", 0.6); s.t = "#f6efe4"; }
    } else { s.g = VB.mix(avg, "#ffffff", 0.78); s.t = VB.mix(avg, "#000000", 0.72); }
    s.col = -1; $("ct").value = s.t; $("cg").value = s.g; buildCols(); render(); persist();
  };

  /* Collage und Fotos */
  function svgIcon(coll) {
    var rs = R.cellRects(coll, { x: 2, y: 2, w: 20, h: 26 }, 2);
    return '<svg viewBox="0 0 24 30" aria-hidden="true">' + rs.map(function (r) {
      return '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="2" fill="currentColor"/>';
    }).join("") + "</svg>";
  }
  function buildCollage() {
    var box = $("collage"); box.textContent = "";
    VB.COLLAGES.forEach(function (c) {
      var b = mkBtn(box, "", s.collage === c[0], function () {
        s.collage = c[0]; s.sel = Math.min(s.sel, VB.nCells() - 1); s.selSticker = null;
        buildCollage(); buildCells(); syncPhoto(); updateStatus(); render(); persist();
      });
      b.innerHTML = svgIcon(c[0]); b.title = c[1]; b.setAttribute("aria-label", c[1]);
    });
  }
  function buildCells() {
    var box = $("cells"); box.textContent = "";
    for (var i = 0; i < VB.nCells(); i++) (function (i) {
      var b = mkBtn(box, "Foto " + (i + 1), s.sel === i && s.selSticker == null, function () {
        s.sel = i; s.selSticker = null; buildCells(); syncPhoto(); syncSticker(); render();
      });
      if (s.photos[i]) b.className = "filled";
    })(i);
  }
  function syncPhoto() {
    var p = R.photoFor(s.sel), off = !p;
    $("zoom").value = p ? p.zoom : 1;
    $("adjB").value = p ? p.adj.b : 0; $("adjC").value = p ? p.adj.c : 0; $("adjS").value = p ? p.adj.s : 0;
    ["zoom", "adjB", "adjC", "adjS", "auto", "adjReset", "resetPos"].forEach(function (id) { $(id).disabled = off; });
    $("rmPhoto").disabled = !s.photos[s.sel];
  }
  function updateStatus() {
    var ok = VB.ready(), m = VB.missing(), h = $("hint");
    $("save").disabled = !ok; $("share").disabled = !ok;
    h.textContent = !VB.anyPhoto() ? "Das ist ein Beispielfoto. Lade dein eigenes Foto hoch, dann kannst du speichern."
      : m > 0 ? "Noch " + m + (m === 1 ? " Foto fehlt." : " Fotos fehlen.") : "Fertig? Dann speichern.";
  }
  function loadImg(file) {
    return new Promise(function (res) {
      var im = new Image(); im.onload = function () { res(im); };
      im.onerror = function () { toast("„" + file.name + "“ lässt sich nicht öffnen. Versuche JPG oder PNG."); res(null); };
      im.src = URL.createObjectURL(file);
    });
  }
  function loadFiles(list) {
    var files = [].filter.call(list || [], function (f) { return f.type.indexOf("image/") === 0; });
    if (!files.length) { toast("Das ist keine Bilddatei."); return; }
    if (files.length > 1 && s.collage === "1") s.collage = files.length === 2 ? "2h" : files.length === 3 ? "3" : "4";
    files = files.slice(0, VB.nCells());
    Promise.all(files.map(loadImg)).then(function (imgs) {
      var n = VB.nCells(), pos = s.sel, first = -1;
      imgs.forEach(function (im) {
        if (!im) return;
        var t = -1;
        for (var k = 0; k < n; k++) { var idx = (pos + k) % n; if (!s.photos[idx]) { t = idx; break; } }
        if (t < 0) t = pos;
        s.photos[t] = R.newPhoto(im); if (first < 0) first = t; pos = (t + 1) % n;
      });
      if (first >= 0) s.sel = first;
      $("fname").textContent = files.length + (files.length === 1 ? " Foto geladen" : " Fotos geladen");
      buildCollage(); buildCells(); syncPhoto(); updateStatus(); render(); persist();
    });
  }
  $("file").addEventListener("change", function () { loadFiles(this.files); this.value = ""; });
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { loadFiles(ev.dataTransfer.files); });

  $("zoom").addEventListener("input", function () { var p = R.photoFor(s.sel); if (p) { p.zoom = +this.value; render(); } });
  $("rmPhoto").onclick = function () { s.photos[s.sel] = null; buildCells(); syncPhoto(); updateStatus(); render(); };
  $("resetPos").onclick = function () { var p = R.photoFor(s.sel); if (p) { p.zoom = 1; p.px = p.py = 0; syncPhoto(); render(); } };

  function rebuild(p) {
    if (p._pend) return; p._pend = true;
    requestAnimationFrame(function () { p._pend = false; R.buildWork(p); render(); });
  }
  [["adjB", "b"], ["adjC", "c"], ["adjS", "s"]].forEach(function (a) {
    $(a[0]).addEventListener("input", function () { var p = R.photoFor(s.sel); if (p) { p.adj[a[1]] = +this.value; rebuild(p); } });
  });
  $("adjReset").onclick = function () { var p = R.photoFor(s.sel); if (p) { p.adj = { b: 0, c: 0, s: 0 }; R.buildWork(p); syncPhoto(); render(); } };
  $("auto").onclick = function () {
    var p = R.photoFor(s.sel); if (!p) return;
    var c = document.createElement("canvas"); c.width = c.height = 48;
    var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(p.work, 0, 0, 48, 48);
    var d = x.getImageData(0, 0, 48, 48).data, sum = 0;
    for (var i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    var m = sum / (d.length / 4) / 255;
    p.adj = { b: Math.round(clamp((0.5 - m) * 80, -10, 30)), c: 10, s: 8 };
    R.buildWork(p); syncPhoto(); render();
  };

  /* Text */
  Object.keys(s.texts).forEach(function (k) {
    $(k).addEventListener("input", function () { s.texts[k] = this.value; render(); persist(); });
  });
  function buildChips() {
    var a = VB.article(), box = $("sizeChips"); box.textContent = "";
    $("sizeLabel").textContent = a.sizeLabel; $("size").placeholder = a.ph; $("title").placeholder = a.titlePh;
    $("extraLabel").textContent = a.extraLabel;
    box.hidden = a.sizes.length === 0;
    a.sizes.forEach(function (v) {
      mkBtn(box, v, null, function () { s.texts.size = v; $("size").value = v; render(); persist(); });
    });
    box = $("condChips"); box.textContent = "";
    a.conds.forEach(function (v) {
      mkBtn(box, v, null, function () { s.texts.extra = v; $("extra").value = v; render(); persist(); });
    });
  }
  function buildArticles() {
    var sel = $("article"); sel.textContent = "";
    VB.ARTICLES.forEach(function (a) {
      var o = document.createElement("option"); o.value = a.id; o.textContent = a.n; o.selected = a.id === s.article; sel.appendChild(o);
    });
  }
  $("article").addEventListener("change", function () {
    s.byType[s.article] = { size: s.texts.size, extra: s.texts.extra };
    s.article = this.value;
    var m = s.byType[s.article] || { size: "", extra: "" };
    s.texts.size = m.size; s.texts.extra = m.extra; $("size").value = m.size; $("extra").value = m.extra;
    buildChips(); buildLib(); render(); persist();
  });

  /* Aufkleber */
  function selected() { for (var i = 0; i < s.stickers.length; i++) if (s.stickers[i].id === s.selSticker) return s.stickers[i]; return null; }
  function addSticker(def) {
    var n = s.stickers.length;
    if (n >= 20) { toast("Mehr als 20 Aufkleber gehen nicht."); return; }
    var slots = [[0.78, 0.13], [0.22, 0.13], [0.78, 0.3], [0.22, 0.3], [0.5, 0.2], [0.78, 0.47], [0.22, 0.47]];
    var sl = slots[n % slots.length], off = Math.floor(n / slots.length) * 0.04;
    s.stickers.push({
      id: ++sid, kind: def.kind, text: def.text || "", auto: def.auto, color: def.color || "#ffffff",
      x: clamp(sl[0] + off, 0.1, 0.9), y: clamp(sl[1] + off, 0.08, 0.9), size: 1, rot: def.kind === "emoji" ? 0 : (n % 2 ? 8 : -8)
    });
    s.selSticker = sid; buildCells(); syncSticker(); render(); persist();
  }
  function buildLib() {
    var box = $("stlib"), sug = VB.article().stk; box.textContent = "";
    var first = sug.map(function (l) { return VB.STICKERS.filter(function (d) { return d.label === l; })[0]; }).filter(Boolean);
    var rest = VB.STICKERS.filter(function (d) { return first.indexOf(d) < 0; });
    first.forEach(function (d) { mkBtn(box, d.label, null, function () { addSticker(d); }, "sug"); });
    rest.forEach(function (d) { mkBtn(box, d.label, null, function () { addSticker(d); }); });
    box = $("stemoji"); box.textContent = "";
    VB.EMOJIS.forEach(function (e) { mkBtn(box, e, null, function () { addSticker({ kind: "emoji", text: e }); }); });
  }
  function syncSticker() {
    var k = selected(), list = $("stlist"); list.textContent = "";
    s.stickers.forEach(function (x, i) {
      var label = x.kind === "emoji" ? x.text : (R.stickerText(x) || "Preis");
      mkBtn(list, label.length > 12 ? label.slice(0, 11) + "…" : label, x.id === s.selSticker, function () { s.selSticker = x.id; buildCells(); syncSticker(); render(); });
    });
    $("stempty").hidden = s.stickers.length > 0; $("sted").hidden = !k;
    if (!k) return;
    var emoji = k.kind === "emoji", t = $("sttext");
    t.value = k.auto ? "" : k.text; t.disabled = !!k.auto || emoji; t.placeholder = k.auto ? "Kommt aus dem Preisfeld" : "";
    $("stsize").value = k.size; $("strot").value = k.rot;
    var kb = $("stkind"); kb.textContent = ""; kb.hidden = emoji;
    VB.STK_KINDS.forEach(function (d) { mkBtn(kb, d[1], k.kind === d[0], function () { k.kind = d[0]; syncSticker(); render(); persist(); }); });
    var cb = $("stcol"); cb.textContent = ""; cb.hidden = emoji;
    VB.STK_COLORS.forEach(function (c) {
      var el = document.createElement("button"); el.type = "button"; el.className = "sw"; el.style.background = c; el.setAttribute("aria-label", "Farbe " + c);
      el.setAttribute("aria-pressed", String(k.color === c));
      el.onclick = function () { k.color = c; syncSticker(); render(); persist(); };
      cb.appendChild(el);
    });
  }
  $("sttext").addEventListener("input", function () { var k = selected(); if (k) { k.text = this.value; render(); persist(); } });
  $("stsize").addEventListener("input", function () { var k = selected(); if (k) { k.size = +this.value; render(); persist(); } });
  $("strot").addEventListener("input", function () { var k = selected(); if (k) { k.rot = +this.value; render(); persist(); } });
  $("stdel").onclick = function () {
    s.stickers = s.stickers.filter(function (x) { return x.id !== s.selSticker; });
    s.selSticker = null; buildCells(); syncSticker(); render(); persist();
  };
  $("stdup").onclick = function () {
    var k = selected(); if (!k || s.stickers.length >= 20) return;
    var c = JSON.parse(JSON.stringify(k)); c.id = ++sid; c.x = clamp(k.x - 0.06, 0.05, 0.95); c.y = clamp(k.y + 0.06, 0.05, 0.95);
    s.stickers.push(c); s.selSticker = c.id; syncSticker(); render(); persist();
  };

  /* Ziehen im Bild: Aufkleber verschieben, Foto verschieben, mit zwei Fingern zoomen */
  var ptrs = {}, drag = null, pinch = null;
  function pt(e) { var r = cv.getBoundingClientRect(), k = W / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }; }
  function hitSticker(p) {
    var H = VB.H();
    for (var i = s.stickers.length - 1; i >= 0; i--) {
      var k = s.stickers[i], a = k.rot * Math.PI / 180, dx = p.x - k.x * W, dy = p.y - k.y * H;
      var lx = (dx * Math.cos(a) + dy * Math.sin(a)) / k.size, ly = (-dx * Math.sin(a) + dy * Math.cos(a)) / k.size;
      if (Math.abs(lx) <= (k._hw || 90) + 12 && Math.abs(ly) <= (k._hh || 90) + 12) return k;
    }
    return null;
  }
  function cellAt(p) {
    var c = R.hit.cells;
    for (var i = 0; i < c.length; i++) if (p.x >= c[i].x && p.x <= c[i].x + c[i].w && p.y >= c[i].y && p.y <= c[i].y + c[i].h) return c[i];
    return null;
  }
  cv.addEventListener("pointerdown", function (e) {
    var p = pt(e); ptrs[e.pointerId] = p; cv.setPointerCapture(e.pointerId);
    var ids = Object.keys(ptrs);
    if (ids.length === 2 && drag && drag.type === "photo") {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: drag.ph.zoom }; return;
    }
    var k = hitSticker(p);
    if (k) {
      s.selSticker = k.id; drag = { type: "st", k: k, ox: p.x - k.x * W, oy: p.y - k.y * VB.H(), moved: false };
      buildCells(); syncSticker(); render(); return;
    }
    var c = cellAt(p);
    if (c) {
      var hadSticker = s.selSticker != null; s.sel = c.i; s.selSticker = null;
      var ph = R.photoFor(c.i);
      drag = { type: "photo", ph: ph, cell: c, x: p.x, y: p.y, px: ph ? ph.px : 0, py: ph ? ph.py : 0, moved: false, empty: !ph };
      buildCells(); syncPhoto(); if (hadSticker) syncSticker(); render();
    } else {
      s.selSticker = null; drag = null; buildCells(); syncSticker(); render();
    }
    cv.classList.add("drag");
  });
  cv.addEventListener("pointermove", function (e) {
    if (!ptrs[e.pointerId]) return;
    var p = pt(e); ptrs[e.pointerId] = p;
    if (pinch && drag && drag.ph) {
      var ids = Object.keys(ptrs); if (ids.length < 2) return;
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      drag.ph.zoom = clamp(pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0, 1, 3); drag.moved = true; $("zoom").value = drag.ph.zoom; render(); return;
    }
    if (!drag) return;
    if (drag.type === "st") {
      drag.moved = true; drag.k.x = clamp((p.x - drag.ox) / W, 0, 1); drag.k.y = clamp((p.y - drag.oy) / VB.H(), 0, 1); render();
    } else if (drag.ph) {
      if (Math.hypot(p.x - drag.x, p.y - drag.y) > 8) drag.moved = true;
      var r = R.panRange(drag.ph, drag.cell.w, drag.cell.h);
      if (r.rx > 1) drag.ph.px = clamp(drag.px + (p.x - drag.x) / r.rx, -1, 1);
      if (r.ry > 1) drag.ph.py = clamp(drag.py + (p.y - drag.y) / r.ry, -1, 1);
      render();
    }
  });
  function endPtr(e) {
    delete ptrs[e.pointerId];
    if (Object.keys(ptrs).length < 2) pinch = null;
    if (Object.keys(ptrs).length === 0) {
      cv.classList.remove("drag");
      if (drag && drag.empty && !drag.moved) $("file").click();
      if (drag && drag.type === "st") persist();
      drag = null;
    }
  }
  cv.addEventListener("pointerup", endPtr); cv.addEventListener("pointercancel", endPtr);

  /* Speichern und Teilen */
  function fileName() {
    var base = s.texts.title.trim().toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return (base || "verkaufsbild") + ".png";
  }
  function exportBlob(cb) {
    var c = document.createElement("canvas"); c.width = W; c.height = VB.H();
    R.draw(c.getContext("2d"), { export: true });
    c.toBlob(function (b) { if (!b) toast("Das Bild konnte nicht erzeugt werden."); else cb(b); }, "image/png");
  }
  $("save").addEventListener("click", function () {
    exportBlob(function (blob) {
      var a = document.createElement("a"), url = URL.createObjectURL(blob);
      a.href = url; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000); toast("Gespeichert.");
    });
  });
  var probe = new File([""], "x.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [probe] })) {
    $("share").hidden = false;
    $("share").addEventListener("click", function () {
      exportBlob(function (blob) {
        navigator.share({ files: [new File([blob], fileName(), { type: "image/png" })] })
          .catch(function (e) { if (e && e.name !== "AbortError") toast("Teilen hat nicht geklappt."); });
      });
    });
  }

  /* Start */
  restore();
  Object.keys(s.texts).forEach(function (k) { $(k).value = s.texts[k]; });
  $("ct").value = s.t; $("cg").value = s.g; $("radius").value = s.radius;
  buildArticles(); setSize(); buildFormats(); buildStyles(); buildFonts(); buildCols(); buildCollage(); buildCells(); buildChips(); buildLib();
  syncPhoto(); syncSticker(); updateStatus(); render();
  if (document.fonts && document.fonts.load) {
    Promise.all(VB.FONTS.map(function (f) { return document.fonts.load(f.css.replace("{s}", 60)); })
      .concat([document.fonts.load("400 60px 'Pacifico'"), document.fonts.load("700 46px 'DM Sans'"), document.fonts.load("800 60px 'Bricolage Grotesque'")]))
      .then(render).catch(render);
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(function () {});
})(window.VB);
