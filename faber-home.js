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
const FH_VERSION = "0.2.1";
console.info(`%c FABER HOME %c v${FH_VERSION} `,
  "color:#1c1400;background:#ffb020;font-weight:700;border-radius:4px 0 0 4px",
  "color:#ffe9c2;background:#1a1b21;border-radius:0 4px 4px 0");

const FH_DEFAULTS = {
  type: "custom:faber-home",
  // Aspetto: tre cose distinte, come vanno tenute distinte anche nella testa
  // di chi configura. Lo sfondo pagina è la tinta dietro le card; l'animazione
  // racconta che tempo fa; il tema automatico decide chiaro/scuro per orario.
  appearance: {
    pageBackground: { mode: "gradient", color: "#0d1420", from: "", to: "" },
    weatherAnimation: true,
    autoTheme: { enabled: true, dayStart: "07:00", nightStart: "21:00" },
  },
  header: { clock: true, seconds: false, weather: "", temperature: "", chips: [] },
  pages: [
    { id: "home", title: "Casa", icon: "mdi:home-variant", rows: [] },
  ],
};

// Tavolozze del guscio: due mondi completi, non un'inversione meccanica.
// Di giorno il cielo è chiaro e le scritte scure; di notte il contrario.
// Il chiaro NON è carta bianca: è cielo. Le card di famiglia sono scure per
// scelta, e su un bianco quasi puro sembravano macchie appoggiate; su un
// azzurro di giornata diventano oggetti contro il cielo, che è l'effetto
// giusto. Il grigio del testo è anche più scuro di prima: sopra il chiaro la
// data spariva.
const FH_SKY = {
  light: { top: "#a9c9ea", mid: "#cadcf0", bot: "#e4eef8", ink: "#101722", muted: "#41506a",
    panel: "rgba(255,255,255,.78)", stroke: "rgba(15,23,42,.12)", navInk: "#101722" },
  dark: { top: "#1b2740", mid: "#0d1420", bot: "#080c14", ink: "#eaf1f8", muted: "#93a1b0",
    panel: "rgba(30,38,48,.78)", stroke: "rgba(255,255,255,.09)", navInk: "#eaf1f8" },
};

function fhHm(s, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  if (!m) return fallback;
  return Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]);
}

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
// Sfondo animato che racconta il tempo che fa. Un solo canvas invece di
// centinaia di nodi DOM: su un tablet a muro deve restare acceso tutto il
// giorno senza scaldare. Si ferma con la pagina nascosta e rispetta "riduci
// animazioni" di sistema (in quel caso disegna un fotogramma fermo).
//
// Ogni condizione ha un suo moto, perché è il movimento — non il colore — a
// far capire al volo che fuori piove: la pioggia cade in obliquo, la neve
// ondeggia scendendo, le stelle stanno ferme e pulsano, le nuvole scorrono
// piano e larghe, la nebbia respira, il sole ha pulviscolo caldo che sale.
const FH_SKY_MODES = {
  "clear-night": "stars", "sunny": "motes", "partlycloudy": "clouds",
  "cloudy": "clouds", "rainy": "rain", "pouring": "rain", "hail": "rain",
  "snowy": "snow", "snowy-rainy": "snow", "fog": "fog",
  "windy": "clouds", "windy-variant": "clouds",
  "lightning": "storm", "lightning-rainy": "storm", "exceptional": "motes",
};

class FhSky {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.parts = [];
    this.mode = "stars";
    this.dark = true;
    this.running = false;
    this.flash = 0;
    this._onVis = () => (document.hidden ? this.stop() : this.start());
  }
  setScene(mode, dark) {
    const changed = mode !== this.mode || dark !== this.dark;
    this.mode = mode || "stars";
    this.dark = !!dark;
    if (changed) this.seed();
  }
  resize() {
    const r = this.c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.c.width = Math.floor(r.width * dpr);
    this.c.height = Math.floor(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width; this.h = r.height;
    this.seed();
  }
  _count(per) { return Math.max(8, Math.round((this.w * this.h) / per)); }
  seed() {
    if (!this.w) return;
    const R = Math.random;
    const p = [];
    if (this.mode === "rain" || this.mode === "storm") {
      for (let i = 0, n = this._count(9000); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h, len: 8 + R() * 14, vy: 5 + R() * 5, a: .18 + R() * .3 });
    } else if (this.mode === "snow") {
      for (let i = 0, n = this._count(14000); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h, r: 1 + R() * 2.2, vy: .35 + R() * .5, ph: R() * 6.28, amp: 6 + R() * 14, a: .35 + R() * .45 });
    } else if (this.mode === "clouds" || this.mode === "fog") {
      for (let i = 0, n = this._count(90000); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h * .8, r: 60 + R() * 130, vx: (.06 + R() * .12) * (this.mode === "fog" ? .4 : 1), a: .05 + R() * .07 });
    } else if (this.mode === "motes") {
      for (let i = 0, n = this._count(26000); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h, r: .8 + R() * 1.6, vy: -(.08 + R() * .14), vx: (R() - .5) * .08, a: .15 + R() * .35 });
    } else {
      for (let i = 0, n = this._count(22000); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h, r: .6 + R() * 1.4, ph: R() * 6.28, sp: .6 + R() * 1.4, a: .25 + R() * .5 });
    }
    this.parts = p;
  }
  start() {
    if (this.running) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.resize(); this.draw(0); return;
    }
    this.running = true;
    document.addEventListener("visibilitychange", this._onVis);
    const loop = t => {
      if (!this.running) return;
      this.step(t / 1000);
      this.draw(t / 1000);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    document.removeEventListener("visibilitychange", this._onVis);
  }
  step(t) {
    if (!this.w) return;
    const m = this.mode;
    for (const d of this.parts) {
      if (m === "rain" || m === "storm") {
        d.y += d.vy; d.x += d.vy * .28;
        if (d.y > this.h) { d.y = -d.len; d.x = Math.random() * this.w; }
        if (d.x > this.w) d.x -= this.w;
      } else if (m === "snow") {
        d.y += d.vy; d.ph += .012;
        if (d.y > this.h) { d.y = -4; d.x = Math.random() * this.w; }
      } else if (m === "clouds" || m === "fog") {
        d.x += d.vx;
        if (d.x - d.r > this.w) d.x = -d.r;
      } else if (m === "motes") {
        d.y += d.vy; d.x += d.vx;
        if (d.y < -4) { d.y = this.h + 4; d.x = Math.random() * this.w; }
        if (d.x < 0) d.x += this.w; else if (d.x > this.w) d.x -= this.w;
      }
    }
    // Il lampo è raro e breve: se comparisse spesso diventerebbe fastidioso su
    // un pannello sempre acceso.
    if (m === "storm") {
      if (this.flash > 0) this.flash -= .05;
      else if (Math.random() < .0016) this.flash = 1;
    } else this.flash = 0;
  }
  draw(t) {
    const g = this.ctx;
    if (!g || !this.w) return;
    g.clearRect(0, 0, this.w, this.h);
    const light = !this.dark;
    const m = this.mode;
    if (m === "rain" || m === "storm") {
      g.lineWidth = 1.1;
      g.strokeStyle = light ? "rgba(40,70,110,.30)" : "rgba(190,220,255,.40)";
      g.beginPath();
      for (const d of this.parts) { g.moveTo(d.x, d.y); g.lineTo(d.x - d.len * .28, d.y + d.len); }
      g.stroke();
      if (this.flash > 0) {
        g.fillStyle = `rgba(255,255,255,${(light ? .35 : .22) * this.flash})`;
        g.fillRect(0, 0, this.w, this.h);
      }
    } else if (m === "snow") {
      g.fillStyle = light ? "rgba(120,150,190,.55)" : "rgba(255,255,255,.75)";
      for (const d of this.parts) {
        g.globalAlpha = d.a;
        g.beginPath();
        g.arc(d.x + Math.sin(d.ph) * d.amp * .12, d.y, d.r, 0, 6.283);
        g.fill();
      }
      g.globalAlpha = 1;
    } else if (m === "clouds" || m === "fog") {
      for (const d of this.parts) {
        const grd = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        const c = light ? "255,255,255" : "150,175,210";
        grd.addColorStop(0, `rgba(${c},${d.a * (light ? 1.6 : 1)})`);
        grd.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = grd;
        g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.283); g.fill();
      }
    } else if (m === "motes") {
      const c = light ? "255,190,90" : "255,205,120";
      for (const d of this.parts) {
        g.fillStyle = `rgba(${c},${d.a})`;
        g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.283); g.fill();
      }
    } else {
      const c = light ? "90,120,165" : "255,255,255";
      for (const d of this.parts) {
        const tw = .55 + .45 * Math.sin(t * d.sp + d.ph);
        g.fillStyle = `rgba(${c},${d.a * tw})`;
        g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.283); g.fill();
      }
    }
  }
}

// ---------------------------------------------------------------------------
class FaberHome extends HTMLElement {
  setConfig(config) {
    const src = config || {};
    const ap = src.appearance || {};
    this._cfg = Object.assign({}, FH_DEFAULTS, src, {
      appearance: {
        pageBackground: Object.assign({}, FH_DEFAULTS.appearance.pageBackground, ap.pageBackground || {}),
        weatherAnimation: ap.weatherAnimation !== false,
        autoTheme: Object.assign({}, FH_DEFAULTS.appearance.autoTheme, ap.autoTheme || {}),
      },
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

  connectedCallback() { if (this._skyfx) this._skyfx.start(); this._startClock(); this._watchTheme(); }
  disconnectedCallback() {
    if (this._skyfx) this._skyfx.stop();
    if (this._themeTimer) { clearInterval(this._themeTimer); this._themeTimer = null; }
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  }

  // Tema: se il tema automatico è acceso decide l'orario (chiaro da dayStart,
  // scuro da nightStart, con la notte che può scavalcare la mezzanotte);
  // altrimenti si segue quello di Home Assistant.
  _isDark() {
    const at = this._cfg.appearance.autoTheme;
    if (!at || at.enabled === false) return !!(this._hass && this._hass.themes && this._hass.themes.darkMode);
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const day = fhHm(at.dayStart, 7 * 60);
    const night = fhHm(at.nightStart, 21 * 60);
    return day <= night ? (cur < day || cur >= night) : (cur >= night && cur < day);
  }
  _sky() { return FH_SKY[this._isDark() ? "dark" : "light"]; }

  _weatherMode() {
    if (!this._cfg.appearance.weatherAnimation) return null;
    const w = this._cfg.header.weather;
    const st = w && this._hass ? this._hass.states[w] : null;
    if (!st) return this._isDark() ? "stars" : "motes";
    return FH_SKY_MODES[st.state] || (this._isDark() ? "stars" : "motes");
  }

  // Sfondo dietro le card: nessuno, tinta unita o sfumatura. Il guscio
  // (intestazione e barra) non cambia con questa scelta, come dev'essere:
  // serve a dare un colore alla stanza, non a rifare i mobili.
  _pageBackground() {
    const pb = this._cfg.appearance.pageBackground || {};
    const sky = this._sky();
    if (pb.mode === "none") return "transparent";
    if (pb.mode === "solid") return pb.color || sky.mid;
    const from = pb.from || sky.top, to = pb.to || sky.bot;
    return `radial-gradient(120% 90% at 15% -10%,${from},${pb.color || sky.mid} 55%,${to})`;
  }

  // Il tema può cambiare da solo mentre il pannello è acceso (alle 07:00 o
  // alle 21:00): si ricontrolla a ogni minuto e si ridisegna solo se serve.
  _watchTheme() {
    if (this._themeTimer) clearInterval(this._themeTimer);
    this._lastDark = this._isDark();
    this._themeTimer = setInterval(() => {
      const d = this._isDark();
      if (d !== this._lastDark) { this._lastDark = d; this._applyScene(true); }
    }, 60000);
  }

  _applyScene(rebuild) {
    const sky = this._sky();
    const app = this.querySelector(".fh-app");
    if (app) {
      app.style.setProperty("--fh-ink", sky.ink);
      app.style.setProperty("--fh-muted", sky.muted);
      app.style.setProperty("--fh-panel", sky.panel);
      app.style.setProperty("--fh-stroke", sky.stroke);
      app.style.background = this._pageBackground();
    }
    if (this._skyfx) {
      this._skyfx.setScene(this._weatherMode(), this._isDark());
      if (rebuild) this._skyfx.draw(performance.now() / 1000);
    }
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
        <canvas class="fh-bg"></canvas>
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
    if (canvas) {
      this._skyfx = new FhSky(canvas);
      this._skyfx.setScene(this._weatherMode(), this._isDark());
      // Il canvas parte a dimensione zero finché il pannello non è disposto:
      // si misura quando cambia davvero, non una volta sola alla creazione.
      this._ro = new ResizeObserver(() => { this._skyfx.resize(); this._skyfx.draw(0); });
      this._ro.observe(canvas);
      this._skyfx.start();
    }
    this._applyScene(false);
    this._watchTheme();
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
    if (this._skyfx) this._skyfx.setScene(this._weatherMode(), this._isDark());
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
    color:var(--fh-ink,#eaf1f8);transition:background .6s ease,color .6s ease}
  .fh-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .fh-head{position:relative;z-index:1;display:flex;align-items:flex-start;gap:14px;
    padding:18px 20px 8px;flex-wrap:wrap}
  .fh-clockbox{flex:0 0 auto}
  .fh-clock{font-size:clamp(34px,9vw,52px);font-weight:800;line-height:1;letter-spacing:-.02em;
    font-variant-numeric:tabular-nums}
  .fh-date{margin-top:4px;font-size:12.5px;font-weight:600;color:var(--fh-muted,#93a1b0);text-transform:capitalize}
  .fh-chips{flex:1;display:flex;flex-wrap:wrap;gap:7px;align-items:center;min-width:0}
  .fh-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;cursor:pointer;
    font:inherit;font-size:12.5px;font-weight:700;color:var(--fh-muted,#93a1b0);
    border:1px solid var(--fh-stroke,rgba(255,255,255,.09));background:var(--fh-panel,rgba(255,255,255,.05));
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:.2s}
  .fh-chip ha-icon{--mdc-icon-size:16px}
  .fh-chip small{opacity:.75;font-weight:600}
  .fh-chip.on{color:#ffe9c2;border-color:rgba(255,176,32,.5);
    background:linear-gradient(135deg,rgba(255,176,32,.26),rgba(255,176,32,.12))}
  .fh-headicons{display:flex;gap:6px;flex:0 0 auto}
  .fh-ic{width:36px;height:36px;border-radius:50%;border:1px solid var(--fh-stroke,rgba(255,255,255,.09));
    background:var(--fh-panel,rgba(255,255,255,.05));color:var(--fh-muted,#93a1b0);cursor:pointer;display:flex;align-items:center;justify-content:center}
  .fh-ic ha-icon{--mdc-icon-size:19px}
  .fh-main{position:relative;z-index:1;flex:1;padding:8px 16px 110px;display:flex;flex-direction:column;gap:14px}
  .fh-row{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}
  .fh-col{display:flex;flex-direction:column;gap:14px;min-width:240px}
  .fh-cardwrap{display:block}
  .fh-cardfail{padding:14px;border-radius:16px;font-size:12.5px;color:var(--fh-muted,#93a1b0);
    border:1px dashed var(--fh-stroke,rgba(255,255,255,.16));background:var(--fh-panel,rgba(255,255,255,.04))}
  .fh-empty{margin:auto;text-align:center;color:var(--fh-muted,#93a1b0);display:flex;flex-direction:column;align-items:center;gap:8px;padding:40px 20px}
  .fh-empty ha-icon{--mdc-icon-size:46px;opacity:.5}
  .fh-empty small{font-size:11.5px;max-width:320px;line-height:1.5}
  .fh-nav{position:fixed;left:0;right:0;bottom:0;z-index:6;
    padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none}
  .fh-navbar{display:flex;align-items:flex-end;justify-content:space-around;gap:4px;
    max-width:560px;margin:0 auto;padding:8px 10px;pointer-events:auto;
    background:var(--fh-panel,rgba(30,38,48,.78));border:1px solid var(--fh-stroke,rgba(255,255,255,.09));border-radius:26px;
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 12px 30px rgba(0,0,0,.45)}
  .fh-navitem{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;
    padding:7px 4px;border:none;background:none;cursor:pointer;font:inherit;color:var(--fh-muted,#93a1b0);transition:color .2s}
  .fh-navitem ha-icon{--mdc-icon-size:23px}
  .fh-navlabel{font-size:10.5px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-navitem:hover{color:var(--fh-ink,#eaf1f8)}
  /* Pagina attiva: il cerchio rialzato si sposta qui — è il modo in cui si
     capisce dove si è senza leggere le etichette. */
  .fh-navitem.active{color:var(--fh-ink,#eaf1f8)}
  .fh-navcircle{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    margin-top:-30px;background:linear-gradient(150deg,#ffc55c,#ffb020 55%,#e6890a);
    box-shadow:0 8px 22px rgba(255,176,32,.42),0 2px 6px rgba(0,0,0,.3);
    border:2px solid var(--fh-panel,rgba(13,20,32,.9))}
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
