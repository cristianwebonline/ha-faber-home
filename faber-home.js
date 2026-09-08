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
const FH_VERSION = "0.7.0";
console.info(`%c FABER HOME %c v${FH_VERSION} `,
  "color:#1c1400;background:#ffb020;font-weight:700;border-radius:4px 0 0 4px",
  "color:#ffe9c2;background:#1a1b21;border-radius:0 4px 4px 0");

const FH_DEFAULTS = {
  type: "custom:faber-home",
  // Aspetto: tre cose distinte, come vanno tenute distinte anche nella testa
  // di chi configura. Lo sfondo pagina è la tinta dietro le card; l'animazione
  // racconta che tempo fa; il tema automatico decide chiaro/scuro per orario.
  appearance: {
    pageBackground: { mode: "gradient", color: "", from: "", mid: "", to: "" },
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
// Il chiaro NON è carta bianca: è cielo, e con abbastanza profondità. Le card di famiglia sono scure per
// scelta, e su un bianco quasi puro sembravano macchie appoggiate; su un
// azzurro di giornata diventano oggetti contro il cielo, che è l'effetto
// giusto. Il grigio del testo è anche più scuro di prima: sopra il chiaro la
// data spariva.
const FH_SKY = {
  light: { top: "#7fa8d4", mid: "#9dc0e2", bot: "#bcd7ef", ink: "#0d1420", muted: "#31435c",
    panel: "rgba(255,255,255,.80)", stroke: "rgba(15,23,42,.14)", navInk: "#0d1420" },
  dark: { top: "#1b2740", mid: "#0d1420", bot: "#080c14", ink: "#eaf1f8", muted: "#93a1b0",
    panel: "rgba(30,38,48,.78)", stroke: "rgba(255,255,255,.09)", navInk: "#eaf1f8" },
};


// Lo sfondo del pannello si tinge del tempo che fa, come la card meteo: col
// sole un alone caldo in alto a destra, col temporale un viola cupo, con la
// nebbia una foschia diffusa. E la stessa idea della card portata su tutta la
// pagina, cosi il pannello "sa" che tempo fa anche prima di leggere i numeri.
const FH_GLOW = {
  sunny:            { c: "255,186,60",  x: "88%", y: "-6%",  r: "62%", a: .34, ad: .20 },
  "clear-night":    { c: "120,132,255", x: "84%", y: "-8%",  r: "58%", a: .16, ad: .20 },
  partlycloudy:     { c: "255,206,120", x: "86%", y: "-6%",  r: "56%", a: .20, ad: .12 },
  cloudy:           { c: "150,170,195", x: "70%", y: "-10%", r: "70%", a: .22, ad: .16 },
  rainy:            { c: "90,140,190",  x: "60%", y: "-12%", r: "78%", a: .26, ad: .22 },
  pouring:          { c: "60,110,165",  x: "60%", y: "-12%", r: "80%", a: .32, ad: .26 },
  snowy:            { c: "200,225,245", x: "70%", y: "-8%",  r: "72%", a: .30, ad: .18 },
  "snowy-rainy":    { c: "170,205,235", x: "68%", y: "-10%", r: "74%", a: .28, ad: .18 },
  fog:              { c: "205,200,190", x: "50%", y: "10%",  r: "95%", a: .30, ad: .18 },
  hail:             { c: "140,180,215", x: "64%", y: "-10%", r: "76%", a: .28, ad: .20 },
  windy:            { c: "150,195,180", x: "72%", y: "-8%",  r: "70%", a: .22, ad: .16 },
  "windy-variant":  { c: "150,195,180", x: "72%", y: "-8%",  r: "70%", a: .22, ad: .16 },
  lightning:        { c: "150,110,225", x: "62%", y: "-10%", r: "76%", a: .28, ad: .26 },
  "lightning-rainy":{ c: "130,95,215",  x: "62%", y: "-10%", r: "78%", a: .30, ad: .28 },
  exceptional:      { c: "245,140,110", x: "80%", y: "-8%",  r: "66%", a: .30, ad: .22 },
};
function fhGlowLayer(state, dark) {
  const g = FH_GLOW[state];
  if (!g) return "";
  const a = dark ? g.ad : g.a;
  return `radial-gradient(${g.r} ${g.r} at ${g.x} ${g.y},rgba(${g.c},${a}),rgba(${g.c},0) 70%)`;
}

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
    // Home Assistant consegna la configurazione CONGELATA (Object.freeze in
    // profondita): senza una copia vera, aggiungere una card o una riga
    // fallisce con "object is not extensible". Si clona tutto una volta sola,
    // qui, e da li in poi si lavora su roba nostra e modificabile.
    let src;
    try { src = JSON.parse(JSON.stringify(config || {})); } catch (e) { src = Object.assign({}, config || {}); }
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
    // Le tre fermate arrivano dal tema se non sono state scelte a mano: usare
    // qui `color` (che serve alla tinta unita) faceva passare il cielo chiaro
    // per una fascia scura.
    const from = pb.from || sky.top, mid = pb.mid || sky.mid, to = pb.to || sky.bot;
    const base = `radial-gradient(140% 110% at 20% -20%,${from},${mid} 45%,${to})`;
    // L'alone del tempo sta SOPRA il cielo: cosi la pagina cambia con il
    // meteo senza perdere la differenza fra giorno e notte.
    const w = this._cfg.header.weather;
    const st = w && this._hass ? this._hass.states[w] : null;
    const glow = st ? fhGlowLayer(st.state, this._isDark()) : "";
    return glow ? `${glow},${base}` : base;
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
          <div class="fh-headtop">
            <div class="fh-clockbox">
              <div class="fh-clock" data-clock>${this._timeText()}</div>
              <div class="fh-date" data-date>${this._dateText()}</div>
            </div>
            <div class="fh-headicons">
            <button type="button" class="fh-ic" data-act="cfg" title="Impostazioni"><ha-icon icon="mdi:cog-outline"></ha-icon></button>
            <button type="button" class="fh-ic" data-act="edit" title="Modifica"><ha-icon icon="mdi:pencil"></ha-icon></button>
            <button type="button" class="fh-ic" data-act="reload" title="Ricarica"><ha-icon icon="mdi:refresh"></ha-icon></button>
            <button type="button" class="fh-ic" data-act="ha" title="Home Assistant"><ha-icon icon="mdi:home-assistant"></ha-icon></button>
            </div>
          </div>
          <div class="fh-chips" data-chips>${this._chipsHTML()}</div>
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
      if (b.dataset.act === "cfg") this._openSettings();
      else if (b.dataset.act === "edit") this._toggleEdit();
      else if (b.dataset.act === "reload") location.reload();
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
    main.classList.toggle("editing", !!this._edit);

    if (this._edit) main.appendChild(this._editBarEl());

    if (!page || !page.rows || !page.rows.length) {
      const empty = document.createElement("div");
      empty.className = "fh-empty";
      empty.innerHTML = `<ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
        <div>Questa pagina e vuota.</div>
        <small>${this._edit ? "Aggiungi una riga qui sotto per cominciare." : "Tocca la matita in alto per aggiungere le card."}</small>`;
      main.appendChild(empty);
      if (this._edit) main.appendChild(this._addRowEl());
      return;
    }

    const helpers = await this._helpers();
    page.rows.forEach((row, ri) => {
      const rowEl = document.createElement("div");
      rowEl.className = "fh-rowwrap";
      if (this._edit) rowEl.appendChild(this._rowToolsEl(ri));

      const inner = document.createElement("div");
      inner.className = "fh-row";
      (row.cols || []).forEach((col, ci) => {
        const colEl = document.createElement("div");
        colEl.className = "fh-col";
        colEl.style.flex = `${col.span || 1} 1 0`;
        if (this._edit) colEl.appendChild(this._colToolsEl(ri, ci));
        (col.cards || []).forEach((cardCfg, di) => {
          const el = this._createCard(cardCfg, helpers);
          if (!el) return;
          if (this._edit) {
            const box = document.createElement("div");
            box.className = "fh-cardedit";
            box.appendChild(this._cardToolsEl(ri, ci, di));
            box.appendChild(el);
            // In modifica il tocco non deve accendere una presa ne aprire un
            // popup: uno strato trasparente sopra la card intercetta tutto.
            const shield = document.createElement("div");
            shield.className = "fh-shield";
            box.appendChild(shield);
            colEl.appendChild(box);
          } else {
            colEl.appendChild(el);
          }
        });
        if (this._edit) colEl.appendChild(this._addCardEl(ri, ci));
        inner.appendChild(colEl);
      });
      rowEl.appendChild(inner);
      main.appendChild(rowEl);
    });
    if (this._edit) main.appendChild(this._addRowEl());
  }

  // --------------------------------------------------------------- modifica
  _toggleEdit() {
    this._edit = !this._edit;
    // Si tiene una copia prima di toccare qualcosa: "Annulla" deve poter
    // riportare tutto com'era, senza ricaricare la pagina.
    if (this._edit) this._snapshot = JSON.stringify(this._cfg);
    this._renderNav();
    this._renderPage();
  }

  _btn(icon, title, act) {
    return `<button type="button" class="fh-tool" data-act="${act}" title="${fhEsc(title)}"><ha-icon icon="${icon}"></ha-icon></button>`;
  }

  _editBarEl() {
    const el = document.createElement("div");
    el.className = "fh-editbar";
    el.innerHTML = `<span class="fh-editlabel"><ha-icon icon="mdi:pencil"></ha-icon> Stai modificando</span>
      <button type="button" class="fh-btn" data-act="pagine">Pagine</button>
      <button type="button" class="fh-btn" data-act="annulla">Annulla</button>
      <button type="button" class="fh-btn primary" data-act="salva">Salva</button>`;
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "salva") this._save();
      else if (a === "annulla") {
        if (this._snapshot) this._cfg = JSON.parse(this._snapshot);
        this._page = Math.min(this._page, this._cfg.pages.length - 1);
        this._edit = false;
        this._renderNav(); this._renderPage();
      } else if (a === "pagine") this._openPageSheet();
    }));
    return el;
  }

  _rowToolsEl(ri) {
    const el = document.createElement("div");
    el.className = "fh-tools";
    el.innerHTML = `<span class="fh-toolslabel">Riga ${ri + 1}</span>
      ${this._btn("mdi:table-column-plus-after", "Aggiungi colonna", "addcol")}
      ${this._btn("mdi:arrow-up", "Sposta su", "up")}
      ${this._btn("mdi:arrow-down", "Sposta giu", "down")}
      ${this._btn("mdi:delete-outline", "Elimina riga", "del")}`;
    const rows = this._cfg.pages[this._page].rows;
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "addcol") rows[ri].cols.push({ span: 1, cards: [] });
      else if (a === "up" && ri > 0) { const [r] = rows.splice(ri, 1); rows.splice(ri - 1, 0, r); }
      else if (a === "down" && ri < rows.length - 1) { const [r] = rows.splice(ri, 1); rows.splice(ri + 1, 0, r); }
      else if (a === "del") rows.splice(ri, 1);
      this._renderPage();
    }));
    return el;
  }

  _colToolsEl(ri, ci) {
    const col = this._cfg.pages[this._page].rows[ri].cols[ci];
    const el = document.createElement("div");
    el.className = "fh-tools sub";
    el.innerHTML = `<span class="fh-toolslabel">Larghezza</span>
      ${[1, 2, 3].map(n => `<button type="button" class="fh-span${(col.span || 1) === n ? " sel" : ""}" data-span="${n}">${n}</button>`).join("")}
      ${this._btn("mdi:delete-outline", "Elimina colonna", "delcol")}`;
    el.querySelectorAll("[data-span]").forEach(b => b.addEventListener("click", () => {
      col.span = parseInt(b.dataset.span, 10); this._renderPage();
    }));
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      this._cfg.pages[this._page].rows[ri].cols.splice(ci, 1); this._renderPage();
    }));
    return el;
  }

  _cardToolsEl(ri, ci, di) {
    const el = document.createElement("div");
    el.className = "fh-tools card";
    // Le frecce spostano la card fra le colonne: su schermo tattile sono molto
    // piu affidabili del trascinamento, che sul telefono litiga con lo
    // scorrimento della pagina (lezione della Smart Card).
    el.innerHTML = `${this._btn("mdi:cog-outline", "Configura", "cfg")}
      ${this._btn("mdi:content-copy", "Duplica", "dup")}
      ${this._btn("mdi:arrow-left", "Colonna precedente", "left")}
      ${this._btn("mdi:arrow-right", "Colonna successiva", "right")}
      ${this._btn("mdi:delete-outline", "Elimina", "del")}`;
    const cols = this._cfg.pages[this._page].rows[ri].cols;
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      const cards = cols[ci].cards;
      if (a === "cfg") { this._openCardEditor(ri, ci, di); return; }
      if (a === "dup") cards.splice(di + 1, 0, JSON.parse(JSON.stringify(cards[di])));
      else if (a === "del") cards.splice(di, 1);
      else if (a === "left" && ci > 0) { const [c] = cards.splice(di, 1); cols[ci - 1].cards.push(c); }
      else if (a === "right" && ci < cols.length - 1) { const [c] = cards.splice(di, 1); cols[ci + 1].cards.push(c); }
      this._renderPage();
    }));
    return el;
  }

  _addCardEl(ri, ci) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "fh-addcard";
    el.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon> Card`;
    el.addEventListener("click", () => this._openPicker(ri, ci));
    return el;
  }

  _addRowEl() {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "fh-addrow";
    el.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon> Aggiungi riga`;
    el.addEventListener("click", () => {
      this._cfg.pages[this._page].rows.push({ cols: [{ span: 1, cards: [] }] });
      this._renderPage();
    });
    return el;
  }


  // ----------------------------------------------------------- fogli a comparsa
  // Un solo foglio alla volta, chiuso toccando fuori o la X: e il modo in cui
  // si configura stando col telefono in una mano.
  _sheet(title, bodyEl) {
    const prev = this.querySelector(".fh-scrim");
    if (prev) prev.remove();
    const scrim = document.createElement("div");
    scrim.className = "fh-scrim";
    const sheet = document.createElement("div");
    sheet.className = "fh-sheet";
    sheet.innerHTML = `<div class="fh-sheethead">
        <div class="fh-sheettitle">${fhEsc(title)}</div>
        <button type="button" class="fh-ic" data-close><ha-icon icon="mdi:close"></ha-icon></button>
      </div>`;
    const body = document.createElement("div");
    body.className = "fh-sheetbody";
    body.appendChild(bodyEl);
    sheet.appendChild(body);
    scrim.appendChild(sheet);
    scrim.addEventListener("click", e => { if (e.target === scrim) scrim.remove(); });
    sheet.querySelector("[data-close]").addEventListener("click", () => scrim.remove());
    this.querySelector(".fh-app").appendChild(scrim);
    return scrim;
  }

  // Catalogo: le card di famiglia con uno stub gia pronto, piu qualche tipo
  // nativo di Home Assistant per le cose di tutti i giorni.
  _catalog() {
    return [
      { g: "Faber", n: "Mini Card - dispositivo", i: "mdi:power-socket-eu", c: { type: "custom:mini-card", name: "Dispositivo", icon_type: "generic", mode: "device", switch: "", power: "" } },
      { g: "Faber", n: "Mini Card - stanza", i: "mdi:sofa", c: { type: "custom:mini-card", name: "Stanza", icon_type: "livingroom", mode: "room", path: "" } },
      { g: "Faber", n: "Smart Card (tela)", i: "mdi:palette-swatch-outline", c: { type: "custom:smart-card", name: "Smart Card", canvas: { w: 100, h: 50 }, elements: [] } },
      { g: "Faber", n: "Consumi di casa", i: "mdi:lightning-bolt", c: { type: "custom:energia-consumi-card", title: "Consumi di casa", days_back: 8, prezzo_kwh: 0.3 } },
      { g: "Faber", n: "Centro bucato", i: "mdi:washing-machine", c: { type: "custom:centro-bucato-card", kind: "lavatrice", name: "Lavatrice", power: "" } },
      { g: "Faber", n: "Centro elettrodomestici", i: "mdi:dishwasher", c: { type: "custom:centro-elettrodomestici-card", kind: "lavastoviglie", name: "Lavastoviglie", power: "" } },
      { g: "Faber", n: "Centro sicurezza", i: "mdi:shield-lock", c: { type: "custom:centro-sicurezza-card", name: "Porta blindata", lock: "" } },
      { g: "Home Assistant", n: "Tessera (tile)", i: "mdi:card-outline", c: { type: "tile", entity: "" } },
      { g: "Faber", n: "Meteo", i: "mdi:weather-partly-cloudy", c: { type: "custom:faber-weather", entity: "", days: 4 } },
      { g: "Home Assistant", n: "Meteo (nativa)", i: "mdi:weather-cloudy", c: { type: "weather-forecast", entity: "", forecast_type: "daily" } },
      { g: "Home Assistant", n: "Grafico storico", i: "mdi:chart-line", c: { type: "history-graph", entities: [] } },
      { g: "Home Assistant", n: "Testo (markdown)", i: "mdi:format-text", c: { type: "markdown", content: "Scrivi qui" } },
      { g: "Home Assistant", n: "Pulsante", i: "mdi:gesture-tap-button", c: { type: "button", entity: "" } },
      { g: "Home Assistant", n: "Telecamera", i: "mdi:cctv", c: { type: "picture-entity", entity: "", camera_view: "auto" } },
    ];
  }

  _openPicker(ri, ci) {
    const box = document.createElement("div");
    const cat = this._catalog();
    const groups = [...new Set(cat.map(x => x.g))];
    box.innerHTML = groups.map(g => `<div class="fh-catgroup">${fhEsc(g)}</div>
      <div class="fh-catlist">${cat.map((x, i) => x.g !== g ? "" :
        `<button type="button" class="fh-catitem" data-i="${i}">
           <ha-icon icon="${x.i}"></ha-icon><span>${fhEsc(x.n)}</span>
         </button>`).join("")}</div>`).join("") +
      `<div class="fh-catgroup">Oppure incolla il codice di una card</div>
       <textarea class="fh-json" data-paste placeholder='{"type": "tile", "entity": "light.salotto"}'></textarea>
       <div class="fh-note" data-msg>Accetta JSON. Utile per copiare una card da un'altra dashboard.</div>
       <button type="button" class="fh-btn primary" data-addjson>Aggiungi dal codice</button>`;
    const scrim = this._sheet("Aggiungi una card", box);
    box.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
      const item = cat[parseInt(b.dataset.i, 10)];
      const cards = this._cfg.pages[this._page].rows[ri].cols[ci].cards;
      const fresh = JSON.parse(JSON.stringify(item.c));
      // Una card meteo senza entita nasce gia rotta, e in casa il meteo e
      // quasi sempre uno solo: si precompila, poi si cambia dall'editor.
      if ((fresh.type === "weather-forecast" || fresh.type === "custom:faber-weather") && !fresh.entity) {
        const w = Object.keys(this._hass.states).filter(e => e.startsWith("weather."));
        if (w.length) fresh.entity = this._cfg.header.weather && w.includes(this._cfg.header.weather) ? this._cfg.header.weather : w[0];
      }
      cards.push(fresh);
      scrim.remove();
      this._renderPage();
      // Si apre subito la configurazione: una card appena messa e quasi
      // sempre da collegare a un'entita, altrimenti resta vuota e sembra rotta.
      this._openCardEditor(ri, ci, cards.length - 1);
    }));
    box.querySelector("[data-addjson]").addEventListener("click", () => {
      const ta = box.querySelector("[data-paste]");
      const msg = box.querySelector("[data-msg]");
      let parsed;
      try { parsed = JSON.parse(ta.value); } catch (e) { msg.textContent = "JSON non valido: " + e.message; return; }
      if (!parsed || !parsed.type) { msg.textContent = "Manca il campo 'type': non sembra una card."; return; }
      this._cfg.pages[this._page].rows[ri].cols[ci].cards.push(parsed);
      scrim.remove();
      this._renderPage();
    });
  }

  // Si riusa l'editor VERO della card (getConfigElement), mai riscritto qui:
  // stesso principio di Faber Layout.
  async _openCardEditor(ri, ci, di) {
    const cards = this._cfg.pages[this._page].rows[ri].cols[ci].cards;
    const cardCfg = cards[di];
    if (!cardCfg) return;
    const box = document.createElement("div");
    let editor = null;
    try {
      const helpers = await this._helpers();
      let klass = null;
      if (cardCfg.type.startsWith("custom:")) {
        klass = customElements.get(cardCfg.type.slice(7));
      } else if (helpers && helpers.createCardElement) {
        // Istanziare la card serve a farne caricare il modulo, ma se la
        // configurazione e ancora incompleta (entita vuota, appena aggiunta)
        // Home Assistant restituisce una card d'errore: da quella non si
        // ricava nessun editor. Quindi si prende la classe dal registro dei
        // custom element per nome, che e la strada affidabile.
        const tmp = helpers.createCardElement(cardCfg);
        if (tmp && tmp.tagName && tmp.tagName.toLowerCase() !== "hui-error-card") klass = tmp.constructor;
        if (!klass || !klass.getConfigElement) {
          const tag = "hui-" + cardCfg.type.replace(/_/g, "-") + "-card";
          klass = customElements.get(tag) || klass;
        }
      }
      if (klass && klass.getConfigElement) editor = await klass.getConfigElement();
    } catch (e) { editor = null; }

    if (editor) {
      editor.hass = this._hass;
      try { editor.setConfig(cardCfg); } catch (e) { /* editor schizzinoso: resta il codice sotto */ }
      editor.addEventListener("config-changed", ev => {
        if (ev.detail && ev.detail.config) {
          cards[di] = ev.detail.config;
          this._renderPage();
        }
      });
      box.appendChild(editor);
    } else {
      // Nessun editor grafico disponibile: si modifica il codice, che e
      // meglio di un vicolo cieco.
      const ta = document.createElement("textarea");
      ta.className = "fh-json";
      ta.value = JSON.stringify(cardCfg, null, 2);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fh-btn primary";
      btn.textContent = "Applica";
      const msg = document.createElement("div");
      msg.className = "fh-note";
      msg.textContent = "Questa card non ha un editor grafico: si configura col codice.";
      btn.addEventListener("click", () => {
        try { cards[di] = JSON.parse(ta.value); } catch (e) { msg.textContent = "JSON non valido: " + e.message; return; }
        this._renderPage();
        msg.textContent = "Applicato.";
      });
      box.appendChild(msg); box.appendChild(ta); box.appendChild(btn);
    }
    this._sheet("Configura la card", box);
  }

  _openPageSheet() {
    const box = document.createElement("div");
    const draw = () => {
      box.innerHTML = this._cfg.pages.map((pg, i) => `
        <div class="fh-pagerow" data-p="${i}">
          <ha-icon icon="${fhEsc(pg.icon || "mdi:circle-outline")}"></ha-icon>
          <input class="fh-input" data-title value="${fhEsc(pg.title || "")}" placeholder="Nome pagina">
          <input class="fh-input small" data-icon value="${fhEsc(pg.icon || "")}" placeholder="mdi:home">
          <button type="button" class="fh-tool" data-act="up" title="Su"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
          <button type="button" class="fh-tool" data-act="down" title="Giu"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
          <button type="button" class="fh-tool" data-act="del" title="Elimina"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
        </div>`).join("") +
        `<button type="button" class="fh-btn primary" data-addpage>+ Aggiungi pagina</button>`;
      box.querySelectorAll(".fh-pagerow").forEach(row => {
        const i = parseInt(row.dataset.p, 10);
        row.querySelector("[data-title]").addEventListener("input", e => { this._cfg.pages[i].title = e.target.value; });
        row.querySelector("[data-icon]").addEventListener("change", e => { this._cfg.pages[i].icon = e.target.value; draw(); this._renderNav(); });
        row.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
          const a = b.dataset.act, pages = this._cfg.pages;
          if (a === "up" && i > 0) { const [x] = pages.splice(i, 1); pages.splice(i - 1, 0, x); }
          else if (a === "down" && i < pages.length - 1) { const [x] = pages.splice(i, 1); pages.splice(i + 1, 0, x); }
          else if (a === "del") {
            if (pages.length === 1) return;
            pages.splice(i, 1);
          }
          this._page = Math.min(this._page, this._cfg.pages.length - 1);
          draw(); this._renderNav(); this._renderPage();
        }));
      });
      box.querySelector("[data-addpage]").addEventListener("click", () => {
        this._cfg.pages.push({ id: fhUid("pg"), title: "Nuova", icon: "mdi:circle-outline", rows: [] });
        draw(); this._renderNav();
      });
    };
    draw();
    this._sheet("Pagine", box);
  }


  // --------------------------------------------------------- impostazioni
  // Tutto quello che prima si poteva cambiare solo scrivendo la
  // configurazione a mano: orari del tema, sfondo, animazione, e i chip.
  _entityListHTML(id, value, prefix, label) {
    const ids = Object.keys(this._hass.states).filter(e => !prefix || e.startsWith(prefix));
    const nome = e => (this._hass.states[e].attributes.friendly_name || e);
    return `<label class="fh-slab">${fhEsc(label)}</label>
      <input class="fh-input" id="${id}" list="${id}List" value="${fhEsc(value || "")}" placeholder="nessuna">
      <datalist id="${id}List">
        ${ids.slice(0, 400).map(e => `<option value="${e}">${fhEsc(nome(e))}</option>`).join("")}
      </datalist>`;
  }

  _openSettings() {
    const box = document.createElement("div");
    const draw = () => {
      const ap = this._cfg.appearance, at = ap.autoTheme, pb = ap.pageBackground, h = this._cfg.header;
      box.innerHTML = `
        <div class="fh-sgroup">Aspetto</div>
        <label class="fh-check"><input type="checkbox" id="stAuto"${at.enabled !== false ? " checked" : ""}>
          Cambia tema da solo con l'ora</label>
        <div class="fh-srow">
          <div class="fh-sfield"><label class="fh-slab">Inizio giorno</label>
            <input class="fh-input" id="stDay" type="time" value="${fhEsc(at.dayStart || "07:00")}"></div>
          <div class="fh-sfield"><label class="fh-slab">Inizio notte</label>
            <input class="fh-input" id="stNight" type="time" value="${fhEsc(at.nightStart || "21:00")}"></div>
        </div>
        <div class="fh-note">Da spento segue il tema di Home Assistant.</div>

        <label class="fh-check"><input type="checkbox" id="stAnim"${ap.weatherAnimation !== false ? " checked" : ""}>
          Sfondo animato col tempo che fa</label>
        <div class="fh-note">Stelle, pioggia, neve, nuvole: si ferma da solo quando la pagina non è in vista.</div>

        <label class="fh-slab">Sfondo della pagina</label>
        <div class="fh-seg">
          ${[["gradient", "Sfumatura"], ["solid", "Tinta unita"], ["none", "Nessuno"]].map(([v, n]) =>
            `<button type="button" class="fh-segbtn${(pb.mode || "gradient") === v ? " sel" : ""}" data-bg="${v}">${n}</button>`).join("")}
        </div>
        ${pb.mode === "solid" ? `<div class="fh-srow">
          <div class="fh-sfield"><label class="fh-slab">Colore</label>
          <input class="fh-input" id="stColor" type="color" value="${fhEsc(/^#[0-9a-f]{6}$/i.test(pb.color || "") ? pb.color : "#0d1420")}"></div></div>` : ""}

        <div class="fh-sgroup">Intestazione</div>
        ${this._entityListHTML("stWeather", h.weather, "weather.", "Meteo")}
        ${this._entityListHTML("stTemp", h.temperature, "sensor.", "Temperatura mostrata")}
        <label class="fh-check"><input type="checkbox" id="stSec"${h.seconds ? " checked" : ""}>
          Mostra anche i secondi nell'orologio</label>

        <div class="fh-sgroup">Chip</div>
        <div class="fh-note">Compaiono sotto l'orologio, su una riga che scorre. Al tocco accendono o spengono.</div>
        ${(h.chips || []).map((c, i) => `
          <div class="fh-chiprow" data-c="${i}">
            <div class="fh-srow">
              <div class="fh-sfield"><label class="fh-slab">Icona</label>
                <input class="fh-input" data-f="icon" value="${fhEsc(c.icon || "")}" placeholder="mdi:lightbulb"></div>
              <div class="fh-sfield"><label class="fh-slab">Etichetta</label>
                <input class="fh-input" data-f="label" value="${fhEsc(c.label || "")}"></div>
            </div>
            ${this._entityListHTML("stChip" + i, c.entity, "", "Entità")}
            <div class="fh-chiptools">
              <button type="button" class="fh-tool" data-act="up"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
              <button type="button" class="fh-tool" data-act="down"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
              <button type="button" class="fh-tool" data-act="del"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
            </div>
          </div>`).join("")}
        <button type="button" class="fh-btn primary" id="stAddChip">+ Aggiungi chip</button>

        <div class="fh-sgroup">&nbsp;</div>
        <button type="button" class="fh-btn primary" id="stSave">Salva impostazioni</button>
        <div class="fh-note" id="stMsg"></div>`;
      wire();
    };

    const apply = () => { this._applyScene(true); this._renderNav(); this._renderPage(); };

    const wire = () => {
      const q = id => box.querySelector(id);
      const ap = this._cfg.appearance, h = this._cfg.header;
      q("#stAuto").addEventListener("change", e => { ap.autoTheme.enabled = e.target.checked; apply(); });
      q("#stDay").addEventListener("change", e => { ap.autoTheme.dayStart = e.target.value || "07:00"; apply(); });
      q("#stNight").addEventListener("change", e => { ap.autoTheme.nightStart = e.target.value || "21:00"; apply(); });
      q("#stAnim").addEventListener("change", e => {
        ap.weatherAnimation = e.target.checked;
        if (this._skyfx) this._skyfx.setScene(this._weatherMode(), this._isDark());
      });
      box.querySelectorAll("[data-bg]").forEach(b => b.addEventListener("click", () => {
        ap.pageBackground.mode = b.dataset.bg; draw(); apply();
      }));
      const col = q("#stColor");
      if (col) col.addEventListener("input", e => { ap.pageBackground.color = e.target.value; apply(); });
      q("#stWeather").addEventListener("change", e => { h.weather = e.target.value.trim(); apply(); });
      q("#stTemp").addEventListener("change", e => { h.temperature = e.target.value.trim(); this._updateLive(); });
      q("#stSec").addEventListener("change", e => { h.seconds = e.target.checked; this._startClock(); });
      q("#stAddChip").addEventListener("click", () => {
        h.chips.push({ entity: "", icon: "mdi:lightbulb", label: "" }); draw(); this._updateLive();
      });
      box.querySelectorAll(".fh-chiprow").forEach(row => {
        const i = parseInt(row.dataset.c, 10);
        const chip = h.chips[i];
        row.querySelectorAll("[data-f]").forEach(inp => inp.addEventListener("input", () => {
          chip[inp.dataset.f] = inp.value; this._updateLive();
        }));
        const ent = row.querySelector("#stChip" + i);
        if (ent) ent.addEventListener("change", e => { chip.entity = e.target.value.trim(); this._updateLive(); });
        row.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
          const a = b.dataset.act;
          if (a === "up" && i > 0) { const [x] = h.chips.splice(i, 1); h.chips.splice(i - 1, 0, x); }
          else if (a === "down" && i < h.chips.length - 1) { const [x] = h.chips.splice(i, 1); h.chips.splice(i + 1, 0, x); }
          else if (a === "del") h.chips.splice(i, 1);
          draw(); this._updateLive();
        }));
      });
      q("#stSave").addEventListener("click", async () => {
        const msg = q("#stMsg");
        msg.textContent = "Salvo...";
        const ok = await this._save(true);
        msg.textContent = ok ? "Salvato." : "Non sono riuscito a salvare.";
      });
    };

    draw();
    this._sheet("Impostazioni", box);
  }

  // Salvataggio: si rilegge la configurazione fresca della dashboard, si
  // sostituisce SOLO la nostra card e si riscrive. Cosi non si calpesta
  // niente che sia cambiato nel frattempo.
  async _save(quiet) {
    const urlPath = location.pathname.split("/").filter(Boolean)[0];
    const bar = this.querySelector(".fh-editbar");
    const say = t => { const l = bar && bar.querySelector(".fh-editlabel"); if (l) l.textContent = t; };
    try {
      say("Salvo...");
      const dash = await this._hass.callWS({ type: "lovelace/config", url_path: urlPath });
      let done = false;
      (dash.views || []).forEach(v => {
        (v.cards || []).forEach((c, i) => {
          if (c && c.type === "custom:faber-home") { v.cards[i] = this._cfg; done = true; }
        });
      });
      if (!done) { say("Non trovo questo pannello nella dashboard."); return false; }
      await this._hass.callWS({ type: "lovelace/config/save", url_path: urlPath, config: dash });
      this._snapshot = JSON.stringify(this._cfg);
      if (!quiet) {
        this._edit = false;
        this._renderNav();
        this._renderPage();
      }
      return true;
    } catch (e) {
      say("Errore nel salvataggio: " + (e && e.message ? e.message : e));
      return false;
    }
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
    // Se cambia la condizione meteo cambia anche la tinta della pagina.
    const w = this._cfg.header.weather;
    const cond = w && this._hass && this._hass.states[w] ? this._hass.states[w].state : "";
    if (cond !== this._lastCond) {
      this._lastCond = cond;
      const app = this.querySelector(".fh-app");
      if (app) app.style.background = this._pageBackground();
    }
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
  .fh-app{container-type:inline-size;container-name:fh;
    position:relative;min-height:100vh;display:flex;flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    color:var(--fh-ink,#eaf1f8);transition:background .6s ease,color .6s ease}
  .fh-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .fh-head{position:relative;z-index:1;display:flex;flex-direction:column;gap:10px;padding:18px 20px 8px}
  .fh-headtop{display:flex;align-items:flex-start;gap:14px}
  .fh-clockbox{flex:1;min-width:0}
  .fh-clock{font-size:clamp(34px,9vw,52px);font-weight:800;line-height:1;letter-spacing:-.02em;
    font-variant-numeric:tabular-nums}
  .fh-date{margin-top:4px;font-size:12.5px;font-weight:600;color:var(--fh-muted,#93a1b0);text-transform:capitalize}
  /* Una riga sola che scorre: andando a capo i chip mangiavano meta schermo
     sul telefono, e il primo finiva sotto le icone in alto a destra. */
  .fh-chips{display:flex;flex-wrap:nowrap;gap:7px;align-items:center;min-width:0;
    overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none;
    padding-bottom:2px;-webkit-overflow-scrolling:touch}
  .fh-chips::-webkit-scrollbar{display:none}
  .fh-chips > *{flex:0 0 auto}
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

  /* ---- modalita modifica ---- */
  .fh-editbar{position:sticky;top:0;z-index:4;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
    padding:10px 12px;border-radius:16px;margin-bottom:4px;
    background:var(--fh-panel,rgba(30,38,48,.9));border:1px solid rgba(255,176,32,.45);
    backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  .fh-editlabel{flex:1;min-width:120px;display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:#ffb020}
  .fh-editlabel ha-icon{--mdc-icon-size:17px}
  .fh-btn{padding:8px 14px;border-radius:999px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:transparent;color:var(--fh-ink,#eaf1f8)}
  .fh-sheet .fh-btn{border-color:var(--divider-color);color:var(--primary-text-color)}
  .fh-sheet .fh-ic{border-color:var(--divider-color);background:var(--card-background-color);color:var(--secondary-text-color)}
  .fh-btn.primary{border-color:rgba(255,176,32,.6);background:linear-gradient(135deg,rgba(255,176,32,.3),rgba(255,176,32,.14));color:#ffe9c2}
  .fh-rowwrap{display:flex;flex-direction:column;gap:8px}
  .fh-tools{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:5px 8px;border-radius:12px;
    background:rgba(255,176,32,.10);border:1px dashed rgba(255,176,32,.35)}
  .fh-tools.sub{background:rgba(255,255,255,.05);border-style:solid;border-color:var(--fh-stroke,rgba(255,255,255,.1))}
  .fh-tools.card{border:none;background:none;padding:0 0 4px;justify-content:flex-end}
  .fh-toolslabel{flex:1;min-width:52px;font-size:10.5px;font-weight:800;letter-spacing:.05em;
    text-transform:uppercase;color:var(--fh-muted,#93a1b0)}
  .fh-tool{width:30px;height:30px;border-radius:9px;border:1px solid var(--fh-stroke,rgba(255,255,255,.12));
    background:var(--fh-panel,rgba(255,255,255,.06));color:var(--fh-muted,#93a1b0);cursor:pointer;
    display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .fh-tool ha-icon{--mdc-icon-size:16px}
  .fh-tool:hover{color:var(--fh-ink,#eaf1f8)}
  .fh-span{width:28px;height:28px;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:800;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:transparent;color:var(--fh-muted,#93a1b0)}
  .fh-span.sel{border-color:rgba(255,176,32,.6);background:rgba(255,176,32,.18);color:#ffe9c2}
  .fh-cardedit{position:relative;display:flex;flex-direction:column}
  /* Lo scudo impedisce che, mentre sistemi il layout, un tocco accenda una
     presa o apra un popup. */
  .fh-shield{position:absolute;left:0;right:0;bottom:0;top:34px;border-radius:16px;cursor:default;
    background:rgba(255,176,32,.05);outline:1px dashed rgba(255,176,32,.35);outline-offset:-2px}
  .fh-addcard,.fh-addrow{display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;
    font:inherit;font-size:12.5px;font-weight:700;padding:11px;border-radius:14px;
    border:1px dashed var(--fh-stroke,rgba(255,255,255,.2));background:transparent;color:var(--fh-muted,#93a1b0)}
  .fh-addrow{margin-top:4px}
  .fh-addcard:hover,.fh-addrow:hover{color:var(--fh-ink,#eaf1f8);border-color:rgba(255,176,32,.5)}
  .fh-addcard ha-icon,.fh-addrow ha-icon{--mdc-icon-size:17px}
  /* ---- fogli ---- */
  .fh-scrim{position:fixed;inset:0;z-index:20;background:rgba(4,6,10,.62);backdrop-filter:blur(6px);
    display:flex;align-items:flex-end;justify-content:center}
  /* Il foglio ospita gli editor veri di Home Assistant, che si colorano con
     le variabili del tema di HA: se gli imponiamo la nostra tavolozza il loro
     testo diventa illeggibile. Quindi qui si usa il tema di Home Assistant. */
  .fh-sheet{width:100%;max-width:620px;max-height:86vh;display:flex;flex-direction:column;
    background:var(--ha-card-background,var(--card-background-color,#1c1f26));
    color:var(--primary-text-color);
    border:1px solid var(--divider-color);
    border-bottom:none;border-radius:24px 24px 0 0;box-shadow:0 -16px 50px rgba(0,0,0,.55)}
  .fh-sheethead{display:flex;align-items:center;gap:10px;padding:14px 16px 8px}
  .fh-sheettitle{flex:1;font-size:16px;font-weight:800;color:var(--primary-text-color)}
  .fh-sheetbody{overflow-y:auto;padding:4px 16px 24px;display:flex;flex-direction:column;gap:10px}
  .fh-catgroup{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
    color:var(--secondary-text-color);margin-top:8px}
  .fh-catlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
  .fh-catitem{display:flex;align-items:center;gap:8px;padding:11px;border-radius:14px;cursor:pointer;font:inherit;
    border:1px solid var(--divider-color);background:var(--card-background-color);
    color:var(--primary-text-color);font-size:12.5px;font-weight:700;text-align:left}
  .fh-catitem ha-icon{--mdc-icon-size:20px;color:#ffb020;flex:0 0 auto}
  .fh-catitem:hover{border-color:rgba(255,176,32,.5)}
  .fh-json{width:100%;min-height:120px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;
    line-height:1.45;padding:10px;border-radius:12px;box-sizing:border-box;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fh-note{font-size:11.5px;color:var(--secondary-text-color)}
  .fh-pagerow{display:flex;align-items:center;gap:6px;padding:8px;border-radius:12px;
    border:1px solid var(--divider-color);background:var(--card-background-color)}
  .fh-pagerow ha-icon{--mdc-icon-size:18px;color:#ffb020;flex:0 0 auto}
  .fh-input{flex:1;min-width:0;padding:8px 10px;border-radius:9px;font:inherit;font-size:13px;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fh-input.small{flex:0 0 110px}

  .fh-sgroup{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
    color:var(--secondary-text-color);margin-top:14px}
  .fh-slab{font-size:12.5px;font-weight:700;color:var(--primary-text-color)}
  .fh-srow{display:flex;gap:10px}
  .fh-sfield{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
  .fh-check{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;
    color:var(--primary-text-color);cursor:pointer}
  .fh-check input{width:auto}
  .fh-seg{display:flex;gap:6px}
  .fh-segbtn{flex:1;padding:9px 6px;border-radius:11px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--secondary-text-color)}
  .fh-segbtn.sel{border-color:rgba(255,176,32,.6);background:rgba(255,176,32,.16);color:var(--primary-text-color)}
  .fh-chiprow{display:flex;flex-direction:column;gap:8px;padding:11px;border-radius:14px;
    border:1px solid var(--divider-color);background:var(--card-background-color)}
  .fh-chiptools{display:flex;gap:6px;justify-content:flex-end}
  @container fh (max-width: 560px){
    .fh-head{padding:14px 14px 6px}
    .fh-main{padding:6px 12px 108px}
    .fh-col{min-width:100%}
    .fh-clock{font-size:clamp(30px,13cqw,44px)}
    .fh-catlist{grid-template-columns:1fr}
  }
`;

customElements.define("faber-home", FaberHome);

// ---------------------------------------------------------------------------
// Card meteo della famiglia. Quella nativa di Home Assistant e corretta ma
// anonima: qui la stessa informazione sta in un pannello vetro con la
// temperatura grande, le quattro misure che si guardano davvero (umidita,
// pressione, vento, direzione) e la striscia dei prossimi giorni.
const FW_DIR = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
function fwDir(deg) {
  if (deg == null || isNaN(deg)) return "";
  return FW_DIR[Math.round(((+deg % 360) / 22.5)) % 16];
}

// La card prende il COLORE DEL TEMPO invece di stare in un guscio neutro:
// col sole e ambra calda, di notte indaco, con la pioggia azzurro piombo.
// E il testo e una tinta scura dello stesso colore, non bianco su grigio —
// e questo, piu delle icone, a togliere l'aria da cruscotto.
const FW_SKIN = {
  sunny:            { a: "#ffe6ad", b: "#ffc768", ink: "#6b4310", soft: "rgba(255,255,255,.55)", cap: "#8a5c1c", art: "sun" },
  "clear-night":    { a: "#39406f", b: "#232a52", ink: "#f0eeff", soft: "rgba(255,255,255,.12)", cap: "#bdb8e6", art: "moon" },
  partlycloudy:     { a: "#dfe9f5", b: "#bcd0e6", ink: "#2b3a4d", soft: "rgba(255,255,255,.6)",  cap: "#4d6076", art: "partly" },
  cloudy:           { a: "#e2e7ee", b: "#c3ccd8", ink: "#2f3946", soft: "rgba(255,255,255,.6)",  cap: "#525f6e", art: "cloud" },
  rainy:            { a: "#cbdded", b: "#9fbdd6", ink: "#1e3245", soft: "rgba(255,255,255,.5)",  art: "rain", cap: "#3c5b75" },
  pouring:          { a: "#b9d0e4", b: "#87a9c7", ink: "#16283a", soft: "rgba(255,255,255,.45)", art: "rain", cap: "#33506b" },
  snowy:            { a: "#eef5fb", b: "#d3e6f3", ink: "#23374b", soft: "rgba(255,255,255,.65)", cap: "#456079", art: "snow" },
  "snowy-rainy":    { a: "#e4eef7", b: "#c6dcec", ink: "#22364a", soft: "rgba(255,255,255,.6)",  cap: "#44607a", art: "snow" },
  fog:              { a: "#e9e7e1", b: "#cfccc4", ink: "#3a3830", soft: "rgba(255,255,255,.6)",  cap: "#5d5a50", art: "fog" },
  hail:             { a: "#dce8f2", b: "#b6cddf", ink: "#1f3345", soft: "rgba(255,255,255,.5)",  cap: "#3e5a72", art: "snow" },
  windy:            { a: "#e3ece9", b: "#c2d5cf", ink: "#263b36", soft: "rgba(255,255,255,.6)",  cap: "#476059", art: "cloud" },
  "windy-variant":  { a: "#e3ece9", b: "#c2d5cf", ink: "#263b36", soft: "rgba(255,255,255,.6)",  cap: "#476059", art: "cloud" },
  lightning:        { a: "#ded4f2", b: "#b9a6e0", ink: "#2f2153", soft: "rgba(255,255,255,.5)",  cap: "#513c7d", art: "storm" },
  "lightning-rainy":{ a: "#d6cbee", b: "#ad98da", ink: "#2a1d4d", soft: "rgba(255,255,255,.45)", cap: "#4a3572", art: "storm" },
  exceptional:      { a: "#ffdcd2", b: "#f6b09b", ink: "#5c2415", soft: "rgba(255,255,255,.5)",  cap: "#8a4230", art: "sun" },
};
function fwSkin(state) {
  const sk = FW_SKIN[state] || FW_SKIN.partlycloudy;
  return Object.assign({ cap: sk.ink }, sk);
}

// Disegni morbidi al posto delle icone piatte, e soprattutto VIVI: il sole
// gira, la pioggia cade, le nuvole scorrono, il fulmine lampeggia. Le
// animazioni si fermano da sole se il sistema chiede meno movimento.
function fwArt(kind, size, still) {
  const s = size || 76;
  const cls = still ? "" : " fw-anim";
  const S = v => `<svg class="fw-art-svg${cls}" viewBox="0 0 100 100" width="${s}" height="${s}" style="display:block;overflow:visible">${v}</svg>`;
  const cloud = (x, y, sc, fill, klass) => `<g class="${klass || ""}" transform="translate(${x} ${y}) scale(${sc})">
    <path d="M26 62 Q10 62 10 49 Q10 37 23 36 Q27 22 42 22 Q58 22 62 35 Q78 34 80 47 Q82 62 66 62 Z" fill="${fill}"/></g>`;
  switch (kind) {
    case "sun": return S(`
      <g>
        <circle class="fw-halo" cx="50" cy="50" r="30" fill="rgba(255,255,255,.35)"/>
        <g class="fw-rays">
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(d => `<rect x="47.5" y="6" width="5" height="12" rx="2.5" fill="#ffb020" transform="rotate(${d} 50 50)"/>`).join("")}
        </g>
        <circle cx="50" cy="50" r="21" fill="#ffb020"/>
      </g>`);
    case "moon": return S(`
      <g>
        <circle class="fw-halo" cx="52" cy="48" r="30" fill="rgba(255,255,255,.10)"/>
        <path d="M62 22 A28 28 0 1 0 62 78 A22 22 0 1 1 62 22 Z" fill="#ffd88a"/>
        <circle class="fw-star fw-s1" cx="24" cy="24" r="2.4" fill="#fff5dd"/>
        <circle class="fw-star fw-s2" cx="80" cy="30" r="1.8" fill="#fff5dd"/>
        <circle class="fw-star fw-s3" cx="76" cy="72" r="2.1" fill="#fff5dd"/>
      </g>`);
    case "partly": return S(`
      <g>
        <g class="fw-rays"><circle cx="36" cy="34" r="16" fill="#ffb020"/>
          ${[0, 60, 120, 180, 240, 300].map(d => `<rect x="34" y="8" width="4" height="9" rx="2" fill="#ffb020" transform="rotate(${d} 36 34)"/>`).join("")}
        </g>
        ${cloud(4, 12, .92, "#ffffff", "fw-drift")}
      </g>`);
    case "cloud": return S(`<g>${cloud(2, 8, 1, "#ffffff", "fw-drift")}
      <g opacity=".55">${cloud(14, 22, .7, "#ffffff", "fw-drift2")}</g></g>`);
    case "rain": return S(`
      <g>${cloud(2, 2, 1, "#ffffff", "fw-drift")}
        ${[26, 46, 66].map((x, i) => `<rect class="fw-drop fw-d${i + 1}" x="${x}" y="66" width="6" height="17" rx="3" fill="#7fb2dd" transform="rotate(12 ${x} 66)"/>`).join("")}
      </g>`);
    case "snow": return S(`
      <g>${cloud(2, 2, 1, "#ffffff", "fw-drift")}
        ${[28, 50, 70].map((x, i) => `<circle class="fw-flake fw-d${i + 1}" cx="${x}" cy="72" r="4.5" fill="#ffffff"/>`).join("")}
      </g>`);
    case "fog": return S(`
      <g>${cloud(2, 0, 1, "#ffffff")}
        ${[70, 80, 90].map((y, i) => `<rect class="fw-fog fw-d${i + 1}" x="${16 + i * 4}" y="${y}" width="${68 - i * 10}" height="6" rx="3" fill="#ffffff" opacity="${.75 - i * .18}"/>`).join("")}
      </g>`);
    case "storm": return S(`
      <g>${cloud(2, 2, 1, "#ffffff", "fw-drift")}
        <path class="fw-bolt" d="M52 66 L38 90 L50 88 L44 100 L64 76 L52 78 Z" fill="#ffd54a"/>
      </g>`);
    default: return S(`<circle cx="50" cy="50" r="24" fill="#ffffff"/>`);
  }
}

// Le animazioni stanno in un unico blocco riusato dalla card e dal popup.
const FW_ANIM_CSS = `
  @keyframes fwSpin{to{transform:rotate(360deg)}}
  @keyframes fwBreath{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.09);opacity:1}}
  @keyframes fwDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
  @keyframes fwDrift2{0%,100%{transform:translateX(0)}50%{transform:translateX(-6px)}}
  @keyframes fwFall{0%{transform:translateY(-6px);opacity:0}20%{opacity:1}100%{transform:translateY(24px);opacity:0}}
  @keyframes fwSway{0%{transform:translate(0,-6px);opacity:0}25%{opacity:1}100%{transform:translate(6px,24px);opacity:0}}
  @keyframes fwSlide{0%,100%{transform:translateX(0)}50%{transform:translateX(8px)}}
  @keyframes fwFlash{0%,88%,100%{opacity:.25}90%,96%{opacity:1}}
  @keyframes fwTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
  .fw-anim .fw-rays{transform-origin:50px 50px;animation:fwSpin 26s linear infinite}
  .fw-anim .fw-halo{transform-origin:50px 50px;animation:fwBreath 5s ease-in-out infinite}
  .fw-anim .fw-drift{animation:fwDrift 7s ease-in-out infinite}
  .fw-anim .fw-drift2{animation:fwDrift2 9s ease-in-out infinite}
  .fw-anim .fw-drop{animation:fwFall 1.4s linear infinite}
  .fw-anim .fw-flake{animation:fwSway 3.2s linear infinite}
  .fw-anim .fw-fog{animation:fwSlide 6s ease-in-out infinite}
  .fw-anim .fw-bolt{animation:fwFlash 3.6s ease-in-out infinite}
  .fw-anim .fw-star{animation:fwTwinkle 3s ease-in-out infinite}
  .fw-anim .fw-d1{animation-delay:0s}
  .fw-anim .fw-d2{animation-delay:.45s}
  .fw-anim .fw-d3{animation-delay:.9s}
  .fw-anim .fw-s2{animation-delay:1s}
  .fw-anim .fw-s3{animation-delay:2s}
  @media (prefers-reduced-motion: reduce){ .fw-anim *{animation:none !important} }
`;

class FaberWeather extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) throw new Error("Scegli un'entita meteo");
    this._cfg = Object.assign({ days: 4 }, config);
    this._built = false;
  }
  set hass(hass) {
    this._hass = hass;
    const st = hass.states[this._cfg.entity];
    const cond = st ? st.state : "";
    if (!this._built || cond !== this._cond) {
      this._cond = cond; this._built = true;
      this._render();
      this._loadForecast();
    } else this._patch();
  }
  getCardSize() { return 4; }
  static getConfigElement() { return document.createElement("faber-weather-editor"); }
  static getStubConfig(hass) {
    const w = Object.keys(hass.states).filter(e => e.startsWith("weather."));
    return { type: "custom:faber-weather", entity: w[0] || "", days: 4 };
  }

  // Dal 2024 le previsioni non stanno piu negli attributi: si chiedono al
  // servizio, che risponde con i giorni.
  async _loadForecast() {
    if (this._fcTimer) clearTimeout(this._fcTimer);
    try {
      const r = await this._hass.callWS({
        type: "call_service", domain: "weather", service: "get_forecasts",
        service_data: { type: "daily" }, target: { entity_id: this._cfg.entity },
        return_response: true,
      });
      const res = r && r.response && r.response[this._cfg.entity];
      this._fc = (res && res.forecast) || [];
      this._paintDays();
    } catch (e) { this._fc = []; }
    this._fcTimer = setTimeout(() => this._loadForecast(), 15 * 60 * 1000);
  }
  disconnectedCallback() { if (this._fcTimer) clearTimeout(this._fcTimer); }

  _render() {
    const st = this._hass.states[this._cfg.entity];
    if (!st) { this.innerHTML = `<div style="padding:16px">Entita meteo non trovata.</div>`; return; }
    const a = st.attributes;
    const sk = fwSkin(st.state);
    const unit = a.temperature_unit || "°C";
    const oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
    this.innerHTML = `
      <style>
        .fw{container-type:inline-size;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
          position:relative;overflow:hidden;padding:22px 24px 18px;color:${sk.ink};border-radius:26px;
          background:linear-gradient(150deg,${sk.a},${sk.b});
          box-shadow:0 14px 34px rgba(20,26,40,.16)}
        .fw-title{font-size:clamp(20px,6.5cqw,26px);font-weight:800;letter-spacing:-.02em;line-height:1.1}
        .fw-sub{margin-top:3px;font-size:12.5px;font-weight:600;opacity:.72;text-transform:capitalize}
        .fw-mid{display:flex;align-items:center;gap:6px;margin-top:6px}
        .fw-art{flex:0 0 auto;margin-left:-6px}
        .fw-tempbox{flex:1;min-width:0;text-align:right}
        .fw-temp{font-size:clamp(46px,17cqw,68px);font-weight:800;line-height:1;letter-spacing:-.045em;
          font-variant-numeric:tabular-nums}
        .fw-temp sup{font-size:.34em;font-weight:700;vertical-align:super;margin-left:2px;letter-spacing:0}
        .fw-cap{margin-top:2px;font-size:11px;font-weight:600;opacity:.66}
        .fw-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}
        .fw-stat{display:flex;flex-direction:column;align-items:center;gap:3px;padding:11px 4px;border-radius:16px;
          background:${sk.soft}}
        .fw-stat ha-icon{--mdc-icon-size:18px;opacity:.75}
        .fw-statval{font-size:13.5px;font-weight:800;font-variant-numeric:tabular-nums}
        .fw-statlab{font-size:8.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.6}
        .fw-next{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:12px;
          padding:12px 16px;border:none;border-radius:16px;cursor:pointer;font:inherit;color:inherit;
          background:${sk.soft};font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
        .fw-next ha-icon{--mdc-icon-size:20px;opacity:.7}
        .fw-next:hover{filter:brightness(1.06)}
        @container (max-width: 340px){ .fw-stats{grid-template-columns:repeat(2,1fr)} }
        ${FW_ANIM_CSS}
      </style>
      <div class="fw">
        <div class="fw-title">${fhEsc(this._cfg.name || a.friendly_name || "Meteo")}</div>
        <div class="fw-sub" data-sub>${fhEsc(FH_WEATHER_IT[st.state] || st.state)} · ${fhEsc(oggi)}</div>
        <div class="fw-mid">
          <div class="fw-art" data-art>${fwArt(sk.art, 84)}</div>
          <div class="fw-tempbox">
            <div class="fw-temp" data-temp>${a.temperature != null ? Math.round(a.temperature) : "–"}<sup>${fhEsc(unit)}</sup></div>
            <div class="fw-cap">temperatura attuale</div>
          </div>
        </div>
        <div class="fw-stats" data-stats>${this._statsHTML(a)}</div>
        <button type="button" class="fw-next" data-next hidden>
          <span>Prossimi giorni</span><ha-icon icon="mdi:chevron-right"></ha-icon>
        </button>
      </div>`;
    const nx = this.querySelector("[data-next]");
    if (nx) nx.addEventListener("click", () => this._openForecast());
    this._paintDays();
  }

  // I giorni non stanno piu in fila dentro la card: occupavano spazio tutti i
  // giorni per un dato che si guarda ogni tanto. Ora la card resta compatta e
  // i giorni si aprono al tocco, con piu informazioni di quante ne stessero
  // in una striscia (probabilita di pioggia e vento).
  _openForecast() {
    const st = this._hass.states[this._cfg.entity];
    const sk = fwSkin(st ? st.state : "");
    const fc = this._fc || [];
    const prev = this.querySelector(".fw-scrim");
    if (prev) prev.remove();
    const scrim = document.createElement("div");
    scrim.className = "fw-scrim";
    scrim.innerHTML = `
      <div class="fw-modal">
        <div class="fw-mhead">
          <div class="fw-mtitle">Prossimi giorni</div>
          <button type="button" class="fw-mclose" data-close><ha-icon icon="mdi:close"></ha-icon></button>
        </div>
        <div class="fw-mlist">
          ${fc.length ? fc.map(d => {
            const dd = new Date(d.datetime);
            const nome = dd.toLocaleDateString("it-IT", { weekday: "long" });
            const data = dd.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
            const dsk = fwSkin(d.condition);
            const extra = [];
            if (d.precipitation_probability != null) extra.push(`<span><ha-icon icon="mdi:water"></ha-icon>${Math.round(d.precipitation_probability)}%</span>`);
            if (d.wind_speed != null) extra.push(`<span><ha-icon icon="mdi:weather-windy"></ha-icon>${Math.round(d.wind_speed)} km/h</span>`);
            return `<div class="fw-mrow">
              <div class="fw-mart">${fwArt(dsk.art, 40, true)}</div>
              <div class="fw-mday">
                <div class="fw-mname">${fhEsc(nome)}</div>
                <div class="fw-mmeta">${fhEsc(data)} · ${fhEsc(FH_WEATHER_IT[d.condition] || d.condition || "")}</div>
                ${extra.length ? `<div class="fw-mextra">${extra.join("")}</div>` : ""}
              </div>
              <div class="fw-mtemp">
                <div class="fw-mmax">${d.temperature != null ? Math.round(d.temperature) + "\u00b0" : "–"}</div>
                <div class="fw-mmin">${d.templow != null ? Math.round(d.templow) + "\u00b0" : ""}</div>
              </div>
            </div>`;
          }).join("") : `<div class="fw-mempty">Previsioni non disponibili.</div>`}
        </div>
      </div>`;
    const style = document.createElement("style");
    style.textContent = `
      .fw-scrim{position:fixed;inset:0;z-index:30;background:rgba(6,9,14,.6);backdrop-filter:blur(6px);
        display:flex;align-items:flex-end;justify-content:center;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
      .fw-modal{width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;color:${sk.ink};
        background:linear-gradient(160deg,${sk.a},${sk.b});border-radius:26px 26px 0 0;
        box-shadow:0 -18px 50px rgba(0,0,0,.5);animation:fwUp .22s ease-out}
      @keyframes fwUp{from{transform:translateY(18px);opacity:.6}to{transform:translateY(0);opacity:1}}
      .fw-mhead{display:flex;align-items:center;gap:10px;padding:18px 20px 6px}
      .fw-mtitle{flex:1;font-size:18px;font-weight:800;letter-spacing:-.01em}
      .fw-mclose{width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;color:inherit;
        background:${sk.soft};display:flex;align-items:center;justify-content:center}
      .fw-mlist{overflow-y:auto;padding:6px 16px 22px;display:flex;flex-direction:column;gap:8px}
      .fw-mrow{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:${sk.soft}}
      .fw-mart{flex:0 0 auto}
      .fw-mday{flex:1;min-width:0}
      .fw-mname{font-size:14.5px;font-weight:800;text-transform:capitalize}
      .fw-mmeta{font-size:11.5px;font-weight:600;opacity:.66;text-transform:capitalize}
      .fw-mextra{display:flex;gap:12px;margin-top:4px;font-size:11px;font-weight:700;opacity:.7}
      .fw-mextra span{display:flex;align-items:center;gap:3px}
      .fw-mextra ha-icon{--mdc-icon-size:13px}
      .fw-mtemp{text-align:right;flex:0 0 auto}
      .fw-mmax{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums}
      .fw-mmin{font-size:12.5px;font-weight:700;opacity:.55;font-variant-numeric:tabular-nums}
      .fw-mempty{padding:24px;text-align:center;opacity:.7;font-size:13px}
      ${FW_ANIM_CSS}`;
    scrim.appendChild(style);
    scrim.addEventListener("click", e => { if (e.target === scrim) scrim.remove(); });
    scrim.querySelector("[data-close]").addEventListener("click", () => scrim.remove());
    this.appendChild(scrim);
  }

  _statHTML(icon, label, value) {
    if (value == null || value === "") return "";
    return `<div class="fw-stat"><ha-icon icon="${icon}"></ha-icon>
      <div class="fw-statval">${fhEsc(value)}</div>
      <div class="fw-statlab">${fhEsc(label)}</div></div>`;
  }

  _statsHTML(a) {
    return [
      this._statHTML("mdi:water-percent", "Umidita", a.humidity != null ? a.humidity + "%" : ""),
      this._statHTML("mdi:gauge", "Pressione", a.pressure != null ? Math.round(a.pressure) + " hPa" : ""),
      this._statHTML("mdi:weather-windy", "Vento", a.wind_speed != null ? Math.round(a.wind_speed) + " km/h" : ""),
      this._statHTML("mdi:compass-outline", "Direzione", fwDir(a.wind_bearing)),
    ].join("");
  }

  _paintDays() {
    const nx = this.querySelector("[data-next]");
    if (nx) nx.hidden = !((this._fc || []).length && (this._cfg.days || 0) !== 0);
  }

  _patch() {
    const st = this._hass.states[this._cfg.entity];
    if (!st) return;
    const a = st.attributes;
    const t = this.querySelector("[data-temp]");
    if (t) t.innerHTML = `${a.temperature != null ? Math.round(a.temperature) : "–"}<sup>${fhEsc(a.temperature_unit || "°C")}</sup>`;
    const sb = this.querySelector("[data-stats]");
    if (sb) sb.innerHTML = this._statsHTML(a);
  }
}
customElements.define("faber-weather", FaberWeather);

class FaberWeatherEditor extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({ days: 4 }, config || {});
    if (this._internal) { this._internal = false; return; }
    this._render();
  }
  set hass(h) { this._hass = h; if (!this._done) { this._done = true; this._render(); } }
  _emit() {
    this._internal = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true }));
  }
  _render() {
    if (!this._cfg || !this._hass) return;
    const w = Object.keys(this._hass.states).filter(e => e.startsWith("weather."));
    const inp = "padding:9px 10px;border-radius:8px;font-size:14px;width:100%;box-sizing:border-box;" +
      "border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)";
    this.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;padding:6px 2px;font-family:inherit">
      <label style="font-size:13px;font-weight:600">Entita meteo</label>
      <select id="fwEnt" style="${inp}">
        ${w.map(e => `<option value="${e}"${e === this._cfg.entity ? " selected" : ""}>${fhEsc((this._hass.states[e].attributes.friendly_name) || e)}</option>`).join("")}
      </select>
      <label style="font-size:13px;font-weight:600">Nome mostrato (facoltativo)</label>
      <input id="fwName" value="${fhEsc(this._cfg.name || "")}" style="${inp}">
      <label style="font-size:13px;font-weight:600">Giorni di previsione</label>
      <input id="fwDays" type="number" min="0" max="7" value="${this._cfg.days ?? 4}" style="${inp}">
    </div>`;
    const q = id => this.querySelector(id);
    q("#fwEnt").addEventListener("change", e => { this._cfg = Object.assign({}, this._cfg, { entity: e.target.value }); this._emit(); });
    q("#fwName").addEventListener("input", e => { this._cfg = Object.assign({}, this._cfg, { name: e.target.value }); this._emit(); });
    q("#fwDays").addEventListener("change", e => { this._cfg = Object.assign({}, this._cfg, { days: parseInt(e.target.value) || 0 }); this._emit(); });
  }
}
customElements.define("faber-weather-editor", FaberWeatherEditor);



window.customCards = window.customCards || [];
window.customCards.push({
  type: "faber-weather",
  name: "Faber Meteo",
  description: "Meteo nello stile della famiglia: temperatura grande, condizione in italiano, umidita/pressione/vento/direzione e i prossimi giorni.",
  preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
});
window.customCards.push({
  type: "faber-home",
  name: "Faber Home",
  description: "Pannello a schermo intero: sfondo animato, intestazione con orologio e chip, pagine con barra in basso e card di Home Assistant in righe e colonne.",
  preview: false,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
});
