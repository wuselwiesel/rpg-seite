/* Gemeinsamer Zustand und Konstanten */
window.VB = (function () {
  "use strict";
  var W = 1080;

  var FORMATS = [["4x5", "4:5", 1350], ["1x1", "1:1", 1080], ["9x16", "Story", 1920]];
  var STYLES = [["tise", "Tise"], ["karte", "Karte"], ["bogen", "Bogen"], ["polaroid", "Polaroid"], ["magazin", "Magazin"]];
  var COLLAGES = [["1", "Ein Foto"], ["2h", "Zwei nebeneinander"], ["2v", "Zwei untereinander"], ["3", "Drei Fotos"], ["4", "Vier Fotos"]];
  var COLL_N = { "1": 1, "2h": 2, "2v": 2, "3": 3, "4": 4 };

  var FONTS = [
    { n: "sans", css: "700 {s}px 'DM Sans', sans-serif", ls: 1, st: "font-weight:700;font-family:'DM Sans'" },
    { n: "serif", css: "800 {s}px 'Roboto Slab', serif", ls: 1, st: "font-weight:800;font-family:'Roboto Slab'" },
    { n: "classic", css: "400 {s}px 'Bodoni Moda', serif", ls: 2, st: "font-weight:400;font-family:'Bodoni Moda'" },
    { n: "chewy", css: "400 {s}px 'Chewy', cursive", ls: 1, st: "font-family:'Chewy'" },
    { n: "barlow", css: "italic 800 {s}px 'Barlow Condensed', sans-serif", ls: 1, st: "font-style:italic;font-weight:800;font-family:'Barlow Condensed'" },
    { n: "hand", css: "700 {s}px 'Caveat', cursive", ls: 0, st: "font-weight:700;font-family:'Caveat'" }
  ];

  var COLS = [
    { n: "Ohne Text", none: true },
    { n: "Creme auf Schwarz", t: "#f6efe4", g: "#000000" },
    { n: "Creme auf Dunkelgrün", t: "#f6efe4", g: "#123428" },
    { n: "Grün auf Creme", t: "#143a2c", g: "#f6efe4" },
    { n: "Bordeaux auf Creme", t: "#8a2d4a", g: "#f6efe4" },
    { n: "Grün auf Weiß", t: "#143a2c", g: "#ffffff" },
    { n: "Creme auf Bordeaux", t: "#f6efe4", g: "#6e1f3a" },
    { n: "Pfirsich", t: "#3a1d12", g: "#ffd9c7" },
    { n: "Salbei", t: "#1d3a24", g: "#d9e7d3" },
    { n: "Himmel", t: "#14304f", g: "#d6e6f7" },
    { n: "Flieder", t: "#3a2160", g: "#e6dcf5" },
    { n: "Butter", t: "#4a3a05", g: "#fff0b8" },
    { n: "Rosé", t: "#5a1a33", g: "#fbd9e3" }
  ];

  var STK_COLORS = ["#ffffff", "#1b1b1b", "#ff6b57", "#ffd23f", "#2f8f6b", "#8fb8f0", "#f6efe4", "#f4a6c1"];
  var STK_KINDS = [["kreis", "Kreis"], ["stern", "Stern"], ["pille", "Pille"], ["etikett", "Etikett"]];
  var STICKERS = [
    { label: "Preis", kind: "kreis", color: "#ffffff", auto: "price" },
    { label: "NEU", text: "NEU", kind: "stern", color: "#ffd23f" },
    { label: "SALE", text: "SALE", kind: "stern", color: "#ff6b57" },
    { label: "Neuwertig", text: "Neuwertig", kind: "pille", color: "#2f8f6b" },
    { label: "Mit Etikett", text: "Neu mit Etikett", kind: "etikett", color: "#ffffff" },
    { label: "Reserviert", text: "Reserviert", kind: "pille", color: "#1b1b1b" },
    { label: "Verkauft", text: "Verkauft", kind: "pille", color: "#ff6b57" },
    { label: "Versand inkl.", text: "Versand inklusive", kind: "kreis", color: "#ffd23f" },
    { label: "VB", text: "VB", kind: "kreis", color: "#ffffff" },
    { label: "Vintage", text: "Vintage", kind: "etikett", color: "#f6efe4" },
    { label: "Unisex", text: "Unisex", kind: "pille", color: "#8fb8f0" },
    { label: "Nur Abholung", text: "Nur Abholung", kind: "pille", color: "#f4a6c1" },
    { label: "Tausch", text: "Tausch möglich", kind: "kreis", color: "#2f8f6b" }
  ];
  var EMOJIS = ["❤️", "⭐", "🔥", "✨", "🌿", "🎀", "🛍️", "💚"];

  var s = {
    format: "4x5", style: "tise", collage: "1", font: 2, col: 1, t: "#f6efe4", g: "#000000", radius: 48,
    photos: [null, null, null, null], sel: 0,
    stickers: [], selSticker: null,
    texts: { title: "Weisses Kleid", size: "L", price: "15", extra: "", shop: "" }
  };

  function H() { for (var i = 0; i < FORMATS.length; i++) if (FORMATS[i][0] === s.format) return FORMATS[i][2]; return 1350; }
  function hexRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function rgbHex(c) { return "#" + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"); }).join(""); }
  function rgba(h, a) { var c = hexRgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function mix(h, o, t) { var a = hexRgb(h), b = hexRgb(o); return rgbHex(a.map(function (v, i) { return v + (b[i] - v) * t; })); }
  function lum(h) { var c = hexRgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function fontStr(size) { return FONTS[s.font].css.replace("{s}", size); }
  function nCells() { return COLL_N[s.collage]; }
  function anyPhoto() { return s.photos.some(Boolean); }
  function missing() { var m = 0; for (var i = 0; i < nCells(); i++) if (!s.photos[i]) m++; return m; }
  function ready() { return anyPhoto() && missing() === 0; }
  function colNone() { return !!(COLS[s.col] && COLS[s.col].none); }

  return {
    W: W, H: H, FORMATS: FORMATS, STYLES: STYLES, COLLAGES: COLLAGES, COLL_N: COLL_N, FONTS: FONTS, COLS: COLS,
    STK_COLORS: STK_COLORS, STK_KINDS: STK_KINDS, STICKERS: STICKERS, EMOJIS: EMOJIS, s: s,
    hexRgb: hexRgb, rgbHex: rgbHex, rgba: rgba, mix: mix, lum: lum, fontStr: fontStr,
    nCells: nCells, anyPhoto: anyPhoto, missing: missing, ready: ready, colNone: colNone
  };
})();
