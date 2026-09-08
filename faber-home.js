/*! Faber Home — non una card: un'applicazione a schermo intero dentro Home
 *  Assistant. Sfondo animato, intestazione propria (orologio, data, meteo,
 *  chip), pagine con barra in basso in cui il cerchio rialzato segue la
 *  pagina attiva, e dentro le pagine card di Home Assistant VERE (qualunque
 *  tipo, comprese le sette della famiglia Faber) disposte in righe e colonne.
 *
 *  Si monta come Faber Layout: una dashboard dedicata con un'unica vista
 *  "panel" che contiene {"type":"custom:faber-home"} — voce propria nella
 *  barra laterale, nessuno YAML, nessun riavvio.
 */
const FH_VERSION = "0.1.0";
console.info(`%c FABER HOME %c v${FH_VERSION} `,
  "color:#1c1400;background:#ffb020;font-weight:700;border-radius:4px 0 0 4px",
  "color:#ffe9c2;background:#1a1b21;border-radius:0 4px 4px 0");

const FH_DEFAULTS = {
  type: "custom:faber-home",
  background: "particles",
  header: { clock: true, seconds: false, weather: "", temperature: "", chips: [] },
  pages: [
    { id: "home", title: "Casa", icon: "mdi:home-variant", rows: [] },
  ],
};

function fhEsc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function fhUid(p) { return (p || "id") + Math.random().toString(36).slice(2, 8); }

const FH_WEATHER_IT = {
  "sunny": "Sereno", "clear-night": "Sereno", "cloudy": "Nuvoloso",
  "partlycloudy": "Poco nuvoloso", "rainy": "Pioggia", "pouring": "Pioggia forte",
  "snowy": "Neve", "snowy-rainy": "Nevischio", "fog": "Nebbia", "hail": "Grandine",
  "windy": "Ventoso", "windy-variant": "Ventoso", "lightning": "Temporale",
  "lightning-rainy": "Temporale", "exceptional": "Allerta",
};
const FH_STATE_IT = {
  "on": "Acceso", "off": "Spento", "home": "In casa", "not_home": "Fuori",
  "locked": "Chiusa", "unlocked": "Aperta", "open": "Aperta", "closed": "Chiusa",
  "unavailable": "Non disponibile", "unknown": "—",
};
function fhStateText(st) {
  if (!st) return "";
  const t = FH_STATE_IT[st.state];
  if (t) return t;
  const u = st.attributes && st.attributes.unit_of_measurement;
  return u ? `${st.state} ${u}` : st.state;
}
const FH_WEATHER_ICON = {
  "sunny": "mdi:weather-sunny", "clear-night": "mdi:weather-night",
  "cloudy": "mdi:weather-cloudy", "partlycloudy": "mdi:weather-partly-cloudy",
  "rainy": "mdi:weather-rainy", "pouring": "mdi:weather-pouring",
  "snowy": "mdi:weather-snowy", "fog": "mdi:weather-fog", "windy": "mdi:weather-windy",
  "lightning": "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy",
  "hail": "mdi:weather-hail",
};

// ---------------------------------------------------------------------------
// Sfondo animato. Canvas invece di centinaia di nodi DOM: su un tablet a muro
// deve poter restare acceso tutto il giorno senza scaldare. Si ferma da solo
// quando la pagina non è visibile e rispetta "riduci animazioni" di sistema.
class FhParticles {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.dots = [];
    this.running = false;
    this._onVis = () => (document.hidden ? this.stop() : this.start());
  }
  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.c.width = Math.max(1, Math.floor(r.width * dpr));
    this.c.height = Math.max(1, Math.floor(r.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width; this.h = r.height;
    const target = Math.round((this.w * this.h) / 26000);
    this.dots = [];
    for (let i = 0; i < target; i++) {
      this.dots.push({
        x: Math.random() * this.w, y: Math.random() * this.h,
        r: 0.6 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.09, vy: (Math.random() - 0.5) * 0.09,
        a: 0.18 + Math.random() * 0.5,
      });
    }
  }
  start() {
    if (this.running) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.resize(); this.draw(); return;
    }
    this.running = true;
    document.addEventListener("visibilitychange", this._onVis);
    const loop = () => {
      if (!this.running) return;
      this.step(); this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }
  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    document.removeEventListener("visibilitychange", this._onVis);
  }
  step() {
    for (const d of this.dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x += this.w; else if (d.x > this.w) d.x -= this.w;
      if (d.y < 0) d.y += this.h; else if (d.y > this.h) d.y -= this.h;
    }
  }
  draw() {
    const g = this.ctx;
    if (!g || !this.w) return;
    g.clearRect(0, 0, this.w, this.h);
    for (const d of this.dots) {
      g.beginPath();
      g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      g.fillStyle = `rgba(255,255,255,${d.a})`;
      g.fill();
    }
  }
}

// ---------------------------------------------------------------------------
class FaberHome extends HTMLElement {
  setConfig(config) {
    const src = config || {};
    this._cfg = Object.assign({}, FH_DEFAULTS, src, {
      header: Object.assign({}, FH_DEFAULTS.header, src.header || {},
        { chips: ((src.header && src.header.chips) || []).map(c => Object.assign({}, c)) }),
      pages: (src.pages && src.pages.length ? src.pages : FH_DEFAULTS.pages).map(p => Object.assign({}, p)),
    });
    this._page = 0;
    this._built = false;
    this._cardEls = new Map();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) { this._built = true; this._build(); }
    else { this._updateLive(); }
    // Le card figlie sono card HA vere: vogliono l'oggetto hass a ogni giro.
    this._cardEls.forEach(el => { el.hass = hass; });
  }

  getCardSize() { return 20; }

  connectedCallback() { if (this._particles) this._particles.start(); this._startClock(); }
  disconnectedCallback() {
    if (this._particles) this._particles.stop();
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  }

  _startClock() {
    if (this._timer) clearInterval(this._timer);
    const sec = this._cfg && this._cfg.header.seconds;
    this._timer = setInterval(() => {
      const t = this.querySelector("[data-clock]"); if (t) t.textContent = this._timeText();
      const d = this.querySelector("[data-date]"); if (d) d.textContent = this._dateText();
    }, sec ? 1000 : 20000);
  }
  _timeText() {
    const n = new Date(), p = v => String(v).padStart(2, "0");
    return this._cfg.header.seconds
      ? `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`
      : `${p(n.getHours())}:${p(n.getMinutes())}`;
  }
  _dateText() {
    return new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  }

  // -------------------------------------------------------------------------
  _build() {
    const cfg = this._cfg;
    this.innerHTML = `<style>${FH_CSS}</style>
      <div class="fh-app">
        <canvas class="fh-bg" ${cfg.background === "particles" ? "" : "hidden"}></canvas>
        <header class="fh-head">
          <div class="fh-clockbox">
            <div class="fh-clock" data-clock>${this._timeText()}</div>
            <div class="fh-date" data-date>${this._dateText()}</div>
          </div>
          <div class="fh-chips" data-chips>${this._chipsHTML()}</div>
          <div class="fh-headicons">
            <button type="button" class="fh-ic" data-act="reload" title="Ricarica"><ha-icon icon="mdi:refresh"></ha-icon></button>
            <button type="button" class="fh-ic" data-act="ha" title="Home Assistant"><ha-icon icon="mdi:home-assistant"></ha-icon></button>
          </div>
        </header>
        <main class="fh-main" data-main></main>
        <nav class="fh-nav" data-nav></nav>
      </div>`;

    const canvas = this.querySelector(".fh-bg");
    if (cfg.background === "particles" && canvas) {
      this._particles = new FhParticles(canvas);
      // Il canvas parte a dimensione zero finché il pannello non è disposto:
      // si misura quando cambia davvero, non una volta sola alla creazione.
      this._ro = new ResizeObserver(() => { this._particles.resize(); this._particles.draw(); });
      this._ro.observe(canvas);
      this._particles.start();
    }
    this.querySelectorAll(".fh-ic").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.act === "reload") location.reload();
      else if (b.dataset.act === "ha") {
        history.pushState(null, "", "/lovelace");
        window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
      }
    }));
    this._renderNav();
    this._renderPage();
    this._startClock();
  }

  _chipsHTML() {
    const hass = this._hass;
    const h = this._cfg.header;
    const out = [];
    const wEnt = h.weather && hass ? hass.states[h.weather] : null;
    const tEnt = h.temperature && hass ? hass.states[h.temperature] : null;
    const temp = tEnt ? tEnt.state : (wEnt && wEnt.attributes ? wEnt.attributes.temperature : null);
    if (temp != null) {
      out.push(`<div class="fh-chip" data-weatherchip>
        <ha-icon icon="${fhEsc(wEnt ? (FH_WEATHER_ICON[wEnt.state] || "mdi:weather-partly-cloudy") : "mdi:thermometer")}"></ha-icon>
        <span data-wtemp>${fhEsc(temp)}°</span>
        ${wEnt ? `<small data-wcond>${fhEsc(FH_WEATHER_IT[wEnt.state] || wEnt.state)}</small>` : ""}
      </div>`);
    }
    (h.chips || []).forEach(chip => {
      const st = chip.entity && hass ? hass.states[chip.entity] : null;
      const on = st && ["on", "home", "open", "unlocked"].includes(st.state);
      out.push(`<button type="button" class="fh-chip${on ? " on" : ""}" data-chip-entity="${fhEsc(chip.entity || "")}">
        ${chip.icon ? `<ha-icon icon="${fhEsc(chip.icon)}"></ha-icon>` : ""}
        <span>${fhEsc(chip.label || (st ? st.attributes.friendly_name : ""))}</span>
        ${st ? `<small data-chip-state>${fhEsc(fhStateText(st))}</small>` : ""}
      </button>`);
    });
    return out.join("");
  }

  _renderNav() {
    const nav = this.querySelector("[data-nav]");
    if (!nav) return;
    const pages = this._cfg.pages;
    // Il cerchio ambra rialzato NON è una voce fissa: marca la pagina attiva,
    // e si sposta quando cambi pagina.
    nav.innerHTML = `<div class="fh-navbar">${pages.map((p, i) => i === this._page
      ? `<button type="button" class="fh-navitem active" data-page="${i}">
           <span class="fh-navcircle"><ha-icon icon="${fhEsc(p.icon || "mdi:circle")}"></ha-icon></span>
           <span class="fh-navlabel">${fhEsc(p.title || "")}</span>
         </button>`
      : `<button type="button" class="fh-navitem" data-page="${i}">
           <ha-icon icon="${fhEsc(p.icon || "mdi:circle-outline")}"></ha-icon>
           <span class="fh-navlabel">${fhEsc(p.title || "")}</span>
         </button>`).join("")}</div>`;
    nav.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.dataset.page, 10);
      if (i === this._page) return;
      this._page = i;
      this._renderNav();
      this._renderPage();
    }));
  }

  async _renderPage() {
    const main = this.querySelector("[data-main]");
    if (!main) return;
    const page = this._cfg.pages[this._page];
    this._cardEls.clear();
    main.innerHTML = "";
    if (!page || !page.rows || !page.rows.length) {
      main.innerHTML = `<div class="fh-empty">
        <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
        <div>Questa pagina è vuota.</div>
        <small>La modalità modifica arriva nella prossima tappa: per ora le card si aggiungono dalla configurazione del pannello.</small>
      </div>`;
      return;
    }
    const helpers = await this._helpers();
    page.rows.forEach(row => {
      const rowEl = document.createElement("div");
      rowEl.className = "fh-row";
      (row.cols || []).forEach(col => {
        const colEl = document.createElement("div");
        colEl.className = "fh-col";
        colEl.style.flex = `${col.span || 1} 1 0`;
        (col.cards || []).forEach(cardCfg => {
          const el = this._createCard(cardCfg, helpers);
          if (el) { colEl.appendChild(el); this._cardEls.set(el, el); }
        });
        rowEl.appendChild(colEl);
      });
      main.appendChild(rowEl);
    });
  }

  async _helpers() {
    // loadCardHelpers è la via ufficiale per istanziare QUALUNQUE card di HA,
    // non solo le nostre: è ciò che rende questo un vero pannello dashboard e
    // non un contenitore per sette tipi scelti a mano.
    if (this._cardHelpers) return this._cardHelpers;
    if (window.loadCardHelpers) {
      try { this._cardHelpers = await window.loadCardHelpers(); } catch (e) { this._cardHelpers = null; }
    }
    return this._cardHelpers;
  }

  _createCard(cardCfg, helpers) {
    let el = null;
    try {
      if (helpers && helpers.createCardElement) el = helpers.createCardElement(cardCfg);
      else if (cardCfg.type && cardCfg.type.startsWith("custom:")) {
        el = document.createElement(cardCfg.type.slice(7));
        el.setConfig(cardCfg);
      }
    } catch (e) {
      el = null;
    }
    if (!el) {
      const ph = document.createElement("div");
      ph.className = "fh-cardfail";
      ph.textContent = `Card non caricata: ${cardCfg && cardCfg.type ? cardCfg.type : "sconosciuta"}`;
      return ph;
    }
    if (this._hass) el.hass = this._hass;
    const wrap = document.createElement("div");
    wrap.className = "fh-cardwrap";
    wrap.appendChild(el);
    this._cardEls.set(el, el);
    return wrap;
  }

  _updateLive() {
    const box = this.querySelector("[data-chips]");
    if (box) box.innerHTML = this._chipsHTML();
    this._wireChips();
  }

  _wireChips() {
    this.querySelectorAll("[data-chip-entity]").forEach(btn => {
      btn.onclick = () => {
        const ent = btn.dataset.chipEntity;
        if (!ent || !this._hass) return;
        const dom = ent.split(".")[0];
        if (["switch", "light", "fan", "input_boolean", "automation", "lock"].includes(dom)) {
          const svc = dom === "lock" ? (this._hass.states[ent].state === "locked" ? "unlock" : "lock") : "toggle";
          this._hass.callService(dom, svc, { entity_id: ent });
        }
      };
    });
  }
}

const FH_CSS = `
  .fh-app{position:relative;min-height:100vh;display:flex;flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    color:#eaf1f8;background:radial-gradient(120% 90% at 15% -10%,#1b2740,#0d1420 55%,#080c14)}
  .fh-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .fh-head{position:relative;z-index:1;display:flex;align-items:flex-start;gap:14px;
    padding:18px 20px 8px;flex-wrap:wrap}
  .fh-clockbox{flex:0 0 auto}
  .fh-clock{font-size:clamp(34px,9vw,52px);font-weight:800;line-height:1;letter-spacing:-.02em;
    font-variant-numeric:tabular-nums}
  .fh-date{margin-top:4px;font-size:12.5px;font-weight:600;color:#93a1b0;text-transform:capitalize}
  .fh-chips{flex:1;display:flex;flex-wrap:wrap;gap:7px;align-items:center;min-width:0}
  .fh-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;cursor:pointer;
    font:inherit;font-size:12.5px;font-weight:700;color:#93a1b0;
    border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:.2s}
  .fh-chip ha-icon{--mdc-icon-size:16px}
  .fh-chip small{opacity:.75;font-weight:600}
  .fh-chip.on{color:#ffe9c2;border-color:rgba(255,176,32,.5);
    background:linear-gradient(135deg,rgba(255,176,32,.26),rgba(255,176,32,.12))}
  .fh-headicons{display:flex;gap:6px;flex:0 0 auto}
  .fh-ic{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.09);
    background:rgba(255,255,255,.05);color:#93a1b0;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .fh-ic ha-icon{--mdc-icon-size:19px}
  .fh-main{position:relative;z-index:1;flex:1;padding:8px 16px 110px;display:flex;flex-direction:column;gap:14px}
  .fh-row{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}
  .fh-col{display:flex;flex-direction:column;gap:14px;min-width:240px}
  .fh-cardwrap{display:block}
  .fh-cardfail{padding:14px;border-radius:16px;font-size:12.5px;color:#93a1b0;
    border:1px dashed rgba(255,255,255,.16);background:rgba(255,255,255,.04)}
  .fh-empty{margin:auto;text-align:center;color:#93a1b0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:40px 20px}
  .fh-empty ha-icon{--mdc-icon-size:46px;opacity:.5}
  .fh-empty small{font-size:11.5px;max-width:320px;line-height:1.5}
  .fh-nav{position:fixed;left:0;right:0;bottom:0;z-index:6;
    padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none}
  .fh-navbar{display:flex;align-items:flex-end;justify-content:space-around;gap:4px;
    max-width:560px;margin:0 auto;padding:8px 10px;pointer-events:auto;
    background:rgba(30,38,48,.78);border:1px solid rgba(255,255,255,.09);border-radius:26px;
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 12px 30px rgba(0,0,0,.45)}
  .fh-navitem{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;
    padding:7px 4px;border:none;background:none;cursor:pointer;font:inherit;color:#93a1b0;transition:color .2s}
  .fh-navitem ha-icon{--mdc-icon-size:23px}
  .fh-navlabel{font-size:10.5px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-navitem:hover{color:#eaf1f8}
  /* Pagina attiva: il cerchio rialzato si sposta qui — è il modo in cui si
     capisce dove si è senza leggere le etichette. */
  .fh-navitem.active{color:#eaf1f8}
  .fh-navcircle{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    margin-top:-30px;background:linear-gradient(150deg,#ffc55c,#ffb020 55%,#e6890a);
    box-shadow:0 8px 22px rgba(255,176,32,.42),0 2px 6px rgba(0,0,0,.3);
    border:2px solid rgba(13,20,32,.9)}
  .fh-navcircle ha-icon{--mdc-icon-size:27px;color:#1c1400}
  @media (max-width:520px){
    .fh-head{padding:14px 14px 6px}
    .fh-main{padding:6px 12px 108px}
    .fh-col{min-width:100%}
  }
`;

customElements.define("faber-home", FaberHome);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "faber-home",
  name: "Faber Home",
  description: "Pannello a schermo intero: sfondo animato, intestazione con orologio e chip, pagine con barra in basso e card di Home Assistant in righe e colonne.",
  preview: false,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
});
