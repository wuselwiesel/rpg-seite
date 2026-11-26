(function () {
  "use strict";
  var W = 1080, H = 1350;
  var cv = document.getElementById("cv"), g = cv.getContext("2d");
  var FB = "'DM Sans', system-ui, sans-serif";

  var FONTS = [
    { n: "sans", css: "700 {s}px 'DM Sans', sans-serif", ls: 1, st: "font-weight:700;font-family:'DM Sans'" },
    { n: "serif", css: "800 {s}px 'Roboto Slab', serif", ls: 1, st: "font-weight:800;font-family:'Roboto Slab'" },
    { n: "classic", css: "400 {s}px 'Bodoni Moda', serif", ls: 2, st: "font-weight:400;font-family:'Bodoni Moda'" },
    { n: "chewy", css: "400 {s}px 'Chewy', cursive", ls: 1, st: "font-family:'Chewy'" },
    { n: "barlow", css: "italic 800 {s}px 'Barlow Condensed', sans-serif", ls: 1, st: "font-style:italic;font-weight:800;font-family:'Barlow Condensed'" }
  ];
  var COLS = [
    { n: "Ohne Text", none: true },
    { n: "Creme auf Schwarz", t: "#f6efe4", g: "#000000" },
    { n: "Creme auf Dunkelgrün", t: "#f6efe4", g: "#123428" },
    { n: "Grün auf Creme", t: "#143a2c", g: "#f6efe4" },
    { n: "Bordeaux auf Creme", t: "#8a2d4a", g: "#f6efe4" },
    { n: "Grün auf Weiß", t: "#143a2c", g: "#ffffff" },
    { n: "Creme auf Bordeaux", t: "#f6efe4", g: "#6e1f3a" }
  ];
  var FIELDS = ["title", "size", "price", "extra", "shop"];
  var KEY = "verkaufsbilder-v1";

  var s = { font: 2, col: 1, t: "#f6efe4", g: "#000000", img: null, zoom: 1, px: 0, py: 0 };

  function $(id) { return document.getElementById(id); }
  function rgba(h, a) {
    var c = [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); });
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  /* Einstellungen merken (ohne das Foto) */
  function save() {
    try {
      var o = { font: s.font, col: s.col, t: s.t, g: s.g };
      FIELDS.forEach(function (f) { o[f] = $(f).value; });
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function restore() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!o) return;
      if (typeof o.font === "number" && FONTS[o.font]) s.font = o.font;
      if (typeof o.col === "number" && o.col < COLS.length) s.col = o.col;
      if (/^#[0-9a-f]{6}$/i.test(o.t)) s.t = o.t;
      if (/^#[0-9a-f]{6}$/i.test(o.g)) s.g = o.g;
      FIELDS.forEach(function (f) { if (typeof o[f] === "string") $(f).value = o[f]; });
      $("ct").value = s.t; $("cg").value = s.g;
    } catch (e) {}
  }

  /* Beispielfoto: gezeichneter Pullover */
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
  var sample = makeSample();

  function geom() {
    var im = s.img || sample, sc = Math.max(W / im.width, H / im.height) * s.zoom;
    return { im: im, dw: im.width * sc, dh: im.height * sc };
  }
  function fontStr(size) { return FONTS[s.font].css.replace("{s}", size); }
  function ls(px) { try { g.letterSpacing = px + "px"; } catch (e) {} }

  function draw() {
    var title = $("title").value.trim().toUpperCase(), size = $("size").value.trim(), price = $("price").value.trim(),
        extra = $("extra").value.trim(), shop = $("shop").value.trim();
    var G = geom(), none = COLS[s.col] && COLS[s.col].none;
    var dx = (W - G.dw) / 2 + s.px * (G.dw - W) / 2, dy = (H - G.dh) / 2 + s.py * (G.dh - H) / 2;
    g.clearRect(0, 0, W, H);
    g.drawImage(G.im, dx, dy, G.dw, G.dh);

    if (shop) {
      g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 12;
      g.fillStyle = "#fff"; g.font = "400 76px 'Pacifico', cursive"; g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.fillText(shop, 64, 150); g.restore();
    }
    if (none) return;

    var gr = g.createLinearGradient(0, H * 0.52, 0, H);
    gr.addColorStop(0, rgba(s.g, 0)); gr.addColorStop(0.35, rgba(s.g, 0.4));
    gr.addColorStop(0.7, rgba(s.g, 0.82)); gr.addColorStop(1, rgba(s.g, 0.96));
    g.fillStyle = gr; g.fillRect(0, H * 0.5, W, H * 0.5);

    var sub = [size, price && price + " €", extra].filter(Boolean).join(" · ");
    g.fillStyle = s.t; g.textAlign = "center"; g.textBaseline = "alphabetic";
    ls(FONTS[s.font].ls);

    var maxW = W * 0.82, fs = 110, lines;
    function wrap() {
      g.font = fontStr(fs);
      var words = title.split(/\s+/).filter(Boolean), out = [], cur = "";
      words.forEach(function (w) {
        var t = cur ? cur + " " + w : w;
        if (g.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; }
      });
      if (cur) out.push(cur);
      return out;
    }
    lines = wrap();
    while ((lines.length > 2 || lines.some(function (l) { return g.measureText(l).width > maxW; })) && fs > 44) {
      fs -= 4; lines = wrap();
    }
    if (lines.length > 2) lines = lines.slice(0, 2);
    var lh = fs * 1.02, subY = H - 96, last = subY - (sub ? 84 : 20);
    g.font = fontStr(fs);
    lines.forEach(function (l, i) { g.fillText(l, W / 2, last - (lines.length - 1 - i) * lh); });
    if (sub) { ls(1); g.font = "700 46px " + FB; g.fillText(sub, W / 2, subY); }
    ls(0);
  }

  var pending = false;
  function render() {
    if (pending) return; pending = true;
    requestAnimationFrame(function () { pending = false; draw(); });
  }
  function loadFont() {
    if (document.fonts && document.fonts.load) document.fonts.load(fontStr(60)).then(render).catch(render);
  }

  /* Bedienelemente */
  function fontBtns() {
    var box = $("fonts"); box.textContent = "";
    FONTS.forEach(function (f, i) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = f.n; b.style.cssText = f.st;
      b.setAttribute("aria-pressed", String(s.font === i));
      b.onclick = function () { s.font = i; fontBtns(); loadFont(); render(); save(); };
      box.appendChild(b);
    });
  }
  function colBtns() {
    var box = $("cols"); box.textContent = "";
    COLS.forEach(function (c, i) {
      var el = document.createElement("button"); el.type = "button"; el.className = "sw" + (c.none ? " none" : ""); el.title = c.n;
      el.setAttribute("aria-label", c.n); el.setAttribute("aria-pressed", String(s.col === i));
      if (c.none) el.textContent = "⊘";
      else { el.style.background = c.g; var d = document.createElement("i"); d.style.background = c.t; el.appendChild(d); }
      el.onclick = function () {
        s.col = i;
        if (!c.none) { s.t = c.t; s.g = c.g; $("ct").value = c.t; $("cg").value = c.g; }
        colBtns(); render(); save();
      };
      box.appendChild(el);
    });
  }
  restore();
  fontBtns(); colBtns();
  $("ct").addEventListener("input", function () { s.t = this.value; s.col = -1; colBtns(); render(); save(); });
  $("cg").addEventListener("input", function () { s.g = this.value; s.col = -1; colBtns(); render(); save(); });
  FIELDS.forEach(function (id) { $(id).addEventListener("input", function () { render(); save(); }); });
  $("zoom").addEventListener("input", function () { s.zoom = parseFloat(this.value); render(); });

  /* Ausschnitt per Ziehen */
  var drag = null;
  cv.addEventListener("pointerdown", function (e) {
    drag = { x: e.clientX, y: e.clientY, px: s.px, py: s.py };
    cv.setPointerCapture(e.pointerId); cv.classList.add("drag");
  });
  cv.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var k = W / cv.getBoundingClientRect().width, G = geom(), rx = (G.dw - W) / 2, ry = (G.dh - H) / 2;
    if (rx > 1) s.px = Math.max(-1, Math.min(1, drag.px + (e.clientX - drag.x) * k / rx));
    if (ry > 1) s.py = Math.max(-1, Math.min(1, drag.py + (e.clientY - drag.y) * k / ry));
    render();
  });
  function endDrag() { drag = null; cv.classList.remove("drag"); }
  cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);

  /* Foto laden */
  var saveBtn = $("save"), shareBtn = $("share"), hint = $("hint"), toastT;
  function toast(t) {
    var el = $("toast"); el.textContent = t; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 2600);
  }
  function load(file) {
    if (!file || file.type.indexOf("image/") !== 0) { toast("Das ist keine Bilddatei."); return; }
    var im = new Image(), url = URL.createObjectURL(file);
    im.onload = function () {
      s.img = im; s.zoom = 1; s.px = 0; s.py = 0; $("zoom").value = 1;
      $("fname").textContent = file.name;
      saveBtn.disabled = false; shareBtn.disabled = false; hint.textContent = "Fertig? Dann speichern.";
      render();
    };
    im.onerror = function () { toast("Dieses Foto lässt sich nicht öffnen. Versuche JPG oder PNG."); };
    im.src = url;
  }
  $("file").addEventListener("change", function () { load(this.files[0]); });
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { load(ev.dataTransfer.files[0]); });

  /* Speichern und Teilen */
  function fileName() {
    return ($("title").value.trim().toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "verkaufsbild") + ".png";
  }
  function toBlob(cb) {
    draw();
    cv.toBlob(function (b) { if (!b) toast("Das Bild konnte nicht erzeugt werden."); else cb(b); }, "image/png");
  }
  saveBtn.addEventListener("click", function () {
    toBlob(function (blob) {
      var a = document.createElement("a"), url = URL.createObjectURL(blob);
      a.href = url; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast("Gespeichert.");
    });
  });
  var probe = new File([""], "x.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [probe] })) {
    shareBtn.hidden = false; shareBtn.disabled = true;
    shareBtn.addEventListener("click", function () {
      toBlob(function (blob) {
        var f = new File([blob], fileName(), { type: "image/png" });
        navigator.share({ files: [f] }).catch(function (e) { if (e && e.name !== "AbortError") toast("Teilen hat nicht geklappt."); });
      });
    });
  }

  /* Zeichnen, dann Schriften laden und neu zeichnen */
  render();
  if (document.fonts && document.fonts.load) {
    Promise.all(FONTS.map(function (f) { return document.fonts.load(f.css.replace("{s}", 60)); })
      .concat([document.fonts.load("400 60px 'Pacifico'"), document.fonts.load("700 46px 'DM Sans'")]))
      .then(render).catch(render);
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
