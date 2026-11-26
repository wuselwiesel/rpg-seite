/* Zeichnen: Fotos, Stile, Text, Aufkleber */
(function (VB) {
  "use strict";
  var s = VB.s, W = VB.W, FB = "'DM Sans', system-ui, sans-serif", FD = "'Bricolage Grotesque', 'DM Sans', sans-serif";
  var EMOJI_FONT = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  var ACCENT = "#e8806c";

  /* Fotos mit Korrektur */
  function buildWork(p) {
    var im = p.img, sc = Math.min(1, 1500 / Math.max(im.width, im.height));
    var w = Math.max(1, Math.round(im.width * sc)), h = Math.max(1, Math.round(im.height * sc));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(im, 0, 0, w, h);
    var a = p.adj;
    if (a.b || a.c || a.s) {
      var d = x.getImageData(0, 0, w, h), px = d.data, b = a.b * 2.55, k = 1 + a.c / 100, sa = 1 + a.s / 100;
      for (var i = 0; i < px.length; i += 4) {
        var r = (px[i] + b - 128) * k + 128, g = (px[i + 1] + b - 128) * k + 128, bl = (px[i + 2] + b - 128) * k + 128;
        var gr = 0.299 * r + 0.587 * g + 0.114 * bl;
        px[i] = gr + (r - gr) * sa; px[i + 1] = gr + (g - gr) * sa; px[i + 2] = gr + (bl - gr) * sa;
      }
      x.putImageData(d, 0, 0);
    }
    p.work = c;
  }
  function newPhoto(img) {
    var p = { img: img, work: null, zoom: 1, px: 0, py: 0, adj: { b: 0, c: 0, s: 0 } };
    buildWork(p); return p;
  }
  function makeSample() {
    var c = document.createElement("canvas"); c.width = 800; c.height = 1000;
    var x = c.getContext("2d");
    var gr = x.createLinearGradient(0, 0, 0, 1000); gr.addColorStop(0, "#d9d2ca"); gr.addColorStop(1, "#b9b0a6");
    x.fillStyle = gr; x.fillRect(0, 0, 800, 1000);
    x.save(); x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = 40; x.shadowOffsetY = 24;
    x.beginPath();
    x.moveTo(325, 150); x.quadraticCurveTo(400, 225, 475, 150); x.lineTo(610, 190); x.lineTo(750, 500);
    x.lineTo(655, 540); x.lineTo(610, 410); x.lineTo(618, 780); x.lineTo(182, 780); x.lineTo(190, 410);
    x.lineTo(145, 540); x.lineTo(50, 500); x.lineTo(190, 190); x.closePath();
    x.fillStyle = "#8fae9b"; x.fill(); x.restore();
    x.fillStyle = "#7c9c89"; x.fillRect(182, 740, 436, 40);
    x.fillStyle = "rgba(60,55,50,.6)"; x.font = "500 26px " + FB; x.textAlign = "center";
    x.fillText("Beispielfoto", 400, 60);
    return c;
  }
  var samplePhoto = newPhoto(makeSample());
  function photoFor(i) { return s.photos[i] || (i === 0 && !VB.anyPhoto() ? samplePhoto : null); }

  function panRange(p, w, h) {
    var sc = Math.max(w / p.work.width, h / p.work.height) * p.zoom;
    return { rx: (p.work.width * sc - w) / 2, ry: (p.work.height * sc - h) / 2 };
  }
  function drawPhotoIn(g, p, x, y, w, h) {
    var im = p.work, sc = Math.max(w / im.width, h / im.height) * p.zoom, dw = im.width * sc, dh = im.height * sc;
    var dx = x + (w - dw) / 2 + p.px * (dw - w) / 2, dy = y + (h - dh) / 2 + p.py * (dh - h) / 2;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(im, dx, dy, dw, dh); g.restore();
  }

  function cellRects(coll, a, gap) {
    var x = a.x, y = a.y, w = a.w, h = a.h;
    function r(rx, ry, rw, rh) { return { x: rx, y: ry, w: rw, h: rh }; }
    var hw, hh, lw, rw;
    switch (coll) {
      case "2h": hw = (w - gap) / 2; return [r(x, y, hw, h), r(x + hw + gap, y, hw, h)];
      case "2v": hh = (h - gap) / 2; return [r(x, y, w, hh), r(x, y + hh + gap, w, hh)];
      case "3": lw = (w - gap) * 0.58; rw = w - gap - lw; hh = (h - gap) / 2;
        return [r(x, y, lw, h), r(x + lw + gap, y, rw, hh), r(x + lw + gap, y + hh + gap, rw, hh)];
      case "4": hw = (w - gap) / 2; hh = (h - gap) / 2;
        return [r(x, y, hw, hh), r(x + hw + gap, y, hw, hh), r(x, y + hh + gap, hw, hh), r(x + hw + gap, y + hh + gap, hw, hh)];
      default: return [r(x, y, w, h)];
    }
  }

  function ls(g, px) { try { g.letterSpacing = px + "px"; } catch (e) {} }
  function wrapTitle(g, title, maxW, fs) {
    g.font = VB.fontStr(fs);
    var words = title.split(/\s+/).filter(Boolean), out = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (g.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    return out;
  }
  /* Titel + Untertitel; anchor "top": y = Oberkante, "bottom": y = Grundlinie des Untertitels */
  function textBlock(g, o) {
    ls(g, VB.FONTS[s.font].ls);
    var fs = o.fsMax, lines = wrapTitle(g, o.title, o.maxW, fs);
    while ((lines.length > o.maxLines || lines.some(function (l) { return g.measureText(l).width > o.maxW; })) && fs > 40) {
      fs -= 4; lines = wrapTitle(g, o.title, o.maxW, fs);
    }
    if (lines.length > o.maxLines) lines = lines.slice(0, o.maxLines);
    var lh = fs * 1.02, n = lines.length, first, last, subY;
    if (o.anchor === "bottom") {
      subY = o.y; last = subY - (o.sub ? 84 : 20); first = last - (n - 1) * lh;
    } else {
      first = o.y + fs * 0.85; last = first + (n - 1) * lh; subY = last + 84;
    }
    g.fillStyle = o.ink; g.textAlign = o.align; g.textBaseline = "alphabetic"; g.font = VB.fontStr(fs);
    lines.forEach(function (l, i) { g.fillText(l, o.x, first + i * lh); });
    if (o.sub) { ls(g, 1); g.font = "700 46px " + FB; g.fillText(o.sub, o.x, subY); }
    ls(g, 0);
    return { bottom: (o.sub ? subY : last) + 16 };
  }

  /* Aufkleber */
  function splitTwo(text) {
    var sp = text.split(" ");
    if (sp.length < 2) return [text];
    var best = 1, bd = 1e9;
    for (var i = 1; i < sp.length; i++) {
      var d = Math.abs(sp.slice(0, i).join(" ").length - sp.slice(i).join(" ").length);
      if (d < bd) { bd = d; best = i; }
    }
    return [sp.slice(0, best).join(" "), sp.slice(best).join(" ")];
  }
  function stickerText(st) {
    if (st.auto === "price") { var p = s.texts.price.trim(); return p ? p + " €" : ""; }
    return st.text || "";
  }
  function drawSticker(g, st, selected) {
    var H = VB.H(), text = stickerText(st);
    g.save(); g.translate(st.x * W, st.y * H); g.rotate(st.rot * Math.PI / 180); g.scale(st.size, st.size);
    var hw = 90, hh = 90;
    if (st.kind === "emoji") {
      g.font = "150px " + EMOJI_FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(st.text, 0, 8);
    } else if (text) {
      var fill = st.color, ink = VB.lum(fill) > 0.6 ? "#1b1b1b" : "#ffffff";
      g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 24; g.shadowOffsetY = 10; g.fillStyle = fill;
      var round = st.kind === "kreis" || st.kind === "stern", lines = round && !st.auto ? splitTwo(text) : [text];
      var maxTw = st.kind === "kreis" ? 190 : st.kind === "stern" ? 170 : 1e4, fs = lines.length > 1 ? 54 : 72;
      g.font = "800 " + fs + "px " + FD;
      var tw = Math.max.apply(null, lines.map(function (l) { return g.measureText(l).width; }));
      while (tw > maxTw && fs > 24) { fs -= 2; g.font = "800 " + fs + "px " + FD; tw = Math.max.apply(null, lines.map(function (l) { return g.measureText(l).width; })); }
      if (st.kind === "kreis") {
        g.beginPath(); g.arc(0, 0, 118, 0, Math.PI * 2); g.fill(); hw = hh = 118;
      } else if (st.kind === "stern") {
        g.beginPath();
        for (var i = 0; i < 32; i++) { var r = i % 2 ? 108 : 132, a = i * Math.PI / 16; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        g.closePath(); g.fill(); g.lineJoin = "round"; g.lineWidth = 14; g.strokeStyle = fill; g.stroke(); hw = hh = 134;
      } else if (st.kind === "pille") {
        var pw = tw + 90, ph = 112; g.beginPath(); g.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); g.fill(); hw = pw / 2; hh = ph / 2;
      } else {
        var ew = tw + 150, eh = 120, hx = -ew / 2 + 38;
        g.beginPath(); g.roundRect(-ew / 2, -eh / 2, ew, eh, 22); g.moveTo(hx + 13, 0); g.arc(hx, 0, 13, 0, Math.PI * 2); g.fill("evenodd");
        hw = ew / 2; hh = eh / 2;
      }
      g.shadowColor = "transparent"; g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
      var cx = st.kind === "etikett" ? 24 : 0, lh = fs * 1.05;
      lines.forEach(function (l, i) { g.fillText(l, cx, 4 + (i - (lines.length - 1) / 2) * lh); });
    }
    st._hw = hw; st._hh = hh;
    if (selected) {
      g.shadowColor = "transparent"; g.setLineDash([14, 10]); g.lineWidth = 5; g.strokeStyle = ACCENT;
      g.strokeRect(-hw - 10, -hh - 10, hw * 2 + 20, hh * 2 + 20);
    }
    g.restore();
  }

  /* Bild zeichnen. o.export = ohne Auswahlrahmen */
  var hit = { cells: [] };
  function draw(g, o) {
    o = o || {};
    var H = VB.H(), st = s.style, none = VB.colNone(), T = s.texts;
    var safeB = H > 1500 ? 230 : 0, safeT = H > 1500 ? 120 : 0;
    var title = T.title.trim(), sub = VB.subtitle();
    var area, shape, gap = st === "tise" ? 6 : 10, bgFill = "#ffffff", textInk = s.t;
    g.clearRect(0, 0, W, H);

    function solidBg() {
      var gr = g.createLinearGradient(0, 0, W * 0.5, H);
      gr.addColorStop(0, VB.mix(s.g, "#ffffff", 0.16)); gr.addColorStop(1, s.g);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    function titleStr() { return st === "polaroid" ? title : title.toUpperCase(); }

    var mag = null;
    if (st === "tise") {
      area = { x: 0, y: 0, w: W, h: H }; bgFill = "#111111";
      shape = function () { g.rect(0, 0, W, H); };
    } else {
      solidBg();
      if (st === "karte") {
        var top = Math.round(H * 0.05) + safeT;
        area = { x: Math.round(W * 0.12), y: top, w: Math.round(W * 0.76), h: H - top - 340 - safeB };
        shape = function () { g.roundRect(area.x, area.y, area.w, area.h, s.radius); };
      } else if (st === "bogen") {
        var tb = Math.round(H * 0.05) + safeT, aw = Math.round(W * 0.7);
        area = { x: (W - aw) / 2, y: tb, w: aw, h: H - tb - 340 - safeB };
        shape = function () { g.roundRect(area.x, area.y, area.w, area.h, [aw / 2, aw / 2, Math.min(s.radius, 60), Math.min(s.radius, 60)]); };
      } else if (st === "polaroid") {
        var pt = Math.round(H * 0.05) + safeT * 0.6, pw = Math.round(W * 0.84), ph = H - pt - Math.round(H * 0.04) - safeB;
        var paper = { x: (W - pw) / 2, y: pt, w: pw, h: ph }, m = Math.round(pw * 0.05);
        area = { x: paper.x + m, y: paper.y + m, w: pw - 2 * m, h: ph - m - 270 };
        shape = function () { g.rect(area.x, area.y, area.w, area.h); };
        g.save(); g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 50; g.shadowOffsetY = 26; g.fillStyle = "#fffdf8";
        g.fillRect(paper.x, paper.y, paper.w, paper.h); g.restore();
        textInk = VB.lum(s.t) < 0.5 ? s.t : "#2a2623";
      } else {
        mag = textBlock(g, { title: titleStr(), sub: sub, align: "left", x: 70, maxW: W - 140, fsMax: 130, maxLines: 2, ink: s.t, anchor: "top", y: 60 + safeT });
        var ay = mag.bottom + 36;
        area = { x: 50, y: ay, w: W - 100, h: H - ay - 56 - safeB };
        shape = function () { g.roundRect(area.x, area.y, area.w, area.h, s.radius); };
      }
      if (st !== "polaroid" && st !== "magazin") { g.save(); g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 60; g.shadowOffsetY = 30; g.fillStyle = "#fff"; g.beginPath(); shape(); g.fill(); g.restore(); }
      if (st === "magazin") { g.save(); g.shadowColor = "rgba(0,0,0,.2)"; g.shadowBlur = 40; g.shadowOffsetY = 20; g.fillStyle = "#fff"; g.beginPath(); shape(); g.fill(); g.restore(); }
    }

    /* Fotos / Collage */
    var cells = cellRects(s.collage, area, gap);
    hit.cells = [];
    g.save(); g.beginPath(); shape(); g.clip();
    g.fillStyle = bgFill; g.fillRect(area.x, area.y, area.w, area.h);
    cells.forEach(function (c, i) {
      var p = photoFor(i);
      if (p) drawPhotoIn(g, p, c.x, c.y, c.w, c.h);
      else {
        g.fillStyle = "#cfc8bf"; g.fillRect(c.x, c.y, c.w, c.h);
        g.fillStyle = "#6d675f"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "700 90px " + FB;
        g.fillText("+", c.x + c.w / 2, c.y + c.h / 2 - 20); g.font = "500 34px " + FB; g.fillText("Foto " + (i + 1), c.x + c.w / 2, c.y + c.h / 2 + 50);
      }
      hit.cells.push({ i: i, x: c.x, y: c.y, w: c.w, h: c.h });
    });
    g.restore();

    /* Text */
    if (st === "tise") {
      if (!none) {
        var gr = g.createLinearGradient(0, H * 0.52, 0, H);
        gr.addColorStop(0, VB.rgba(s.g, 0)); gr.addColorStop(0.35, VB.rgba(s.g, 0.4));
        gr.addColorStop(0.7, VB.rgba(s.g, 0.82)); gr.addColorStop(1, VB.rgba(s.g, 0.96));
        g.fillStyle = gr; g.fillRect(0, H * 0.5, W, H * 0.5);
        textBlock(g, { title: titleStr(), sub: sub, align: "center", x: W / 2, maxW: W * 0.82, fsMax: 110, maxLines: 2, ink: s.t, anchor: "bottom", y: H - 96 - safeB });
      }
    } else if (!none) {
      var ay0 = area.y + area.h;
      if (st === "karte") textBlock(g, { title: titleStr(), sub: sub, align: "left", x: area.x, maxW: area.w, fsMax: 92, maxLines: 2, ink: s.t, anchor: "top", y: ay0 + 22 });
      else if (st === "bogen") textBlock(g, { title: titleStr(), sub: sub, align: "center", x: W / 2, maxW: W * 0.84, fsMax: 92, maxLines: 2, ink: s.t, anchor: "top", y: ay0 + 22 });
      else if (st === "polaroid") textBlock(g, { title: titleStr(), sub: sub, align: "center", x: W / 2, maxW: area.w, fsMax: 96, maxLines: 2, ink: textInk, anchor: "top", y: ay0 + 14 });
    }

    if (T.shop.trim()) {
      g.save(); g.shadowColor = "rgba(0,0,0,.4)"; g.shadowBlur = 14;
      g.fillStyle = "#fff"; g.font = "400 70px 'Pacifico', cursive"; g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.fillText(T.shop.trim(), area.x + (st === "tise" ? 64 : 36), area.y + 100 + (st === "tise" ? 50 + safeT : 0));
      g.restore();
    }

    /* Aufkleber */
    s.stickers.forEach(function (k) { drawSticker(g, k, !o.export && k.id === s.selSticker); });

    /* Auswahlrahmen der Foto-Zelle */
    if (!o.export && VB.nCells() > 1 && s.selSticker == null) {
      var c = cells[Math.min(s.sel, cells.length - 1)];
      g.save(); g.setLineDash([16, 10]); g.lineWidth = 6; g.strokeStyle = ACCENT; g.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8); g.restore();
    }
  }

  VB.render = { draw: draw, buildWork: buildWork, newPhoto: newPhoto, photoFor: photoFor, panRange: panRange, cellRects: cellRects, hit: hit, stickerText: stickerText };
})(window.VB);
