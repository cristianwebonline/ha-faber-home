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
const FH_VERSION = "0.136.0";
console.info(`%c FABER HOME %c v${FH_VERSION} `,
  "color:#1c1400;background:#ffb020;font-weight:700;border-radius:4px 0 0 4px",
  "color:var(--fh-c-soft,#ffe9c2);background:#1a1b21;border-radius:0 4px 4px 0");

const FH_DEFAULTS = {
  type: "custom:faber-home",
  // Aspetto: tre cose distinte, come vanno tenute distinte anche nella testa
  // di chi configura. Lo sfondo pagina è la tinta dietro le card; l'animazione
  // racconta che tempo fa; il tema automatico decide chiaro/scuro per orario.
  appearance: {
    pageBackground: { mode: "gradient", color: "", from: "", mid: "", to: "" },
    weatherAnimation: true,
    sidebar: "mai",
    autoTheme: { enabled: true, dayStart: "07:00", nightStart: "21:00" },
    // "vetro" = le card diventano semitrasparenti e sfocate, cosi il cielo
    // animato dietro (stelle, pioggia, nuvole) si vede attraverso invece di
    // restare nascosto sotto pannelli pieni.
    cardStyle: "vetro",
    cardTrasparenza: 40,
    cardBlur: 16,
    // Quanto si muove il cielo: 0 = fermo, 100 = pieno. Il valore moltiplica
    // sia il numero di particelle sia quanto scintillano.
    skyIntensity: 70,
    // "auto" segue gli orari qui sotto; "giorno" e "notte" li scavalcano.
    // Serve per guardare il pannello com'e di notte mentre fuori e giorno —
    // e per chi tiene un tablet in una stanza sempre buia.
    temaFisso: "auto",
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
  light: { top: "#ffffff", mid: "#fdfbf6", bot: "#faf4e6", ink: "#0f172a", muted: "#57626f",
    panel: "rgba(255,255,255,.85)", stroke: "rgba(15,23,42,.10)", navInk: "#0f172a" },
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

// Un colpetto quando si preme un comando: sul telefono conferma che il tocco
// e arrivato, senza aspettare che l'apparecchio risponda (a volte ci mette
// qualche secondo, e nel dubbio si preme due volte). Breve di proposito:
// una vibrazione lunga da fastidio addosso.
// Non e supportata ovunque (iOS non ce l'ha, e alcuni browser la danno solo
// dentro un vero gesto dell'utente): si prova e se non c'e pazienza.
function fhVibra(ms) {
  try {
    if (navigator.vibrate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigator.vibrate(ms || 12);
    }
  } catch (e) { /* niente */ }
}

// Il tasto giorno/notte non e un interruttore a due posizioni: e un giro a
// tre — automatico, fisso giorno, fisso notte. Se resta su un fisso il
// pannello smette di seguire l'orologio, ed e giusto che il tasto lo dica:
// altrimenti a mezzanotte si vede una casa in pieno giorno e si da la colpa
// alle card.
function fhTitoloTema(fisso, scuro) {
  const f = fisso || "auto";
  if (f === "auto") return (scuro ? "Ora e notte" : "Ora e giorno")
    + " \u2014 segue l'orologio. Tocca per bloccarlo";
  return "Tema bloccato su " + (f === "notte" ? "notte" : "giorno")
    + ": non cambia piu con l'ora. Tocca ancora per tornare automatico";
}

function fhEsc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function fhUid(p) { return (p || "id") + Math.random().toString(36).slice(2, 8); }

const FH_WEATHER_IT = {
  "partlycloudy-night": "Poco nuvoloso",
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
// UNA SERRATURA SBLOCCATA NON E' UNA PORTA APERTA. La tabella qui sopra e per
// tutti i tipi di cosa, e traduceva "unlocked" con "Aperta": la porta blindata
// girata ma accostata diventava "Porta aperta" nel chip e nella riga in cima
// (Cristian: "effettivamente e sbloccata non aperta, cosi e ingannevole").
// Sono due cose diverse e vanno dette diverse: la serratura si blocca, la
// porta si apre. Stessa cosa per l'allarme, che in inglese non dice niente.
const FH_STATE_LOCK = {
  locked: "Chiusa a chiave", unlocked: "Sbloccata", open: "Aperta", opening: "Si apre",
  locking: "Si chiude", unlocking: "Si sblocca", jammed: "Bloccata a meta",
};
const FH_STATE_ALLARME = {
  disarmed: "Disinserito", armed_away: "Inserito · fuori casa", armed_home: "Inserito · in casa",
  armed_night: "Inserito · notte", armed_vacation: "Inserito · vacanza",
  armed_custom_bypass: "Inserito · parziale", arming: "Si sta inserendo…",
  pending: "Conto alla rovescia…", triggered: "ALLARME IN CORSO", disarming: "Si sta spegnendo…",
};
const FH_APERTURE = ["door", "window", "opening", "garage_door"];
// Il nome di un sensore senza il prefisso dell'impianto che lo porta
// ("ALLARME CASA finestra sala" -> "Finestra sala"): in una riga corta il
// prefisso e rumore, ed e uguale per tutti.
function fhNomeBreve(st) {
  const n = String((st && st.attributes && st.attributes.friendly_name) || (st && st.entity_id) || "")
    .replace(/^allarme\s+casa\s+/i, "").replace(/^allarme\s+/i, "").trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
}

function fhStateText(st) {
  if (!st) return "";
  const dom = String(st.entity_id || "").split(".")[0];
  if (dom === "lock" && FH_STATE_LOCK[st.state]) return FH_STATE_LOCK[st.state];
  if (dom === "alarm_control_panel" && FH_STATE_ALLARME[st.state]) return FH_STATE_ALLARME[st.state];
  if (dom === "binary_sensor" && FH_APERTURE.includes(st.attributes && st.attributes.device_class)) {
    return st.state === "on" ? "Aperta" : "Chiusa";
  }
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
  setScene(mode, dark, forza) {
    const f = forza == null ? this.forza : Math.max(0, Math.min(1, forza));
    let m = mode;
    if (!dark && (m === "stars" || !m)) m = "motes";
    if (dark && m === "motes") m = "stars";
    const changed = m !== this.mode || dark !== this.dark || f !== this.forza;
    this.mode = m || (dark ? "stars" : "motes");
    this.dark = !!dark;
    this.forza = f == null ? .7 : f;
    if (changed) this.seed();
  }
  resize() {
    const r = this.c.getBoundingClientRect();
    // Se il riquadro misura zero (capita se il canvas viene misurato prima
    // che la pagina sia disposta), senza questa rete this.w restava vuoto
    // PER SEMPRE — e draw() esce subito quando this.w e vuoto, quindi non si
    // sarebbe mai disegnata una sola stella, in silenzio.
    const w = r.width || window.innerWidth || 0;
    const h = r.height || window.innerHeight || 0;
    if (!w || !h) return;
    r.width = w; r.height = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.c.width = Math.floor(w * dpr);
    this.c.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    this.seed();
  }
  // Quante particelle: una ogni "per" pixel quadrati. I numeri di prima
  // erano tarati troppo radi — su un telefono uscivano SEDICI stelle in tutto
  // lo schermo, cioe un cielo vuoto. Un cielo stellato vero e fitto. Il conto
  // gira nel browser (non sul Raspberry): duecento puntini non li sente
  // nessuno, ma si vedono eccome. Il tetto serve su schermi molto grandi,
  // dove l'area cresce col quadrato e i conti scapperebbero.
  // La forza (0..1) dirada o infittisce: a meta forza il cielo ha meta delle
  // particelle, e piu sotto si scende piu il minimo scende con lui, senno a
  // forza zero resterebbero comunque due dozzine di puntini fissi.
  // Quanto corrono le particelle. Il cursore va da 0 a 1 e qui diventa un
  // fattore da 0,45 a 1,25: al minimo il cielo si muove appena, al massimo
  // scende deciso. Prima il cursore toccava solo il NUMERO delle particelle,
  // e chi lo abbassava vedeva meno gocce correre alla stessa velocita.
  _andatura() {
    const f = this.forza == null ? .7 : this.forza;
    return .45 + f * .8;
  }

  _count(per) {
    const f = this.forza == null ? .7 : this.forza;
    const base = Math.round((this.w * this.h) / per);
    return Math.max(Math.round(24 * f), Math.min(900, Math.round(base * (.25 + f * 1.05))));
  }
  seed() {
    if (!this.w) return;
    const R = Math.random;
    const p = [];
    if (this.mode === "rain" || this.mode === "storm") {
      for (let i = 0, n = this._count(3600); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h, len: 7 + R() * 11, vy: 2 + R() * 2.4, a: .16 + R() * .26 });
    } else if (this.mode === "snow") {
      for (let i = 0, n = this._count(5200); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h, r: 1 + R() * 2.2, vy: .22 + R() * .34, ph: R() * 6.28, amp: 6 + R() * 14, a: .32 + R() * .42 });
    } else if (this.mode === "clouds" || this.mode === "fog") {
      for (let i = 0, n = this._count(38000); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h * .8, r: 60 + R() * 130, vx: (.06 + R() * .12) * (this.mode === "fog" ? .4 : 1), a: .05 + R() * .07 });
    } else if (this.mode === "motes") {
      // Di giorno con il sole: particelle di luce/bokeh sfocate ed eleganti (12-24),
      // non centinaia di minuscoli puntini che sembrano stelle.
      const f = this.forza == null ? .7 : this.forza;
      const n = Math.max(10, Math.min(26, Math.round(18 * f)));
      for (let i = 0; i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h, r: 12 + R() * 24, vy: -(.12 + R() * .20), vx: (R() - .5) * .08, ph: R() * 6.28, sp: .35 + R() * .85, a: .07 + R() * .14 });
    } else {
      // Un cielo vero non ha stelle tutte uguali: tante piccole e fioche, e
      // qualcuna grossa e luminosa che si nota. Una su dodici e "brillante" e
      // si porta dietro un alone: sono quelle che danno profondita al cielo,
      // senza di loro resta una spolverata di sale.
      for (let i = 0, n = this._count(4200); i < n; i++) {
        const brillante = R() < .16;
        p.push({
          x: R() * this.w, y: R() * this.h,
          r: brillante ? 1.7 + R() * 1.5 : .6 + R() * 1.0,
          ph: R() * 6.28,
          // Velocita molto diverse fra loro: se scintillano tutte allo stesso
          // ritmo l'occhio legge un lampeggio unico invece di un cielo.
          sp: brillante ? .8 + R() * 1.6 : .35 + R() * 1.1,
          a: brillante ? .85 + R() * .15 : .32 + R() * .40,
          big: brillante,
        });
      }
    }
    this.parts = p;
  }
  start() {
    if (this.running) return;
    // Se il telefono ha "riduci animazioni" acceso, il cielo resta un quadro
    // fermo: e una scelta di chi usa il telefono e va rispettata. Ma va anche
    // DETTA, senno sembra che il pannello sia rotto — il pannello la legge da
    // qui e lo scrive nelle impostazioni.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.ridotto = true;
      this.resize(); this.draw(0); return;
    }
    this.ridotto = false;
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
    const an = this._andatura();
    for (const d of this.parts) {
      if (m === "rain" || m === "storm") {
        d.y += d.vy * an; d.x += d.vy * an * .28;
        if (d.y > this.h) { d.y = -d.len; d.x = Math.random() * this.w; }
        if (d.x > this.w) d.x -= this.w;
      } else if (m === "snow") {
        d.y += d.vy * an; d.ph += .012 * an;
        if (d.y > this.h) { d.y = -4; d.x = Math.random() * this.w; }
      } else if (m === "clouds" || m === "fog") {
        d.x += d.vx;
        if (d.x - d.r > this.w) d.x = -d.r;
      } else if (m === "motes") {
        d.y += d.vy * an; d.x += (d.vx + Math.sin(t * d.sp + d.ph) * 0.12) * an;
        if (d.y < -d.r * 2) { d.y = this.h + d.r * 2; d.x = Math.random() * this.w; }
        if (d.x < -d.r * 2) d.x += this.w + d.r * 4;
        else if (d.x > this.w + d.r * 2) d.x -= (this.w + d.r * 4);
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
      const f = this.forza == null ? .7 : this.forza;
      // 1. Bagliore solare radiante in alto a destra
      const sx = this.w * 0.84;
      const sy = -this.h * 0.04;
      const sunR = Math.max(this.w, this.h) * 0.68;
      const sunGrd = g.createRadialGradient(sx, sy, 0, sx, sy, sunR);
      const sunCol = light ? "255,195,85" : "255,210,120";
      sunGrd.addColorStop(0, `rgba(${sunCol},${0.24 * f})`);
      sunGrd.addColorStop(0.35, `rgba(${sunCol},${0.09 * f})`);
      sunGrd.addColorStop(0.70, `rgba(${sunCol},${0.025 * f})`);
      sunGrd.addColorStop(1, `rgba(${sunCol},0)`);
      g.fillStyle = sunGrd;
      g.fillRect(0, 0, this.w, this.h);

      // 2. Raggi morbidi del sole che ruotano molto lentamente
      const rayAngle = (t * 0.028) % (Math.PI * 2);
      g.save();
      g.translate(sx, sy);
      g.rotate(rayAngle);
      for (let i = 0; i < 6; i++) {
        g.rotate(Math.PI / 3);
        const rayGrd = g.createRadialGradient(0, 0, 0, 0, 0, sunR * 0.88);
        rayGrd.addColorStop(0, `rgba(255,235,160,${0.05 * f})`);
        rayGrd.addColorStop(0.5, `rgba(255,210,110,${0.02 * f})`);
        rayGrd.addColorStop(1, `rgba(255,190,80,0)`);
        g.fillStyle = rayGrd;
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, sunR * 0.88, -0.22, 0.22);
        g.closePath();
        g.fill();
      }
      g.restore();

      // 3. Di giorno con il sole il cielo e pulito senza puntini/stelle
      if (this.dark) {
        for (const d of this.parts) {
          const pulse = 0.8 + 0.2 * Math.sin(t * d.sp + d.ph);
          const alpha = Math.min(1, d.a * pulse * f);
          const bGrd = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
          bGrd.addColorStop(0, `rgba(${sunCol},${alpha})`);
          bGrd.addColorStop(0.5, `rgba(${sunCol},${alpha * 0.4})`);
          bGrd.addColorStop(1, `rgba(${sunCol},0)`);
          g.fillStyle = bGrd;
          g.beginPath();
          g.arc(d.x, d.y, d.r, 0, 6.283);
          g.fill();
        }
      }
    } else {
      // Se NON e buio (dark e falso), non si disegnano MAI stelle di giorno
      if (!this.dark) return;
      const c = "255,255,255";
      for (const d of this.parts) {
        const f = this.forza == null ? .7 : this.forza;
        const min = 1 - .82 * f;
        const tw = min + (1 - min) * (.5 + .5 * Math.sin(t * d.sp + d.ph));
        if (d.big) {
          const rr = d.r * (5.5 + 2.5 * tw);
          const grd = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, rr);
          grd.addColorStop(0, `rgba(${c},${d.a * tw * .75})`);
          grd.addColorStop(.45, `rgba(${c},${d.a * tw * .18})`);
          grd.addColorStop(1, `rgba(${c},0)`);
          g.fillStyle = grd;
          g.beginPath(); g.arc(d.x, d.y, rr, 0, 6.283); g.fill();
        }
        g.fillStyle = `rgba(${c},${Math.min(1, d.a * tw * 1.15)})`;
        g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.283); g.fill();
      }
    }
  }
}

// ---------------------------------------------------------------------------

/* ===========================================================================
   LE STANZE DISEGNATE.
   Un'icona di sistema e un glifo fermo: dice il nome della stanza e basta.
   Qui ogni stanza ha una piccola scena che si muove per conto suo — il vapore
   che sale dalla pentola, il cestello che gira, le gocce della doccia — cosi
   l'elenco si riconosce a colpo d'occhio invece che a lettura.
   Sono disegni nostri: nessuna libreria, nessuna immagine da scaricare, e i
   tratti usano currentColor, quindi si accendono d'ambra quando la stanza ha
   qualcosa acceso.
   Tutto si ferma con "riduci movimento" del telefono.
   =========================================================================== */
const FH_ARTE_CSS = `
  @keyframes fhVapore1{0%{opacity:0;transform:translateY(2px) scaleX(.7)}
    35%{opacity:.85}100%{opacity:0;transform:translateY(-11px) scaleX(1.3)}}
  @keyframes fhVapore2{0%{opacity:0;transform:translateY(1px) scaleX(.6)}
    45%{opacity:.9}100%{opacity:0;transform:translateY(-13px) scaleX(1.4)}}
  @keyframes fhGocciaM{0%{opacity:0;transform:translateY(0)}
    25%{opacity:.95}85%{opacity:.95;transform:translateY(14px)}100%{opacity:0;transform:translateY(16px)}}
  @keyframes fhRipple{0%{opacity:0;transform:scaleX(.3);transform-origin:32px 35px}
    50%{opacity:.85;transform-origin:32px 35px}100%{opacity:0;transform:scaleX(1.4);transform-origin:32px 35px}}
  @keyframes fhGiraLento{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes fhBolla{0%{opacity:0;transform:translate(0,0) scale(.5)}
    35%{opacity:.9}100%{opacity:0;transform:translate(-3px,-12px) scale(1.15)}}
  @keyframes fhBrezza1{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(6deg)}}
  @keyframes fhBrezza2{0%,100%{transform:rotate(4deg)}50%{transform:rotate(-6deg)}}
  @keyframes fhLampGlow{0%,100%{opacity:.25;transform:scale(.96)}50%{opacity:.85;transform:scale(1.04)}}
  @keyframes fhFiamma{0%,100%{transform:scale(1);opacity:.75}
    35%{transform:scaleY(1.18) scaleX(.88) translateY(-1px);opacity:1}
    70%{transform:scaleY(.92) scaleX(1.06);opacity:.65}}
  @keyframes fhFariBeam{0%,100%{opacity:.25}50%{opacity:.9}}
  @keyframes fhSchermoPulse{0%,100%{opacity:.25}50%{opacity:.85}}
  @keyframes fhStellaTwinkle{0%,100%{opacity:.25;transform:scale(.75)}50%{opacity:1;transform:scale(1.2)}}
  @keyframes fhImpulsoFit{0%{opacity:.8;transform:scale(.85)}
    70%{opacity:.15;transform:scale(1.25)}100%{opacity:0;transform:scale(1.3)}}
  @keyframes fhConoLuce{0%,100%{opacity:.18}50%{opacity:.65}}
  @keyframes fhSonnoM{0%{opacity:0;transform:translate(0,0) scale(.6)}
    30%{opacity:.9}100%{opacity:0;transform:translate(5px,-9px) scale(1.1)}}
  .fh-arte svg{display:block;overflow:visible}
  .fh-arte .an{transform-box:fill-box;transform-origin:center}
  .fh-vapore1{animation:fhVapore1 2.7s ease-out infinite}
  .fh-vapore2{animation:fhVapore2 3.1s ease-out infinite}
  .fh-goccia{animation:fhGocciaM 1.8s ease-in infinite}
  .fh-ripple{animation:fhRipple 1.8s ease-out infinite}
  .fh-cestello{transform-box:view-box;transform-origin:24px 27px;animation:fhGiraLento 4.5s linear infinite}
  .fh-bolla{animation:fhBolla 2.4s ease-out infinite}
  .fh-foglia1{animation:fhBrezza1 3.4s ease-in-out infinite}
  .fh-foglia2{animation:fhBrezza2 3.8s ease-in-out infinite}
  .fh-lamp-glow{animation:fhLampGlow 3.2s ease-in-out infinite}
  .fh-schermo-pulse{animation:fhSchermoPulse 2.8s ease-in-out infinite}
  .fh-fiamma{animation:fhFiamma 1.8s ease-in-out infinite;transform-origin:24px 33px}
  .fh-fari-beam{animation:fhFariBeam 2.5s ease-in-out infinite}
  .fh-cono-luce{animation:fhConoLuce 3s ease-in-out infinite}
  .fh-impulso{animation:fhImpulsoFit 2.2s cubic-bezier(0,.2,.8,1) infinite;transform-origin:24px 24px}
  .fh-twinkle{animation:fhStellaTwinkle 2.6s ease-in-out infinite;transform-origin:center}
  .fh-dondola{animation:fhBrezza1 3.6s ease-in-out infinite}
  .fh-zzz{animation:fhSonnoM 3.2s ease-out infinite}
  @media (prefers-reduced-motion: reduce){
    .fh-vapore1,.fh-vapore2,.fh-goccia,.fh-ripple,.fh-cestello,.fh-bolla,.fh-foglia1,.fh-foglia2,.fh-lamp-glow,.fh-schermo-pulse,.fh-fiamma,.fh-fari-beam,.fh-cono-luce,.fh-impulso,.fh-twinkle,.fh-dondola,.fh-zzz{animation:none}
  }`;

// LE ICONE DELLA FUCINA.
// Non se ne fa una copia: si legge la stessa raccolta che usa Mini Card
// (\`faber_icone\` nelle preferenze del frontend). Un'icona disegnata col
// telefono si ritrova qui, e viceversa.
const FH_CHIAVE_ICONE = "faber_icone";
let FH_ICONE_MIE = null;
async function fhIconeCarica(hass, forza) {
  if (FH_ICONE_MIE && !forza) return FH_ICONE_MIE;
  try {
    const r = await hass.callWS({ type: "frontend/get_user_data", key: FH_CHIAVE_ICONE });
    const v = r && r.value;
    FH_ICONE_MIE = Array.isArray(v && v.icone) ? v.icone : [];
  } catch (e) {
    console.warn("[faber-home] raccolta icone non leggibile:", e);
    FH_ICONE_MIE = [];
  }
  return FH_ICONE_MIE;
}

const FH_SCENE = [
  ["camera", "Camera"],
  ["cameretta", "Cameretta"],
  ["sala", "Soggiorno"],
  ["cucina", "Cucina"],
  ["bagno", "Bagno"],
  ["lavatoio", "Lavanderia"],
  ["ufficio", "Studio / Ufficio"],
  ["giardino", "Giardino"],
  ["garage", "Garage / Auto"],
  ["ingresso", "Ingresso"],
  ["terrazzo", "Terrazzo / Balcone"],
  ["taverna", "Taverna / Camino"],
  ["cantina", "Cantina / Dispensa"],
  ["palestra", "Palestra"],
  ["porta", "Casa / Generale"],
];

// Dal nome o dall'icona si individua la scena animata della stanza.
// Con \`arte:\` impostato nella pagina si può forzare qualsiasi scena a mano.
function fhTipoStanza(pg) {
  if (pg.arte) return pg.arte;
  const i = String(pg.icon || "").toLowerCase();
  const n = String(pg.title || "").toLowerCase();
  const cerca = s => i.includes(s) || n.includes(s);
  if (cerca("letto") || cerca("bed") || cerca("camera") || cerca("notte") || cerca("padronale")) return "camera";
  if (cerca("bambin") || cerca("bimbi") || cerca("ragazz") || cerca("cameretta") || cerca("nursery") || cerca("kid")) return "cameretta";
  if (cerca("cucin") || cerca("kitchen") || cerca("cottura") || cerca("forno") || cerca("pranzo") || cerca("silverware") || cerca("countertop")) return "cucina";
  if (cerca("sofa") || cerca("sala") || cerca("soggiorno") || cerca("living") || cerca("salotto") || cerca("tv")) return "sala";
  if (cerca("shower") || cerca("toilet") || cerca("bagno") || cerca("bath") || cerca("doccia") || cerca("wc")) return "bagno";
  if (cerca("washing") || cerca("lavatoio") || cerca("bucato") || cerca("laundry") || cerca("lavanderia") || cerca("stiro")) return "lavatoio";
  if (cerca("desk") || cerca("ufficio") || cerca("office") || cerca("studio") || cerca("pc") || cerca("computer") || cerca("scrivania")) return "ufficio";
  if (cerca("flower") || cerca("giardino") || cerca("tree") || cerca("garden") || cerca("piant") || cerca("orto") || cerca("cortile")) return "giardino";
  if (cerca("garage") || cerca("box") || cerca("auto") || cerca("car") || cerca("parcheggio")) return "garage";
  if (cerca("ingresso") || cerca("corridoio") || cerca("entrata") || cerca("atrio") || cerca("hall") || cerca("disimpegno")) return "ingresso";
  if (cerca("terrazz") || cerca("balcon") || cerca("veranda") || cerca("patio")) return "terrazzo";
  if (cerca("taverna") || cerca("camino") || cerca("fuoco") || cerca("rustico")) return "taverna";
  if (cerca("cantina") || cerca("dispensa") || cerca("wine") || cerca("vini") || cerca("deposito")) return "cantina";
  if (cerca("palestra") || cerca("gym") || cerca("fitness") || cerca("sport")) return "palestra";
  return "porta";
}

function fhArteStanza(tipo, s) {
  const w = `width="${s}" height="${s}" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
  const scene = {
    camera: `
      <rect x="7" y="24" width="34" height="12" rx="3" fill="currentColor" opacity=".12" stroke="none"/>
      <path d="M9 36v-15a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v15"/>
      <rect x="12" y="23" width="9" height="5" rx="2" stroke-width="1.6"/>
      <rect x="27" y="23" width="9" height="5" rx="2" stroke-width="1.6"/>
      <path d="M7 29h34a2 2 0 0 1 2 2v5H5v-5a2 2 0 0 1 2-2z"/>
      <path d="M7 36v3M41 36v3"/>
      <path d="M37 15v-4M34 11h6" stroke-width="1.6"/>
      <polygon class="fh-lamp-glow an" points="37 11 31 18 43 18" fill="currentColor" opacity=".35" stroke="none"/>
      <path class="fh-zzz" style="animation-delay:0s" d="M19 14h4l-4 4h4" stroke-width="1.6" opacity=".9"/>
      <path class="fh-zzz" style="animation-delay:1.3s" d="M23 9h3l-3 3h3" stroke-width="1.4" opacity=".7"/>`,
    cameretta: `
      <path d="M8 36v-8a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v2M19 30h14a3 3 0 0 1 3 3v3"/>
      <path d="M6 36h34"/><path d="M10 36v3M38 36v3"/>
      <rect x="10" y="25" width="6" height="4" rx="1.8" fill="currentColor" opacity=".22" stroke="none"/>
      <path class="fh-dondola an" style="transform-origin:33px 12px" d="M30 8a5.5 5.5 0 1 0 6.5 6.5A4.5 4.5 0 0 1 30 8z" fill="currentColor" opacity=".3"/>
      <polygon class="fh-twinkle an" points="19,10 20.5,13.5 24,14 21.2,16.5 22,20 19,18.2 16,20 16.8,16.5 14,14 17.5,13.5" fill="currentColor" opacity=".85" stroke="none"/>
      <circle class="fh-twinkle an" style="animation-delay:1s" cx="37" cy="18" r="1.5" fill="currentColor" stroke="none"/>`,
    sala: `
      <rect x="8" y="25" width="32" height="10" rx="3" fill="currentColor" opacity=".12" stroke="none"/>
      <path d="M8 29v-5a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v5"/>
      <path d="M6 25a3 3 0 0 1 3-3v12H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 1-2zm36 0a3 3 0 0 0-3-3v12h2a2 2 0 0 0 2-2v-5a2 2 0 0 0-1-2z"/>
      <path d="M24 22v12"/><path d="M10 35l-1.5 3M38 35l1.5 3"/>
      <rect x="15" y="8" width="18" height="11" rx="2" stroke-width="1.8"/>
      <rect class="fh-schermo-pulse" x="16" y="9" width="16" height="9" rx="1.5" fill="currentColor" opacity=".3" stroke="none"/>
      <path d="M24 19v2M20 21h8" stroke-width="1.5"/>`,
    cucina: `
      <path d="M8 38h32"/><path d="M14 38v2M34 38v2"/>
      <path d="M13 24h22l-1.8 11.5a3 3 0 0 1-3 2.5H17.8a3 3 0 0 1-3-2.5L13 24z"/>
      <path d="M14 25h20l-1.6 10a2 2 0 0 1-2 2H17.6a2 2 0 0 1-2-2L14 25z" fill="currentColor" opacity=".15" stroke="none"/>
      <path d="M13 27H9a2 2 0 0 1 0-4h4M35 27h4a2 2 0 0 0 0-4h-4"/>
      <path d="M11 24h26"/><path d="M24 21v3"/><circle cx="24" cy="20" r="1.5" fill="currentColor"/>
      <path class="fh-vapore1" d="M19 18c0-3 2.5-3 2.5-6" stroke-width="1.8" opacity=".85"/>
      <path class="fh-vapore2" d="M24 17c0-3.5 3-3.5 3-7.5" stroke-width="1.8" opacity=".9"/>
      <path class="fh-vapore1" style="animation-delay:1.1s" d="M29 18c0-3 2.5-3 2.5-6" stroke-width="1.8" opacity=".85"/>
      <ellipse class="fh-schermo-pulse" cx="24" cy="38" rx="8" ry="1.5" fill="currentColor" opacity=".35" stroke="none"/>`,
    bagno: `
      <path d="M12 40V12a4 4 0 0 1 4-4h14a3 3 0 0 1 3 3v3"/>
      <path d="M25 14h16a2 2 0 0 1 2 2v1H23v-1a2 2 0 0 1 2-2z" fill="currentColor" opacity=".25"/>
      <circle class="fh-goccia" style="animation-delay:0s" cx="27" cy="19" r="1.5" fill="currentColor" stroke="none"/>
      <circle class="fh-goccia" style="animation-delay:.5s" cx="32" cy="19" r="1.5" fill="currentColor" stroke="none"/>
      <circle class="fh-goccia" style="animation-delay:1.1s" cx="37" cy="19" r="1.5" fill="currentColor" stroke="none"/>
      <circle class="fh-goccia" style="animation-delay:.8s" cx="29.5" cy="21" r="1.3" fill="currentColor" stroke="none"/>
      <circle class="fh-goccia" style="animation-delay:1.4s" cx="34.5" cy="21" r="1.3" fill="currentColor" stroke="none"/>
      <path d="M9 40h30a3 3 0 0 0 3-3v-5H6v5a3 3 0 0 0 3 3z" fill="currentColor" opacity=".12"/>
      <ellipse class="fh-ripple" cx="32" cy="35" rx="8" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    lavatoio: `
      <rect x="10" y="8" width="28" height="34" rx="5"/>
      <rect x="10" y="8" width="28" height="34" rx="5" fill="currentColor" opacity=".1" stroke="none"/>
      <path d="M14 13h8"/><circle cx="31" cy="13" r="1.8" fill="currentColor" stroke="none"/>
      <circle cx="24" cy="27" r="9.5" stroke-width="2"/>
      <circle cx="24" cy="27" r="8" stroke-width="0.8" opacity=".35"/>
      <g class="fh-cestello" style="transform-box:view-box;transform-origin:24px 27px">
        <circle cx="24" cy="27" r="6.8" stroke-width="1.2" opacity=".6" fill="currentColor" fill-opacity=".08"/>
        <circle cx="24" cy="27" r="5" fill="none" stroke="currentColor" stroke-dasharray="1.2 2" stroke-width="1" opacity=".55"/>
        <circle cx="24" cy="27" r="3.2" fill="none" stroke="currentColor" stroke-dasharray="1 1.8" stroke-width="0.8" opacity=".45"/>
        <g transform="translate(24 27)">
          <rect x="-0.8" y="-6.2" width="1.6" height="3.5" rx="0.7" fill="currentColor" stroke="none"/>
          <rect x="-0.8" y="-6.2" width="1.6" height="3.5" rx="0.7" fill="currentColor" stroke="none" transform="rotate(120)"/>
          <rect x="-0.8" y="-6.2" width="1.6" height="3.5" rx="0.7" fill="currentColor" stroke="none" transform="rotate(240)"/>
        </g>
        <circle cx="24" cy="27" r="1.5" fill="currentColor" stroke="none"/>
      </g>
      <circle class="fh-bolla" style="animation-delay:0s" cx="33" cy="21" r="1.8" stroke-width="1.3" fill="currentColor" opacity=".25"/>
      <circle class="fh-bolla" style="animation-delay:1.2s" cx="29" cy="22" r="1.2" stroke-width="1.2" fill="currentColor" opacity=".25"/>`,
    ufficio: `
      <path d="M6 34h36"/><path d="M10 34v6M38 34v6"/><rect x="29" y="35" width="9" height="5" rx="1" stroke-width="1.4"/>
      <rect x="15" y="14" width="18" height="13" rx="2.5"/><path d="M24 27v7M20 34h8"/>
      <rect class="fh-schermo-pulse" x="16.5" y="15.5" width="15" height="10" rx="1.5" fill="currentColor" opacity=".25" stroke="none"/>
      <path d="M18 18h6M18 21h10M18 24h7" stroke-width="1.3" opacity=".7"/>
      <path d="M10 34V24l7-7M17 17l4 2" stroke-width="1.6"/>
      <polygon class="fh-lamp-glow an" points="20 18 25 25 18 24" fill="currentColor" opacity=".4" stroke="none"/>`,
    giardino: `
      <path d="M17 38l2-12h10l2 12a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2z"/><path d="M16 26h16" stroke-width="2.2"/>
      <path d="M18 38l1.7-11h8.6l1.7 11a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1z" fill="currentColor" opacity=".14" stroke="none"/>
      <path d="M24 26V13"/>
      <g class="fh-foglia1 an" style="transform-origin:24px 22px"><path d="M24 22c-7-1-10-6-10-12 7 1 10 6 10 12z" fill="currentColor" opacity=".25"/><path d="M24 22c-7-1-10-6-10-12 7 1 10 6 10 12z"/><path d="M24 16c-3-1-5-2-7-3" stroke-width="1.4"/></g>
      <g class="fh-foglia2 an" style="transform-origin:24px 18px"><path d="M24 18c7-1 10-6 10-11-7 1-10 6-10 11z" fill="currentColor" opacity=".25"/><path d="M24 18c7-1 10-6 10-11-7 1-10 6-10 11z"/><path d="M24 13c3-1 5-2 7-3" stroke-width="1.4"/></g>
      <circle class="fh-lamp-glow an" cx="37" cy="11" r="5" fill="currentColor" opacity=".25" stroke="none"/><circle cx="37" cy="11" r="3.5"/>`,
    garage: `
      <path d="M6 40V11a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v29"/><path d="M6 14h36M6 19h36" stroke-width="1.5" opacity=".4"/>
      <path d="M12 37l2-8a3 3 0 0 1 3-2h14a3 3 0 0 1 3 2l2 8"/>
      <rect x="11" y="32" width="26" height="6" rx="3"/><circle cx="16" cy="38" r="2.5"/><circle cx="32" cy="38" r="2.5"/>
      <polygon class="fh-fari-beam an" points="12 34 4 39 16 39" fill="currentColor" opacity=".35" stroke="none"/>
      <polygon class="fh-fari-beam an" points="36 34 32 39 44 39" fill="currentColor" opacity=".35" stroke="none"/>
      <circle cx="14" cy="34" r="1.5" fill="currentColor" stroke="none"/><circle cx="34" cy="34" r="1.5" fill="currentColor" stroke="none"/>`,
    ingresso: `
      <rect x="13" y="9" width="22" height="31" rx="2.5"/>
      <rect x="13" y="9" width="22" height="31" rx="2.5" fill="currentColor" opacity=".1" stroke="none"/>
      <path d="M19 13h10v10H19z" stroke-width="1.6" opacity=".5"/>
      <path d="M17 20v9" stroke-width="2.6"/><path d="M8 40h32"/>
      <polygon class="fh-cono-luce an" points="24 6 11 40 37 40" fill="currentColor" opacity=".2" stroke="none"/>
      <circle cx="24" cy="7" r="2" fill="currentColor" stroke="none"/>`,
    terrazzo: `
      <path d="M6 28h36M6 39h36M11 28v11M19 28v11M27 28v11M35 28v11" stroke-width="1.7"/>
      <path d="M9 28l5-8h7l3 8"/><path d="M11 32h14"/>
      <circle class="fh-lamp-glow an" cx="35" cy="12" r="5" fill="currentColor" opacity=".25" stroke="none"/><circle cx="35" cy="12" r="3.5"/>
      <path class="fh-foglia1 an" d="M18 11c5-2 9 0 12-1" stroke-width="1.5" opacity=".7"/>
      <path class="fh-foglia2 an" d="M14 15c4-2 8 0 11-1" stroke-width="1.4" opacity=".5"/>`,
    taverna: `
      <path d="M9 39V16a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v23"/><path d="M6 39h36"/><path d="M15 39V25a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"/>
      <rect x="8" y="13" width="32" height="4" rx="1.5"/>
      <path d="M18 36l12-3M18 33l12 3" stroke-width="2"/>
      <path class="fh-fiamma an" d="M24 22c-3 3-5 5-5 8a5 5 0 0 0 10 0c0-3-2-5-5-8z" fill="currentColor" opacity=".4" stroke="none"/>
      <path class="fh-fiamma an" style="animation-delay:.4s" d="M24 25c-1.5 2-2.5 3-2.5 5a2.5 2.5 0 0 0 5 0c0-2-1-3-2.5-5z" fill="currentColor" opacity=".75" stroke="none"/>`,
    cantina: `
      <path d="M7 39h34M7 16h13" stroke-width="1.8"/>
      <path d="M12 39V22l2-4v-4h4v4l2 4v17a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2z"/><rect x="12" y="24" width="8" height="12" fill="currentColor" opacity=".15" stroke="none"/>
      <path d="M14 26h4M14 30h4" stroke-width="1.3"/>
      <path d="M26 24c0 4 3 6 5 6s5-2 5-6h-10z"/><path d="M31 30v7M28 37h6"/>
      <path d="M27 26c2 1 6 1 8 0" stroke-width="1.4" opacity=".7"/>
      <circle class="fh-twinkle an" cx="34" cy="22" r="1.4" fill="currentColor" stroke="none"/>`,
    palestra: `
      <path d="M17 24h14" stroke-width="3.5"/>
      <rect x="13" y="16" width="4" height="16" rx="2"/>
      <rect x="9" y="19" width="4" height="10" rx="1.5"/>
      <rect x="31" y="16" width="4" height="16" rx="2"/>
      <rect x="35" y="19" width="4" height="10" rx="1.5"/>
      <circle class="fh-impulso an" cx="24" cy="24" r="15" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".3"/>
      <path class="fh-schermo-pulse" d="M16 38l3-3 2 4 4-7 3 5 4-2" stroke-width="1.7"/>`,
    porta: `
      <path d="M8 22L24 9l16 13"/><rect x="12" y="22" width="24" height="17" rx="1"/>
      <rect x="20" y="27" width="8" height="12" rx="1"/><circle cx="26" cy="33" r="1" fill="currentColor" stroke="none"/>
      <rect class="fh-schermo-pulse" x="14" y="25" width="4" height="5" rx="1" fill="currentColor" opacity=".35" stroke="none"/>
      <rect class="fh-schermo-pulse" x="30" y="25" width="4" height="5" rx="1" fill="currentColor" opacity=".35" stroke="none"/>
      <path d="M6 39h36"/>`,
  };
  return `<svg ${w}>${scene[tipo] || scene.porta}</svg>`;
}

// I watt si leggono a colpo d'occhio solo se non sono mai piu di quattro
// cifre: sotto il chilowatt restano watt interi, sopra diventano kW con la
// virgola. "1450 W" e "1,45 kW" dicono la stessa cosa, ma il secondo si legge.
function fhNumW(w) {
  const v = Number(w) || 0;
  if (Math.abs(v) < 1000) return Math.round(v) + " W";
  return (v / 1000).toFixed(v < 10000 ? 2 : 1).replace(".", ",") + " kW";
}

// Confronto fra nomi scritti da persone diverse: "Camera da letto" e
// "camera_da_letto" sono la stessa stanza.
function fhNorm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}


// I watt di un sensore, qualunque unita dichiari. Alcune integrazioni danno
// kW (l'autoclave scrive "Kw", con la maiuscola a meta): senza conversione
// 0,8 kW diventava "1 W". Null se il sensore non c'e o non e un numero.
// LE FASI DELLA LUNA. Nome e disegno, gli stessi che usa Home Assistant.
const FH_FASI_LUNA = {
  new_moon: ["Luna nuova", "mdi:moon-new"],
  waxing_crescent: ["Luna crescente", "mdi:moon-waxing-crescent"],
  first_quarter: ["Primo quarto", "mdi:moon-first-quarter"],
  waxing_gibbous: ["Gibbosa crescente", "mdi:moon-waxing-gibbous"],
  full_moon: ["Luna piena", "mdi:moon-full"],
  waning_gibbous: ["Gibbosa calante", "mdi:moon-waning-gibbous"],
  last_quarter: ["Ultimo quarto", "mdi:moon-last-quarter"],
  waning_crescent: ["Luna calante", "mdi:moon-waning-crescent"],
};

// La luna di stanotte: si cerca da se il sensore delle fasi (l'integrazione
// Luna di Home Assistant ne fa uno solo). Se non c'e, resta la mezzaluna
// generica di sempre, che non e sbagliata: e solo generica.
function fhLunaOra(hass, scelto) {
  const st = hass && hass.states;
  if (!st) return { nome: "Notte", icona: "mdi:weather-night" };
  const id = (scelto && st[scelto]) ? scelto
    : Object.keys(st).find(e => e.startsWith("sensor.") && FH_FASI_LUNA[st[e].state]);
  const f = id && FH_FASI_LUNA[st[id].state];
  return f ? { nome: f[0], icona: f[1] } : { nome: "Notte", icona: "mdi:weather-night" };
}

function fhWatt(st) {
  if (!st) return null;
  const n = parseFloat(st.state);
  if (isNaN(n)) return null;
  const u = String((st.attributes && st.attributes.unit_of_measurement) || "").toLowerCase();
  // Ma l'unita dichiarata a volte MENTE: l'autoclave (LocalTuya) scrive "Kw"
  // e manda 676,8, che sono watt. Moltiplicando si arrivava a 676 kW, una
  // potenza da capannone industriale. In casa nessun apparecchio singolo
  // supera i 30 kW: sopra quella soglia il numero e gia in watt.
  return u === "kw" && n <= 30 ? n * 1000 : n;
}

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
        cardStyle: ap.cardStyle === "vetro" ? "vetro" : "piene",
        cardTrasparenza: Math.max(10, Math.min(95,
          ap.cardTrasparenza == null ? 40 : parseInt(ap.cardTrasparenza, 10) || 40)),
        cardBlur: Math.max(0, Math.min(30,
          ap.cardBlur == null ? 16 : parseInt(ap.cardBlur, 10) || 16)),
        temaFisso: ["giorno", "notte"].includes(ap.temaFisso) ? ap.temaFisso : "auto",
        skyIntensity: Math.max(0, Math.min(100,
          ap.skyIntensity == null ? 70 : parseInt(ap.skyIntensity, 10) || 0)),
        sidebar: ap.sidebar || "mai",
        autoTheme: Object.assign({}, FH_DEFAULTS.appearance.autoTheme, ap.autoTheme || {}),
      },
      header: Object.assign({}, FH_DEFAULTS.header, src.header || {},
        { chips: ((src.header && src.header.chips) || []).map(c => Object.assign({}, c)) }),
      pages: (src.pages && src.pages.length ? src.pages : FH_DEFAULTS.pages).map(p => Object.assign({}, p)),
    });
    // Dopo un salvataggio Home Assistant riconsegna la configurazione e
    // richiama questo metodo: azzerando la pagina qui, si finiva sbalzati
    // sulla Home ogni volta che si salvava qualcosa. Si torna dov'eri,
    // ritrovando la pagina per NOME e non per numero (le pagine si possono
    // spostare o cancellare mentre modifichi).
    // Dopo un salvataggio Home Assistant non richiama questo metodo sullo
    // stesso elemento: ne costruisce uno NUOVO. Ricordarsi la pagina in una
    // proprieta dell'oggetto quindi non serve a niente - il nuovo nasce
    // smemorato ed e per questo che si finiva sbalzati sulla Home.
    // La pagina vive nell'indirizzo (#clima): sopravvive alla ricostruzione,
    // torna indietro col tasto del browser e si puo mandare a qualcuno.
    const pagine = this._cfg.pages;
    const voluta = this._pageId || decodeURIComponent((location.hash || "").slice(1));
    let torna = 0;
    if (voluta) {
      const i = pagine.findIndex(pg => pg.id === voluta);
      if (i >= 0) torna = i;
    }
    this._page = torna;
    this._pageId = pagine[torna] ? pagine[torna].id : null;
    this._built = false;
    this._cardEls = new Map();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) { this._built = true; this._build(); }
    else { this._updateLive(); }
    // Le card figlie sono card HA vere: vogliono l'oggetto hass a ogni giro.
    this._cardEls.forEach(el => { el.hass = hass; });
    this._controllaAnomalie();
    this._controllaNuoviApparecchi();
  }

  getCardSize() { return 20; }

  connectedCallback() {
    if (this._skyfx) this._skyfx.start();
    this._startClock();
    this._watchTheme();
    // Una card che porta a una pagina cambia solo l'indirizzo. Se il pannello
    // e gia aperto nessuno lo rimonta, quindi senza stare in ascolto il tocco
    // non farebbe assolutamente nulla.
    if (!this._ascoltoHash) {
      this._ascoltoHash = () => {
        // Puo scattare prima che la configurazione sia arrivata: senza questo
        // controllo sarebbe un errore silenzioso al primo caricamento.
        if (!this._cfg || !this._cfg.pages) return;
        const voluta = decodeURIComponent((location.hash || "").slice(1));
        if (!voluta || voluta === this._pageId) return;
        const i = this._cfg.pages.findIndex(pg => pg.id === voluta);
        if (i >= 0 && i !== this._page) {
          this._page = i;
          this._pageId = voluta;
          this._renderNav();
          this._renderPage();
          this._inCima();
          this._updateChips();
        }
      };
      window.addEventListener("hashchange", this._ascoltoHash);
      window.addEventListener("location-changed", this._ascoltoHash);
    }
  }
  _fermaTutto() {
    if (this._onResizeFinestra) {
      window.removeEventListener("resize", this._onResizeFinestra);
      window.removeEventListener("orientationchange", this._onResizeFinestra);
      this._onResizeFinestra = null;
    }
    if (this._skyfx) this._skyfx.stop();
    if (this._themeTimer) { clearInterval(this._themeTimer); this._themeTimer = null; }
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  }

  // Tema: se il tema automatico è acceso decide l'orario (chiaro da dayStart,
  // scuro da nightStart, con la notte che può scavalcare la mezzanotte);
  // altrimenti si segue quello di Home Assistant.
  _isDark() {
    // La scelta fissa viene prima di tutto: degli orari e del tema di Home
    // Assistant. E' un interruttore, non un suggerimento.
    const fisso = (this._cfg.appearance || {}).temaFisso;
    if (fisso === "notte") return true;
    if (fisso === "giorno") return false;
    const at = this._cfg.appearance.autoTheme;
    if (!at || at.enabled === false) return !!(this._hass && this._hass.themes && this._hass.themes.darkMode);
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const day = fhHm(at.dayStart, 7 * 60);
    const night = fhHm(at.nightStart, 21 * 60);
    return day <= night ? (cur < day || cur >= night) : (cur >= night && cur < day);
  }
  _sky() { return FH_SKY[this._isDark() ? "dark" : "light"]; }

  // Da 0..100 a 0..1. Il cielo lo usa per diradare le particelle e per
  // stringere lo scintillio: un solo cursore governa tutte e due, senno si
  // finisce con due manopole che fanno "quasi" la stessa cosa.
  _forzaCielo() {
    const v = (this._cfg.appearance || {}).skyIntensity;
    return Math.max(0, Math.min(100, v == null ? 70 : v)) / 100;
  }

  _meteoAdesso() {
    const h = this._cfg.header || {};
    const hs = this._hass && this._hass.states;
    const a = h.weather_attuale && hs ? hs[h.weather_attuale] : null;
    if (a && !["unknown", "unavailable"].includes(a.state)) return h.weather_attuale;
    return h.weather;
  }

  _weatherMode() {
    if (!this._cfg.appearance.weatherAnimation) return null;
    const w = this._meteoAdesso();
    const st = w && this._hass ? this._hass.states[w] : null;
    const dark = this._isDark();
    if (!st) return dark ? "stars" : "motes";
    const mode = FH_SKY_MODES[st.state] || (dark ? "stars" : "motes");
    if (!dark && mode === "stars") return "motes";
    if (dark && mode === "motes") return "stars";
    return mode;
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
    const w = this._meteoAdesso();
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
      this._skyfx.setScene(this._weatherMode(), this._isDark(), this._forzaCielo());
      if (rebuild) this._skyfx.draw(performance.now() / 1000);
    }
    // La classe "chiaro" decide i colori di TUTTE le card (vetro, inchiostro,
    // titoli del meteo...): la mette _segnaFascia(), non questo metodo. Senza
    // questa chiamata, il cielo cambiava tema (bottone giorno/notte, cambio
    // automatico alle 07/21) ma le card restavano vestite col tema vecchio:
    // testo chiaro pensato per il vetro scuro sopra un vetro ormai chiaro,
    // illeggibile. I due dovevano cambiare insieme, non con due percorsi.
    this._segnaFascia();
  }

  _startClock() {
    if (this._timer) clearInterval(this._timer);
    const sec = this._cfg && this._cfg.header.seconds;
    this._timer = setInterval(() => {
      const t = this.querySelector("[data-clock]"); if (t) t.textContent = this._timeText();
      const d = this.querySelector("[data-date]"); if (d) d.textContent = this._dateText();
      // Il saluto cambia con l'ora del giorno, non con lo stato della casa:
      // se non lo si rinfresca qui, alle 13 dice ancora "Buongiorno".
      this._aggiornaSaluto();
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

  // =========================================================================
  // SALUTO E CONTESTO
  // Sotto l'orologio c'era solo la data. Su un telefono quella riga puo dire
  // le tre cose che si vorrebbero sapere senza toccare niente: che ora della
  // giornata e, che tempo fa fuori, e se stasera c'e da fare qualcosa.
  // I rifiuti NON si riconfigurano: si legge il calendario che e gia scritto
  // nella card Rifiuti, con la stessa regola (prima delle 5 conta oggi, dopo
  // conta domani sera).
  // =========================================================================
  _salutoCfg() {
    const s = (this._cfg.header && this._cfg.header.saluto) || {};
    return {
      attivo: !!s.attivo,
      nome: s.nome || "",
      meteo: s.meteo !== false,
      sole: s.sole !== false,
      rifiuti: s.rifiuti !== false,
    };
  }

  // Le card robot che ci sono nel pannello: servono per sapere quali robot
  // guardare senza chiederlo di nuovo.
  _cardRobot() {
    const out = [];
    const gira = v => {
      if (!v) return;
      if (Array.isArray(v)) { v.forEach(gira); return; }
      if (typeof v === "object") {
        if (v.type === "custom:faber-robot" && v.entity) out.push(v);
        Object.keys(v).forEach(k => gira(v[k]));
      }
    };
    gira(this._cfg.pages);
    return out;
  }

  _rifiutiSaluto() {
    let conf = null;
    const gira = v => {
      if (conf || !v) return;
      if (Array.isArray(v)) { v.forEach(gira); return; }
      if (typeof v === "object") {
        if (v.type === "custom:faber-rifiuti" && v.calendario) { conf = v; return; }
        Object.keys(v).forEach(k => gira(v[k]));
      }
    };
    gira(this._cfg.pages);
    if (!conf) return "";
    const giorni = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const ora = new Date().getHours();
    const d = new Date();
    if (ora >= 5) d.setDate(d.getDate() + 1);
    const testo = (conf.calendario || {})[giorni[d.getDay()]] || "";
    if (!testo) return ora < 5 ? "" : "stasera niente rifiuti";
    return (ora < 5 ? "stamattina passa " : "stasera esponi ") + String(testo).toLowerCase();
  }

  _salutoText() {
    const c = this._salutoCfg();
    if (!c.attivo) return "";
    const hass = this._hass;
    const h = new Date().getHours();
    const parte = h < 5 ? "Buonanotte" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : h < 23 ? "Buonasera" : "Buonanotte";
    const pezzi = [parte + (c.nome ? " " + c.nome : "")];
    if (c.meteo && hass) {
      const w = this._meteoAdesso();
      const st = w && hass.states[w];
      if (st) {
        const gr = st.attributes.temperature;
        // Di notte "sereno" diventa "notte serena": la funzione della card
        // meteo lo sa gia fare, si riusa quella se c'e.
        const stato = typeof fwStatoOra === "function" ? fwStatoOra(hass, st.state) : st.state;
        const cond = FH_WEATHER_IT[stato] || FH_WEATHER_IT[st.state] || st.state;
        pezzi.push((gr != null ? Math.round(gr) + "\u00b0, " : "") + String(cond).toLowerCase());
      }
    }
    if (c.sole && hass && hass.states["sun.sun"]) {
      const s = hass.states["sun.sun"];
      const su = s.state === "above_horizon";
      const q = su ? s.attributes.next_setting : s.attributes.next_rising;
      const d = q ? new Date(q) : null;
      if (d && !isNaN(d)) {
        const p = v => String(v).padStart(2, "0");
        pezzi.push((su ? "tramonto " : "alba ") + p(d.getHours()) + ":" + p(d.getMinutes()));
      }
    }
    if (c.rifiuti) {
      const r = this._rifiutiSaluto();
      if (r) pezzi.push(r);
    }
    return pezzi.join(" \u00b7 ");
  }

  _aggiornaSaluto() {
    const el = this.querySelector("[data-saluto]");
    if (!el) return;
    const testo = this._salutoText();
    el.hidden = !testo;
    if (el.textContent !== testo) el.textContent = testo;
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
            <button type="button" class="fh-ic" data-act="tema" data-tema="${fhEsc(this._cfg.appearance.temaFisso || "auto")}"
              title="${fhTitoloTema(this._cfg.appearance.temaFisso, this._isDark())}">
              <ha-icon icon="${this._isDark() ? fhLunaOra(this._hass, this._cfg.luna).icona : "mdi:white-balance-sunny"}"></ha-icon></button>
            <button type="button" class="fh-ic" data-act="reload" title="Ricarica"><ha-icon icon="mdi:refresh"></ha-icon></button>
            </div>
          </div>
          <div class="fh-saluto" data-saluto></div>
          <div class="fh-chips" data-chips>${this._chipsHTML()}</div>
        </header>
        <main class="fh-main" data-main></main>
        <nav class="fh-nav" data-nav></nav>
      </div>`;

    const canvas = this.querySelector(".fh-bg");
    if (canvas) {
      this._skyfx = new FhSky(canvas);
      this._skyfx.setScene(this._weatherMode(), this._isDark(), this._forzaCielo());
      // Il canvas parte a dimensione zero finché il pannello non è disposto:
      // si misura quando cambia davvero, non una volta sola alla creazione.
      this._ro = new ResizeObserver(() => { this._skyfx.resize(); this._skyfx.draw(0); });
      this._ro.observe(canvas);
      this._skyfx.start();
      // Il canvas e fisso allo schermo: quando la finestra cambia (rotazione
      // del telefono, tastiera che si apre) va rimisurato, perche il
      // ResizeObserver su un elemento fisso puo non accorgersene.
      this._onResizeFinestra = () => { this._skyfx.resize(); this._skyfx.draw(0); };
      window.addEventListener("resize", this._onResizeFinestra);
      window.addEventListener("orientationchange", this._onResizeFinestra);
      // Una misura subito e una appena la pagina si e sistemata: senza, il
      // primo giro puo cadere su un riquadro ancora a zero.
      this._skyfx.resize();
      requestAnimationFrame(() => { this._skyfx.resize(); this._skyfx.draw(0); });
    }
    this._applyScene(false);
    this._watchTheme();
    this.querySelectorAll(".fh-ic").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.act === "cfg") this._openSettings();
      else if (b.dataset.act === "edit") this._toggleEdit();
      else if (b.dataset.act === "tema") {
        // Gira fra tre: automatico -> il contrario di adesso -> l'altro ->
        // di nuovo automatico. Cosi il primo tocco fa sempre cambiare
        // qualcosa (se restasse su "auto" sembrerebbe rotto) e in tre tocchi
        // si torna al punto di partenza.
        const ap = this._cfg.appearance;
        const ora = ap.temaFisso || "auto";
        ap.temaFisso = ora === "auto" ? (this._isDark() ? "giorno" : "notte")
          : ora === "notte" ? "giorno" : "auto";
        fhVibra(8);
        this._applyScene(true);
        // Solo il tasto, non tutta l'intestazione: qui dentro ci sono
        // l'orologio e i chip, che non hanno motivo di essere ricostruiti.
        const scuro = this._isDark();
        b.dataset.tema = ap.temaFisso;
        b.title = fhTitoloTema(ap.temaFisso, scuro);
        const ic = b.querySelector("ha-icon");
        if (ic) ic.setAttribute("icon", scuro ? fhLunaOra(this._hass, this._cfg.luna).icona : "mdi:white-balance-sunny");
        this._save(true);
      }
      else if (b.dataset.act === "reload") location.reload();
    }));
    // I tocchi sui chip si collegavano solo quando l'elenco dei chip cambiava
    // (passando a una pagina con i chip della stanza): appena aperto il
    // pannello, sulla Casa, nessun chip rispondeva — "Dispositivi" compreso.
    this._wireChips();
    this._renderNav();
    this._renderPage();
    this._startClock();
  }

  // Scorre le card di una pagina e raccoglie le entita che nominano. Serve a
  // due cose: contare cosa e acceso, e trovare da solo il termometro di una
  // stanza senza che nessuno debba configurarlo.
  _entitaDiPagina(id, chiavi) {
    const pg = this._cfg.pages.find(p => p.id === id);
    const out = [];
    if (!pg) return out;
    const gira = c => {
      if (!c || typeof c !== "object") return;
      chiavi.forEach(k => { if (typeof c[k] === "string" && c[k].includes(".")) out.push(c[k]); });
      ["cards", "rows", "cols"].forEach(k => { if (Array.isArray(c[k])) c[k].forEach(gira); });
    };
    (pg.rows || []).forEach(gira);
    return out;
  }
  _contaAccesiPagina(id) {
    const hass = this._hass;
    if (!hass) return 0;
    const ent = this._entitaDiPagina(id, ["climate", "switch", "entity"]);
    // Il clima di una stanza sta nella sua pagina Clima (tasto nella barra),
    // non piu fra le card della stanza: conta lo stesso, senno il riquadro
    // della stanza non si accende col condizionatore acceso.
    const pg = (this._cfg.pages || []).find(p => p.id === id);
    (pg && pg.barra || []).filter(b => /^clima_/.test(b)).forEach(b => {
      ent.push(...this._entitaDiPagina(b, ["climate", "entity"]));
    });
    let n = 0;
    [...new Set(ent)].forEach(e => {
      const st = hass.states[e];
      if (!st) return;
      if (e.startsWith("climate.")) { if (!["off", "unavailable", "unknown"].includes(st.state)) n++; }
      else if (["on", "open", "unlocked"].includes(st.state)) n++;
    });
    return n;
  }
  // Il termometro della stanza: prima il sensore configurato a mano (pg.temp),
  // poi quello rilevato dal clima di stanza, poi dalle sue card escludendo le batterie.
  _tempDiPagina(id) {
    const hass = this._hass;
    if (!hass) return null;
    const pg = (this._cfg && this._cfg.pages || []).find(p => p.id === id);
    if (pg && (pg.temp || pg.temperature)) {
      const ent = pg.temp || pg.temperature;
      const st = hass.states[ent];
      const v = st ? parseFloat(st.state) : NaN;
      if (!isNaN(v)) return v;
    }
    if (pg) {
      const cs = this._climaStanza(pg);
      if (cs && cs.temp != null) {
        const v = parseFloat(cs.temp);
        if (!isNaN(v)) return v;
      }
    }
    const ent = this._entitaDiPagina(id, ["temp"]);
    for (const e of [...new Set(ent)]) {
      const st = hass.states[e];
      const dc = st && st.attributes && st.attributes.device_class;
      if (dc === "battery" || e.includes("battery") || e.includes("batteria")) continue;
      const v = st ? parseFloat(st.state) : NaN;
      if (!isNaN(v)) return v;
    }
    return null;
  }

  _consumoDiPagina(pg) {
    if (!pg) return 0;
    const d = this._consumoDati(pg);
    return (d && d.tot > 0) ? d.tot : 0;
  }

  // =========================================================================
  // SERVE QUALCOSA?
  // La Home rispondeva a "com'e casa"; non rispondeva a "devo fare qualcosa?".
  // Per saperlo bisognava leggere tutte le tessere una per una. Questa fascia
  // dice SOLO cio che e fuori posto — e quando non c'e niente lo dice in una
  // riga sola e si toglie di mezzo.
  // Niente indovinelli: le regole le scrive Cristian (entita, quando, testo),
  // piu due controlli automatici che si accendono a parte (batterie scariche e
  // dispositivi che non rispondono).
  // =========================================================================

  // =========================================================================
  // AZIONI RAPIDE (la fila sopra la barra)
  // Le cose che si fanno davvero — esco, buonanotte, apri il cancello — erano
  // sparse in tessere diverse, e alcune in fondo allo scorrimento: sul
  // telefono e il punto piu scomodo, il pollice non ci arriva. Qui stanno
  // attaccate alla barra, dove la mano gia si trova.
  // Stanno DENTRO il contenitore della barra apposta: l'altezza della barra e
  // gia misurata e sottratta alla pagina, quindi accendendole o spegnendole lo
  // spazio sotto si aggiusta da solo, senza numeri scritti a mano.
  // =========================================================================
  // =========================================================================
  // SCORRERE DI LATO PER CAMBIARE PAGINA
  // Il gesto che ci si aspetta da un'app. Due accortezze, se no da fastidio:
  // 1. si decide DOPO qualche pixel se il dito sta andando di lato o in giu —
  //    finche non e chiaro non si tocca niente, cosi lo scorrimento normale
  //    della pagina resta intatto;
  // 2. le cose che scorrono per conto loro (le chip, il radar della pioggia,
  //    la fila delle azioni) si tengono il gesto: li dentro non si cambia
  //    pagina.
  // =========================================================================
  _wireSwipe(main) {
    if (!main || main.__swipe) return;
    main.__swipe = true;
    const scorrevoli = ".fh-chips,.fh-attriga,.fh-azriga,.fh-navbar,.fw-rvista,.frb-chips,.fh-stanzegrid,[data-noswipe]";
    let x0 = 0, y0 = 0, t0 = 0, deciso = 0;  // 0 = non si sa, 1 = di lato, -1 = in giu
    main.addEventListener("touchstart", e => {
      if (e.touches.length !== 1) { deciso = -1; return; }
      const dentro = e.target && e.target.closest && e.target.closest(scorrevoli);
      deciso = dentro ? -1 : 0;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });
    main.addEventListener("touchmove", e => {
      if (deciso || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      deciso = Math.abs(dx) > Math.abs(dy) * 1.4 ? 1 : -1;
    }, { passive: true });
    main.addEventListener("touchend", e => {
      const era = deciso; deciso = -1;
      if (era !== 1 || !this._swipeAttivo()) return;
      const tocco = e.changedTouches && e.changedTouches[0];
      if (!tocco) return;
      const dx = tocco.clientX - x0;
      if (Math.abs(dx) < 60 || Date.now() - t0 > 900) return;
      this._paginaDiLato(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  _swipeAttivo() {
    if (this._edit) return false;
    if (this.querySelector(".fh-scrim")) return false;   // c'e un foglio aperto
    return (this._cfg.appearance || {}).swipe !== false;
  }

  _paginaDiLato(verso) {
    const voci = this._pagineVisibili();
    const qui = voci.findIndex(v => v.i === this._page);
    if (qui < 0) return;
    const dopo = voci[qui + verso];
    if (!dopo) return;                      // ai due capi non si gira in tondo
    const main = this.querySelector("[data-main]");
    if (main) {
      main.classList.remove("fh-entra-sx", "fh-entra-dx");
      // si forza il riavvio dell'animazione, se no due strisciate di fila
      // sembrano una sola
      void main.offsetWidth;
      main.classList.add(verso > 0 ? "fh-entra-dx" : "fh-entra-sx");
    }
    this._vaiPagina(dopo.i);
  }

  _azioniCfg() {
    const a = this._cfg.azioni || {};
    return {
      attive: !!a.attive,
      dove: a.dove || "prima",
      voci: Array.isArray(a.voci) ? a.voci : [],
    };
  }

  _azioniVisibili() {
    const c = this._azioniCfg();
    if (!c.attive || this._edit || !c.voci.length) return [];
    if (c.dove !== "tutte" && this._page !== 0) return [];
    return c.voci;
  }

  _azioniHTML() {
    const voci = this._azioniVisibili();
    if (!voci.length) return "";
    return `<div class="fh-azioni"><div class="fh-azriga">${voci.map((v, i) => {
      const acceso = this._azioneAccesa(v);
      return `<button type="button" class="fh-az${acceso ? " on" : ""}" data-az="${i}">
        <span class="fh-azico"><ha-icon icon="${fhEsc(v.icona || "mdi:gesture-tap-button")}"></ha-icon></span>
        <span class="fh-aztxt">${fhEsc(v.testo || "")}</span>
      </button>`;
    }).join("")}</div></div>`;
  }

  // Un interruttore mostra se e acceso; una scena o uno script non hanno uno
  // stato da mostrare, e restano spenti.
  _azioneAccesa(v) {
    if ((v.tipo || "entita") !== "entita" || !v.target) return false;
    const st = this._hass && this._hass.states[v.target];
    return !!st && !this._attSpento(st.state);
  }

  _fallAzione(v) {
    const h = this._hass;
    if (!h || !v) return;
    fhVibra(12);
    const tipo = v.tipo || "entita";
    const t = v.target || "";
    if (tipo === "pagina") {
      const i = (this._cfg.pages || []).findIndex(p => p.id === t);
      if (i >= 0) this._vaiPagina(i);
      return;
    }
    if (tipo === "link") {
      if (!t) return;
      if (t.startsWith("/")) {
        history.pushState(null, "", t);
        window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
      } else window.open(t, "_blank", "noopener");
      return;
    }
    if (!t) return;
    if (tipo === "scena") h.callService("scene", "turn_on", { entity_id: t });
    else if (tipo === "script") h.callService("script", "turn_on", { entity_id: t });
    else if (tipo === "automazione") h.callService("automation", "trigger", { entity_id: t });
    else h.callService("homeassistant", "toggle", { entity_id: t });
  }

  _wireAzioni(nav) {
    nav.querySelectorAll("[data-az]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const v = this._azioniCfg().voci[parseInt(b.dataset.az, 10)];
      this._fallAzione(v);
      // L'acceso/spento si vede subito, senza aspettare il giro di stato.
      setTimeout(() => this._aggiornaAzioni(), 400);
    }));
  }

  _aggiornaAzioni() {
    const riga = this.querySelector(".fh-azriga");
    if (!riga) return;
    const voci = this._azioniVisibili();
    riga.querySelectorAll("[data-az]").forEach(b => {
      const v = voci[parseInt(b.dataset.az, 10)];
      b.classList.toggle("on", !!v && this._azioneAccesa(v));
    });
  }

  _attenzioneCfg() {
    const a = this._cfg.attenzione || {};
    return {
      attiva: a.attiva !== false,
      dove: a.dove || "prima",            // "prima" = solo la Home, "tutte" = ogni pagina
      tuttoOk: a.tuttoOk !== false,       // la riga verde quando non c'e niente
      batterie: !!a.batterie,
      sogliaBatteria: Number(a.sogliaBatteria != null ? a.sogliaBatteria : 15),
      robot: a.robot !== false,
      ignoraBatterie: Array.isArray(a.ignoraBatterie) ? a.ignoraBatterie : [],
      offline: !!a.offline,
      voci: Array.isArray(a.voci) ? a.voci : [],
    };
  }

  // Cosa vuol dire "spento" per una entita qualunque. Tenuto in un posto solo:
  // una porta chiusa, una serratura chiusa e una presa spenta sono la stessa
  // cosa — nulla da segnalare.
  _attSpento(s) {
    return ["off", "closed", "locked", "idle", "standby", "docked", "not_home",
      "unavailable", "unknown", "", "0"].includes(String(s));
  }

  _attDa(st) {
    const m = Math.max(0, Math.round((Date.now() - new Date(st.last_changed).getTime()) / 60000));
    if (m < 60) return m + " min";
    if (m < 2880) return Math.round(m / 60) + " ore";
    return Math.round(m / 1440) + " giorni";
  }

  // Una regola: vale o non vale adesso. Torna null quando non c'e niente da
  // dire, cosi chi chiama filtra senza sapere come e fatta la regola.
  _voceAttenzione(v) {
    const hass = this._hass;
    if (!hass || !v || !v.entity) return null;
    const st = hass.states[v.entity];
    if (!st) return null;
    const s = st.state;
    const quando = v.quando || "acceso";
    if (["unavailable", "unknown"].includes(s) && quando !== "stato") return null;
    let vale;
    if (quando === "spento") vale = this._attSpento(s);
    else if (quando === "stato") vale = s === String(v.valore != null ? v.valore : "");
    else if (quando === "sopra") vale = parseFloat(s) > parseFloat(v.valore);
    else if (quando === "sotto") vale = parseFloat(s) < parseFloat(v.valore);
    else vale = !this._attSpento(s);
    if (!vale) return null;
    // "da quanto": una luce accesa e normale, accesa da tre ore no.
    const per = Number(v.per) || 0;
    const da = this._attDa(st);
    if (per > 0) {
      const min = (Date.now() - new Date(st.last_changed).getTime()) / 60000;
      if (!(min >= per)) return null;
    }
    const nome = st.attributes.friendly_name || v.entity;
    const testo = String(v.testo || "{nome}: {stato}")
      .replace(/\{nome\}/g, nome).replace(/\{stato\}/g, fhStateText ? fhStateText(st) : s)
      .replace(/\{da\}/g, da);
    return { testo, icona: v.icona || st.attributes.icon || "mdi:alert-circle-outline",
      colore: v.colore || "ambra", ent: v.entity, vai: v.vai || "" };
  }

  _attenzioneDati() {
    const cfg = this._attenzioneCfg();
    const hass = this._hass;
    const out = [];
    if (!hass) return out;
    // TRE PILLOLE PER UN FATTO SOLO. Con la porta aperta comparivano insieme
    // "Finestre o porte aperte", "Porta di casa sbloccata" e "Porta di casa
    // aperta" (Cristian: "ci sono 3 cose uguali"). Due regole le mettono in
    // ordine:
    //  - una regola puo RENDERNE INUTILI altre (si sceglie nelle impostazioni
    //    di ogni regola): "porta aperta" rende ovvio "porta sbloccata";
    //  - un gruppo (tutte le finestre e porte dell'allarme) non ripete i suoi
    //    membri che hanno gia una regola accesa, e quando resta qualcosa dice
    //    QUALE e aperta invece del generico "finestre o porte".
    const accese = [];
    cfg.voci.forEach((v, i) => {
      const r = this._voceAttenzione(v);
      if (r) { r.key = "v" + i; r._v = v; accese.push(r); }
    });
    const assorbite = new Set(), coperte = new Set();
    accese.forEach(r => {
      coperte.add(r._v.entity);
      (r._v.assorbe || []).forEach(e => { assorbite.add(e); coperte.add(e); });
    });
    const APERTURE = ["door", "window", "opening", "garage_door"];
    accese.forEach(r => {
      const v = r._v;
      delete r._v;
      if (assorbite.has(v.entity)) return;
      const st = hass.states[v.entity];
      const membri = st && Array.isArray(st.attributes.entity_id) ? st.attributes.entity_id : null;
      if (membri && (v.quando || "acceso") === "acceso") {
        const aperti = membri.filter(m => {
          const s = hass.states[m];
          return s && s.state === "on" && !coperte.has(m);
        });
        // Tutto quello che il gruppo ha da dire l'ha gia detto un'altra regola.
        if (!aperti.length) return;
        // L'impianto d'allarme dichiara "porta" tutti i suoi sensori, anche i
        // volumetrici e le vibrazioni: per non scrivere "volumetrico sala
        // aperta" si guarda anche il nome. Un'apertura "e aperta", un
        // volumetrico o una vibrazione "sente qualcosa".
        const frase = m => {
          const s = hass.states[m];
          const nome = fhNomeBreve(s);
          const apertura = APERTURE.includes(s.attributes.device_class) && !/volumetr|vibr|moviment|motion/i.test(nome + m);
          return apertura ? nome + " aperta" : nome + " sente qualcosa";
        };
        const frasi = aperti.map(frase);
        r.testo = frasi.length === 1 ? frasi[0]
          : frasi.length === 2 ? frasi[0] + " \u00b7 " + frasi[1].charAt(0).toLowerCase() + frasi[1].slice(1)
          : frasi.length + " sensori dell'allarme: " + frasi.slice(0, 2).join(", ").toLowerCase() + "\u2026";
      }
      out.push(r);
    });
    if (cfg.batterie) {
      // Le tre piu scariche bastano: un elenco di dodici pile non lo legge
      // nessuno, e la quarta la si vede domani.
      const basse = [];
      const saltare = new Set(cfg.ignoraBatterie);
      Object.keys(hass.states).forEach(e => {
        if (!e.startsWith("sensor.") || saltare.has(e)) return;
        const st = hass.states[e];
        if (st.attributes.device_class !== "battery") return;
        const n = parseFloat(st.state);
        if (!isFinite(n) || n >= cfg.sogliaBatteria) return;
        // Una batteria che non si aggiorna da due giorni non e una pila da
        // cambiare: e un apparecchio morto o tolto, e resterebbe li in eterno
        // a fare rumore (il tablet vecchio all'1% fermo da quattro giorni).
        const eta = (Date.now() - new Date(st.last_updated || st.last_changed).getTime()) / 86400000;
        if (!(eta < 2)) return;
        // "Batteria all'1%" di che cosa? Il nome del sensore da solo puo
        // essere una sigla (SM-T530): ci si aggiunge la stanza, quando
        // Home Assistant la conosce, se no non si sa dove andare a guardare.
        const area = this._areaEntita(e);
        basse.push({ e, n, area: area ? this._nomeArea(area) : "",
          nome: st.attributes.friendly_name || e });
      });
      basse.sort((a, b) => a.n - b.n).slice(0, 3).forEach(b => out.push({
        key: "b:" + b.e,
        testo: b.nome.replace(/\s*(batteria|battery level|battery)\s*/ig, " ").trim()
          + (b.area ? " (" + b.area + ")" : "") + " al " + Math.round(b.n) + "%",
        icona: "mdi:battery-alert-variant-outline", colore: "ambra", ent: b.e, vai: "",
      }));
    }
    // I ROBOT. Le card dei robot sanno gia queste cose, ma stanno in fondo a
    // una pagina: se i panni restano bagnati in base non se ne accorge
    // nessuno finche non si sente l'odore. Qui salgono in cima alla Home, col
    // tasto per rimediare subito.
    if (cfg.robot) {
      this._cardRobot().forEach(c => frbGuai(hass, c.entity, c.name).forEach((g, i) => out.push({
        key: "rb:" + c.entity + i, testo: g.testo, icona: g.icona, colore: g.colore,
        ent: g.asciuga ? "" : g.ent, vai: "", azione: g.asciuga ? "asciuga" : "",
        premi: g.asciuga || "",
      })));
    }
    if (cfg.offline) {
      const g = this._dispositiviOffline();
      const n = (g.offline || []).length;
      if (n) out.push({
        key: "off", colore: "rosso", icona: "mdi:lan-disconnect", ent: "", vai: "", azione: "offline",
        testo: n === 1 ? (g.offline[0].nome + " non risponde") : (n + " dispositivi non rispondono"),
      });
    }
    return out;
  }

  _fasciaAttenzioneEl() {
    const el = document.createElement("div");
    el.className = "fh-att";
    el.dataset.att = "1";
    this._disegnaAttenzione(el);
    return el;
  }

  _disegnaAttenzione(el) {
    const cfg = this._attenzioneCfg();
    const voci = this._attenzioneDati();
    const firma = voci.map(v => v.key + "|" + v.testo).join("~") || "_ok_";
    if (el.dataset.firma === firma) return;
    el.dataset.firma = firma;
    if (!voci.length) {
      el.hidden = !cfg.tuttoOk;
      el.innerHTML = cfg.tuttoOk
        ? `<div class="fh-attok"><ha-icon icon="mdi:check-circle-outline"></ha-icon>Tutto in ordine</div>` : "";
      return;
    }
    el.hidden = false;
    el.innerHTML = `<div class="fh-attriga">${voci.map(v =>
      `<button type="button" class="fh-attpill ${fhEsc(v.colore)}" data-att-ent="${fhEsc(v.ent)}" data-att-vai="${fhEsc(v.vai)}" data-att-az="${fhEsc(v.azione || "")}" data-att-premi="${fhEsc(v.premi || "")}">
        <ha-icon icon="${fhEsc(v.icona)}"></ha-icon><span>${fhEsc(v.testo)}${v.azione === "asciuga" ? " \u00b7 asciugali" : ""}</span>
      </button>`).join("")}</div>`;
    el.querySelectorAll("[data-att-ent]").forEach(b => b.addEventListener("click", () => {
      fhVibra(8);
      const vai = b.dataset.attVai, ent = b.dataset.attEnt;
      // "Dieci dispositivi non rispondono" senza dire QUALI non si puo
      // risolvere: il tocco apre l'elenco, con il tasto Ignora per quelli
      // staccati apposta.
      if (b.dataset.attAz === "offline") { this._popupOfflineDispositivi(); return; }
      // "Asciugali adesso": la pillola non racconta il problema, lo risolve.
      if (b.dataset.attAz === "asciuga" && b.dataset.attPremi) {
        this._hass.callService("button", "press", { entity_id: b.dataset.attPremi });
        const s = b.querySelector("span");
        if (s) { const v = s.textContent; s.textContent = "Li sto asciugando \u2713"; setTimeout(() => { s.textContent = v; }, 2500); }
        return;
      }
      if (vai) {
        if (vai.startsWith("/")) {
          history.pushState(null, "", vai);
          window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
          return;
        }
        const i = (this._cfg.pages || []).findIndex(p => p.id === vai);
        if (i >= 0) { this._vaiPagina(i); return; }
      }
      if (ent) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: ent } }));
    }));
  }

  _aggiornaAttenzione() {
    const el = this.querySelector("[data-att]");
    if (el) this._disegnaAttenzione(el);
  }

  // =========================================================================
  // IL CONSUMO DELLA STANZA
  // Un numero in cima alla stanza che dice quanto sta tirando adesso, e che
  // cambia colore quando e troppo: e l'unica informazione che vuoi vedere
  // senza cercarla. Toccandolo si apre la classifica di chi consuma, perche
  // "1,4 kW" da solo non serve a niente se non sai chi li sta mangiando.
  //
  // I sensori NON si sommano da soli: e la lezione della card dei carichi
  // reali, dove l'individuazione automatica contava due volte lo stesso
  // apparecchio (una dalla presa, una dal contatore generale). Qui il pannello
  // PROPONE, e la proposta si vede scritta; la somma vera la decide Cristian.
  // =========================================================================

  // L'ETICHETTA "Consumo apparecchio". Un apparecchio nuovo non si aggiunge a
  // sei elenchi diversi: gli si mette UNA etichetta sul sensore che lo misura
  // (una volta sola, con un tocco quando il pannello se ne accorge) e da li
  // entra da solo nella sua stanza, nel totale di casa e nel "perche consumi
  // di piu". La stanza e quella di Home Assistant: quella che si sceglie
  // comunque quando si aggiunge un dispositivo. I gruppi di Home Assistant
  // restano come sono, di scorta.
  _etichettaConsumo() { return (this._cfg.consumo || {}).etichetta || "consumo_apparecchio"; }

  _sensoriEtichettati() {
    const reg = (this._hass && this._hass.entities) || {};
    const l = this._etichettaConsumo();
    return Object.keys(reg).filter(e => e.startsWith("sensor.") && (reg[e].labels || []).includes(l));
  }

  _areaEntita(e) {
    const h = this._hass;
    const r = (h.entities || {})[e] || {};
    const d = (h.devices || {})[r.device_id] || {};
    return r.area_id || d.area_id || null;
  }

  _consumoCfg(pg) {
    const g = this._cfg.consumo || {};
    const c = pg.consumo || {};
    return {
      attiva: c.attiva === undefined ? !!pg.stanza : !!c.attiva,
      // null = nessuna scelta fatta: si mostra la proposta, segnalata come tale
      entita: Array.isArray(c.entita) ? c.entita : null,
      attenzione: Number(c.attenzione != null ? c.attenzione : (g.attenzione != null ? g.attenzione : 500)),
      alto: Number(c.alto != null ? c.alto : (g.alto != null ? g.alto : 1500)),
      titolo: c.titolo || "",
    };
  }

  _nomeEnt(e) {
    const st = this._hass && this._hass.states[e];
    return st ? (st.attributes.friendly_name || e) : e;
  }

  // L'area di Home Assistant che porta il nome della stanza. Serve solo per la
  // proposta: se non c'e, non succede niente di male.
  _areaDiPagina(pg) {
    const aree = (this._hass && this._hass.areas) || {};
    // Scelta a mano: il nome della pagina non sempre e il nome dell'area
    // ("Sala" in Home Assistant e "Soggiorno", e c'e anche "Salotto" vuoto).
    if (pg.area && aree[pg.area]) return pg.area;
    const t = fhNorm(pg.title);
    if (!t) return null;
    let esatta = null, simile = null;
    Object.keys(aree).forEach(id => {
      const n = fhNorm(aree[id].name);
      if (!n) return;
      if (n === t) esatta = id;
      else if (!simile && (n.includes(t) || t.includes(n))) simile = id;
    });
    return esatta || simile;
  }

  // La proposta: prima i sensori di potenza che le card della stanza gia
  // nominano (quelli li ha scelti lui, uno per uno), poi quelli dell'area.
  _proponiConsumo(pg) {
    const hass = this._hass;
    if (!hass) return [];
    // Con l'etichetta la stanza si fa da sola: tutti gli apparecchi etichettati
    // che stanno in quest'area, anche quelli senza una card nella pagina.
    const etichettati = this._sensoriEtichettati();
    if (etichettati.length) {
      const a = this._areaDiPagina(pg);
      return a ? etichettati.filter(e => hass.states[e] && this._areaEntita(e) === a) : [];
    }
    const dallePagine = [...new Set(this._entitaDiPagina(pg.id, ["power"]))]
      .filter(e => e.startsWith("sensor.") && hass.states[e]);
    const area = this._areaDiPagina(pg);
    const reg = hass.entities || {}, dev = hass.devices || {};
    const dallArea = [];
    if (area) {
      Object.keys(hass.states).forEach(e => {
        if (!e.startsWith("sensor.")) return;
        if (hass.states[e].attributes.device_class !== "power") return;
        // "device_power" e il consumo della PRESA stessa (stima di powercalc),
        // non del carico: sommato al carico contava due volte il microonde,
        // il forno e la lavastoviglie. Stessa regola del collegamento dispositivi.
        if (/device_power|device_energy|standby/.test(e)) return;
        const r = reg[e];
        if (!r) return;
        const a = r.area_id || (dev[r.device_id] || {}).area_id;
        if (a === area) dallArea.push(e);
      });
    }
    return [...new Set([...dallePagine, ...dallArea])];
  }

  _consumoDati(pg) {
    const cfg = this._consumoCfg(pg);
    const lista = (cfg.entita || this._proponiConsumo(pg)).slice();
    const pwrTot = pg.power || pg.consumo_totale;
    const sommaTutto = pg.consumo_somma_tutto !== undefined ? !!pg.consumo_somma_tutto : !pwrTot;
    const hass = this._hass;
    const voci = [];
    let tot = 0;

    const getW = (e) => {
      const st = hass && hass.states[e];
      const n = st ? parseFloat(st.state) : NaN;
      const u = String((st && st.attributes && st.attributes.unit_of_measurement) || "").toLowerCase();
      return isNaN(n) ? null : (u === "kw" ? n * 1000 : n);
    };

    if (pwrTot) {
      const st = hass && hass.states[pwrTot];
      const w = getW(pwrTot);
      if (w != null) tot += w;
      voci.push({ id: pwrTot, nome: (pg.stanza ? "Totale stanza: " : "Totale: ") + this._nomeEnt(pwrTot),
        w, viva: !!st && w != null, isTot: true });
    }

    lista.forEach(e => {
      if (e === pwrTot) return;
      const st = hass && hass.states[e];
      const w = getW(e);
      if (sommaTutto) {
        if (w != null) tot += w;
      }
      voci.push({ id: e, nome: this._nomeEnt(e), w, viva: !!st && w != null });
    });

    voci.sort((a, b) => (b.w || 0) - (a.w || 0));
    const liv = tot >= cfg.alto ? "alto" : tot >= cfg.attenzione ? "medio" : "basso";
    return { cfg, voci, tot, liv, proposta: !cfg.entita };
  }

  // Il livello di consumo di una pagina e quanto ci sta dentro: lo usano sia
  // la fascia in cima alla stanza sia le tessere dell'elenco Stanze, cosi
  // dicono per forza la stessa cosa. Le soglie sono quelle della stanza, non
  // un numero uguale per tutte: 1 kW in cucina e normale, in camera no.
  _livelloConsumo(pg, watt) {
    const c = this._consumoCfg(pg);
    const att = Math.max(1, c.attenzione), alt = Math.max(att + 1, c.alto);
    const liv = watt >= alt ? "alto" : watt >= att ? "medio" : "basso";
    const grezza = liv === "alto" ? (watt - alt) / (alt * 0.5)
      : liv === "medio" ? (watt - att) / (alt - att)
      : watt / att;
    return { liv, int: Math.max(0, Math.min(1, grezza)) };
  }

  _fasciaConsumoEl(pg) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "fh-consumo";
    el.dataset.consumo = pg.id;
    el.addEventListener("click", () => this._apriConsumo(pg));
    this._disegnaConsumo(el, pg);
    return el;
  }

  _disegnaConsumo(el, pg) {
    const d = this._consumoDati(pg);
    el.classList.remove("basso", "medio", "alto");
    el.classList.add(d.liv);
    // La barra si riempie fino alla soglia rossa: oltre resta piena, non c'e
    // bisogno di sapere di quanto hai sforato per capire che hai sforato.
    const q = Math.max(0, Math.min(1, d.tot / Math.max(1, d.cfg.alto)));
    el.style.setProperty("--fh-q", (q * 100).toFixed(1) + "%");
    // QUANTO, non solo SE. Tre colori secchi dicevano "sotto, sopra, molto
    // sopra" e basta: 520 W e 1400 W in cucina avevano la stessa faccia.
    // Qui dentro ogni livello il colore cresce con quanto si sta consumando,
    // cosi la fascia si vede scaldare mentre le cose si accendono invece di
    // saltare da un gradino all'altro. La scala riparte a ogni livello: al
    // fondo di quello nuovo il colore e gia il suo, appena accennato.
    el.style.setProperty("--fh-int", this._livelloConsumo(pg, d.tot).int.toFixed(2));
    const primo = d.voci.find(v => (v.w || 0) > 0 && !v.isTot);
    el.innerHTML = `
      <span class="fh-cfill"></span>
      <span class="fh-cico"><ha-icon icon="mdi:flash"></ha-icon></span>
      <span class="fh-ctxt">
        <b>${fhEsc(fhNumW(d.tot))}</b>
        <small>${fhEsc(d.cfg.titolo || ("Consumo " + (pg.title || "stanza")))}${primo
          ? " &middot; " + fhEsc(primo.nome) : ""}</small>
      </span>
      <span class="fh-cgo"><ha-icon icon="mdi:chevron-right"></ha-icon></span>`;
  }

  _aggiornaConsumo() {
    const el = this.querySelector("[data-consumo]");
    if (!el) return;
    const pg = this._cfg.pages.find(x => x.id === el.dataset.consumo);
    if (pg) this._disegnaConsumo(el, pg);
    const foglio = this.querySelector("[data-consumolista]");
    if (foglio && foglio.__ridisegna) foglio.__ridisegna();
  }

  // La classifica: chi sta mangiando cosa, adesso.
  _apriConsumo(pg) {
    fhVibra(8);
    const box = document.createElement("div");
    box.dataset.consumolista = "1";
    const draw = () => {
      const d = this._consumoDati(pg);
      const max = Math.max(1, ...d.voci.map(v => v.w || 0));
      const dice = d.liv === "alto" ? "consumo alto"
        : d.liv === "medio" ? "sopra il solito" : "tutto tranquillo";
      box.innerHTML = `
        <div class="fh-ctot ${d.liv}">
          <b>${fhEsc(fhNumW(d.tot))}</b><small>${dice}</small>
        </div>
        ${d.proposta ? `<div class="fh-note" style="margin-bottom:10px">Questi sensori li ho <b>proposti io</b>,
          guardando le card della stanza e la sua area. Controllali: se uno misura il totale di casa,
          qui dentro verrebbe contato due volte. Con <b>Scegli</b> decidi tu.</div>` : ""}
        <div class="fh-clist">${d.voci.length ? d.voci.map(v => {
          const w = v.w || 0;
          const perc = d.tot > 0 && w > 0 ? Math.round(w / d.tot * 100) : 0;
          return `<div class="fh-crow${w > 0 ? "" : " spento"}">
            <span class="fh-cn">${fhEsc(v.nome)}</span>
            <span class="fh-cb"><i style="width:${(w / max * 100).toFixed(1)}%"></i></span>
            <span class="fh-cw">${fhEsc(v.viva ? fhNumW(w) : "?")}${perc ? ` <em>${perc}%</em>` : ""}</span>
          </div>`;
        }).join("") : `<div class="fh-note">Nessun sensore di potenza per questa stanza.
          Tocca <b>Scegli</b> e aggiungine uno.</div>`}</div>
        <button type="button" class="fh-btn" data-scegli style="margin-top:14px;width:100%">
          <ha-icon icon="mdi:tune"></ha-icon>Scegli e personalizza</button>`;
      box.querySelector("[data-scegli]").addEventListener("click", () => this._modificaConsumo(pg));
    };
    box.__ridisegna = draw;
    draw();
    this._sheet("Chi consuma in " + (pg.title || "questa stanza"), box, false);
  }

  // Tutto quello che si puo cambiare: la stanza di Home Assistant da cui
  // arrivano gli apparecchi, quali sensori, da che soglia cambia colore, come
  // si chiama, e se la fascia si vede o no.
  _modificaConsumo(pg) {
    const c = this._consumoCfg(pg);
    const stato = {
      attiva: c.attiva,
      // "da solo": nessuna lista salvata, si guarda l'etichetta e la stanza.
      auto: !c.entita,
      area: pg.area || "",
      entita: (c.entita || this._proponiConsumo(pg)).slice(),
      attenzione: c.attenzione,
      alto: c.alto,
      titolo: c.titolo,
    };
    const box = document.createElement("div");
    const draw = () => {
      box.innerHTML = `
        <label class="fh-check"><input type="checkbox" data-attiva${stato.attiva ? " checked" : ""}>
          Mostra la fascia in cima a questa pagina</label>

        <div class="fh-sfield" style="margin-top:14px"><label class="fh-slab">Stanza di Home Assistant</label>
          <select class="fh-input" data-area>
            <option value="">Automatica (dal nome della pagina)</option>
            ${Object.keys((this._hass && this._hass.areas) || {}).map(a =>
              `<option value="${fhEsc(a)}"${pg.area === a ? " selected" : ""}>${fhEsc(this._nomeArea(a))}</option>`).join("")}
          </select>
          <span class="fh-note">Da qui arrivano gli apparecchi contati in automatico: tutti quelli con l'etichetta
          <b>Consumo apparecchio</b> che stanno in questa stanza.</span></div>

        <label class="fh-check" style="margin-top:12px"><input type="checkbox" data-auto${stato.auto ? " checked" : ""}>
          Conta da solo gli apparecchi di questa stanza</label>
        <span class="fh-note">Con questo acceso non c'e nessun elenco da tenere aggiornato: entra da solo
        ogni apparecchio nuovo con l'etichetta <b>Consumo apparecchio</b> assegnato a questa stanza.</span>

        <div class="fh-lab2" style="margin-top:16px">${stato.auto ? "Apparecchi contati adesso" : "Sensori contati"} <small>la somma e questa</small></div>
        <div class="fh-tags">${stato.entita.length ? stato.entita.map((e, i) =>
          `<span class="fh-tag">${fhEsc(this._nomeEnt(e))}<button type="button" data-via="${i}">&times;</button></span>`
        ).join("") : `<div class="fh-note">Nessuno: la fascia segnerebbe sempre zero.</div>`}</div>

        ${this._entityListHTML("fhCsEnt", "", "sensor.", "Aggiungi un sensore di potenza", "power")}
        <div class="fh-srow" style="margin-top:8px">
          <button type="button" class="fh-btn" data-agg><ha-icon icon="mdi:plus"></ha-icon>Aggiungi</button>
          <button type="button" class="fh-btn" data-prop><ha-icon icon="mdi:auto-fix"></ha-icon>Proponi tu</button>
        </div>

        <div class="fh-lab2" style="margin-top:18px">Quando cambia colore</div>
        <div class="fh-sfield"><label class="fh-slab">Ambra sopra (W)</label>
          <input class="fh-input" type="number" min="0" step="10" data-s1 value="${stato.attenzione}"></div>
        <div class="fh-sfield" style="margin-top:8px"><label class="fh-slab">Rosso sopra (W)</label>
          <input class="fh-input" type="number" min="0" step="10" data-s2 value="${stato.alto}"></div>
        <div class="fh-sfield" style="margin-top:8px"><label class="fh-slab">Titolo <small>(vuoto: lo scrivo io)</small></label>
          <input class="fh-input" data-tit value="${fhEsc(stato.titolo || "")}" placeholder="Consumo ${fhEsc(pg.title || "stanza")}"></div>

        <button type="button" class="fh-btn primary" data-salva style="margin-top:16px;width:100%">Salva</button>`;
      this._wireEntityLists(box);

      box.querySelectorAll("[data-via]").forEach(b => b.addEventListener("click", () => {
        stato.entita.splice(+b.dataset.via, 1);
        draw();
      }));
      const aggiungi = () => {
        const inp = box.querySelector("#fhCsEnt");
        const v = (inp.value || "").trim();
        if (!v || !v.includes(".")) return;
        if (!stato.entita.includes(v)) stato.entita.push(v);
        inp.value = "";
        draw();
      };
      box.querySelector("[data-agg]").addEventListener("click", aggiungi);
      box.querySelector("#fhCsEnt").addEventListener("change", aggiungi);
      box.querySelector("[data-prop]").addEventListener("click", () => {
        this._proponiConsumo(pg).forEach(e => { if (!stato.entita.includes(e)) stato.entita.push(e); });
        draw();
      });
      box.querySelector("[data-attiva]").addEventListener("change", e => { stato.attiva = e.target.checked; });
      box.querySelector("[data-auto]").addEventListener("change", e => {
        stato.auto = e.target.checked;
        if (stato.auto) { pg.area = stato.area || undefined; stato.entita = this._proponiConsumo(pg).slice(); }
        draw();
      });
      const selArea = box.querySelector("[data-area]");
      if (selArea) selArea.addEventListener("change", e => {
        stato.area = e.target.value;
        // La proposta dipende dalla stanza: si rifa subito, cosi si vede
        // se e quella giusta prima di salvare.
        pg.area = stato.area || undefined;
        if (stato.auto) stato.entita = this._proponiConsumo(pg).slice();
        draw();
      });
      box.querySelector("[data-s1]").addEventListener("change", e => { stato.attenzione = Math.max(0, +e.target.value || 0); });
      box.querySelector("[data-s2]").addEventListener("change", e => { stato.alto = Math.max(1, +e.target.value || 1); });
      box.querySelector("[data-tit]").addEventListener("change", e => { stato.titolo = e.target.value.trim(); });
      box.querySelector("[data-salva]").addEventListener("click", async () => {
        // La soglia rossa sotto quella ambra non vuol dire niente: si
        // rimettono in ordine invece di salvare una cosa che non funziona.
        const s1 = Math.min(stato.attenzione, stato.alto);
        const s2 = Math.max(stato.attenzione, stato.alto);
        if (stato.area) pg.area = stato.area; else delete pg.area;
        pg.consumo = { attiva: stato.attiva, attenzione: s1, alto: s2, titolo: stato.titolo };
        // Con "da solo" non si salva nessun elenco: la lista si rifa ogni
        // volta dall'etichetta e dalla stanza.
        if (!stato.auto) pg.consumo.entita = stato.entita.slice();
        const scrim = this.querySelector(".fh-scrim");
        if (scrim) scrim.remove();
        await this._save(true);
        this._renderPage();
      });
    };
    draw();
    this._sheet("Consumo di " + (pg.title || "questa pagina"), box, false);
  }

  _chipsHTML() { return this._chipsDati().map(d => this._chipHTML(d)).join(""); }

  _chipHTML(d) {
    const tag = d.tipo === "meteo" ? "div" : "button";
    let attr = d.tipo === "meteo" ? "" :
      d.tipo === "link" ? ` type="button" data-chip-link="${fhEsc(d.target)}"`
      : d.tipo === "pagina" ? ` type="button" data-chip-page="${fhEsc(d.target)}"`
      : d.tipo === "offline_devs" ? ` type="button" data-chip-offline="true"`
      : d.tipo === "spesa" ? ` type="button" data-chip-spesa="${fhEsc(d.target)}"`
      : d.tipo === "autoclave" ? ` type="button" data-chip-autoclave="${fhEsc(d.target)}"`
      : ` type="button" data-chip-entity="${fhEsc(d.target || "")}"`;
    // Il sensore di potenza scelto nella chip serve al foglio dei consumi.
    if (d.power) attr += ` data-power="${fhEsc(d.power)}"`;
    const accClass = d.accent ? " " + d.accent : "";
    const tocco = d.tocco ? ` data-tocco="${fhEsc(d.tocco)}" data-vai="${fhEsc(d.vai || "")}"` : "";
    return `<${tag} class="fh-chip${d.on ? " on" : ""}${accClass}" data-key="${fhEsc(d.key)}"${attr}${tocco}>
      ${d.icon ? `<ha-icon icon="${fhEsc(d.icon)}"></ha-icon>` : ""}
      <span data-eti>${fhEsc(d.label || "")}</span>
      ${d.sotto ? `<small data-sotto>${fhEsc(d.sotto)}</small>` : ""}
    </${tag}>`;
  }

  // Aggiornamento su misura: se le chip sono le stesse si tocca solo cio che
  // cambia, e il dito continua a scorrere senza scatti.
  _updateChips() {
    const box = this.querySelector("[data-chips]");
    if (!box) return;
    const dati = this._chipsDati();
    const nodi = Array.from(box.children);
    const stesse = !this._forzaChip && nodi.length === dati.length &&
      dati.every((d, i) => nodi[i].dataset.key === d.key);
    this._forzaChip = false;
    if (stesse) {
      dati.forEach((d, i) => {
        const n = nodi[i];
        n.classList.toggle("on", !!d.on);
        // Anche il colore d'allarme e l'icona cambiano col dato: senza, la
        // chip dell'autoclave restava spenta di colore mentre la pompa girava.
        ["warn", "danger"].forEach(a => n.classList.toggle(a, d.accent === a));
        const ic = n.querySelector("ha-icon");
        if (ic && d.icon && ic.getAttribute("icon") !== d.icon) ic.setAttribute("icon", d.icon);
        const eti = n.querySelector("[data-eti]");
        if (eti && eti.textContent !== (d.label || "")) eti.textContent = d.label || "";
        const so = n.querySelector("[data-sotto]");
        if (d.sotto) {
          if (so) { if (so.textContent !== d.sotto) so.textContent = d.sotto; }
          else n.insertAdjacentHTML("beforeend", `<small data-sotto>${fhEsc(d.sotto)}</small>`);
        } else if (so) so.remove();
      });
      return;
    }
    // Sono cambiate davvero: si rifa la riga, ma lo scorrimento resta dov'era.
    const x = box.scrollLeft;
    box.innerHTML = dati.map(d => this._chipHTML(d)).join("");
    box.scrollLeft = x;
    this._wireChips();
  }

  _climaStanza(pg) {
    if (!pg || !this._hass) return null;
    const hass = this._hass;
    const states = hass.states || {};
    const isStanza = pg.stanza || pg.temp || pg.humidity || (pg.id && pg.id.startsWith("clima_"));
    if (!isStanza) return null;

    let tempEnt = pg.temp || pg.temperature || "";
    let humEnt = pg.humidity || "";

    if (!tempEnt || !humEnt) {
      const pid = (pg.id || "").toLowerCase().replace(/^clima_/, "");
      const kwMap = {
        sala: ["soggiorno", "sala"],
        camera_da_letto: ["camera_da_letto", "camera_letto"],
        camera_gaia: ["camera_gaia", "gaia"],
        camera_leo: ["camera_leo", "leo"],
        bagno_p1: ["bagno_p1"],
        bagno_pt: ["bagno_pt"],
        cucina: ["cucina"],
        ufficio: ["ufficio"],
        lavatoio: ["lavatoio"],
        giardino: ["giardino"],
      };
      const kws = kwMap[pid] || [pid];

      const isTemp = (k, st) => {
        if (!st || ["unavailable", "unknown"].includes(st.state)) return false;
        const attr = st.attributes || {};
        const dc = attr.device_class || "";
        const u = attr.unit_of_measurement || "";
        if (dc === "battery" || k.includes("battery") || k.includes("batteria")) return false;
        if (k.includes("humidity") || k.includes("umidita")) return false;
        return dc === "temperature" || ["°C", "°F", "C°"].includes(u);
      };

      const isHum = (k, st) => {
        if (!st || ["unavailable", "unknown"].includes(st.state)) return false;
        const attr = st.attributes || {};
        const dc = attr.device_class || "";
        const u = attr.unit_of_measurement || "";
        if (dc === "battery" || k.includes("battery") || k.includes("batteria")) return false;
        if (dc === "humidity") return true;
        return u === "%" && (k.includes("humidity") || k.includes("umidita"));
      };

      // 1. Preferenza ai sensori dedicati clima di casa (sensor.temperatura_<kw>_*)
      for (const kw of kws) {
        for (const k of Object.keys(states)) {
          if (!k.startsWith("sensor.temperatura_" + kw)) continue;
          const st = states[k];
          if (!tempEnt && isTemp(k, st)) tempEnt = k;
          if (!humEnt && isHum(k, st)) humEnt = k;
        }
      }

      // 2. Ricerca per area HA se configurata
      if (!tempEnt || !humEnt) {
        const areas = Object.values(hass.areas || {});
        const pTitle = (pg.title || "").toLowerCase();
        const targetArea = areas.find(a => {
          const aId = (a.area_id || "").toLowerCase();
          const aName = (a.name || "").toLowerCase();
          return (pg.area_id && a.area_id === pg.area_id) ||
            aId === pid || aName === pTitle ||
            (pid === "sala" && (aId === "soggiorno" || aName.includes("soggiorno"))) ||
            (pid === "camera_da_letto" && (aId.includes("letto") || aName.includes("letto"))) ||
            (pid === "bagno_p1" && (aId === "bagno" || aId.includes("bagno_p1") || aName.includes("p1"))) ||
            (aName && pTitle && (aName.includes(pTitle) || pTitle.includes(aName)));
        });

        const areaId = targetArea ? targetArea.area_id : (pg.area_id || (pid === "sala" ? "soggiorno" : (pid === "bagno_p1" ? "bagno" : pid)));
        if (!tempEnt) {
          const s = this._sensoreArea(areaId, "temperature");
          if (s && isTemp(s, states[s]) && !s.includes("echo_dot") && !s.includes("broadlink")) tempEnt = s;
        }
        if (!humEnt) {
          const s = this._sensoreArea(areaId, "humidity");
          if (s && isHum(s, states[s])) humEnt = s;
        }
      }

      // 3. Fallback per parole chiave
      if (!tempEnt) {
        for (const kw of kws) {
          const found = Object.keys(states).find(k =>
            k.startsWith("sensor.") &&
            isTemp(k, states[k]) &&
            k.toLowerCase().includes(kw) &&
            !k.includes("echo_dot") && !k.includes("broadlink") &&
            (pid === "bagno_p1" || !k.includes("bagno_p1"))
          );
          if (found) { tempEnt = found; break; }
        }
      }

      if (!humEnt) {
        for (const kw of kws) {
          const found = Object.keys(states).find(k =>
            k.startsWith("sensor.") &&
            isHum(k, states[k]) &&
            k.toLowerCase().includes(kw) &&
            (pid === "bagno_p1" || !k.includes("bagno_p1"))
          );
          if (found) { humEnt = found; break; }
        }
      }
    }

    const tState = tempEnt && states[tempEnt] && !["unavailable", "unknown"].includes(states[tempEnt].state) ? states[tempEnt] : null;
    const hState = humEnt && states[humEnt] && !["unavailable", "unknown"].includes(states[humEnt].state) ? states[humEnt] : null;

    if (!tState && !hState) return null;

    let tVal = null;
    if (tState) {
      const num = parseFloat(tState.state);
      tVal = isNaN(num) ? tState.state : (num % 1 === 0 ? num.toFixed(0) : num.toFixed(1));
    }
    let hVal = null;
    if (hState) {
      const num = parseFloat(hState.state);
      hVal = isNaN(num) ? hState.state : Math.round(num);
    }

    return { tempEnt, humEnt, temp: tVal, humidity: hVal };
  }

  _chipsDati() {
    const hass = this._hass;
    const h = this._cfg.header || {};
    const out = [];
    const pg = (this._cfg.pages && this._cfg.pages[this._page]) || null;

    const cs = this._climaStanza(pg);
    if (cs && (cs.temp != null || cs.humidity != null)) {
      if (cs.temp != null) {
        out.push({
          key: "st:temp:" + (pg ? pg.id : "curr"),
          tipo: "entita",
          target: cs.tempEnt || "",
          icon: "mdi:thermometer",
          label: cs.temp + "\u00b0",
          sotto: (pg && pg.title) ? pg.title : "Temp",
          on: true,
        });
      }
      if (cs.humidity != null) {
        out.push({
          key: "st:hum:" + (pg ? pg.id : "curr"),
          tipo: "entita",
          target: cs.humEnt || "",
          icon: "mdi:water-percent",
          label: cs.humidity + "%",
          sotto: "Umidit\u00e0",
        });
      }
    }
    // Niente chip meteo nelle pagine senza sensori propri: univa la
    // temperatura di un sensore di CASA (26,8) al cielo di FUORI ("Sereno"),
    // mentre la card meteo accanto diceva 30 gradi. Cristian: "non ha senso".
    // Il meteo sta nella sua card.
    (h.chips || []).forEach(chip => {
      if (chip.tipo === "spesa" || String(chip.entity || "").startsWith("todo.")) {
        const lista = String(chip.entity || "").startsWith("todo.") ? chip.entity : "todo.shopping_list";
        const st = hass ? hass.states[lista] : null;
        const cnt = st ? (parseInt(st.state, 10) || 0) : 0;
        out.push({
          key: "spesa",
          tipo: "spesa",
          target: lista,
          icon: "mdi:cart-outline",
          label: cnt > 0 ? `${cnt} spesa` : "Spesa",
          sotto: cnt > 0 ? "da comprare" : "fatta",
          on: cnt > 0,
          accent: cnt > 0 ? "warn" : "",
        });
        return;
      }
      if (chip.tipo === "autoclave") {
        // Interruttore e sensore si possono scegliere nella chip (entity,
        // power); quelli di casa restano il valore di partenza.
        const swId = chip.entity || "switch.power";
        const pwId = chip.power || "sensor.power_current";
        const sw = hass ? hass.states[swId] : null;
        const w = hass ? (fhWatt(hass.states[pwId]) || 0) : 0;
        const isOn = !!sw && sw.state === "on";
        const isPompa = isOn && w > 0;
        out.push({
          key: "autoclave",
          tipo: "autoclave",
          target: swId,
          tocco: chip.tocco || "info", vai: chip.vai || "", power: chip.power || pwId,
          icon: isOn ? "mdi:water-pump" : "mdi:water-pump-off",
          // Il consumo si vede sempre, anche a pompa ferma: "0 W" dice che e
          // accesa e pronta, e quando parte si vede subito quanto tira.
          label: isOn ? fhNumW(w) : "Spenta",
          sotto: isPompa ? "Pompa in funzione" : isOn ? "Autoclave pronta" : "Autoclave",
          on: isOn,
          accent: isPompa ? "warn" : "",
        });
        return;
      }
      // L'ALLARME DI CASA. Con la chip generica sarebbe stato "spento" anche
      // da inserito — "armed_away" non e fra gli stati che quella considera
      // accesi — e avrebbe scritto la parola inglese. Qui ha la sua faccia:
      // scudo aperto quando e giu, scudo chiuso quando e su, e rosso che
      // lampeggia se e scattato.
      if (chip.tipo === "allarme") {
        const id = chip.entity || "alarm_control_panel.ialarm_xr";
        const st = hass ? hass.states[id] : null;
        const s = st ? st.state : "unavailable";
        const su = String(s).startsWith("armed");
        const inCorso = s === "triggered";
        const inMoto = ["arming", "pending", "disarming"].includes(s);
        out.push({
          key: "allarme", tipo: "entita", target: id,
          tocco: chip.tocco || "info", vai: chip.vai || "",
          icon: chip.icon || (inCorso ? "mdi:shield-alert" : inMoto ? "mdi:shield-sync-outline"
            : su ? "mdi:shield-lock" : "mdi:shield-off-outline"),
          label: chip.label || "Allarme",
          sotto: st ? fhStateText(st) : "Non risponde",
          on: su || inCorso,
          accent: inCorso ? "danger" : inMoto ? "warn" : "",
        });
        return;
      }
      if (chip.tipo === "dispositivi" || chip.tipo === "offline") {
        const count = this._dispositiviOffline(chip).offline.length;
        out.push({
          key: "offline_devs",
          tipo: "offline_devs",
          target: "offline_devs",
          icon: count > 0 ? "mdi:alert-circle-outline" : "mdi:check-circle-outline",
          label: count > 0 ? `${count} offline` : "Tutti online",
          sotto: "Dispositivi",
          on: count > 0,
          accent: count > 0 ? "danger" : "",
        });
        return;
      }
      // Una chip puo anche essere una SCORCIATOIA a una pagina invece che un
      // interruttore: tiene a portata una vista (il clima di tutta la casa)
      // senza occupare un posto nella barra in basso.
      if (chip.link) {
        out.push({ key: "l:" + chip.link, tipo: "link", target: chip.link,
          icon: chip.icon, label: chip.label || chip.link, sotto: "apri" });
        return;
      }
      if (chip.pagina) {
        const acc = this._contaAccesiPagina(chip.pagina);
        out.push({ key: "p:" + chip.pagina, tipo: "pagina", target: chip.pagina,
          icon: chip.icon, label: chip.label || chip.pagina, on: !!acc,
          sotto: acc ? acc + " " + (acc === 1 ? "acceso" : "accesi") : "" });
        return;
      }
      const st = chip.entity && hass ? hass.states[chip.entity] : null;
      out.push({
        key: "e:" + (chip.entity || ""), tipo: "entita", target: chip.entity,
        tocco: chip.tocco || "info", vai: chip.vai || "",
        icon: chip.icon, label: chip.label || (st ? st.attributes.friendly_name : ""),
        on: !!(st && ["on", "home", "open", "unlocked"].includes(st.state)),
        sotto: st ? fhStateText(st) : "",
      });
    });
    return out;
  }

  // Il numero della pagina da solo non basta a ritrovarla dopo un
  // salvataggio: le pagine si spostano. Si tiene anche il nome.
  _vaiPagina(i) {
    fhVibra(8);
    this._page = i;
    const pg = this._cfg.pages[i];
    this._pageId = pg ? pg.id : null;
    // replaceState e non pushState: cambiare pagina dentro il pannello non
    // deve riempire la cronologia del browser di passi indietro.
    if (this._pageId) {
      try { history.replaceState(history.state, "", "#" + encodeURIComponent(this._pageId)); } catch (e) { /* niente */ }
    }
    this._renderNav();
    // Un fotogramma di scarto: il cerchio parte, POI si costruisce la pagina.
    requestAnimationFrame(() => {
      this._renderPage();
      this._inCima();
      this._updateChips();
    });
  }

  // Ogni pagina riparte dalla sua cima: ritrovarsi a meta di una pagina nuova,
  // alla stessa altezza di quella che hai lasciato, disorienta. Vale per tutte
  // le vie: la barra, il foglio delle stanze, un collegamento con #.
  // Si rifa anche al giro dopo perche la pagina cresce mentre le card entrano.
  _inCima() {
    const su = () => {
      try { window.scrollTo({ top: 0, behavior: "auto" }); } catch (e) { window.scrollTo(0, 0); }
      const m = this.querySelector("[data-main]");
      if (m && m.scrollTop) m.scrollTop = 0;
    };
    su();
    requestAnimationFrame(su);
    setTimeout(su, 120);
  }

  // La barra laterale di Home Assistant e una preferenza dell'UTENTE, non
  // della dashboard: si chiede col suo stesso evento, quello che usa il
  // pulsante dell'hamburger. Si rimette com'era uscendo dal pannello, senno
  // uno se la ritroverebbe sparita anche altrove senza sapere perche.
  _dockSidebar(come) {
    this.dispatchEvent(new CustomEvent("hass-dock-sidebar", {
      detail: { dock: come }, bubbles: true, composed: true,
    }));
  }

  _applySidebar() {
    const modo = (this._cfg.appearance || {}).sidebar || "mai";
    const stretto = (this._larghezza || this.clientWidth || window.innerWidth || 400) < 1100;
    const nascondere = modo === "sempre" || (modo === "stretti" && stretto);
    if (nascondere === this._sidebarNascosta) return;
    if (nascondere) {
      // Si ricorda com'era prima di toccarla.
      if (this._sidebarPrima == null && this._hass) {
        this._sidebarPrima = this._hass.dockedSidebar || "auto";
      }
      this._dockSidebar("always_hidden");
      this._sidebarNascosta = true;
    } else {
      this._dockSidebar(this._sidebarPrima === "always_hidden" ? "auto" : (this._sidebarPrima || "auto"));
      this._sidebarNascosta = false;
    }
  }

  // UNO solo: ce n'erano due nella stessa classe, e il secondo cancellava il
  // primo senza dare errore. Risultato: uscendo dal pannello il cielo animato
  // e l'orologio continuavano a girare in sottofondo.
  disconnectedCallback() {
    this._fermaTutto();
    if (this._ascoltoHash) {
      window.removeEventListener("hashchange", this._ascoltoHash);
      window.removeEventListener("location-changed", this._ascoltoHash);
      this._ascoltoHash = null;
    }
    // Uscendo dal pannello la barra torna come l'utente l'aveva.
    if (this._sidebarNascosta) {
      this._dockSidebar(this._sidebarPrima === "always_hidden" ? "auto" : (this._sidebarPrima || "auto"));
      this._sidebarNascosta = false;
    }
    if (this._ro) { this._ro.disconnect(); this._ro = null; this._roTarget = null; }
  }

  // Le pagine da mostrare nella barra. Con una pagina per stanza la barra
  // diventerebbe lunghissima e inutile: quelle nascoste restano raggiungibili
  // dalle card che ci portano, e in modifica si vedono comunque (senno non si
  // potrebbero piu sistemare).
  _pagineVisibili() {
    const tutte = this._cfg.pages.map((pg, i) => ({ pg, i }));
    if (this._edit) return tutte;
    // LA BARRA SEGUE LA STANZA.
    // Dentro una stanza la barra generale non serve a niente: quello che vuoi
    // li sono le cose di QUELLA stanza. Una pagina nascosta puo quindi
    // dichiarare `barra: ["id", "id"]` e la barra diventa: Casa, la stanza in
    // cui sei, e le sue pagine. Senza `barra` si comporta come prima.
    // Le pagine SEMPRE presenti sono quelle non nascoste: Casa, Sicurezza,
    // Consumi. Non spariscono mai, da nessuna parte.
    const fisse = tutte.filter(x => !x.pg.nascosta);
    const ora = tutte[this._page];
    if (!ora || !ora.pg.nascosta) return fisse;
    // Dentro una stanza alle fisse si AGGIUNGONO la stanza stessa e le pagine
    // che quella stanza ha scelto: in sala il telecomando, in cucina gli
    // elettrodomestici, in camera il clima. La scelta e per stanza.
    const voci = fisse.slice();
    if (!voci.includes(ora)) voci.push(ora);
    (ora.pg.barra || []).forEach(id => {
      const v = tutte.find(x => x.pg.id === id);
      if (v && !voci.includes(v)) voci.push(v);
    });
    return voci;
  }

  _renderNav() {
    const nav = this.querySelector("[data-nav]");
    if (!nav) return;
    const voci = this._pagineVisibili();
    // Nella barra della stanza le pagine "nascoste" sono a casa loro: non vanno
    // sbiadite come quando compaiono per sbaglio nella barra generale.
    const pgOra = this._cfg.pages[this._page];
    const modoStanza = !this._edit && pgOra && pgOra.nascosta;
    const stanze = this._cfg.pages.filter(p => p.stanza);
    const conStanze = stanze.length > 0 && !this._edit;
    // L'IMPRONTA DELLA BARRA.
    // Finche le voci sono le stesse la barra NON si ricostruisce: si sposta
    // solo il cerchio. E l'unico modo perche lo spostamento si veda — un
    // elemento appena creato non ha da dove partire, e il cerchio saltava.
    const firma = voci.map(({ pg: p }) =>
      [p.id, p.title || "", p.icon || "", p.nascosta ? 1 : 0].join("~")).join("|") +
      "||" + (conStanze ? "S" : "-") + (modoStanza ? "m" : "-") + (this._edit ? "e" : "-") +
      "||" + this._azioniVisibili().map(v => (v.icona || "") + "~" + (v.testo || "")).join("|");

    const bloboVecchio = nav.querySelector("[data-blob]");
    const xPrima = (bloboVecchio && bloboVecchio.style.transform) || this._blobX || "";
    if (this._navFirma !== firma || !nav.querySelector(".fh-navbar")) {
      // Il cerchio ambra sta FUORI dalla barra che scorre: quando le voci sono
      // tante la barra diventa un contenitore a scorrimento, e un contenitore
      // a scorrimento taglia tutto quello che sporge — cerchio compreso.
      nav.innerHTML = this._azioniHTML() + `<div class="fh-navwrap">
        <span class="fh-blob" data-blob><ha-icon data-blobicon></ha-icon></span>
        <div class="fh-navbar">${voci.map(({ pg: p, i }) =>
        `<button type="button" class="fh-navitem${p.nascosta && !modoStanza ? " nascosta" : ""}" data-page="${i}">
           <ha-icon icon="${fhEsc(p.icon || "mdi:circle-outline")}"></ha-icon>
           <span class="fh-navlabel">${fhEsc(p.title || "")}</span>
         </button>`).join("")}</div>
      </div>`;
      // IL TASTO STANZE.
      // Con una pagina per stanza la barra non le puo contenere tutte, e la
      // Casa riempita di tessere diventa un muro. Cosi le stanze stanno dietro
      // un tasto solo: si tocca, si sceglie, si e dentro.
      const barra0 = nav.querySelector(".fh-navbar");
      if (conStanze) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fh-navitem";
        b.innerHTML = `<ha-icon icon="mdi:floor-plan"></ha-icon><span class="fh-navlabel">Stanze</span>`;
        b.addEventListener("click", () => this._apriStanze());
        // Stanze va SUBITO DOPO le voci fisse, non in fondo. In fondo ci
        // finiva dietro alle voci della stanza (Telecomando, Clima) e su un
        // telefono usciva dal bordo: per cambiare stanza bisognava prima
        // trascinare la barra. E il tasto con cui si gira la casa: deve
        // stare sempre dove lo trovi senza cercarlo.
        const fisse = voci.filter(v => !v.pg.nascosta).length;
        const dopo = barra0.children[fisse];
        if (dopo) barra0.insertBefore(b, dopo);
        else barra0.appendChild(b);
      }
      nav.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => {
        const i = parseInt(b.dataset.page, 10);
        if (i === this._page) return;
        this._vaiPagina(i);
      }));
      // Trascinando la barra col dito il cerchio deve restare attaccato alla
      // sua voce: si muove insieme al contenuto, senza animazione (durante il
      // trascinamento un'animazione lo farebbe arrancare dietro al dito).
      barra0.addEventListener("scroll", () => {
        if (this._scorroIo) return;
        this._muoviBlob(nav, true);
      }, { passive: true });
      if (xPrima) {
        // Il cerchio e nuovo di zecca ma riparte da dove stava quello di
        // prima: cosi anche entrando in una stanza lo si vede spostarsi.
        const b = nav.querySelector("[data-blob]");
        b.style.transition = "none";
        b.style.transform = xPrima;
        void b.offsetWidth;
        b.style.transition = "";
      }
      this._wireAzioni(nav);
      this._navFirma = firma;
      this._navNuova = !xPrima;
    }
    // La barra puo aver cambiato altezza (una pagina in piu, una nascosta):
    // rimisuro, senno lo spazio sotto resta tarato su quella di prima e
    // l'ultima card finisce coperta.
    this._misuraNav();
    // Ora che ci sono tutte le voci (Stanze compreso) si guarda se ci stanno:
    // se non ci stanno la barra scorre invece di schiacciarle in tacche
    // illeggibili.
    this._adattaBarra(nav);
    this._segnaAttiva(nav);
  }

  // IL CERCHIO CHE SCIVOLA.
  // Marcare la voce attiva e una cosa; farlo VEDERE e un'altra. Il cerchio si
  // sposta da solo fino alla voce nuova, con una molla che lo fa arrivare un
  // filo oltre e rientrare: e quel mezzo secondo che dice "sei passato di li".
  _segnaAttiva(nav) {
    const barra = nav.querySelector(".fh-navbar");
    if (!barra) return;
    let attiva = null;
    barra.querySelectorAll(".fh-navitem").forEach(b => {
      const sua = b.dataset.page !== undefined && parseInt(b.dataset.page, 10) === this._page;
      b.classList.toggle("active", sua);
      if (sua) attiva = b;
    });
    const blob = nav.querySelector("[data-blob]");
    if (!blob) return;
    // Nessuna voce corrisponde (capita in modifica, con una pagina fuori
    // dall'elenco): il cerchio si ritira invece di restare fermo a mentire.
    blob.classList.toggle("via", !attiva);
    if (!attiva) return;
    const ic = blob.querySelector("[data-blobicon]");
    const pg = this._cfg.pages[this._page] || {};
    const icona = pg.icon || "mdi:circle";
    // Il disegno cambia nell'istante in cui il cerchio parte: e gia quello
    // della pagina nuova mentre e ancora sopra la vecchia.
    if (ic.getAttribute("icon") !== icona) ic.setAttribute("icon", icona);
    const primo = this._navNuova;
    this._muoviBlob(nav, primo);
    this._navNuova = false;
    // La prima misura puo essere presa prima che la barra sia al suo posto:
    // si ricontrolla al quadro successivo, quando la pagina e assestata.
    requestAnimationFrame(() => this._riallineaBlob(primo));
  }

  // Rimettere il cerchio dove deve stare senza ridisegnare niente: serve dopo
  // una rotazione dello schermo, un cambio di larghezza, o la prima comparsa.
  _riallineaBlob(secco) {
    const nav = this.querySelector("[data-nav]");
    if (!nav || !nav.querySelector(".fh-navbar")) return;
    this._adattaBarra(nav);
    this._muoviBlob(nav, secco !== false);
  }

  // Dove va il cerchio: sopra la voce attiva, tenendo conto di quanto la barra
  // e scorsa. `secco` salta l'animazione (prima comparsa, o dito che trascina).
  _muoviBlob(nav, secco) {
    const barra = nav.querySelector(".fh-navbar");
    const blob = nav.querySelector("[data-blob]");
    if (!barra || !blob) return;
    const attiva = barra.querySelector(".fh-navitem.active");
    if (!attiva) return;
    let x = barra.offsetLeft + attiva.offsetLeft - barra.scrollLeft
      + attiva.offsetWidth / 2 - 27;
    // Non esce mai dalla barra: se trascini lontano si ferma al bordo invece
    // di andare a spasso sullo sfondo.
    const min = barra.offsetLeft + 3;
    const max = barra.offsetLeft + barra.clientWidth - 57;
    const dentro = x >= min - 1 && x <= max + 1;
    blob.classList.toggle("lontano", !dentro);
    x = Math.min(Math.max(x, min), Math.max(min, max));
    if (secco) blob.style.transition = "none";
    // translate3d e non translateX: la terza coordinata, anche a zero, dice
    // al browser di tenere questo pezzo su un piano separato.
    blob.style.transform = `translate3d(${Math.round(x)}px,0,0)`;
    this._blobX = blob.style.transform;
    if (secco) { void blob.offsetWidth; blob.style.transition = ""; }
  }


  // Ogni voce vuole almeno 66 px per restare leggibile (icona + parola). Se
  // sommate non ci stanno nello spazio disponibile, la barra passa a
  // scorrimento: si trascina col dito e la voce attiva si mette al centro.
  _adattaBarra(nav) {
    const barra = nav.querySelector(".fh-navbar");
    if (!barra) return;
    const n = barra.children.length;
    const disp = Math.min(760, (nav.clientWidth || window.innerWidth || 360) * 0.96);
    const serve = n * 66 + (n - 1) * 4 + 20;
    barra.classList.toggle("molte", serve > disp + 1);
  }

  // ------------------------------------------------------- fasce di larghezza
  // Niente container queries qui dentro: `container-type` porta con se
  // `contain: layout`, che crea un contesto di impilamento e rimetterebbe i
  // popup delle card prigionieri sotto la barra (il difetto della v0.10.1).
  // Si misura la larghezza vera con un osservatore e si ridisegna solo quando
  // si cambia fascia - non a ogni pixel.
  _fasciaDa(w) {
    const isTouch = (typeof navigator !== "undefined" && (navigator.maxTouchPoints > 0 || (navigator.userAgent && /tablet|ipad/i.test(navigator.userAgent)))) ||
                    (typeof window !== "undefined" && ("ontouchstart" in window));
    if (w < 600) return "tel";
    if (w < 1180 || (isTouch && w < 1366)) return "tab";
    return "desk";
  }

  // Finche non si e misurato davvero, si parte dalla finestra: e sempre meglio
  // di un numero inventato.
  // La fascia scritta sull'elemento: prende il posto delle container query,
  // che qui costavano troppo (vedi il commento su .fh-app).
  // Quanto e alta davvero la barra in basso, bordo dello schermo compreso.
  // Si scrive in una variabile CSS, cosi il contenuto sa di quanto tirarsi su.
  _misuraNav() {
    const app = this.querySelector(".fh-app");
    const nav = this.querySelector(".fh-nav");
    if (!app || !nav) return;
    const h = Math.ceil(nav.getBoundingClientRect().height);
    if (h > 0 && h !== this._navh) {
      this._navh = h;
      app.style.setProperty("--fh-navh", h + "px");
    }
  }

  _segnaFascia() {
    const app = this.querySelector(".fh-app");
    if (!app) return;
    const f = this._fascia || this._fasciaDa(this.clientWidth || window.innerWidth || 400);
    app.classList.toggle("tel", f === "tel");
    app.classList.toggle("tab", f === "tab");
    app.classList.toggle("desk", f === "desk");
    app.classList.toggle("vetro", (this._cfg.appearance || {}).cardStyle === "vetro");
    app.classList.toggle("chiaro", !this._isDark());
    this._applicaVetroVars();
    this._misuraNav();
    this._misuraQuadre();
  }

  _applicaVetroVars() {
    const app = this.querySelector(".fh-app");
    if (!app) return;
    const ap = (this._cfg && this._cfg.appearance) || {};
    const isVetro = ap.cardStyle === "vetro";
    const trasp = Math.max(10, Math.min(95, ap.cardTrasparenza == null ? 40 : parseInt(ap.cardTrasparenza, 10) || 40));
    const blurPx = Math.max(0, Math.min(30, ap.cardBlur == null ? 16 : parseInt(ap.cardBlur, 10) || 16));
    const isDark = this._isDark();

    if (isVetro) {
      const opacity = 1 - (trasp / 100);
      const alphaDark = Math.max(0.04, Math.min(0.85, 0.04 + opacity * 0.76));
      const alphaLight = Math.max(0.05, Math.min(0.90, 0.06 + opacity * 0.78));

      const cardBg = isDark
        ? `rgba(16, 23, 36, ${alphaDark.toFixed(2)})`
        : `rgba(255, 255, 255, ${alphaLight.toFixed(2)})`;
      const border = isDark
        ? `rgba(255, 255, 255, ${(0.03 + opacity * 0.08).toFixed(2)})`
        : `rgba(15, 23, 42, ${(0.04 + opacity * 0.08).toFixed(2)})`;

      app.style.setProperty("--fh-card-bg", cardBg);
      app.style.setProperty("--fh-card-blur", `${blurPx}px`);
      app.style.setProperty("--fh-card-border", border);
    } else {
      const cardBg = isDark ? "#161d27" : "#ffffff";
      const border = isDark ? "rgba(255, 255, 255, .08)" : "rgba(15, 23, 42, .08)";
      app.style.setProperty("--fh-card-bg", cardBg);
      app.style.setProperty("--fh-card-blur", "0px");
      app.style.setProperty("--fh-card-border", border);
    }
  }

  _fasciaOra() { return this._fascia || this._fasciaDa(this.clientWidth || window.innerWidth || 400); }

  _watchFascia() {
    const main = this.querySelector("[data-main]");
    if (!main) return;
    // Ci si riattacca ogni volta che il contenitore e un elemento NUOVO.
    // Quando il guscio viene ricostruito, il vecchio [data-main] esce dalla
    // pagina: l'osservatore restava appeso a un elemento che non esisteva
    // piu e non riferiva nulla. Cosi la larghezza restava quella di prima e
    // il telefono continuava a disegnare le colonne di uno schermo grande.
    if (this._roTarget !== main) {
      if (this._ro) this._ro.disconnect();
      this._roTarget = main;
      this._misurato = false;
      this._ro = new ResizeObserver(entries => {
        const w = entries[0].contentRect.width;
        if (!w) return;
        const primaVolta = !this._misurato;
        this._misurato = true;
        this._larghezza = w;
        const f = this._fasciaDa(w);
        const cambiata = f !== this._fascia;
        this._fascia = f;
        this._segnaFascia();
        // Solo se la larghezza e cambiata DAVVERO il cerchio si rimette a
        // posto di colpo: se no questo scatta anche quando cambia la pagina
        // (il contenitore cambia altezza) e spegne la scivolata sul nascere.
        if (this._largBlob !== w) {
          this._largBlob = w;
          this._riallineaBlob(true);
        }
        // La PRIMA misura vera fa sempre ridisegnare, anche se la fascia
        // sembra la stessa: quella di partenza era una supposizione, non una
        // misura, e il numero di colonne poteva gia essere sbagliato.
        if (primaVolta || cambiata) this._renderPage();
        else this._misuraQuadre();
      });
      this._ro.observe(main);
    }
    const w = main.clientWidth;
    if (w) { this._larghezza = w; this._fascia = this._fasciaDa(w); this._misurato = true; }
    this._segnaFascia();
  }

  // Quante colonne mostrare in questa riga, adesso. "auto" (0) vuol dire:
  // quante ce ne stanno larghe almeno quanto una card comoda.
  _colonneRiga(row) {
    // (le righe con una sola card piccola le sistema _renderPage: mezza riga)
    const f = this._fasciaOra();
    const scelto = f === "tel" ? row.n_tel : f === "tab" ? row.n_tab : row.n_desk;
    if (scelto) return Math.max(1, Math.min(6, scelto));
    const activeCols = (row.cols || []).filter(c => (c.cards || []).length > 0).length || 1;
    const totCards = (row.cols || []).reduce((acc, c) => acc + (c.cards || []).length, 0);
    if (totCards <= 1 || activeCols <= 1) return 1;
    const w = this._larghezza || this.clientWidth || window.innerWidth || 400;
    const minima = f === "tel" ? 165 : f === "tab" ? 200 : 230;
    const colAuto = Math.max(1, Math.floor((w + 14) / (minima + 14)));
    const cap = Math.min(6, Math.max(activeCols, totCards));
    return Math.max(1, Math.min(cap, colAuto));
  }

  async _renderPage() {
    const main = this.querySelector("[data-main]");
    if (!main) return;
    this._wireSwipe(main);
    this._watchFascia();
    this._applySidebar();
    const page = this._cfg.pages[this._page];
    this._cardEls.clear();
    main.innerHTML = "";
    main.classList.toggle("editing", !!this._edit);

    if (this._edit) main.appendChild(this._editBarEl());

    // La fascia del consumo sta SOPRA le card, non fra le card: e la prima
    // cosa che si vede entrando nella stanza, e non deve dipendere da come
    // Cristian ha disposto il resto.
    // "Serve qualcosa?" sta SOPRA tutto, consumo compreso: e la prima riga
    // che si legge entrando, e spesso l'unica che serve.
    const att = this._attenzioneCfg();
    if (att.attiva && page && (att.dove === "tutte" || this._page === 0)) {
      main.appendChild(this._fasciaAttenzioneEl());
    }
    if (page && this._consumoCfg(page).attiva) main.appendChild(this._fasciaConsumoEl(page));

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
      // In visualizzazione normale escludiamo le colonne vuote per non creare buchi
      const activeCols = (row.cols || []).filter(c => (c.cards || []).length > 0);
      const colsToRender = this._edit ? (row.cols || []) : activeCols;
      const totCards = activeCols.reduce((acc, c) => acc + (c.cards || []).length, 0);
      // UNA CARD QUADRATA VALE MEZZA RIGA. Prima "quadrata" cambiava solo la
      // forma: due tessere impilate nella stessa colonna restavano impilate,
      // ognuna larga quanto la pagina, e quindi non diventavano nemmeno
      // quadrate (una card larga 340 e alta 340 non ci sta). Se la riga ha una
      // traccia sola si apre a due, cosi due quadrate si affiancano davvero.
      // Le card NON quadrate della stessa riga restano larghe quanto la riga:
      // il meteo sopra non si dimezza.
      const conQuadre = activeCols.some(c => (c.cards || []).some(cc => this._isQuadra(cc)));
      let n = this._colonneRiga(row);
      if (!this._edit && conQuadre && totCards > 1 && n < 2) n = 2;
      inner.style.setProperty("--fh-n", n);
      const isStanza = !!(page && (page.stanza || (page.rows && page.rows.length === 1 && totCards > 2)));
      // Appiattisce in griglia diretta per allineare perfettamente le card su ogni riga
      // Le quadrate impilate nella STESSA colonna hanno bisogno che la colonna
      // sparisca come scatola (piatta), se no restano una sopra l'altra. Le
      // righe gia fatte di colonne separate — le persone — non si toccano.
      const quadreImpilate = conQuadre && activeCols.some(c => (c.cards || []).length > 1);
      const piatta = !this._edit && (n < colsToRender.length || totCards > n || isStanza || quadreImpilate ||
        (row.riempi === false && n > 1));
      inner.classList.toggle("piatta", piatta);
      // Riga di sole Mini Card: sul tablet diventa una griglia fitta di tessere.
      const tessere = totCards > 0 && activeCols.every(c => (c.cards || []).every(cc => cc && cc.type === "custom:mini-card"));
      inner.classList.toggle("tessere", tessere);
      // Una card PICCOLA da sola (il robot, il cancelletto) sul tablet si
      // allargava su tutta la riga, con un tasto giallo lungo un metro: sta in
      // mezza riga, sulla stessa linea delle righe da due card.
      const primaCard = totCards === 1 ? activeCols.map(c => (c.cards || [])[0]).find(Boolean) : null;
      const solaPiccola = !this._edit && this._fasciaOra() !== "tel" && primaCard && FH_CARD_PICCOLE.has(primaCard.type);
      if (solaPiccola) inner.style.setProperty("--fh-n", 2);
      colsToRender.forEach((col, ci) => {
        const colEl = document.createElement("div");
        colEl.className = "fh-col";
        // Se la riga ha solo una colonna attiva, prende tutte le tracce della riga
        // Di regola una card rimasta sola in una riga si allarga e si prende
        // tutta la riga, se no resterebbe un buco. Ma a volte il buco lo si
        // vuole: e il posto dove domani andra un'altra card, e intanto questa
        // deve restare grande come le sue vicine della riga sopra (Cristian:
        // "il congelatore fallo grande come le altre cosi rimane spazio per un
        // eventuale elettrodomestico"). Si decide riga per riga, con la
        // puntina "lascia il posto libero".
        const quante = solaPiccola ? 1
          : (!this._edit && activeCols.length <= 1 && row.riempi !== false) ? n
          : Math.min(col.span || 1, n);
        if (!piatta) colEl.style.gridColumn = `span ${quante}`;
        colEl.dataset.col = ci;
        if (this._edit) colEl.appendChild(this._colToolsEl(ri, ci));
        (col.cards || []).forEach((cardCfg, di) => {
          const el = this._createCard(cardCfg, helpers);
          if (!el) return;
          // Ogni card vive in un suo alloggiamento: e li che si applica
          // l'altezza scelta, ed e quello che si trascina.
          const slot = document.createElement("div");
          slot.className = "fh-slot";
          slot.dataset.slot = `${ri}.${ci}.${di}`;
          if (cardCfg && cardCfg.type === "custom:mini-card") slot.classList.add("tessera");
          // Smontando il gruppo la larghezza della colonna deve passare alle
          // CARD, che diventano loro gli elementi della griglia. Senza questo
          // una card larga due colonne si ritrovava stretta in una sola: era
          // il meteo che tornava verticale appena salvato, mentre in modifica
          // (dove il gruppo resta montato) si vedeva giusto.
          const isQuadra = this._isQuadra(cardCfg);
          // La quadrata si prende una traccia sola: e questo che la mette
          // accanto alla sua vicina invece che sotto.
          if (piatta && quante > 1) slot.style.gridColumn = isQuadra ? "span 1" : `span ${quante}`;
          const h = this._altezzaCard(cardCfg);
          if (h) { slot.style.setProperty("--fh-h", h + "px"); slot.classList.add("fissa"); }
          if (isQuadra) {
            slot.classList.add("quadra");
            const cap = FH_QUADRA_CAP[cardCfg.grandezza] || (this._fasciaOra() !== "tel" ? 240 : null);
            if (cap) slot.style.setProperty("--fh-quadra", cap + "px");
            if (cardCfg.grandezza) slot.dataset.taglia = cardCfg.grandezza;
          }
          if (this._edit) {
            slot.classList.add("editing");
            slot.appendChild(this._cardToolsEl(ri, ci, di));
            slot.appendChild(el);
            // In modifica il tocco non deve accendere una presa ne aprire un
            // popup: uno strato trasparente sopra la card intercetta tutto.
            const shield = document.createElement("div");
            shield.className = "fh-shield";
            slot.appendChild(shield);
            // L'angolo si tira come quello di una foto.
            const ang = document.createElement("div");
            ang.className = "fh-ang";
            ang.title = "Tira per ridimensionare";
            slot.appendChild(ang);
            this._wireResize(ang, ri, ci, di);
          } else {
            slot.appendChild(el);
          }
          colEl.appendChild(slot);
        });
        if (this._edit) colEl.appendChild(this._addCardEl(ri, ci));
        inner.appendChild(colEl);
      });
      rowEl.appendChild(inner);
      main.appendChild(rowEl);
    });
    if (this._edit) main.appendChild(this._addRowEl());
    this._misuraQuadre();
  }

  // Quadrata puo arrivare da quattro chiavi diverse: la nostra (fh_forma), e
  // quelle che certe card si scrivono da sole nel loro editor. Erano lette in
  // un punto solo dentro il disegno della pagina; adesso serve anche prima,
  // per decidere quante colonne aprire, quindi vivono qui.
  _isQuadra(cfg) {
    return !!cfg && (
      cfg.fh_forma === "quadra" ||
      cfg.forma === "quadrato" ||
      cfg.forma_card === "quadrata" ||
      cfg.taglia === "quadrata"
    );
  }

  // Quanto e larga ogni casella quadrata, adesso: glielo si chiede dopo che
  // la pagina e stata disposta, perche prima la larghezza non esiste ancora.
  // Si scrive come altezza MINIMA, non fissa: e la differenza fra una card
  // quadrata e una card tagliata.
  // Misurare la larghezza e scrivere l'altezza non innesca nessun giro
  // vizioso: cambiando l'altezza la larghezza non si muove.
  _misuraQuadre() {
    const quadre = this.querySelectorAll(".fh-slot.quadra");
    if (!quadre.length) return;
    // Sul tablet le quadrate che non sono tessere riempiono la cella in
    // larghezza e hanno un'altezza fissa dal CSS: quadrate da 464px erano
    // due persone alte mezzo schermo.
    const tab = this._fasciaOra() === "tab";
    const applica = () => quadre.forEach(el => {
      if (tab && !el.classList.contains("tessera")) { el.style.height = ""; return; }
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) {
        el.style.setProperty("--fh-q", w + "px");
        if (!this._edit) el.style.height = w + "px";
        else el.style.height = "";
      }
    });
    applica();
    // E una seconda volta appena il browser ha finito di sistemare tutto:
    // al primo giro le immagini non sono ancora arrivate e le larghezze
    // possono cambiare ancora.
    requestAnimationFrame(applica);
  }


  // L'altezza vive sotto una chiave nostra, come il popup, e viene tolta prima
  // di consegnare la configurazione a Home Assistant: certe card native
  // rifiutano chiavi che non conoscono.
  _altezzaCard(cfg) { const h = parseInt(cfg && cfg.fh_h, 10); return isFinite(h) && h > 0 ? h : 0; }

  // --------------------------------------------------------------- modifica
  _toggleEdit() {
    this._edit = !this._edit;
    if (!this._edit) {
      const app = this.querySelector(".fh-app");
      if (app) { app.style.maxWidth = ""; app.style.margin = ""; }
      this._prova = null;
    }
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
      <span class="fh-prova" title="Guarda come viene sugli altri schermi">
        ${[["tel", "mdi:cellphone", "Telefono", 400], ["tab", "mdi:tablet", "Tablet", 800],
           ["desk", "mdi:monitor", "Schermo grande", 0]]
          .map(([k, ic, tit, w]) => `<button type="button" class="fh-pv${(this._prova || "desk") === k ? " sel" : ""}"
            data-prova="${k}" data-w="${w}" title="${tit}"><ha-icon icon="${ic}"></ha-icon></button>`).join("")}
      </span>
      <button type="button" class="fh-btn" data-act="pagine">Pagine</button>
      <button type="button" class="fh-btn" data-act="annulla">Annulla</button>
      <button type="button" class="fh-btn primary" data-act="salva">Salva</button>`;
    el.querySelectorAll("[data-prova]").forEach(b => b.addEventListener("click", () => {
      this._prova = b.dataset.prova;
      const w = parseInt(b.dataset.w, 10);
      const app = this.querySelector(".fh-app");
      // Si stringe il pannello per davvero, cosi si vede il layout vero e non
      // una simulazione: le colonne si ricontano da sole, come sul telefono.
      if (w) { app.style.maxWidth = w + "px"; app.style.margin = "0 auto"; }
      else { app.style.maxWidth = ""; app.style.margin = ""; }
      this._renderPage();
    }));
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "salva") this._save();
      else if (a === "annulla") {
        if (this._snapshot) this._cfg = JSON.parse(this._snapshot);
        this._edit = false;
        this._vaiPagina(Math.min(this._page, this._cfg.pages.length - 1));
      } else if (a === "pagine") this._openPageSheet();
    }));
    return el;
  }

  _rowToolsEl(ri) {
    const el = document.createElement("div");
    el.className = "fh-tools";
    const row = this._cfg.pages[this._page].rows[ri];
    const scelte = [
      { k: "n_tel", i: "mdi:cellphone", t: "Sul telefono" },
      { k: "n_tab", i: "mdi:tablet", t: "Sul tablet" },
      { k: "n_desk", i: "mdi:monitor", t: "Su schermo grande" },
    ];
    el.innerHTML = `<span class="fh-toolslabel">Riga ${ri + 1}${row.fissa ? " \u00b7 in cima" : ""}</span>
      ${this._btn(row.fissa ? "mdi:pin" : "mdi:pin-outline",
        row.fissa ? "Tenuta in cima: le nuove card non la scavalcano" : "Tieni questa riga in cima", "fissa")}
      ${this._btn("mdi:table-column-plus-after", "Aggiungi colonna", "addcol")}
      ${this._btn(row.riempi === false ? "mdi:view-grid-outline" : "mdi:arrow-expand-horizontal",
        row.riempi === false
          ? "Il posto accanto resta libero: le card restano della loro misura"
          : "Una card sola si allarga su tutta la riga", "riempi")}
      ${this._btn("mdi:arrow-up", "Sposta su", "up")}
      ${this._btn("mdi:arrow-down", "Sposta giu", "down")}
      ${this._btn("mdi:delete-outline", "Elimina riga", "del")}
      <div class="fh-perriga">
        ${scelte.map(x => `<span class="fh-pr" title="${x.t}">
          <ha-icon icon="${x.i}"></ha-icon>
          <select data-n="${x.k}">
            <option value="0"${!row[x.k] ? " selected" : ""}>auto</option>
            ${[1, 2, 3, 4, 5, 6].map(v => `<option value="${v}"${row[x.k] === v ? " selected" : ""}>${v}</option>`).join("")}
          </select>
        </span>`).join("")}
        <span class="fh-prnota">card per riga</span>
      </div>`;
    el.querySelectorAll("[data-n]").forEach(sel => sel.addEventListener("change", () => {
      row[sel.dataset.n] = parseInt(sel.value, 10) || 0;
      this._renderPage();
    }));
    const rows = this._cfg.pages[this._page].rows;
    if (row.fissa) {
      const sp = el.querySelector('[data-act="fissa"]');
      if (sp) sp.classList.add("acceso");
    }
    if (row.riempi === false) {
      const sp = el.querySelector('[data-act="riempi"]');
      if (sp) sp.classList.add("acceso");
    }
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "fissa") rows[ri].fissa = !rows[ri].fissa;
      else if (a === "riempi") rows[ri].riempi = rows[ri].riempi === false ? true : false;
      else if (a === "addcol") rows[ri].cols.push({ span: 1, cards: [] });
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
    const haPop = !!(this._cfg.pages[this._page].rows[ri].cols[ci].cards[di].fh_popup || {}).cards;
    const cfgAtt = this._cfg.pages[this._page].rows[ri].cols[ci].cards[di];
    const quadraAtt = cfgAtt.fh_forma === "quadra";
    const hAtt = this._altezzaCard(cfgAtt) || quadraAtt;
    // Otto comandi in fila stavano bene su una card larga, ma su una card
    // quadrata da 190px andavano a capo su tre righe e la barra diventava piu
    // alta della card. Qui restano i tre che si usano davvero — sposta,
    // sinistra, destra — e il resto entra in un menu.
    el.innerHTML = `<button type="button" class="fh-grip" data-grip title="Trascina per spostare"><ha-icon icon="mdi:drag"></ha-icon></button>
      ${this._btn("mdi:arrow-left", "Colonna precedente", "left")}
      ${this._btn("mdi:arrow-right", "Colonna successiva", "right")}
      ${this._btn("mdi:cog-outline", "Configura card", "cfg")}
      <div class="fh-menu">
        ${this._btn("mdi:dots-vertical", "Altro", "menu")}
        <div class="fh-menupop" hidden>
          <button type="button" class="fh-mi" data-act="cfg"><ha-icon icon="mdi:cog-outline"></ha-icon>Configura</button>
          <button type="button" class="fh-mi" data-act="pop"><ha-icon icon="mdi:dock-window"></ha-icon>Popup al tocco${haPop ? " \u2713" : ""}</button>
          <button type="button" class="fh-mi" data-act="dup"><ha-icon icon="mdi:content-copy"></ha-icon>Duplica</button>
          <div class="fh-misep"></div>
          <div class="fh-milab">Forma</div>
          <button type="button" class="fh-mi" data-forma="auto"><ha-icon icon="mdi:arrow-expand-vertical"></ha-icon>Auto${!hAtt ? " \u2713" : ""}</button>
          <button type="button" class="fh-mi" data-forma="quadrata"><ha-icon icon="mdi:square-outline"></ha-icon>Quadrata${quadraAtt ? " ✓" : ""}</button>
          <button type="button" class="fh-mi" data-forma="larga"><ha-icon icon="mdi:rectangle-outline"></ha-icon>Rettangolare</button>
          <button type="button" class="fh-mi" data-forma="alta"><ha-icon icon="mdi:rectangle-outline"></ha-icon>Alta</button>
          <div class="fh-misep"></div>
          <button type="button" class="fh-mi rosso" data-act="del"><ha-icon icon="mdi:delete-outline"></ha-icon>Elimina</button>
        </div>
      </div>`;
    const pop = el.querySelector(".fh-menupop");
    el.querySelector('[data-act="menu"]').addEventListener("click", e => {
      e.stopPropagation();
      // Un solo menu aperto alla volta, senno restano appesi in giro.
      this.querySelectorAll(".fh-menupop").forEach(x => {
        if (x !== pop) {
          x.hidden = true;
          x.style.left = "";
          x.style.right = "";
          x.style.transform = "";
        }
      });
      pop.hidden = !pop.hidden;
      if (!pop.hidden) {
        pop.style.left = "";
        pop.style.right = "0";
        pop.style.transform = "";

        // Calcola se il menu sborda a sinistra o a destra dello schermo
        const rect = pop.getBoundingClientRect();
        if (rect.left < 10) {
          // Card nella colonna di sinistra: ancorato a destra sborda a sinistra.
          // Ancoriamolo a sinistra del tasto menu
          pop.style.left = "0";
          pop.style.right = "auto";
          const r2 = pop.getBoundingClientRect();
          if (r2.left < 10) {
            pop.style.transform = `translateX(${Math.ceil(10 - r2.left)}px)`;
          } else if (r2.right > window.innerWidth - 10) {
            pop.style.transform = `translateX(-${Math.ceil(r2.right - (window.innerWidth - 10))}px)`;
          }
        } else if (rect.right > window.innerWidth - 10) {
          pop.style.transform = `translateX(-${Math.ceil(rect.right - (window.innerWidth - 10))}px)`;
        }

        const chiudi = () => {
          pop.hidden = true;
          pop.style.left = "";
          pop.style.right = "";
          pop.style.transform = "";
          document.removeEventListener("click", chiudi, true);
        };
        setTimeout(() => document.addEventListener("click", chiudi, true), 0);
      }
    });
    el.querySelectorAll("[data-forma]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      pop.hidden = true;
      pop.style.left = "";
      pop.style.right = "";
      pop.style.transform = "";
      this._formaCard(ri, ci, di, b.dataset.forma);
    }));
    this._wireDrag(el.querySelector("[data-grip]"), ri, ci, di);
    const cols = this._cfg.pages[this._page].rows[ri].cols;
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "menu") return;
      if (pop) {
        pop.hidden = true;
        pop.style.left = "";
        pop.style.right = "";
        pop.style.transform = "";
      }
      const cards = cols[ci].cards;
      if (a === "cfg") { this._openCardEditor(ri, ci, di); return; }
      if (a === "pop") { this._openPopupEditor(ri, ci, di); return; }
      if (a === "dup") cards.splice(di + 1, 0, JSON.parse(JSON.stringify(cards[di])));
      else if (a === "del") cards.splice(di, 1);
      else if (a === "left" && ci > 0) { const [c] = cards.splice(di, 1); cols[ci - 1].cards.push(c); this._puliscivuote(ri); }
      else if (a === "right" && ci < cols.length - 1) { const [c] = cards.splice(di, 1); cols[ci + 1].cards.push(c); this._puliscivuote(ri); }
      this._renderPage();
    }));
    return el;
  }


  // ------------------------------------------------------------ trascinamento

  // Si trascina dalla MANIGLIA, non da tutta la card: e la lezione della Smart
  // Card, dove `touch-action:none` steso su tutto trasformava la tela in una
  // zona morta per lo scorrimento. Qui solo la maniglia blocca il tocco; il
  // resto della pagina scorre come sempre.
  //
  // Due cose che prima lo rendevano impossibile, e che valgono per qualunque
  // card dentro Home Assistant:
  //  1. il fantasma finiva in document.body, cioe FUORI dall'albero ombra dove
  //     vivono questi stili: nasceva senza forma e senza posizione;
  //  2. document.elementsFromPoint non entra nell'ombra, quindi non trovava mai
  //     una card sotto il dito. Qui si confrontano i rettangoli a mano.
  _wireDrag(grip, ri, ci, di) {
    if (!grip) return;
    grip.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const main = this.querySelector("[data-main]");
      const slot = grip.closest(".fh-slot");
      if (!slot || !main) return;
      // La cattura e un di piu: se fallisce (capita, e non e colpa nostra)
      // non deve portarsi dietro tutto il trascinamento. Gli eventi si
      // ascoltano comunque sulla finestra, che li riceve sempre, anche
      // quando il dito esce dalla maniglia.
      try { grip.setPointerCapture(ev.pointerId); } catch (e) { /* pazienza */ }

      const r = slot.getBoundingClientRect();
      const fantasma = slot.cloneNode(true);
      fantasma.classList.add("fh-ghost");
      fantasma.style.width = r.width + "px";
      fantasma.style.height = r.height + "px";
      // Dentro il pannello, non nel body: qui gli stili lo raggiungono.
      this.appendChild(fantasma);
      const dx = ev.clientX - r.left, dy = ev.clientY - r.top;
      const muovi = (x, y) => {
        fantasma.style.left = (x - dx) + "px";
        fantasma.style.top = (y - dy) + "px";
      };
      muovi(ev.clientX, ev.clientY);
      slot.classList.add("fh-dragging");
      main.classList.add("fh-dragmode");

      let bersaglio = null;
      const pulisci = () => {
        main.querySelectorAll(".fh-drop-prima,.fh-drop-dopo,.fh-drop-in")
          .forEach(x => x.classList.remove("fh-drop-prima", "fh-drop-dopo", "fh-drop-in"));
      };

      const cerca = (x, y) => {
        pulisci();
        bersaglio = null;
        // Prima le card: si guarda quale rettangolo contiene il dito.
        const slots = [...main.querySelectorAll(".fh-slot")].filter(s => s !== slot && !s.classList.contains("fh-ghost"));
        for (const s of slots) {
          const b = s.getBoundingClientRect();
          if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
            const dopo = y > b.top + b.height / 2;
            s.classList.add(dopo ? "fh-drop-dopo" : "fh-drop-prima");
            bersaglio = { tipo: "slot", el: s, dopo };
            return;
          }
        }
        // Poi le colonne, per lasciarla in fondo a una colonna vuota.
        const cols = [...main.querySelectorAll(".fh-col")];
        for (const c of cols) {
          const b = c.getBoundingClientRect();
          if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
            c.classList.add("fh-drop-in");
            bersaglio = { tipo: "col", el: c };
            return;
          }
        }
      };

      const onMove = e => { muovi(e.clientX, e.clientY); cerca(e.clientX, e.clientY); };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp, true);
        window.removeEventListener("pointercancel", onUp, true);
        fantasma.remove();
        slot.classList.remove("fh-dragging");
        main.classList.remove("fh-dragmode");
        pulisci();
        if (bersaglio) this._sposta(ri, ci, di, bersaglio);
      };
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });
  }

  // ------------------------------------------------------ ridimensionamento
  // Si tira l'angolo come si fa con una foto: in verticale cambia l'altezza,
  // in orizzontale cambia quante colonne occupa. La larghezza non puo essere
  // libera: le card stanno in una griglia, e una larghezza a caso spaccherebbe
  // l'allineamento con tutte le altre.
  _wireResize(ang, ri, ci, di) {
    if (!ang) return;
    ang.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const slot = ang.closest(".fh-slot");
      const col = ang.closest(".fh-col");
      const riga = ang.closest(".fh-row");
      if (!slot || !col || !riga) return;
      try { ang.setPointerCapture(ev.pointerId); } catch (e) { /* pazienza */ }

      const cfg = this._cfg.pages[this._page].rows[ri].cols[ci].cards[di];
      const colonna = this._cfg.pages[this._page].rows[ri].cols[ci];
      const h0 = slot.getBoundingClientRect().height;
      const x0 = ev.clientX, y0 = ev.clientY;
      const tracce = getComputedStyle(riga).gridTemplateColumns.split(" ").length;
      const larghezzaTraccia = riga.getBoundingClientRect().width / Math.max(1, tracce);
      const span0 = Math.min(colonna.span || 1, tracce);
      let hNuova = h0, spanNuovo = span0;

      const etichetta = document.createElement("div");
      etichetta.className = "fh-misura";
      slot.appendChild(etichetta);
      const mostra = () => { etichetta.textContent = "almeno " + Math.round(hNuova) + " px · " + spanNuovo + (spanNuovo === 1 ? " colonna" : " colonne"); };

      const onMove = e => {
        hNuova = Math.max(80, Math.min(900, h0 + (e.clientY - y0)));
        const passi = Math.round((e.clientX - x0) / larghezzaTraccia);
        spanNuovo = Math.max(1, Math.min(tracce, span0 + passi));
        slot.style.setProperty("--fh-h", hNuova + "px");
        slot.classList.add("fissa");
        col.style.gridColumn = "span " + spanNuovo;
        mostra();
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp, true);
        window.removeEventListener("pointercancel", onUp, true);
        if (this.__mollaTocchi) { this.__mollaTocchi(); this.__mollaTocchi = null; }
        etichetta.remove();
        cfg.fh_h = Math.round(hNuova);
        colonna.span = spanNuovo;
        this._renderPage();
      };
      // Col dito il browser manda DUE famiglie di eventi: pointer* e touch*.
      // Qui sopra fermiamo i pointer, ma chi fa scorrere le viste (la
      // navigazione a scorrimento di Home Assistant) ascolta i touch: vedeva
      // il trascinamento orizzontale come una sfogliata e cambiava schermata
      // mentre stavi ridimensionando. Finche si trascina, i touch li
      // ingoiamo noi in fase di cattura, cioe prima che arrivino a chiunque.
      const ingoia = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
      window.addEventListener("touchstart", ingoia, { capture: true, passive: false });
      window.addEventListener("touchmove", ingoia, { capture: true, passive: false });
      this.__mollaTocchi = () => {
        window.removeEventListener("touchstart", ingoia, true);
        window.removeEventListener("touchmove", ingoia, true);
      };

      mostra();
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });
  }

  // Le forme pronte si calcolano sulla larghezza VERA della card in quel
  // momento: "quadrata" non e un numero fisso, dipende da quanto e larga.
  _formaCard(ri, ci, di, forma) {
    const slot = this.querySelector(`[data-slot="${ri}.${ci}.${di}"]`);
    const w = slot ? slot.getBoundingClientRect().width : 300;
    const cfg = this._cfg.pages[this._page].rows[ri].cols[ci].cards[di];
    if (forma === "auto") { delete cfg.fh_h; delete cfg.fh_forma; }
    else if (forma === "quadrata") { cfg.fh_forma = "quadra"; delete cfg.fh_h; }
    else if (forma === "larga") { cfg.fh_h = Math.round(w * 0.58); delete cfg.fh_forma; }
    else if (forma === "alta") { cfg.fh_h = Math.round(w * 1.5); delete cfg.fh_forma; }
    this._renderPage();
  }

  // Si toglie prima e si reinserisce dopo, ricalcolando l'indice: togliere una
  // card sposta di uno tutte quelle che le stavano dietro nella stessa colonna,
  // e senza tenerne conto la card finirebbe un posto piu in la di dove l'hai
  // lasciata.
  // Una colonna svuotata resta li e continua a prendersi il suo spazio: una
  // fetta di pagina vuota che sposta tutto il resto.
  _puliscivuote(ri) {
    const riga = this._cfg.pages[this._page].rows[ri];
    if (!riga) return;
    riga.cols = (riga.cols || []).filter(c => (c.cards || []).length);
    if (!riga.cols.length) {
      this._cfg.pages[this._page].rows.splice(ri, 1);
    }
  }

  _sposta(ri, ci, di, bersaglio) {
    const rows = this._cfg.pages[this._page].rows;
    let dest;
    if (bersaglio.tipo === "slot") {
      const [tri, tci, tdi] = bersaglio.el.dataset.slot.split(".").map(Number);
      dest = { ri: tri, ci: tci, i: tdi + (bersaglio.dopo ? 1 : 0) };
    } else {
      const colEl = bersaglio.el;
      const rowEl = colEl.closest(".fh-row");
      const tri = [...this.querySelectorAll("[data-main] .fh-row")].indexOf(rowEl);
      const tci = parseInt(colEl.dataset.col, 10);
      if (tri < 0 || isNaN(tci)) return;
      dest = { ri: tri, ci: tci, i: (rows[tri].cols[tci].cards || []).length };
    }
    if (dest.ri === ri && dest.ci === ci && (dest.i === di || dest.i === di + 1)) return;
    const [card] = rows[ri].cols[ci].cards.splice(di, 1);
    if (!card) return;
    let i = dest.i;
    if (dest.ri === ri && dest.ci === ci && dest.i > di) i -= 1;
    const arr = rows[dest.ri].cols[dest.ci].cards;
    arr.splice(Math.max(0, Math.min(i, arr.length)), 0, card);
    this._puliscivuote(ri);
    this._renderPage();
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
    const wrap = document.createElement("div");
    wrap.className = "fh-addbar";
    const riga = document.createElement("button");
    riga.type = "button";
    riga.className = "fh-addrow";
    riga.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon> Aggiungi riga`;
    riga.addEventListener("click", () => {
      this._cfg.pages[this._page].rows.push({ cols: [{ span: 1, cards: [] }] });
      this._renderPage();
    });
    const stanza = document.createElement("button");
    stanza.type = "button";
    stanza.className = "fh-addrow";
    stanza.innerHTML = `<ha-icon icon="mdi:sofa-outline"></ha-icon> Aggiungi una stanza`;
    stanza.addEventListener("click", () => this._openRoomSheet());
    wrap.appendChild(riga);
    wrap.appendChild(stanza);
    return wrap;
  }


  // ----------------------------------------------------------- fogli a comparsa
  // Un solo foglio alla volta, chiuso toccando fuori o la X: e il modo in cui
  // si configura stando col telefono in una mano.
  // Il piede resta sempre in vista, anche con un editor lunghissimo: senza,
  // arrivato in fondo alla configurazione non si capiva piu come confermare,
  // e il Salva vero era nascosto dietro il foglio.
  _sheetFooter(scrimGetter) {
    const foot = document.createElement("div");
    foot.className = "fh-sheetfoot";
    foot.innerHTML = `<span class="fh-footmsg" data-msg>Le modifiche si vedono subito dietro al pannello.</span>
      <button type="button" class="fh-btn" data-act="fatto">Fatto</button>
      <button type="button" class="fh-btn primary" data-act="salva">Salva</button>`;
    foot.querySelector('[data-act="fatto"]').addEventListener("click", () => {
      const sc = scrimGetter();
      if (sc) sc.remove();
    });
    foot.querySelector('[data-act="salva"]').addEventListener("click", async () => {
      const msg = foot.querySelector("[data-msg]");
      msg.textContent = "Salvo...";
      const ok = await this._save(true);
      if (ok) {
        // Chiudo io il foglio: dopo il salvataggio Home Assistant ricostruisce
        // il pannello e il foglio sparirebbe comunque, ma di rimbalzo, come se
        // fosse crollato qualcosa. Meglio che sia una scelta.
        const sc = scrimGetter();
        if (sc) sc.remove();
      } else {
        msg.textContent = "Non sono riuscito a salvare.";
      }
    });
    return foot;
  }

  _sheet(title, bodyEl, conPiede) {
    const prev = this.querySelector(".fh-scrim");
    if (prev) prev.remove();
    const scrim = document.createElement("div");
    scrim.className = "fh-scrim";
    // Altezza bloccata a com'e adesso, non lasciata a inset:0/vh: quando poi
    // si tocca un campo di testo dentro al foglio la tastiera cambia il
    // viewport, e un vetro sfocato che deve rifarsi i conti ad ogni apertura
    // e chiusura per un attimo si vede senza sfocatura, cioe il "flash" in
    // configurazione. Fissando l'altezza una volta sola la tastiera non
    // tocca piu questo strato.
    const hFinestra = window.innerHeight;
    scrim.style.height = hFinestra + "px";
    const sheet = document.createElement("div");
    sheet.className = "fh-sheet";
    sheet.style.maxHeight = Math.round(hFinestra * 0.86) + "px";
    sheet.innerHTML = `<div class="fh-sheethead">
        <div class="fh-sheettitle">${fhEsc(title)}</div>
        <button type="button" class="fh-ic" data-close><ha-icon icon="mdi:close"></ha-icon></button>
      </div>`;
    const body = document.createElement("div");
    body.className = "fh-sheetbody";
    body.appendChild(bodyEl);
    sheet.appendChild(body);
    if (conPiede) sheet.appendChild(this._sheetFooter(() => scrim));
    scrim.appendChild(sheet);
    const chiudi = () => {
      if (scrim.__primaDiChiudere) {
        try { scrim.__primaDiChiudere(); } catch (e) { console.warn("[faber-home] chiusura:", e); }
      }
      scrim.remove();
    };
    scrim.addEventListener("click", e => { if (e.target === scrim) chiudi(); });
    sheet.querySelector("[data-close]").addEventListener("click", chiudi);
    this.querySelector(".fh-app").appendChild(scrim);
    return scrim;
  }

  // Catalogo: le card di famiglia con uno stub gia pronto, piu qualche tipo
  // nativo di Home Assistant per le cose di tutti i giorni.
  _catalog() {
    return [
      { g: "Faber", n: "Mini Card - dispositivo", i: "mdi:power-socket-eu", c: { type: "custom:mini-card", name: "Dispositivo", icon_type: "generic", mode: "device",
        power: "", energy: "", switch: "", temp: "", humidity: "", climate: "", device_id: "", path: "", group: "",
        soglia: 10, soglia_freddo: 18, soglia_caldo: 26, prezzo_kwh: 0.30, storico_giorni: 14 } },
      { g: "Faber", n: "Mini Card - stanza", i: "mdi:sofa", c: { type: "custom:mini-card", name: "Stanza", icon_type: "livingroom", mode: "room",
        power: "", energy: "", switch: "", temp: "", humidity: "", climate: "", device_id: "", path: "", group: "",
        soglia: 10, soglia_freddo: 18, soglia_caldo: 26, prezzo_kwh: 0.30, storico_giorni: 14 } },
      { g: "Faber", n: "Smart Card (tela)", i: "mdi:palette-swatch-outline", c: { type: "custom:smart-card", name: "Smart Card", canvas: { w: 100, h: 50 }, elements: [] } },
      { g: "Faber", n: "Cancello (con timer)", i: "mdi:gate", c: { type: "custom:faber-cancello", name: "Cancello" } },
      { g: "Faber", n: "Fuori casa (automazione)", i: "mdi:shield-home", c: { type: "custom:faber-fuoricasa", name: "Fuori casa", entity: "" } },
      { g: "Faber", n: "Automazioni e sistema", i: "mdi:robot-happy-outline", c: { type: "custom:faber-automazioni", name: "Automazioni", compatta: true, gruppi: [] } },
      { g: "Faber", n: "Rifiuti porta a porta", i: "mdi:recycle", c: { type: "custom:faber-rifiuti", name: "Rifiuti", calendario: { lun: "", mar: "", mer: "", gio: "", ven: "", sab: "", dom: "" } } },
      { g: "Faber", n: "Manuali e libretti", i: "mdi:book-open-page-variant", c: { type: "custom:faber-manuali", name: "Manuali", voci: [] } },
      { g: "Faber", n: "Robot aspirapolvere", i: "mdi:robot-vacuum", c: { type: "custom:faber-robot", name: "Robot", entity: "" } },
      { g: "Faber", n: "Casse e TV (player)", i: "mdi:speaker-wireless", c: { type: "custom:faber-player", entity: "" } },
      { g: "Faber", n: "Pulsantiera / telecomando", i: "mdi:remote", c: { type: "custom:faber-pulsantiera", name: "Comandi", icona: "mdi:remote", remote: "", device: "", tasti: [] } },
      { g: "Faber", n: "Lista della Spesa", i: "mdi:cart-outline", c: { type: "custom:faber-spesa", name: "Lista della Spesa" } },
      { g: "Faber", n: "Meteo", i: "mdi:weather-partly-cloudy", c: { type: "custom:faber-weather", entity: "", days: 4 } },
      { g: "Faber", n: "Telecomando", i: "mdi:remote-tv", c: { type: "custom:faber-media", title: "Telecomando",
        selettore: "input_select.remote_type", script_tasto: "script.remote_press_button",
        script_sorgente: "script.remote_changesource", extra_nome: "Netflix", mostra_extra: true } },
      { g: "Faber", n: "Persona (avatar animato)", i: "mdi:account-heart", c: { type: "custom:faber-persona",
        person: "", name: "", avatars: "", forma: "cerchio", grandezza: "media", disposizione: "colonna",
        mostra_distanza: true, mostra_indirizzo: true, mostra_batteria: true } },
      { g: "Faber", n: "Clima / condizionatore", i: "mdi:air-conditioner", c: { type: "custom:faber-clima",
        climate: "", name: "", temp: "", humidity: "", power: "", presa: "", energy: "",
        prezzo_kwh: 0.30, storico_giorni: 14, aspetto: "auto",
        mostra_ventola: true, mostra_alette: true, mostra_programmi: true } },
      { g: "Faber", n: "Carichi reali", i: "mdi:gauge", c: { type: "custom:faber-carichi", title: "Carichi reali",
        totale: "", gruppo: "", prezzo_kwh: 0.30, soglia_media: 1500, soglia_alta: 2500, top: 5, soglia_acceso: 5, naviga: "" } },
      { g: "Faber", n: "Controllo Carichi", i: "mdi:transmission-tower",
        c: { type: "custom:faber-pc", title: "Controllo Carichi", prezzo_kwh: 0.30 } },
      { g: "Faber", n: "Adesso in casa", i: "mdi:flash-outline", c: { type: "custom:faber-carichi",
        title: "Adesso in casa", compatta: true, totale: "", gruppo: "", prezzo_kwh: 0.30,
        soglia_media: 1500, soglia_alta: 2500, top: 3, soglia_acceso: 5, naviga: "" } },
      { g: "Faber", n: "Consumi - tutto", i: "mdi:lightning-bolt", c: { title: "Consumi di casa",
        type: "custom:energia-consumi-card", days_back: 8, open_on: "today", prezzo_kwh: 0.30,
        soglia_media: 33, soglia_alta: 66, lampeggio_record: true } },
      { g: "Faber", n: "Consumi - per ora", i: "mdi:clock-outline", c: { title: "Consumo per ora",
        type: "custom:energia-consumi-card", days_back: 8, open_on: "today", prezzo_kwh: 0.30,
        soglia_media: 33, soglia_alta: 66, lampeggio_record: true,
        mostra_giorni: true, mostra_record: false, mostra_ore: true, mostra_archivio: false, mostra_classifica: false } },
      { g: "Faber", n: "Consumi - archivio", i: "mdi:calendar-month", c: { title: "Archivio consumi",
        type: "custom:energia-consumi-card", days_back: 8, open_on: "today", prezzo_kwh: 0.30,
        soglia_media: 33, soglia_alta: 66, lampeggio_record: true,
        mostra_giorni: false, mostra_record: false, mostra_ore: false, mostra_archivio: true, mostra_classifica: false } },
      { g: "Faber", n: "Consumi - classifica", i: "mdi:trophy-outline", c: { title: "Chi consuma di piu",
        type: "custom:energia-consumi-card", days_back: 8, open_on: "today", prezzo_kwh: 0.30,
        soglia_media: 33, soglia_alta: 66, lampeggio_record: true,
        mostra_giorni: true, mostra_record: false, mostra_ore: false, mostra_archivio: false, mostra_classifica: true } },
      { g: "Faber", n: "Lavatrice", i: "mdi:washing-machine", c: { type: "custom:centro-bucato-card", kind: "lavatrice", name: "Lavatrice",
        power: "", energy: "", switch: "", soglia: 10, soglia_centrifuga: 300, soglia_riscaldamento: 1500, prezzo_kwh: 0.30, storico_giorni: 14 } },
      { g: "Faber", n: "Asciugatrice", i: "mdi:tumble-dryer", c: { type: "custom:centro-bucato-card", kind: "asciugatrice", name: "Asciugatrice",
        power: "", energy: "", switch: "", soglia: 10, soglia_riscaldamento: 800, prezzo_kwh: 0.30, storico_giorni: 14 } },
      { g: "Faber", n: "Lavastoviglie", i: "mdi:dishwasher", c: { type: "custom:centro-elettrodomestici-card", kind: "lavastoviglie", name: "Lavastoviglie",
        power: "", energy: "", switch: "", soglia: 10, soglia_riscaldamento: 1200, prezzo_kwh: 0.30, storico_giorni: 14 } },
      { g: "Faber", n: "Forno", i: "mdi:stove", c: { type: "custom:centro-elettrodomestici-card", kind: "forno", name: "Forno",
        power: "", energy: "", switch: "", soglia: 15, preriscaldo_min: 10, prezzo_kwh: 0.30, storico_giorni: 14 } },
      { g: "Faber", n: "Frigorifero", i: "mdi:fridge", c: { type: "custom:centro-elettrodomestici-card", kind: "frigorifero", name: "Frigorifero",
        power: "", energy: "", switch: "", soglia: 15, prezzo_kwh: 0.30, storico_giorni: 14 } },
      { g: "Faber", n: "Sicurezza - centro completo", i: "mdi:shield-home", c: { type: "custom:centro-sicurezza-card", name: "Sicurezza",
        lock: "", door_sensor: "", battery: "", sensors: "", alarm: "", cameras: "", mostra_allarme: true, mostra_porta: true, mostra_telecamere: true } },
      { g: "Faber", n: "Sicurezza - solo allarme", i: "mdi:shield-lock", c: { type: "custom:centro-sicurezza-card", name: "Allarme",
        lock: "", door_sensor: "", battery: "", sensors: "", alarm: "", cameras: "", mostra_allarme: true, mostra_porta: false, mostra_telecamere: false } },
      { g: "Faber", n: "Sicurezza - solo porta", i: "mdi:door-closed-lock", c: { type: "custom:centro-sicurezza-card", name: "Porta blindata",
        lock: "", door_sensor: "", battery: "", sensors: "", alarm: "", cameras: "", mostra_allarme: false, mostra_porta: true, mostra_telecamere: false } },
      { g: "Faber", n: "Sicurezza - solo telecamere", i: "mdi:cctv", c: { type: "custom:centro-sicurezza-card", name: "Telecamere",
        lock: "", door_sensor: "", battery: "", sensors: "", alarm: "", cameras: "", mostra_allarme: false, mostra_porta: false, mostra_telecamere: true } },
      { g: "Home Assistant", n: "Tessera (tile)", i: "mdi:card-outline", c: { type: "tile", entity: "" } },
      { g: "Faber", n: "Cancello (con timer)", i: "mdi:gate", c: { type: "custom:faber-cancello", name: "Cancello" } },
      { g: "Faber", n: "Fuori casa (automazione)", i: "mdi:shield-home", c: { type: "custom:faber-fuoricasa", name: "Fuori casa", entity: "" } },
      { g: "Faber", n: "Automazioni e sistema", i: "mdi:robot-happy-outline", c: { type: "custom:faber-automazioni", name: "Automazioni", compatta: true, gruppi: [] } },
      { g: "Faber", n: "Rifiuti porta a porta", i: "mdi:recycle", c: { type: "custom:faber-rifiuti", name: "Rifiuti", calendario: { lun: "", mar: "", mer: "", gio: "", ven: "", sab: "", dom: "" } } },
      { g: "Faber", n: "Manuali e libretti", i: "mdi:book-open-page-variant", c: { type: "custom:faber-manuali", name: "Manuali", voci: [] } },
      { g: "Faber", n: "Robot aspirapolvere", i: "mdi:robot-vacuum", c: { type: "custom:faber-robot", name: "Robot", entity: "" } },
      { g: "Faber", n: "Casse e TV (player)", i: "mdi:speaker-wireless", c: { type: "custom:faber-player", entity: "" } },
      { g: "Faber", n: "Pulsantiera / telecomando", i: "mdi:remote", c: { type: "custom:faber-pulsantiera", name: "Comandi", icona: "mdi:remote", remote: "", device: "", tasti: [] } },
      { g: "Faber", n: "Lista della Spesa", i: "mdi:cart-outline", c: { type: "custom:faber-spesa", name: "Lista della Spesa" } },
      { g: "Faber", n: "Meteo", i: "mdi:weather-partly-cloudy", c: { type: "custom:faber-weather", entity: "", days: 4 } },
      { g: "Faber", n: "Telecomando", i: "mdi:remote-tv", c: { type: "custom:faber-media", title: "Telecomando",
        selettore: "input_select.remote_type", script_tasto: "script.remote_press_button",
        script_sorgente: "script.remote_changesource", extra_nome: "Netflix", mostra_extra: true } },
      { g: "Home Assistant", n: "Meteo (nativa)", i: "mdi:weather-cloudy", c: { type: "weather-forecast", entity: "", forecast_type: "daily" } },
      { g: "Home Assistant", n: "Grafico storico", i: "mdi:chart-line", c: { type: "history-graph", entities: [] } },
      { g: "Home Assistant", n: "Testo (markdown)", i: "mdi:format-text", c: { type: "markdown", content: "Scrivi qui" } },
      { g: "Home Assistant", n: "Pulsante", i: "mdi:gesture-tap-button", c: { type: "button", entity: "" } },
      { g: "Home Assistant", n: "Telecamera", i: "mdi:cctv", c: { type: "picture-entity", entity: "", camera_view: "auto" } },
    ];
  }


  // ------------------------------------------------- scelta per dispositivo
  // Cercare le entita una per una e' il modo sbagliato: in casa si ragiona
  // per oggetti ("la lavatrice"), non per sensori. Qui si cerca il
  // DISPOSITIVO e i campi della card si riempiono da soli leggendo che
  // mestiere fa ogni sua entita (device_class), non indovinando dai nomi.
  _deviceEntities(deviceId) {
    const ents = Object.values(this._hass.entities || {});
    return ents.filter(e => e.device_id === deviceId && !e.disabled_by && !e.hidden_by)
      .map(e => e.entity_id)
      .filter(id => this._hass.states[id]);
  }

  _findDevices(q) {
    const words = (q || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    const areas = this._hass.areas || {};
    const devs = Object.values(this._hass.devices || {}).filter(d => !d.disabled_by);
    const scored = devs.map(d => {
      const nome = d.name_by_user || d.name || "";
      const area = (d.area_id && areas[d.area_id] ? areas[d.area_id].name : "") || "";
      return { d, nome, area, hay: (nome + " " + area).toLowerCase() };
    }).filter(x => !words.length || words.every(w => x.hay.includes(w)));
    scored.sort((a, b) => a.nome.localeCompare(b.nome));
    return scored.slice(0, 60);
  }

  // Assegna a ogni ruolo l'entita giusta del dispositivo. Per l'interruttore
  // si scartano gli switch di servizio (blocco bambini, spia, accesso remoto):
  // sono switch a tutti gli effetti ma non sono la presa che accende l'oggetto.
  _rolesOfDevice(deviceId) {
    const ids = this._deviceEntities(deviceId);
    const dom = id => id.split(".")[0];
    const dc = id => (this._hass.states[id].attributes.device_class || "");
    const scarto = /child_lock|backlight|remote_access|identify|led|beep|lock_sound|power_on_state|indicator/i;
    // Molte prese espongono DUE sensori di potenza: quello del carico attaccato
    // e quello che consuma la presa stessa (di solito con "device" nel nome).
    // Serve il primo: e quello che dice se la lavatrice sta lavorando.
    const propria = /(^|_)device_(power|energy|current|voltage)$|standby/i;
    const byDc = (d, cls) => {
      const c = ids.filter(id => dom(id) === d && dc(id) === cls);
      return c.find(id => !propria.test(id)) || c[0];
    };
    const sw = ids.filter(id => dom(id) === "switch" && !scarto.test(id));
    const lights = ids.filter(id => dom(id) === "light");
    return {
      switch: sw[0] || lights[0] || "",
      power: byDc("sensor", "power") || "",
      energy: byDc("sensor", "energy") || "",
      temp: byDc("sensor", "temperature") || "",
      humidity: byDc("sensor", "humidity") || "",
      climate: ids.find(id => dom(id) === "climate") || "",
      lock: ids.find(id => dom(id) === "lock") || "",
      battery: byDc("sensor", "battery") || "",
      door_sensor: ids.find(id => dom(id) === "binary_sensor" && ["door", "opening", "garage_door", "window"].includes(dc(id))) || "",
      entity: byDc("sensor", "power") || byDc("sensor", "temperature") || sw[0] || lights[0] || ids[0] || "",
    };
  }

  _fillFromDevice(cardCfg, deviceId) {
    const roles = this._rolesOfDevice(deviceId);
    const dev = (this._hass.devices || {})[deviceId];
    const riempiti = [];
    Object.keys(roles).forEach(k => {
      // Si tocca solo un campo che la card prevede e che e ancora vuoto.
      if (k in cardCfg && !cardCfg[k] && roles[k]) { cardCfg[k] = roles[k]; riempiti.push(k); }
    });
    if ("name" in cardCfg && dev && (dev.name_by_user || dev.name)) {
      cardCfg.name = dev.name_by_user || dev.name;
    }
    cardCfg.device_id = deviceId in (this._hass.devices || {}) && "device_id" in cardCfg ? deviceId : cardCfg.device_id;
    return riempiti;
  }

  // Alcune card ruotano attorno a UNA entita precisa, non a un dispositivo:
  // il climatizzatore, la persona, la serratura. E molte di quelle entita non
  // appartengono ad alcun dispositivo — climate.stufa_pellet_sala, per dirne
  // una, non ne ha nessuno — quindi cercandole fra i dispositivi non si
  // trovavano affatto. Per queste card si cerca prima l'entita.
  _dominioPrincipale(cardCfg) {
    return ["climate", "person", "lock", "media_player", "vacuum", "cover", "water_heater"]
      .find(d => d in cardCfg) || null;
  }

  _cercaEntita(dominio, q) {
    const parole = (q || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    const st = this._hass.states;
    const aree = this._hass.areas || {};
    const reg = this._hass.entities || {};
    return Object.keys(st).filter(e => e.startsWith(dominio + "."))
      .map(e => {
        const r = reg[e];
        const areaId = r && (r.area_id || ((this._hass.devices || {})[r.device_id] || {}).area_id);
        const area = (areaId && aree[areaId]) ? aree[areaId].name : "";
        const nome = st[e].attributes.friendly_name || e;
        return { id: e, nome, area, hay: (e + " " + nome + " " + area).toLowerCase() };
      })
      .filter(x => !parole.length || parole.every(w => x.hay.includes(w)))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, 40);
  }

  // Il passo compare solo per le card che hanno davvero dei campi-entita.
  _wantsDevice(cardCfg) {
    return ["switch", "power", "energy", "temp", "humidity", "climate", "lock", "battery", "door_sensor",
      "person", "media_player", "vacuum", "cover", "water_heater"].some(k => k in cardCfg);
  }

  _openDeviceStep(cardCfg, onDone) {
    const box = document.createElement("div");
    const dom = this._dominioPrincipale(cardCfg);
    const etichetteDom = { climate: "climatizzatori e stufe", person: "persone", lock: "serrature",
      media_player: "lettori", vacuum: "aspirapolvere", cover: "tapparelle e tende", water_heater: "scaldabagni" };
    const draw = (q) => {
      const list = this._findDevices(q);
      const ents = dom ? this._cercaEntita(dom, q) : [];
      box.innerHTML = `
        <div class="fh-note">${dom
          ? `Cerca per nome o per stanza. In cima ci sono ${fhEsc(etichetteDom[dom] || dom)}; sotto i dispositivi, da cui collego anche potenza, energia e presa.`
          : `Cerca l'oggetto per nome o per stanza — per esempio "lavatrice" oppure "cucina". Collego io potenza, energia e interruttore.`}</div>
        <input class="fh-input" id="dvQ" placeholder="Cerca..." value="${fhEsc(q || "")}">
        <div class="fh-dvlist">
          ${ents.length ? `<div class="fh-catgroup">${fhEsc((etichetteDom[dom] || dom).replace(/^./, c => c.toUpperCase()))}</div>` : ""}
          ${ents.map(x => `<button type="button" class="fh-dv" data-ent="${fhEsc(x.id)}">
              <div class="fh-dvname">${fhEsc(x.nome)}</div>
              <div class="fh-dvmeta">${fhEsc(x.area || "senza stanza")} · ${fhEsc(x.id)}</div>
            </button>`).join("")}
          ${list.length ? `<div class="fh-catgroup">Dispositivi</div>` : ""}
          ${list.length ? list.map(x => {
            const r = this._rolesOfDevice(x.d.id);
            const trovati = ["switch", "power", "energy", "temp", "climate", "lock"].filter(k => k in cardCfg && r[k]);
            return `<button type="button" class="fh-dv" data-dev="${fhEsc(x.d.id)}">
              <div class="fh-dvname">${fhEsc(x.nome)}</div>
              <div class="fh-dvmeta">${fhEsc(x.area || "senza stanza")}${trovati.length ? " · " + trovati.join(", ") : " · nessun valore utile"}</div>
            </button>`;
          }).join("") : (ents.length ? "" : `<div class="fh-note">Non ho trovato niente.</div>`)}
        </div>
        <button type="button" class="fh-btn" id="dvSkip">Salta e configuro a mano</button>`;
      const inp = box.querySelector("#dvQ");
      inp.addEventListener("input", () => {
        const v = inp.value;
        draw(v);
        const nuovo = box.querySelector("#dvQ");
        nuovo.focus();
        nuovo.setSelectionRange(v.length, v.length);
      });
      box.querySelectorAll("[data-ent]").forEach(b => b.addEventListener("click", () => {
        const id = b.dataset.ent;
        cardCfg[dom] = id;
        if (!cardCfg.name) {
          const s = this._hass.states[id];
          if (s && s.attributes.friendly_name) cardCfg.name = s.attributes.friendly_name;
        }
        // Se quell'entita appartiene a un dispositivo, da li si prende anche
        // il resto (potenza, presa...). Se non ne ha — capita spesso ai
        // termostati — si e comunque scelto cio che conta.
        const r = (this._hass.entities || {})[id];
        onDone(r && r.device_id ? r.device_id : null);
      }));
      box.querySelectorAll("[data-dev]").forEach(b => b.addEventListener("click", () => onDone(b.dataset.dev)));
      box.querySelector("#dvSkip").addEventListener("click", () => onDone(null));
    };
    draw("");
    return this._sheet("Quale dispositivo?", box);
  }


  // --------------------------------------------------------- stanza intera
  // Comporre una pagina un pezzo alla volta e' lungo: qui si sceglie la
  // stanza e si mette dentro una card per ogni dispositivo che ha qualcosa
  // da dire, gia collegata. Poi si ritocca — ma si parte da qualcosa.

  // L'icona si indovina dal nome del dispositivo. E' una scorciatoia onesta:
  // se sbaglia si cambia in due tocchi, e nel 90% dei casi in casa il nome
  // dice gia cos'e.
  _guessIcon(nome) {
    const n = (nome || "").toLowerCase();
    const mappa = [
      [/lavatric/, "washer"], [/asciugatric/, "dryer"], [/lavastovigl/, "dishwasher"],
      [/forno|piano.*induz/, "oven"], [/frigo|congelat/, "fridge"],
      [/condizionat|clima|split|termost|pellet|stufa|caldaia/, "climate"],
      [/tv|televis|soundbar|fire.?tv|chromecast/, "tv"],
      [/router|modem|deco|wifi|switch.*rete/, "router"],
      [/allarm|sirena|ialarm/, "alarm"], [/cancello|garage|portone/, "gate"],
      [/aspirapolv|robot|roborock|xiaomi.*vacuum/, "vacuum"],
      [/ventilat|fan|purificat/, "fan"],
      [/bagno|doccia|scaldabagn|boiler/, "bathroom"],
      [/cucina|microond|bollitor|caffe/, "kitchen"],
      [/camera|letto|comodino/, "bedroom"],
      [/sala|salotto|soggiorno|divano/, "livingroom"],
      [/ufficio|scrivania|pc|stampante/, "office"],
      [/giardin|esterno|irrigaz|piscina/, "garden"],
      [/porta|serratur|nuki|blindat/, "security"],
    ];
    const hit = mappa.find(([re]) => re.test(n));
    return hit ? hit[1] : "generic";
  }

  // Un dispositivo entra nella stanza solo se ha qualcosa da mostrare.
  _cardForDevice(dev) {
    const r = this._rolesOfDevice(dev.id);
    const nome = dev.name_by_user || dev.name || "Dispositivo";
    if (r.lock) {
      return { type: "custom:centro-sicurezza-card", name: nome, lock: r.lock,
        door_sensor: r.door_sensor || "", battery: r.battery || "", sensors: "" };
    }
    if (!r.switch && !r.power && !r.temp && !r.climate && !r.humidity) return null;
    return {
      type: "custom:mini-card", name: nome, mode: "device", icon_type: this._guessIcon(nome),
      custom_icon_svg: "", switch: r.switch || "", power: r.power || "", energy: r.energy || "",
      temp: r.temp || "", humidity: r.humidity || "", climate: r.climate || "",
      device_id: dev.id, path: "", group: "",
      soglia: 10, soglia_freddo: 18, soglia_caldo: 26, prezzo_kwh: 0.30, storico_giorni: 14,
    };
  }

  // Il sensore di un certo mestiere che sta in quella stanza: cosi la card
  // della stanza mostra subito temperatura e umidita senza chiederle.
  // L'icona della barra in basso, indovinata dal nome della stanza.
  // Dove mettere una card nuova: in una riga che c'e gia, come colonna in
  // piu, cosi sta accanto alle altre e si puo spostare e ridimensionare. Una
  // riga nuova si crea solo se non ce ne sono, o se quella e gia piena.
  // La prima riga LIBERA: quelle contrassegnate "tieni in cima" si saltano.
  // Le persone stanno sotto i chip e devono restarci: una stanza aggiunta in
  // cima le scavalcava e si mescolava tutto.
  _primaLibera() {
    const righe = this._cfg.pages[this._page].rows;
    let i = 0;
    while (i < righe.length && righe[i].fissa) i++;
    return i;
  }

  _mettiCard(card, inCima) {
    const righe = this._cfg.pages[this._page].rows;
    const primaLibera = this._primaLibera();
    const i = inCima ? primaLibera : righe.length - 1;
    const riga = righe[i];
    if (riga && !riga.fissa && (riga.cols || []).length < 6) {
      const col = { span: 1, cards: [card] };
      if (inCima) riga.cols.unshift(col); else riga.cols.push(col);
      return { ri: i, ci: inCima ? 0 : riga.cols.length - 1, di: 0 };
    }
    const nuova = { cols: [{ span: 1, cards: [card] }] };
    if (inCima) { righe.splice(primaLibera, 0, nuova); return { ri: primaLibera, ci: 0, di: 0 }; }
    righe.push(nuova);
    return { ri: righe.length - 1, ci: 0, di: 0 };
  }

  _iconaStanza(nome) {
    const n = (nome || "").toLowerCase();
    const mappa = [
      [/cucin/, "mdi:silverware-fork-knife"], [/bagn/, "mdi:shower"],
      [/camera|letto/, "mdi:bed"], [/salott|soggiorn|sala/, "mdi:sofa"],
      [/giardin|estern/, "mdi:tree"], [/garage|box/, "mdi:garage"],
      [/lavator|lavander/, "mdi:washing-machine"], [/studio|ufficio/, "mdi:desk"],
      [/corridoi|ingress/, "mdi:door-open"], [/scal/, "mdi:stairs"],
      [/terrazz|balcon/, "mdi:balcony"], [/cantin|taverna/, "mdi:home-floor-b"],
      [/mansard|soffitt/, "mdi:home-roof"],
    ];
    const t = mappa.find(([r]) => r.test(n));
    return t ? t[1] : "mdi:floor-plan";
  }

  _sensoreArea(areaId, dc) {
    const ents = Object.values(this._hass.entities || {});
    const devs = this._hass.devices || {};
    const trovata = ents.find(e => {
      if (!e.entity_id.startsWith("sensor.")) return false;
      const st = this._hass.states[e.entity_id];
      if (!st || st.attributes.device_class !== dc) return false;
      const a = e.area_id || (devs[e.device_id] || {}).area_id;
      return a === areaId;
    });
    return trovata ? trovata.entity_id : "";
  }

  // Le pagine dove si puo andare: le viste delle dashboard, per collegare la
  // card della stanza a quella giusta.
  _pagineDisponibili() {
    const out = [];
    (this._cfg.pages || []).forEach(pg => out.push({ titolo: pg.title, path: "#" + pg.id }));
    return out;
  }

  _openRoomSheet() {
    const areas = Object.values(this._hass.areas || {});
    const devs = Object.values(this._hass.devices || {}).filter(d => !d.disabled_by);
    const box = document.createElement("div");
    let scelta = null;      // area scelta
    let selezione = {};     // device_id -> bool

    const drawAree = () => {
      const conta = a => devs.filter(d => d.area_id === a.area_id).length;
      const lista = areas.map(a => ({ a, n: conta(a) })).filter(x => x.n).sort((x, y) => x.a.name.localeCompare(y.a.name));
      box.innerHTML = `<div class="fh-note">Scegli una stanza: metto una card per ogni dispositivo che ha qualcosa da mostrare, gia collegata ai suoi sensori.</div>
        <div class="fh-dvlist">
          ${lista.map(x => `<button type="button" class="fh-dv" data-area="${fhEsc(x.a.area_id)}">
            <div class="fh-dvname">${fhEsc(x.a.name)}</div>
            <div class="fh-dvmeta">${x.n} dispositiv${x.n === 1 ? "o" : "i"}</div>
          </button>`).join("")}
        </div>`;
      box.querySelectorAll("[data-area]").forEach(b => b.addEventListener("click", () => {
        scelta = areas.find(a => a.area_id === b.dataset.area);
        selezione = {};
        drawDispositivi();
      }));
    };

    const drawDispositivi = () => {
      const inArea = devs.filter(d => d.area_id === scelta.area_id);
      const proposte = inArea.map(d => ({ d, card: this._cardForDevice(d) })).filter(x => x.card);
      proposte.forEach(x => { if (!(x.d.id in selezione)) selezione[x.d.id] = true; });
      box.innerHTML = `
        <div class="fh-note">In <b>${fhEsc(scelta.name)}</b> ho trovato ${proposte.length} dispositiv${proposte.length === 1 ? "o" : "i"} con qualcosa da mostrare. Togli la spunta a quelli che non vuoi.</div>
        ${proposte.map(x => {
          const c = x.card;
          const val = ["switch", "power", "energy", "temp", "humidity", "climate", "lock"].filter(k => c[k]);
          return `<label class="fh-roomrow">
            <input type="checkbox" data-dev="${fhEsc(x.d.id)}"${selezione[x.d.id] ? " checked" : ""}>
            <span class="fh-roominfo">
              <span class="fh-dvname">${fhEsc(c.name)}</span>
              <span class="fh-dvmeta">${fhEsc(val.join(", ") || "solo stato")}</span>
            </span>
          </label>`;
        }).join("") || `<div class="fh-note">Nessun dispositivo utile in questa stanza.</div>`}
        <label class="fh-check" style="margin-top:10px">
          <input type="checkbox" id="rmCima" checked> Mettila in cima alla pagina</label>
        <div class="fh-note">Togli la spunta per metterla in fondo.</div>
        <div class="fh-srow" style="margin-top:12px">
          <button type="button" class="fh-btn" id="rmBack">Indietro</button>
          <button type="button" class="fh-btn" id="rmLink">Solo una card che porta alla stanza</button>
          <button type="button" class="fh-btn" id="rmPag">Crea una pagina per la stanza</button>
          <button type="button" class="fh-btn primary" id="rmAdd">Metti qui i dispositivi</button>
        </div>`;
      box.querySelectorAll("[data-dev]").forEach(cb => cb.addEventListener("change", () => {
        selezione[cb.dataset.dev] = cb.checked;
      }));
      box.querySelector("#rmBack").addEventListener("click", drawAree);
      // Una sola card con il nome della stanza che, toccata, ci porta: e la
      // "card stanza" vera, non l'elenco dei suoi dispositivi.
      // La stanza come PAGINA sua, con la sua voce nella barra in basso: e
      // cosi che si tiene in ordine una casa con molte stanze, invece di
      // allungare all'infinito una pagina sola.
      box.querySelector("#rmPag").addEventListener("click", () => {
        const scelte = proposte.filter(x => selezione[x.d.id]).map(x => x.card);
        const cols = [[], [], []];
        scelte.forEach((c, i) => cols[i % 3].push(c));
        const id = scelta.name.toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || fhUid("st");
        const gia = this._cfg.pages.findIndex(pg => pg.id === id);
        const pagina = {
          // Nascosta dalla barra: ci si arriva dalla card della stanza. Con
          // dieci stanze una barra da dieci voci non si usa.
          nascosta: true,
          id, title: scelta.name, icon: this._iconaStanza(scelta.name),
          rows: scelte.length ? [{ n_tel: 2, cols: cols.filter(c => c.length).map(c => ({ span: 1, cards: c })) }] : [],
        };
        if (gia >= 0) this._cfg.pages[gia] = pagina; else this._cfg.pages.push(pagina);

        // Insieme alla pagina nasce la card che ci porta, gia collegata. Una
        // pagina nascosta dalla barra senza niente che ci porti sarebbe
        // irraggiungibile, e collegarla dopo vuol dire indovinare l'indirizzo.
        const base = location.pathname.replace(/\/+$/, "");
        this._mettiCard({
          type: "custom:mini-card",
          name: scelta.name,
          icon_type: this._guessIcon(scelta.name),
          mode: "room",
          taglia: "quadrata",
          path: base + "#" + id,
          temp: this._sensoreArea(scelta.area_id, "temperature"),
          humidity: this._sensoreArea(scelta.area_id, "humidity"),
          power: "", energy: "", switch: "", climate: "", device_id: "", group: "",
          soglia: 10, soglia_freddo: 18, soglia_caldo: 26, prezzo_kwh: 0.30, storico_giorni: 14,
        }, true);

        const sc3 = this.querySelector(".fh-scrim");
        if (sc3) sc3.remove();
        // Si resta dove si era: la card appena creata e li, e si vede.
        this._renderNav();
        this._renderPage();
      });

      box.querySelector("#rmLink").addEventListener("click", () => {
        const inCima = box.querySelector("#rmCima") && box.querySelector("#rmCima").checked;
        const pag = this._pagineDisponibili().find(x => x.titolo.toLowerCase() === scelta.name.toLowerCase());
        const card = {
          type: "custom:mini-card",
          name: scelta.name,
          icon_type: this._guessIcon(scelta.name),
          mode: "room",
          taglia: "quadrata",
          path: pag ? location.pathname.replace(/\/+$/, "") + pag.path : "",
          temp: this._sensoreArea(scelta.area_id, "temperature"),
          humidity: this._sensoreArea(scelta.area_id, "humidity"),
          power: "", energy: "", switch: "", climate: "", device_id: "", group: "",
          soglia: 10, soglia_freddo: 18, soglia_caldo: 26, prezzo_kwh: 0.30, storico_giorni: 14,
        };
        // In una riga gia esistente, non in una tutta sua: da sola occupava
        // l'intera larghezza e non si poteva ne affiancare ad altre card ne
        // stringere, perche in una riga a una colonna non c'e spazio in cui
        // spostarsi.
        const dove = this._mettiCard(card, inCima);
        const sc2 = this.querySelector(".fh-scrim");
        if (sc2) sc2.remove();
        this._renderPage();
        this._openCardEditor(dove.ri, dove.ci, dove.di);
      });
      box.querySelector("#rmAdd").addEventListener("click", () => {
        const scelte = proposte.filter(x => selezione[x.d.id]).map(x => x.card);
        if (!scelte.length) return;
        const inCima = box.querySelector("#rmCima") && box.querySelector("#rmCima").checked;
        // Distribuite su tre colonne, cosi su schermo largo respirano e sul
        // telefono si impilano da sole.
        const cols = [[], [], []];
        scelte.forEach((c, i) => cols[i % 3].push(c));
        const riga = { cols: cols.filter(c => c.length).map(c => ({ span: 1, cards: c })) };
        // Prima finiva sempre in fondo, e su una pagina lunga volevi dire
        // scorrere fino in basso per trovarla.
        const righe = this._cfg.pages[this._page].rows;
        if (inCima) righe.unshift(riga); else righe.push(riga);
        const sc = this.querySelector(".fh-scrim");
        if (sc) sc.remove();
        this._renderPage();
      });
    };

    drawAree();
    this._sheet("Aggiungi una stanza", box, true);
  }

  // Il catalogo e cresciuto: senza ricerca sul telefono diventa un rotolo.
  _catalogHTML(filtro) {
    const cat = this._catalog();
    const words = (filtro || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    const ok = x => !words.length || words.every(w => (x.n + " " + x.g).toLowerCase().includes(w));
    const visibili = cat.map((x, i) => ({ x, i })).filter(o => ok(o.x));
    if (!visibili.length) return `<div class="fh-note">Nessuna card con questo nome.</div>`;
    const groups = [...new Set(visibili.map(o => o.x.g))];
    return groups.map(g => `<div class="fh-catgroup">${fhEsc(g)}</div>
      <div class="fh-catlist">${visibili.filter(o => o.x.g === g).map(o =>
        `<button type="button" class="fh-catitem" data-i="${o.i}">
           <ha-icon icon="${o.x.i}"></ha-icon><span>${fhEsc(o.x.n)}</span>
         </button>`).join("")}</div>`).join("");
  }


  // ------------------------------------------------- importa da altre plance
  // Molte card sono gia state costruite e messe a punto altrove (plancia
  // telefono, consumo elettrodomestici, controllo carichi...). Rifarle qui da
  // zero sarebbe lavoro buttato: si vanno a prendere dove sono, si copiano, e
  // da quel momento vivono qui per conto loro (una copia, non un legame: se
  // la tocchi qui non cambia niente sulla plancia di partenza, e viceversa).
  async _plance() {
    if (this._planceCache) return this._planceCache;
    let l = [];
    try { l = await this._hass.callWS({ type: "lovelace/dashboards/list" }); } catch (e) { l = []; }
    const out = [{ url_path: null, title: "Panoramica (predefinita)" }];
    (l || []).forEach(d => {
      if (d.mode === "storage" && d.url_path !== this._urlPath()) {
        out.push({ url_path: d.url_path, title: d.title || d.url_path });
      }
    });
    this._planceCache = out;
    return out;
  }

  _urlPath() { return location.pathname.split("/").filter(Boolean)[0]; }

  // Le card di una vista stanno in due posti a seconda di come e fatta la
  // vista: `cards` nelle viste classiche, dentro `sections[].cards` in quelle
  // a sezioni. Le raccolgo tutte, appiattite, con l'indicazione di dove stavano.
  _carteDiVista(v) {
    const out = [];
    (v.cards || []).forEach((c, i) => out.push({ c, dove: "" , i }));
    (v.sections || []).forEach((s, si) => (s.cards || []).forEach((c, i) => {
      const tit = (s.title || (s.type === "grid" && s.cards && s.cards[0] && s.cards[0].heading)) || `sezione ${si + 1}`;
      out.push({ c, dove: tit, i });
    }));
    return out.filter(x => x.c && x.c.type);
  }

  // Un'etichetta che dica davvero quale card e, senza aprirla.
  _etichettaCard(c) {
    // Una griglia o uno stack non hanno un titolo proprio: dire "grid" non
    // aiuta a riconoscerla. Meglio dire cosa contiene.
    if (Array.isArray(c.cards) && c.cards.length && !c.title && !c.name) {
      const dentro = c.cards.map(x => x && (x.name || x.heading || x.title)).filter(Boolean);
      const tipo = String(c.type).replace(/^custom:/, "");
      return {
        titolo: (dentro.length ? dentro.slice(0, 3).join(", ") : c.cards.length + " card dentro").slice(0, 60),
        tipo: tipo + " di " + c.cards.length,
      };
    }
    const t = c.title || c.name || c.heading || c.label ||
      (c.entity && this._hass.states[c.entity] && this._hass.states[c.entity].attributes.friendly_name) ||
      (Array.isArray(c.entities) && c.entities.length ? `${c.entities.length} entita` : "");
    const tipo = String(c.type).replace(/^custom:/, "");
    return { titolo: (t || tipo).toString().slice(0, 60), tipo };
  }

  _openImportSheet(onPick) {
    const box = document.createElement("div");
    let stato = { plancia: undefined, vista: null, cfg: null, q: "" };

    const disegna = async () => {
      // livello 1: quale plancia
      if (stato.plancia === undefined) {
        box.innerHTML = `<div class="fh-note">Prendi una card gia pronta da un'altra plancia. Viene copiata qui: le due restano indipendenti.</div>
          <div class="fh-dvlist" id="lst"><div class="fh-note">Cerco le plance...</div></div>`;
        const pl = await this._plance();
        box.querySelector("#lst").innerHTML = pl.map(p => `
          <button type="button" class="fh-dv" data-pl="${fhEsc(p.url_path == null ? "__default__" : p.url_path)}">
            <div class="fh-dvname">${fhEsc(p.title)}</div>
            <div class="fh-dvmeta">${fhEsc(p.url_path || "lovelace")}</div>
          </button>`).join("");
        box.querySelectorAll("[data-pl]").forEach(b => b.addEventListener("click", async () => {
          const up = b.dataset.pl === "__default__" ? null : b.dataset.pl;
          stato.plancia = up;
          box.innerHTML = `<div class="fh-note">Apro la plancia...</div>`;
          try {
            stato.cfg = await this._hass.callWS(up == null ? { type: "lovelace/config" } : { type: "lovelace/config", url_path: up });
          } catch (e) {
            stato.cfg = null;
            stato.errore = (e && e.message) || "non riesco a leggerla";
          }
          disegna();
        }));
        return;
      }

      // livello 2: quale vista
      if (!stato.cfg) {
        box.innerHTML = `<div class="fh-note">Non riesco a leggere questa plancia: ${fhEsc(stato.errore || "")}. Le plance scritte in YAML non si possono sfogliare da qui.</div>
          <button type="button" class="fh-btn" id="back">Torna alle plance</button>`;
        box.querySelector("#back").addEventListener("click", () => { stato = { plancia: undefined }; disegna(); });
        return;
      }
      if (stato.vista === null) {
        const viste = stato.cfg.views || [];
        box.innerHTML = `<button type="button" class="fh-btn" id="back">&larr; Altre plance</button>
          <div class="fh-dvlist">
            ${viste.map((v, i) => {
              const n = this._carteDiVista(v).length;
              return `<button type="button" class="fh-dv" data-v="${i}">
                <div class="fh-dvname">${fhEsc(v.title || v.path || "vista " + (i + 1))}</div>
                <div class="fh-dvmeta">${n} card${n === 1 ? "" : ""}</div>
              </button>`;
            }).join("")}
          </div>`;
        box.querySelector("#back").addEventListener("click", () => { stato = { plancia: undefined }; disegna(); });
        box.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => {
          stato.vista = parseInt(b.dataset.v); disegna();
        }));
        return;
      }

      // livello 3: quale card
      const v = stato.cfg.views[stato.vista];
      const tutte = this._carteDiVista(v);
      const parole = stato.q.toLowerCase().split(/\s+/).filter(Boolean);
      const carte = tutte.filter(x => {
        if (!parole.length) return true;
        const e = this._etichettaCard(x.c);
        const hay = (e.titolo + " " + e.tipo + " " + x.dove).toLowerCase();
        return parole.every(p => hay.includes(p));
      });
      box.innerHTML = `<button type="button" class="fh-btn" id="back">&larr; Altre viste</button>
        <input class="fh-input" id="q" placeholder="Filtra le card..." value="${fhEsc(stato.q)}">
        <div class="fh-dvlist">
          ${carte.length ? carte.map((x, k) => {
            const e = this._etichettaCard(x.c);
            return `<button type="button" class="fh-dv" data-k="${tutte.indexOf(x)}">
              <div class="fh-dvname">${fhEsc(e.titolo)}</div>
              <div class="fh-dvmeta">${fhEsc(e.tipo)}${x.dove ? " &middot; " + fhEsc(x.dove) : ""}</div>
            </button>`;
          }).join("") : `<div class="fh-note">Nessuna card qui dentro.</div>`}
        </div>`;
      box.querySelector("#back").addEventListener("click", () => { stato.vista = null; stato.q = ""; disegna(); });
      const inp = box.querySelector("#q");
      inp.addEventListener("input", () => {
        stato.q = inp.value;
        disegna();
        const n = box.querySelector("#q");
        n.focus(); n.setSelectionRange(stato.q.length, stato.q.length);
      });
      box.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => {
        const orig = tutte[parseInt(b.dataset.k)].c;
        onPick(JSON.parse(JSON.stringify(orig)));
      }));
    };

    disegna();
    return this._sheet("Da un'altra plancia", box);
  }

  _openPicker(ri, ci) {
    const box = document.createElement("div");
    const cat = this._catalog();
    box.innerHTML = `<input class="fh-input" id="catQ" placeholder="Cerca una card...">
      <div id="catList">${this._catalogHTML("")}</div>` +
      `<div class="fh-catgroup">Oppure prendine una gia fatta</div>
       <button type="button" class="fh-btn" data-import>Da un'altra plancia</button>
       <div class="fh-catgroup">Oppure incolla il codice di una card</div>
       <textarea class="fh-json" data-paste placeholder='{"type": "tile", "entity": "light.salotto"}'></textarea>
       <div class="fh-note" data-msg>Accetta JSON.</div>
       <button type="button" class="fh-btn primary" data-addjson>Aggiungi dal codice</button>`;
    const scrim = this._sheet("Aggiungi una card", box);
    const wireItems = () => box.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => onPick(b)));
    const q = box.querySelector("#catQ");
    q.addEventListener("input", () => {
      box.querySelector("#catList").innerHTML = this._catalogHTML(q.value);
      wireItems();
    });
    const onPick = (b) => {
      const item = cat[parseInt(b.dataset.i, 10)];
      const cards = this._cfg.pages[this._page].rows[ri].cols[ci].cards;
      const fresh = JSON.parse(JSON.stringify(item.c));
      // Se la card sa suggerire da sola una configurazione di partenza, la si
      // usa: nasce gia con qualcosa dentro invece che vuota e muta.
      if (fresh.type && fresh.type.startsWith("custom:")) {
        const cls = customElements.get(fresh.type.slice(7));
        if (cls && typeof cls.getStubConfig === "function") {
          try {
            const stub = cls.getStubConfig(this._hass);
            Object.keys(stub || {}).forEach(k => { if (!fresh[k]) fresh[k] = stub[k]; });
          } catch (e) { /* se non ci riesce, si va avanti con quello che c'e */ }
        }
      }
      // Una card meteo senza entita nasce gia rotta, e in casa il meteo e
      // quasi sempre uno solo: si precompila, poi si cambia dall'editor.
      if ((fresh.type === "weather-forecast" || fresh.type === "custom:faber-weather") && !fresh.entity) {
        const w = Object.keys(this._hass.states).filter(e => e.startsWith("weather."));
        if (w.length) fresh.entity = this._cfg.header.weather && w.includes(this._cfg.header.weather) ? this._cfg.header.weather : w[0];
      }
      cards.push(fresh);
      scrim.remove();
      this._renderPage();
      const di = cards.length - 1;
      // Se la card vive di entita, prima si sceglie l'OGGETTO e i campi si
      // riempiono da soli; poi si apre comunque l'editor per ritoccare.
      if (this._wantsDevice(fresh)) {
        const sh = this._openDeviceStep(fresh, dev => {
          if (dev) this._fillFromDevice(fresh, dev);
          sh.remove();
          this._renderPage();
          this._openCardEditor(ri, ci, di);
        });
      } else {
        this._openCardEditor(ri, ci, di);
      }
    };
    wireItems();
    box.querySelector("[data-import]").addEventListener("click", () => {
      const sh = this._openImportSheet(cfg => {
        this._cfg.pages[this._page].rows[ri].cols[ci].cards.push(cfg);
        sh.remove();
        this._renderPage();
        this._openCardEditor(ri, ci, this._cfg.pages[this._page].rows[ri].cols[ci].cards.length - 1);
      });
    });
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
    // Anche da qui si puo riagganciare tutto a un dispositivo, utile su una
    // card gia esistente rimasta con i campi vuoti.
    if (this._wantsDevice(cardCfg)) {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "fh-btn";
      link.textContent = "Collega un dispositivo";
      link.style.marginTop = "12px";
      link.addEventListener("click", () => {
        const sh = this._openDeviceStep(cardCfg, dev => {
          if (dev) this._fillFromDevice(cardCfg, dev);
          sh.remove();
          this._renderPage();
          this._openCardEditor(ri, ci, di);
        });
      });
      box.appendChild(link);
    }
    this._sheet("Configura la card", box, true);
  }


  // ------------------------------------------------------------- popup card
  // In Oikos e questo a far sembrare tutto un'app: la pagina resta pulita e
  // il dettaglio si apre solo quando lo chiedi. Dentro ci vanno card vere,
  // quindi il popup e una pagina in miniatura, non una scheda fissa.
  async _openCardPopup(cardCfg) {
    const pop = cardCfg.fh_popup || {};
    const prev = this.querySelector(".fh-popscrim");
    if (prev) prev.remove();
    const scrim = document.createElement("div");
    scrim.className = "fh-popscrim";
    const panel = document.createElement("div");
    panel.className = "fh-popup";
    panel.innerHTML = `<div class="fh-pophead">
        <div class="fh-poptitle">${fhEsc(pop.title || cardCfg.name || "Dettaglio")}</div>
        <button type="button" class="fh-ic" data-close><ha-icon icon="mdi:close"></ha-icon></button>
      </div>`;
    const body = document.createElement("div");
    body.className = "fh-popbody";
    panel.appendChild(body);
    scrim.appendChild(panel);
    scrim.addEventListener("click", e => { if (e.target === scrim) scrim.remove(); });
    panel.querySelector("[data-close]").addEventListener("click", () => scrim.remove());
    this.querySelector(".fh-app").appendChild(scrim);

    const helpers = await this._helpers();
    (pop.cards || []).forEach(c => {
      const el = this._createCard(c, helpers);
      if (el) body.appendChild(el);
    });
  }

  // Editor del popup: stessa logica della pagina (catalogo, editor vero,
  // duplica, elimina), ma su un elenco piu corto.
  _openPopupEditor(ri, ci, di) {
    const cards = this._cfg.pages[this._page].rows[ri].cols[ci].cards;
    const cardCfg = cards[di];
    if (!cardCfg.fh_popup) cardCfg.fh_popup = { title: "", cards: [] };
    const pop = cardCfg.fh_popup;
    const box = document.createElement("div");
    const draw = () => {
      box.innerHTML = `
        <div class="fh-note">Quando tocchi questa card si apre un pannello con dentro le card che scegli qui. Se lo lasci vuoto, la card mantiene il suo comportamento normale.</div>
        <div class="fh-sfield"><label class="fh-slab">Titolo del popup</label>
          <input class="fh-input" id="popTitle" value="${fhEsc(pop.title || "")}" placeholder="${fhEsc(cardCfg.name || "Dettaglio")}"></div>
        <div class="fh-sgroup">Contenuto</div>
        ${(pop.cards || []).length ? pop.cards.map((c, i) => `
          <div class="fh-pcrow" data-i="${i}">
            <div class="fh-pcname">${fhEsc(c.name || c.title || c.type)}</div>
            <button type="button" class="fh-tool" data-act="cfg"><ha-icon icon="mdi:cog-outline"></ha-icon></button>
            <button type="button" class="fh-tool" data-act="up"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
            <button type="button" class="fh-tool" data-act="down"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
            <button type="button" class="fh-tool" data-act="del"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
          </div>`).join("") : `<div class="fh-note">Ancora nessuna card nel popup.</div>`}
        <button type="button" class="fh-btn primary" id="popAdd">+ Aggiungi card al popup</button>`;
      box.querySelector("#popTitle").addEventListener("input", e => { pop.title = e.target.value; });
      box.querySelector("#popAdd").addEventListener("click", () => {
        this._pickCardInto(pop.cards, () => draw());
      });
      box.querySelectorAll(".fh-pcrow").forEach(row => {
        const i = parseInt(row.dataset.i, 10);
        row.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
          const a = b.dataset.act;
          if (a === "cfg") { this._editCardConfig(pop.cards, i, () => draw()); return; }
          if (a === "up" && i > 0) { const [x] = pop.cards.splice(i, 1); pop.cards.splice(i - 1, 0, x); }
          else if (a === "down" && i < pop.cards.length - 1) { const [x] = pop.cards.splice(i, 1); pop.cards.splice(i + 1, 0, x); }
          else if (a === "del") pop.cards.splice(i, 1);
          draw();
        }));
      });
    };
    draw();
    this._sheet("Popup della card", box, true);
  }

  // Catalogo riusabile: aggiunge una card a un elenco qualunque (pagina o
  // popup), passando anche dal collegamento al dispositivo.
  _pickCardInto(list, done) {
    const box = document.createElement("div");
    const cat = this._catalog();
    const groups = [...new Set(cat.map(x => x.g))];
    box.innerHTML = groups.map(g => `<div class="fh-catgroup">${fhEsc(g)}</div>
      <div class="fh-catlist">${cat.map((x, i) => x.g !== g ? "" :
        `<button type="button" class="fh-catitem" data-i="${i}">
           <ha-icon icon="${x.i}"></ha-icon><span>${fhEsc(x.n)}</span>
         </button>`).join("")}</div>`).join("") +
      `<div class="fh-catgroup">Oppure prendine una gia fatta</div>
       <button type="button" class="fh-btn" data-import>Da un'altra plancia</button>`;
    const scrim = this._sheet("Aggiungi al popup", box);
    box.querySelector("[data-import]").addEventListener("click", () => {
      const sh = this._openImportSheet(cfg => {
        list.push(cfg);
        sh.remove();
        scrim.remove();
        this._editCardConfig(list, list.length - 1, done);
      });
    });
    box.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
      const fresh = JSON.parse(JSON.stringify(cat[parseInt(b.dataset.i, 10)].c));
      if ((fresh.type === "weather-forecast" || fresh.type === "custom:faber-weather") && !fresh.entity) {
        const w = Object.keys(this._hass.states).filter(e => e.startsWith("weather."));
        if (w.length) fresh.entity = w[0];
      }
      list.push(fresh);
      scrim.remove();
      const idx = list.length - 1;
      if (this._wantsDevice(fresh)) {
        const sh = this._openDeviceStep(fresh, dev => {
          if (dev) this._fillFromDevice(fresh, dev);
          sh.remove();
          this._editCardConfig(list, idx, done);
        });
      } else {
        this._editCardConfig(list, idx, done);
      }
    }));
  }

  // Editor vero della card, su un elenco qualunque.
  async _editCardConfig(list, i, done) {
    const cardCfg = list[i];
    if (!cardCfg) return;
    const box = document.createElement("div");
    let editor = null;
    try {
      const helpers = await this._helpers();
      let klass = null;
      if (cardCfg.type.startsWith("custom:")) klass = customElements.get(cardCfg.type.slice(7));
      else if (helpers && helpers.createCardElement) {
        const tmp = helpers.createCardElement(cardCfg);
        if (tmp && tmp.tagName && tmp.tagName.toLowerCase() !== "hui-error-card") klass = tmp.constructor;
        if (!klass || !klass.getConfigElement) {
          klass = customElements.get("hui-" + cardCfg.type.replace(/_/g, "-") + "-card") || klass;
        }
      }
      if (klass && klass.getConfigElement) editor = await klass.getConfigElement();
    } catch (e) { editor = null; }

    if (editor) {
      editor.hass = this._hass;
      try { editor.setConfig(cardCfg); } catch (e) { /* editor schizzinoso */ }
      editor.addEventListener("config-changed", ev => {
        if (ev.detail && ev.detail.config) { list[i] = ev.detail.config; if (done) done(); }
      });
      box.appendChild(editor);
    } else {
      const ta = document.createElement("textarea");
      ta.className = "fh-json";
      ta.value = JSON.stringify(cardCfg, null, 2);
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "fh-btn primary"; btn.textContent = "Applica";
      const msg = document.createElement("div");
      msg.className = "fh-note";
      msg.textContent = "Questa card non ha un editor grafico: si configura col codice.";
      btn.addEventListener("click", () => {
        try { list[i] = JSON.parse(ta.value); } catch (e) { msg.textContent = "JSON non valido: " + e.message; return; }
        if (done) done();
        msg.textContent = "Applicato.";
      });
      box.appendChild(msg); box.appendChild(ta); box.appendChild(btn);
    }
    this._sheet("Configura la card", box, true);
  }

  _openPageSheet() {
    const box = document.createElement("div");
    const draw = () => {
      box.innerHTML = this._cfg.pages.map((pg, i) => `
        <div class="fh-pagerow" data-p="${i}">
          <ha-icon icon="${fhEsc(pg.icon || "mdi:circle-outline")}"></ha-icon>
          <input class="fh-input" data-title value="${fhEsc(pg.title || "")}" placeholder="Nome pagina">
          <input class="fh-input small" data-icon value="${fhEsc(pg.icon || "")}" placeholder="mdi:home">
          <button type="button" class="fh-tool${pg.nascosta ? "" : " acceso"}" data-act="vedi"
            title="${pg.nascosta ? "Nascosta dalla barra in basso" : "Si vede nella barra in basso"}">
            <ha-icon icon="${pg.nascosta ? "mdi:eye-off-outline" : "mdi:eye-outline"}"></ha-icon></button>
          <button type="button" class="fh-tool${pg.stanza ? " acceso" : ""}" data-act="stanza"
            title="${pg.stanza ? "Compare nell'elenco Stanze" : "Non e una stanza"}"><ha-icon icon="mdi:door-open"></ha-icon></button>
          ${pg.stanza ? `<button type="button" class="fh-tool acceso" data-act="sensori"
            title="Configura sensori temperatura e consumi stanza"><ha-icon icon="mdi:tune-vertical"></ha-icon></button>` : ""}
          <button type="button" class="fh-tool${(pg.barra || []).length ? " acceso" : ""}" data-act="barra"
            title="Cosa aggiungere alla barra quando sei in questa pagina"><ha-icon icon="mdi:dock-bottom"></ha-icon></button>
          <button type="button" class="fh-tool" data-act="up" title="Su"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
          <button type="button" class="fh-tool" data-act="down" title="Giu"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
          <button type="button" class="fh-tool" data-act="del" title="Elimina"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
        </div>`).join("") +
        `<div class="fh-note">L'occhio decide se una pagina sta <b>sempre</b> nella barra in basso (Casa, Sicurezza, Consumi) o solo quando serve. Il quadratino accanto sceglie <b>cosa aggiungere alla barra quando sei dentro quella pagina</b>: in sala il telecomando, in cucina gli elettrodomestici, in camera il clima. Le pagine sempre presenti restano comunque al loro posto.</div>
         <button type="button" class="fh-btn primary" data-addpage>+ Aggiungi pagina</button>`;
      box.querySelectorAll(".fh-pagerow").forEach(row => {
        const i = parseInt(row.dataset.p, 10);
        row.querySelector("[data-title]").addEventListener("input", e => { this._cfg.pages[i].title = e.target.value; });
        row.querySelector("[data-icon]").addEventListener("change", e => { this._cfg.pages[i].icon = e.target.value; draw(); this._renderNav(); });
        row.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
          const a = b.dataset.act, pages = this._cfg.pages;
          if (a === "stanza") { pages[i].stanza = !pages[i].stanza; }
          else if (a === "sensori") { this._modificaSensoriStanza(i, true); return; }
          else if (a === "barra") { this._sceltaBarra(i); return; }
          if (a === "vedi") { pages[i].nascosta = !pages[i].nascosta; }
          else if (a === "up" && i > 0) { const [x] = pages.splice(i, 1); pages.splice(i - 1, 0, x); }
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
    this._sheet("Pagine", box, true);
  }


  // Il disegno della stanza: o una delle scene animate del pannello, o una
  // delle icone che hai disegnato con la Fucina. La raccolta e quella vera,
  // non una copia: quello che aggiungi li compare qui senza fare niente.
  async _sceltaDisegno(indice) {
    const pg = this._cfg.pages[indice];
    const box = document.createElement("div");
    box.innerHTML = `<div class="fh-note">Carico le tue icone...</div>`;
    const scrim = this._sheet("Disegno di " + (pg.title || "questa stanza"), box, false);
    // Qualunque strada prenda per uscire - la X, il tocco fuori - quello che
    // ha scelto resta.
    scrim.__primaDiChiudere = () => {
      if (this._stanzeMosse) { this._stanzeMosse = false; this._save(true); }
    };
    // `true`: si rilegge sempre, cosi un'icona disegnata un minuto fa c'e gia.
    const mie = await fhIconeCarica(this._hass, true);
    const draw = () => {
      const ora = fhTipoStanza(pg);
      box.innerHTML = `
        <style>${FH_ARTE_CSS}</style>
        <div class="fh-lab2">Disegni animati Faber <small>icone d'autore esclusive per Faber Home</small></div>
        <div class="fh-disegni">${FH_SCENE.map(([id, nome]) => `
          <button type="button" class="fh-dis${!pg.icona_svg && ora === id ? " on" : ""}" data-scena="${id}">
            <span class="fh-arte">${fhArteStanza(id, 46)}</span><span>${fhEsc(nome)}</span>
          </button>`).join("")}</div>

        <div class="fh-lab2" style="margin-top:16px">Le tue icone <small>quelle della Fucina</small></div>
        ${mie.length ? `<div class="fh-disegni">${mie.map(ic => `
          <button type="button" class="fh-dis${pg.icona_id === ic.id ? " on" : ""}" data-mia="${fhEsc(ic.id)}">
            <span class="fh-arte fucina">${ic.svg}</span><span>${fhEsc(ic.nome || "senza nome")}</span>
          </button>`).join("")}</div>`
          : `<div class="fh-note">La raccolta e vuota. Le icone si disegnano con la <b>Fucina Icone</b> e si salvano
             dall'editor di una Mini Card: da li finiscono nella raccolta e compaiono anche qui.</div>`}
        <button type="button" class="fh-btn primary" data-torna style="width:100%;margin-top:16px">
          <ha-icon icon="mdi:check"></ha-icon>${this._stanzeMosse ? "Salva e torna alle stanze" : "Torna alle stanze"}
        </button>`;
      const tr = box.querySelector("[data-torna]");
      if (tr) tr.addEventListener("click", async () => {
        if (this._stanzeMosse) { this._stanzeMosse = false; await this._save(true); }
        const s = this.querySelector(".fh-scrim"); if (s) s.remove();
        this._modificaStanze = true;
        this._apriStanze(true);
      });
      box.querySelectorAll("[data-scena]").forEach(b => b.addEventListener("click", () => {
        fhVibra(10);
        pg.arte = b.dataset.scena;
        pg.icona_svg = ""; pg.icona_id = "";
        this._stanzeMosse = true;
        draw();
      }));
      box.querySelectorAll("[data-mia]").forEach(b => b.addEventListener("click", () => {
        fhVibra(10);
        const ic = mie.find(x => x.id === b.dataset.mia);
        if (!ic) return;
        // Si porta dietro il disegno, non solo il riferimento: resta a posto
        // anche se un giorno quell'icona sparisce dalla raccolta.
        pg.icona_svg = ic.svg; pg.icona_id = ic.id;
        this._stanzeMosse = true;
        draw();
      }));
    };
    draw();
  }

  // Aggiungere una stanza: quasi sempre la pagina ESISTE GIA (l'hai fatta tu,
  // magari con le sue card dentro) e va solo segnata come stanza. Creare una
  // pagina nuova e il caso raro, quindi sta in fondo.
  _aggiungiStanza() {
    const box = document.createElement("div");
    const libere = this._cfg.pages
      .map((p, i) => ({ p, i }))
      .filter(x => !x.p.stanza);
    box.innerHTML = `
      <div class="fh-note">Segna come stanza una pagina che hai gia: resta tutto com'e,
        compare solo nell'elenco Stanze.</div>
      ${libere.length ? `<div class="fh-chipwrap">${libere.map(({ p, i }) => `
        <button type="button" class="fh-chipsel" data-prendi="${i}">
          <ha-icon icon="${fhEsc(p.icon || "mdi:file-outline")}"></ha-icon>${fhEsc(p.title || p.id)}
        </button>`).join("")}</div>`
        : `<div class="fh-note">Sono gia tutte stanze.</div>`}
      <div style="height:14px"></div>
      <button type="button" class="fh-btn primary" data-crea style="width:100%">+ Crea una stanza nuova</button>`;
    box.querySelectorAll("[data-prendi]").forEach(b => b.addEventListener("click", () => {
      const pg = this._cfg.pages[+b.dataset.prendi];
      pg.stanza = true;
      if (pg.nascosta === undefined) pg.nascosta = true;
      this._stanzeMosse = true;
      this._modificaStanze = true;
      const s = this.querySelector(".fh-scrim"); if (s) s.remove();
      this._renderNav();
      this._apriStanze(true);
    }));
    box.querySelector("[data-crea]").addEventListener("click", () => {
      this._chiediNome("", nome => {
        if (!nome) return;
        this._cfg.pages.push({ id: fhUid("st"), title: nome, icon: "mdi:door",
          stanza: true, nascosta: true, arte: "porta", rows: [] });
        this._stanzeMosse = true;
        this._modificaStanze = true;
        this._renderNav();
      });
    });
    const scrim = this._sheet("Aggiungi alle stanze", box, false);
    return scrim;
  }

  // Chiedere un testo senza `prompt`: nella WebView dell'app la finestrella di
  // sistema non compare e il tasto sembra rotto.
  _chiediNome(valore, poi) {
    const box = document.createElement("div");
    box.innerHTML = `
      <input type="text" id="fhNome" value="${fhEsc(valore || "")}" placeholder="Nome della stanza"
        style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:14px;font:inherit;font-size:15px;font-weight:700;
        border:1px solid var(--fh-stroke,rgba(255,255,255,.18));background:rgba(255,255,255,.07);color:inherit;outline:none">
      <button type="button" class="fh-btn primary" id="fhNomeOk" style="margin-top:12px;width:100%">Conferma</button>`;
    const scrim = this._sheet(valore ? "Rinomina" : "Nuova stanza", box, false);
    const inp = box.querySelector("#fhNome");
    const chiudi = () => { const s = this.querySelector(".fh-scrim"); if (s) s.remove(); };
    box.querySelector("#fhNomeOk").addEventListener("click", () => {
      const v = inp.value.trim();
      chiudi();
      poi(v);
      this._apriStanze(true);
    });
    setTimeout(() => inp.focus(), 60);
    return scrim;
  }

  // L'elenco delle stanze, con dentro quello che gia sai di ognuna: la
  // temperatura se c'e un termometro, quanto tira se c'e un sensore. Toccare
  // una stanza ci porta dentro.
  _apriStanze(mantieni) {
    fhVibra(8);
    const box = document.createElement("div");
    // Chi riapre l'elenco dalla barra vuole l'elenco, non l'officina: le
    // modalita si spengono. Le riaperture nostre (torno dalla scelta del
    // disegno, ho appena dato un nome) passano `mantieni` e restano dov'erano.
    if (!mantieni) { this._ordinaStanze = false; this._modificaStanze = !!this._edit; }
    const draw = () => {
    const stanze = this._cfg.pages.map((p, i) => ({ p, i })).filter(x => x.p.stanza);
    const ord = this._ordinaStanze, mod = this._modificaStanze;
    box.innerHTML = `<style>${FH_ARTE_CSS}</style>
      <div class="fh-stanzetop">
        <button type="button" class="fh-ordbtn${mod ? " on" : ""}" data-modifica>
          <ha-icon icon="${mod ? "mdi:check" : "mdi:pencil-outline"}"></ha-icon>${mod ? "Fatto" : "Modifica"}
        </button>
        <button type="button" class="fh-ordbtn${ord ? " on" : ""}" data-ordina>
          <ha-icon icon="${ord ? "mdi:check" : "mdi:sort"}"></ha-icon>${ord ? "Fatto" : "Ordina"}
        </button>
      </div>
      <div class="fh-stanzegrid">${stanze.map(({ p, i }, k) => {
      const gr = this._tempDiPagina(p.id);
      const watt = this._consumoDiPagina(p);
      const acc = this._contaAccesiPagina(p.id);
      const haConsumo = (watt > 0) || p.mostra_sempre_consumo || p.power || p.consumo_totale || (p.consumo && p.consumo.entita && p.consumo.entita.length);
      // Il colore del consumo anche qui: da questo elenco si vede tutta la
      // casa in una schermata, ed e il posto dove una stanza che sta tirando
      // troppo deve saltare all'occhio senza entrarci.
      const lv = haConsumo ? this._livelloConsumo(p, watt) : null;
      return `<div class="fh-stanza${acc ? " viva" : ""}${ord ? " ord" : ""}${mod ? " mod-attiva" : ""}${lv ? " c-" + lv.liv : ""}" data-vai="${i}"
        style="--ritardo:${(k % 5) * 140}ms${lv ? ";--fh-int:" + lv.int.toFixed(2) : ""}">
        <button type="button" class="fh-stanzabtn-cfg" data-sensori="${i}" title="Modifica sensori temperatura e consumi">
          <ha-icon icon="mdi:tune-vertical"></ha-icon>
        </button>
        <span class="fh-alone"></span>
        <span class="fh-arte${p.icona_svg ? " fucina" : ""}">${p.icona_svg
          ? p.icona_svg
          : fhArteStanza(fhTipoStanza(p), 48)}</span>
        <span class="fh-stanzanome">${fhEsc(p.title || p.id)}</span>
        <span class="fh-stanzadati">
          <span class="fh-stanzametriche">
            ${gr != null ? `<b class="fh-stemp" title="Temperatura">${String(gr.toFixed(1)).replace(".", ",")}\u00b0</b>` : ""}
            ${haConsumo ? `<b class="fh-swatt" title="Consumo attuale">${fhEsc(fhNumW(watt))}</b>` : ""}
          </span>
          ${acc ? `<i>${acc} ${acc === 1 ? "acceso" : "accesi"}</i>` : ""}
        </span>
        ${ord ? `<span class="fh-frecce">
          <button type="button" data-su="${k}" ${k === 0 ? "disabled" : ""}>&larr;</button>
          <button type="button" data-giu="${k}" ${k === stanze.length - 1 ? "disabled" : ""}>&rarr;</button>
        </span>` : ""}
        ${mod ? `<span class="fh-frecce">
          <button type="button" data-scena="${i}" title="Cambia disegno animato"><ha-icon icon="mdi:palette-outline"></ha-icon></button>
          <button type="button" data-sensori="${i}" title="Modifica sensori temperatura e consumi"><ha-icon icon="mdi:tune"></ha-icon></button>
          <button type="button" data-rinomina="${i}" title="Rinomina stanza"><ha-icon icon="mdi:rename-outline"></ha-icon></button>
          <button type="button" class="via" data-togli="${i}" title="Togli dalle stanze">&times;</button>
        </span>` : ""}
      </div>`;
    }).join("")}
      ${mod ? `<button type="button" class="fh-stanza aggiungi" data-nuova>
        <ha-icon icon="mdi:plus"></ha-icon><span class="fh-stanzanome">Nuova stanza</span></button>` : ""}
      </div>
      ${ord ? `<div class="fh-note">Le frecce spostano la stanza nell'elenco. Si salva premendo <b>Fatto</b> o chiudendo il foglio.</div>` : ""}
      ${mod ? `<div class="fh-note">Tocca una stanza o l'icona <b>regola (<ha-icon icon="mdi:tune"></ha-icon>)</b> per <b>modificare o aggiungere i sensori di temperatura e dei consumi</b>, la tavolozza per il disegno animato, la matita per il nome, la <b>&times;</b> per toglierla dall'elenco. Si salva con <b>Fatto</b> o chiudendo il foglio.</div>` : ""}`;

    const salvaSeServe = () => {
      if (this._stanzeMosse) { this._stanzeMosse = false; this._save(true); }
    };
    box.querySelector("[data-modifica]").addEventListener("click", () => {
      this._modificaStanze = !this._modificaStanze;
      if (this._modificaStanze) this._ordinaStanze = false;
      else salvaSeServe();
      draw();
    });
    box.querySelectorAll(".fh-frecce button").forEach(b =>
      b.addEventListener("click", e => e.stopPropagation()));
    box.querySelectorAll("[data-scena]").forEach(b => b.addEventListener("click", () => {
      this._sceltaDisegno(+b.dataset.scena);
    }));
    box.querySelectorAll("[data-sensori]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      this._modificaSensoriStanza(+b.dataset.sensori);
    }));
    box.querySelectorAll("[data-rinomina]").forEach(b => b.addEventListener("click", () => {
      const pg = this._cfg.pages[+b.dataset.rinomina];
      this._chiediNome(pg.title || "", nome => {
        if (!nome) return;
        pg.title = nome;
        this._stanzeMosse = true;
        draw(); this._renderNav();
      });
    }));
    box.querySelectorAll("[data-togli]").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.sicuro !== "1") { b.dataset.sicuro = "1"; b.textContent = "Sicuro?"; b.classList.add("chiede"); return; }
      this._cfg.pages[+b.dataset.togli].stanza = false;
      this._stanzeMosse = true;
      draw();
    }));
    const nuova = box.querySelector("[data-nuova]");
    if (nuova) nuova.addEventListener("click", () => this._aggiungiStanza());
    box.querySelector("[data-ordina]").addEventListener("click", () => {
      if (!this._ordinaStanze) this._modificaStanze = false;
      this._ordinaStanze = !this._ordinaStanze;
      // Si salva USCENDO dall'ordinamento, non a ogni freccia: salvare subito
      // fa ricaricare la configurazione a Home Assistant, il pannello si
      // ridisegna e il foglio ti si chiude in faccia a meta lavoro.
      if (!this._ordinaStanze && this._stanzeMosse) {
        this._stanzeMosse = false;
        this._save(true);
      }
      draw();
    });
    if (!ord && !mod) {
      box.querySelectorAll("[data-vai]").forEach(b => b.addEventListener("click", () => {
        const i = parseInt(b.dataset.vai, 10);
        const scrim = this.querySelector(".fh-scrim");
        if (scrim) scrim.remove();
        this._vaiPagina(i);
      }));
    } else if (mod) {
      box.querySelectorAll(".fh-stanza:not(.aggiungi)").forEach(b => b.addEventListener("click", e => {
        if (e.target.closest("button") || e.target.closest(".fh-frecce")) return;
        this._modificaSensoriStanza(+b.dataset.vai);
      }));
    }
    // Sposta la stanza scambiandola con quella accanto NELL'ELENCO STANZE:
    // le pagine che non sono stanze restano dove sono.
    const sposta = (k, verso) => {
      const a = stanze[k], b = stanze[k + verso];
      if (!a || !b) return;
      const pagine = this._cfg.pages;
      const tmp = pagine[a.i]; pagine[a.i] = pagine[b.i]; pagine[b.i] = tmp;
      this._pageId = (this._cfg.pages[this._page] || {}).id || this._pageId;
      this._stanzeMosse = true;
      draw();
      this._renderNav();
    };
    box.querySelectorAll("[data-su]").forEach(b => b.addEventListener("click", () => sposta(+b.dataset.su, -1)));
    box.querySelectorAll("[data-giu]").forEach(b => b.addEventListener("click", () => sposta(+b.dataset.giu, 1)));
    };
    draw();
    const scrim = this._sheet("Stanze", box, false);
    // La X e il tocco fuori chiudono: se qualcosa era stato cambiato si salva
    // lo stesso. Meglio salvare che far rifare il lavoro.
    const chiusura = new MutationObserver(() => {
      if (!scrim.isConnected) {
        chiusura.disconnect();
        if (this._stanzeMosse) { this._stanzeMosse = false; this._save(true); }
      }
    });
    chiusura.observe(this.querySelector(".fh-app"), { childList: true });
  }

  // Modifica sensore temperatura e consumi della stanza
  _modificaSensoriStanza(indice, daPagine) {
    const pg = this._cfg.pages[indice];
    if (!pg) return;
    const box = document.createElement("div");
    const hass = this._hass;

    let roomTitle = pg.title || "";
    let curTemp = pg.temp || pg.temperature || "";
    let curHum = pg.humidity || "";
    let curPowerTot = pg.power || pg.consumo_totale || "";
    const cCfg = this._consumoCfg(pg);
    let consumoAttivo = cCfg.attiva;
    let consumoEntita = (cCfg.entita || this._proponiConsumo(pg)).slice();
    let sommaDispositivi = pg.consumo_somma_tutto !== undefined ? !!pg.consumo_somma_tutto : !curPowerTot;
    let mostraSempreConsumo = pg.mostra_sempre_consumo !== undefined ? !!pg.mostra_sempre_consumo : true;
    let consumoAttenzione = cCfg.attenzione;
    let consumoAlto = cCfg.alto;
    let consumoTitolo = cCfg.titolo;

    const getW = (e) => {
      const st = hass && hass.states[e];
      const n = st ? parseFloat(st.state) : NaN;
      const u = String((st && st.attributes && st.attributes.unit_of_measurement) || "").toLowerCase();
      return isNaN(n) ? 0 : (u === "kw" ? n * 1000 : n);
    };

    const draw = () => {
      const tSt = curTemp && hass && hass.states[curTemp];
      const autoT = this._tempDiPagina(pg.id);
      const tVal = tSt ? (tSt.state + " \u00b0C (" + (tSt.attributes.friendly_name || curTemp) + ")")
        : (autoT != null ? (String(autoT.toFixed(1)).replace(".", ",") + " \u00b0C (rilevato in automatico)") : "Nessuno rilevato");

      let totW = 0;
      if (curPowerTot) {
        totW += getW(curPowerTot);
      }
      if (!curPowerTot || sommaDispositivi) {
        consumoEntita.forEach(e => {
          if (e !== curPowerTot) totW += getW(e);
        });
      }

      box.innerHTML = `
        <div class="fh-sgroup">Nome Stanza</div>
        <div class="fh-srow" style="margin-bottom:14px">
          <input class="fh-input" id="stEditTitle" value="${fhEsc(roomTitle)}" placeholder="Nome della stanza">
        </div>

        <div class="fh-sgroup">Sensore di Temperatura</div>
        <div class="fh-note">Compare sull'icona della stanza e nella barra in cima. Se vuoto, Faber Home rileva il termometro automaticamente dalle card della stanza.</div>
        <div class="fh-srow" style="align-items:center;margin-bottom:8px">
          <span style="font-size:12px;opacity:.7">Attuale:</span>
          <span class="fh-valbadge" style="font-weight:800;color:var(--fh-ink)">${fhEsc(String(tVal))}</span>
        </div>
        ${this._entityListHTML("stEditTemp", curTemp, "sensor.", "Sensore temperatura (es. sensor.temperatura_...)", "temperature")}
        <div class="fh-srow" style="margin-top:6px;gap:6px">
          <button type="button" class="fh-btn" id="btnSvuotaTemp" style="font-size:11px;padding:4px 8px">
            <ha-icon icon="mdi:auto-fix"></ha-icon>Usa rilevamento automatico
          </button>
        </div>

        <div class="fh-sgroup" style="margin-top:16px">Sensore di Umidità <small style="font-size:11px;font-weight:normal;opacity:.7">(opzionale)</small></div>
        ${this._entityListHTML("stEditHum", curHum, "sensor.", "Sensore umidità", "humidity")}

        <div class="fh-sgroup" style="margin-top:22px">Consumi Stanza (Potenza in Watt / kW)</div>
        <div class="fh-note">Puoi impostare un sensore di <b>consumo totale stanza</b> (es. pinza contatore o interruttore generale stanza) e/o aggiungere i <b>singoli carichi/dispositivi</b> (prese smart, elettrodomestici, luci).</div>

        <div class="fh-srow" style="align-items:center;margin-bottom:12px;padding:8px 12px;background:rgba(255,176,32,.08);border:1px solid rgba(255,176,32,.25);border-radius:12px">
          <span style="font-size:12px;font-weight:700">Potenza stanza calcolata adesso:</span>
          <span class="fh-valbadge" style="font-weight:900;font-size:15px;color:var(--fh-c-warn,#ffb020);margin-left:auto">${fhEsc(fhNumW(totW))}</span>
        </div>

        <div class="fh-lab2">1. Sensore Consumo Totale Stanza (contatore / pinza dedicato)</div>
        ${this._entityListHTML("stEditPowerTot", curPowerTot, "sensor.", "Sensore totale stanza (es. sensor.potenza_camera...)", "power")}
        ${curPowerTot ? `
          <div class="fh-srow" style="align-items:center;margin-top:4px;margin-bottom:10px">
            <span style="font-size:11px;opacity:.75">Misura attuale: <b>${fhEsc(fhNumW(getW(curPowerTot)))}</b> (${fhEsc(this._nomeEnt(curPowerTot))})</span>
            <button type="button" class="fh-btn" id="btnRimuoviPowerTot" style="font-size:10px;padding:2px 6px;margin-left:auto">&times; Togli sensore totale</button>
          </div>` : `<div style="height:8px"></div>`}

        <div class="fh-lab2" style="margin-top:10px">2. Singoli Dispositivi ed Elettrodomestici da conteggiare</div>
        <div class="fh-tags">${consumoEntita.length ? consumoEntita.map((e, idx) => {
          const w = getW(e);
          return `<span class="fh-tag">${fhEsc(this._nomeEnt(e))} <b style="opacity:.8;margin-left:4px">${fhEsc(fhNumW(w))}</b><button type="button" data-delc="${idx}">&times;</button></span>`;
        }).join("") : `<div class="fh-note">Nessun singolo dispositivo aggiunto.</div>`}</div>

        ${this._entityListHTML("stAddPower", "", "sensor.", "Aggiungi sensore carico (es. presa, elettrodomestico...)", "power")}
        <div class="fh-srow" style="margin-top:8px;gap:6px">
          <button type="button" class="fh-btn" id="btnAggPower"><ha-icon icon="mdi:plus"></ha-icon>Aggiungi dispositivo</button>
          <button type="button" class="fh-btn" id="btnPropPower"><ha-icon icon="mdi:auto-fix"></ha-icon>Proponi da card e area</button>
        </div>

        ${curPowerTot && consumoEntita.length ? `
        <label class="fh-check" style="margin-top:14px">
          <input type="checkbox" id="chkSommaDispositivi"${sommaDispositivi ? " checked" : ""}>
          Somma i singoli dispositivi al sensore totale (disattiva se il totale sopra include già questi carichi)
        </label>` : ""}

        <label class="fh-check" style="margin-top:14px">
          <input type="checkbox" id="chkMostraSempre"${mostraSempreConsumo ? " checked" : ""}>
          Mostra sempre il valore dei consumi sull'icona della stanza (anche a 0 W)
        </label>

        <label class="fh-check" style="margin-top:8px">
          <input type="checkbox" id="chkConsAttivo"${consumoAttivo ? " checked" : ""}>
          Mostra fascia consumi in cima quando sei dentro la stanza
        </label>

        <div class="fh-srow" style="margin-top:12px">
          <div class="fh-sfield" style="flex:1"><label class="fh-slab">Ambra sopra (W)</label>
            <input class="fh-input" type="number" id="inpAttenzione" min="0" step="10" value="${consumoAttenzione}"></div>
          <div class="fh-sfield" style="flex:1"><label class="fh-slab">Rosso sopra (W)</label>
            <input class="fh-input" type="number" id="inpAlto" min="0" step="10" value="${consumoAlto}"></div>
        </div>

        <div style="height:18px"></div>
        <button type="button" class="fh-btn primary" id="btnSalvaSensori" style="width:100%">
          <ha-icon icon="mdi:check"></ha-icon>${daPagine ? "Applica e torna alle pagine" : "Applica e torna alle stanze"}
        </button>
      `;

      this._wireEntityLists(box);

      const inpTitle = box.querySelector("#stEditTitle");
      if (inpTitle) inpTitle.addEventListener("input", e => { roomTitle = e.target.value; });

      box.querySelectorAll("[data-delc]").forEach(b => b.addEventListener("click", () => {
        consumoEntita.splice(+b.dataset.delc, 1);
        draw();
      }));

      const aggPwr = () => {
        const inp = box.querySelector("#stAddPower");
        const v = (inp && inp.value || "").trim();
        if (!v || !v.includes(".")) return;
        if (!consumoEntita.includes(v)) consumoEntita.push(v);
        draw();
      };
      const btnAgg = box.querySelector("#btnAggPower");
      if (btnAgg) btnAgg.addEventListener("click", aggPwr);
      const inpPwr = box.querySelector("#stAddPower");
      if (inpPwr) inpPwr.addEventListener("change", aggPwr);

      const btnProp = box.querySelector("#btnPropPower");
      if (btnProp) btnProp.addEventListener("click", () => {
        this._proponiConsumo(pg).forEach(e => {
          if (!consumoEntita.includes(e)) consumoEntita.push(e);
        });
        draw();
      });

      const btnSvuota = box.querySelector("#btnSvuotaTemp");
      if (btnSvuota) btnSvuota.addEventListener("click", () => {
        curTemp = "";
        const inpT = box.querySelector("#stEditTemp");
        if (inpT) inpT.value = "";
        draw();
      });

      const btnRimuoviPwr = box.querySelector("#btnRimuoviPowerTot");
      if (btnRimuoviPwr) btnRimuoviPwr.addEventListener("click", () => {
        curPowerTot = "";
        draw();
      });

      const inpPwrTot = box.querySelector("#stEditPowerTot");
      if (inpPwrTot) inpPwrTot.addEventListener("change", e => {
        curPowerTot = e.target.value.trim();
        draw();
      });

      const inpT = box.querySelector("#stEditTemp");
      if (inpT) inpT.addEventListener("change", e => { curTemp = e.target.value.trim(); });
      const inpH = box.querySelector("#stEditHum");
      if (inpH) inpH.addEventListener("change", e => { curHum = e.target.value.trim(); });

      const chkSomma = box.querySelector("#chkSommaDispositivi");
      if (chkSomma) chkSomma.addEventListener("change", e => { sommaDispositivi = e.target.checked; draw(); });
      const chkSempre = box.querySelector("#chkMostraSempre");
      if (chkSempre) chkSempre.addEventListener("change", e => { mostraSempreConsumo = e.target.checked; });
      const chkAtt = box.querySelector("#chkConsAttivo");
      if (chkAtt) chkAtt.addEventListener("change", e => { consumoAttivo = e.target.checked; });
      const inpAtt = box.querySelector("#inpAttenzione");
      if (inpAtt) inpAtt.addEventListener("change", e => { consumoAttenzione = Math.max(0, +e.target.value || 0); });
      const inpAlt = box.querySelector("#inpAlto");
      if (inpAlt) inpAlt.addEventListener("change", e => { consumoAlto = Math.max(1, +e.target.value || 1); });

      const btnSalva = box.querySelector("#btnSalvaSensori");
      if (btnSalva) btnSalva.addEventListener("click", async () => {
        if (roomTitle.trim()) pg.title = roomTitle.trim();
        if (curTemp) pg.temp = curTemp;
        else delete pg.temp;
        if (curHum) pg.humidity = curHum;
        else delete pg.humidity;
        if (curPowerTot) pg.power = curPowerTot;
        else delete pg.power;
        pg.mostra_sempre_consumo = !!mostraSempreConsumo;
        pg.consumo_somma_tutto = !!sommaDispositivi;

        const s1 = Math.min(consumoAttenzione, consumoAlto);
        const s2 = Math.max(consumoAttenzione, consumoAlto);
        pg.consumo = {
          attiva: consumoAttivo,
          entita: consumoEntita.slice(),
          attenzione: s1,
          alto: s2,
          titolo: consumoTitolo || ""
        };

        this._renderNav();
        this._renderPage();
        // Non si salva qui. Salvare a meta foglio fa ricostruire il pannello a
        // Home Assistant e il foglio che si riapriva finiva su un elemento che
        // non c'e piu. Si fa come per il nome e l'ordine: aperto dalle Pagine
        // salva il tasto Salva della modifica, aperto dalle Stanze salva Fatto
        // (o la chiusura) del foglio Stanze.
        if (daPagine) { this._openPageSheet(); return; }
        this._stanzeMosse = true;
        this._modificaStanze = true;
        this._apriStanze(true);
      });
    };

    draw();
    this._sheet("Sensori: " + (pg.title || "stanza"), box, false);
  }

  // Quali pagine aggiungere alla barra quando si e dentro QUESTA pagina.
  // Le pagine sempre presenti non si elencano: ci sono gia per definizione.
  _sceltaBarra(i) {
    const pg = this._cfg.pages[i];
    if (!Array.isArray(pg.barra)) pg.barra = [];
    const box = document.createElement("div");
    const draw = () => {
      const altre = this._cfg.pages
        .map((p, j) => ({ p, j }))
        .filter(x => x.j !== i && x.p.nascosta);
      box.innerHTML = `
        <div class="fh-note">Quando sei in <b>${fhEsc(pg.title || "questa pagina")}</b> la barra mostra sempre
          Casa, Sicurezza e Consumi, piu questa pagina. Qui scegli cos'altro aggiungere.</div>
        ${altre.length ? `<div class="fh-chipwrap">${altre.map(({ p }) => `
          <button type="button" class="fh-chipsel${(pg.barra || []).includes(p.id) ? " on" : ""}" data-id="${fhEsc(p.id)}">
            <ha-icon icon="${fhEsc(p.icon || "mdi:circle-outline")}"></ha-icon>${fhEsc(p.title || p.id)}
          </button>`).join("")}</div>`
          : `<div class="fh-note">Non ci sono altre pagine da aggiungere.</div>`}`;
      box.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
        const id = b.dataset.id;
        pg.barra = (pg.barra || []).includes(id)
          ? pg.barra.filter(x => x !== id)
          : (pg.barra || []).concat([id]);
        draw(); this._renderNav();
      }));
    };
    draw();
    this._sheet("Barra di " + (pg.title || "questa pagina"), box, true);
  }

  // --------------------------------------------------------- impostazioni
  // Tutto quello che prima si poteva cambiare solo scrivendo la
  // configurazione a mano: orari del tema, sfondo, animazione, e i chip.
  // L'elenco si riempie mentre scrivi, sull'INSIEME COMPLETO delle entita.
  // Prima erano le prime 400 in ordine alfabetico: in questa casa i sensori
  // sono 1234, e sei dei nove sensori di temperatura restavano tagliati fuori
  // — proprio quelli chiamati "temperatura_*", che in alfabeto vengono tardi.
  // Un elenco troncato non e un elenco: e una lotteria sull'iniziale.
  _entityListHTML(id, value, prefix, label, dc) {
    // Etichetta e campo incolonnati: senza il contenitore scorrevano in linea
    // e "Meteo" finiva accanto a "Temperatura" invece che sopra il suo campo.
    return `<div class="fh-sfield" data-elist="${id}" data-prefix="${fhEsc(prefix || "")}" data-dc="${fhEsc(dc || "")}">
      <label class="fh-slab">${fhEsc(label)}</label>
      <input class="fh-input" id="${id}" list="${id}List" value="${fhEsc(value || "")}"
        placeholder="scrivi per cercare..." autocomplete="off">
      <datalist id="${id}List"></datalist>
    </div>`;
  }

  // Va richiamato dopo aver messo il markup nel DOM.
  _wireEntityLists(box) {
    box.querySelectorAll("[data-elist]").forEach(campo => {
      const inp = campo.querySelector("input");
      const dl = campo.querySelector("datalist");
      const prefix = campo.dataset.prefix;
      const dc = campo.dataset.dc;
      const st = this._hass.states;
      const tutte = Object.keys(st).filter(e => !prefix || e.startsWith(prefix));
      // Se il campo ha un mestiere (temperatura, potenza...), quelle giuste
      // stanno in cima anche prima di scrivere: e quasi sempre una di loro.
      const buone = dc ? tutte.filter(e => {
        const a = (st[e] && st[e].attributes) || {};
        if (a.device_class === dc) return true;
        if (dc === "power") {
          const u = String(a.unit_of_measurement || "").toLowerCase();
          return u === "w" || u === "kw";
        }
        if (dc === "temperature") {
          const u = String(a.unit_of_measurement || "").toLowerCase();
          return u === "°c" || u === "°f" || u === "c" || u === "f";
        }
        if (dc === "humidity") {
          const u = String(a.unit_of_measurement || "").toLowerCase();
          return u === "%" && (e.includes("humid") || e.includes("umid"));
        }
        return false;
      }) : [];
      const nome = e => (st[e].attributes.friendly_name || e);
      const riempi = () => {
        const parole = inp.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
        const filtra = arr => arr.filter(e =>
          !parole.length || parole.every(w => (e + " " + nome(e)).toLowerCase().includes(w)));
        const testa = filtra(buone);
        const resto = filtra(tutte).filter(e => !testa.includes(e));
        dl.innerHTML = [...testa, ...resto].slice(0, 120)
          .map(e => `<option value="${e}">${fhEsc(nome(e))}</option>`).join("");
      };
      riempi();
      inp.addEventListener("input", riempi);
      inp.addEventListener("focus", riempi);
    });
  }

  _openSettings() {
    const box = document.createElement("div");
    const draw = () => {
      const ap = this._cfg.appearance, at = ap.autoTheme, pb = ap.pageBackground, h = this._cfg.header;
      const att = this._attenzioneCfg();
      const sal = this._salutoCfg();
      const azi = this._azioniCfg();
      const domAz = { entita: "", scena: "scene.", script: "script.", automazione: "automation." };
      box.innerHTML = `
        <div class="fh-sgroup">Aspetto</div>
        <label class="fh-slab">Giorno o notte</label>
        <div class="fh-seg">
          ${[["auto", "Con l'ora"], ["giorno", "Sempre giorno"], ["notte", "Sempre notte"]].map(([v, n]) =>
            `<button type="button" class="fh-segbtn${(ap.temaFisso || "auto") === v ? " sel" : ""}" data-tema="${v}">${n}</button>`).join("")}
        </div>
        <div class="fh-note">Lo stesso comando sta anche in alto, accanto all'orologio: un tocco e passi da giorno a notte.</div>

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
        <div class="fh-note">Il cursore qui sotto governa sia quante sono sia quanto corrono: al minimo il cielo si muove appena, al massimo scende deciso.</div>

        <div class="fh-srow">
          <div class="fh-sfield" style="flex:1">
            <label class="fh-slab">Quanto si muove il cielo</label>
            <input class="fh-range" id="stSky" type="range" min="0" max="100" step="5"
              value="${parseInt(ap.skyIntensity == null ? 70 : ap.skyIntensity, 10)}">
          </div>
          <div class="fh-sfield" style="flex:0 0 62px">
            <label class="fh-slab">&nbsp;</label>
            <div class="fh-rangeval" id="stSkyVal">${parseInt(ap.skyIntensity == null ? 70 : ap.skyIntensity, 10)}%</div>
          </div>
        </div>
        <div class="fh-note">Governa insieme quante stelle (o gocce, o fiocchi) ci sono e quanto scintillano. A zero il cielo resta un quadro fermo.</div>

        <label class="fh-slab">Le card</label>
        <div class="fh-seg">
          ${[["piene", "Piene"], ["vetro", "Vetro"]].map(([v, n]) =>
            `<button type="button" class="fh-segbtn${(ap.cardStyle || "piene") === v ? " sel" : ""}" data-cardstyle="${v}">${n}</button>`).join("")}
        </div>
        <div class="fh-note">Col vetro le card diventano semitrasparenti e sfocate: il cielo animato si vede scorrere dietro. Di giorno il vetro si schiarisce da solo, cosi le scritte restano leggibili.</div>
        ${(ap.cardStyle || "piene") === "vetro" ? `
        <div class="fh-srow" style="margin-top:8px">
          <div class="fh-sfield" style="flex:1">
            <label class="fh-slab">Trasparenza card</label>
            <input class="fh-range" id="stCardTrasp" type="range" min="10" max="95" step="5"
              value="${parseInt(ap.cardTrasparenza == null ? 40 : ap.cardTrasparenza, 10)}">
          </div>
          <div class="fh-sfield" style="flex:0 0 62px">
            <label class="fh-slab">&nbsp;</label>
            <div class="fh-rangeval" id="stCardTraspVal">${parseInt(ap.cardTrasparenza == null ? 40 : ap.cardTrasparenza, 10)}%</div>
          </div>
        </div>
        <div class="fh-note">Più trasparente mostra meglio il cielo e le particelle animate; meno trasparente aumenta la corposità della card.</div>

        <div class="fh-srow" style="margin-top:8px">
          <div class="fh-sfield" style="flex:1">
            <label class="fh-slab">Sfocatura vetro (blur)</label>
            <input class="fh-range" id="stCardBlur" type="range" min="0" max="30" step="2"
              value="${parseInt(ap.cardBlur == null ? 16 : ap.cardBlur, 10)}">
          </div>
          <div class="fh-sfield" style="flex:0 0 62px">
            <label class="fh-slab">&nbsp;</label>
            <div class="fh-rangeval" id="stCardBlurVal">${parseInt(ap.cardBlur == null ? 16 : ap.cardBlur, 10)}px</div>
          </div>
        </div>
        <div class="fh-note">Sfoca lo sfondo animato dietro alle card (effetto vetro satinato) per garantire testi nitidi e contrastati.</div>
        ` : ""}

        <label class="fh-slab">Sfondo della pagina</label>
        <div class="fh-seg">
          ${[["gradient", "Sfumatura"], ["solid", "Tinta unita"], ["none", "Nessuno"]].map(([v, n]) =>
            `<button type="button" class="fh-segbtn${(pb.mode || "gradient") === v ? " sel" : ""}" data-bg="${v}">${n}</button>`).join("")}
        </div>
        ${pb.mode === "solid" ? `<div class="fh-srow">
          <div class="fh-sfield"><label class="fh-slab">Colore</label>
          <input class="fh-input" id="stColor" type="color" value="${fhEsc(/^#[0-9a-f]{6}$/i.test(pb.color || "") ? pb.color : "#0d1420")}"></div></div>` : ""}

        <div class="fh-sgroup">Intestazione</div>
        <div class="fh-sgroup">Barra laterale di Home Assistant</div>
        <div class="fh-sfield"><label class="fh-slab">Nascondila</label>
          <select class="fh-input" id="stSide">
            <option value="mai"${(ap.sidebar || "mai") === "mai" ? " selected" : ""}>Mai — la lascio com'e</option>
            <option value="stretti"${ap.sidebar === "stretti" ? " selected" : ""}>Su telefono e tablet</option>
            <option value="sempre"${ap.sidebar === "sempre" ? " selected" : ""}>Sempre</option>
          </select>
          <span class="fh-note">Torna come prima quando esci da Faber Home. Da nascosta si riapre dal bordo sinistro dello schermo.</span>
        </div>

        ${this._entityListHTML("stWeather", h.weather, "weather.", "Meteo (previsioni)")}
        ${this._entityListHTML("stWeatherNow", h.weather_attuale || "", "weather.", "Cielo di adesso (vuoto: come sopra)")}
        <span class="fh-note">I servizi a modello (met.no, Open-Meteo) sono buoni per i prossimi giorni ma
          non vedono il temporale che c'e adesso. Per il cielo di adesso meglio uno che osserva, come
          OpenWeatherMap in modalita <b>current</b>. Se quello tace, si torna al primo.</span>
        ${this._entityListHTML("stTemp", h.temperature, "sensor.", "Temperatura mostrata", "temperature")}
        <label class="fh-check"><input type="checkbox" id="stSwipe"${ap.swipe !== false ? " checked" : ""}>
          Cambia pagina strisciando di lato</label>
        <label class="fh-check"><input type="checkbox" id="stSec"${h.seconds ? " checked" : ""}>
          Mostra anche i secondi nell'orologio</label>

        <div class="fh-sgroup">Serve qualcosa?</div>
        <div class="fh-note">La riga in cima che elenca <b>solo</b> quello che e fuori posto. Le regole le scrivi tu:
          entita, quando vale, e cosa deve dire. Nel testo puoi usare <b>{nome}</b>, <b>{stato}</b> e <b>{da}</b>
          (da quanto tempo), per esempio "Luce giardino accesa da {da}".</div>
        <label class="fh-check"><input type="checkbox" id="attOn"${att.attiva ? " checked" : ""}>
          Mostra la riga</label>
        <label class="fh-check"><input type="checkbox" id="attOk"${att.tuttoOk ? " checked" : ""}>
          Quando non c'e niente scrivi "Tutto in ordine"</label>
        <div class="fh-sfield"><label class="fh-slab">Dove</label>
          <select class="fh-input" id="attDove">
            <option value="prima"${att.dove === "prima" ? " selected" : ""}>Solo nella Home</option>
            <option value="tutte"${att.dove === "tutte" ? " selected" : ""}>In tutte le pagine</option>
          </select></div>
        <label class="fh-check" style="margin-top:10px"><input type="checkbox" id="attBat"${att.batterie ? " checked" : ""}>
          Batterie scariche (le tre piu basse)</label>
        ${att.batterie ? `<div class="fh-sfield"><label class="fh-slab">Sotto il</label>
          <input class="fh-input" id="attBatS" type="number" min="1" max="100" value="${att.sogliaBatteria}"></div>` : ""}
        ${att.batterie ? `<div class="fh-lab2" style="margin-top:6px">Batterie da non guardare
            <small>quelle degli apparecchi a corrente: segnano 0% per sempre</small></div>
          <div class="fh-tags">${att.ignoraBatterie.length
            ? att.ignoraBatterie.map((e, i) => `<span class="fh-tag">${fhEsc(this._nomeEnt(e))}<button type="button" data-batvia="${i}">&times;</button></span>`).join("")
            : `<div class="fh-note">Nessuna esclusa.</div>`}</div>
          ${this._entityListHTML("attBatIgn", "", "sensor.", "Escludi una batteria", "battery")}
          <button type="button" class="fh-btn" id="attBatAdd" style="margin-bottom:6px">Escludi questa</button>` : ""}
        <label class="fh-check"><input type="checkbox" id="attRob"${att.robot ? " checked" : ""}>
          Robot: panni bagnati, sacchetto pieno, guasti</label>
        <label class="fh-check"><input type="checkbox" id="attOff"${att.offline ? " checked" : ""}>
          Dispositivi che non rispondono</label>

        <div class="fh-sgroup">Saluto</div>
        <div class="fh-note">La riga sotto l'orologio: buongiorno/buonasera, che tempo fa fuori, a che ora
          tramonta il sole e i rifiuti di stasera (letti dal calendario che hai gia scritto nella card Rifiuti).</div>
        <label class="fh-check"><input type="checkbox" id="salOn"${sal.attivo ? " checked" : ""}>
          Mostra il saluto</label>
        ${sal.attivo ? `
          <div class="fh-sfield"><label class="fh-slab">Come ti chiamo</label>
            <input class="fh-input" id="salNome" value="${fhEsc(sal.nome)}" placeholder="Cristian"></div>
          <label class="fh-check"><input type="checkbox" id="salMeteo"${sal.meteo ? " checked" : ""}>
            Gradi e cielo di adesso</label>
          <label class="fh-check"><input type="checkbox" id="salSole"${sal.sole ? " checked" : ""}>
            Ora dell'alba o del tramonto</label>
          <label class="fh-check"><input type="checkbox" id="salRif"${sal.rifiuti ? " checked" : ""}>
            Rifiuti di stasera</label>
          <div class="fh-note" style="margin-top:6px">Adesso direbbe: <b>${fhEsc(this._salutoText() || "—")}</b></div>` : ""}
        ${att.voci.map((v, i) => `
          <div class="fh-attrow" data-a="${i}">
            <div class="fh-srow">
              <div class="fh-sfield"><label class="fh-slab">Icona</label>
                <input class="fh-input" data-f="icona" value="${fhEsc(v.icona || "")}" placeholder="mdi:alert"></div>
              <div class="fh-sfield"><label class="fh-slab">Testo</label>
                <input class="fh-input" data-f="testo" value="${fhEsc(v.testo || "")}" placeholder="{nome} da {da}"></div>
            </div>
            ${this._entityListHTML("stAtt" + i, v.entity, "", "Entita")}
            <div class="fh-srow">
              <div class="fh-sfield"><label class="fh-slab">Quando</label>
                <select class="fh-input" data-sel="quando">
                  ${[["acceso", "E acceso / aperto"], ["spento", "E spento / chiuso"], ["stato", "E in uno stato preciso"],
                     ["sopra", "E sopra un valore"], ["sotto", "E sotto un valore"]]
                    .map(([k, et]) => `<option value="${k}"${(v.quando || "acceso") === k ? " selected" : ""}>${et}</option>`).join("")}
                </select></div>
              ${["stato", "sopra", "sotto"].includes(v.quando || "acceso") ? `<div class="fh-sfield">
                <label class="fh-slab">Valore</label>
                <input class="fh-input" data-f="valore" value="${fhEsc(String(v.valore == null ? "" : v.valore))}"></div>` : ""}
              <div class="fh-sfield"><label class="fh-slab">Da almeno (min)</label>
                <input class="fh-input" data-f="per" type="number" min="0" value="${Number(v.per) || 0}"></div>
            </div>
            <div class="fh-srow">
              <div class="fh-sfield"><label class="fh-slab">Colore</label>
                <select class="fh-input" data-sel="colore">
                  ${[["ambra", "Ambra"], ["rosso", "Rosso"], ["blu", "Blu"], ["verde", "Verde"]]
                    .map(([k, et]) => `<option value="${k}"${(v.colore || "ambra") === k ? " selected" : ""}>${et}</option>`).join("")}
                </select></div>
              <div class="fh-sfield"><label class="fh-slab">Al tocco va a</label>
                <select class="fh-input" data-sel="vai">
                  <option value="">Mostra le informazioni</option>
                  ${(this._cfg.pages || []).map(pg => `<option value="${fhEsc(pg.id)}"${v.vai === pg.id ? " selected" : ""}>${fhEsc(pg.title || pg.id)}</option>`).join("")}
                </select></div>
            </div>
            ${att.voci.filter((o, j) => j !== i && o.entity).length ? `<div class="fh-sfield">
              <label class="fh-slab">Quando c'e questa, non mostrare anche</label>
              ${att.voci.map((o, j) => j === i || !o.entity ? "" : `<label class="fh-check">
                <input type="checkbox" data-assorbe="${fhEsc(o.entity)}"${(v.assorbe || []).includes(o.entity) ? " checked" : ""}>
                ${fhEsc(o.testo || o.entity)}</label>`).join("")}</div>` : ""}
            <div class="fh-chiptools">
              <button type="button" class="fh-tool" data-act="up"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
              <button type="button" class="fh-tool" data-act="down"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
              <button type="button" class="fh-tool" data-act="del"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
            </div>
          </div>`).join("")}
        <button type="button" class="fh-btn primary" id="attAdd">+ Aggiungi una regola</button>

        <div class="fh-sgroup">Azioni rapide</div>
        <div class="fh-note">Tondi grossi appena sopra la barra in basso, dove arriva il pollice senza
          spostare la mano. Se non ti servono, spegnile: lo spazio torna alla pagina da solo.</div>
        <label class="fh-check"><input type="checkbox" id="azOn"${azi.attive ? " checked" : ""}>
          Mostra le azioni rapide</label>
        ${azi.attive ? `
          <div class="fh-sfield"><label class="fh-slab">Dove</label>
            <select class="fh-input" id="azDove">
              <option value="prima"${azi.dove === "prima" ? " selected" : ""}>Solo nella Home</option>
              <option value="tutte"${azi.dove === "tutte" ? " selected" : ""}>In tutte le pagine</option>
            </select></div>
          ${azi.voci.map((v, i) => `
            <div class="fh-attrow" data-z="${i}">
              <div class="fh-srow">
                <div class="fh-sfield"><label class="fh-slab">Icona</label>
                  <input class="fh-input" data-f="icona" value="${fhEsc(v.icona || "")}" placeholder="mdi:exit-run"></div>
                <div class="fh-sfield"><label class="fh-slab">Scritta</label>
                  <input class="fh-input" data-f="testo" value="${fhEsc(v.testo || "")}" placeholder="Esco"></div>
              </div>
              <div class="fh-sfield"><label class="fh-slab">Cosa fa</label>
                <select class="fh-input" data-sel="tipo">
                  ${[["entita", "Accende / spegne"], ["scena", "Lancia una scena"], ["script", "Lancia uno script"],
                     ["automazione", "Fa partire un'automazione"], ["pagina", "Apre una pagina"], ["link", "Apre un indirizzo"]]
                    .map(([k, et]) => `<option value="${k}"${(v.tipo || "entita") === k ? " selected" : ""}>${et}</option>`).join("")}
                </select></div>
              ${(v.tipo || "entita") === "pagina"
                ? `<div class="fh-sfield"><label class="fh-slab">Pagina</label>
                    <select class="fh-input" data-sel="target">
                      <option value="">Scegli…</option>
                      ${(this._cfg.pages || []).map(pg => `<option value="${fhEsc(pg.id)}"${v.target === pg.id ? " selected" : ""}>${fhEsc(pg.title || pg.id)}</option>`).join("")}
                    </select></div>`
                : (v.tipo === "link"
                  ? `<div class="fh-sfield"><label class="fh-slab">Indirizzo</label>
                      <input class="fh-input" data-f="target" value="${fhEsc(v.target || "")}" placeholder="/lovelace/…"></div>`
                  : this._entityListHTML("stAz" + i, v.target, domAz[v.tipo || "entita"], "Cosa comanda"))}
              <div class="fh-chiptools">
                <button type="button" class="fh-tool" data-act="up"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
                <button type="button" class="fh-tool" data-act="down"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
                <button type="button" class="fh-tool" data-act="del"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
              </div>
            </div>`).join("")}
          <button type="button" class="fh-btn primary" id="azAdd">+ Aggiungi un'azione</button>` : ""}

        <div class="fh-sgroup">Chip</div>
        <div class="fh-note">Compaiono sotto l'orologio, su una riga che scorre. Cosa fanno al tocco lo scegli per ognuno: di serie mostrano le informazioni.</div>
        ${(h.chips || []).map((c, i) => `
          <div class="fh-chiprow" data-c="${i}">
            <div class="fh-srow">
              <div class="fh-sfield"><label class="fh-slab">Icona</label>
                <input class="fh-input" data-f="icon" value="${fhEsc(c.icon || "")}" placeholder="mdi:lightbulb"></div>
              <div class="fh-sfield"><label class="fh-slab">Etichetta</label>
                <input class="fh-input" data-f="label" value="${fhEsc(c.label || "")}"></div>
            </div>
            ${this._entityListHTML("stChip" + i, c.entity, "", "Entità")}
            ${c.tipo === "spesa" || c.tipo === "dispositivi" || c.tipo === "offline" || c.link || c.pagina
              || String(c.entity || "").startsWith("todo.") ? "" : `<div class="fh-srow">
              <div class="fh-sfield"><label class="fh-slab">Al tocco</label>
                <select class="fh-input" data-sel="tocco">
                  ${[["info", "Mostra le informazioni"], ["consumi", "Apre consumi e domande"], ["comando", "Comanda (accende/spegne, apre/chiude)"], ["pagina", "Apre una pagina"], ["nulla", "Niente"]]
                    .map(([v, t]) => `<option value="${v}"${(c.tocco || "info") === v ? " selected" : ""}>${t}</option>`).join("")}
                </select></div>
              ${(c.tocco || "info") === "consumi" ? `<div class="fh-sfield"><label class="fh-slab">Sensore di potenza</label>
                ${this._entityListHTML("stChipPw" + i, c.power, "sensor.", "sensor.…")}</div>` : ""}
              ${(c.tocco || "info") === "pagina" ? `<div class="fh-sfield"><label class="fh-slab">Pagina</label>
                <select class="fh-input" data-sel="vai">
                  <option value="">Scegli…</option>
                  ${(this._cfg.pages || []).map(p => `<option value="${fhEsc(p.id)}"${c.vai === p.id ? " selected" : ""}>${fhEsc(p.title || p.id)}</option>`).join("")}
                </select></div>` : ""}
            </div>`}
            <div class="fh-chiptools">
              <button type="button" class="fh-tool" data-act="up"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
              <button type="button" class="fh-tool" data-act="down"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
              <button type="button" class="fh-tool" data-act="del"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
            </div>
          </div>`).join("")}
        <button type="button" class="fh-btn primary" id="stAddChip">+ Aggiungi chip</button>

`;
      wire();
    };

    const apply = () => { this._applyScene(true); this._renderNav(); this._renderPage(); };

    const wire = () => {
      this._wireEntityLists(box);
      const q = id => box.querySelector(id);
      const ap = this._cfg.appearance, h = this._cfg.header;
      q("#stSide").addEventListener("change", e => {
        this._cfg.appearance.sidebar = e.target.value;
        this._sidebarNascosta = undefined;
        this._applySidebar();
      });
      q("#stAuto").addEventListener("change", e => { ap.autoTheme.enabled = e.target.checked; apply(); });
      q("#stDay").addEventListener("change", e => { ap.autoTheme.dayStart = e.target.value || "07:00"; apply(); });
      q("#stNight").addEventListener("change", e => { ap.autoTheme.nightStart = e.target.value || "21:00"; apply(); });
      q("#stAnim").addEventListener("change", e => {
        ap.weatherAnimation = e.target.checked;
        if (this._skyfx) this._skyfx.setScene(this._weatherMode(), this._isDark(), this._forzaCielo());
      });
      box.querySelectorAll("[data-bg]").forEach(b => b.addEventListener("click", () => {
        ap.pageBackground.mode = b.dataset.bg; draw(); apply();
      }));
      const sky = q("#stSky");
      if (sky) sky.addEventListener("input", e => {
        const v = parseInt(e.target.value, 10);
        ap.skyIntensity = v;
        const et = q("#stSkyVal"); if (et) et.textContent = v + "%";
        // Si vede mentre si trascina: ridisegnare tutto il pannello a ogni
        // scatto del cursore sarebbe uno scatto solo alla fine.
        if (this._skyfx) {
          this._skyfx.setScene(this._weatherMode(), this._isDark(), v / 100);
          this._skyfx.draw(performance.now() / 1000);
        }
      });
      box.querySelectorAll("[data-tema]").forEach(b => b.addEventListener("click", () => {
        ap.temaFisso = b.dataset.tema;
        draw();
        apply();
      }));
      box.querySelectorAll("[data-cardstyle]").forEach(b => b.addEventListener("click", () => {
        ap.cardStyle = b.dataset.cardstyle;
        this._applicaVetroVars();
        draw();
        this._segnaFascia();   // e' li che si accende o si spegne il vetro
        apply();
      }));
      const cardTrasp = q("#stCardTrasp");
      if (cardTrasp) cardTrasp.addEventListener("input", e => {
        const v = parseInt(e.target.value, 10);
        ap.cardTrasparenza = v;
        const et = q("#stCardTraspVal"); if (et) et.textContent = v + "%";
        this._applicaVetroVars();
      });
      const cardBlur = q("#stCardBlur");
      if (cardBlur) cardBlur.addEventListener("input", e => {
        const v = parseInt(e.target.value, 10);
        ap.cardBlur = v;
        const et = q("#stCardBlurVal"); if (et) et.textContent = v + "px";
        this._applicaVetroVars();
      });
      const col = q("#stColor");
      if (col) col.addEventListener("input", e => { ap.pageBackground.color = e.target.value; apply(); });
      q("#stWeather").addEventListener("change", e => { h.weather = e.target.value.trim(); apply(); });
      q("#stWeatherNow").addEventListener("change", e => { h.weather_attuale = e.target.value.trim(); apply(); });
      q("#stTemp").addEventListener("change", e => { h.temperature = e.target.value.trim(); this._updateLive(); });
      q("#stSwipe").addEventListener("change", e => { ap.swipe = e.target.checked; });
      q("#stSec").addEventListener("change", e => { h.seconds = e.target.checked; this._startClock(); });
      // --- Serve qualcosa? ---
      const A = () => (this._cfg.attenzione = this._cfg.attenzione || {});
      const vociA = () => { const a = A(); a.voci = Array.isArray(a.voci) ? a.voci : []; return a.voci; };
      q("#attOn").addEventListener("change", e => { A().attiva = e.target.checked; apply(); });
      q("#attOk").addEventListener("change", e => { A().tuttoOk = e.target.checked; apply(); });
      q("#attDove").addEventListener("change", e => { A().dove = e.target.value; apply(); });
      q("#attBat").addEventListener("change", e => { A().batterie = e.target.checked; draw(); apply(); });
      const bs = q("#attBatS");
      if (bs) bs.addEventListener("change", e => { A().sogliaBatteria = Math.max(1, parseInt(e.target.value, 10) || 15); apply(); });
      q("#attOff").addEventListener("change", e => { A().offline = e.target.checked; apply(); });
      q("#attRob").addEventListener("change", e => { A().robot = e.target.checked; apply(); });
      const bAdd = q("#attBatAdd");
      if (bAdd) bAdd.addEventListener("click", () => {
        const v = (q("#attBatIgn").value || "").trim();
        if (!v.includes(".")) return;
        const a = A(); a.ignoraBatterie = Array.isArray(a.ignoraBatterie) ? a.ignoraBatterie : [];
        if (!a.ignoraBatterie.includes(v)) a.ignoraBatterie.push(v);
        draw(); apply();
      });
      box.querySelectorAll("[data-batvia]").forEach(b => b.addEventListener("click", () => {
        const a = A();
        (a.ignoraBatterie || []).splice(parseInt(b.dataset.batvia, 10), 1);
        draw(); apply();
      }));

      // --- Azioni rapide ---
      const Z = () => (this._cfg.azioni = this._cfg.azioni || {});
      const vociZ = () => { const a = Z(); a.voci = Array.isArray(a.voci) ? a.voci : []; return a.voci; };
      q("#azOn").addEventListener("change", e => { Z().attive = e.target.checked; draw(); apply(); });
      const azD = q("#azDove");
      if (azD) azD.addEventListener("change", e => { Z().dove = e.target.value; apply(); });
      const azA = q("#azAdd");
      if (azA) azA.addEventListener("click", () => {
        vociZ().push({ icona: "mdi:gesture-tap-button", testo: "Azione", tipo: "entita", target: "" });
        draw(); apply();
      });
      box.querySelectorAll(".fh-attrow[data-z]").forEach(row => {
        const i = parseInt(row.dataset.z, 10);
        const v = vociZ()[i];
        if (!v) return;
        row.querySelectorAll("[data-f]").forEach(inp => inp.addEventListener("input", () => {
          v[inp.dataset.f] = inp.value;
          this._renderNav();
        }));
        const ent = row.querySelector("#stAz" + i);
        if (ent) ent.addEventListener("change", e => { v.target = e.target.value.trim(); apply(); });
        row.querySelectorAll("[data-sel]").forEach(sel => sel.addEventListener("change", () => {
          const k = sel.dataset.sel;
          v[k] = sel.value;
          // Cambiando il tipo cambia anche cosa si sceglie sotto: pagina,
          // indirizzo o entita di un dominio diverso.
          if (k === "tipo") { v.target = ""; draw(); }
          apply();
        }));
        row.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
          const a = b.dataset.act, lista = vociZ();
          if (a === "up" && i > 0) { const [x] = lista.splice(i, 1); lista.splice(i - 1, 0, x); }
          else if (a === "down" && i < lista.length - 1) { const [x] = lista.splice(i, 1); lista.splice(i + 1, 0, x); }
          else if (a === "del") lista.splice(i, 1);
          draw(); apply();
        }));
      });

      // --- Saluto ---
      const S = () => { h.saluto = h.saluto || {}; return h.saluto; };
      q("#salOn").addEventListener("change", e => { S().attivo = e.target.checked; draw(); this._aggiornaSaluto(); });
      const sn = q("#salNome");
      if (sn) sn.addEventListener("input", e => { S().nome = e.target.value; this._aggiornaSaluto(); });
      [["salMeteo", "meteo"], ["salSole", "sole"], ["salRif", "rifiuti"]].forEach(([id, k]) => {
        const el = q("#" + id);
        if (el) el.addEventListener("change", e => { S()[k] = e.target.checked; draw(); this._aggiornaSaluto(); });
      });
      q("#attAdd").addEventListener("click", () => {
        vociA().push({ entity: "", quando: "acceso", testo: "{nome} da {da}", icona: "mdi:alert-circle-outline", colore: "ambra", per: 0 });
        A().attiva = true;
        draw(); apply();
      });
      box.querySelectorAll(".fh-attrow").forEach(row => {
        const i = parseInt(row.dataset.a, 10);
        const v = vociA()[i];
        if (!v) return;
        row.querySelectorAll("[data-f]").forEach(inp => inp.addEventListener("input", () => {
          const k = inp.dataset.f;
          v[k] = k === "per" ? (parseInt(inp.value, 10) || 0) : inp.value;
          this._aggiornaAttenzione();
        }));
        const ent = row.querySelector("#stAtt" + i);
        if (ent) ent.addEventListener("change", e => { v.entity = e.target.value.trim(); this._aggiornaAttenzione(); });
        row.querySelectorAll("[data-assorbe]").forEach(cb => cb.addEventListener("change", () => {
          const l = new Set(v.assorbe || []);
          if (cb.checked) l.add(cb.dataset.assorbe); else l.delete(cb.dataset.assorbe);
          if (l.size) v.assorbe = [...l]; else delete v.assorbe;
          this._aggiornaAttenzione();
        }));
        row.querySelectorAll("[data-sel]").forEach(sel => sel.addEventListener("change", () => {
          const k = sel.dataset.sel;
          if (sel.value) v[k] = sel.value; else delete v[k];
          // Cambiando "quando" compare (o sparisce) il campo del valore.
          if (k === "quando") draw();
          this._aggiornaAttenzione();
        }));
        row.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
          const a = b.dataset.act, lista = vociA();
          if (a === "up" && i > 0) { const [x] = lista.splice(i, 1); lista.splice(i - 1, 0, x); }
          else if (a === "down" && i < lista.length - 1) { const [x] = lista.splice(i, 1); lista.splice(i + 1, 0, x); }
          else if (a === "del") lista.splice(i, 1);
          draw(); apply();
        }));
      });

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
        row.querySelectorAll("[data-sel]").forEach(sel => sel.addEventListener("change", () => {
          const k = sel.dataset.sel;
          if (sel.value && !(k === "tocco" && sel.value === "info")) chip[k] = sel.value; else delete chip[k];
          if (k === "tocco" && sel.value !== "pagina") delete chip.vai;
          // Il chip si ridisegna col suo nuovo comportamento; la riga
          // dell'editor si rifa se deve comparire (o sparire) la pagina.
          this._forzaChip = true;
          this._updateChips();
          if (k === "tocco") draw();
        }));
        row.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
          const a = b.dataset.act;
          if (a === "up" && i > 0) { const [x] = h.chips.splice(i, 1); h.chips.splice(i - 1, 0, x); }
          else if (a === "down" && i < h.chips.length - 1) { const [x] = h.chips.splice(i, 1); h.chips.splice(i + 1, 0, x); }
          else if (a === "del") h.chips.splice(i, 1);
          draw(); this._updateLive();
        }));
      });
    };

    draw();
    this._sheet("Impostazioni", box, true);
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
    // fh_popup e una chiave nostra: si toglie prima di passare la
    // configurazione alla card, che potrebbe rifiutare cio che non conosce.
    const pulita = Object.assign({}, cardCfg);
    delete pulita.fh_popup;
    try {
      if (helpers && helpers.createCardElement) el = helpers.createCardElement(pulita);
      else if (pulita.type && pulita.type.startsWith("custom:")) {
        el = document.createElement(pulita.type.slice(7));
        el.setConfig(pulita);
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
    const pop = cardCfg.fh_popup;
    if (!this._edit && pop && (pop.cards || []).length) {
      // Uno strato trasparente sopra la card: senza, il tocco finirebbe ai
      // comandi della card (accendere una presa) invece di aprire il popup.
      const tap = document.createElement("div");
      tap.className = "fh-tap";
      tap.addEventListener("click", e => { e.stopPropagation(); fhVibra(8); this._openCardPopup(cardCfg); });
      wrap.appendChild(tap);
      wrap.classList.add("has-popup");
    }
    this._cardEls.set(el, el);
    return wrap;
  }

  _updateLive() {
    if (this._skyfx) this._skyfx.setScene(this._weatherMode(), this._isDark(), this._forzaCielo());
    // Il vetro cambia colore col tema: scuro di notte, chiaro di giorno,
    // senno alle sette del mattino resterebbe un vetro nero su cielo azzurro.
    this._segnaFascia();
    // Se cambia la condizione meteo cambia anche la tinta della pagina.
    const w = this._meteoAdesso();
    const cond = w && this._hass && this._hass.states[w] ? this._hass.states[w].state : "";
    if (cond !== this._lastCond) {
      this._lastCond = cond;
      const app = this.querySelector(".fh-app");
      if (app) app.style.background = this._pageBackground();
    }
    this._updateChips();
    this._aggiornaConsumo();
    this._aggiornaAttenzione();
    this._aggiornaSaluto();
    this._aggiornaAzioni();
  }

  // Quali dispositivi del pannello non rispondono. Nessun elenco scritto a
  // mano (quello di prima aveva gia tre entita che non esistono piu): si
  // guardano le entita che le card delle pagine nominano davvero, cosi un
  // dispositivo aggiunto al pannello e controllato da solo. Si raggruppano per
  // dispositivo — i quattro canali di una ciabatta spenta sono UNA ciabatta,
  // non quattro guasti — e conta solo "unavailable": "unknown" e lo stato
  // normale di un pulsante mai premuto.
  // Nella chip: `entita` per scegliere a mano cosa controllare, `escludi`
  // per i dispositivi da ignorare (li scrive il tasto "Ignora" del foglio).
  _dispositiviOffline(chip) {
    const hass = this._hass;
    if (!hass) return { tutti: 0, offline: [] };
    const c = chip || {};
    const escludi = new Set(Array.isArray(c.escludi) ? c.escludi : []);
    const domini = /^(switch|light|climate|lock|alarm_control_panel|media_player|vacuum|cover|fan|water_heater|humidifier)\./;
    let lista;
    if (Array.isArray(c.entita) && c.entita.length) lista = c.entita;
    else {
      const trovate = new Set();
      const gira = v => {
        if (typeof v === "string") { if (/^[a-z_]+\.[a-z0-9_]+$/.test(v)) trovate.add(v); return; }
        if (Array.isArray(v)) { v.forEach(gira); return; }
        if (v && typeof v === "object") Object.keys(v).forEach(k => gira(v[k]));
      };
      (this._cfg.pages || []).forEach(p => gira(p.rows));
      lista = [...trovate].filter(e => {
        const st = hass.states[e];
        if (!st) return false;
        if (domini.test(e)) return true;
        // Le batterie dicono se un apparecchio a pile (cancelletto, serratura) risponde.
        return e.startsWith("sensor.") && st.attributes.device_class === "battery";
      });
    }
    const reg = hass.entities || {}, dev = hass.devices || {};
    const gruppi = new Map();
    lista.forEach(e => {
      const st = hass.states[e];
      if (!st) return;
      const r = reg[e] || {};
      const chiave = r.device_id || e;
      if (escludi.has(chiave) || escludi.has(e)) return;
      if (!gruppi.has(chiave)) {
        const d = r.device_id && dev[r.device_id];
        gruppi.set(chiave, { chiave, nome: (d && (d.name_by_user || d.name)) || st.attributes.friendly_name || e, giu: [] });
      }
      if (st.state === "unavailable") gruppi.get(chiave).giu.push(e);
    });
    const tutti = [...gruppi.values()];
    return { tutti: tutti.length, offline: tutti.filter(g => g.giu.length) };
  }

  _offlineDa(e) {
    const st = this._hass && this._hass.states[e];
    const t = st ? new Date(st.last_changed).getTime() : NaN;
    if (!isFinite(t)) return "";
    const m = Math.max(1, Math.round((Date.now() - t) / 60000));
    return "non risponde da " + (m < 60 ? m + " min" : m < 2880 ? Math.round(m / 60) + " ore" : Math.round(m / 1440) + " giorni") + " · ";
  }

  // ALLARME DISPOSITIVI. Un dispositivo che non risponde non e sempre un
  // guasto: la presa del presepe a settembre, il tablet spento la notte. E'
  // un'anomalia quando NON RISPONDE ADESSO ma di solito, a quest'ora, si: si
  // guardano gli ultimi 7 giorni alla stessa ora (almeno 3 giorni di storico,
  // online in almeno 4 su 5) e quanto e stato online nella settimana (almeno
  // l'80%). Solo dopo 10 minuti: un riavvio o un Wi-Fi che si riaggancia non
  // sono allarmi. Una volta per episodio: se torna e poi ricade, si riguarda.
  async _controllaAnomalie() {
    const hass = this._hass;
    if (!hass || this._anomalieInCorso || this._edit) return;
    if (document.visibilityState === "hidden") return;
    if (Date.now() - (this._anomalieTs || 0) < 60000) return;
    // Mai sopra un altro foglio (impostazioni, lista della spesa): si riprova fra un minuto.
    if (this.querySelector(".fh-scrim")) return;
    this._anomalieTs = Date.now();
    const chip = this._chipOffline() || {};
    const ora = Date.now();
    const r = this._dispositiviOffline(chip);
    this._anomalieViste = this._anomalieViste || new Map();
    const nuovi = r.offline.map(g => {
      const st = hass.states[g.giu[0]];
      return { g, e: g.giu[0], da: st ? new Date(st.last_changed).getTime() : ora };
    }).filter(x => ora - x.da >= 10 * 60000 && this._anomalieViste.get(x.g.chiave) !== x.da);
    if (!nuovi.length) return;
    this._anomalieInCorso = true;
    try {
      const inizio = ora - 7 * 86400000;
      const res = await hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(inizio).toISOString(), end_time: new Date(ora).toISOString(),
        entity_ids: nuovi.map(x => x.e), minimal_response: true, no_attributes: true,
        significant_changes_only: false,
      });
      const anomalie = [];
      nuovi.forEach(x => {
        this._anomalieViste.set(x.g.chiave, x.da);
        const pts = ((res && res[x.e]) || []).map(p => ({
          t: p.lu !== undefined ? p.lu * 1000 : new Date(p.last_updated || p.last_changed || p.lc).getTime(),
          s: p.s !== undefined ? p.s : p.state,
        })).filter(p => isFinite(p.t)).sort((a, b) => a.t - b.t);
        if (!pts.length) return;
        const statoA = t => { let v = null; for (const p of pts) { if (p.t <= t) v = p.s; else break; } return v; };
        let giorni = 0, online = 0;
        for (let d = 1; d <= 7; d++) {
          const v = statoA(ora - d * 86400000);
          if (v == null) continue;
          giorni++;
          if (v !== "unavailable") online++;
        }
        let tOn = 0, tTot = 0;
        pts.forEach((p, i) => {
          const a = Math.max(p.t, inizio), b = i + 1 < pts.length ? pts[i + 1].t : ora;
          if (b <= a) return;
          tTot += b - a;
          if (p.s !== "unavailable") tOn += b - a;
        });
        const quota = tTot ? tOn / tTot : 0;
        if (giorni >= 3 && online / giorni >= 0.8 && quota >= 0.8) anomalie.push(Object.assign({}, x, { giorni, online, quota }));
      });
      if (anomalie.length && !this.querySelector(".fh-scrim")) this._mostraAnomalie(anomalie);
    } catch (e) {
      console.warn("[faber-home] controllo dispositivi:", e);
    } finally {
      this._anomalieInCorso = false;
    }
  }

  _mostraAnomalie(lista) {
    fhVibra([60, 40, 60]);
    const chip = this._chipOffline();
    const quanto = x => {
      const m = Math.max(10, Math.round((Date.now() - x.da) / 60000));
      return m < 60 ? m + " minuti" : m < 2880 ? Math.round(m / 60) + " ore" : Math.round(m / 1440) + " giorni";
    };
    // Tre o piu insieme: non sono tre guasti, e il Wi-Fi o la corrente.
    const insieme = lista.length >= 3;
    const box = document.createElement("div");
    box.className = "fh-offbody fh-anom";
    box.innerHTML = `<div class="fh-off-head">
        <b>${insieme ? lista.length + " dispositivi hanno smesso di rispondere insieme"
          : lista.length === 1 ? fhEsc(lista[0].g.nome) + " non risponde" : "2 dispositivi non rispondono"}</b>
        <small>${insieme ? "Quando succede a tanti insieme di solito e il Wi-Fi o la corrente: guarda il router e il contatore."
          : "A quest'ora di solito e acceso e collegato: non e normale. Controlla che abbia corrente e Wi-Fi."}</small>
      </div>
      <div class="fh-off-list">${lista.map(x => `<div class="fh-off-item" data-ent="${fhEsc(x.e)}">
          <ha-icon icon="mdi:lan-disconnect"></ha-icon>
          <div class="fh-off-info">
            <span class="fh-off-name">${fhEsc(x.g.nome)}</span>
            <small class="fh-off-id">Non risponde da ${quanto(x)} · a quest'ora era online ${x.online} giorni su ${x.giorni}</small>
          </div>
          ${chip ? `<button type="button" class="fh-off-act" data-ignora="${fhEsc(x.g.chiave)}">Ignora</button>` : ""}
        </div>`).join("")}</div>
      <div class="fh-anom-tasti">
        <button type="button" class="fh-off-act" data-tutti>Tutti i dispositivi</button>
        <button type="button" class="fh-off-act pieno" data-ok>Ho capito</button>
      </div>`;
    const scrim = this._sheet("Anomalia dispositivi", box, false);
    box.querySelectorAll(".fh-off-item[data-ent]").forEach(item => {
      item.onclick = e => {
        if (e.target.closest("button")) return;
        this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: item.dataset.ent } }));
      };
    });
    box.querySelectorAll("[data-ignora]").forEach(b => b.addEventListener("click", async e => {
      e.stopPropagation();
      const c = this._chipOffline();
      if (!c) return;
      const k = b.dataset.ignora;
      c.escludi = (Array.isArray(c.escludi) ? c.escludi : []).filter(x => x !== k).concat([k]);
      this._updateChips();
      await this._save(true);
      b.closest(".fh-off-item").remove();
      if (!box.querySelector(".fh-off-item")) scrim.remove();
    }));
    box.querySelector("[data-ok]").addEventListener("click", () => scrim.remove());
    box.querySelector("[data-tutti]").addEventListener("click", () => this._popupOfflineDispositivi());
  }

  // UN APPARECCHIO NUOVO. Si riconosce da solo: sensore di potenza vero (non
  // un totale, non una stima), con una stanza, senza etichetta e mai scartato.
  // Non si aggiunge da solo: un doppione della stessa presa falserebbe tutto,
  // quindi il pannello chiede una volta sola.
  _nuoviApparecchi() {
    const h = this._hass;
    if (!h) return [];
    const reg = h.entities || {};
    const lab = this._etichettaConsumo();
    const ignora = new Set(((this._cfg.consumo || {}).ignora) || []);
    const finti = new Set(["powercalc", "group", "min_max", "template", "integration", "utility_meter",
      "statistics", "derivative", "filter", "threshold", "trend", "history_stats", "sql", "combine"]);
    return Object.keys(reg).filter(e => {
      if (!e.startsWith("sensor.") || ignora.has(e)) return false;
      const r = reg[e];
      if ((r.labels || []).includes(lab) || r.hidden || r.disabled_by) return false;
      if (finti.has(r.platform)) return false;
      if (/device_power|standby|_apparent|reactive|totale|generale/.test(e)) return false;
      const st = h.states[e];
      if (!st || st.attributes.device_class !== "power" || st.attributes.state_class !== "measurement") return false;
      return !!this._areaEntita(e);
    });
  }

  _controllaNuoviApparecchi() {
    if (!this._hass || this._edit) return;
    if (document.visibilityState === "hidden") return;
    if (Date.now() - (this._nuoviTs || 0) < 300000) return;
    if (this.querySelector(".fh-scrim")) return;
    this._nuoviTs = Date.now();
    const lista = this._nuoviApparecchi();
    if (lista.length) this._mostraNuoviApparecchi(lista);
  }

  _nomeArea(id) {
    const a = ((this._hass && this._hass.areas) || {})[id];
    return (a && a.name) || "";
  }

  _mostraNuoviApparecchi(lista) {
    const h = this._hass;
    const box = document.createElement("div");
    box.className = "fh-offbody";
    const riga = e => {
      const st = h.states[e];
      const r = (h.entities || {})[e] || {};
      const dev = (h.devices || {})[r.device_id] || {};
      const nome = dev.name_by_user || dev.name || (st && st.attributes.friendly_name) || e;
      return `<div class="fh-off-item" data-nuovo="${fhEsc(e)}">
        <ha-icon icon="mdi:flash-outline"></ha-icon>
        <div class="fh-off-info"><span class="fh-off-name">${fhEsc(nome)}</span>
          <small class="fh-off-id">${fhEsc(this._nomeArea(this._areaEntita(e)) || "senza stanza")} · ${fhEsc(e)}</small></div>
        <button type="button" class="fh-off-act pieno" data-aggiungi="${fhEsc(e)}">Aggiungi</button>
        <button type="button" class="fh-off-act" data-scarta="${fhEsc(e)}">No</button></div>`;
    };
    box.innerHTML = `<div class="fh-off-head">
        <b>${lista.length === 1 ? "Un apparecchio nuovo misura il consumo" : lista.length + " apparecchi nuovi misurano il consumo"}</b>
        <small>Se lo aggiungo entra da solo nel consumo della sua stanza, nel totale di casa e nelle statistiche.
        Se invece e un doppione o una stima, tocca <b>No</b> e non te lo chiedo piu.</small>
      </div>
      <div class="fh-off-list">${lista.slice(0, 6).map(riga).join("")}</div>`;
    const scrim = this._sheet("Apparecchi nuovi", box, false);
    const togli = e => {
      const it = box.querySelector(`[data-nuovo="${e}"]`);
      if (it) it.remove();
      if (!box.querySelector("[data-nuovo]")) scrim.remove();
    };
    box.querySelectorAll("[data-aggiungi]").forEach(b => b.addEventListener("click", async () => {
      const e = b.dataset.aggiungi;
      b.textContent = "…";
      const fatto = await this._aggiungiAiConsumi(e);
      b.textContent = fatto ? "Fatto ✓" : "Errore";
      setTimeout(() => togli(e), 900);
    }));
    box.querySelectorAll("[data-scarta]").forEach(b => b.addEventListener("click", async () => {
      const e = b.dataset.scarta;
      this._cfg.consumo = this._cfg.consumo || {};
      this._cfg.consumo.ignora = ((this._cfg.consumo.ignora) || []).concat([e]);
      await this._save(true);
      togli(e);
    }));
  }

  // Mette l'etichetta e, se l'apparecchio ha anche il contatore dei kWh,
  // lo aggiunge alle statistiche Energia di Home Assistant.
  async _aggiungiAiConsumi(e) {
    const h = this._hass;
    try {
      const r = (h.entities || {})[e] || {};
      const lab = this._etichettaConsumo();
      await h.callWS({ type: "config/entity_registry/update", entity_id: e,
        labels: [...new Set([...(r.labels || []), lab])] });
      await this._aggiungiEnergia(e);
      this._updateLive();
      this._renderPage();
      return true;
    } catch (err) {
      console.warn("[faber-home] aggiunta ai consumi:", err);
      return false;
    }
  }

  async _aggiungiEnergia(e) {
    const h = this._hass;
    const reg = h.entities || {};
    const dev = (reg[e] || {}).device_id;
    if (!dev) return "";
    const kwh = Object.keys(reg).find(x => {
      if (!x.startsWith("sensor.") || reg[x].device_id !== dev) return false;
      const st = h.states[x];
      return !!st && st.attributes.device_class === "energy" &&
        ["total", "total_increasing"].includes(st.attributes.state_class);
    });
    if (!kwh) return "";
    const prefs = await h.callWS({ type: "energy/get_prefs" });
    const lista = (prefs && prefs.device_consumption) || [];
    if (lista.some(d => d.stat_consumption === kwh)) return "";
    const st = h.states[e];
    const d = (h.devices || {})[dev] || {};
    lista.push({ stat_consumption: kwh, name: d.name_by_user || d.name || (st && st.attributes.friendly_name) || kwh });
    await h.callWS({ type: "energy/save_prefs", device_consumption: lista });
    return kwh;
  }

  _chipOffline() {
    return ((this._cfg.header || {}).chips || []).find(c => c.tipo === "dispositivi" || c.tipo === "offline") || null;
  }

  _popupOfflineDispositivi() {
    const hass = this._hass;
    if (!hass) return;
    const chip = this._chipOffline() || {};
    const r = this._dispositiviOffline(chip);
    const offline = r.offline;
    const ignorati = Array.isArray(chip.escludi) ? chip.escludi : [];
    const box = document.createElement("div");
    box.className = "fh-offbody";
    const nomeDi = k => {
      const d = (hass.devices || {})[k];
      if (d) return d.name_by_user || d.name || k;
      const st = hass.states[k];
      return (st && st.attributes.friendly_name) || k;
    };
    box.innerHTML = (!offline.length ? `<div class="fh-off-allgood">
        <ha-icon icon="mdi:check-decagram"></ha-icon>
        <b>Tutti i dispositivi rispondono</b>
        <small>Controllati ${r.tutti} dispositivi, quelli che compaiono nelle card del pannello.</small>
      </div>` : `<div class="fh-off-head">
        <b>${offline.length} ${offline.length === 1 ? "dispositivo non raggiungibile" : "dispositivi non raggiungibili"}</b>
        <small>Su ${r.tutti} controllati. Verifica alimentazione o rete; se uno e staccato per scelta, <b>Ignora</b> lo toglie dal conto.</small>
      </div>
      <div class="fh-off-list">
        ${offline.map(g => `<div class="fh-off-item" data-ent="${fhEsc(g.giu[0])}">
            <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
            <div class="fh-off-info">
              <span class="fh-off-name">${fhEsc(g.nome)}</span>
              <small class="fh-off-id">${fhEsc(this._offlineDa(g.giu[0]))}${fhEsc(g.giu.join(", "))}</small>
            </div>
            <button type="button" class="fh-off-act" data-ignora="${fhEsc(g.chiave)}">Ignora</button>
          </div>`).join("")}
      </div>`) + (ignorati.length ? `
      <div class="fh-off-head" style="margin-top:6px"><small>Ignorati (${ignorati.length})</small></div>
      <div class="fh-off-list">
        ${ignorati.map(k => `<div class="fh-off-item ignorato">
            <ha-icon icon="mdi:eye-off-outline"></ha-icon>
            <div class="fh-off-info"><span class="fh-off-name">${fhEsc(nomeDi(k))}</span></div>
            <button type="button" class="fh-off-act" data-ripristina="${fhEsc(k)}">Ripristina</button>
          </div>`).join("")}
      </div>` : "");
    box.querySelectorAll(".fh-off-item[data-ent]").forEach(item => {
      item.onclick = () => this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true, composed: true, detail: { entityId: item.dataset.ent } }));
    });
    // Ignorare e ripristinare cambiano la configurazione del pannello: si
    // salva subito, perche la chip non ha un tasto Salva suo.
    const cambia = async (fn) => {
      const c = this._chipOffline();
      if (!c) return;
      c.escludi = fn(Array.isArray(c.escludi) ? c.escludi.slice() : []);
      if (!c.escludi.length) delete c.escludi;
      this._updateChips();
      await this._save(true);
      this._popupOfflineDispositivi();
    };
    box.querySelectorAll("[data-ignora]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const k = b.dataset.ignora;
      cambia(l => l.includes(k) ? l : l.concat([k]));
    }));
    box.querySelectorAll("[data-ripristina]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const k = b.dataset.ripristina;
      cambia(l => l.filter(x => x !== k));
    }));
    this._sheet("Stato dispositivi", box, false);
  }

  _wireChips() {
    this.querySelectorAll("[data-chip-offline]").forEach(btn => {
      btn.onclick = () => this._popupOfflineDispositivi();
    });
    this.querySelectorAll("[data-chip-spesa]").forEach(btn => {
      btn.onclick = () => {
        fhVibra(8);
        const app = this.querySelector(".fh-app");
        if (window.fhOpenSpesaModal) window.fhOpenSpesaModal(this._hass,
          btn.dataset.chipSpesa || "todo.shopping_list", { chiaro: !!(app && app.classList.contains("chiaro")) });
      };
    });
    this.querySelectorAll("[data-chip-autoclave]").forEach(btn => {
      btn.onclick = () => this._toccoChip(btn, btn.dataset.chipAutoclave || "switch.power");
    });
    this.querySelectorAll("[data-chip-link]").forEach(btn => {
      btn.onclick = () => {
        const u = btn.dataset.chipLink;
        if (!u) return;
        // Un indirizzo di casa resta dentro Home Assistant; uno di fuori si
        // apre in una scheda nuova, senza portarsi via il pannello.
        if (u.startsWith("/")) {
          history.pushState(null, "", u);
          window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
        } else window.open(u, "_blank", "noopener");
      };
    });
    this.querySelectorAll("[data-chip-page]").forEach(btn => {
      btn.onclick = () => {
        const i = this._cfg.pages.findIndex(p => p.id === btn.dataset.chipPage);
        if (i >= 0) this._vaiPagina(i);
      };
    });
    this.querySelectorAll("[data-chip-entity]").forEach(btn => {
      btn.onclick = () => this._toccoChip(btn, btn.dataset.chipEntity);
    });
  }

  // COSA FA UN CHIP AL TOCCO. Prima un tocco sul chip Porta apriva la
  // serratura della blindata e uno sull'Autoclave spegneva la pompa: il chip
  // sta in una riga che si scorre col dito, e un tocco sbagliato e facile.
  // Ora di serie mostra le informazioni; comandare si sceglie in Impostazioni
  // (Chip > Al tocco), e la serratura chiede comunque conferma.
  // CONSUMI E DOMANDE DA UNA CHIP.
  // Il foglio con lo storico e l'intervista e quello della Mini Card: invece
  // di riscriverlo qui (e di ritrovarsi due versioni che divergono), si
  // costruisce una Mini Card fuori dallo schermo e le si chiede di aprire il
  // suo foglio. Se la Mini Card non e installata si ripiega sulle
  // informazioni di Home Assistant, senza lasciare la chip morta.
  _apriConsumi(btn, ent) {
    const MC = customElements.get("mini-card");
    const h = this._hass;
    if (!MC || !h) {
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: ent } }));
      return;
    }
    const st = h.states[ent];
    const nome = btn.dataset.nome || (st && st.attributes.friendly_name) || ent;
    const potenza = btn.dataset.power || this._potenzaDi(ent);
    if (!this._mcOspite) {
      const el = document.createElement("mini-card");
      // Fuori dallo schermo ma DISEGNATA: con display:none il suo foglio,
      // che e figlio della card, non comparirebbe.
      // Sopra a tutto: il pannello Faber Home ha le sue sovrapposizioni, e
      // senza questo le chip restavano disegnate DAVANTI al foglio.
      el.style.cssText = "position:fixed;left:-10000px;top:0;width:220px;z-index:2147483000";
      // DENTRO il pannello, non nel corpo della pagina: Faber Home veste gia
      // il foglio della Mini Card per il giorno (.fh-app.vetro.chiaro .mc-modal
      // e compagnia). Appeso fuori, quelle regole non lo raggiungevano e
      // restava notte in pieno giorno.
      (this.querySelector(".fh-app") || document.body).appendChild(el);
      this._mcOspite = el;
    }
    const el = this._mcOspite;
    const cfg = { type: "custom:mini-card", name: nome, power: potenza || "" };
    const dom = ent.split(".")[0];
    if (["switch", "light", "input_boolean", "fan"].includes(dom)) cfg.switch = ent;
    el.setConfig(cfg);
    el.hass = h;
    // Il tema lo eredita da se: stando dentro .fh-app, la Mini Card trova il
    // pannello con closest() e si mette in chiaro quando e giorno.
    const chiaro = !!this.querySelector(".fh-app.chiaro");
    if (el._openImmersive) el._openImmersive();
    // Il velo invece resta scoperto: Faber Home non ha una regola per
    // .mc-scrim, e sopra il pannello a schermo intero il 62% di suo lasciava
    // vedere tutto. Lo copriamo noi, del colore dell'ora.
    const velo = el.querySelector(".mc-scrim");
    if (velo) {
      velo.style.background = chiaro ? "rgba(226,234,241,.95)" : "rgba(6,8,12,.95)";
      velo.style.backdropFilter = "blur(14px)";
      velo.style.webkitBackdropFilter = "blur(14px)";
    }
  }

  // Il sensore di potenza di un'entita: quello del suo stesso dispositivo.
  _potenzaDi(ent) {
    const h = this._hass;
    const reg = (h && h.entities) || {};
    const dev = (reg[ent] || {}).device_id;
    if (!dev) return "";
    return Object.keys(reg).find(e => e.startsWith("sensor.") && reg[e].device_id === dev &&
      h.states[e] && h.states[e].attributes.device_class === "power" &&
      h.states[e].attributes.state_class === "measurement") || "";
  }

  _toccoChip(btn, ent) {
    const h = this._hass;
    if (!ent || !h) return;
    const tocco = btn.dataset.tocco || "info";
    if (tocco === "nulla") return;
    fhVibra(8);
    if (tocco === "pagina") {
      const i = this._cfg.pages.findIndex(p => p.id === btn.dataset.vai);
      if (i >= 0) this._vaiPagina(i);
      return;
    }
    const st = h.states[ent];
    const dom = ent.split(".")[0];
    if (tocco === "consumi") { this._apriConsumi(btn, ent); return; }
    const comandabile = ["switch", "light", "fan", "input_boolean", "automation", "lock", "cover"].includes(dom);
    if (tocco !== "comando" || !st || !comandabile) {
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: ent } }));
      return;
    }
    const nome = (st.attributes && st.attributes.friendly_name) || ent;
    if (dom === "lock") {
      const apre = st.state === "locked";
      const fai = () => h.callService("lock", apre ? "unlock" : "lock", { entity_id: ent });
      if (window.fhConfirmAction) window.fhConfirmAction({ title: apre ? "Sbloccare " + nome + "?" : "Bloccare " + nome + "?",
        message: apre ? "La serratura si apre." : "La serratura si chiude.", icon: apre ? "mdi:lock-open-variant-outline" : "mdi:lock-outline",
        confirmText: apre ? "Sblocca" : "Blocca", cancelText: "Annulla",
        chiaro: !!this.querySelector(".fh-app.chiaro"), onConfirm: fai });
      return;
    }
    if (dom === "cover") { h.callService("cover", "toggle", { entity_id: ent }); return; }
    h.callService(dom, "toggle", { entity_id: ent });
  }
}

const FH_CSS = `
  /* NIENTE container-type qui. Un elemento con container-type diventa il
     riferimento per i position:fixed di TUTTI i suoi discendenti: le finestre
     a schermo intero delle card dentro (l'archivio dei mesi, i popup, il
     pannello del timer) restavano imprigionate in questo riquadro invece di
     coprire lo schermo. Misurato: velo 1270x551 dentro una finestra 1280x551.
     La larghezza la misuriamo gia in JavaScript, quindi la fascia diventa una
     classe su questo elemento e le regole guardano quella. */
  /* hidden e solo un display:none del browser: una regola di classe con un
     display: proprio lo batte, e il riquadro che il codice crede nascosto
     resta visibile (successo con il riquadro della porta dentro le card
     dell'allarme e delle telecamere). Qui glielo restituiamo. */
  .fh-app [hidden]{display:none!important}
  .fh-app{
    position:relative;min-height:100vh;display:flex;flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    color:var(--fh-ink,#eaf1f8);transition:background .6s ease,color .6s ease}
  /* FISSO ALLO SCHERMO, non steso su tutta la pagina. Con "absolute" il
     canvas prendeva l'altezza dell'INTERO contenuto: su una pagina lunga
     diventava alto migliaia di pixel, le stelle finivano sparse per tutta la
     lunghezza e nella schermata che stai guardando non ne capitava quasi
     nessuna. Fisso invece copre esattamente lo schermo: le stelle restano
     dove sono mentre scorri, come un cielo vero dietro una finestra, e il
     canvas resta piccolo (meno lavoro per il telefono). */
  .fh-bg{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .fh-head{position:relative;z-index:1;display:flex;flex-direction:column;gap:10px;padding:18px 20px 8px}
  .fh-headtop{display:flex;align-items:flex-start;gap:14px}
  .fh-clockbox{flex:1;min-width:0}
  /* Il saluto: due righe al massimo, tono sommesso. Non deve rubare la scena
     all'orologio, deve solo essere li quando lo guardi. */
  .fh-saluto{margin:8px 0 2px;font-size:12.5px;font-weight:600;line-height:1.4;color:var(--fh-muted,#93a1b0);
    display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .fh-clock{font-size:clamp(34px,9vw,52px);font-weight:800;line-height:1;letter-spacing:-.02em;
    font-variant-numeric:tabular-nums}
  .fh-date{margin-top:4px;font-size:12.5px;font-weight:600;color:var(--fh-muted,#93a1b0);text-transform:capitalize}
  /* Una riga sola che scorre: andando a capo i chip mangiavano meta schermo
     sul telefono, e il primo finiva sotto le icone in alto a destra. */
  .fh-chips{display:flex;flex-wrap:nowrap;gap:7px;align-items:center;min-width:0;
    overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none;
    padding-bottom:2px;-webkit-overflow-scrolling:touch;
    /* Il dito si ferma dove vuole, ma non trascina la pagina sotto; e ai bordi
       le chip sfumano invece di essere tagliate di netto. */
    overscroll-behavior-x:contain;scroll-snap-type:x proximity;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 14px,#000 calc(100% - 22px),transparent 100%);
    mask-image:linear-gradient(90deg,transparent 0,#000 14px,#000 calc(100% - 22px),transparent 100%)}
  .fh-chips > *{scroll-snap-align:center}
  .fh-chips::-webkit-scrollbar{display:none}
  .fh-chips > *{flex:0 0 auto}
  .fh-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;cursor:pointer;
    font:inherit;font-size:12.5px;font-weight:700;color:var(--fh-muted,#93a1b0);
    border:1px solid var(--fh-stroke,rgba(255,255,255,.09));background:var(--fh-panel,rgba(255,255,255,.05));
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:.2s}
  .fh-chip ha-icon{--mdc-icon-size:16px}
  .fh-chip small{opacity:.75;font-weight:600}
  .fh-chip.on{color:var(--fh-c-soft,#ffe9c2);border-color:rgba(255,176,32,.5);
    background:linear-gradient(135deg,rgba(255,176,32,.26),rgba(255,176,32,.12))}
  .fh-headicons{display:flex;gap:6px;flex:0 0 auto}
  /* Il puntino ambra sul tasto del tema: c'e solo quando il tema e bloccato
     su giorno o su notte. Senza, il pannello che non si scurisce la sera
     sembrava un difetto, e invece era una scelta rimasta li da un tocco. */
  .fh-ic[data-tema]{position:relative}
  .fh-ic[data-tema="giorno"]::after,
  .fh-ic[data-tema="notte"]::after{content:"";position:absolute;top:1px;right:1px;
    width:8px;height:8px;border-radius:50%;background:var(--fh-c-acc,#ffb020);
    box-shadow:0 0 0 2px var(--fh-panel,rgba(20,26,40,.9))}
  .fh-ic{width:36px;height:36px;border-radius:50%;border:1px solid var(--fh-stroke,rgba(255,255,255,.09));
    background:var(--fh-panel,rgba(255,255,255,.05));color:var(--fh-muted,#93a1b0);cursor:pointer;display:flex;align-items:center;justify-content:center}
  .fh-ic ha-icon{--mdc-icon-size:19px}
  /* Niente z-index qui: dandogliene uno, questo contenitore diventa un
     "mondo" a se e ci imprigiona dentro i popup delle card (che hanno
     priorita 9). Risultato: la barra in basso, che sta fuori, ci finiva
     sopra. Senza z-index il popup di una card compete davvero con la barra
     e le passa davanti, come deve. */
  /* Nessuna card puo allargare la pagina oltre lo schermo: se una ha dentro
     qualcosa che non si stringe, si stringe lei. Senza questi limiti bastava
     un contenuto rigido a rendere tutta la pagina piu larga del telefono, e
     si vedevano le card tagliate a destra. */
  .fh-app{max-width:100%;overflow-x:hidden}
  .fh-main.editing{padding-top:74px}
  /* Lo spazio sotto NON e un numero fisso: e l'altezza vera della barra,
     misurata e scritta in --fh-navh (vedi _misuraNav). Con un numero fisso
     l'ultima card finiva sotto la barra proprio sul telefono, perche la barra
     si aggiunge il bordo inferiore dello schermo (env(safe-area-inset-bottom))
     mentre il contenuto no: bastavano quei venti pixel di troppo. E se un
     giorno le pagine diventano tante e la barra va a capo, il conto si
     aggiusta da solo invece di scoprire di nuovo lo stesso difetto. */
  .fh-main{position:relative;flex:1;max-width:100%;display:flex;flex-direction:column;gap:14px;
    padding:8px 16px calc(var(--fh-navh,110px) + 18px)}
  /* Su schermo grande il contenuto si ferma e si centra. */
  .fh-app.desk .fh-main,
  .fh-app.desk .fh-head{width:100%;max-width:var(--fh-largh,1240px);margin-inline:auto}
  .fh-cardwrap{min-width:0;max-width:100%}
  .fh-rowwrap{min-width:0;max-width:100%}
  /* La riga e una griglia con un numero di tracce deciso dalla fascia di
     larghezza (--fh-n, scritto dal JS). Prima era un flex con min-width 240px
     per colonna: sul telefono nessuna colonna ci stava accanto a un'altra e
     tutto finiva impilato, senza possibilita di scelta. */
  /* stretch, non start: due card affiancate devono finire alla stessa
     altezza, senno la riga resta sfalsata e sotto si vede il buco. */
  .fh-row{display:grid;grid-template-columns:repeat(var(--fh-n,1),minmax(0,1fr));
    gap:14px;align-items:stretch}
  .fh-col{display:flex;flex-direction:column;gap:14px;min-width:0}
  /* L'alloggiamento della card: qui vive l'altezza scelta. Con un'altezza
     fissa la card dentro deve riempirlo tutto, altrimenti resta appesa in
     alto dentro un riquadro vuoto. */
  /* Le card di una colonna si dividono l'altezza della riga: cosi quelle
     affiancate combaciano invece di sfalsarsi. */
  .fh-slot{display:flex;flex-direction:column;min-width:0;position:relative;flex:1 1 auto}
  /* display:contents fa sparire la colonna come scatola: le card diventano
     elementi della griglia della riga, e allora quelle affiancate stanno
     davvero sulla stessa linea invece di essere due pile indipendenti. */
  .fh-row.piatta>.fh-col{display:contents}
  /* In griglia lo slot non e piu un elemento flessibile dentro una colonna:
     deve riempire la cella, senno le card della stessa riga finiscono di
     altezze diverse. */
  .fh-row.piatta>.fh-col>.fh-slot{height:100%}
  /* L'altezza scelta e un MINIMO, non un tetto. Prima era un'altezza fissa con
     overflow nascosto: il contenuto che non ci stava veniva tagliato, in alto
     e ai lati, e non c'era modo di recuperarlo. Un contenuto non si taglia:
     o si adatta, o la card cresce. */
  .fh-slot.fissa{min-height:var(--fh-h,auto)}
  /* Quadrata davvero: alta quanto e larga, su qualunque schermo. */
  .fh-slot.quadra{width:100%;aspect-ratio:1 / 1 !important;height:auto;min-height:0;
    max-width:min(100%,var(--fh-quadra,340px));margin-inline:auto;align-self:start;
    display:flex;flex-direction:column}
  .fh-slot.quadra.editing{aspect-ratio:auto !important}
  .fh-slot.quadra{border-radius:24px}
  .fh-slot.quadra>*:not(.fh-tools):not(.fh-shield):not(.fh-ang){
    display:flex;flex-direction:column;height:100%!important;width:100%!important;
    min-height:0!important;box-sizing:border-box;border-radius:24px}
  .fh-slot.quadra ha-card{height:100%!important;width:100%!important;min-height:0!important;
    aspect-ratio:1 / 1!important;box-sizing:border-box;border-radius:24px!important;overflow:hidden!important}
  /* LE TESSERE FABER DENTRO IL QUADRATO. Rifiuti, Automazioni, Cancello,
     Spesa, Robot e compagnia sono costruite sopra .fht, che ha un'altezza
     minima di 142px e cresce col testo: dentro un riquadro quadrato restava
     della sua altezza e il quadrato non si chiudeva mai (Cristian: "se metto
     quadrata non si fanno quadrate"). Qui .fht riempie il riquadro, e il suo
     contenuto si stringe in proporzione invece di sfondarlo. Le misure sono
     in percentuale del lato: a mezza riga sul telefono (~165px) o larghe come
     la pagina, la tessera resta la stessa cosa, solo piu piccola. */
  .fh-slot.quadra .fht{height:100%!important;width:100%!important;min-height:0!important;
    box-sizing:border-box!important;overflow:hidden!important;
    padding:clamp(9px,7%,16px)!important;gap:clamp(3px,2%,6px)!important;justify-content:space-between!important}
  /* Le misure si prendono dal LATO della card, non dalla pagina: la stessa
     tessera a mezza riga sul telefono o larga su un monitor resta se stessa,
     solo piu piccola o piu grande. Le percentuali normali non andavano bene:
     in altezza si riferiscono a una scatola che non ha un'altezza propria, e
     il browser le butta via. Qui la scatola e la card (container-type) e le
     misure sono in cqw, centesimi del suo lato.
     Prima di ogni regola in cqw ce n'e una in pixel: se un telefono vecchio
     non capisce le container query, la tessera resta comunque leggibile. */
  .fh-slot.quadra{container-type:inline-size}
  .fh-slot.quadra .fht-ic{width:54px;height:54px;border-radius:17px!important}
  .fh-slot.quadra .fht-ic{width:clamp(38px,31cqw,88px)!important;height:auto!important;
    aspect-ratio:1!important;border-radius:26%!important}
  .fh-slot.quadra .fht-ic ha-icon{--mdc-icon-size:30px}
  .fh-slot.quadra .fht-ic ha-icon{--mdc-icon-size:clamp(21px,18cqw,50px)}
  .fh-slot.quadra .fht-pill{padding:3px 8px!important;font-size:10px}
  .fh-slot.quadra .fht-pill{font-size:clamp(8.5px,5.2cqw,12px)}
  .fh-slot.quadra .fht-testo{min-height:0!important;gap:1px!important}
  .fh-slot.quadra .fht-title{font-size:clamp(12px,8.2cqw,17px)!important}
  .fh-slot.quadra .fht-stato{font-size:clamp(10.5px,7.2cqw,14px)!important}
  .fh-slot.quadra .fht-sub{font-size:clamp(9px,6.2cqw,12px)!important;-webkit-line-clamp:2}
  .fh-slot.quadra .fht-btns{margin-top:clamp(4px,3cqw,10px)!important}
  .fh-slot.quadra .fht-btn{padding:clamp(5px,4cqw,10px) 4px!important;font-size:clamp(9.5px,6.2cqw,13px)!important;
    border-radius:clamp(9px,7cqw,15px)!important}
  .fh-slot.quadra .fht-btn ha-icon{--mdc-icon-size:clamp(14px,10cqw,20px)!important}
  .fh-slot.quadra .fp{aspect-ratio:1 / 1!important;height:100%!important;width:100%!important;
    box-sizing:border-box!important;display:flex!important;flex-direction:column!important;border-radius:24px!important;overflow:hidden!important}
  .fh-slot.quadra .fp-body{height:100%!important;width:100%!important;min-height:0!important;box-sizing:border-box!important;
    padding:10px 8px 8px!important;display:flex!important;flex-direction:column!important;align-items:center!important;
    justify-content:space-evenly!important;text-align:center!important;gap:2px!important;overflow:hidden!important}
  .fh-slot.quadra .fp-body.fianco{flex-direction:row!important;align-items:center!important;justify-content:center!important;
    text-align:left!important;gap:8px!important;padding:10px!important}
  .fh-slot.quadra .fp-avatar{width:clamp(48px,34%,80px)!important;height:auto!important;aspect-ratio:1!important;
    flex:0 0 auto!important;margin:0 auto!important}
  .fh-slot.quadra .fp-body.fianco .fp-avatar{width:clamp(46px,34%,72px)!important;margin:0!important}
  .fh-slot.quadra .fp-testo{flex:0 1 auto!important;min-width:0!important;width:100%!important;display:flex!important;
    flex-direction:column!important;align-items:center!important;gap:1px!important}
  .fh-slot.quadra .fp-body.fianco .fp-testo{align-items:flex-start!important}
  .fh-slot.quadra .fp-nome{font-size:clamp(12.5px,3.6vw,15.5px)!important;font-weight:800!important;line-height:1.15!important;
    text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:100%!important}
  .fh-slot.quadra .fp-body.fianco .fp-nome{text-align:left!important}
  .fh-slot.quadra .fp-stato{font-size:clamp(9px,2.4vw,10.5px)!important;font-weight:800!important;line-height:1.15!important;
    text-align:center!important;margin-top:1px!important;letter-spacing:.06em!important}
  .fh-slot.quadra .fp-body.fianco .fp-stato{text-align:left!important}
  .fh-slot.quadra .fp-da{font-size:clamp(8.5px,2.2vw,9.5px)!important;font-weight:600!important;line-height:1.15!important;
    opacity:.6!important;text-align:center!important}
  .fh-slot.quadra .fp-body.fianco .fp-da{text-align:left!important}
  .fh-slot.quadra .fp-bat{font-size:clamp(9px,2.4vw,10.5px)!important;font-weight:800!important;margin-top:2px!important;
    display:flex!important;align-items:center!important;justify-content:center!important;gap:4px!important}
  .fh-slot.quadra .fp-bguscio{width:26px!important;height:9px!important;padding:1px!important}
  .fh-slot.quadra .fp-bguscio::after{width:2px!important;height:3px!important;right:-3px!important;top:2px!important}
  .fh-slot.quadra .fp-righe{margin-top:2px!important;gap:1px!important}
  .fh-slot.quadra .fp-righe span{font-size:9px!important;gap:3px!important}
  .fh-slot.quadra .fp-righe ha-icon{--mdc-icon-size:11px!important}
  .fh-slot>.fh-cardwrap{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
  .fh-slot>.fh-cardwrap>*{flex:1 1 auto;min-height:100%;box-sizing:border-box}
  .fh-slot.editing.fissa>.fh-cardwrap{flex:1}
  /* trascinamento */
  .fh-grip{width:30px;height:30px;border-radius:9px;cursor:grab;touch-action:none;flex:0 0 auto;
    display:flex;align-items:center;justify-content:center;
    border:1px solid rgba(255,176,32,.45);background:rgba(255,176,32,.14);color:var(--fh-c-acc,#ffb020)}
  .fh-grip:active{cursor:grabbing}
  .fh-grip ha-icon{--mdc-icon-size:17px}
  .fh-menu{position:relative;flex:0 0 auto}
  /* Fondo scritto qui e non preso dal tema: con il vetro attivo
     --ha-card-background e semitrasparente, e il menu si leggeva sopra la
     card che stava coprendo — le voci si mescolavano al contenuto sotto. */
  .fh-menupop{position:absolute;right:0;top:34px;z-index:30;min-width:196px;max-width:calc(100vw - 20px);padding:6px;
    border-radius:16px;border:1px solid rgba(255,255,255,.16);
    background:#171b22!important;color:#eaf1f8!important;
    box-shadow:0 18px 44px rgba(0,0,0,.6)}
  .fh-app.vetro.chiaro .fh-menupop,
  .fh-app.chiaro .fh-menupop{background:#ffffff!important;color:#12161c!important;
    border-color:rgba(15,23,42,.14);box-shadow:0 18px 44px rgba(15,23,42,.22)}
  .fh-app.vetro.chiaro .fh-mi,
  .fh-app.chiaro .fh-mi{color:#12161c}
  .fh-app.vetro.chiaro .fh-milab,
  .fh-app.chiaro .fh-milab{color:#4b5563}
  .fh-app.vetro.chiaro .fh-misep,
  .fh-app.chiaro .fh-misep{background:rgba(15,23,42,.12)}
  .fh-mi{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border-radius:9px;
    border:none;background:none;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;
    text-align:left;color:inherit}
  .fh-mi ha-icon{--mdc-icon-size:16px;flex:0 0 auto;opacity:.75}
  .fh-mi:hover{background:rgba(255,176,32,.14)}
  .fh-mi.rosso{color:#ff8f8f}
  .fh-app.vetro.chiaro .fh-mi.rosso,
  .fh-app.chiaro .fh-mi.rosso{color:#b91c1c!important}
  .fh-mi.rosso:hover{background:rgba(255,92,92,.14)}
  .fh-misep{height:1px;margin:4px 6px;background:var(--divider-color,rgba(255,255,255,.1))}
  .fh-milab{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;
    opacity:.5;padding:5px 10px 2px}
  .fh-hsel{height:30px;border-radius:9px;font:inherit;font-size:11px;font-weight:700;padding:0 4px;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:var(--fh-panel,rgba(255,255,255,.06));
    color:var(--fh-muted,#93a1b0);cursor:pointer;max-width:104px}
  .fh-ghost{position:fixed;z-index:60;pointer-events:none;opacity:.85;transform:rotate(-1.5deg);
    box-shadow:0 18px 44px rgba(0,0,0,.5);border-radius:18px;overflow:hidden}
  .fh-ghost .fh-tools,.fh-ghost .fh-shield{display:none}
  /* VETRO — le card lasciano vedere il cielo che scorre dietro.
     La strada e la variabile --ha-card-background: le variabili CSS passano
     attraverso lo shadow DOM, quindi tinge anche le card di Home Assistant,
     che altrimenti sarebbero irraggiungibili dal CSS di questo pannello. Il
     backdrop-filter invece si puo mettere solo sulle card che stanno alla
     luce del sole (le nostre), e la sfocatura e proprio cio che rende il
     vetro "vetro" invece che semplice trasparenza. */
  /* Solo dentro .fh-main, non su tutto .fh-app: il foglio delle Impostazioni
     e un FRATELLO di .fh-main (lo stesso codice lo appende dentro .fh-app,
     non dentro .fh-main), ed e disegnato apposta con le vere variabili di
     Home Assistant, non con le nostre — altrimenti i suoi controlli
     diventerebbero illeggibili. Tingendo qui .fh-app intero, quel foglio
     ereditava il vetro chiaro e finiva quasi bianco su quasi bianco. Fermando
     la tinta a .fh-main, il foglio la scavalca del tutto e resta con il tema
     vero sotto, com'era pensato fin dall'inizio. */
  .fh-app.vetro{
    --ha-card-border-color:var(--fh-card-border)!important;
  }
  .fh-app.vetro .fh-main{
    --ha-card-background:var(--fh-card-bg)!important;
    --card-background-color:var(--fh-card-bg)!important;
    --ha-card-border-color:var(--fh-card-border)!important;
    --ha-card-box-shadow:0 8px 26px rgba(0,0,0,.25);
  }
  .fh-app.vetro ha-card,
  .fh-app.vetro .fh-slot ha-card,
  .fh-app.vetro .fh-cardwrap ha-card{
    background:var(--fh-card-bg)!important;
    background-color:var(--fh-card-bg)!important;
    backdrop-filter:blur(var(--fh-card-blur, 16px)) saturate(1.25)!important;
    -webkit-backdrop-filter:blur(var(--fh-card-blur, 16px)) saturate(1.25)!important;
    border-color:var(--fh-card-border)!important;
    border-radius:24px!important;
  }
  .fh-range{width:100%;accent-color:var(--fh-acc,#ffb020);height:26px}
  .fh-rangeval{font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;
    text-align:right;padding-top:4px;color:var(--fh-ink)}
  .fh-app.vetro .mc{--mc-panel:var(--fh-card-bg)!important}
  .fh-app.vetro .eca{--eca-panel:var(--fh-card-bg)!important;--eca-solid:rgba(22,28,38,.92)!important}
  .fh-app.vetro .csc{--csc-panel:var(--fh-card-bg)!important}
  .fh-app.vetro .cbc{--cbc-panel:var(--fh-card-bg)!important}
  .fh-app.vetro .cec{--cec-panel:var(--fh-card-bg)!important}
  .fh-app.vetro .sc,
  .fh-app.vetro .sc-card,
  .fh-app.vetro .smart-card,
  .fh-app.vetro .fpc,
  .fh-app.vetro .fpers,
  .fh-app.vetro .fc,
  .fh-app.vetro .fk,
  .fh-app.vetro .fp,
  .fh-app.vetro .pc,
  .fh-app.vetro .fm,
  .fh-app.vetro .mc-card,
  .fh-app.vetro .csc-card,
  .fh-app.vetro .csc-alarm,
  .fh-app.vetro .cbc-machine,
  .fh-app.vetro .cec-machine,
  .fh-app.vetro .eca-panel,
  .fh-app.vetro .eca-day{
    background:var(--fh-card-bg)!important;
    background-color:var(--fh-card-bg)!important;
    border-color:var(--fh-card-border)!important;
    backdrop-filter:blur(var(--fh-card-blur, 16px)) saturate(1.25)!important;
    -webkit-backdrop-filter:blur(var(--fh-card-blur, 16px)) saturate(1.25)!important;
  }
  /* La card METEO in modalita vetro: mantiene la tinta del tempo ma diventa
     semitrasparente e sfocata, lasciando intravedere il cielo animato */
  .fh-app.vetro .fw{
    background:linear-gradient(150deg,
      color-mix(in srgb,var(--fw-a) 25%,var(--fh-card-bg)),
      color-mix(in srgb,var(--fw-b) 25%,var(--fh-card-bg)))!important;
    backdrop-filter:blur(var(--fh-card-blur, 16px)) saturate(1.25)!important;
    -webkit-backdrop-filter:blur(var(--fh-card-blur, 16px)) saturate(1.25)!important;
    border:1px solid var(--fh-card-border)!important;
  }
  .fh-app.vetro.chiaro .fw{color:var(--fh-ink,#12161c)!important}
  .fh-app.vetro.chiaro .fw-stat,
  .fh-app.vetro.chiaro .fw-next{background:rgba(15,23,42,.06)!important;color:var(--fh-ink,#12161c)!important}
  .fh-app.vetro:not(.chiaro) .fw-stat,
  .fh-app.vetro:not(.chiaro) .fw-next{background:rgba(255,255,255,.07)!important;color:#eaf1f8!important}
  /* Di giorno, chiare. */
  /* DI GIORNO il vetro resta SCURO, ed e voluto. Le card di casa hanno il
     testo chiaro scritto dentro (--csc-ink #eaf1f8 e simili), con decine di
     colori d'accento pensati per il fondo scuro: verde chiaro, ambra, azzurro.
     Schiarendo il vetro il testo bianco finiva su bianco — quello che si
     vedeva stamattina. Rigirare tutti quei colori uno per uno vorrebbe dire
     rifare sei card e dimenticarne comunque qualcuno; un vetro scuro sopra
     un cielo chiaro invece si legge benissimo, si vede che e vetro, e non
     rompe niente. E' la stessa scelta di un paio di occhiali da sole. */
  .fh-app.vetro.chiaro .mc{--mc-panel:var(--fh-card-bg, rgba(255,255,255,.62))!important;--mc-ink:#12161c!important;--mc-muted:#4b5563!important}
  .fh-app.vetro.chiaro .eca{--eca-panel:var(--fh-card-bg, rgba(255,255,255,.62))!important;--eca-ink:#12161c!important;--eca-muted:#4b5563!important;--eca-faint:#64748b!important;
    --eca-solid:#fbfaf7!important;--eca-stroke:rgba(15,23,42,.14)!important}
  /* Le finestre della card energia (mese, ora, giorno) prendono lo sfondo da
     --eca-solid, che di giorno restava quello della notte: si aprivano nere
     in pieno sole. Bordo e ombra sono scritti dentro la card in bianco, e su
     fondo chiaro semplicemente non si vedono: li rifacciamo qui. */
  .fh-app.vetro.chiaro .eca-modal{background:#fbfaf7!important;border-color:rgba(15,23,42,.14)!important;
    box-shadow:0 24px 60px rgba(15,23,42,.22)!important;color:#12161c!important}
  .fh-app.vetro.chiaro .eca-scrim{background:rgba(228,235,242,.72)!important}
  .fh-app.vetro.chiaro .eca-mh{background:#fbfaf7!important}
  .fh-app.vetro.chiaro .eca-chiedi{background:rgba(15,23,42,.05)!important;border-color:rgba(15,23,42,.14)!important;color:#12161c!important}
  .fh-app.vetro.chiaro .csc{--csc-panel:var(--fh-card-bg, rgba(255,255,255,.62))!important;--csc-ink:#12161c!important;--csc-muted:#4b5563!important}
  .fh-app.vetro.chiaro .cbc{--cbc-panel:var(--fh-card-bg, rgba(255,255,255,.62))!important;--cbc-ink:#12161c!important;--cbc-muted:#4b5563!important}
  .fh-app.vetro.chiaro .cec{--cec-panel:var(--fh-card-bg, rgba(255,255,255,.62))!important;--cec-ink:#12161c!important;--cec-muted:#4b5563!important}
  /* I COLORI DELLE CARD DI HOME ASSISTANT OSPITATE QUI DENTRO.
     Una card di HA (intestazioni, entities, tile, mushroom...) non legge i
     nostri colori: legge le variabili del TEMA DI HOME ASSISTANT, che qui e
     scuro. Di giorno, sul vetro chiaro, quelle scritte sbiadivano fino a
     sparire. Le variabili CSS attraversano lo shadow DOM, quindi basta
     ridefinirle sul contenitore e valgono per qualunque card, anche future. */
  .fh-app .fh-cardwrap, .fh-popup{
    --primary-text-color:#eaf1f8; --secondary-text-color:#93a1b0;
    --ha-card-header-color:#eaf1f8;
  }
  .fh-app.chiaro .fh-cardwrap, .fh-app.chiaro .fh-popup{
    --primary-text-color:#12161c; --secondary-text-color:#4b5563;
    --ha-card-header-color:#12161c;
  }
  .fh-app.vetro.chiaro .fc,
  .fh-app.vetro.chiaro .fk,
  .fh-app.vetro.chiaro .pc,
  .fh-app.vetro.chiaro .fp,
  .fh-app.vetro.chiaro .fm{background:var(--fh-card-bg)!important;color:#12161c!important;
    border-color:var(--fh-card-border, rgba(15,23,42,.12))!important}

  /* I COLORI D'ACCENTO DI GIORNO — la correzione alla radice.
     Sopra si schiariva il vetro e si girava l'inchiostro principale, ma ogni
     card ha anche una manciata di colori "pastello" per i suoi stati: il
     grigio dei secondari, l'ambra, il verde dell'acceso, il rosso dell'errore.
     Erano nati per il fondo scuro, e sul vetro chiaro sparivano: misurati sul
     pannello vero, il grigio del clima stava a 2,6 e l'ambra dei consumi a
     1,7, quando la soglia per leggere e 4,5. Non erano decine di difetti
     diversi: erano SEI colori usati decine di volte.
     Adesso quei colori sono variabili (stesso valore di prima come riserva,
     cosi le card fuori da qui non cambiano di una virgola) e qui, e solo qui,
     il giorno ne cambia il valore. Una riga per colore invece di una per
     scritta: chi aggiunge una scritta domani eredita la correzione senza
     saperlo. Verificati tutti col calcolo del contrasto sopra il vetro
     chiaro e sopra le tinte ambra e rossa: il piu basso sta a 4,8. */
  /* Si scrive sulle TRE zone del guscio, non sul guscio intero. Il foglio
     delle impostazioni e figlio del guscio ma ha il fondo scuro suo (usa il
     tema vero di Home Assistant, perche dentro ci vivono gli editor di HA):
     se la tavolozza del giorno gli arrivasse per eredita, i suoi comandi
     diventerebbero scuri su scuro. E' lo stesso inciampo del vetro di
     settimana scorsa, e si evita allo stesso modo: dichiarare in basso, dove
     serve, invece che in alto dove arriva anche a chi non deve. */
  .fh-app.vetro.chiaro .fh-main,
  .fh-app.vetro.chiaro .fh-head,
  .fh-app.vetro.chiaro .fh-nav{
    --fh-c-muted:#4b5563; --fh-c-soft:#7a4a00; --fh-c-acc:#9a5b00;
    --fh-c-warn:#8a5200;  --fh-c-bad:#b3261e;  --fh-c-ok:#0f7a3d;
    --fh-c-ok2:#0f7a3d;
  }
  .fh-app.vetro.chiaro .eca{
    --eca-c-muted:#4b5563; --eca-c-soft:#7a4a00; --eca-c-acc:#9a5b00;
    --eca-c-warn:#8a5200;  --eca-c-bad:#b3261e;  --eca-c-ok:#0f7a3d;
    --eca-c-soft2:#a33b1e; --eca-c-warm:#8a5200;
    --eca-grad-a:#7a3d00; --eca-grad-b:#b3400e;
    --eca-acc:#a33b1e!important; --eca-acc2:#9a5b00!important;
  }
  .fh-app.vetro.chiaro .csc{
    --csc-c-muted:#4b5563; --csc-c-soft:#7a4a00; --csc-c-acc:#9a5b00;
    --csc-c-warn:#8a5200;  --csc-c-bad:#b3261e;  --csc-c-ok:#0f7a3d;
  }
  .fh-app.vetro.chiaro .mc{
    --mc-c-muted:#4b5563; --mc-c-soft:#7a4a00; --mc-c-acc:#9a5b00;
    --mc-c-warn:#8a5200;  --mc-c-bad:#b3261e;  --mc-c-ok:#0f7a3d;
  }

  /* Bucato ed elettrodomestici non passano da variabili: i colori delle fasi
     (lavaggio azzurro, centrifuga viola, riscaldamento arancio) sono scritti
     dentro le regole, scelti per il vetro scuro. Di giorno restavano pastelli
     su fondo chiaro — leggibili quanto un evidenziatore giallo su carta
     bianca. Qui la stessa fase prende la sua tinta scura. */
  .fh-app.vetro.chiaro .cbc-machine[data-phase="wash"] .cbc-state,
  .fh-app.vetro.chiaro .cec-machine[data-phase="wash"] .cec-state,
  .fh-app.vetro.chiaro .cec-machine[data-phase="cool"] .cec-state{color:#0b5c99!important}
  .fh-app.vetro.chiaro .cbc-machine[data-phase="spin"] .cbc-state{color:#5b2fb3!important}
  .fh-app.vetro.chiaro .cbc-machine[data-phase="heat"] .cbc-state{color:#b3261e!important}
  .fh-app.vetro.chiaro .cbc-machine[data-phase="cool"] .cbc-state{color:#0f7a3d!important}
  .fh-app.vetro.chiaro .cec-machine[data-phase="heat"] .cec-state,
  .fh-app.vetro.chiaro .cec-machine[data-phase="preheat"] .cec-state,
  .fh-app.vetro.chiaro .cec-machine[data-phase="cook"] .cec-state{color:#a34a08!important}
  .fh-app.vetro.chiaro .cec-machine[data-phase="on"] .cec-state{color:#0f7a3d!important}
  .fh-app.vetro.chiaro .cbc-plugbadge[data-plug="on"],
  .fh-app.vetro.chiaro .cec-plugbadge[data-plug="on"]{color:#0f7a3d!important;
    background:rgba(15,122,61,.12)!important;border-color:rgba(15,122,61,.4)!important}
  .fh-app.vetro.chiaro .cbc-plugbadge[data-plug="off"],
  .fh-app.vetro.chiaro .cec-plugbadge[data-plug="off"]{color:#b3261e!important;
    background:rgba(179,38,30,.10)!important;border-color:rgba(179,38,30,.32)!important}
  /* La pillola della durata nell'elenco delle accensioni: azzurro chiaro su
     azzurro, nata per il vetro scuro. Di giorno va girata scura. */
  .fh-app.vetro.chiaro .mc-accdur{background:rgba(11,92,153,.12)!important;
    border-color:rgba(11,92,153,.35)!important;color:#0b5c99!important}
  .fh-app.vetro.chiaro .cbc-lastcycle .eur,
  .fh-app.vetro.chiaro .cec-lastcycle .eur,
  .fh-app.vetro.chiaro .cbc-crow .cv small,
  .fh-app.vetro.chiaro .cec-crow .cv small{color:#9a5b00!important}

  /* Dove il colore e scritto dentro l'elemento (lo stato delle persone, il
     modo del clima, il riquadro dei carichi) il foglio di stile da solo non
     basta: l'elemento vince sempre. Percio ognuno di quelli si porta dietro
     anche la propria versione da giorno, e qui si sceglie quella. E' l'unico
     punto dove serve !important, e serve davvero. */
  .fh-app.vetro.chiaro .fc-t2,
  .fh-app.vetro.chiaro .fc-big,
  .fh-app.vetro.chiaro .fk-modo,
  .fh-app.vetro.chiaro .fk-cval{color:var(--fh-giorno)!important}

  /* Il disegnino del condizionatore/stufa e fatto di bianco trasparente:
     spento, di notte si vede appena sul vetro scuro; di giorno sul vetro
     chiaro sparisce del tutto. Qui prende un contorno scuro invece che
     bianco, cosi resta visibile anche fermo. Da "viva" (acceso) non cambia:
     li il colore lo da gia var(--fk-c), sempre leggibile. */
  .fh-app.vetro.chiaro .fk-corpo{fill:rgba(15,23,42,.08)!important;stroke:rgba(15,23,42,.28)!important}
  .fh-app.vetro.chiaro .fk-griglia{fill:rgba(15,23,42,.28)!important}
  .fh-app.vetro.chiaro .fk-spia{fill:rgba(15,23,42,.3)!important}
  .fh-app.vetro.chiaro .fk-onda{stroke:rgba(15,23,42,.22)!important}
  .fh-app.vetro.chiaro .fk-vetro{fill:rgba(15,23,42,.12)!important;stroke:rgba(15,23,42,.28)!important}
  .fh-app.vetro.chiaro .fk-legna{stroke:rgba(15,23,42,.26)!important}
  .fh-app.vetro.chiaro .fk-griglia2{stroke:rgba(15,23,42,.28)!important}
  .fh-app.vetro.chiaro .fk-fiamma{fill:rgba(15,23,42,.18)!important}
  /* Il tasto "Ventola, alette e consumi" e disegnato col bianco trasparente:
     di giorno sul vetro chiaro sparirebbe come tutto il resto. */
  .fh-app.vetro.chiaro .fk-piu{background:rgba(15,23,42,.05)!important;border-color:rgba(15,23,42,.16)!important}

  /* I FOGLI CHE SI APRONO, DI GIORNO.
     Hanno il fondo scuro scritto dentro di se ma prendono il testo dal tema
     della pagina: di giorno diventava scuro su scuro. Qui il foglio si
     schiarisce insieme al testo, e con lui righe e bordi — su un fondo
     chiaro un bordo bianco al 9% semplicemente non c'e. */
  .fh-app.vetro.chiaro .mc-modal,
  .fh-app.vetro.chiaro .csc-modal,
  .fh-app.vetro.chiaro .cbc-modal,
  .fh-app.vetro.chiaro .cec-modal,
  .fh-app.vetro.chiaro .fk-confirm{
    background:#fbfaf7!important;
    border-color:rgba(15,23,42,.14)!important;
    box-shadow:0 24px 60px rgba(15,23,42,.22)!important;
    color:#12161c!important;
  }
  .fh-app.vetro.chiaro .fk-cbtn{
    background:rgba(15,23,42,.05)!important;
    border-color:rgba(15,23,42,.14)!important;
    color:#12161c!important;
  }
  .fh-app.vetro.chiaro .fk-cbtn.warn{
    background:rgba(255,176,32,.18)!important;
    border-color:rgba(255,176,32,.5)!important;
  }
  .fh-app.vetro.chiaro .mc-sheet-handle{background:rgba(15,23,42,.22)!important}
  .fh-app.vetro.chiaro .csc-srow,
  .fh-app.vetro.chiaro .mc-modal .mc-row,
  .fh-app.vetro.chiaro .mc-x,
  .fh-app.vetro.chiaro .csc-x{
    background:rgba(15,23,42,.05)!important;
    border-color:rgba(15,23,42,.14)!important;
  }
  .fh-app.vetro.chiaro .csc-erow{border-bottom-color:rgba(15,23,42,.12)!important}
  /* Dentro quei fogli le righe e le linguette sono bianco trasparente, e su
     un foglio schiarito sparivano insieme al testo che ci sta sopra. */
  .fh-app.vetro.chiaro .cbc-avgrow,
  .fh-app.vetro.chiaro .cec-avgrow,
  .fh-app.vetro.chiaro .cbc-tab,
  .fh-app.vetro.chiaro .cec-tab{
    background:rgba(15,23,42,.05)!important;
    border-color:rgba(15,23,42,.14)!important;
  }
  .fh-app.vetro.chiaro .cbc-mhl,
  .fh-app.vetro.chiaro .cec-mhl,
  .fh-app.vetro.chiaro .cbc-empty,
  .fh-app.vetro.chiaro .cec-empty{color:#4b5563!important}

  /* LE ECCEZIONI: i riquadri che restano scuri anche di giorno.
     Il posto della telecamera spenta e il disegno della stanza sono scuri per
     conto loro, qualunque sia l'ora. Li il pastello era ed e la scelta giusta:
     si riprendono i valori della notte in locale, cosi il giro dei colori qui
     sopra non li segue dove non deve. */
  .fh-app.vetro.chiaro .csc-camoff,
  .fh-app.vetro.chiaro .csc-cam,
  .fh-app.vetro.chiaro .mc-card[data-icona="piena"]{
    --csc-c-muted:#93a1b0; --csc-c-soft:#ffe9c2; --csc-c-acc:#ffb020;
    --csc-c-warn:#ffd28a;  --csc-c-bad:#ffb0a3;  --csc-c-ok:#8ff0b4;
    --mc-c-muted:#93a1b0;  --mc-c-soft:#ffe9c2;  --mc-c-acc:#ffb020;
    --mc-c-warn:#ffd28a;   --mc-c-bad:#ffb0a3;   --mc-c-ok:#8ff0b4;
    --csc-muted:#93a1b0;   --mc-muted:#93a1b0;
  }
  /* Il testo secondario (le scritte grigie: "Chiusa", "71%", le didascalie)
     e tarato per un pannello pieno e scuro. Su un vetro, che lascia passare
     il cielo chiaro, quel grigio scende a un contrasto di 2,6 — si intuisce,
     non si legge. Qui si schiarisce: resta piu spento del testo principale,
     che e il suo mestiere, ma si legge. */
  .fh-app.vetro .mc{--mc-muted:#c3ceda!important}
  .fh-app.vetro .csc{--csc-muted:#c3ceda!important}
  .fh-app.vetro .cbc{--cbc-muted:#c3ceda!important}
  .fh-app.vetro .cec{--cec-muted:#c3ceda!important}
  .fh-app.vetro .eca{--eca-muted:#cdc9c2!important;--eca-faint:#b3aea6!important}
  /* Di giorno il cielo e chiaro: il vetro va schiarito, senno il testo scuro
     su un vetro scuro non si legge piu. */
  /* Le card NATIVE di Home Assistant invece hanno il testo che segue il tema
     di HA, quindi li il vetro chiaro va bene: sono l'unico caso in cui
     schiarire non rompe niente. */
  .fh-app.vetro.chiaro .fh-main{
    --ha-card-background:var(--fh-card-bg)!important;
    --card-background-color:var(--fh-card-bg)!important;
    --ha-card-border-color:var(--fh-card-border, rgba(15,23,42,.12))!important;
  }
  /* Una stanza con l'icona a tutta card fa eccezione: li il disegno E' la
     card, e renderlo trasparente lo trasformerebbe in una macchia sul cielo.
     Resta pieno, ed e giusto cosi: e lui lo sfondo. */
  /* LE VELATURE DI STATO sono tarate su un fondo pieno: appoggiate sul
     vetro diventano una tinta che invade tutta la card — la porta blindata
     "sbloccata" diventava un rettangolo ocra grande mezzo schermo. Qui si
     dimezzano: lo stato resta leggibile dal bordo colorato e dalla scritta,
     che sono i due posti dove lo si legge davvero, e il cielo torna a
     vedersi attraverso. */
  .fh-app.vetro .csc-card[data-status="danger"]{background-image:linear-gradient(rgba(255,84,66,.07),rgba(255,84,66,.07))!important}
  .fh-app.vetro .csc-card[data-status="warn"]{background-image:linear-gradient(rgba(255,176,32,.055),rgba(255,176,32,.055))!important}
  .fh-app.vetro .csc-card[data-status="safe"]{background-image:linear-gradient(rgba(56,224,138,.05),rgba(56,224,138,.05))!important}
  .fh-app.vetro .mc-card.on{background-image:linear-gradient(rgba(56,224,138,.05),rgba(56,224,138,.05))!important}
  /* Questa riga spegneva la scala del consumo: un valore fisso, sempre lo
     stesso, qualunque cosa scrivesse la card sulla sua variabile di
     intensita. La card diceva "sta tirando 70W, tinta al massimo" e qui
     arrivava sempre e solo un valore piatto — la luce accesa a piena
     potenza sembrava uguale a un frigo appena sopra soglia. Ora si dimezza
     come tutte le altre qui sopra, ma SUL VALORE E SUL COLORE CHE LA CARD
     HA CALCOLATO, non su uno fisso: il vetro resta delicato, la scala del
     consumo resta viva. Il colore e lo stesso verde piu scuro che usa la
     card fuori dal vetro (14,159,110, non piu il verde chiaro dell'acceso
     e basta): se qui restasse il vecchio colore, sopra soglia si vedrebbe
     un salto di tinta improvviso appena il vetro si accende. */
  .fh-app.vetro .mc-card.on.lavora{background-image:linear-gradient(
    rgba(14,159,110,calc(0.08 + var(--mc-intensita,0.5) * 0.17)),
    rgba(14,159,110,calc(0.08 + var(--mc-intensita,0.5) * 0.17)))!important}
  /* La card Meteo scrive il colore del proprio testo dentro di se, diverso
     per ogni condizione (un bruno per il sereno, un altro per la pioggia...):
     e pensato per stare sopra IL SUO sfondo colorato, non sopra il vetro
     scuro. Il titolo e il sottotitolo finivano bruno-su-bruno, illeggibili.
     Le pastiglie sotto (umidita, pressione...) invece hanno un fondo chiaro
     tutto loro e restano leggibili cosi come sono: si tocca solo cio che
     sta appoggiato direttamente sul vetro. */
  /* Niente forzature sui testi del meteo: il colore giusto ce l'ha gia la
     veste del tempo (ogni tinta si porta dietro il suo inchiostro). Erano
     queste righe a renderlo sempre uguale a se stesso. */
  .fh-app.vetro .mc-card[data-icona="piena"]{--mc-panel:transparent!important;backdrop-filter:none!important}
  .fh-slot.fh-dragging{opacity:.28}
  .fh-dragmode .fh-col{outline:1px dashed rgba(255,176,32,.22);outline-offset:4px;border-radius:14px}
  .fh-col.fh-drop-in{outline:2px solid rgba(255,176,32,.75);background:rgba(255,176,32,.07)}
  .fh-slot.fh-drop-prima::before,.fh-slot.fh-drop-dopo::after{content:"";position:absolute;left:0;right:0;
    height:4px;border-radius:3px;background:#ffb020;box-shadow:0 0 12px rgba(255,176,32,.8);z-index:5}
  .fh-ang{position:absolute;right:-3px;bottom:-3px;width:22px;height:22px;z-index:4;cursor:nwse-resize;
    touch-action:none;border-radius:0 0 14px 0;
    background:linear-gradient(135deg,transparent 46%,rgba(255,176,32,.85) 46%);
    border-right:2px solid rgba(255,176,32,.85);border-bottom:2px solid rgba(255,176,32,.85)}
  /* Col dito 22px non si prendono: si manca l'angolo, il tocco finisce sulla
     card e il trascinamento diventa una sfogliata. Su schermo tattile
     l'area sensibile cresce, il disegno resta uguale. */
  @media (pointer:coarse){
    .fh-ang{width:38px;height:38px;right:-6px;bottom:-6px;
      background:linear-gradient(135deg,transparent 62%,rgba(255,176,32,.85) 62%)}
  }
  .fh-misura{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;
    padding:5px 10px;border-radius:9px;font-size:11.5px;font-weight:800;white-space:nowrap;
    background:rgba(10,12,16,.9);color:var(--fh-c-soft,#ffe9c2);border:1px solid rgba(255,176,32,.5)}
  .fh-slot.fh-drop-prima::before{top:-9px}
  .fh-slot.fh-drop-dopo::after{bottom:-9px}
  /* quante card per riga */
  .fh-perriga{display:flex;align-items:center;gap:6px;flex-wrap:wrap;width:100%;
    margin-top:4px;padding-top:6px;border-top:1px dashed rgba(255,176,32,.25)}
  .fh-pr{display:inline-flex;align-items:center;gap:3px}
  .fh-pr ha-icon{--mdc-icon-size:15px;color:var(--fh-muted,#93a1b0)}
  .fh-pr select{height:26px;border-radius:8px;font:inherit;font-size:11px;font-weight:700;padding:0 3px;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:var(--fh-panel,rgba(255,255,255,.06));
    color:var(--fh-ink,#eaf1f8);cursor:pointer}
  .fh-prnota{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
    color:var(--fh-muted,#93a1b0)}
  .fh-cardwrap{display:block}
  .fh-cardfail{padding:14px;border-radius:16px;font-size:12.5px;color:var(--fh-muted,#93a1b0);
    border:1px dashed var(--fh-stroke,rgba(255,255,255,.16));background:var(--fh-panel,rgba(255,255,255,.04))}
  .fh-empty{margin:auto;text-align:center;color:var(--fh-muted,#93a1b0);display:flex;flex-direction:column;align-items:center;gap:8px;padding:40px 20px}
  .fh-empty ha-icon{--mdc-icon-size:46px;opacity:.5}
  .fh-empty small{font-size:11.5px;max-width:320px;line-height:1.5}
  .fh-nav{position:fixed;left:0;right:0;bottom:0;z-index:6;
    padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none}
  .fh-navbar.molte{justify-content:flex-start;overflow-x:auto;scrollbar-width:none;
    scroll-snap-type:x proximity;max-width:min(760px,96vw);
    overscroll-behavior-x:contain;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%);
    mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%)}
  .fh-navbar.molte::-webkit-scrollbar{display:none}
  .fh-navbar.molte .fh-navitem{flex:0 0 auto;min-width:66px;scroll-snap-align:center}
  /* Il contenitore del cerchio deve restare largo quanto la barra intera: se
     diventa un flex, la barra si stringe sul contenuto e le parole si
     accorciano in "Sicur...". Resta un blocco, e la barra si centra da se. */
  /* AZIONI RAPIDE: tondi grossi appena sopra la barra, nella zona che il
     pollice raggiunge senza spostare la mano. Scorrono di lato se sono tante. */
  .fh-azioni{pointer-events:auto;margin:0 auto 8px;max-width:min(560px,96vw)}
  .fh-azriga{display:flex;gap:10px;justify-content:center;overflow-x:auto;padding:2px 4px 2px;
    scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-x:contain}
  .fh-azriga::-webkit-scrollbar{display:none}
  .fh-az{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;
    border:none;background:none;padding:0;cursor:pointer;font:inherit;color:var(--fh-ink,#eaf1f8)}
  .fh-azico{display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;
    background:var(--fh-panel,rgba(30,38,48,.78));border:1px solid var(--fh-stroke,rgba(255,255,255,.1));
    backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
    box-shadow:0 8px 20px rgba(0,0,0,.28);transition:transform .15s ease,background .25s ease,border-color .25s ease}
  .fh-az:active .fh-azico{transform:scale(.92)}
  .fh-az ha-icon{--mdc-icon-size:25px}
  .fh-aztxt{font-size:10px;font-weight:700;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-az.on .fh-azico{background:linear-gradient(150deg,#ffc55c,#ffb020 55%,#e6890a);border-color:#ffb020;
    box-shadow:0 8px 22px rgba(255,176,32,.42)}
  .fh-az.on ha-icon{color:#1c1400}
  @media (prefers-reduced-motion: reduce){ .fh-az:active .fh-azico{transform:none} }

  /* L'entrata della pagina nuova: viene dal lato da cui hai strisciato.
     Solo un accenno, 140 millesimi: deve sembrare svelta, non una diapositiva. */
  @keyframes fhEntraDx{from{opacity:.4;transform:translateX(22px)}to{opacity:1;transform:none}}
  @keyframes fhEntraSx{from{opacity:.4;transform:translateX(-22px)}to{opacity:1;transform:none}}
  .fh-entra-dx{animation:fhEntraDx .14s ease-out}
  .fh-entra-sx{animation:fhEntraSx .14s ease-out}
  @media (prefers-reduced-motion: reduce){ .fh-entra-dx,.fh-entra-sx{animation:none} }

  /* IL DITO NON E UN CURSORE. Un polpastrello copre circa 44 pixel: sotto
     quella misura il tocco manca il tasto o prende quello accanto. Parecchi
     comandi stavano sotto — la rotellina delle stanze a 26, gli strumenti
     della modifica a 30, i tondi in cima a 36, le frecce di ordinamento a
     28x25 — e sul telefono si sbagliava.
     Due rimedi, a seconda di dove sta il tasto:
      - quelli ISOLATI restano grandi come prima a vista, ma si allarga
        l'area che risponde al tocco (uno strato trasparente attorno);
      - quelli in FILA, dove l'area allargata finirebbe sul vicino, crescono
        davvero.
     Solo sugli schermi da toccare (pointer: coarse): col mouse la misura
     piccola va benissimo e non si tocca niente. */
  @media (pointer: coarse){
    .fh-ic,.fh-tool,.fh-grip,.fk-tbtn,.fsp-modal-close,.fw-mclose,.ffc-x{position:relative}
    .fh-ic::before,.fh-stanzabtn-cfg::before,.fh-tool::before,.fh-grip::before,.fh-ang::before,
    .fk-tbtn::before,.fsp-modal-close::before,.fw-mclose::before,.ffc-x::before,.fce-x::before,.fke-x::before{
      content:"";position:absolute;border-radius:inherit}
    .fh-ic::before{inset:-4px}
    .fh-stanzabtn-cfg::before{inset:-9px}
    .fh-tool::before,.fh-grip::before{inset:-7px}
    .fh-ang::before{inset:-3px}
    .fk-tbtn::before{inset:-2px}
    .fsp-modal-close::before,.ffc-x::before{inset:-6px}
    .fw-mclose::before{inset:-5px}
    .fce-x::before,.fke-x::before{inset:-10px}
    /* In fila: crescono davvero. */
    .fh-frecce{gap:8px}
    .fh-frecce button{min-width:44px;min-height:40px;font-size:14px}
    .pc-cmd button{width:38px;height:38px}
  }

  .fh-navwrap{position:relative;pointer-events:none}
  .fh-navbar{display:flex;align-items:flex-end;justify-content:space-around;gap:4px;
    max-width:560px;margin:0 auto;padding:8px 10px;pointer-events:auto;
    background:var(--fh-panel,rgba(30,38,48,.78));border:1px solid var(--fh-stroke,rgba(255,255,255,.09));border-radius:26px;
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 12px 30px rgba(0,0,0,.45)}
  /* L'ELENCO DELLE STANZE.
     Una griglia di nomi non dice niente: qui ogni riquadro porta gia la
     temperatura della stanza e quanto c'e di acceso, e l'icona respira. Il
     movimento e sfalsato fra un riquadro e l'altro, cosi sembra vivo e non una
     fila di cose che pulsano insieme. */
  .fh-stanzegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:12px}
  .fh-stanza{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:8px;padding:18px 8px 14px;border-radius:22px;cursor:pointer;font:inherit;
    font-size:12.5px;font-weight:800;color:inherit;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:rgba(255,255,255,.06);
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    transition:transform .12s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease}
  .fh-app.chiaro .fh-stanza{background:rgba(15,23,42,.05)}
  .fh-stanza.mod-attiva{border-style:dashed;border-color:rgba(255,176,32,.5);background:rgba(255,176,32,.04)}
  .fh-stanza.mod-attiva:hover{border-color:#ffb020;background:rgba(255,176,32,.12)}
  .fh-stanzabtn-cfg{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:8px;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.16));background:rgba(255,255,255,.08);
    display:flex;align-items:center;justify-content:center;color:inherit;cursor:pointer;
    opacity:.6;transition:opacity .15s,background .15s,color .15s,transform .12s;z-index:3}
  .fh-stanzabtn-cfg ha-icon{--mdc-icon-size:15px}
  .fh-stanzabtn-cfg:hover{opacity:1;background:rgba(255,176,32,.25);color:#ffb020;border-color:#ffb020;transform:scale(1.1)}
  .fh-app.chiaro .fh-stanzabtn-cfg{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.12)}
  .fh-app.chiaro .fh-stanzabtn-cfg:hover{background:rgba(255,176,32,.2);color:#b37000;border-color:#b37000}
  .fh-arte{position:relative;opacity:.95;line-height:0;display:flex;align-items:center;justify-content:center;
    animation:fh-respira 4.6s ease-in-out infinite;animation-delay:var(--ritardo,0ms)}
  .fh-stanzetop{display:flex;justify-content:flex-end;margin-bottom:10px}
  .fh-ordbtn{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:11px;cursor:pointer;
    font:inherit;font-size:12px;font-weight:800;color:inherit;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.14));background:rgba(255,255,255,.06)}
  .fh-ordbtn ha-icon{--mdc-icon-size:16px}
  .fh-ordbtn.on{background:#ffb020;border-color:#ffb020;color:#1c1400}
  .fh-stanza.ord{cursor:default}
  .fh-frecce{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-top:6px}
  .fh-frecce button{width:28px;height:25px;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;
    color:inherit;border:1px solid var(--fh-stroke,rgba(255,255,255,.18));background:rgba(255,255,255,.08);
    display:flex;align-items:center;justify-content:center}
  .fh-frecce button:disabled{opacity:.3;cursor:not-allowed}
  .fh-frecce button ha-icon{--mdc-icon-size:14px}
  .fh-frecce button.via{color:#ff8f80}
  .fh-frecce button.chiede{width:auto;padding:0 8px;font-size:11px;font-weight:800;color:#ff5442;
    border-color:rgba(255,84,66,.5)}
  .fh-lab2{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;opacity:.6;
    margin-bottom:8px}
  .fh-lab2 small{font-size:10px;font-weight:700;letter-spacing:0;text-transform:none;opacity:.85;
    margin-left:6px}
  .fh-disegni{display:grid;grid-template-columns:repeat(auto-fill,minmax(102px,1fr));gap:10px}
  .fh-dis{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px 12px;border-radius:18px;
    cursor:pointer;font:inherit;font-size:11px;font-weight:800;color:inherit;text-align:center;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:rgba(255,255,255,.05);
    transition:transform .15s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease}
  .fh-dis:hover{transform:translateY(-2px);background:rgba(255,176,32,.14);border-color:rgba(255,176,32,.4)}
  .fh-dis.on{border-color:#ffb020;background:rgba(255,176,32,.22);color:#ffb020;box-shadow:0 0 18px rgba(255,176,32,.28)}
  .fh-arte.fucina svg{width:46px;height:46px}
  .fh-dis .fh-arte.fucina svg{width:44px;height:44px}
  .fh-stanza.aggiungi{border-style:dashed;opacity:.75}
  .fh-stanza.aggiungi ha-icon{--mdc-icon-size:28px}
  .fh-stanza.aggiungi:hover{opacity:1}
  .fh-stanzetop{gap:8px}
  .fh-stanza:active{transform:scale(.95)}
  .fh-stanza:hover{background:rgba(255,176,32,.14);border-color:rgba(255,176,32,.4)}
  .fh-stanzanome{line-height:1.2;text-align:center}
  .fh-stanzadati{display:flex;flex-direction:column;align-items:center;gap:2px;line-height:1.15}
  .fh-stanzadati b{font-size:13.5px;font-weight:900;font-variant-numeric:tabular-nums}
  .fh-stanzadati i{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.03em;opacity:.62}
  .fh-stanzametriche{display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:wrap;line-height:1.2}
  .fh-stanzametriche .fh-stemp{font-size:13px;font-weight:900}
  .fh-stanzametriche .fh-swatt{font-size:10.5px;font-weight:800;color:var(--fh-c-warn,#ffb020);background:rgba(255,176,32,.14);padding:1px 5px;border-radius:5px;
    transition:background .35s ease,color .35s ease}
  /* IL CONSUMO SI VEDE DALL'ELENCO. Il numero dei watt era sempre ambra,
     quindi 5 W in camera e 1,15 kW in cucina avevano lo stesso aspetto: il
     colore non stava dicendo niente. Adesso il cartellino segue le soglie
     della stanza — verde finche e il suo solito, ambra sopra l'attenzione,
     rosso oltre — e il bordo della tessera si accende con lui, cosi la stanza
     che sta tirando si riconosce senza leggere i numeri.
     --fh-int e quanto e dentro il livello: il colore cresce con i watt. */
  .fh-stanza.c-basso .fh-swatt{color:#34d399;background:rgba(52,211,153,calc(.10 + var(--fh-int,.5) * .14))}
  .fh-stanza.c-medio .fh-swatt{color:#ffb020;background:rgba(255,176,32,calc(.16 + var(--fh-int,.5) * .26))}
  .fh-stanza.c-medio{border-color:rgba(255,176,32,calc(.40 + var(--fh-int,.5) * .40))}
  .fh-stanza.c-alto .fh-swatt{color:#ff8a7a;background:rgba(255,84,66,calc(.20 + var(--fh-int,.5) * .28))}
  .fh-stanza.c-alto{border-color:rgba(255,84,66,calc(.55 + var(--fh-int,.5) * .40));
    box-shadow:0 0 0 1px rgba(255,84,66,calc(.10 + var(--fh-int,.5) * .14)),
      0 8px calc(16px + var(--fh-int,.5) * 14px) rgba(255,84,66,calc(.10 + var(--fh-int,.5) * .16))}
  /* Di giorno il verde e l'ambra chiari sul bianco non si leggono. */
  .fh-app.chiaro .fh-stanza.c-basso .fh-swatt{color:#0a6134;background:rgba(16,150,88,calc(.10 + var(--fh-int,.5) * .12))}
  .fh-app.chiaro .fh-stanza.c-medio .fh-swatt{color:#7a4400;background:rgba(214,130,0,calc(.16 + var(--fh-int,.5) * .22))}
  .fh-app.chiaro .fh-stanza.c-alto .fh-swatt{color:#8d1d10;background:rgba(214,60,40,calc(.16 + var(--fh-int,.5) * .24))}
  .fh-valbadge{display:inline-block;padding:3px 9px;border-radius:7px;background:rgba(255,255,255,.08);font-size:12.5px}
  /* L'alone si accende solo dove c'e qualcosa acceso: in un colpo d'occhio si
     vede dove sta consumando la casa. */
  .fh-alone{position:absolute;top:-30%;left:50%;width:120%;aspect-ratio:1/1;transform:translateX(-50%);
    border-radius:50%;background:radial-gradient(circle,rgba(255,176,32,.30),rgba(255,176,32,0) 62%);
    opacity:0;transition:opacity .4s ease;pointer-events:none}
  .fh-stanza.viva .fh-alone{opacity:1;animation:fh-pulsa 3.2s ease-in-out infinite;
    animation-delay:var(--ritardo,0ms)}
  .fh-stanza.viva .fh-arte{color:#ffb020;opacity:1;filter:drop-shadow(0 0 10px rgba(255,176,32,.45))}
  @keyframes fh-respira{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.06)}}
  @keyframes fh-pulsa{0%,100%{opacity:.55}50%{opacity:1}}
  @media (prefers-reduced-motion: reduce){
    .fh-arte,.fh-stanza.viva .fh-alone{animation:none}
  }
  .fh-chipwrap{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
  .fh-chipsel{display:flex;align-items:center;gap:6px;padding:8px 11px;border-radius:12px;cursor:pointer;
    font:inherit;font-size:12.5px;font-weight:800;color:inherit;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.14));background:rgba(255,255,255,.06)}
  .fh-chipsel ha-icon{--mdc-icon-size:17px}
  .fh-chipsel.on{background:#ffb020;border-color:#ffb020;color:#1c1400}
  .fh-navitem.nascosta{opacity:.45}
  .fh-navitem.nascosta::after{content:"";position:absolute;top:6px;right:8px;width:5px;height:5px;
    border-radius:50%;background:var(--fh-muted,#93a1b0)}
  .fh-navitem{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;
    padding:7px 4px;border:none;background:none;cursor:pointer;font:inherit;color:var(--fh-muted,#93a1b0);transition:color .3s}
  .fh-navitem ha-icon{--mdc-icon-size:23px;transition:opacity .28s ease}
  .fh-navlabel{font-size:10.5px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-navitem:hover{color:var(--fh-ink,#eaf1f8)}
  /* Pagina attiva: il cerchio rialzato si sposta qui — è il modo in cui si
     capisce dove si è senza leggere le etichette. */
  .fh-navitem.active{color:var(--fh-ink,#eaf1f8)}
  /* Il cerchio non appartiene a nessuna voce: e uno solo, e scivola.
     La curva e misurata, non inventata: meta strada nei primi 90 millesimi,
     poi si posa. Nessun rimbalzo, nessuno scatto in alto: solo orizzontale. */
  .fh-blob{position:absolute;left:0;top:-15px;width:54px;height:54px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2;
    background:linear-gradient(150deg,#ffc55c,#ffb020 55%,#e6890a);
    box-shadow:0 8px 22px rgba(255,176,32,.42),0 2px 6px rgba(0,0,0,.3);
    border:2px solid var(--fh-panel,rgba(13,20,32,.9));
    will-change:transform;backface-visibility:hidden;
    transition:transform .49s cubic-bezier(.27,.98,.59,.98),opacity .2s}
  .fh-blob ha-icon{--mdc-icon-size:27px;color:#1c1400}
  .fh-blob.via{opacity:0}
  /* La voce attiva e fuori dalla finestra: il cerchio resta al bordo, ma
     sbiadito, per non sembrare appoggiato su una voce che non e la sua. */
  .fh-blob.lontano{opacity:.32}
  /* Sotto il cerchio l'icona della voce si toglie di mezzo: sfuma mentre il
     cerchio arriva, e ricompare quando se ne va. */
  .fh-navitem.active > ha-icon{opacity:0}
  @media (prefers-reduced-motion: reduce){
    .fh-blob,.fh-blob ha-icon{transition:none}
  }

  /* ---- modalita modifica ---- */
  /* fixed come la barra in basso, che si e visto funzionare qui dentro:
     sticky non reggeva perche il contenitore che scorre non e questo. Cosi
     Salva e Annulla restano raggiungibili senza risalire tutta la pagina. */
  .fh-editbar{position:fixed;left:12px;right:12px;top:8px;z-index:30;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
    padding:10px 12px;border-radius:16px;margin-bottom:4px;
    background:var(--fh-panel,rgba(30,38,48,.9));border:1px solid rgba(255,176,32,.45);
    backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  .fh-prova{display:flex;gap:3px;flex:0 0 auto}
  .fh-pv{width:30px;height:30px;border-radius:9px;cursor:pointer;display:flex;align-items:center;
    justify-content:center;border:1px solid var(--fh-stroke,rgba(255,255,255,.12));
    background:transparent;color:var(--fh-muted,#93a1b0)}
  .fh-pv ha-icon{--mdc-icon-size:16px}
  .fh-pv.sel{border-color:rgba(255,176,32,.6);background:rgba(255,176,32,.18);color:var(--fh-c-soft,#ffe9c2)}
  .fh-editlabel{flex:1;min-width:120px;display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:var(--fh-c-acc,#ffb020)}
  .fh-editlabel ha-icon{--mdc-icon-size:17px}
  .fh-btn{padding:8px 14px;border-radius:999px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:transparent;color:var(--fh-ink,#eaf1f8)}
  .fh-sheet .fh-btn{border-color:var(--divider-color);color:var(--primary-text-color)}
  .fh-sheet .fh-ic{border-color:var(--divider-color);background:var(--card-background-color);color:var(--secondary-text-color)}
  /* Il testo del tasto principale segue l'inchiostro del tema: era crema
     fisso, e sul pannello chiaro di giorno spariva dentro l'ambra. */
  .fh-btn.primary{border-color:rgba(255,176,32,.75);
    background:linear-gradient(135deg,rgba(255,176,32,.42),rgba(255,176,32,.22));
    color:var(--fh-ink,#eaf1f8)}
  .fh-sheet .fh-btn.primary{color:var(--primary-text-color)}
  /* SERVE QUALCOSA?
     Pastiglie su una riga che scorre, come le chip dell'intestazione: il
     colore dice la gravita senza leggere. Quando non c'e niente resta una
     riga verde bassa, che si nota appena - e proprio quello il messaggio. */
  .fh-att{margin:0 0 12px}
  .fh-attriga{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;
    padding-bottom:2px;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 10px,#000 calc(100% - 18px),transparent 100%);
    mask-image:linear-gradient(90deg,transparent 0,#000 10px,#000 calc(100% - 18px),transparent 100%)}
  .fh-attriga::-webkit-scrollbar{display:none}
  .fh-attpill{flex:0 0 auto;display:flex;align-items:center;gap:7px;max-width:82vw;
    padding:9px 14px 9px 11px;border-radius:999px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;
    color:var(--fh-ink,#eaf1f8);border:1px solid var(--fh-stroke,rgba(255,255,255,.12));
    background:var(--fh-panel,rgba(30,38,48,.72));
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  .fh-attpill span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-attpill ha-icon{--mdc-icon-size:19px;flex:0 0 auto}
  .fh-attpill.rosso{border-color:rgba(255,84,66,.55);background:rgba(255,84,66,.14)}
  .fh-attpill.rosso ha-icon{color:#ff7a6b}
  .fh-attpill.ambra{border-color:rgba(255,176,32,.5);background:rgba(255,176,32,.13)}
  .fh-attpill.ambra ha-icon{color:#ffb020}
  .fh-attpill.blu{border-color:rgba(90,210,255,.45);background:rgba(90,210,255,.12)}
  .fh-attpill.blu ha-icon{color:#5ad2ff}
  .fh-attpill.verde{border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.12)}
  .fh-attpill.verde ha-icon{color:#34d399}
  .fh-attok{display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;width:fit-content;
    font-size:11.5px;font-weight:700;color:#34d399;background:rgba(52,211,153,.10);
    border:1px solid rgba(52,211,153,.28)}
  .fh-attok ha-icon{--mdc-icon-size:17px}
  .fh-attrow{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:14px;margin-bottom:8px;
    border:1px solid var(--divider-color,rgba(127,127,127,.2));background:rgba(127,127,127,.06)}

  /* LA FASCIA DEL CONSUMO.
     Non e una card: e una riga sola, alta quanto basta, che cambia colore da
     sola. Il riempimento dietro cresce col consumo, cosi il colpo d'occhio
     arriva prima ancora di leggere il numero. */
  .fh-consumo{position:relative;overflow:hidden;display:flex;align-items:center;gap:12px;width:100%;
    margin:0 0 12px;padding:12px 14px;border-radius:18px;cursor:pointer;font:inherit;text-align:left;
    color:var(--fh-ink,#eaf1f8);border:1px solid var(--fh-stroke,rgba(255,255,255,.1));
    background:var(--fh-panel,rgba(30,38,48,.72));
    backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
    transition:border-color .45s ease,box-shadow .45s ease}
  .fh-consumo .fh-cfill{position:absolute;inset:0 auto 0 0;width:var(--fh-q,0%);pointer-events:none;
    transition:width .6s cubic-bezier(.27,.98,.59,.98),background .45s ease}
  .fh-consumo .fh-cico{position:relative;display:flex;align-items:center;justify-content:center;
    width:38px;height:38px;flex:0 0 auto;border-radius:12px;
    background:rgba(255,255,255,.07);transition:background .45s ease,color .45s ease}
  .fh-consumo .fh-cico ha-icon{--mdc-icon-size:21px}
  .fh-consumo .fh-ctxt{position:relative;display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
  .fh-consumo .fh-ctxt b{font-size:clamp(18px,4.6vw,23px);font-weight:900;letter-spacing:-.01em;line-height:1.1}
  .fh-consumo .fh-ctxt small{font-size:11px;font-weight:600;color:var(--fh-muted,#93a1b0);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-consumo .fh-cgo{position:relative;opacity:.5}
  .fh-consumo .fh-cgo ha-icon{--mdc-icon-size:20px}
  /* --fh-int (0..1, scritta dal JS) e quanto si sta consumando DENTRO il
     livello: il verde di 30 W non e il verde di 480 W, l'ambra di 1550 W non
     e quella di 2800 W. */
  .fh-consumo.basso .fh-cfill{background:linear-gradient(90deg,
    rgba(52,211,153,calc(.10 + var(--fh-int,.5) * .18)),rgba(52,211,153,.04))}
  .fh-consumo.basso .fh-cico{background:rgba(52,211,153,calc(.10 + var(--fh-int,.5) * .16));color:#34d399}
  .fh-consumo.medio{border-color:rgba(255,176,32,calc(.32 + var(--fh-int,.5) * .36))}
  .fh-consumo.medio .fh-cfill{background:linear-gradient(90deg,
    rgba(255,176,32,calc(.16 + var(--fh-int,.5) * .26)),rgba(255,176,32,.06))}
  .fh-consumo.medio .fh-cico{background:rgba(255,176,32,calc(.14 + var(--fh-int,.5) * .18));color:#ffb020}
  /* Sopra la soglia alta il bordo si accende e respira: un colore fermo lo si
     smette di vedere dopo due minuti, uno che pulsa no. */
  .fh-consumo.alto{border-color:rgba(255,84,66,calc(.5 + var(--fh-int,.5) * .4));
    box-shadow:0 0 0 1px rgba(255,84,66,calc(.12 + var(--fh-int,.5) * .16)),
      0 10px calc(20px + var(--fh-int,.5) * 16px) rgba(255,84,66,calc(.12 + var(--fh-int,.5) * .18));
    animation:fhConsumoAllarme 2.6s ease-in-out infinite}
  .fh-consumo.alto .fh-cfill{background:linear-gradient(90deg,
    rgba(255,84,66,calc(.22 + var(--fh-int,.5) * .26)),rgba(255,84,66,.08))}
  .fh-consumo.alto .fh-cico{background:rgba(255,84,66,calc(.16 + var(--fh-int,.5) * .2));color:#ff7a6b}
  @keyframes fhConsumoAllarme{
    0%,100%{box-shadow:0 0 0 1px rgba(255,84,66,.18),0 10px 26px rgba(255,84,66,.14)}
    50%{box-shadow:0 0 0 1px rgba(255,84,66,.40),0 12px 32px rgba(255,84,66,.28)}}
  @media (prefers-reduced-motion: reduce){ .fh-consumo.alto{animation:none} }

  /* La classifica dentro al foglio */
  .fh-ctot{display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:16px;margin-bottom:12px;
    background:rgba(127,127,127,.08);border:1px solid var(--divider-color,rgba(127,127,127,.2))}
  .fh-ctot b{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1}
  .fh-ctot small{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;opacity:.7}
  .fh-ctot.medio{border-color:rgba(255,176,32,.5);background:rgba(255,176,32,.10)}
  .fh-ctot.medio b{color:#d98b00}
  .fh-ctot.alto{border-color:rgba(255,84,66,.55);background:rgba(255,84,66,.10)}
  .fh-ctot.alto b{color:#e03e2d}
  .fh-clist{display:flex;flex-direction:column;gap:7px}
  .fh-crow{display:grid;grid-template-columns:minmax(0,1fr) 84px auto;align-items:center;gap:10px;
    font-size:12.5px;font-weight:700;color:var(--primary-text-color)}
  .fh-crow.spento{opacity:.42}
  .fh-cn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-cb{height:7px;border-radius:99px;background:rgba(127,127,127,.18);overflow:hidden}
  .fh-cb i{display:block;height:100%;border-radius:99px;
    background:linear-gradient(90deg,#ffc55c,#ffb020);transition:width .5s ease}
  .fh-cw{font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:800}
  .fh-cw em{font-style:normal;font-weight:700;opacity:.55;font-size:11px}
  .fh-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
  .fh-tag{display:inline-flex;align-items:center;gap:6px;padding:6px 8px 6px 11px;border-radius:999px;
    font-size:11.5px;font-weight:700;color:var(--primary-text-color);
    background:rgba(127,127,127,.10);border:1px solid var(--divider-color,rgba(127,127,127,.2))}
  .fh-tag button{width:18px;height:18px;border-radius:50%;border:none;cursor:pointer;font:inherit;font-size:13px;
    line-height:1;background:rgba(127,127,127,.20);color:inherit}
  .fh-rowwrap{display:flex;flex-direction:column;gap:8px}
  .fh-tools{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:5px 8px;border-radius:12px;
    background:rgba(255,176,32,.10);border:1px dashed rgba(255,176,32,.35)}
  .fh-tools.sub{background:rgba(255,255,255,.05);border-style:solid;border-color:var(--fh-stroke,rgba(255,255,255,.1))}
  .fh-tools.card{border:none;background:none;padding:0 0 4px;justify-content:flex-end;flex:0 0 auto}
  .fh-toolslabel{flex:1;min-width:52px;font-size:10.5px;font-weight:800;letter-spacing:.05em;
    text-transform:uppercase;color:var(--fh-muted,#93a1b0)}
  .fh-tool{width:30px;height:30px;border-radius:9px;border:1px solid var(--fh-stroke,rgba(255,255,255,.12));
    background:var(--fh-panel,rgba(255,255,255,.06));color:var(--fh-muted,#93a1b0);cursor:pointer;
    display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .fh-tool ha-icon{--mdc-icon-size:16px}
  .fh-tool:hover{color:var(--fh-ink,#eaf1f8)}
  .fh-tool.acceso{border-color:rgba(255,176,32,.5);background:rgba(255,176,32,.16);color:var(--fh-c-soft,#ffe9c2)}
  .fh-span{width:28px;height:28px;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:800;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:transparent;color:var(--fh-muted,#93a1b0)}
  .fh-span.sel{border-color:#ffb020!important;background:#ffb020!important;color:#12161c!important;font-weight:800!important}
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
  /* Il foglio delle impostazioni e configurazione: DEVE essere sempre solido
     e opaco, mai trasparente, altrimenti le scritte si sovrappongono alle
     card e allo sfondo sottostante risultando illeggibili. */
  .fh-sheet{width:100%;max-width:620px;max-height:86vh;display:flex;flex-direction:column;
    background:#161c26!important;
    color:#eaf1f8!important;
    --ha-card-background:#161c26!important;
    --card-background-color:#1f2633!important;
    --primary-text-color:#eaf1f8!important;
    --secondary-text-color:#93a1b0!important;
    --divider-color:rgba(255,255,255,.14)!important;
    border:1px solid rgba(255,255,255,.14);
    border-bottom:none;border-radius:24px 24px 0 0;box-shadow:0 -16px 50px rgba(0,0,0,.65)}
  .fh-sheethead{display:flex;align-items:center;gap:10px;padding:14px 16px 8px}
  .fh-sheettitle{flex:1;font-size:16px;font-weight:800;color:#eaf1f8!important}
  .fh-sheetbody{flex:1 1 auto;min-height:0;overflow-y:auto;padding:4px 16px 24px;display:flex;flex-direction:column;gap:10px}

  .fh-sheetfoot{flex:0 0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
    padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));
    background:#161c26!important;
    color:#eaf1f8!important;
    --ha-card-background:#161c26!important;
    --card-background-color:#1f2633!important;
    border-top:1px solid rgba(255,255,255,.14)}
  .fh-app.chiaro .fh-sheet,
  .fh-app.chiaro .fh-sheetfoot{
    background:#ffffff!important;
    color:#12161c!important;
    --ha-card-background:#ffffff!important;
    --card-background-color:#f4f6f9!important;
    --primary-text-color:#12161c!important;
    --secondary-text-color:#5a6878!important;
    --divider-color:rgba(15,23,42,.12)!important;
    border-color:rgba(15,23,42,.14)!important;
  }
  .fh-app.chiaro .fh-sheettitle{color:#12161c!important}
  .fh-footmsg{flex:1;min-width:120px;font-size:11.5px;color:var(--secondary-text-color)}
  .fh-catgroup{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
    color:var(--secondary-text-color);margin-top:8px}
  .fh-catlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
  .fh-catitem{display:flex;align-items:center;gap:8px;padding:11px;border-radius:14px;cursor:pointer;font:inherit;
    border:1px solid rgba(255,255,255,.12);background:#1f2633;
    color:var(--primary-text-color);font-size:12.5px;font-weight:700;text-align:left}
  .fh-catitem ha-icon{--mdc-icon-size:20px;color:var(--fh-c-acc,#ffb020);flex:0 0 auto}
  .fh-catitem:hover{border-color:rgba(255,176,32,.5)}
  .fh-json{width:100%;min-height:120px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;
    line-height:1.45;padding:10px;border-radius:12px;box-sizing:border-box;
    border:1px solid rgba(255,255,255,.12);background:#1f2633;color:var(--primary-text-color)}
  .fh-note{font-size:11.5px;color:var(--secondary-text-color)}
  .fh-pagerow{display:flex;align-items:center;gap:6px;padding:8px;border-radius:12px;
    border:1px solid rgba(255,255,255,.12);background:#1f2633}
  .fh-pagerow ha-icon{--mdc-icon-size:18px;color:var(--fh-c-acc,#ffb020);flex:0 0 auto}
  .fh-input{flex:1;min-width:0;padding:8px 10px;border-radius:9px;font:inherit;font-size:13px;
    border:1px solid rgba(255,255,255,.12);background:#1f2633;color:var(--primary-text-color)}
  .fh-input.small{flex:0 0 110px}

  .fh-cardwrap{position:relative}
  .fh-tap{position:absolute;inset:0;cursor:pointer;border-radius:18px}
  .fh-cardwrap.has-popup:hover .fh-tap{background:rgba(255,255,255,.04)}
  .fh-popscrim{position:fixed;inset:0;z-index:25;background:rgba(5,8,13,.62);backdrop-filter:blur(7px);
    display:flex;align-items:flex-end;justify-content:center}
  .fh-popup{width:100%;max-width:620px;max-height:88vh;display:flex;flex-direction:column;
    background:#161c26!important;color:#eaf1f8!important;
    border:1px solid rgba(255,255,255,.14)!important;
    border-bottom:none;border-radius:26px 26px 0 0;box-shadow:0 -18px 54px rgba(0,0,0,.65);
    animation:fhPopUp .22s ease-out}
  .fh-app.chiaro .fh-popup{
    background:#ffffff!important;color:#12161c!important;
    border-color:rgba(15,23,42,.14)!important;
  }
  @keyframes fhPopUp{from{transform:translateY(20px);opacity:.5}to{transform:translateY(0);opacity:1}}
  .fh-pophead{display:flex;align-items:center;gap:10px;padding:16px 18px 8px}
  .fh-poptitle{flex:1;font-size:17px;font-weight:800;color:var(--fh-ink,#eaf1f8)}
  .fh-popbody{overflow-y:auto;padding:4px 16px 24px;display:flex;flex-direction:column;gap:14px}
  .fh-pcrow{display:flex;align-items:center;gap:6px;padding:9px 11px;border-radius:12px;
    border:1px solid rgba(255,255,255,.12);background:#1f2633}
  .fh-pcname{flex:1;min-width:0;font-size:12.5px;font-weight:700;color:var(--primary-text-color);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .fh-addbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
  .fh-addbar .fh-addrow{flex:1;min-width:150px;margin-top:0}
  .fh-roomrow{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:14px;cursor:pointer;
    border:1px solid rgba(255,255,255,.12);background:#1f2633}
  .fh-roomrow input{width:auto;flex:0 0 auto}
  .fh-roominfo{display:flex;flex-direction:column;gap:2px;min-width:0}
  .fh-dvlist{display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow-y:auto}
  .fh-dv{display:flex;flex-direction:column;gap:2px;padding:11px 13px;border-radius:14px;cursor:pointer;
    text-align:left;font:inherit;border:1px solid rgba(255,255,255,.12);background:#1f2633}
  .fh-dv:hover{border-color:rgba(255,176,32,.55)}
  .fh-dvname{font-size:13.5px;font-weight:700;color:var(--primary-text-color)}
  .fh-dvmeta{font-size:11px;font-weight:600;color:var(--secondary-text-color)}
  .fh-sgroup{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
    color:var(--secondary-text-color);margin-top:14px}
  .fh-slab{font-size:12.5px;font-weight:700;color:var(--primary-text-color)}
  .fh-srow{display:flex;gap:10px}
  .fh-sfield{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
  .fh-check{display:flex;align-items:center;gap:11px;font-size:13.5px;font-weight:600;
    color:var(--primary-text-color);cursor:pointer;margin:4px 0}
  .fh-check input[type="checkbox"]{width:19px;height:19px;accent-color:#ffb020;cursor:pointer;flex:0 0 auto}
  .fh-sheet .fh-rangeval{color:#ffb020!important;font-weight:800}

  .fh-seg{display:flex;gap:6px;padding:4px;border-radius:14px;
    background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.08)}
  .fh-segbtn{flex:1;padding:9px 10px;border-radius:10px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;
    border:1px solid transparent;background:transparent;color:#93a1b0;transition:all .18s ease;
    display:flex;align-items:center;justify-content:center;gap:6px;text-align:center}
  .fh-segbtn:hover:not(.sel){color:#eaf1f8;background:rgba(255,255,255,.06)}
  .fh-segbtn.sel{
    background:#ffb020!important;
    border-color:#ffb020!important;
    color:#12161c!important;
    font-weight:800!important;
    box-shadow:0 2px 10px rgba(255,176,32,.4)!important;
  }
  .fh-segbtn.sel::before{
    content:"\u2713 ";
    font-size:12.5px;
    font-weight:900;
    line-height:1;
  }
  .fh-chiprow{display:flex;flex-direction:column;gap:8px;padding:11px;border-radius:14px;
    border:1px solid rgba(255,255,255,.12);background:#1f2633}
  .fh-chiptools{display:flex;gap:6px;justify-content:flex-end}

  .fh-app.chiaro .fh-seg{
    background:rgba(15,23,42,.06);
    border-color:rgba(15,23,42,.1);
  }
  .fh-app.chiaro .fh-segbtn{
    color:#5a6878;
    background:transparent;
    border-color:transparent;
  }
  .fh-app.chiaro .fh-segbtn:hover:not(.sel){
    color:#0f172a;
    background:rgba(15,23,42,.05);
  }
  .fh-app.chiaro .fh-segbtn.sel{
    background:#ffb020!important;
    border-color:#f59e0b!important;
    color:#12161c!important;
    font-weight:800!important;
    box-shadow:0 2px 8px rgba(245,158,11,.32)!important;
  }

  .fh-app.chiaro .fh-sheet .fh-catitem,
  .fh-app.chiaro .fh-sheet .fh-json,
  .fh-app.chiaro .fh-sheet .fh-pagerow,
  .fh-app.chiaro .fh-sheet .fh-input,
  .fh-app.chiaro .fh-sheet .fh-pcrow,
  .fh-app.chiaro .fh-sheet .fh-roomrow,
  .fh-app.chiaro .fh-sheet .fh-dv,
  .fh-app.chiaro .fh-sheet .fh-chiprow{
    background:#f4f6f9!important;
    color:#12161c!important;
    border-color:rgba(15,23,42,.12)!important;
  }
  
  .fh-chip.warn{border-color:rgba(255,176,32,.5);color:#ffb020}
  .fh-chip.warn ha-icon{color:#ffb020;animation:fhPulse 1.4s infinite ease-in-out}
  .fh-chip.danger{border-color:rgba(255,84,66,.6);color:#ff5442;background:rgba(255,84,66,.12)!important}
  .fh-chip.danger ha-icon{color:#ff5442;animation:fhPulse 1.2s infinite ease-in-out}
  @keyframes fhPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.05);opacity:.85}}
  .fh-offbody{display:flex;flex-direction:column;gap:12px;padding:6px 2px}
  .fh-off-allgood{padding:28px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
  .fh-off-allgood ha-icon{--mdc-icon-size:48px;color:#38e08a}
  .fh-off-allgood b{font-size:16px}
  .fh-off-allgood small{font-size:12px;opacity:.7}
  .fh-off-head{display:flex;flex-direction:column;gap:2px}
  .fh-off-head b{font-size:14px;color:#ff5442}
  .fh-off-head small{font-size:11.5px;opacity:.7}
  .fh-off-list{display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto}
  .fh-off-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;
    background:rgba(255,84,66,.1);border:1px solid rgba(255,84,66,.25);cursor:pointer}
  .fh-off-item ha-icon{--mdc-icon-size:22px;color:#ff5442;flex:0 0 auto}
  .fh-off-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
  .fh-off-name{font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-off-id{font-size:10px;opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fh-off-act{padding:4px 10px;border-radius:8px;border:none;background:rgba(255,255,255,.1);
    color:inherit;font:inherit;font-size:10.5px;font-weight:700;cursor:pointer}
  .fh-off-item.ignorato{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);cursor:default}
  .fh-anom .fh-off-head b{color:#ff8a3d}
  .fh-app.chiaro .fh-anom .fh-off-head b{color:#c2410c}
  .fh-anom-tasti{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
  .fh-anom-tasti .fh-off-act{padding:9px 14px;font-size:12px;border-radius:11px}
  .fh-anom-tasti .fh-off-act.pieno{background:linear-gradient(135deg,#ffb020,#e09810);color:#1c1400}
  .fh-off-item.ignorato ha-icon{color:inherit;opacity:.55}
  .fh-app.chiaro .fh-off-act{background:rgba(15,23,42,.08)}
  .fh-app.chiaro .fh-off-item.ignorato{background:rgba(15,23,42,.03);border-color:rgba(15,23,42,.1)}

  
  /* ======================== TABLET SPECIFIC STYLES ======================== */
  .fh-app.tab .fh-head{
    padding:14px 20px 6px;
    max-width:980px;
    margin-inline:auto;
    width:100%;
    box-sizing:border-box;
  }
  .fh-app.tab .fh-main{
    padding:8px 20px calc(var(--fh-navh,96px) + 16px);
    max-width:980px;
    margin-inline:auto;
    width:100%;
    box-sizing:border-box;
    gap:12px;
  }
  .fh-app.tab .fh-clock{font-size:36px}
  .fh-app.tab .fh-row{gap:12px}
  .fh-app.tab .fh-col{gap:12px;min-width:0}
  .fh-app.tab .fh-navbar{
    max-width:640px;
    padding:8px 14px;
    gap:6px;
  }
  /* SUL TABLET OGNI CARD RIEMPIE LA SUA CELLA. Cancello e Spesa avevano un
     tetto di 180px e le persone (card quadrate) di 240px, centrate in colonne
     da 464: in ogni riga c'erano vuoti diversi e la pagina sembrava messa a
     caso (Cristian: "sul tablet le card sono disposte in maniera casuale").
     Riempiendo la cella tutte le righe cadono sulle stesse linee: le righe da
     due card su due meta uguali, le tessere su sei colonne (tre tessere =
     mezza riga), le card larghe su tutta la riga. */
  .fh-app.tab .fh-slot.quadra:not(.tessera){max-width:none;aspect-ratio:auto!important;
    height:190px;min-height:0;align-self:stretch}
  .fh-app.tab .fh-slot.quadra:not(.tessera) ha-card,
  .fh-app.tab .fh-slot.quadra:not(.tessera) .fp{aspect-ratio:auto!important}
  /* Sul tablet le TESSERE (righe fatte solo di Mini Card) si fanno piccole e
     fitte. Solo loro: prima il tetto dei 190px valeva per ogni card, e clima,
     consumi, meteo e carichi finivano schiacciati in una striscia. */
  .fh-app.tab .fh-row.piatta.tessere{
    grid-template-columns:repeat(auto-fill,minmax(140px,1fr))!important;
    gap:10px;
  }
  .fh-app.tab .fh-slot.tessera{
    max-width:190px;
  }
  /* Le animazioni delle icone le decide la Mini Card, non il pannello: lei
     distingue "accesa ma ferma" da "sta lavorando" (il microonde a 1 W non
     deve girare). Un blocco che le riaccendeva su .on con !important e le
     sue @keyframes con valori diversi e stato tolto in 0.99.19. */

  /* ======================== PHONE SPECIFIC STYLES ======================== */
  .fh-app.tel .fh-head{padding:14px 14px 6px}
  .fh-app.tel .fh-main{padding:6px 12px calc(var(--fh-navh,108px) + 16px)}
  .fh-app.tel .fh-clock{font-size:34px}
  .fh-app.tel .fh-catlist{grid-template-columns:1fr}
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
// Due vesti per ogni condizione: quella di giorno e quella di notte.
// Il tempo che fa decide il CARATTERE (pioggia bluastra, nebbia terrosa,
// temporale violaceo); l'ora decide se quel carattere e chiaro o scuro.
// Prima esisteva solo la versione diurna: a mezzanotte, con "nuvoloso", la
// card restava un rettangolo grigio chiaro con la scritta scura in mezzo a un
// pannello tutto notturno. Le voci "n*" sono la stessa tinta portata a notte,
// non un grigio qualunque: la neve resta fredda, la nebbia resta terrosa.
const FW_SKIN = {
  sunny:            { a: "#ffe6ad", b: "#ffc768", ink: "#6b4310", soft: "rgba(255,255,255,.55)", cap: "#8a5c1c", art: "sun",
                      na: "#4b3d63", nb: "#2b2440", nink: "#ffe7bd", nsoft: "rgba(255,255,255,.12)", ncap: "#d9c39a" },
  "clear-night":    { a: "#39406f", b: "#232a52", ink: "#f0eeff", soft: "rgba(255,255,255,.12)", cap: "#bdb8e6", art: "moon",
                      na: "#39406f", nb: "#232a52", nink: "#f0eeff", nsoft: "rgba(255,255,255,.12)", ncap: "#bdb8e6" },
  partlycloudy:     { a: "#dfe9f5", b: "#bcd0e6", ink: "#2b3a4d", soft: "rgba(255,255,255,.6)",  cap: "#4d6076", art: "partly",
                      na: "#33405c", nb: "#1f2740", nink: "#e6eefb", nsoft: "rgba(255,255,255,.11)", ncap: "#adbfd6" },
  "partlycloudy-night": { a: "#39406f", b: "#232a52", ink: "#f0eeff", soft: "rgba(255,255,255,.12)", cap: "#bdb8e6", art: "partlynight",
                      na: "#39406f", nb: "#232a52", nink: "#f0eeff", nsoft: "rgba(255,255,255,.12)", ncap: "#bdb8e6" },
  cloudy:           { a: "#e2e7ee", b: "#c3ccd8", ink: "#2f3946", soft: "rgba(255,255,255,.6)",  cap: "#525f6e", art: "cloud",
                      na: "#333a45", nb: "#20252e", nink: "#e4e9f0", nsoft: "rgba(255,255,255,.11)", ncap: "#a9b3c0" },
  rainy:            { a: "#cbdded", b: "#9fbdd6", ink: "#1e3245", soft: "rgba(255,255,255,.5)",  art: "rain", cap: "#3c5b75",
                      na: "#25384c", nb: "#152230", nink: "#dbe9f6", nsoft: "rgba(255,255,255,.10)", ncap: "#9dbcd4" },
  pouring:          { a: "#b9d0e4", b: "#87a9c7", ink: "#16283a", soft: "rgba(255,255,255,.45)", art: "pour", cap: "#33506b",
                      na: "#1e3145", nb: "#101c28", nink: "#d3e6f5", nsoft: "rgba(255,255,255,.10)", ncap: "#8fb2cd" },
  snowy:            { a: "#eef5fb", b: "#d3e6f3", ink: "#23374b", soft: "rgba(255,255,255,.65)", cap: "#456079", art: "snow",
                      na: "#2e3d4d", nb: "#1b2530", nink: "#e9f3fb", nsoft: "rgba(255,255,255,.12)", ncap: "#b3c7d8" },
  "snowy-rainy":    { a: "#e4eef7", b: "#c6dcec", ink: "#22364a", soft: "rgba(255,255,255,.6)",  cap: "#44607a", art: "sleet",
                      na: "#2b3a4a", nb: "#19232e", nink: "#e5eff8", nsoft: "rgba(255,255,255,.11)", ncap: "#aec2d3" },
  fog:              { a: "#e9e7e1", b: "#cfccc4", ink: "#3a3830", soft: "rgba(255,255,255,.6)",  cap: "#5d5a50", art: "fog",
                      na: "#3a3833", nb: "#232220", nink: "#ece9e2", nsoft: "rgba(255,255,255,.11)", ncap: "#b5b0a5" },
  hail:             { a: "#dce8f2", b: "#b6cddf", ink: "#1f3345", soft: "rgba(255,255,255,.5)",  cap: "#3e5a72", art: "hail",
                      na: "#27384a", nb: "#16222e", nink: "#dceaf6", nsoft: "rgba(255,255,255,.11)", ncap: "#9bb8cf" },
  windy:            { a: "#e3ece9", b: "#c2d5cf", ink: "#263b36", soft: "rgba(255,255,255,.6)",  cap: "#476059", art: "wind",
                      na: "#2b3a36", nb: "#192421", nink: "#e2ede9", nsoft: "rgba(255,255,255,.11)", ncap: "#a7bdb6" },
  "windy-variant":  { a: "#e3ece9", b: "#c2d5cf", ink: "#263b36", soft: "rgba(255,255,255,.6)",  cap: "#476059", art: "wind",
                      na: "#2b3a36", nb: "#192421", nink: "#e2ede9", nsoft: "rgba(255,255,255,.11)", ncap: "#a7bdb6" },
  lightning:        { a: "#ded4f2", b: "#b9a6e0", ink: "#2f2153", soft: "rgba(255,255,255,.5)",  cap: "#513c7d", art: "storm",
                      na: "#372a5c", nb: "#20183a", nink: "#e9deff", nsoft: "rgba(255,255,255,.11)", ncap: "#b7a4e0" },
  "lightning-rainy":{ a: "#d6cbee", b: "#ad98da", ink: "#2a1d4d", soft: "rgba(255,255,255,.45)", art: "storm", cap: "#4a3572",
                      na: "#31255a", nb: "#1b1436", nink: "#e5d9ff", nsoft: "rgba(255,255,255,.11)", ncap: "#ae9bdc" },
  exceptional:      { a: "#ffdcd2", b: "#f6b09b", ink: "#5c2415", soft: "rgba(255,255,255,.5)",  cap: "#8a4230", art: "sun",
                      na: "#4d2a20", nb: "#2b1712", nink: "#ffdccf", nsoft: "rgba(255,255,255,.11)", ncap: "#d9a08c" },
};
// Che condizione mostrare ADESSO. Alcuni servizi meteo (Open-Meteo) dicono
// "sereno" anche di notte, senza distinguere "sereno notturno": senza questo
// la card disegnava il sole alle otto di sera. Il sole sotto l'orizzonte lo
// sa Home Assistant, e non dipende dal servizio meteo.
function fwNotte(hass) {
  const s = hass && hass.states && hass.states["sun.sun"];
  return !!s && s.state === "below_horizon";
}
const FW_NOTTE = { sunny: "clear-night", partlycloudy: "partlycloudy-night" };

// Alba e tramonto di oggi, in ore decimali: per le prossime 24 ore spostano
// di un minuto, quindi valgono anche per domani mattina.
function fwOreLuce(hass) {
  const s = hass && hass.states && hass.states["sun.sun"];
  const a = s && s.attributes;
  const oreDi = iso => { const d = new Date(iso); return isNaN(d) ? null : d.getHours() + d.getMinutes() / 60; };
  const alba = a && (oreDi(a.next_rising) != null ? oreDi(a.next_rising) : null);
  const tram = a && (oreDi(a.next_setting) != null ? oreDi(a.next_setting) : null);
  return { alba: alba != null ? alba : 7, tramonto: tram != null ? tram : 19 };
}

function fwStatoOraData(stato, data, hass) {
  if (!FW_NOTTE[stato]) return stato;
  const l = fwOreLuce(hass);
  const h = data.getHours() + data.getMinutes() / 60;
  return (h < l.alba || h >= l.tramonto) ? FW_NOTTE[stato] : stato;
}
function fwStatoOra(hass, stato) {
  return (fwNotte(hass) && FW_NOTTE[stato]) ? FW_NOTTE[stato] : stato;
}

// IL RADAR DELLA PIOGGIA.
// Niente librerie di mappe: una mappa a tasselli e aritmetica, e nove
// immagini bastano a coprire lo schermo. Il fondo viene da CARTO, la pioggia
// da RainViewer (gratis, senza chiave). Le stesse coordinate di casa che usa
// Home Assistant, cosi il centro e casa tua e non una citta a caso.
// A questo ingrandimento un tassello da 256 px copre circa 230 km: su un
// telefono si vedono ~300 km intorno a casa. RainViewer gratis non va oltre.
const FW_RADAR_Z = 7;
const FW_RADAR_N = 3;              // tasselli per lato (5 se lo schermo e largo)

function fwTassello(lat, lon, z) {
  const n = Math.pow(2, z);
  const x = (lon + 180) / 360 * n;
  const r = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
  return { x, y };
}

// Le griglie di immagini: fondo e pioggia hanno la stessa disposizione.
function fwGriglia(cx, cy, url, n) {
  const mezzo = Math.floor((n || FW_RADAR_N) / 2);
  const out = [];
  for (let dy = -mezzo; dy <= mezzo; dy++) {
    for (let dx = -mezzo; dx <= mezzo; dx++) {
      out.push(`<img src="${url(cx + dx, cy + dy)}" width="256" height="256" loading="lazy" alt=""
        style="position:absolute;left:${(dx + mezzo) * 256}px;top:${(dy + mezzo) * 256}px">`);
    }
  }
  return out.join("");
}

function fwSkin(state) {
  const sk = FW_SKIN[state] || FW_SKIN.partlycloudy;
  return Object.assign({ cap: sk.ink }, sk);
}

// Disegni morbidi al posto delle icone piatte, e soprattutto VIVI: il sole
// gira, la pioggia cade, le nuvole scorrono, il fulmine lampeggia. Le
// animazioni si fermano da sole se il sistema chiede meno movimento.
// La fase della luna dalla data: giorni passati dal novilunio del 6 gennaio
// 2000 alle 18:14 UTC, divisi per il mese sinodico. Per un disegno basta e
// avanza: l'errore e di qualche ora su un ciclo di ventinove giorni e mezzo.
const FW_SINODICO = 29.530588853;

function fwFaseLuna(quando) {
  const d = quando instanceof Date && !isNaN(quando.getTime()) ? quando : new Date();
  const rif = Date.UTC(2000, 0, 6, 18, 14, 0);
  let p = ((d.getTime() - rif) / 86400000 / FW_SINODICO) % 1;
  if (p < 0) p += 1;
  return { p, k: (1 - Math.cos(2 * Math.PI * p)) / 2, nome: fwNomeFase(p) };
}

// I nomi che si usano davvero guardando in su, non le otto etichette inglesi.
function fwNomeFase(p) {
  const g = p * FW_SINODICO;
  if (g < 1.1 || g > 28.4) return "Luna nuova";
  if (g < 6.4) return "Luna crescente";
  if (g < 8.4) return "Primo quarto";
  if (g < 13.8) return "Gibbosa crescente";
  if (g < 15.8) return "Luna piena";
  if (g < 21.2) return "Gibbosa calante";
  if (g < 23.2) return "Ultimo quarto";
  return "Luna calante";
}

// I gradienti hanno bisogno di un nome unico: lo stesso sole compare nella
// card e in ogni riga delle previsioni, e due <defs> con lo stesso id nella
// stessa pagina si sovrascrivono a vicenda.
let FW_SEME = 0;

// IL DISCO DELLA LUNA, con la fase di quel momento. Restituisce i pezzi da
// infilare in un disegno piu grande: cosi la luna di "sereno di notte" e
// quella dietro la nuvola di "poco nuvoloso di notte" sono la stessa luna.
function fwLunaPezzi(u, cx, cy, r, quando) {
  const f = fwFaseLuna(quando);
  const d0 = Math.cos(2 * Math.PI * f.p);
  const rx = (Math.abs(d0) * r).toFixed(2);
  const cresce = f.p < 0.5;
  const su = cx + " " + (cy - r), giu = cx + " " + (cy + r);
  const fuori = cresce ? 1 : 0;
  const term = cresce ? (d0 > 0 ? 0 : 1) : (d0 < 0 ? 0 : 1);
  const luce = `M ${su} A ${r} ${r} 0 0 ${fuori} ${giu} A ${rx} ${r} 0 0 ${term} ${su} Z`;
  const nuova = f.k < 0.035;
  const k = r / 26;      // i crateri seguono la scala del disco
  const cr = (x, y, rr) => `<circle cx="${(cx + (x - 50) * k).toFixed(1)}" cy="${(cy + (y - 50) * k).toFixed(1)}" r="${(rr * k).toFixed(1)}"/>`;
  return {
    fase: f,
    defs: `<radialGradient id="${u}l" cx="36%" cy="30%" r="78%">
        <stop offset="0%" stop-color="#fffdf3"/><stop offset="55%" stop-color="#ffeec4"/>
        <stop offset="100%" stop-color="#e9c887"/></radialGradient>
      <radialGradient id="${u}g" cx="50%" cy="50%" r="50%">
        <stop offset="50%" stop-color="rgba(255,236,190,.26)"/>
        <stop offset="100%" stop-color="rgba(255,236,190,0)"/></radialGradient>
      <clipPath id="${u}c"><path d="${luce}"/></clipPath>`,
    disco: `<circle class="fw-halo" cx="${cx}" cy="${cy}" r="${(r * 1.62).toFixed(1)}" fill="url(#${u}g)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,.06)"
        stroke="rgba(255,246,222,${nuova ? ".40" : ".16"})" stroke-width="1"/>
      ${nuova ? "" : `<path d="${luce}" fill="url(#${u}l)"/>
      <g clip-path="url(#${u}c)" fill="#c2a26a" opacity=".26">
        ${cr(43, 41, 6.2)}${cr(58, 58, 4.6)}${cr(47, 63, 3.1)}${cr(61, 39, 2.7)}${cr(37, 55, 2.3)}${cr(52, 48, 1.9)}
      </g>`}`,
  };
}

// LE NUVOLE. Una nuvola vera non e una sagoma piatta con il bordo a onde: e
// un mucchio di gobbe, illuminate in cima e in ombra sotto. Qui sono cerchi
// sovrapposti che condividono lo stesso sfumato: gradientUnits="userSpaceOnUse"
// serve proprio a questo, altrimenti ogni cerchio avrebbe il suo e si
// vedrebbero le cuciture fra una gobba e l'altra.
const FW_NUBI = {
  chiara: ["#ffffff", "#f0f5fa", "#d5dfec"],
  media:  ["#f7fafd", "#d8e1ec", "#adbbcc"],
  scura:  ["#e2e8f1", "#a6b3c5", "#738398"],
};

function fwNubeDefs(u) {
  return Object.keys(FW_NUBI).map(t => {
    const c = FW_NUBI[t];
    return `<linearGradient id="${u}${t}" gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="66">
      <stop offset="0%" stop-color="${c[0]}"/><stop offset="55%" stop-color="${c[1]}"/>
      <stop offset="100%" stop-color="${c[2]}"/></linearGradient>`;
  }).join("");
}

function fwNube(u, x, y, sc, klass, tono, op) {
  const f = `url(#${u}${tono || "chiara"})`;
  return `<g class="${klass || ""}" transform="translate(${x} ${y}) scale(${sc})"${op != null ? ` opacity="${op}"` : ""}>
    <g class="fw-gonfia">
      <circle cx="46" cy="37" r="20" fill="${f}"/>
      <circle cx="27" cy="46" r="15" fill="${f}"/>
      <circle cx="64" cy="44" r="14.5" fill="${f}"/>
      <circle cx="75" cy="53" r="9" fill="${f}"/>
      <rect x="13" y="46" width="66" height="16" rx="8" fill="${f}"/>
      <ellipse cx="39" cy="26" rx="13" ry="6.5" fill="#ffffff" opacity=".42"/>
      <ellipse cx="60" cy="33" rx="8" ry="4" fill="#ffffff" opacity=".28"/>
    </g></g>`;
}

// L'ACQUA. Le gocce non sono tutte uguali ne cadono insieme: lunghezza,
// velocita, trasparenza e ritardo cambiano da goccia a goccia, e in fondo
// ogni tanto scoppia uno spruzzo. E' l'irregolarita a rendere credibile la
// pioggia, non il numero di gocce.
function fwAcquaDefs(u) {
  return `<linearGradient id="${u}acqua" gradientUnits="userSpaceOnUse" x1="0" y1="54" x2="0" y2="94">
      <stop offset="0%" stop-color="#cfe7fa" stop-opacity=".25"/>
      <stop offset="40%" stop-color="#8dc0e9"/>
      <stop offset="100%" stop-color="#5695d1"/></linearGradient>`;
}

function fwPioggia(u, n, forte) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = 16 + Math.round((i * 68) / Math.max(1, n - 1)) + (i % 2 ? 2 : -2);
    const lung = (forte ? 15 : 10) + (i % 3) * 4;
    const dur = (forte ? 0.85 : 1.55) + ((i * 7) % 5) * 0.17;
    const rit = ((i * 13) % 17) / (forte ? 11 : 6.5);
    const op = 0.48 + ((i * 5) % 3) * 0.18;
    out.push(`<g class="fw-goccia" style="animation-duration:${dur.toFixed(2)}s;animation-delay:${rit.toFixed(2)}s">
      <path d="M${x} 57 l-2.4 ${lung} a2.4 2.4 0 0 0 4.8 0 Z" fill="url(#${u}acqua)" opacity="${op.toFixed(2)}"
        transform="rotate(8 ${x} 57)"/></g>`);
  }
  return out.join("");
}

function fwSpruzzi() {
  return [28, 52, 74].map((x, i) => `<g transform="translate(${x} 92)">
    <ellipse class="fw-spruzzo" cx="0" cy="0" rx="7" ry="2.4" fill="none" stroke="#d6eafc" stroke-width="1.6"
      style="animation-delay:${(i * 0.8 + 0.4).toFixed(2)}s"/></g>`).join("");
}

// IL FIOCCO: sei braccia con le barbette, come quelli veri. Gira su se stesso
// mentre scende e ondeggia, perche la neve non cade dritta.
function fwFiocco(r) {
  const b = [0, 60, 120].map(a => `<g transform="rotate(${a})">
      <path d="M0 ${(-r).toFixed(1)} V${r.toFixed(1)}"/>
      <path d="M0 ${(-r * 0.62).toFixed(1)} l${(r * 0.3).toFixed(1)} ${(r * 0.26).toFixed(1)}"/>
      <path d="M0 ${(-r * 0.62).toFixed(1)} l${(-r * 0.3).toFixed(1)} ${(r * 0.26).toFixed(1)}"/>
      <path d="M0 ${(r * 0.62).toFixed(1)} l${(r * 0.3).toFixed(1)} ${(-r * 0.26).toFixed(1)}"/>
      <path d="M0 ${(r * 0.62).toFixed(1)} l${(-r * 0.3).toFixed(1)} ${(-r * 0.26).toFixed(1)}"/>
    </g>`).join("");
  return `<g fill="none" stroke-linecap="round">
    <g stroke="rgba(86,130,166,.38)" stroke-width="${(r * 0.46).toFixed(2)}">${b}</g>
    <g stroke="#ffffff" stroke-width="${(r * 0.26).toFixed(2)}">${b}</g>
  </g>`;
}

function fwNeve(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = 18 + Math.round((i * 64) / Math.max(1, n - 1)) + (i % 3 - 1) * 3;
    const r = 3.4 + (i % 3) * 1.3;
    const dur = 4.2 + ((i * 11) % 6) * 0.55;
    const rit = ((i * 17) % 23) / 4;
    const giro = 7 + (i % 4) * 3;
    out.push(`<g transform="translate(${x} 68)">
      <g class="fw-fiocco" style="animation-duration:${dur.toFixed(2)}s;animation-delay:${rit.toFixed(2)}s">
        <g class="fw-gira" style="animation-duration:${giro}s;animation-direction:${i % 2 ? "reverse" : "normal"}">
          ${fwFiocco(r)}</g></g></g>`);
  }
  return out.join("");
}

function fwArt(kind, size, still, quando) {
  const s = size || 76;
  const cls = still ? "" : " fw-anim";
  const u = "fw" + (++FW_SEME);
  const S = v => `<svg class="fw-art-svg${cls}" viewBox="0 0 100 100" width="${s}" height="${s}" style="display:block;overflow:visible">${v}</svg>`;
  const cloud = (x, y, sc, klass, tono, op) => fwNube(u, x, y, sc, klass, tono, op);
  const ND = `<defs>${fwNubeDefs(u)}</defs>`;
  switch (kind) {
    // Il sole di prima era un cerchio piatto con otto stecche uguali: una
    // icona, non un sole. Questo ha un disco che sfuma dal bianco caldo al
    // rame sul bordo, una corona che respira, e raggi affusolati lunghi e
    // corti alternati che pulsano sfalsati: la stessa forma che si disegna a
    // mano, con la luce che non e mai ferma.
    case "sun": return S(`
      <defs>
        <radialGradient id="${u}d" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stop-color="#fffbe8"/>
          <stop offset="42%" stop-color="#ffdb7a"/>
          <stop offset="80%" stop-color="#ffab26"/>
          <stop offset="100%" stop-color="#f7860c"/>
        </radialGradient>
        <radialGradient id="${u}c" cx="50%" cy="50%" r="50%">
          <stop offset="52%" stop-color="rgba(255,183,52,.42)"/>
          <stop offset="78%" stop-color="rgba(255,170,40,.16)"/>
          <stop offset="100%" stop-color="rgba(255,170,40,0)"/>
        </radialGradient>
        <linearGradient id="${u}r" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#ffb52c"/>
          <stop offset="100%" stop-color="#ffd980"/>
        </linearGradient>
      </defs>
      <g>
        <circle class="fw-halo" cx="50" cy="50" r="46" fill="url(#${u}c)"/>
        <g class="fw-rays">
          ${[0,30,60,90,120,150,180,210,240,270,300,330].map((d, i) => {
            const lungo = i % 2 === 0;
            const punta = lungo ? 8 : 15;      // quanto arriva in alto
            const base = lungo ? 4.6 : 3.4;    // meta larghezza alla base
            return `<path class="fw-raggio" d="M50 ${punta} L${50 + base} 30 Q50 27.5 ${50 - base} 30 Z"
              fill="url(#${u}r)" transform="rotate(${d} 50 50)" style="animation-delay:${(i * 0.31).toFixed(2)}s"/>`;
          }).join("")}
        </g>
        <circle cx="50" cy="50" r="22.5" fill="url(#${u}d)"/>
        <path d="M36 41 Q44 32 57 33" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>
      </g>`);
    // La luna non e una falce sempre uguale: e quella di stanotte, disegnata
    // dal pezzo condiviso con il poco nuvoloso notturno.
    case "moon": {
      const L = fwLunaPezzi(u, 50, 50, 26, quando);
      return S(`
        <defs>${L.defs}</defs>
        <g>
          <title>${fhEsc(L.fase.nome)} · ${Math.round(L.fase.k * 100)}% illuminata</title>
          ${L.disco}
          <circle class="fw-star fw-s1" cx="20" cy="22" r="2.4" fill="#fff5dd"/>
          <circle class="fw-star fw-s2" cx="83" cy="28" r="1.8" fill="#fff5dd"/>
          <circle class="fw-star fw-s3" cx="79" cy="76" r="2.1" fill="#fff5dd"/>
          <circle class="fw-star fw-s2" cx="14" cy="63" r="1.5" fill="#fff5dd"/>
        </g>`);
    }
    case "partlynight": {
      const L = fwLunaPezzi(u, 32, 28, 15, quando);
      return S(`
        <defs>${L.defs}${fwNubeDefs(u)}</defs>
        <g>
          <title>${fhEsc(L.fase.nome)} · ${Math.round(L.fase.k * 100)}% illuminata</title>
          ${L.disco}
          ${cloud(24, 34, .5, "fw-drift2", "media", .45)}
          ${cloud(6, 22, .86, "fw-drift", "chiara")}
        </g>`);
    }
    case "partly": return S(`
      <defs>
        ${fwNubeDefs(u)}
        <radialGradient id="${u}d" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stop-color="#fffbe8"/>
          <stop offset="45%" stop-color="#ffdb7a"/>
          <stop offset="100%" stop-color="#ffa41c"/>
        </radialGradient>
        <linearGradient id="${u}r" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#ffb52c"/>
          <stop offset="100%" stop-color="#ffd980"/>
        </linearGradient>
      </defs>
      <g>
        <g class="fw-rays fw-rays-sm">
          ${[0,45,90,135,180,225,270,315].map((d, i) => {
            const punta = i % 2 === 0 ? 3 : 8;
            return `<path d="M32 ${punta} L35.2 19 Q32 17.2 28.8 19 Z" fill="url(#${u}r)" transform="rotate(${d} 32 28)"/>`;
          }).join("")}
        </g>
        <circle cx="32" cy="28" r="15" fill="url(#${u}d)"/>
        ${cloud(24, 34, .5, "fw-drift2", "media", .45)}
        ${cloud(6, 22, .86, "fw-drift", "chiara")}
      </g>`);
    // Tre nuvole a tre distanze, che scorrono a tre velocita diverse: e la
    // profondita a far sembrare un cielo quello che altrimenti e un adesivo.
    case "cloud": return S(`${ND}<g>
      ${cloud(26, 30, .52, "fw-drift3", "media", .45)}
      ${cloud(6, 18, .74, "fw-drift2", "media", .75)}
      ${cloud(0, 4, 1, "fw-drift", "chiara")}
      </g>`);
    case "rain":
    case "pour": {
      const forte = kind === "pour";
      return S(`<defs>${fwNubeDefs(u)}${fwAcquaDefs(u)}</defs>
        <g>
          ${cloud(10, 6, .7, "fw-drift2", "media", .6)}
          ${cloud(0, 0, 1, "fw-drift", forte ? "scura" : "media")}
          ${fwPioggia(u, forte ? 13 : 8, forte)}
          ${fwSpruzzi()}
        </g>`);
    }
    case "snow": return S(`${ND}<g>
      ${cloud(10, 4, .7, "fw-drift2", "media", .6)}
      ${cloud(0, -2, 1, "fw-drift", "chiara")}
      ${fwNeve(7)}
      </g>`);
    // Nevischio: meta gocce e meta fiocchi, che e poi quello che scende.
    case "sleet": return S(`<defs>${fwNubeDefs(u)}${fwAcquaDefs(u)}</defs>
      <g>
        ${cloud(0, 0, 1, "fw-drift", "media")}
        ${fwPioggia(u, 4, false)}
        ${fwNeve(3)}
      </g>`);
    // Grandine: chicchi tondi e duri, piu veloci della neve e senza ondeggiare.
    // In fondo rimbalzano, perche il ghiaccio rimbalza.
    case "hail": return S(`${ND}<g>
      ${cloud(0, 0, 1, "fw-drift", "scura")}
      ${[24, 40, 56, 72].map((x, i) => `<g transform="translate(${x} 70)">
        <g class="fw-chicco" style="animation-duration:${(1 + (i % 3) * 0.2).toFixed(2)}s;animation-delay:${(i * 0.27).toFixed(2)}s">
          <circle cx="0" cy="0" r="${3.2 + (i % 2) * 0.9}" fill="#eaf4fd" stroke="#b9d6ee" stroke-width=".8"/>
        </g></g>`).join("")}
      </g>`);
    // Nebbia: banchi sfocati che passano a velocita diverse, non tre barrette.
    case "fog": return S(`
      <defs>${fwNubeDefs(u)}
        <filter id="${u}f" x="-40%" y="-60%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="3.4"/></filter>
      </defs>
      <g>
        ${cloud(4, -6, .95, "", "media", .5)}
        <g filter="url(#${u}f)">
          ${[[54, 10, 78, 7, .72, 9], [67, 4, 88, 9, .6, 13], [80, 16, 70, 8, .5, 11], [90, 8, 82, 6, .38, 16]]
            .map((b, i) => `<rect class="fw-banco" x="${b[1]}" y="${b[0]}" width="${b[2]}" height="${b[3]}" rx="${b[3] / 2}"
              fill="#ffffff" opacity="${b[4]}" style="animation-duration:${b[5]}s;animation-delay:${(i * 1.3).toFixed(1)}s;animation-direction:${i % 2 ? "reverse" : "normal"}"/>`).join("")}
        </g>
      </g>`);
    // Vento: la nuvola viene spinta di lato e le raffiche le passano sotto.
    case "wind": return S(`${ND}<g>
      ${cloud(8, 6, .66, "fw-drift2", "media", .55)}
      ${cloud(-2, -2, .96, "fw-spinta", "chiara")}
      ${[[62, 0, 1.1], [74, .5, 1.4], [86, 1.1, 1]].map((r, i) => `<path class="fw-raffica"
        d="M6 ${r[0]} q16 -7 32 0 t32 0" fill="none" stroke="#ffffff" stroke-width="${(r[2] * 2.6).toFixed(1)}"
        stroke-linecap="round" opacity=".8" style="animation-delay:${r[1]}s;animation-duration:${(3 + i * 0.6).toFixed(1)}s"/>`).join("")}
      </g>`);
    // Temporale: il lampo illumina anche la nuvola, non solo se stesso, e
    // arriva a scariche doppie come quelle vere.
    case "storm": return S(`<defs>${fwNubeDefs(u)}${fwAcquaDefs(u)}
        <radialGradient id="${u}b" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stop-color="rgba(255,240,180,.95)"/>
          <stop offset="100%" stop-color="rgba(255,240,180,0)"/>
        </radialGradient>
      </defs>
      <g>
        <circle class="fw-lampo" cx="50" cy="44" r="46" fill="url(#${u}b)"/>
        ${cloud(10, 4, .7, "fw-drift2", "scura", .7)}
        ${cloud(0, 0, 1, "fw-drift", "scura")}
        ${fwPioggia(u, 5, true)}
        <path class="fw-fulmine" d="M52 62 L36 88 L49 86 L42 100 L64 73 L51 75 Z" fill="#ffd54a"
          stroke="#fff3c4" stroke-width="1"/>
      </g>`);
    default: return S(`${ND}${cloud(0, 4, 1, "fw-drift", "chiara")}`);
  }
}

// Le animazioni stanno in un unico blocco riusato dalla card e dal popup.
// Regola della casa: durate lunghe e movimenti piccoli. Questa card sta
// accesa tutto il giorno davanti agli occhi, e un'animazione nervosa dopo
// dieci minuti da fastidio. Le durate delle gocce e dei fiocchi arrivano
// dallo stile in linea, cosi ognuno cade con il suo passo.
const FW_ANIM_CSS = `
  @keyframes fwSpin{to{transform:rotate(360deg)}}
  @keyframes fwBreath{0%,100%{transform:scale(.94);opacity:.55}50%{transform:scale(1.06);opacity:1}}
  @keyframes fwRaggio{0%,100%{opacity:.72}50%{opacity:1}}
  @keyframes fwDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
  @keyframes fwDrift2{0%,100%{transform:translateX(0)}50%{transform:translateX(-7px)}}
  @keyframes fwDrift3{0%,100%{transform:translateX(0)}50%{transform:translateX(9px)}}
  @keyframes fwGonfia{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
  @keyframes fwSpinta{0%,100%{transform:translateX(-3px)}55%{transform:translateX(7px)}}
  @keyframes fwGoccia{0%{transform:translateY(-16px);opacity:0}14%{opacity:1}80%{opacity:1}
    100%{transform:translateY(38px);opacity:0}}
  @keyframes fwSpruzzo{0%,62%{transform:scale(.15);opacity:0}70%{opacity:.85}100%{transform:scale(1.5);opacity:0}}
  @keyframes fwFiocco{0%{transform:translate(0,-14px);opacity:0}14%{opacity:1}
    40%{transform:translate(6px,6px)}70%{transform:translate(-5px,20px)}88%{opacity:1}
    100%{transform:translate(3px,36px);opacity:0}}
  @keyframes fwGira{to{transform:rotate(360deg)}}
  @keyframes fwChicco{0%{transform:translateY(-12px);opacity:0}12%{opacity:1}
    72%{transform:translateY(30px);opacity:1}86%{transform:translateY(24px)}100%{transform:translateY(34px);opacity:0}}
  @keyframes fwBanco{0%{transform:translateX(-16px);opacity:.12}50%{opacity:.7}100%{transform:translateX(16px);opacity:.12}}
  @keyframes fwRaffica{0%{transform:translateX(-34px);opacity:0}22%{opacity:.85}68%{opacity:.85}
    100%{transform:translateX(44px);opacity:0}}
  @keyframes fwLampo{0%,90%,100%{opacity:0}91%{opacity:.9}92.5%{opacity:.08}94%{opacity:1}96%{opacity:0}}
  @keyframes fwFulmine{0%,90%,100%{opacity:.16}91%,94%{opacity:1}92.5%{opacity:.25}96%{opacity:.16}}
  @keyframes fwTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
  .fw-anim .fw-rays{transform-origin:50px 50px;animation:fwSpin 60s linear infinite}
  .fw-anim .fw-rays-sm{transform-origin:32px 28px}
  .fw-anim .fw-raggio{animation:fwRaggio 4s ease-in-out infinite}
  .fw-anim .fw-halo{transform-origin:50px 50px;animation:fwBreath 6s ease-in-out infinite}
  .fw-anim .fw-drift{animation:fwDrift 7s ease-in-out infinite}
  .fw-anim .fw-drift2{animation:fwDrift2 11s ease-in-out infinite}
  .fw-anim .fw-drift3{animation:fwDrift3 16s ease-in-out infinite}
  .fw-anim .fw-spinta{animation:fwSpinta 4.5s ease-in-out infinite}
  .fw-anim .fw-gonfia{transform-box:fill-box;transform-origin:center;animation:fwGonfia 9s ease-in-out infinite}
  .fw-anim .fw-goccia{animation-name:fwGoccia;animation-timing-function:cubic-bezier(.35,.1,.7,1);
    animation-iteration-count:infinite}
  .fw-anim .fw-spruzzo{transform-box:fill-box;transform-origin:center;animation:fwSpruzzo 2.4s ease-out infinite}
  .fw-anim .fw-fiocco{animation-name:fwFiocco;animation-timing-function:linear;animation-iteration-count:infinite}
  .fw-anim .fw-gira{transform-box:fill-box;transform-origin:center;animation-name:fwGira;
    animation-timing-function:linear;animation-iteration-count:infinite}
  .fw-anim .fw-chicco{animation-name:fwChicco;animation-timing-function:cubic-bezier(.4,0,.8,1);
    animation-iteration-count:infinite}
  .fw-anim .fw-banco{animation-name:fwBanco;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
  .fw-anim .fw-raffica{animation-name:fwRaffica;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
  .fw-anim .fw-lampo{animation:fwLampo 7s linear infinite}
  .fw-anim .fw-fulmine{animation:fwFulmine 7s linear infinite}
  .fw-anim .fw-star{animation:fwTwinkle 3s ease-in-out infinite}
  .fw-anim .fw-d1{animation-delay:0s}
  .fw-anim .fw-d2{animation-delay:.85s}
  .fw-anim .fw-d3{animation-delay:1.7s}
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
  // Lo stesso discorso del pannello: il cielo di adesso da un servizio che
  // osserva (`attuale`), le previsioni dal modello (`entity`). Se quello che
  // osserva non risponde, si ripiega sul modello senza lasciare la card vuota.
  _stOra() {
    const h = this._hass;
    if (!h) return null;
    const a = this._cfg.attuale ? h.states[this._cfg.attuale] : null;
    if (a && !["unknown", "unavailable"].includes(a.state)) return a;
    return h.states[this._cfg.entity];
  }

  set hass(hass) {
    this._hass = hass;
    const st = this._stOra();
    const cond = st ? st.entity_id + ":" + st.state : "";
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
    // Le orarie servono per umidita e pressione dei servizi che non le
    // espongono fra gli attributi (Open-Meteo), e non costano una chiamata
    // in piu che pesi: sono gia in casa e si aggiornano con le altre.
    try {
      const r2 = await this._hass.callWS({
        type: "call_service", domain: "weather", service: "get_forecasts",
        service_data: { type: "hourly" }, target: { entity_id: this._cfg.entity },
        return_response: true,
      });
      const res2 = r2 && r2.response && r2.response[this._cfg.entity];
      this._fcOre = (res2 && res2.forecast) || [];
      const sb = this.querySelector("[data-stats]");
      const st = this._stOra();
      if (sb && st) sb.innerHTML = this._statsHTML(st.attributes);
    } catch (e) { this._fcOre = []; }
    this._fcTimer = setTimeout(() => this._loadForecast(), 15 * 60 * 1000);
  }
  disconnectedCallback() { if (this._fcTimer) clearTimeout(this._fcTimer); }

  _render() {
    const st = this._stOra();
    if (!st) { this.innerHTML = `<div style="padding:16px">Entita meteo non trovata.</div>`; return; }
    const a = st.attributes;
    const sk = fwSkin(fwStatoOra(this._hass, st.state));
    const unit = a.temperature_unit || "°C";
    const oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
    this.innerHTML = `
      <style>
        /* I colori passano dalle variabili, non scritti dentro le regole: cosi
           la notte li riscrive tutti in un colpo solo, senza ridisegnare la
           card. La riga ".fh-app:not(.chiaro)" e il pannello in modalita
           notte; fuori dal pannello la card resta come prima. */
        .fw{--fw-a:${sk.a};--fw-b:${sk.b};--fw-ink:${sk.ink};--fw-soft:${sk.soft};--fw-cap:${sk.cap};
          container-type:inline-size;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
          position:relative;overflow:hidden;padding:22px 24px 18px;color:var(--fw-ink);border-radius:26px;
          background:linear-gradient(150deg,var(--fw-a),var(--fw-b));
          box-shadow:0 14px 34px rgba(20,26,40,.16);
          transition:background .6s ease,color .6s ease}
        .fh-app:not(.chiaro) .fw{--fw-a:${sk.na};--fw-b:${sk.nb};--fw-ink:${sk.nink};
          --fw-soft:${sk.nsoft};--fw-cap:${sk.ncap};
          box-shadow:0 14px 34px rgba(0,0,0,.34)}
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
          background:var(--fw-soft)}
        .fw-stat ha-icon{--mdc-icon-size:18px;opacity:.75}
        .fw-statval{font-size:13.5px;font-weight:800;font-variant-numeric:tabular-nums}
        .fw-statlab{font-size:8.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.6}
        .fw-next{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:12px;
          padding:12px 16px;border:none;border-radius:16px;cursor:pointer;font:inherit;color:inherit;
          background:var(--fw-soft);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
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
  // Sole e luna, portati dalla vista "Meteo 3D" della plancia telefono. La
  // fase lunare si cerca da sola fra i sensori (quello dell'integrazione Luna
  // ha come stato "full_moon", "waxing_crescent"...); si puo forzare con `luna`.
  _astroHTML() {
    const h = this._hass;
    const sun = h.states["sun.sun"];
    const FASI = FH_FASI_LUNA;
    const lunaId = (this._cfg.luna && h.states[this._cfg.luna]) ? this._cfg.luna
      : Object.keys(h.states).find(e => e.startsWith("sensor.") && FASI[h.states[e].state]);
    const luna = lunaId && FASI[h.states[lunaId].state];
    const ora = iso => iso ? new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "–";
    const pezzi = [];
    if (sun) pezzi.push(`<div class="fw-astro"><ha-icon icon="mdi:weather-sunset-up"></ha-icon><div><b>Alba ${ora(sun.attributes.next_rising)}</b>
      <small>Tramonto ${ora(sun.attributes.next_setting)}</small></div></div>`);
    if (luna) pezzi.push(`<div class="fw-astro"><ha-icon icon="${luna[1]}"></ha-icon><div><b>${luna[0]}</b><small>Fase della luna</small></div></div>`);
    return pezzi.length ? `<div class="fw-astrorow">${pezzi.join("")}</div>` : "";
  }

  // L'ora per ora: le prossime 24 ore, con quanta pioggia e quanto vento.
  _oreHTML() {
    const ore = (this._fcOre || []).filter(x => new Date(x.datetime).getTime() > Date.now() - 3600000).slice(0, 24);
    if (!ore.length) return `<div class="fw-mempty">Previsioni orarie non disponibili per questo servizio meteo.</div>`;
    const mx = Math.max.apply(null, ore.map(x => x.temperature != null ? x.temperature : -99));
    const mn = Math.min.apply(null, ore.map(x => x.temperature != null ? x.temperature : 99));
    const span = Math.max(1, mx - mn);
    return `<div class="fw-ore">${ore.map(x => {
      const d = new Date(x.datetime);
      const sk = fwSkin(fwStatoOraData(x.condition, d, this._hass));
      const t = x.temperature;
      const alt = t != null ? Math.round(18 + 58 * (t - mn) / span) : 40;
      const pio = x.precipitation != null && x.precipitation > 0 ? x.precipitation : null;
      const prob = x.precipitation_probability;
      return `<div class="fw-ora">
        <div class="fw-oraT">${t != null ? Math.round(t) + "\u00b0" : "–"}</div>
        <div class="fw-orabarra"><i style="height:${alt}%"></i></div>
        <div class="fw-oraart">${fwArt(sk.art, 26, true, d)}</div>
        <div class="fw-orapio">${pio != null ? this._mm(pio) : (prob != null && prob > 5 ? Math.round(prob) + "%" : "")}</div>
        <div class="fw-orah">${d.getHours().toString().padStart(2, "0")}</div>
      </div>`;
    }).join("")}</div>
    <div class="fw-mnota">Colonna alta = piu caldo. Sotto, la pioggia prevista in quell'ora.</div>`;
  }

  _mm(v) { return (Math.round(v * 10) / 10).toLocaleString("it-IT") + " mm"; }

  // Il radar: fondo mappa + strati di pioggia, uno per fotogramma.
  async _radarHTML(box) {
    const h = this._hass;
    const zona = h.states["zone.home"];
    const lat = zona ? zona.attributes.latitude : 41.9;
    const lon = zona ? zona.attributes.longitude : 12.5;
    const t = fwTassello(lat, lon, FW_RADAR_Z);
    const cx = Math.floor(t.x), cy = Math.floor(t.y);
    // Su un tablet la finestra e larga piu di due tasselli: con tre soli per
    // lato ai bordi resterebbe il vuoto. Se serve se ne mettono cinque.
    const larg = box.clientWidth || 360;
    const nT = larg / 2 > 250 ? 5 : FW_RADAR_N;
    const mezzo = Math.floor(nT / 2);
    // Lo scarto dentro il tassello, per mettere casa esattamente al centro.
    const offX = (t.x - cx) * 256 + mezzo * 256;
    const offY = (t.y - cy) * 256 + mezzo * 256;
    const scuro = !this.closest(".fh-app.chiaro");
    const stile = scuro ? "dark_all" : "light_all";
    const fondo = fwGriglia(cx, cy, (x, y) => `https://basemaps.cartocdn.com/${stile}/${FW_RADAR_Z}/${x}/${y}.png`, nT);
    let mappe = null;
    try {
      const r = await fetch("https://api.rainviewer.com/public/weather-maps.json", { cache: "no-store" });
      mappe = await r.json();
    } catch (e) { mappe = null; }
    if (!mappe || !mappe.radar) {
      box.innerHTML = `<div class="fw-mempty">Il radar non risponde. Serve internet: il fondo mappa e le immagini
        della pioggia arrivano da fuori casa.</div>`;
      return;
    }
    const host = mappe.host || "https://tilecache.rainviewer.com";
    const frame = (mappe.radar.past || []).slice(-8).concat((mappe.radar.nowcast || []).slice(0, 3));
    if (!frame.length) { box.innerHTML = `<div class="fw-mempty">Nessuna immagine radar disponibile adesso.</div>`; return; }
    const strati = frame.map((f, i) => `<div class="fw-rlayer" data-f="${i}" data-ora="${f.time}"
      style="opacity:${i === frame.length - 1 ? 1 : 0}">${fwGriglia(cx, cy, (x, y) => `${host}${f.path}/256/${FW_RADAR_Z}/${x}/${y}/4/1_1.png`, nT)}</div>`).join("");
    const lato = nT * 256;
    box.innerHTML = `
      <div class="fw-radar">
        <div class="fw-rvista">
          <div class="fw-rmondo" style="width:${lato}px;height:${lato}px;left:calc(50% - ${offX}px);top:calc(50% - ${offY}px)">
            <div class="fw-rbase">${fondo}</div>
            ${strati}
            <div class="fw-rcasa" style="left:${offX}px;top:${offY}px"></div>
          </div>
        </div>
        <div class="fw-rbarra">
          <button type="button" class="fw-rplay" data-play><ha-icon icon="mdi:pause"></ha-icon></button>
          <div class="fw-rora" data-rora></div>
          <div class="fw-rlegenda"><span></span><span></span><span></span><span></span> pioggia</div>
        </div>
      </div>`;
    // L'animazione: un fotogramma ogni mezzo secondo, con una pausa in fondo.
    let i = frame.length - 1, vivo = true;
    const strato = n => box.querySelector(`[data-f="${n}"]`);
    const etichetta = box.querySelector("[data-rora]");
    const mostra = n => {
      frame.forEach((f, k) => { const el = strato(k); if (el) el.style.opacity = k === n ? 1 : 0; });
      const d = new Date(frame[n].time * 1000);
      const futuro = n >= (frame.length - (mappe.radar.nowcast || []).slice(0, 3).length);
      etichetta.textContent = (futuro ? "fra poco · " : "") + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    };
    mostra(i);
    const passo = () => {
      if (!vivo || !box.isConnected) return;
      i = (i + 1) % frame.length;
      mostra(i);
      this._rTimer = setTimeout(passo, i === frame.length - 1 ? 1600 : 520);
    };
    this._rTimer = setTimeout(passo, 1200);
    const tasto = box.querySelector("[data-play]");
    tasto.onclick = () => {
      vivo = !vivo;
      tasto.querySelector("ha-icon").setAttribute("icon", vivo ? "mdi:pause" : "mdi:play");
      if (vivo) passo(); else clearTimeout(this._rTimer);
    };
  }

  _openForecast() {
    const st = this._stOra();
    const sk = fwSkin(st ? fwStatoOra(this._hass, st.state) : "");
    const fc = this._fc || [];
    const prev = this.querySelector(".fw-scrim");
    if (prev) prev.remove();
    const scrim = document.createElement("div");
    scrim.className = "fw-scrim";
    scrim.innerHTML = `
      <div class="fw-modal">
        <div class="fw-mhead">
          <div class="fw-mtitle" data-mtitolo>Ora per ora</div>
          <button type="button" class="fw-mclose" data-close><ha-icon icon="mdi:close"></ha-icon></button>
        </div>
        <div class="fw-mtabs">
          <button type="button" class="fw-mtab sel" data-tab="ore">Ora per ora</button>
          <button type="button" class="fw-mtab" data-tab="giorni">Prossimi giorni</button>
          <button type="button" class="fw-mtab" data-tab="radar">Radar</button>
        </div>
        <div class="fw-mpane" data-pane="ore">${this._oreHTML()}${this._astroHTML()}</div>
        <div class="fw-mpane" data-pane="radar" hidden></div>
        <div class="fw-mlist" data-pane="giorni" hidden>
          ${fc.length ? fc.map(d => {
            const dd = new Date(d.datetime);
            const nome = dd.toLocaleDateString("it-IT", { weekday: "long" });
            const data = dd.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
            const dsk = fwSkin(d.condition);
            const extra = [];
            if (d.precipitation_probability != null) extra.push(`<span><ha-icon icon="mdi:water"></ha-icon>${Math.round(d.precipitation_probability)}%</span>`);
            if (d.wind_speed != null) extra.push(`<span><ha-icon icon="mdi:weather-windy"></ha-icon>${Math.round(d.wind_speed)} km/h</span>`);
            return `<div class="fw-mrow">
              <div class="fw-mart">${fwArt(dsk.art, 40, false, dd)}</div>
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
          ${this._astroHTML()}
        </div>
      </div>`;
    const vaiA = nome => {
      scrim.querySelectorAll("[data-pane]").forEach(p => { p.hidden = p.dataset.pane !== nome; });
      scrim.querySelectorAll("[data-tab]").forEach(t => t.classList.toggle("sel", t.dataset.tab === nome));
      const tit = scrim.querySelector("[data-mtitolo]");
      if (tit) tit.textContent = { ore: "Ora per ora", giorni: "Prossimi giorni", radar: "Radar pioggia" }[nome] || "";
      if (nome === "radar") {
        const box = scrim.querySelector('[data-pane="radar"]');
        // Si carica alla prima apertura: sono un centinaio di immagini e non
        // ha senso scaricarle a chi guarda solo le temperature.
        if (box && !box.dataset.pronto) {
          box.dataset.pronto = "1";
          box.innerHTML = `<div class="fw-mempty">Sto chiedendo le immagini del radar…</div>`;
          this._radarHTML(box);
        }
      } else { clearTimeout(this._rTimer); }
    };
    setTimeout(() => {
      scrim.querySelectorAll("[data-tab]").forEach(t => t.onclick = () => vaiA(t.dataset.tab));
    }, 0);
    const style = document.createElement("style");
    style.textContent = `
      .fw-scrim{position:fixed;inset:0;z-index:2147483000;background:rgba(6,9,14,.6);backdrop-filter:blur(6px);
        display:flex;align-items:flex-end;justify-content:center;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
      /* Stessa doppia veste della card: il foglio delle previsioni non puo
         restare chiaro mentre il pannello dietro e notturno. */
      .fw-scrim{--fw-a:${sk.a};--fw-b:${sk.b};--fw-ink:${sk.ink};--fw-soft:${sk.soft}}
      .fh-app:not(.chiaro) .fw-scrim{--fw-a:${sk.na};--fw-b:${sk.nb};--fw-ink:${sk.nink};--fw-soft:${sk.nsoft}}
      .fw-modal{width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;color:var(--fw-ink);
        background:linear-gradient(160deg,var(--fw-a),var(--fw-b));border-radius:26px 26px 0 0;
        box-shadow:0 -18px 50px rgba(0,0,0,.5);animation:fwUp .22s ease-out}
      @keyframes fwUp{from{transform:translateY(18px);opacity:.6}to{transform:translateY(0);opacity:1}}
      .fw-mhead{display:flex;align-items:center;gap:10px;padding:18px 20px 6px}
      .fw-mtitle{flex:1;font-size:18px;font-weight:800;letter-spacing:-.01em}
      .fw-mclose{width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;color:inherit;
        background:var(--fw-soft);display:flex;align-items:center;justify-content:center}
      .fw-mlist{overflow-y:auto;padding:6px 16px 22px;display:flex;flex-direction:column;gap:8px}
      .fw-mrow{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:var(--fw-soft)}
      .fw-astrorow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}
      .fw-astro{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:18px;background:var(--fw-soft)}
      .fw-astro ha-icon{--mdc-icon-size:26px;flex:0 0 auto}
      .fw-astro div{display:flex;flex-direction:column;gap:1px;min-width:0}
      .fw-astro b{font-size:14px;font-weight:850}
      .fw-astro small{font-size:11.5px;opacity:.7}
      /* Anche i giorni futuri si muovono, ma piu piano: otto disegni vivi
         alla stessa velocita di quello grande diventano un luna park. */
      .fw-mart{flex:0 0 auto}
      .fw-mart .fw-rays{animation-duration:120s}
      .fw-mart .fw-halo{animation-duration:9s}
      .fw-mart .fw-drift,.fw-mart .fw-drift2{animation-duration:14s}
      .fw-mart .fw-drop{animation-duration:3.4s}
      .fw-mart .fw-flake{animation-duration:5s}
      .fw-mart .fw-bolt{animation-duration:5.4s}
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
      .fw-mtabs{display:flex;gap:6px;padding:0 14px 10px}
      .fw-mtab{flex:1;padding:8px 6px;border-radius:12px;border:1px solid var(--fw-soft);background:transparent;
        color:inherit;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;opacity:.7}
      .fw-mtab.sel{background:var(--fw-soft);opacity:1}
      .fw-mpane{padding:0 14px 14px}
      .fw-mnota{font-size:10.5px;opacity:.6;margin-top:8px;line-height:1.4}

      /* ORA PER ORA: una colonna per ora, che scorre di lato. L'altezza della
         barretta e la temperatura, cosi la giornata si legge come un profilo
         invece che come una fila di numeri. */
      .fw-ore{display:flex;gap:2px;overflow-x:auto;padding:4px 0 6px;scrollbar-width:none}
      .fw-ore::-webkit-scrollbar{display:none}
      .fw-ora{flex:0 0 46px;display:flex;flex-direction:column;align-items:center;gap:3px}
      .fw-oraT{font-size:12px;font-weight:800;font-variant-numeric:tabular-nums}
      .fw-orabarra{width:100%;height:78px;display:flex;align-items:flex-end;justify-content:center}
      .fw-orabarra i{display:block;width:12px;border-radius:7px;background:linear-gradient(180deg,currentColor,transparent);opacity:.32}
      .fw-oraart{height:26px}
      .fw-orapio{font-size:9.5px;font-weight:800;opacity:.75;min-height:12px;white-space:nowrap}
      .fw-orah{font-size:10.5px;font-weight:800;opacity:.6;font-variant-numeric:tabular-nums}

      /* RADAR: una mappa a tasselli, senza librerie. */
      .fw-radar{display:flex;flex-direction:column;gap:8px}
      .fw-rvista{position:relative;width:100%;height:300px;border-radius:16px;overflow:hidden;
        border:1px solid var(--fw-soft);background:#0d1117}
      .fw-rmondo{position:absolute;left:0;top:0;will-change:transform}
      .fw-rbase,.fw-rlayer{position:absolute;inset:0}
      .fw-rbase{opacity:.85}
      .fw-rlayer{transition:opacity .22s linear;mix-blend-mode:screen}
      .fw-rcasa{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;
        background:#ffb020;box-shadow:0 0 0 3px rgba(255,176,32,.35),0 0 12px rgba(255,176,32,.8)}
      .fw-rbarra{display:flex;align-items:center;gap:10px}
      .fw-rplay{width:36px;height:36px;border-radius:12px;border:1px solid var(--fw-soft);background:var(--fw-soft);
        color:inherit;cursor:pointer;display:grid;place-items:center}
      .fw-rplay ha-icon{--mdc-icon-size:20px}
      .fw-rora{font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
      .fw-rlegenda{margin-left:auto;display:flex;align-items:center;gap:3px;font-size:10px;font-weight:800;opacity:.65}
      .fw-rlegenda span{width:12px;height:8px;border-radius:2px}
      .fw-rlegenda span:nth-child(1){background:#5ad2ff}
      .fw-rlegenda span:nth-child(2){background:#3cc46a}
      .fw-rlegenda span:nth-child(3){background:#ffcf3d}
      .fw-rlegenda span:nth-child(4){background:#ff5c5c}
      ${FW_ANIM_CSS}`;
    scrim.appendChild(style);
    scrim.addEventListener("click", e => { if (e.target === scrim) scrim.remove(); });
    scrim.querySelector("[data-close]").addEventListener("click", () => scrim.remove());
    this.appendChild(scrim);
  }

  // La riga delle previsioni orarie che copre adesso.
  _oraCorrente() {
    const l = this._fcOre || [];
    if (!l.length) return null;
    const ora = Date.now();
    let scelta = null;
    l.forEach(x => {
      const t = new Date(x.datetime).getTime();
      if (t <= ora + 1800000 && (!scelta || t > new Date(scelta.datetime).getTime())) scelta = x;
    });
    return scelta || l[0];
  }

  _statHTML(icon, label, value) {
    if (value == null || value === "") return "";
    return `<div class="fw-stat"><ha-icon icon="${icon}"></ha-icon>
      <div class="fw-statval">${fhEsc(value)}</div>
      <div class="fw-statlab">${fhEsc(label)}</div></div>`;
  }

  _statsHTML(a) {
    // Se l'attributo non c'e, si guarda la previsione dell'ora in corso.
    const ora = this._oraCorrente() || {};
    const umid = a.humidity != null ? a.humidity : ora.humidity;
    const pres = a.pressure != null ? a.pressure : ora.pressure;
    return [
      this._statHTML("mdi:water-percent", "Umidita", umid != null ? Math.round(umid) + "%" : ""),
      this._statHTML("mdi:gauge", "Pressione", pres != null ? Math.round(pres) + " hPa" : ""),
      this._statHTML("mdi:weather-windy", "Vento", a.wind_speed != null ? Math.round(a.wind_speed) + " km/h" : ""),
      this._statHTML("mdi:compass-outline", "Direzione", fwDir(a.wind_bearing)),
    ].join("");
  }

  _paintDays() {
    const nx = this.querySelector("[data-next]");
    if (nx) nx.hidden = !((this._fc || []).length && (this._cfg.days || 0) !== 0);
  }

  _patch() {
    const st = this._stOra();
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
      <label style="font-size:13px;font-weight:600">Cielo di adesso da</label>
      <select id="fwNow" style="${inp}">
        <option value=""${!this._cfg.attuale ? " selected" : ""}>Lo stesso servizio delle previsioni</option>
        ${w.map(e => `<option value="${e}"${e === this._cfg.attuale ? " selected" : ""}>${fhEsc((this._hass.states[e].attributes.friendly_name) || e)}</option>`).join("")}
      </select>
      <span style="font-size:11.5px;opacity:.7;line-height:1.4">met.no e Open-Meteo prevedono bene i giorni ma non
        vedono il temporale di adesso. Per il cielo di adesso scegli un servizio che osserva, come
        OpenWeatherMap in modalita "current".</span>
      <label style="font-size:13px;font-weight:600">Nome mostrato (facoltativo)</label>
      <input id="fwName" value="${fhEsc(this._cfg.name || "")}" style="${inp}">
      <label style="font-size:13px;font-weight:600">Giorni di previsione</label>
      <input id="fwDays" type="number" min="0" max="7" value="${this._cfg.days ?? 4}" style="${inp}">
    </div>`;
    const q = id => this.querySelector(id);
    q("#fwEnt").addEventListener("change", e => { this._cfg = Object.assign({}, this._cfg, { entity: e.target.value }); this._emit(); });
    q("#fwNow").addEventListener("change", e => {
      const v = e.target.value;
      const c = Object.assign({}, this._cfg);
      if (v) c.attuale = v; else delete c.attuale;
      this._cfg = c; this._emit();
    });
    q("#fwName").addEventListener("input", e => { this._cfg = Object.assign({}, this._cfg, { name: e.target.value }); this._emit(); });
    q("#fwDays").addEventListener("change", e => { this._cfg = Object.assign({}, this._cfg, { days: parseInt(e.target.value) || 0 }); this._emit(); });
  }
}
customElements.define("faber-weather-editor", FaberWeatherEditor);



/* ======================================================================== */
/* CARD: CARICHI REALI                                                      */
/* Rifacimento della "Riepilogo carichi reali" che stava sulla plancia come */
/* button-card piena di template. Quella funzionava, ma per cambiarle una   */
/* riga bisognava mettere le mani in un blocco di JavaScript dentro lo YAML,*/
/* e i nomi dei dispositivi erano una mappa scritta a mano: si era gia      */
/* disallineata (nomi per entita non piu nel gruppo, e il piano a induzione */
/* appena aggiunto non compariva). Qui i nomi li chiede a Home Assistant.   */
/* ======================================================================== */

const FC_DEFAULTS = {
  title: "Carichi reali",
  // La versione da home: una striscia bassa invece del pannello intero.
  // Sulla pagina Consumi serve tutto — curva, legenda, non tracciato. Sulla
  // home no: li serve sapere in un colpo d'occhio quanto sta tirando casa e
  // chi sono i tre che tirano di piu. Il resto e a un tocco di distanza.
  compatta: false,
  totale: "",
  gruppo: "",
  sensori: [],
  prezzo_kwh: 0.30,
  soglia_media: 1500,
  soglia_alta: 2500,
  top: 5,
  soglia_acceso: 5,
  naviga: "",
  nomi: {},
};

// Tre stati, tre tinte. Sempre sovrapposte al pannello, mai al posto suo:
// una velatura trasparente messa "al posto" dello sfondo funziona solo
// finche il fondo sotto e quello che immaginavi.
const FC_TONI = {
  calmo: { tinta: "rgba(56,224,138,.10)", bordo: "rgba(56,224,138,.30)", forte: "#38e08a", giorno: "#0f7a3d", eti: "tutto tranquillo" },
  medio: { tinta: "rgba(255,176,32,.12)", bordo: "rgba(255,176,32,.38)", forte: "#ffb020", giorno: "#9a5b00", eti: "consumo alto" },
  alto: { tinta: "rgba(255,92,92,.14)", bordo: "rgba(255,92,92,.42)", forte: "#ff6b6b", giorno: "#b3261e", eti: "attenzione" },
};

// Il nome buono di un sensore di potenza non e il suo friendly_name
// ("Piano induzione Energy Meter 0 Potenza"): e il nome del DISPOSITIVO a
// cui appartiene ("Piano induzione"). Quello lo sa Home Assistant, quindi
// non serve piu nessun elenco scritto a mano che si disallinea da solo.
function fcNomeSensore(hass, id, nomiCustom) {
  if (nomiCustom && nomiCustom[id]) return nomiCustom[id];
  const reg = (hass.entities || {})[id];
  const dev = reg && reg.device_id ? (hass.devices || {})[reg.device_id] : null;
  if (dev) {
    const n = dev.name_by_user || dev.name;
    // Il canale di un misuratore multicanale porta il numero nel nome del
    // dispositivo figlio: "Piano induzione Energy Meter 0" -> "Piano induzione".
    if (n) return n.replace(/\s*(energy meter|channel|canale|em)\s*\d+\s*$/i, "").trim() || n;
  }
  const st = hass.states[id];
  const f = (st && st.attributes && st.attributes.friendly_name) || id;
  return f.replace(/\s*(active power|apparent power|potenza attiva|potenza apparente|potenza|power|consumo)\s*\d*\s*$/i, "").trim() || f;
}

// Due canali della stessa presa doppia hanno lo STESSO nome di dispositivo:
// in classifica comparivano due "Luce sala" indistinguibili. Quando succede si
// aggiunge il distintivo dell'entita (il numero del canale, o il suo nome nel
// registro). E' esattamente il motivo per cui la vecchia card teneva un elenco
// di nomi scritto a mano - solo che qui si aggiorna da solo.
function fcMaiuscola(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

function fcNomiUnivoci(hass, ids, nomiCustom) {
  const base = {};
  ids.forEach(id => { base[id] = fcNomeSensore(hass, id, nomiCustom); });
  const conta = {};
  ids.forEach(id => { conta[base[id]] = (conta[base[id]] || 0) + 1; });
  const out = {};
  ids.forEach(id => {
    let n = base[id];
    const suo = nomiCustom && nomiCustom[id];
    if (!suo && conta[n] > 1) {
      const coda = (id.match(/_(\d+)$/) || [])[1];
      if (coda) {
        n = n + " " + coda;
      } else {
        const reg = (hass.entities || {})[id];
        const et = (reg && (reg.name || reg.original_name)) || "";
        if (et) n = n + " \u00b7 " + et;
      }
    }
    out[id] = fcMaiuscola(n);
  });
  return out;
}

function fcNum(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }
function fcW(n) { return Math.round(n).toLocaleString("it-IT"); }

class FaberCarichi extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-carichi-editor"); }
  static getStubConfig(hass) {
    const st = (hass && hass.states) || {};
    const pot = Object.keys(st).filter(id => id.startsWith("sensor.") && st[id].attributes.device_class === "power");
    const gruppo = pot.find(id => (st[id].attributes.entity_id || []).length);
    return Object.assign({}, FC_DEFAULTS, {
      totale: pot.find(id => /generale|totale|casa|contatore|main/i.test(id)) || "",
      gruppo: gruppo || "",
      etichetta: "consumo_apparecchio",
    });
  }

  setConfig(config) {
    // La configurazione che arriva da HA e congelata in profondita.
    this._cfg = Object.assign({}, FC_DEFAULTS, JSON.parse(JSON.stringify(config || {})));
    this._built = false;
    if (this._hass) this._render();
  }

  set hass(h) {
    const primo = !this._hass;
    this._hass = h;
    this._render();
    if (primo) this._caricaCurva();
    this._caricaConfronto();   // si protegge da sola: una volta ogni dieci minuti
  }

  getCardSize() { return 5; }

  _membri() {
    const h = this._hass, c = this._cfg;
    // L'ETICHETTA vince sul gruppo: un apparecchio nuovo entra da solo, senza
    // che nessuno aggiorni un elenco. Il gruppo resta come riserva.
    const lab = c.etichetta;
    if (lab) {
      const reg = h.entities || {};
      // Fuori dal contatore: il giardino e l'autoclave hanno una linea loro.
      // Si vedono nel consumo della LORO stanza, ma qui no: il confronto e
      // con il contatore di casa, che non li conta, e li dentro falserebbero
      // il totale e il "quanto di piu di ieri".
      const fuori = c.escludi_etichetta === undefined ? "fuori_dal_contatore" : c.escludi_etichetta;
      const l = Object.keys(reg).filter(e => e.startsWith("sensor.") && h.states[e] &&
        (reg[e].labels || []).includes(lab) && !(fuori && (reg[e].labels || []).includes(fuori)));
      if (l.length) return l;
    }
    if (c.gruppo && h.states[c.gruppo]) {
      const m = h.states[c.gruppo].attributes.entity_id;
      if (Array.isArray(m) && m.length) return m;
    }
    return Array.isArray(c.sensori) ? c.sensori : [];
  }

  // L'andamento delle ultime ore. Una fila di barre e una fotografia: dice
  // quanto stai tirando adesso ma non se stai salendo o scendendo. La curva
  // e la cosa che si guarda per prima.
  // Quanto abbiamo consumato oggi, contro ieri ALLA STESSA ORA. Il paragone
  // con l'intera giornata di ieri non direbbe niente: alle otto di mattina
  // saresti sempre "-80%". Si confrontano due fette uguali.
  // Medie orarie, non letture grezze: sono 48 righe invece di migliaia.
  async _caricaConfronto() {
    const id = this._cfg.totale;
    if (!id || !this._hass) return;
    if (this._confrontoPer === id && Date.now() - (this._confrontoTs || 0) < 600000) return;
    this._confrontoPer = id;
    this._confrontoTs = Date.now();
    try {
      const ora = new Date();
      const mezzanotte = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate()).getTime();
      const inizioIeri = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate() - 1);
      const st = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: inizioIeri.toISOString(), end_time: ora.toISOString(),
        statistic_ids: [id], period: "hour", types: ["mean"],
      });
      const righe = (st && st[id]) || [];
      // L'ora IN CORSO si esclude da tutti e due i lati. La media dell'ora
      // corrente copre solo i minuti passati, ma moltiplicandola per un'ora
      // intera la conteremmo piena: oggi risulterebbe gonfiato rispetto a
      // ieri, che quell'ora l'aveva completa. Si confrontano solo ore chiuse.
      const limite = ora.getHours();
      let oggi = 0, ieri = 0;
      for (const r of righe) {
        const w = parseFloat(r.mean);
        if (!isFinite(w)) continue;
        const d = new Date(r.start);
        if (d.getHours() >= limite) continue;
        const kwh = Math.max(0, w) / 1000;
        if (d.getTime() >= mezzanotte) oggi += kwh;
        else ieri += kwh;
      }
      // Sotto i 50 Wh il paragone e rumore: meglio non dire niente.
      this._confronto = ieri > 0.05
        ? { oggi, ieri, perc: Math.round(((oggi - ieri) / ieri) * 100) }
        : null;
    } catch (e) {
      this._confronto = null;
    }
    this._imp = null;
    this._render();
  }

  // La frase pronta, o vuoto se non c'e niente di sensato da dire.
  _confrontoHTML() {
    const k = this._confronto;
    if (!k) return "";
    const p = k.perc;
    if (Math.abs(p) < 3) return `<button type="button" class="fc-ieri pari" data-ieri>come ieri a quest'ora</button>`;
    const giu = p < 0;
    return `<button type="button" class="fc-ieri ${giu ? "giu" : "su"}" data-ieri title="Perché?">${giu ? "&darr;" : "&uarr;"} ${Math.abs(p)}% di ieri <span class="fc-perche">perché?</span></button>`;
  }

  async _caricaCurva() {
    const id = this._cfg.totale;
    if (!id || !this._hass) return;
    if (this._curvaPer === id && Date.now() - (this._curvaTs || 0) < 300000) return;
    this._curvaPer = id;
    this._curvaTs = Date.now();
    try {
      const ore = Math.max(2, Math.min(48, parseInt(this._cfg.ore_grafico, 10) || 6));
      const al = new Date();
      const dal = new Date(al.getTime() - ore * 3600000);
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: dal.toISOString(), end_time: al.toISOString(),
        entity_ids: [id], minimal_response: true, no_attributes: true,
      });
      const righe = (res && res[id]) || [];
      const punti = righe.map(r => {
        const t = r.lu !== undefined ? r.lu * 1000 : new Date(r.last_updated || r.lc).getTime();
        const w = parseFloat(r.s !== undefined ? r.s : r.state);
        return { t, w };
      }).filter(x => isFinite(x.t) && isFinite(x.w)).sort((a, b) => a.t - b.t);
      // Si riduce a un punto per minuto: piu di cosi non si vede comunque, e
      // disegnare migliaia di punti su un telefono si sente.
      const passo = (ore * 3600000) / 120;
      const secchi = new Map();
      punti.forEach(x => {
        const k = Math.floor((x.t - dal.getTime()) / passo);
        const v = secchi.get(k);
        if (!v || x.w > v) secchi.set(k, x.w);
      });
      this._curva = [...secchi.keys()].sort((a, b) => a - b).map(k => secchi.get(k));
    } catch (e) {
      this._curva = null;
    }
    this._imp = null;
    this._render();
  }

  // Un'area disegnata a mano: nessuna libreria da caricare per una curva.
  _curvaHTML(colore) {
    const v = this._curva;
    if (!v || v.length < 3) return "";
    const W = 300, H = 46;
    const mx = Math.max(...v, 1);
    const px = (i) => (i / (v.length - 1)) * W;
    const py = (x) => H - (x / mx) * (H - 4) - 2;
    const linea = v.map((x, i) => (i ? "L" : "M") + px(i).toFixed(1) + " " + py(x).toFixed(1)).join(" ");
    const area = linea + ` L${W} ${H} L0 ${H} Z`;
    const ore = Math.max(2, Math.min(48, parseInt(this._cfg.ore_grafico, 10) || 6));
    return `<div class="fc-curva">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <path d="${area}" fill="${colore}" opacity=".16"/>
        <path d="${linea}" fill="none" stroke="${colore}" stroke-width="2"
          stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      </svg>
      <div class="fc-curvalab"><span>ultime ${ore} ore</span><span>max ${fcW(mx)} W</span></div>
    </div>`;
  }

  _dati() {
    const h = this._hass, c = this._cfg;
    const voci = this._membri()
      .filter(id => h.states[id])
      .map(id => ({ id, w: fcNum(h.states[id].state) }));
    const monitorato = voci.reduce((s, v) => s + v.w, 0);
    const senzaTotale = !c.totale || !h.states[c.totale];
    const totale = senzaTotale ? monitorato : fcNum(h.states[c.totale].state);
    const altro = Math.max(0, totale - monitorato);
    const accesi = voci.filter(v => v.w >= (c.soglia_acceso || 0)).sort((a, b) => b.w - a.w);
    const tono = totale >= c.soglia_alta ? "alto" : totale >= c.soglia_media ? "medio" : "calmo";
    return { voci, accesi, monitorato, totale, altro, tono, senzaTotale };
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg, d = this._dati(), t = FC_TONI[d.tono];

    if (!this._built) {
      this.innerHTML = `<style>${FC_CSS}</style><ha-card class="fc"><div class="fc-body"></div></ha-card>`;
      this._card = this.querySelector(".fc");
      this._body = this.querySelector(".fc-body");
      this._ultimoHTML = null;
      this._card.addEventListener("click", e => {
        if (e.target.closest("[data-riga]") || e.target.closest("[data-ieri]")) return;
        if (this._cfg.naviga) {
          history.pushState(null, "", this._cfg.naviga);
          window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
        }
      });
      this._built = true;
    }

    this._card.style.backgroundImage = `linear-gradient(${t.tinta},${t.tinta})`;
    this._card.style.borderColor = t.bordo;
    this._card.style.cursor = c.naviga ? "pointer" : "default";

    const perc = d.totale > 0 ? Math.min(100, (d.monitorato / d.totale) * 100) : 0;
    const costo = (d.totale / 1000) * (c.prezzo_kwh || 0);
    const max = d.accesi.length ? d.accesi[0].w : 0;
    const lista = d.accesi.slice(0, c.top || 5);
    const nomi = fcNomiUnivoci(this._hass, d.voci.map(v => v.id), c.nomi);

    this._card.classList.toggle("mini", !!c.compatta);
    if (c.compatta) {
      const primi = d.accesi.slice(0, Math.min(c.top || 3, 4));
      if (!this._scrivi(`
        <div class="fc-mtop">
          <div class="fc-mtit">${fhEsc(c.title)}</div>
          <div class="fc-mnum">
            <div class="fc-mbig" style="color:${t.forte};--fh-giorno:${t.giorno || t.forte}">${fcW(d.totale)}<span>W</span></div>
            ${this._confrontoHTML()}
          </div>
        </div>
        <div class="fc-barra"><div class="fc-fill" style="width:${perc}%;background:${t.forte};box-shadow:0 0 10px ${t.forte}66"></div></div>
        ${primi.length ? `<div class="fc-chips">
          ${primi.map(v => `<button type="button" class="fc-chip" data-riga="${fhEsc(v.id)}">
            <span class="fc-cn">${fhEsc(nomi[v.id])}</span><b style="color:${t.forte};--fh-giorno:${t.giorno || t.forte}">${fcW(v.w)} W</b>
          </button>`).join("")}
          ${d.accesi.length > primi.length ? `<span class="fc-cpiu">+${d.accesi.length - primi.length}</span>` : ""}
        </div>` : `<div class="fc-vuoto">Adesso non c'e niente di acceso.</div>`}`)) return;
      this._body.querySelectorAll("[data-riga]").forEach(b => b.addEventListener("click", e => {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent("hass-more-info", {
          detail: { entityId: b.dataset.riga }, bubbles: true, composed: true,
        }));
      }));
      this._collegaPerche();
      return;
    }

    if (!this._scrivi(`
      <div class="fc-top">
        <div class="fc-tit">
          <div class="fc-t1">${fhEsc(c.title)}</div>
          <div class="fc-t2" style="color:${t.forte};--fh-giorno:${t.giorno || t.forte}">${t.eti}</div>
        </div>
        <div class="fc-tot">
          <div class="fc-big" style="color:${t.forte};--fh-giorno:${t.giorno || t.forte}">${fcW(d.totale)}<span>W</span></div>
          <div class="fc-sub">${d.senzaTotale ? "somma dei monitorati" : "contatore di casa"}</div>
          ${this._confrontoHTML()}
        </div>
      </div>

      ${this._curvaHTML(t.forte)}

      <div class="fc-barra">
        <div class="fc-fill" style="width:${perc}%;background:${t.forte};box-shadow:0 0 12px ${t.forte}66"></div>
      </div>
      <div class="fc-leg">
        <span><i style="background:${t.forte}"></i>Monitorato <b>${fcW(d.monitorato)} W</b></span>
        <span><i class="ghost"></i>Non tracciato <b>${fcW(d.altro)} W</b></span>
        <span class="fc-costo">${costo.toFixed(2).replace(".", ",")} &euro;/h</span>
      </div>

      ${lista.length ? `<div class="fc-lista">
        ${lista.map(v => {
          const q = max > 0 ? Math.max(4, (v.w / max) * 100) : 0;
          return `<button type="button" class="fc-riga" data-riga="${fhEsc(v.id)}">
            <span class="fc-nome">${fhEsc(nomi[v.id])}</span>
            <span class="fc-track"><span class="fc-q" style="width:${q}%;background:${t.forte}"></span></span>
            <span class="fc-w">${fcW(v.w)} W</span>
          </button>`;
        }).join("")}
      </div>` : `<div class="fc-vuoto">Nessun carico acceso in questo momento.</div>`}

      ${d.accesi.length > lista.length ? `<div class="fc-altri">${d.accesi.length - lista.length === 1 ? "e un altro acceso" : "e altri " + (d.accesi.length - lista.length) + " accesi"}, sotto i ${fcW(lista[lista.length - 1].w)} W</div>` : ""}
    `)) return;

    this._body.querySelectorAll("[data-riga]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        detail: { entityId: b.dataset.riga }, bubbles: true, composed: true,
      }));
    }));
    this._collegaPerche();
  }

  // La card riceve lo stato di casa molte volte al secondo: riscrivere il suo
  // contenuto ogni volta sostituiva i tasti sotto il dito e il tocco si perdeva.
  _scrivi(html) {
    if (this._ultimoHTML === html) return false;
    this._ultimoHTML = html;
    this._body.innerHTML = html;
    return true;
  }

  _collegaPerche() {
    const b = this._body.querySelector("[data-ieri]");
    if (b) b.addEventListener("click", e => { e.stopPropagation(); fhVibra(8); this._spiegaConfronto(); });
  }

  // PERCHE OGGI DI PIU (o di meno). "+26% di ieri" da solo non dice niente:
  // si rifanno gli stessi conti del confronto (ore chiuse di oggi contro le
  // stesse ore di ieri, dalle medie orarie) per ogni apparecchio misurato,
  // e si mostra chi ha fatto la differenza e in quali ore. Quello che il
  // contatore conta ma nessuna presa misura resta come "resto della casa".
  async _spiegaConfronto() {
    const h = this._hass, c = this._cfg, k = this._confronto;
    if (!h || !k || !c.totale) return;
    const su = k.perc >= 0;
    const f = fhFoglio(Math.abs(k.perc) < 3 ? "Oggi come ieri" : su ? "Perché oggi consumi di più" : "Perché oggi consumi di meno",
      !!this.closest(".fh-app.chiaro"));
    f.corpo.innerHTML = `<div class="fhf-nota">Confronto le ore di oggi con le stesse di ieri, apparecchio per apparecchio…</div>`;
    const membri = this._membri().filter(id => h.states[id] && id !== c.totale);
    const ora = new Date();
    const limite = ora.getHours();
    const mezzanotte = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate()).getTime();
    const inizioIeri = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate() - 1);
    let st;
    try {
      st = await h.callWS({ type: "recorder/statistics_during_period", start_time: inizioIeri.toISOString(),
        end_time: ora.toISOString(), statistic_ids: [c.totale, ...membri], period: "hour", types: ["mean"] });
    } catch (e) {
      f.corpo.innerHTML = `<div class="fhf-nota">Non riesco a leggere lo storico dei consumi adesso.</div>`;
      return;
    }
    // kWh per ora dalla media in W (o kW, se il sensore dice kW).
    const conta = id => {
      const u = String((h.states[id] && h.states[id].attributes.unit_of_measurement) || "W");
      const fatt = /^kw$/i.test(u) ? 1 : 1 / 1000;
      const o = new Array(24).fill(0), i = new Array(24).fill(0);
      ((st && st[id]) || []).forEach(r => {
        const w = parseFloat(r.mean);
        if (!isFinite(w)) return;
        const d = new Date(r.start);
        if (d.getHours() >= limite) return;
        (d.getTime() >= mezzanotte ? o : i)[d.getHours()] += Math.max(0, w) * fatt;
      });
      const somma = a => a.reduce((x, y) => x + y, 0);
      return { oggi: somma(o), ieri: somma(i), oreO: o, oreI: i, dati: ((st && st[id]) || []).length > 0 };
    };
    const tot = conta(c.totale);
    const nomi = fcNomiUnivoci(h, membri, c.nomi);
    const voci = membri.map(id => Object.assign({ id, nome: nomi[id] }, conta(id))).filter(v => v.dati);
    voci.forEach(v => { v.d = v.oggi - v.ieri; });
    const dTot = tot.oggi - tot.ieri;
    const dMis = voci.reduce((x, v) => x + v.d, 0);
    const dAltro = dTot - dMis;
    const segno = dTot >= 0 ? 1 : -1;
    const kwh = x => (Math.abs(x) < 10 ? Math.abs(x).toFixed(2) : Math.abs(x).toFixed(1)).replace(".", ",") + " kWh";
    const conSegno = x => (x >= 0 ? "+" : "−") + kwh(x);
    const euro = x => (Math.abs(x) * (c.prezzo_kwh || 0)).toFixed(2).replace(".", ",") + " €";
    const hh = n => String(n).padStart(2, "0") + ":00";
    // Chi ha spinto nella stessa direzione del totale, e chi al contrario.
    const principali = voci.filter(v => v.d * segno > 0.03).sort((a, b) => (b.d - a.d) * segno);
    const contrari = voci.filter(v => v.d * segno < -0.03).sort((a, b) => (a.d - b.d) * segno);
    const piuGrande = Math.max(0.01, ...principali.map(v => Math.abs(v.d)), Math.abs(dAltro));
    const riga = (v, colore) => `<div class="fhf-riga" style="--r-c:${colore}">
        <div class="fhf-rig-ic"><ha-icon icon="${v.d >= 0 ? "mdi:trending-up" : "mdi:trending-down"}"></ha-icon></div>
        <div class="fhf-rig-t"><b>${fhEsc(v.nome)}</b><small>oggi ${kwh(v.oggi)} · ieri ${kwh(v.ieri)}</small>
          <div class="fc-sbarra"><i style="width:${Math.max(4, Math.min(100, Math.abs(v.d) / piuGrande * 100))}%"></i></div></div>
        <span class="fhf-val">${conSegno(v.d)}</span></div>`;
    const colPiu = "#ffb020", colMeno = "#4ade80";
    // Le ore dove la differenza e piu grande.
    const ore = tot.oreO.map((x, n) => ({ n, d: x - tot.oreI[n] })).filter(x => x.n < limite)
      .sort((a, b) => (b.d - a.d) * segno).filter(x => x.d * segno > 0.05).slice(0, 3);
    const primo = principali[0];
    const frase = Math.abs(k.perc) < 3
      ? `Fino alle ${hh(limite)} hai consumato quasi come ieri: ${kwh(tot.oggi)} contro ${kwh(tot.ieri)}.`
      : `Fino alle ${hh(limite)} oggi <b>${kwh(tot.oggi)}</b>, ieri alla stessa ora <b>${kwh(tot.ieri)}</b>: `
        + `<b>${conSegno(dTot)}</b> (${k.perc > 0 ? "+" : ""}${k.perc}%)${c.prezzo_kwh ? ", circa " + euro(dTot) : ""}.`
        + (primo ? ` Il grosso ${su ? "in più" : "in meno"} viene da <b>${fhEsc(primo.nome)}</b> (${conSegno(primo.d)}).` : "");
    f.corpo.innerHTML = `<style>.fc-sbarra{height:5px;border-radius:99px;background:rgba(127,127,127,.18);overflow:hidden;margin-top:5px}
      .fc-sbarra i{display:block;height:100%;border-radius:99px;background:var(--r-c)}
      .fc-frase{font-size:13.5px;line-height:1.5}</style>
      <div class="fhf-sez"><div class="fc-frase">${frase}</div></div>
      ${principali.length ? `<div class="fhf-sez"><h4>${su ? "Chi ha consumato di più" : "Chi ha consumato di meno"}</h4>
        ${principali.slice(0, 8).map(v => riga(v, su ? colPiu : colMeno)).join("")}</div>` : ""}
      ${Math.abs(dAltro) > 0.1 ? `<div class="fhf-sez"><h4>Resto della casa</h4>
        <div class="fhf-riga" style="--r-c:#93a1b0"><div class="fhf-rig-ic"><ha-icon icon="mdi:home-lightning-bolt-outline"></ha-icon></div>
          <div class="fhf-rig-t"><b>Non misurato da nessuna presa</b><small>Quello che il contatore conta ma nessuna presa smart vede: luci, forno, prese normali…</small>
            <div class="fc-sbarra"><i style="width:${Math.max(4, Math.min(100, Math.abs(dAltro) / piuGrande * 100))}%;background:#93a1b0"></i></div></div>
          <span class="fhf-val">${conSegno(dAltro)}</span></div></div>` : ""}
      ${ore.length ? `<div class="fhf-sez"><h4>Quando</h4>${ore.map(x => `<div class="fhf-riga" style="--r-c:${su ? colPiu : colMeno}">
          <div class="fhf-rig-ic"><ha-icon icon="mdi:clock-outline"></ha-icon></div>
          <div class="fhf-rig-t"><b>Fra le ${hh(x.n)} e le ${hh(x.n + 1)}</b><small>oggi ${kwh(tot.oreO[x.n])} · ieri ${kwh(tot.oreI[x.n])}</small></div>
          <span class="fhf-val">${conSegno(x.d)}</span></div>`).join("")}</div>` : ""}
      ${contrari.length ? `<div class="fhf-sez"><h4>${su ? "Hanno consumato meno di ieri" : "Hanno consumato più di ieri"}</h4>
        ${contrari.slice(0, 4).map(v => riga(v, su ? colMeno : colPiu)).join("")}</div>` : ""}
      <div class="fhf-nota">Si confrontano solo le ore già finite (00:00–${hh(limite)}), oggi e ieri. Dalle medie orarie di Home Assistant.</div>`;
  }
}

const FC_CSS = `
  .fc{display:block;position:relative;overflow:hidden;border-radius:24px;container-type:inline-size;
    background-color:rgba(16,18,24,.82);border:1px solid rgba(255,255,255,.10);
    backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);
    color:#eaf1f8;box-shadow:0 10px 30px rgba(0,0,0,.28);transition:background-image .5s ease,border-color .5s ease}
  .fc-body{padding:16px 16px 14px;display:flex;flex-direction:column;gap:12px;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .fc-top{display:flex;align-items:flex-start;gap:12px}
  .fc-tit{flex:1;min-width:0}
  .fc-t1{font-size:15px;font-weight:800;letter-spacing:.2px}
  .fc-t2{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-top:3px}
  .fc-tot{text-align:right;flex:0 0 auto}
  /* --- versione compatta, quella della home --- */
  .fc.mini{padding:10px 12px}
  .fc.mini .fc-body{display:flex;flex-direction:column;gap:7px}
  .fc-mtop{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
  .fc-mnum{text-align:right;flex:0 0 auto}
  .fc-ieri{font-size:10.5px;font-weight:800;letter-spacing:.01em;margin-top:2px;white-space:nowrap;
    background:none;border:none;padding:2px 0;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
  .fc-perche{font-size:9.5px;font-weight:800;padding:1px 7px;border-radius:999px;background:color-mix(in srgb,currentColor 16%,transparent)}

  .fc-ieri.giu{color:#39d98a}
  .fc-ieri.su{color:#ffb020}
  .fc-ieri.pari{opacity:.55}
  .fh-app.chiaro .fc-ieri.giu{color:#128a52}
  .fh-app.chiaro .fc-ieri.su{color:#a35b00}
  .fc-mtit{font-size:11px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;opacity:.62}
  .fc-mbig{font-size:26px;font-weight:900;line-height:1;letter-spacing:-.02em}
  .fc-mbig span{font-size:12px;font-weight:800;margin-left:2px;opacity:.7}
  .fc-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .fc-chip{display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;
    padding:5px 9px;border-radius:999px;font:inherit;
    background:rgba(255,255,255,.06);color:inherit}
  .fh-app.chiaro .fc-chip{background:rgba(15,23,42,.06)}
  .fc-chip:hover{background:rgba(255,255,255,.11)}
  .fh-app.chiaro .fc-chip:hover{background:rgba(15,23,42,.11)}
  .fc-cn{font-size:11.5px;font-weight:700;opacity:.85;max-width:120px;overflow:hidden;
    text-overflow:ellipsis;white-space:nowrap}
  .fc-chip b{font-size:11.5px;font-weight:900}
  .fc-cpiu{font-size:11px;font-weight:800;opacity:.5;padding:0 2px}
  .fc-big{font-size:34px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}
  .fc-big span{font-size:15px;font-weight:800;opacity:.75;margin-left:3px}
  .fc-sub{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.6;margin-top:4px}
  .fc-curva{position:relative;margin:2px 0 4px}
  .fc-curva svg{display:block;width:100%;height:46px}
  .fc-curvalab{display:flex;justify-content:space-between;font-size:9.5px;font-weight:800;
    text-transform:uppercase;letter-spacing:.06em;opacity:.45;margin-top:2px}
  .fc-barra{height:9px;border-radius:6px;background:rgba(0,0,0,.32);overflow:hidden;border:1px solid rgba(255,255,255,.07)}
  .fc-fill{height:100%;border-radius:6px;transition:width .6s cubic-bezier(.22,.9,.3,1)}
  .fc-leg{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:11.5px;font-weight:600;opacity:.88}
  .fc-leg span{display:inline-flex;align-items:center;gap:5px}
  .fc-leg b{font-weight:800;font-variant-numeric:tabular-nums}
  .fc-leg i{width:8px;height:8px;border-radius:3px;display:inline-block}
  .fc-leg i.ghost{background:rgba(255,255,255,.28)}
  .fc-costo{margin-left:auto;font-weight:800;opacity:.7;font-variant-numeric:tabular-nums}
  .fc-lista{display:flex;flex-direction:column;gap:2px;margin-top:2px}
  /* Il nome prende quel che gli serve fino a un terzo della card, la barra si
     mangia tutto il resto: cosi su un tablet non resta un vuoto in mezzo con
     le barre schiacciate a destra, e sul telefono il nome ha comunque spazio. */
  .fc-riga{display:grid;grid-template-columns:minmax(88px,32%) minmax(0,1fr) auto;align-items:center;gap:12px;
    padding:7px 8px;border-radius:12px;border:none;background:transparent;color:inherit;
    font:inherit;text-align:left;cursor:pointer;transition:background .18s ease}
  .fc-riga:hover{background:rgba(255,255,255,.06)}
  .fc-nome{font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fc-track{height:6px;border-radius:4px;background:rgba(255,255,255,.09);overflow:hidden}
  .fc-q{display:block;height:100%;border-radius:4px;transition:width .6s cubic-bezier(.22,.9,.3,1)}
  .fc-w{font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums;min-width:56px;text-align:right}
  .fc-vuoto,.fc-altri{font-size:11.5px;font-weight:600;opacity:.55;text-align:center;padding:4px 0}
  @container (max-width:340px){
    .fc-big{font-size:28px}
    .fc-riga{grid-template-columns:minmax(0,1fr) auto}
    .fc-track{display:none}
  }
`;

customElements.define("faber-carichi", FaberCarichi);

/* --------------------------------------------------------- editor grafico */
/* Tutto quello che nella vecchia card era JavaScript dentro lo YAML qui e   */
/* un campo: contatore, gruppo, soglie, prezzo, quanti in classifica, e i    */
/* soprannomi dei dispositivi presi in prestito da Home Assistant e          */
/* modificabili solo se davvero non piacciono.                               */

class FaberCarichiEditor extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({}, FC_DEFAULTS, JSON.parse(JSON.stringify(config || {})));
    // HA richiama setConfig anche per i giri di ritorno partiti da qui: se in
    // quel caso rifacessimo l'HTML, il campo perderebbe il fuoco a ogni
    // lettera e sul telefono la tastiera si chiuderebbe di continuo.
    if (this._interno) { this._interno = false; return; }
    if (this._hass) this._render();
  }
  set hass(h) {
    this._hass = h;
    if (this._cfg && !this._fatto) { this._fatto = true; this._render(); }
  }
  _emit() {
    this._interno = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true }));
  }
  _set(k, v) { this._cfg = Object.assign({}, this._cfg, { [k]: v }); this._emit(); }

  _nomeEnt(id) {
    const s = this._hass.states[id];
    return (s && s.attributes && s.attributes.friendly_name) || id;
  }

  // Un campo di testo che filtra invece di un <select> con centinaia di voci:
  // in questa casa i sensori di potenza sono decine e i sensor totali oltre mille.
  _picker(campo, etichetta, aiuto, filtro) {
    const sel = this._cfg[campo] || "";
    return `<div class="fce-f" data-pick="${campo}" data-filtro="${filtro}">
      <label>${etichetta}</label>${aiuto ? `<span class="fce-h">${aiuto}</span>` : ""}
      <div class="fce-pw">
        <input type="text" class="fce-in fce-q" autocomplete="off" placeholder="Cerca..." value="${fhEsc(sel ? this._nomeEnt(sel) : "")}">
        ${sel ? `<button type="button" class="fce-x" title="Svuota">&times;</button>` : ""}
        <div class="fce-drop" hidden></div>
      </div>
      ${sel ? `<div class="fce-id">${fhEsc(sel)}</div>` : ""}
    </div>`;
  }

  _candidati(filtro) {
    const st = this._hass.states;
    const ids = Object.keys(st).filter(id => id.startsWith("sensor."));
    if (filtro === "gruppo") {
      // Un gruppo utile e un sensore che porta con se l'elenco dei membri.
      return ids.filter(id => Array.isArray(st[id].attributes.entity_id) && st[id].attributes.entity_id.length);
    }
    return ids.filter(id => st[id].attributes.device_class === "power");
  }

  _render() {
    if (!this._cfg || !this._hass) return;
    const c = this._cfg;
    const membri = (() => {
      if (c.gruppo && this._hass.states[c.gruppo]) {
        const m = this._hass.states[c.gruppo].attributes.entity_id;
        if (Array.isArray(m)) return m;
      }
      return Array.isArray(c.sensori) ? c.sensori : [];
    })();

    this.innerHTML = `<style>${FCE_CSS}</style>
      <div class="fce">
        <div class="fce-f">
          <label>Titolo</label>
          <input class="fce-in" id="fceTit" value="${fhEsc(c.title || "")}">
        </div>

        ${this._picker("totale", "Contatore di casa", "Il consumo totale reale. Se lo lasci vuoto, il numero grande diventa la somma dei monitorati.", "power")}
        ${this._picker("gruppo", "Gruppo dei monitorati", "Il gruppo che raccoglie i sensori di potenza delle prese. La differenza col contatore e il consumo non tracciato.", "gruppo")}

        <div class="fce-riga2">
          <div class="fce-f">
            <label>Consumo alto (W)</label>
            <input class="fce-in" id="fceSm" type="number" min="0" step="50" value="${c.soglia_media}">
          </div>
          <div class="fce-f">
            <label>Attenzione (W)</label>
            <input class="fce-in" id="fceSa" type="number" min="0" step="50" value="${c.soglia_alta}">
          </div>
        </div>

        <div class="fce-riga2">
          <div class="fce-f">
            <label>Prezzo energia (&euro;/kWh)</label>
            <input class="fce-in" id="fcePr" type="number" min="0" step="0.01" value="${c.prezzo_kwh}">
          </div>
          <div class="fce-f">
            <label>Quanti in classifica</label>
            <select class="fce-in" id="fceTop">
              ${[3, 5, 8, 10, 15].map(n => `<option value="${n}"${n === c.top ? " selected" : ""}>${n} carichi</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="fce-f">
          <label class="fh-check" style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="fceMini"${c.compatta ? " checked" : ""}> Versione compatta
          </label>
          <span class="fce-h">Una striscia bassa: totale e i primi carichi, senza curva ne legenda. Per la home.</span>
        </div>

        <div class="fce-riga2">
          <div class="fce-f">
            <label>Soglia "acceso" (W)</label>
            <span class="fce-h">Sotto questo valore un carico non compare in classifica.</span>
            <input class="fce-in" id="fceAcc" type="number" min="0" step="1" value="${c.soglia_acceso}">
          </div>
          <div class="fce-f">
            <label>Al tocco vai a</label>
            <span class="fce-h">Per esempio /plancia-telefono/energia. Vuoto = non fa niente.</span>
            <input class="fce-in" id="fceNav" placeholder="/percorso/vista" value="${fhEsc(c.naviga || "")}">
          </div>
        </div>

        <details class="fce-det"${Object.keys(c.nomi || {}).length ? " open" : ""}>
          <summary>Nomi dei carichi (${membri.length})</summary>
          <div class="fce-h" style="margin:6px 0 10px">I nomi arrivano da soli dal dispositivo a cui il sensore appartiene. Scrivi qui dentro solo quelli che vuoi cambiare.</div>
          <div class="fce-nomi">
            ${membri.length ? (() => { const auto = fcNomiUnivoci(this._hass, membri, {}); return membri.map(id => `
              <div class="fce-nr">
                <span class="fce-auto" title="${fhEsc(id)}">${fhEsc(auto[id])}</span>
                <input class="fce-in fce-nome" data-ent="${fhEsc(id)}" placeholder="lascia vuoto" value="${fhEsc((c.nomi || {})[id] || "")}">
              </div>`).join(""); })() : `<div class="fce-h">Scegli prima il gruppo dei monitorati.</div>`}
          </div>
        </details>
      </div>`;

    const q = s => this.querySelector(s);
    q("#fceTit").addEventListener("input", e => this._set("title", e.target.value));
    q("#fceSm").addEventListener("change", e => this._set("soglia_media", parseInt(e.target.value) || 0));
    q("#fceSa").addEventListener("change", e => this._set("soglia_alta", parseInt(e.target.value) || 0));
    q("#fcePr").addEventListener("change", e => this._set("prezzo_kwh", parseFloat(e.target.value) || 0));
    q("#fceTop").addEventListener("change", e => this._set("top", parseInt(e.target.value)));
    q("#fceAcc").addEventListener("change", e => this._set("soglia_acceso", parseFloat(e.target.value) || 0));
    q("#fceNav").addEventListener("input", e => this._set("naviga", e.target.value));
    q("#fceMini").addEventListener("change", e => this._set("compatta", e.target.checked));

    this.querySelectorAll(".fce-nome").forEach(inp => inp.addEventListener("input", e => {
      const nomi = Object.assign({}, this._cfg.nomi || {});
      const v = e.target.value.trim();
      if (v) nomi[e.target.dataset.ent] = v; else delete nomi[e.target.dataset.ent];
      this._set("nomi", nomi);
    }));

    this.querySelectorAll("[data-pick]").forEach(box => this._wirePicker(box));
  }

  _wirePicker(box) {
    const campo = box.dataset.pick, filtro = box.dataset.filtro;
    const inp = box.querySelector(".fce-q");
    const drop = box.querySelector(".fce-drop");
    const x = box.querySelector(".fce-x");
    const lista = () => {
      const t = inp.value.toLowerCase().trim();
      const parole = t.split(/\s+/).filter(Boolean);
      return this._candidati(filtro)
        .map(id => ({ id, txt: (id + " " + this._nomeEnt(id)).toLowerCase() }))
        .filter(o => !parole.length || parole.every(p => o.txt.includes(p)))
        .slice(0, 40);
    };
    const apri = () => {
      const l = lista();
      drop.innerHTML = l.length
        ? l.map(o => `<button type="button" data-id="${fhEsc(o.id)}"><b>${fhEsc(this._nomeEnt(o.id))}</b><i>${fhEsc(o.id)}</i></button>`).join("")
        : `<div class="fce-h" style="padding:10px">Nessun sensore trovato.</div>`;
      drop.hidden = false;
      drop.querySelectorAll("[data-id]").forEach(b => b.addEventListener("mousedown", e => {
        e.preventDefault();
        this._set(campo, b.dataset.id);
        this._render();
      }));
    };
    inp.addEventListener("focus", apri);
    inp.addEventListener("input", apri);
    inp.addEventListener("blur", () => setTimeout(() => { drop.hidden = true; }, 150));
    if (x) x.addEventListener("click", () => { this._set(campo, ""); this._render(); });
  }
}

const FCE_CSS = `
  .fce{display:flex;flex-direction:column;gap:14px;padding:4px 2px;font-family:inherit}
  .fce-f{display:flex;flex-direction:column;gap:5px;min-width:0}
  .fce-f label{font-size:13px;font-weight:700;color:var(--primary-text-color)}
  .fce-h{font-size:11.5px;line-height:1.45;color:var(--secondary-text-color)}
  .fce-in{padding:9px 10px;border-radius:9px;font-size:14px;width:100%;box-sizing:border-box;font-family:inherit;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fce-riga2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .fce-pw{position:relative}
  .fce-x{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:24px;height:24px;border:none;
    border-radius:50%;cursor:pointer;font-size:16px;line-height:1;background:var(--divider-color);color:var(--primary-text-color)}
  .fce-drop{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 4px);max-height:230px;overflow-y:auto;
    border-radius:12px;border:1px solid var(--divider-color);background:var(--ha-card-background,var(--card-background-color));
    box-shadow:0 12px 30px rgba(0,0,0,.35)}
  .fce-drop button{display:flex;flex-direction:column;gap:1px;width:100%;text-align:left;padding:8px 11px;
    border:none;background:none;cursor:pointer;font-family:inherit;color:var(--primary-text-color)}
  .fce-drop button:hover{background:rgba(255,176,32,.14)}
  .fce-drop b{font-size:13px;font-weight:700}
  .fce-drop i{font-size:10.5px;font-style:normal;color:var(--secondary-text-color)}
  .fce-id{font-size:10.5px;color:var(--secondary-text-color);font-family:ui-monospace,monospace}
  .fce-det{border:1px solid var(--divider-color);border-radius:12px;padding:10px 12px}
  .fce-det summary{font-size:13px;font-weight:700;cursor:pointer;color:var(--primary-text-color)}
  .fce-nomi{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto}
  .fce-nr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:center}
  .fce-auto{font-size:12.5px;font-weight:600;color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  @media (max-width:480px){
    .fce-riga2{grid-template-columns:1fr}
    .fce-nr{grid-template-columns:1fr}
  }
`;

customElements.define("faber-carichi-editor", FaberCarichiEditor);

// ===========================================================================
// CONTROLLO CARICHI — pannello di PowerControl
//
// DUE REGOLE, e sono la ragione per cui questa card e stata riscritta.
//
// 1) Il cervello NON sta qui. Il distacco vive nelle automazioni del pacchetto
//    pc.yaml, perche deve funzionare alle tre di notte a schermi spenti. Qui si
//    guarda e si configura, non si decide.
//
// 2) SI SCRIVE SOLO DENTRO UN GESTO ESPLICITO. La prima versione di questa card
//    ha riscritto da sola l'ordine dei carichi mentre la pagina era solo aperta
//    (11/9/2026, due scritture col contesto della sessione browser, percorso nel
//    codice mai trovato). Quindi adesso: una sola funzione sa scrivere, ed e
//    _scrivi(); rifiuta se _gesto non e vero; _gesto lo accende soltanto il
//    tasto Salva e lo rimette a falso in un finally. Il disegno non chiama mai
//    un servizio. Anche se restasse un baco, non puo arrivare agli helper.
//
// Ordine: posizione 1 = ULTIMO a essere staccato (il piu protetto). Lo script
// stop_carichi_generale parte da carico_20 e scende. La prima versione scriveva
// il contrario, ed era il modo perfetto per far ribaltare la protezione.
// ===========================================================================
const PC_MAX = 20;
// GLI HELPER DEL PACCHETTO CONTROLLO CARICHI.
// Erano scritti dentro il codice: bastava rinominarne uno in Home Assistant e
// la card smetteva di leggerlo, senza dire perche. Ora sono valori di
// partenza sovrascrivibili dalla scheda della card.
const PC_HELPER = {
  totale: { e: "sensor.potenza_carichi_selezionato", t: "Potenza dei carichi seguiti" },
  max_imm: { e: "sensor.potenza_massima_immediato", t: "Tetto calcolato - stacco immediato" },
  max_rit: { e: "sensor.potenza_massima_ritardato", t: "Tetto calcolato - stacco ritardato" },
  attivo: { e: "input_boolean.attiva_power_control", t: "Interruttore del controllo carichi" },
  voce: { e: "input_boolean.controllo_carichi_avvisi_vocali", t: "Avvisi vocali" },
  set_imm: { e: "input_number.potenza_massima_immediato", t: "Soglia stacco immediato" },
  set_rit: { e: "input_number.potenza_massima_ritardato", t: "Soglia stacco ritardato" },
  t_imm: { e: "input_number.tempo_stop_immediato", t: "Attesa prima dello stacco immediato" },
  t_rit: { e: "input_number.tempo_stop_ritardato", t: "Attesa prima dello stacco ritardato" },
  t_start: { e: "input_number.tempo_start", t: "Attesa prima di riaccendere" },
  impegnata: { e: "input_number.controllo_carichi_potenza_impegnata", t: "Potenza impegnata del contatore" },
  tolleranza: { e: "input_number.controllo_carichi_tolleranza_contatore", t: "Tolleranza del contatore" },
  margine: { e: "input_number.controllo_carichi_margine_prima_del_picco", t: "Margine prima del picco" },
  acceso: { e: "input_number.controllo_carichi_carico_acceso_sopra", t: "Un carico e acceso sopra" },
  pausa: { e: "input_number.controllo_carichi_non_ripetere_prima_di", t: "Minuti fra due avvisi" },
  voce_quando: { e: "input_select.controllo_carichi_voce_quando", t: "Quando parla a voce" },
  sil_da: { e: "input_datetime.controllo_carichi_silenzio_dalle", t: "Silenzio dalle" },
  sil_a: { e: "input_datetime.controllo_carichi_silenzio_alle", t: "Silenzio alle" },
  episodio: { e: "input_boolean.controllo_carichi_episodio_in_corso", t: "Episodio in corso" },
};

// Le scelte della voce: le stesse dell'input_select in Home Assistant. Se
// l'helper esiste si leggono da li, cosi restano allineate anche se cambiano.
const PC_VOCE_QUANDO = ["Solo il primo avviso", "A ogni avviso", "Solo oltre il contratto"];

// Gli helper che esistono uno per ogni carico: {n} e il numero del carico.
const PC_SCHEMI = {
  schema_potenza: { e: "input_text.carico_{n}_potenza", t: "Sensore del carico numero {n}" },
  schema_switch: { e: "input_text.carico_{n}_switch", t: "Interruttore del carico numero {n}" },
  schema_sospesa: { e: "input_number.potenza_{n}_sospesa", t: "Potenza sospesa del carico {n}" },
};

const PC_DEFAULTS = { title: "Controllo Carichi", helper: {} };

// Gli Shelly espongono un "_device_power" che misura LA PRESA, non il carico:
// una riga piatta di mezzo watt. Ne avevamo uno sulla lavastoviglie e il
// sistema la credeva sempre spenta.
function pcSospetto(id) { return /_device_power$/.test(id); }
function pcW(n) { return (n === null || n === undefined || isNaN(n)) ? "—" : Math.round(n).toLocaleString("it-IT"); }
function pcPulisci(s) {
  return String(s || "").replace(/ Potenza$| Power$| power$/, "").replace(" Energy Meter 0", "")
    .replace(/^Presa /, "").replace(/^SHELLY /, "").trim();
}

class FaberPC extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-pc-editor"); }
  static getStubConfig() { return Object.assign({}, PC_DEFAULTS); }

  setConfig(config) {
    this._cfg = Object.assign({}, PC_DEFAULTS, JSON.parse(JSON.stringify(config || {})));
    this._costruita = false; this._segno = null;
    if (this._hass) this._disegna();
  }
  set hass(h) { this._hass = h; this._disegna(); }
  getCardSize() { return 5; }
  disconnectedCallback() { if (this._pop) { this._pop.remove(); this._pop = null; } }

  // ------------------------------------------------------------- sola lettura
  _n(id) { const s = this._hass.states[id]; const v = s ? parseFloat(s.state) : NaN; return isNaN(v) ? null : v; }
  _s(id) { const s = this._hass.states[id]; return s ? s.state : ""; }

  // Il nome di un helper: quello scelto nella scheda, se no quello standard.
  _h(k) {
    const scelto = (this._cfg.helper || {})[k];
    return (scelto && String(scelto).trim()) || (PC_HELPER[k] || PC_SCHEMI[k] || {}).e || "";
  }
  // Lo stesso per gli helper numerati: _hn("schema_potenza", 3).
  _hn(k, n) { return this._h(k).replace("{n}", n); }

  _lista() {
    const H = this._hass.states, out = [];
    for (let i = 1; i <= PC_MAX; i++) {
      const t = H[this._hn("schema_potenza", i)];
      const id = t ? String(t.state || "").trim() : "";
      if (!id || ["Seleziona", "unknown", "unavailable"].includes(id)) continue;
      const sw = (H[this._hn("schema_switch", i)] || {}).state || "";
      const st = H[id], so = H[this._hn("schema_sospesa", i)];
      out.push({
        pos: i, id, sw,
        nome: pcPulisci(st ? (st.attributes.friendly_name || id) : id),
        w: st && !isNaN(parseFloat(st.state)) ? parseFloat(st.state) : null,
        manca: !st,
        senzaPresa: !sw || sw === "Seleziona",
        sospesa: so ? (parseFloat(so.state) || 0) : 0,
      });
    }
    return out;
  }

  // --------------------------------------------------------------- IL DISEGNO
  // Non chiama mai un servizio. Solo lettura e aggancio di tasti.
  _disegna() {
    if (!this._hass || !this._cfg) return;
    if (!this._costruita) {
      this.innerHTML = "<style>" + PC_CSS + "</style><ha-card class=\"pc\"><div class=\"pc-body\"></div></ha-card>";
      this._corpo = this.querySelector(".pc-body");
      this._costruita = true;
    }
    const l = this._lista();
    const tot = this._n(this._h("totale"));
    const imm = this._n(this._h("max_imm"));
    const rit = this._n(this._h("max_rit"));
    const attivo = this._s(this._h("attivo")) === "on";
    const ultimo = this._s("input_text.controllo_carichi_ultimo_sovraccarico");
    const sospesi = l.filter(x => x.sospesa > 0);

    let tono = "ok", eti = "sotto controllo";
    if (tot !== null && imm !== null && tot > imm) { tono = "alto"; eti = "oltre il picco"; }
    else if (tot !== null && rit !== null && tot > rit) { tono = "medio"; eti = "sopra contratto"; }
    const perc = imm ? Math.min(100, ((tot || 0) / imm) * 100) : 0;

    const impronta = [tot, imm, rit, attivo, ultimo, sospesi.map(x => x.pos + ":" + x.sospesa).join(",")].join("|");
    if (impronta === this._segno) return;
    this._segno = impronta;

    this._corpo.innerHTML = `
      <div class="pc-top">
        <div>
          <div class="pc-t1">${fhEsc(this._cfg.title)}</div>
          <div class="pc-t2 ${tono}">${attivo ? eti : "protezione spenta"}</div>
        </div>
        <div class="pc-tot">
          <div class="pc-big ${tono}">${pcW(tot)}<span>W</span></div>
          <div class="pc-sub">${attivo ? "protezione attiva" : "PROTEZIONE SPENTA"}</div>
        </div>
      </div>
      <div class="pc-barra"><div class="pc-fill ${tono}" style="width:${perc}%"></div>
        <div class="pc-tacca" style="left:${imm ? (rit / imm) * 100 : 0}%"></div></div>
      <div class="pc-leg"><span>contratto ${pcW(rit)} W</span><span>picco ${pcW(imm)} W</span></div>

      ${sospesi.length ? `<div class="pc-box rosso">
        <b>${sospesi.length === 1 ? "Un carico staccato" : sospesi.length + " carichi staccati"} dalla protezione</b>
        ${sospesi.map(x => `<span>${fhEsc(x.nome)} · ${pcW(x.sospesa)} W</span>`).join("")}
      </div>` : ""}

      <div class="pc-box">
        <b>Ultimo sovraccarico</b>
        <span class="pc-ev">${ultimo && ultimo !== "unknown" ? fhEsc(ultimo) : "Nessuno registrato finora."}</span>
      </div>

      <div class="pc-tasti">
        <button type="button" class="pc-imp" data-storico>Storico</button>
        <button type="button" class="pc-imp" data-apri>Impostazioni</button>
      </div>`;

    const b = this._corpo.querySelector("[data-apri]");
    if (b) b.onclick = () => this._apriPopup();
    const st = this._corpo.querySelector("[data-storico]");
    if (st) st.onclick = () => this._apriStorico();
  }

  // ============================ L'UNICA PORTA DI SCRITTURA ===================
  // Fuori dal tasto Salva questa rifiuta e lo scrive in console. Non e una
  // buona intenzione: e un blocco.
  async _scrivi(azioni) {
    if (!this._gesto) {
      console.warn("[faber-pc] scrittura rifiutata: nessun gesto esplicito dell'utente", azioni);
      return false;
    }
    for (const a of azioni) {
      await this._hass.callService(a.dominio, a.servizio, a.dati);
    }
    return true;
  }

  // ------------------------------------------------------------------- POPUP
  // Lo scrim si aggancia al DOCUMENTO, non alla card: dentro Faber Home la card
  // ha il vetro sfocato, che diventa il riferimento dei position:fixed e
  // terrebbe il foglio prigioniero nei suoi confini.
  _apriPopup() {
    const l = this._lista();
    this._bozza = {
      carichi: l.map(x => ({ id: x.id, sw: x.sw, nome: x.nome })),
      imm: this._n(this._h("set_imm")) || 0,
      rit: this._n(this._h("set_rit")) || 0,
      tImm: this._n(this._h("t_imm")) || 0,
      tRit: this._n(this._h("t_rit")) || 0,
      tStart: this._n(this._h("t_start")) || 0,
      imp: this._n(this._h("impegnata")) || 0,
      tol: this._n(this._h("tolleranza")) || 0,
      mar: this._n(this._h("margine")) || 0,
      acceso: this._n(this._h("acceso")) || 0,
      voce: this._s(this._h("voce")) === "on",
      pausa: this._n(this._h("pausa")) || 30,
      voceQuando: this._s(this._h("voce_quando")) || PC_VOCE_QUANDO[0],
      silDa: (this._s(this._h("sil_da")) || "22:30:00").slice(0, 5),
      silA: (this._s(this._h("sil_a")) || "07:30:00").slice(0, 5),
      dest: this._lista_testo("input_text.controllo_carichi_destinatari_avvisi"),
      alto: this._lista_testo("input_text.controllo_carichi_altoparlanti_avvisi"),
      attivo: this._s(this._h("attivo")) === "on",
    };
    this._partenza = JSON.stringify(this._bozza);
    this._cerca = ""; this._aggiungi = false;

    if (!this._pop) {
      this._pop = document.createElement("div");
      this._pop.className = "pc-scrim";
      document.body.appendChild(this._pop);
    }
    this._pop.innerHTML = "<style>" + PC_CSS + "</style><div class=\"pc-modal\"></div>";
    this._modal = this._pop.querySelector(".pc-modal");
    this._pop.classList.add("on");
    this._pop.onclick = e => { if (e.target === this._pop) this._chiudi(); };
    this._registro();   // registro entita per l'accoppiamento automatico
    this._disegnaPopup();
  }

  _lista_testo(ent) {
    const v = this._s(ent) || "";
    if (["unknown", "unavailable"].includes(v)) return [];
    return v.split(",").map(x => x.trim()).filter(Boolean);
  }

  _chiudi() { this._pop.classList.remove("on"); this._bozza = null; this._segno = null; this._disegna(); }

  // Lo storico non lo teniamo noi: ogni evento e gia nel logbook, scritto
  // dall'automazione anche a schermi spenti. Qui si legge e basta.
  async _apriStorico() {
    if (!this._pop) {
      this._pop = document.createElement("div");
      this._pop.className = "pc-scrim";
      document.body.appendChild(this._pop);
    }
    this._pop.innerHTML = `<style>${PC_CSS}</style>
      <div class="pc-modal">
        <div class="pc-mh">
          <div class="pc-mt">Storico sovraccarichi</div>
          <button type="button" class="pc-x" data-chiudi>&times;</button>
        </div>
        <div class="pc-mc"><div class="pc-nota">Leggo lo storico...</div></div>
      </div>`;
    this._pop.classList.add("on");
    this._pop.onclick = e => { if (e.target === this._pop) this._chiudiStorico(); };
    this._pop.querySelector("[data-chiudi]").onclick = () => this._chiudiStorico();

    let righe = null;
    try {
      const ev = await this._hass.callWS({
        type: "logbook/get_events",
        start_time: new Date(Date.now() - 30 * 86400000).toISOString(),
        entity_ids: ["input_text.controllo_carichi_ultimo_sovraccarico"],
      });
      const tutte = ev || [];
      righe = tutte.filter(x => x.message);
      if (!righe.length) righe = tutte.filter(x => x.state);
      righe = righe.reverse().slice(0, 40);
    } catch (err) { righe = null; }

    const corpo = this._pop.querySelector(".pc-mc");
    if (!corpo) return;
    if (righe === null) {
      corpo.innerHTML = `<div class="pc-nota">Storico non disponibile: il registro non risponde.</div>`;
      return;
    }
    if (!righe.length) {
      corpo.innerHTML = `<div class="pc-nota">Nessun sovraccarico negli ultimi 30 giorni.</div>`;
      return;
    }
    corpo.innerHTML = `<div class="pc-storia">${righe.map(x => {
      const testo = x.message || x.state || "";
      const q = new Date(x.when * 1000).toLocaleString("it-IT",
        { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      return `<div class="pc-sr ${/rientr/i.test(testo) ? "fine" : "inizio"}">
        <span class="pc-sq">${fhEsc(q)}</span>
        <span class="pc-sm">${fhEsc(testo)}</span>
      </div>`;
    }).join("")}</div>`;
  }

  _chiudiStorico() { if (this._pop) this._pop.classList.remove("on"); }

  async _registro() {
    if (this._reg) return;
    try {
      const ents = await this._hass.callWS({ type: "config/entity_registry/list" });
      const devs = await this._hass.callWS({ type: "config/device_registry/list" });
      const nomi = {}; devs.forEach(d => nomi[d.id] = d.name_by_user || d.name);
      const perDev = {};
      ents.forEach(e => { if (e.device_id) (perDev[e.device_id] = perDev[e.device_id] || []).push(e); });
      this._reg = { ents, nomi, perDev };
    } catch (e) { this._reg = null; }
  }

  // Dal sensore di potenza alla presa che lo alimenta: stanno sullo stesso
  // dispositivo. Non vale per i misuratori separati (il piano induzione ha il
  // sensore su un device e il rele su un altro): li torna vuoto e si sceglie
  // a mano, invece di indovinare.
  _serviziNotifica() {
    const s = (this._hass && this._hass.services && this._hass.services.notify) || {};
    const scarta = ["notify", "send_message", "persistent_notification"];
    const bello = k => k.replace(/^mobile_app_/, "").replace(/^alexa_media_/, "")
      .replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const chiavi = Object.keys(s).filter(k => !scarta.includes(k));
    // Il nome del servizio e quello che il dispositivo aveva QUANDO e stato
    // aggiunto: se poi lo rinomini nell'app Alexa, il servizio resta indietro.
    // Qui si va a leggere il nome vero dal media_player corrispondente, se c'e,
    // se no l'elenco mente (l'Echo "sala" era in realta quello di Leonardo).
    const H = (this._hass && this._hass.states) || {};
    const nomeVero = k => {
      const mp = H["media_player." + k.replace(/^alexa_media_/, "")];
      const fn = mp && mp.attributes && mp.attributes.friendly_name;
      return fn || bello(k);
    };
    return {
      telefoni: chiavi.filter(k => !k.startsWith("alexa_media_")).map(k => ({ id: k, nome: bello(k) })),
      voce: chiavi.filter(k => k.startsWith("alexa_media_")).map(k => ({ id: k, nome: nomeVero(k) })),
    };
  }

  _presaDi(idSensore) {
    if (!this._reg) return "";
    const e = this._reg.ents.find(x => x.entity_id === idSensore);
    if (!e || !e.device_id) return "";
    const dev = this._reg.nomi[e.device_id] || "";
    const scarta = /child_lock|backlight|_led|remote_access|do_not_disturb|sound|privacy|alarm|tracking|sleep|overtemp|mute|repeat|shuffle/i;
    const cand = (this._reg.perDev[e.device_id] || [])
      .filter(x => x.entity_id.startsWith("switch.") && !scarta.test(x.entity_id));
    const pr = cand.find(x => (x.original_name || x.name || "") === dev) || cand[0];
    return pr ? pr.entity_id : "";
  }

  _candidati() {
    const H = this._hass.states, gia = new Set(this._bozza.carichi.map(x => x.id));
    const f = (this._cerca || "").toLowerCase();
    return Object.keys(H)
      .filter(id => id.startsWith("sensor.") && H[id].attributes.device_class === "power" && !gia.has(id))
      .map(id => ({ id, nome: pcPulisci(H[id].attributes.friendly_name || id), w: parseFloat(H[id].state) }))
      .filter(x => !f || x.nome.toLowerCase().includes(f) || x.id.includes(f))
      .sort((a, b) => a.nome.localeCompare(b.nome, "it")).slice(0, 40);
  }

  // Le scelte della voce vengono dall'helper vero: se un domani se ne aggiunge
  // una in Home Assistant, compare qui senza toccare la card.
  _voceOpzioni() {
    const s = this._hass.states[this._h("voce_quando")];
    const o = s && s.attributes && s.attributes.options;
    return (o && o.length) ? o.slice() : PC_VOCE_QUANDO.slice();
  }

  _disegnaPopup() {
    const b = this._bozza, H = this._hass.states;
    const sn = this._serviziNotifica();
    const cambiato = JSON.stringify(b) !== this._partenza;
    this._modal.innerHTML = `
      <div class="pc-mh">
        <div class="pc-mt">Impostazioni carichi</div>
        <button type="button" class="pc-x" data-chiudi>&times;</button>
      </div>
      <div class="pc-mc">
        <label class="pc-sw2">
          <input type="checkbox" data-attivo ${b.attivo ? "checked" : ""}>
          <span>Protezione attiva</span>
        </label>
        <label class="pc-sw2">
          <input type="checkbox" data-voce ${b.voce ? "checked" : ""}>
          <span>Avvisi a voce su Alexa</span>
        </label>

        <div class="pc-lab">Contratto <small>da qui si ricavano le soglie</small></div>
        <div class="pc-gr">
          <div><label>Potenza impegnata (W)</label><input type="number" data-k="imp" value="${b.imp}" step="100"></div>
          <div><label>Tolleranza contatore (%)</label><input type="number" data-k="tol" value="${b.tol}" step="1"></div>
          <div><label>Margine prima del picco (%)</label><input type="number" data-k="mar" value="${b.mar}" step="1"></div>
          <div class="pc-calc">
            <span>disponibile <b>${pcW(b.imp * (1 + b.tol / 100))} W</b></span>
            <span>picco contatore <b>${pcW(b.imp * (1 + b.tol / 100) * (1 + b.mar / 100))} W</b></span>
          </div>
        </div>
        <button type="button" class="pc-add" data-calcola>Ricava le soglie da questi numeri</button>
        <div class="pc-nota">Sotto la <b>disponibile</b> il contatore tiene senza limiti di tempo.
          Sopra parte il conto alla rovescia; oltre il <b>picco</b> stacca in pochi minuti.
          Le soglie qui sotto stanno apposta un filo piu in basso, per intervenire prima del contatore.</div>

        <div class="pc-lab">Soglie</div>
        <div class="pc-gr">
          <div><label>Picco (W)</label><input type="number" data-k="imm" value="${b.imm}" step="50"></div>
          <div><label>per (secondi)</label><input type="number" data-k="tImm" value="${b.tImm}" step="1"></div>
          <div><label>Contratto (W)</label><input type="number" data-k="rit" value="${b.rit}" step="50"></div>
          <div><label>per (minuti)</label><input type="number" data-k="tRit" value="${b.tRit}" step="10"></div>
          <div><label>Riaccende dopo (min)</label><input type="number" data-k="tStart" value="${b.tStart}" step="1"></div>
          <div><label>Carico acceso sopra (W)</label><input type="number" data-k="acceso" value="${b.acceso}" step="1"></div>
        </div>
        <div class="pc-nota"><b>Riaccende dopo</b>: i minuti di calma sotto soglia prima che i carichi
          staccati tornino su, uno alla volta. <b>Carico acceso sopra</b>: sotto questi watt un carico
          e considerato spento e viene saltato, senza sprecare un distacco.</div>

        <div class="pc-lab">Avvisi <small>chi riceve la notifica sul telefono</small></div>
        <div class="pc-dest">
          ${sn.telefoni.length ? sn.telefoni.map(x => `<label class="pc-chk">
            <input type="checkbox" data-dest="${fhEsc(x.id)}" ${b.dest.includes(x.id) ? "checked" : ""}>
            <span>${fhEsc(x.nome)}</span></label>`).join("")
            : `<div class="pc-nota">Nessun servizio di notifica trovato.</div>`}
        </div>
        ${b.dest.join(",").length > 255 ? `<div class="pc-nota rosso">Troppi dispositivi: la lista supera i 255 caratteri e non si salva. Togline qualcuno.</div>` : ""}

        <div class="pc-lab">Voce <small>chi lo dice ad alta voce</small></div>
        <div class="pc-dest">
          ${sn.voce.length ? sn.voce.map(x => `<label class="pc-chk">
            <input type="checkbox" data-alto="${fhEsc(x.id)}" ${b.alto.includes(x.id) ? "checked" : ""}>
            <span>${fhEsc(x.nome)}</span></label>`).join("")
            : `<div class="pc-nota">Nessun altoparlante trovato.</div>`}
        </div>
        <div class="pc-nota">I nomi qui sopra sono quelli veri dell'app Alexa: se rinomini un Echo,
          cambia anche qui. La spunta <b>Avvisi a voce</b> in cima spegne tutte le voci in un colpo,
          senza perdere questa scelta.</div>

        <div class="pc-lab">Quanto insiste <small>perche non ripeta lo stesso avviso tutta la sera</small></div>
        <div class="pc-gr">
          <div><label>Non ripetere prima di (min)</label><input type="number" data-k="pausa" value="${b.pausa}" step="5" min="1"></div>
          <div><label>Parla a voce</label>
            <select data-sel="voceQuando">
              ${this._voceOpzioni().map(o => `<option value="${fhEsc(o)}"${o === b.voceQuando ? " selected" : ""}>${fhEsc(o)}</option>`).join("")}
            </select>
          </div>
          <div><label>Silenzio dalle</label><input type="time" data-ora="silDa" value="${fhEsc(b.silDa)}"></div>
          <div><label>fino alle</label><input type="time" data-ora="silA" value="${fhEsc(b.silA)}"></div>
        </div>
        <div class="pc-nota">La <b>notifica</b> sul telefono arriva comunque: qui si regola solo
          quanto spesso e la voce. <b>Solo il primo avviso</b>: parla una volta sola quando ci si
          avvicina al picco e sta zitta finche il consumo non rientra davvero.
          <b>Solo oltre il contratto</b>: parla soltanto sopra ${pcW(b.rit)} W.
          Nella fascia di silenzio non parla mai${b.silDa === b.silA ? " (ora spenta: le due ore sono uguali)" : ""}.</div>

        <div class="pc-lab">Ordine <small>in cima = staccato per <b>ultimo</b>, in fondo = il primo a cadere</small></div>
        <div class="pc-lista">
          ${b.carichi.map((x, i) => {
            const st = H[x.id];
            const w = st && !isNaN(parseFloat(st.state)) ? parseFloat(st.state) : null;
            const senzaPresa = !x.sw || x.sw === "Seleziona";
            return `<div class="pc-riga${senzaPresa || !st ? " guaio" : ""}">
              <span class="pc-n">${i + 1}</span>
              <span class="pc-nome">${fhEsc(x.nome)}
                ${pcSospetto(x.id) ? `<em class="pc-av">misura la presa</em>` : ""}
                ${!st ? `<em class="pc-av">sensore sparito</em>` : ""}
                ${senzaPresa ? `<em class="pc-av">manca la presa</em>` : ""}
              </span>
              <span class="pc-w">${pcW(w)} W</span>
              <span class="pc-cmd">
                <button type="button" data-su="${i}" ${i === 0 ? "disabled" : ""} title="Proteggi di piu">&uarr;</button>
                <button type="button" data-giu="${i}" ${i === b.carichi.length - 1 ? "disabled" : ""} title="Stacca prima">&darr;</button>
                <button type="button" data-via="${i}" title="Togli">&times;</button>
              </span>
            </div>`;
          }).join("") || `<div class="pc-vuoto">Nessun carico.</div>`}
        </div>

        ${this._aggiungi ? `
          <div class="pc-pick">
            <input class="pc-cerca" placeholder="Cerca un sensore di potenza..." value="${fhEsc(this._cerca)}">
            <div class="pc-opz">${this._candidati().map(c => {
              const presa = this._presaDi(c.id);
              return `<button type="button" class="pc-opt" data-add="${fhEsc(c.id)}">
                <span>${fhEsc(c.nome)}${pcSospetto(c.id) ? ` <em class="pc-av">misura la presa</em>` : ""}</span>
                <small>${presa ? "presa trovata: " + fhEsc(pcPulisci((H[presa] || {}).attributes ? H[presa].attributes.friendly_name : presa)) : "presa da scegliere a mano"} · ${pcW(c.w)} W</small>
              </button>`;
            }).join("") || `<div class="pc-vuoto">Nessun sensore trovato.</div>`}</div>
          </div>` : `<button type="button" class="pc-add" data-nuovo>+ Aggiungi un carico</button>`}
      </div>
      <div class="pc-mf">
        <button type="button" class="pc-ann" data-chiudi>Annulla</button>
        <button type="button" class="pc-ok" data-salva ${cambiato ? "" : "disabled"}>${cambiato ? "Salva" : "Nessuna modifica"}</button>
      </div>`;
    this._aggancia();
  }

  _aggancia() {
    const m = this._modal, b = this._bozza;
    m.querySelectorAll("[data-chiudi]").forEach(x => x.onclick = () => this._chiudi());
    const att = m.querySelector("[data-attivo]");
    if (att) att.onchange = e => { b.attivo = e.target.checked; this._disegnaPopup(); };
    m.querySelectorAll("[data-k]").forEach(x => x.onchange = e => {
      const v = parseInt(e.target.value, 10);
      if (isFinite(v) && v >= 0) b[e.target.dataset.k] = v;
      this._disegnaPopup();
    });
    m.querySelectorAll("[data-su]").forEach(x => x.onclick = () => {
      const i = +x.dataset.su; const t = b.carichi[i]; b.carichi[i] = b.carichi[i - 1]; b.carichi[i - 1] = t; this._disegnaPopup();
    });
    m.querySelectorAll("[data-giu]").forEach(x => x.onclick = () => {
      const i = +x.dataset.giu; const t = b.carichi[i]; b.carichi[i] = b.carichi[i + 1]; b.carichi[i + 1] = t; this._disegnaPopup();
    });
    m.querySelectorAll("[data-via]").forEach(x => x.onclick = () => {
      b.carichi.splice(+x.dataset.via, 1); this._disegnaPopup();
    });
    const calc = m.querySelector("[data-calcola]");
    if (calc) calc.onclick = () => {
      const disp = b.imp * (1 + b.tol / 100);
      b.rit = Math.max(0, Math.floor(disp / 50) * 50 - 50);
      b.imm = Math.floor((disp * (1 + b.mar / 100)) / 50) * 50;
      this._disegnaPopup();
    };
    const aggiornaSalva = () => {
      const ok = m.querySelector("[data-salva]");
      if (!ok) return;
      const cambiato = JSON.stringify(b) !== this._partenza;
      ok.disabled = !cambiato;
      ok.textContent = cambiato ? "Salva" : "Nessuna modifica";
    };
    // Tendina e orari: aggiornano solo il tasto Salva. Ridisegnare il foglio a
    // ogni tocco lo riporterebbe in cima mentre si sta scegliendo.
    m.querySelectorAll("[data-sel]").forEach(x => x.onchange = e => {
      b[e.target.dataset.sel] = e.target.value; aggiornaSalva();
    });
    m.querySelectorAll("[data-ora]").forEach(x => x.onchange = e => {
      if (/^\d{2}:\d{2}$/.test(e.target.value)) { b[e.target.dataset.ora] = e.target.value; aggiornaSalva(); }
    });
    m.querySelectorAll("[data-dest]").forEach(x => x.onchange = e => {
      const id = e.target.dataset.dest;
      if (e.target.checked) { if (!b.dest.includes(id)) b.dest.push(id); }
      else b.dest = b.dest.filter(y => y !== id);
      aggiornaSalva();
    });
    m.querySelectorAll("[data-alto]").forEach(x => x.onchange = e => {
      const id = e.target.dataset.alto;
      if (e.target.checked) { if (!b.alto.includes(id)) b.alto.push(id); }
      else b.alto = b.alto.filter(y => y !== id);
      aggiornaSalva();
    });
    const sv = m.querySelector("[data-voce]");
    if (sv) sv.onchange = e => { b.voce = e.target.checked; this._disegnaPopup(); };
    const nuovo = m.querySelector("[data-nuovo]");
    if (nuovo) nuovo.onclick = () => { this._aggiungi = true; this._disegnaPopup(); };
    const cerca = m.querySelector(".pc-cerca");
    if (cerca) {
      cerca.oninput = e => {
        this._cerca = e.target.value;
        m.querySelector(".pc-opz").innerHTML = this._candidati().map(c => {
          const presa = this._presaDi(c.id);
          return `<button type="button" class="pc-opt" data-add="${fhEsc(c.id)}">
            <span>${fhEsc(c.nome)}</span><small>${presa ? "presa trovata" : "presa da scegliere a mano"} · ${pcW(c.w)} W</small>
          </button>`;
        }).join("") || `<div class="pc-vuoto">Nessun sensore trovato.</div>`;
        this._agganciaOpz();
      };
      cerca.focus();
      this._agganciaOpz();
    }
    const salva = m.querySelector("[data-salva]");
    if (salva) salva.onclick = () => this._salva();
  }

  _agganciaOpz() {
    this._modal.querySelectorAll("[data-add]").forEach(x => x.onclick = () => {
      const id = x.dataset.add;
      const H = this._hass.states;
      this._bozza.carichi.push({ id, sw: this._presaDi(id), nome: pcPulisci(H[id].attributes.friendly_name || id) });
      this._aggiungi = false; this._cerca = "";
      this._disegnaPopup();
    });
  }

  // ------------------------------------------------------------------ SALVA
  // L'unico punto che accende _gesto. Tutto il resto qui sopra tocca solo la
  // bozza in memoria.
  async _salva() {
    const b = this._bozza, H = this._hass.states;
    const azioni = [];

    for (let i = 0; i < PC_MAX; i++) {
      const c = b.carichi[i];
      for (const [suff, voluto] of [["potenza", c ? c.id : "Seleziona"], ["switch", c ? (c.sw || "Seleziona") : "Seleziona"]]) {
        const ent = "input_select.carico_" + (i + 1) + "_" + suff;
        const ora = H[ent] ? H[ent].state : null;
        if (ora !== null && ora !== voluto) {
          azioni.push({ dominio: "input_select", servizio: "select_option", dati: { entity_id: ent, option: voluto } });
        }
      }
    }
    const numeri = [
      ["input_number.potenza_massima_immediato", b.imm],
      ["input_number.potenza_massima_ritardato", b.rit],
      ["input_number.tempo_stop_immediato", b.tImm],
      ["input_number.tempo_stop_ritardato", b.tRit],
      ["input_number.tempo_start", b.tStart],
      ["input_number.controllo_carichi_potenza_impegnata", b.imp],
      ["input_number.controllo_carichi_tolleranza_contatore", b.tol],
      ["input_number.controllo_carichi_margine_prima_del_picco", b.mar],
      ["input_number.controllo_carichi_carico_acceso_sopra", b.acceso],
      [this._h("pausa"), b.pausa],
    ];
    numeri.forEach(([ent, v]) => {
      if (H[ent] && parseFloat(H[ent].state) !== v) {
        azioni.push({ dominio: "input_number", servizio: "set_value", dati: { entity_id: ent, value: v } });
      }
    });
    const testi = [
      ["input_text.controllo_carichi_destinatari_avvisi", b.dest.join(",")],
      ["input_text.controllo_carichi_altoparlanti_avvisi", b.alto.join(",")],
    ];
    testi.forEach(([ent, v]) => {
      if (v.length > 255) { console.warn("[faber-pc] lista troppo lunga, non salvata:", ent); return; }
      if (H[ent] && H[ent].state !== v) {
        azioni.push({ dominio: "input_text", servizio: "set_value", dati: { entity_id: ent, value: v } });
      }
    });
    // Quanto insiste: la tendina della voce e le due ore del silenzio.
    if (H[this._h("voce_quando")] && H[this._h("voce_quando")].state !== b.voceQuando) {
      azioni.push({ dominio: "input_select", servizio: "select_option", dati: { entity_id: this._h("voce_quando"), option: b.voceQuando } });
    }
    [["sil_da", b.silDa], ["sil_a", b.silA]].forEach(([k, v]) => {
      const ent = this._h(k);
      if (H[ent] && H[ent].state.slice(0, 5) !== v) {
        azioni.push({ dominio: "input_datetime", servizio: "set_datetime", dati: { entity_id: ent, time: v + ":00" } });
      }
    });
    const attivoOra = this._s("input_boolean.attiva_power_control") === "on";
    if (attivoOra !== b.attivo) {
      azioni.push({ dominio: "input_boolean", servizio: b.attivo ? "turn_on" : "turn_off", dati: { entity_id: "input_boolean.attiva_power_control" } });
    }
    const voceOra = this._s("input_boolean.controllo_carichi_avvisi_vocali") === "on";
    if (voceOra !== b.voce) {
      azioni.push({ dominio: "input_boolean", servizio: b.voce ? "turn_on" : "turn_off", dati: { entity_id: "input_boolean.controllo_carichi_avvisi_vocali" } });
    }
    // Il Salva di PowerControl ricopia i menu nei testi: senza, le formule
    // continuano a leggere i valori vecchi.
    if (azioni.length) {
      azioni.push({ dominio: "script", servizio: "turn_on", dati: { entity_id: "script.powercontrol_configurazione_salva" } });
    }

    const ok = this._modal.querySelector("[data-salva]");
    if (ok) { ok.disabled = true; ok.textContent = "Salvo..."; }
    this._gesto = true;
    try {
      await this._scrivi(azioni);
    } finally {
      this._gesto = false;
    }
    this._chiudi();
  }
}

const PC_CSS = `
  .pc{padding:14px;border-radius:20px}
  .pc-body{display:flex;flex-direction:column;gap:9px}
  .pc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .pc-t1{font-size:11px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;opacity:.62}
  .pc-t2{font-size:12.5px;font-weight:800;margin-top:3px}
  .pc-t2.ok{color:#39d98a}.pc-t2.medio{color:#ffb020}.pc-t2.alto{color:#ff5442}
  .fh-app.chiaro .pc-t2.ok{color:#128a52}.fh-app.chiaro .pc-t2.medio{color:#a35b00}
  .pc-tot{text-align:right;flex:0 0 auto}
  .pc-big{font-size:29px;font-weight:900;line-height:1}
  .pc-big span{font-size:13px;font-weight:800;margin-left:2px;opacity:.7}
  .pc-big.ok{color:#39d98a}.pc-big.medio{color:#ffb020}.pc-big.alto{color:#ff5442}
  .fh-app.chiaro .pc-big.ok{color:#128a52}.fh-app.chiaro .pc-big.medio{color:#a35b00}
  .pc-sub{font-size:9.5px;font-weight:800;opacity:.55;letter-spacing:.04em}
  .pc-barra{position:relative;height:8px;border-radius:999px;background:rgba(255,255,255,.10)}
  .fh-app.chiaro .pc-barra{background:rgba(15,23,42,.10)}
  .pc-fill{height:100%;border-radius:999px;transition:width .5s ease}
  .pc-fill.ok{background:#39d98a}.pc-fill.medio{background:#ffb020}.pc-fill.alto{background:#ff5442}
  .pc-tacca{position:absolute;top:-2px;width:2px;height:12px;background:rgba(255,255,255,.55)}
  .fh-app.chiaro .pc-tacca{background:rgba(15,23,42,.45)}
  .pc-leg{display:flex;justify-content:space-between;font-size:10.5px;font-weight:700;opacity:.7}
  .pc-box{padding:9px 11px;border-radius:12px;background:rgba(255,255,255,.055);
    display:flex;flex-direction:column;gap:3px;font-size:11.5px}
  .fh-app.chiaro .pc-box{background:rgba(15,23,42,.05)}
  .pc-box.rosso{background:rgba(255,84,66,.12);border:1px solid rgba(255,84,66,.3)}
  .pc-box b{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;opacity:.65}
  .pc-ev{font-weight:700;line-height:1.35}
  .pc-imp{border:1px solid rgba(255,176,32,.45);background:none;color:inherit;cursor:pointer;font:inherit;
    font-size:12px;font-weight:800;padding:9px;border-radius:12px}
  .pc-tasti{display:flex;gap:8px}
  .pc-tasti .pc-imp{flex:1}
  .pc-calc{grid-column:1/-1;display:flex;gap:14px;flex-wrap:wrap;font-size:11px;font-weight:700;opacity:.72;padding-top:2px}
  .pc-calc b{font-weight:900;opacity:1;color:#ffb020}
  .fh-app.chiaro .pc-calc b{color:#a35b00}
  .pc-dest{display:flex;flex-wrap:wrap;gap:6px}
  .pc-chk{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:11px;
    background:rgba(255,255,255,.06);font-size:12px;font-weight:700;cursor:pointer}
  .fh-app.chiaro .pc-chk{background:rgba(15,23,42,.06)}
  .pc-chk input{margin:0}
  .pc-nota.rosso{color:#ff5442;opacity:1;font-weight:800}
  .pc-storia{display:flex;flex-direction:column;gap:4px}
  .pc-sr{display:flex;gap:9px;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.05);font-size:11.5px}
  .pc-sr.fine{background:rgba(57,217,138,.13)}
  .pc-sq{flex:0 0 auto;font-weight:900;opacity:.7;white-space:nowrap}
  .pc-sm{flex:1 1 auto;font-weight:600;line-height:1.35}
  .pc-scrim{position:fixed;inset:0;z-index:100;background:rgba(4,5,8,.62);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;pointer-events:none;
    transition:opacity .18s}
  .pc-scrim.on{opacity:1;pointer-events:auto}
  .pc-modal{width:min(560px,100%);max-height:86vh;overflow:auto;border-radius:20px;padding:0;
    background:#1a1b21;color:#eaf1f8;display:flex;flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
  .fh-app.chiaro .pc-modal{background:#fbfaf7;color:#12161c}
  .pc-mh{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 8px}
  .pc-mt{font-size:15px;font-weight:900}
  .pc-x{border:0;background:none;color:inherit;font-size:20px;cursor:pointer;line-height:1}
  .pc-mc{padding:0 16px 12px;display:flex;flex-direction:column;gap:11px}
  .pc-mf{display:flex;gap:8px;padding:12px 16px 16px;border-top:1px solid rgba(255,255,255,.09)}
  .fh-app.chiaro .pc-mf{border-color:rgba(15,23,42,.12)}
  .pc-mf button{flex:1;padding:11px;border:0;border-radius:12px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
  .pc-ann{background:rgba(255,255,255,.09);color:inherit}
  .fh-app.chiaro .pc-ann{background:rgba(15,23,42,.08)}
  .pc-ok{background:#ffb020;color:#1c1400}
  .pc-ok:disabled{opacity:.4;cursor:not-allowed}
  .pc-sw2{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:800;cursor:pointer}
  .pc-gr{display:grid;grid-template-columns:1fr 1fr;gap:9px}
  .pc-gr label{display:block;font-size:10px;font-weight:800;opacity:.6;margin-bottom:3px;text-transform:uppercase;letter-spacing:.05em}
  .pc-gr input,.pc-gr select{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:10px;font:inherit;font-size:13px;font-weight:800;
    border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit}
  .pc-gr select option{background:#0f172a;color:#e5e7eb}
  .fh-app.chiaro .pc-gr input,.fh-app.chiaro .pc-gr select{background:#fff;border-color:rgba(15,23,42,.18)}
  .fh-app.chiaro .pc-gr select option{background:#fff;color:#0f172a}
  .pc-nota{font-size:10.5px;line-height:1.45;opacity:.62}
  .pc-lab{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;opacity:.6}
  .pc-lab small{display:block;font-size:10px;font-weight:700;letter-spacing:0;text-transform:none;opacity:.85;margin-top:2px}
  .pc-lista{display:flex;flex-direction:column;gap:5px}
  .pc-riga{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:11px;background:rgba(255,255,255,.05)}
  .fh-app.chiaro .pc-riga{background:rgba(15,23,42,.05)}
  .pc-riga.guaio{background:rgba(255,84,66,.14)}
  .pc-n{flex:0 0 auto;width:20px;height:20px;border-radius:6px;display:grid;place-items:center;
    font-size:10.5px;font-weight:900;background:rgba(255,176,32,.22);color:#ffb020}
  .fh-app.chiaro .pc-n{background:rgba(163,91,0,.15);color:#a35b00}
  .pc-nome{flex:1 1 auto;font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pc-av{font-style:normal;font-size:9px;font-weight:900;padding:1px 5px;border-radius:999px;
    background:rgba(255,84,66,.22);color:#ff8a7a;margin-left:4px}
  .pc-w{flex:0 0 auto;font-size:11.5px;font-weight:900;opacity:.8;min-width:54px;text-align:right}
  .pc-cmd{flex:0 0 auto;display:flex;gap:3px}
  .pc-cmd button{width:25px;height:25px;border:0;border-radius:8px;cursor:pointer;font:inherit;
    font-size:12px;font-weight:900;background:rgba(255,255,255,.08);color:inherit}
  .fh-app.chiaro .pc-cmd button{background:rgba(15,23,42,.08)}
  .pc-cmd button:disabled{opacity:.25;cursor:not-allowed}
  .pc-add{border:1px dashed rgba(255,176,32,.5);background:none;color:inherit;cursor:pointer;font:inherit;
    font-size:12px;font-weight:800;padding:9px;border-radius:12px}
  .pc-pick{display:flex;flex-direction:column;gap:7px}
  .pc-cerca{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:10px;font:inherit;font-size:13px;
    border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit}
  .fh-app.chiaro .pc-cerca{background:#fff;border-color:rgba(15,23,42,.18)}
  .pc-opz{max-height:230px;overflow:auto;display:flex;flex-direction:column;gap:3px}
  .pc-opt{text-align:left;border:0;background:rgba(255,255,255,.05);color:inherit;cursor:pointer;font:inherit;
    padding:7px 9px;border-radius:9px;display:flex;flex-direction:column;gap:1px}
  .fh-app.chiaro .pc-opt{background:rgba(15,23,42,.05)}
  .pc-opt span{font-size:12px;font-weight:700}
  .pc-opt small{font-size:9.5px;opacity:.6}
  .pc-vuoto{font-size:11.5px;opacity:.6;padding:7px 2px}
`;

class FaberPCEditor extends HTMLElement {
  setConfig(c) { this._cfg = Object.assign({}, PC_DEFAULTS, c || {}); this._render(); }
  set hass(h) { this._hass = h; }
  _set(k, v) {
    this._cfg = Object.assign({}, this._cfg, { [k]: v });
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true }));
  }
  _render() {
    if (this._fatto) return;
    this._fatto = true;
    this.innerHTML = `<style>${FCE_CSS}</style>
      <div class="fce">
        <div class="fce-f">
          <label>Titolo</label>
          <input class="fce-in" id="pceTit" value="${fhEsc(this._cfg.title || "")}">
        </div>
        <div class="fce-f">
          <span class="fce-h">Soglie, ordine dei carichi e aggiunta si regolano dal tasto
          Impostazioni della card, non da qui. Le automazioni di PowerControl non vengono toccate.</span>
        </div>
        <details class="fce-f">
          <summary style="cursor:pointer;font-size:13px;font-weight:700;padding:6px 0">Helper del pacchetto (avanzate)</summary>
          <span class="fce-h">Questi sono i nomi che la card va a leggere in Home Assistant. Si toccano solo
          se hai rinominato un helper o se usi un pacchetto diverso da quello standard. Vuoto = nome standard.</span>
          ${Object.keys(PC_HELPER).map(k => `<div class="fce-f">
            <label>${fhEsc(PC_HELPER[k].t)}</label>
            <input class="fce-in" data-hk="${k}" placeholder="${fhEsc(PC_HELPER[k].e)}"
              value="${fhEsc(((this._cfg.helper || {})[k]) || "")}">
          </div>`).join("")}
          ${Object.keys(PC_SCHEMI).map(k => `<div class="fce-f">
            <label>${fhEsc(PC_SCHEMI[k].t)}</label>
            <input class="fce-in" data-hk="${k}" placeholder="${fhEsc(PC_SCHEMI[k].e)}"
              value="${fhEsc(((this._cfg.helper || {})[k]) || "")}">
          </div>`).join("")}
          <button type="button" class="fce-in" id="pceReset" style="cursor:pointer;font-weight:700">Rimetti i nomi standard</button>
        </details>
      </div>`;
    this.querySelector("#pceTit").addEventListener("input", e => this._set("title", e.target.value));
    this.querySelectorAll("[data-hk]").forEach(el => el.addEventListener("change", () => {
      const h = Object.assign({}, this._cfg.helper || {});
      const v = el.value.trim();
      if (v) h[el.dataset.hk] = v; else delete h[el.dataset.hk];
      this._set("helper", h);
    }));
    this.querySelector("#pceReset").addEventListener("click", () => {
      this.querySelectorAll("[data-hk]").forEach(el => { el.value = ""; });
      this._set("helper", {});
    });
  }
}

customElements.define("faber-pc", FaberPC);
customElements.define("faber-pc-editor", FaberPCEditor);




/* ======================================================================== */
/* CARD: CLIMA                                                              */
/* Un condizionatore ha molte manopole, ma non tutte su tutti gli apparecchi:*/
/* i modi, le velocita, le alette e i programmi si leggono da quello che     */
/* l'apparecchio DICHIARA, non da un elenco fisso. Mostrare un tasto che poi */
/* fallisce e peggio che non mostrarlo.                                      */
/* ======================================================================== */

const FK_DEFAULTS = {
  name: "",
  climate: "",
  temp: "",
  humidity: "",
  power: "",
  presa: "",
  energy: "",
  prezzo_kwh: 0.30,
  storico_giorni: 14,
  aspetto: "auto",
  mostra_ventola: true,
  mostra_alette: true,
  mostra_programmi: true,
  // Di serie chiede conferma: il tasto sta dove si tocca la card per aprirla,
  // e premerlo per sbaglio significa accendere o spegnere davvero. Chi lo
  // vuole immediato toglie la spunta nella Configura.
  conferma_accensione: true,
};

const FK_MODI = {
  off: { t: "Spento", i: "mdi:power", c: "#93a1b0", g: "#4b5563" },
  cool: { t: "Fresco", i: "mdi:snowflake", c: "#4fc3f7", g: "#0369a1" },
  heat: { t: "Caldo", i: "mdi:fire", c: "#ff8a4c", g: "#b3400e" },
  heat_cool: { t: "Automatico", i: "mdi:autorenew", c: "#a78bfa", g: "#5b3bb8" },
  auto: { t: "Automatico", i: "mdi:autorenew", c: "#a78bfa", g: "#5b3bb8" },
  dry: { t: "Deumidifica", i: "mdi:water-percent", c: "#ffb020", g: "#9a5b00" },
  fan_only: { t: "Ventola", i: "mdi:fan", c: "#38e08a", g: "#0f7a3d" },
};

const FK_VENTOLA = {
  auto: "Auto", low: "Bassa", middle_low: "Medio-bassa", medium: "Media",
  middle_high: "Medio-alta", high: "Alta", quiet: "Silenziosa", focus: "Diretta", diffuse: "Diffusa",
};

const FK_ALETTE = {
  swing: "Oscilla", auto: "Auto", top: "In alto", high: "Alta", mid_high: "Medio-alta",
  mid_low: "Medio-bassa", low: "Bassa", bottom: "In basso", off: "Ferme",
  both_sides: "Ai lati", left: "Sinistra", forward: "Avanti", right: "Destra",
};

const FK_PROGRAMMI = {
  none: "Nessuno", eco: "Eco", mute: "Silenzioso", eco_mute: "Eco silenzioso",
  super: "Turbo", boost: "Turbo", comfort: "Comfort", sleep: "Notte", away: "Assente",
  home: "In casa", activity: "Attivita",
};

function fkGiorno(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function fkNome(mappa, k) {
  if (mappa === FK_PROGRAMMI && /^sleep_(\d)$/.test(k)) return "Notte " + k.slice(-1);
  if (mappa === FK_PROGRAMMI && /^eco_sleep_(\d)$/.test(k)) return "Eco notte " + k.slice(-1);
  return mappa[k] || k.replace(/_/g, " ");
}

// "Ventola, alette e consumi": l'ultima si unisce con la "e", come si scrive
// parlando. Il tasto dice cosa c'e dentro invece di un generico "altro".
function fkElenco(voci) {
  const v = voci.slice();
  const testo = v.length > 1 ? v.slice(0, -1).join(", ") + " e " + v[v.length - 1] : v[0] || "";
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

// Il disegno cambia col tipo di apparecchio: uno split appeso al muro non e
// una stufa a pellet, e una fiammella al posto delle onde d'aria si capisce
// al volo. Si indovina dal nome, ma resta modificabile a mano.
function fkAspetto(cfg, st) {
  if (cfg.aspetto && cfg.aspetto !== "auto") return cfg.aspetto;
  const n = ((cfg.name || "") + " " + ((st && st.attributes.friendly_name) || "") + " " + (cfg.climate || "")).toLowerCase();
  if (/pellet|stufa|caminetto|camino/.test(n)) return "stufa";
  if (/termo|caldaia|riscaldament|radiator/.test(n)) return "radiatore";
  return "split";
}

function fkDisegno(tipo) {
  if (tipo === "stufa") {
    return `<svg viewBox="0 0 72 58" aria-hidden="true">
      <rect class="fk-corpo" x="14" y="6" width="44" height="46" rx="7"/>
      <rect class="fk-vetro" x="21" y="14" width="30" height="24" rx="4"/>
      <rect class="fk-griglia" x="21" y="43" width="30" height="3.4" rx="1.7"/>
      <circle class="fk-spia" cx="53" cy="10.5" r="2.2"/>
      <path class="fk-fiamma f1" d="M36 36 c-5 -3 -6 -8 -3 -12 c0 3 2 4 3 3 c-1 -4 1 -7 4 -9 c-1 4 1 5 2 7 c2 4 1 9 -6 11 Z"/>
      <path class="fk-fiamma f2" d="M32 36 c-3 -2 -3.5 -5 -1.5 -7.5 c0 2 1.2 2.6 1.8 1.8 c-0.6 -2.4 0.6 -4.2 2.4 -5.4 c-0.6 2.4 0.6 3 1.2 4.2 c1.2 2.4 0.6 5.4 -3.9 6.9 Z"/>
      <path class="fk-legna" d="M25 47.5 h22" />
    </svg>`;
  }
  if (tipo === "radiatore") {
    return `<svg viewBox="0 0 72 58" aria-hidden="true">
      <rect class="fk-corpo" x="12" y="12" width="48" height="34" rx="6"/>
      <path class="fk-griglia2" d="M22 16 v26 M30 16 v26 M38 16 v26 M46 16 v26 M54 16 v26"/>
      <circle class="fk-spia" cx="16.5" cy="16.5" r="2"/>
      <path class="fk-onda o1" d="M20 52 q6 -5 12 0 t12 0"/>
      <path class="fk-onda o2" d="M26 56 q6 -5 12 0"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 72 58" aria-hidden="true">
    <rect class="fk-corpo" x="4" y="6" width="64" height="22" rx="7"/>
    <rect class="fk-griglia" x="9" y="20" width="54" height="3.4" rx="1.7"/>
    <circle class="fk-spia" cx="60" cy="13" r="2.2"/>
    <path class="fk-onda o1" d="M14 38 q7 -6 14 0 t14 0"/>
    <path class="fk-onda o2" d="M18 46 q7 -6 14 0 t14 0"/>
    <path class="fk-onda o3" d="M22 54 q7 -6 14 0 t14 0"/>
  </svg>`;
}

class FaberClima extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-clima-editor"); }
  static getStubConfig(hass) {
    const c = Object.keys(hass && hass.states ? hass.states : {})
      .filter(id => id.startsWith("climate.") && hass.states[id].state !== "unavailable");
    return Object.assign({}, FK_DEFAULTS, { climate: c[0] || "", presa: "" });
  }

  setConfig(config) {
    this._cfg = Object.assign({}, FK_DEFAULTS, JSON.parse(JSON.stringify(config || {})));
    this._built = false;
    this._imp = null;
    if (this._hass) this._render();
  }
  set hass(h) {
    const primo = !this._hass;
    this._hass = h;
    this._render();
    if (primo) this._caricaConsumi();
  }
  getCardSize() { return 6; }

  _st() { return this._cfg.climate ? this._hass.states[this._cfg.climate] : null; }
  // Attenzione a isFinite: con l'entita non configurata la catena restituiva
  // stringa vuota, e isFinite("") e VERO (Number("") vale 0). Risultato:
  // comparivano "0%" di umidita e "0 W" per sensori che non esistono.
  _num(id) {
    if (!id) return null;
    const s = this._hass.states[id];
    if (!s) return null;
    const v = parseFloat(s.state);
    return isFinite(v) ? v : null;
  }

  // ---- quanto ha consumato -------------------------------------------------
  // Due strade, e la scelta non e di comodo. Se c'e un contatore di energia si
  // usa quello (statistiche gia pronte, un colpo solo). Se c'e solo la
  // potenza, si integra nel tempo: e quello che fa la card del forno, e su
  // questa casa funziona bene perche le prese misurano di continuo.
  async _caricaConsumi() {
    const c = this._cfg;
    if (!c.energy && !c.power) { this._consumi = null; return; }
    const firma = (c.energy || c.power) + "|" + (c.storico_giorni || 14);
    if (this._consumiPer === firma && Date.now() - (this._consumiTs || 0) < 600000) return;
    this._consumiPer = firma;
    this._consumiTs = Date.now();
    const giorni = Math.max(2, Math.min(60, parseInt(c.storico_giorni, 10) || 14));
    const al = new Date();
    const dal = new Date(al.getTime() - giorni * 86400000);
    try {
      let perGiorno = {};
      if (c.energy) {
        const res = await this._hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: dal.toISOString(), end_time: al.toISOString(),
          statistic_ids: [c.energy], period: "hour", types: ["change"],
        });
        // Un contatore che salta di colpo (riavvio, sostituzione) inventerebbe
        // consumi enormi: sopra i 5 kWh in un'ora si scarta il valore.
        ((res && res[c.energy]) || []).forEach(r => {
          let k = (r.change && r.change > 0) ? r.change : 0;
          if (k > 5) k = 0;
          const g = fkGiorno(new Date(r.start));
          perGiorno[g] = (perGiorno[g] || 0) + k;
        });
      } else {
        const res = await this._hass.callWS({
          type: "history/history_during_period",
          start_time: dal.toISOString(), end_time: al.toISOString(),
          entity_ids: [c.power], minimal_response: true, no_attributes: true,
        });
        const punti = ((res && res[c.power]) || []).map(r => ({
          t: r.lu !== undefined ? r.lu * 1000 : new Date(r.last_updated || r.lc).getTime(),
          w: parseFloat(r.s !== undefined ? r.s : r.state),
        })).filter(x => isFinite(x.t) && isFinite(x.w)).sort((a, b) => a.t - b.t);
        // Un buco lungo (apparecchio offline) non va riempito col valore
        // precedente: si conta al massimo un'ora fra due letture.
        const MAX_S = 3600;
        for (let i = 0; i < punti.length - 1; i++) {
          const dt = Math.min(MAX_S, (punti[i + 1].t - punti[i].t) / 1000);
          if (dt <= 0) continue;
          const kwh = Math.max(0, punti[i].w) * dt / 3600 / 1000;
          const g = fkGiorno(new Date(punti[i].t));
          perGiorno[g] = (perGiorno[g] || 0) + kwh;
        }
      }
      this._consumi = perGiorno;
    } catch (e) {
      this._consumi = null;
    }
    this._imp = null;
    this._render();
  }

  _consumiHTML(colore, coloreGiorno) {
    const g = this._consumi;
    if (!g) return "";
    const c = this._cfg;
    const prezzo = parseFloat(c.prezzo_kwh) || 0;
    const giorni = Math.max(2, Math.min(60, parseInt(c.storico_giorni, 10) || 14));
    const oggi = fkGiorno(new Date());
    const chiavi = [];
    for (let i = giorni - 1; i >= 0; i--) {
      chiavi.push(fkGiorno(new Date(Date.now() - i * 86400000)));
    }
    const val = chiavi.map(k => g[k] || 0);
    if (!val.some(v => v > 0.001)) return "";
    const mx = Math.max(...val, 0.001);
    const tot = val.reduce((a, b) => a + b, 0);
    const media = tot / giorni;
    const eur = n => (n * prezzo).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20ac";
    const kwh = n => n.toLocaleString("it-IT", { minimumFractionDigits: n < 10 ? 2 : 1, maximumFractionDigits: 2 });

    return `<div class="fk-cons">
      <div class="fk-crighe">
        <div><div class="fk-clab">Oggi</div>
          <div class="fk-cval" style="color:${colore};--fh-giorno:${coloreGiorno}">${kwh(g[oggi] || 0)}<small>kWh</small></div>
          <div class="fk-ceur">${eur(g[oggi] || 0)}</div></div>
        <div><div class="fk-clab">Media al giorno</div>
          <div class="fk-cval">${kwh(media)}<small>kWh</small></div>
          <div class="fk-ceur">${eur(media)}</div></div>
        <div><div class="fk-clab">In ${giorni} giorni</div>
          <div class="fk-cval">${kwh(tot)}<small>kWh</small></div>
          <div class="fk-ceur">${eur(tot)}</div></div>
      </div>
      <div class="fk-cbarre">
        ${val.map((v, i) => {
          const d = new Date(Date.now() - (giorni - 1 - i) * 86400000);
          const h = Math.max(2, Math.round(v / mx * 100));
          return `<div class="fk-cb${i === val.length - 1 ? " oggi" : ""}"
            title="${d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" })}: ${kwh(v)} kWh">
            <span style="height:${h}%;background:${v > 0 ? colore : "rgba(255,255,255,.12)"}"></span></div>`;
        }).join("")}
      </div>
    </div>`;
  }

  _srv(servizio, dati) {
    fhVibra();
    this._hass.callService("climate", servizio, Object.assign({ entity_id: this._cfg.climate }, dati));
  }

  // Un'impronta di cio che la card mostra davvero. Serve perche _render viene
  // chiamato a ogni cambio di stato in casa - con decine di sensori, molte
  // volte al secondo - e ogni volta rifaceva l'HTML da capo: la fila dei
  // programmi tornava all'inizio proprio mentre la stavi scorrendo.
  _impronta(st) {
    if (!st) return "vuoto";
    const a = st.attributes;
    const c = this._cfg;
    const v = id => { const x = id && this._hass.states[id]; return x ? x.state : ""; };
    return [st.state, a.temperature, a.current_temperature, a.fan_mode, a.swing_mode,
      a.preset_mode, a.hvac_action, (a.hvac_modes || []).join(","),
      v(c.temp), v(c.humidity), v(c.power), v(c.presa),
      c.name, c.mostra_ventola, c.mostra_alette, c.mostra_programmi, c.aspetto,
      c.energy, c.prezzo_kwh, c.storico_giorni,
      ["on", "off"].map(q => { const e = this._timerEntita(q); return e ? this._hass.states[e].state : ""; }).join(",")].join("|");
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const st = this._st();

    // Niente e cambiato: non si tocca nulla. Cosi lo scorrimento resta dove
    // l'hai lasciato e il browser non lavora per niente.
    const imp = this._impronta(st);
    if (this._built && imp === this._imp) return;
    this._imp = imp;

    if (!this._built) {
      this.innerHTML = `<style>${FK_CSS}</style><ha-card class="fk"><div class="fk-body"></div></ha-card>`;
      this._card = this.querySelector(".fk");
      this._body = this.querySelector(".fk-body");
      this._built = true;
    }

    if (!st) {
      this._card.style.backgroundImage = "";
      this._body.innerHTML = `<div class="fk-vuoto">${this._cfg.climate
        ? "Non trovo " + fhEsc(this._cfg.climate)
        : "Scegli un climatizzatore nelle impostazioni della card."}</div>`;
      return;
    }

    const a = st.attributes;
    const modo = st.state;
    const m = FK_MODI[modo] || { t: modo, i: "mdi:help-circle-outline", c: "#93a1b0", g: "#4b5563" };
    const acceso = modo !== "off" && modo !== "unavailable";
    const f = a.supported_features || 0;

    // La presa e un'altra cosa dal telecomando: staccare la corrente non
    // "spegne" il condizionatore, lo lascia senza alimentazione. Sono due
    // comandi distinti, e col filo staccato il telecomando non serve a nulla.
    const tipoDisegno = fkAspetto(this._cfg, st);
    const presaSt = this._cfg.presa ? this._hass.states[this._cfg.presa] : null;
    const presaOn = presaSt ? presaSt.state === "on" : true;
    const senzaCorrente = !!presaSt && !presaOn;
    const timerAcceso = ["on", "off", "once_on", "once_off"].some(q => {
      const e = this._timerEntita(q);
      return e && this._hass.states[e].state === "on";
    });

    // La tinta della card segue il modo, sovrapposta al pannello.
    this._card.style.backgroundImage = acceso
      ? `linear-gradient(160deg, ${m.c}26, ${m.c}0d)` : "";
    this._card.style.borderColor = acceso ? m.c + "59" : "";
    this._card.classList.toggle("on", acceso);

    // La temperatura vera preferisce un sensore dedicato: molti split non la
    // misurano (current_temperature nullo) o la misurano dove soffiano.
    const ora = this._num(this._cfg.temp) ?? a.current_temperature;
    const uman = this._num(this._cfg.humidity);
    const watt = this._num(this._cfg.power);
    const obiettivo = a.temperature;
    const passo = a.target_temp_step || 0.5;
    const nome = this._cfg.name || a.friendly_name || "Clima";

    const modi = (a.hvac_modes || []).filter(x => x !== "off");
    const vent = this._cfg.mostra_ventola && (f & 8) ? (a.fan_modes || []) : [];
    const alette = this._cfg.mostra_alette && (f & 32) ? (a.swing_modes || []) : [];
    const prog = this._cfg.mostra_programmi && (f & 16) ? (a.preset_modes || []) : [];
    // Alcuni apparecchi dicono di sapere impostare la temperatura ma in certi
    // modi (ventola, deumidifica) non ha senso: si nasconde invece di mentire.
    const puoTemp = (f & 1) && obiettivo != null && !["fan_only", "dry", "off"].includes(modo);

    this._card.classList.toggle("staccato", senzaCorrente);

    // Ventola, alette, programma e il grafico dei consumi non stanno piu nella
    // card: allungavano una tessera che deve restare bassa e leggibile a
    // colpo d'occhio. Vanno nel foglio che si apre da qui, e il tasto dice
    // cosa ci trovi dentro invece di un generico "altro".
    const vociDett = [];
    if (vent.length) vociDett.push("ventola");
    if (alette.length) vociDett.push("alette");
    if (prog.length) vociDett.push("programma");
    if (this._consumiHTML(m.c, m.c)) vociDett.push("consumi");

    // Anche quando il ridisegno serve davvero, le file tornano dov'erano.
    const scorri = {};
    this._body.querySelectorAll(".fk-rscroll").forEach(r => { scorri[r.dataset.riga] = r.scrollLeft; });

    this._body.innerHTML = `
      <div class="fk-top">
        <div class="fk-titolo">
          <div class="fk-nome">${fhEsc(nome)}</div>
          <div class="fk-modo" style="color:${m.c};--fh-giorno:${m.g || m.c}"><ha-icon icon="${m.i}"></ha-icon>${fhEsc(m.t)}</div>
        </div>
        <div class="fk-comandi">
          <button type="button" class="fk-timerb${timerAcceso ? " on" : ""}" data-timer
            title="Timer di spegnimento"><ha-icon icon="mdi:timer-outline"></ha-icon></button>
          ${presaSt ? `<button type="button" class="fk-presa${presaOn ? " on" : ""}" data-presa
            title="${presaOn ? "Stacca la corrente" : "Dai corrente"}">
            <ha-icon icon="mdi:power-plug${presaOn ? "" : "-off"}"></ha-icon>
          </button>` : ""}
          <button type="button" class="fk-power${acceso ? " on" : ""}" data-power
            ${senzaCorrente ? "disabled" : ""} title="Accendi o spegni">
            <ha-icon icon="mdi:power"></ha-icon>
          </button>
        </div>
      </div>

      <div class="fk-centro">
        <div class="fk-split ${tipoDisegno}${acceso ? " viva" : ""}" style="--fk-c:${m.c}">
          ${fkDisegno(tipoDisegno)}
        </div>
        <div class="fk-lettura">
          <div class="fk-ora">${ora != null ? Math.round(ora * 10) / 10 : "--"}<span>&deg;</span></div>
          <div class="fk-oralab">${this._cfg.temp || a.current_temperature != null ? "in stanza" : "nessun sensore"}</div>
        </div>
      </div>

      ${puoTemp ? `<div class="fk-target">
        <button type="button" class="fk-tbtn" data-t="-">&minus;</button>
        <div class="fk-tval"><b>${obiettivo}</b><span>&deg;C</span><small>impostata</small></div>
        <button type="button" class="fk-tbtn" data-t="+">+</button>
      </div>` : ""}

      ${senzaCorrente ? `<div class="fk-staccato">
        <ha-icon icon="mdi:power-plug-off"></ha-icon>
        Corrente staccata &mdash; ${tipoDisegno === "stufa" ? "la stufa non riceve comandi"
          : tipoDisegno === "radiatore" ? "il termosifone non riceve comandi"
          : "il condizionatore non risponde al telecomando"}.
      </div>` : ""}

      <div class="fk-modi">
        ${modi.map(k => {
          const mm = FK_MODI[k] || { t: k, i: "mdi:circle-outline", c: "#93a1b0", g: "#4b5563" };
          const sel = modo === k;
          return `<button type="button" class="fk-mb${sel ? " sel" : ""}" data-modo="${fhEsc(k)}"
            style="${sel ? `--fk-c:${mm.c}` : ""}"><ha-icon icon="${mm.i}"></ha-icon>${fhEsc(mm.t)}</button>`;
        }).join("")}
      </div>

      ${(uman != null || watt != null) ? `<div class="fk-info">
        ${uman != null ? `<span><ha-icon icon="mdi:water-percent"></ha-icon>${Math.round(uman)}%</span>` : ""}
        ${watt != null ? `<span><ha-icon icon="mdi:lightning-bolt"></ha-icon>${Math.round(watt)} W</span>` : ""}
      </div>` : ""}

      ${vociDett.length ? `<button type="button" class="fk-piu" data-piu>
        <ha-icon icon="mdi:tune-variant"></ha-icon>
        <span>${fhEsc(fkElenco(vociDett))}</span>
        <ha-icon class="fk-piuch" icon="mdi:chevron-right"></ha-icon>
      </button>` : ""}
    `;

    this._body.querySelectorAll(".fk-rscroll").forEach(r => {
      if (scorri[r.dataset.riga] != null) r.scrollLeft = scorri[r.dataset.riga];
    });

    const q = sel => this._body.querySelectorAll(sel);
    this._body.querySelector("[data-timer]").addEventListener("click", () => this._openTimer());
    const bp = this._body.querySelector("[data-presa]");
    if (bp) bp.addEventListener("click", () => {
      const dom = this._cfg.presa.split(".")[0];
      // Un colpetto piu deciso: qui si toglie la CORRENTE, non si spegne.
      fhVibra(25);
      this._hass.callService(dom, presaOn ? "turn_off" : "turn_on", { entity_id: this._cfg.presa });
    });
    this._body.querySelector("[data-power]").addEventListener("click", () => {
      if (senzaCorrente) return;
      const fai = () => {
        if (acceso) this._srv("set_hvac_mode", { hvac_mode: "off" });
        else this._srv("set_hvac_mode", { hvac_mode: modi.includes("cool") ? "cool" : modi[0] });
      };
      // Il tasto sta proprio dove si tocca la card per aprirla: da spenta,
      // un dito un po' impreciso lo preme per sbaglio invece di aprire il
      // popup. Chi lo vuole puo far chiedere conferma; di serie resta
      // immediato, come e sempre stato.
      // "!== false": le card create prima che questa opzione esistesse non
      // hanno il campo salvato, e devono comportarsi come le nuove.
      if (this._cfg.conferma_accensione !== false) {
        this._confirm(acceso ? "Spegnere il climatizzatore?" : "Accendere il climatizzatore?", fai);
      } else fai();
    });
    q("[data-t]").forEach(b => b.addEventListener("click", () => {
      const d = b.dataset.t === "+" ? passo : -passo;
      const v = Math.min(a.max_temp ?? 35, Math.max(a.min_temp ?? 7, obiettivo + d));
      this._srv("set_temperature", { temperature: Math.round(v * 10) / 10 });
    }));
    q("[data-modo]").forEach(b => b.addEventListener("click", () => this._srv("set_hvac_mode", { hvac_mode: b.dataset.modo })));
    const bpiu = this._body.querySelector("[data-piu]");
    if (bpiu) bpiu.addEventListener("click", () => this._openDettagli());

    // Il foglio dei dettagli, se e aperto, mostra gli stessi valori: quando la
    // card si ridisegna si ridisegna anche lui, altrimenti resta indietro e la
    // velocita selezionata la vedresti solo richiudendo e riaprendo.
    if (this._dett) this._dettagliDisegna();
  }

  // -------------------------------------------------- ventola, alette, consumi
  _openDettagli() {
    this._chiudiDettagli();
    const st = this._st();
    const nome = this._cfg.name || (st && st.attributes.friendly_name) || "Clima";
    const scrim = document.createElement("div");
    scrim.className = "fk-scrim";
    scrim.innerHTML = `<div class="fk-modal"><div class="fk-mbody">
      <div class="fk-mh">
        <div class="fk-mt">${fhEsc(nome)}</div>
        <button type="button" class="fk-mx" data-chiudi>&#10005;</button>
      </div>
      <div class="fk-dett"></div>
    </div></div>`;
    scrim.addEventListener("click", e => { if (e.target === scrim) this._chiudiDettagli(); });
    scrim.querySelector("[data-chiudi]").addEventListener("click", () => this._chiudiDettagli());
    // Fuori dalla ha-card: dentro, il bordo sfocato la trasformerebbe nel
    // riferimento del position:fixed e il foglio resterebbe schiacciato nei
    // suoi bordi invece di coprire lo schermo.
    this.appendChild(scrim);
    this._dett = scrim;
    this._dettagliDisegna();
  }

  _chiudiDettagli() {
    if (this._dett) { this._dett.remove(); this._dett = null; }
  }

  _dettagliDisegna() {
    if (!this._dett) return;
    const st = this._st();
    if (!st) { this._chiudiDettagli(); return; }
    const a = st.attributes;
    const c = this._cfg;
    const f = a.supported_features || 0;
    const m = FK_MODI[st.state] || { c: "#93a1b0", g: "#4b5563" };
    const vent = c.mostra_ventola && (f & 8) ? (a.fan_modes || []) : [];
    const alette = c.mostra_alette && (f & 32) ? (a.swing_modes || []) : [];
    const prog = c.mostra_programmi && (f & 16) ? (a.preset_modes || []) : [];
    const box = this._dett.querySelector(".fk-dett");

    const scorri = {};
    box.querySelectorAll(".fk-rscroll").forEach(r => { scorri[r.dataset.riga] = r.scrollLeft; });

    // Il foglio e scuro anche di giorno: al colore "da giorno" si passa lo
    // stesso colore vivo della notte, altrimenti la cifra dei consumi
    // diventerebbe scura su fondo scuro.
    box.innerHTML = `
      ${vent.length ? this._riga("Ventola", "fan", vent, a.fan_mode, FK_VENTOLA) : ""}
      ${alette.length ? this._riga("Alette", "swing", alette, a.swing_mode, FK_ALETTE) : ""}
      ${prog.length ? this._riga("Programma", "preset", prog, a.preset_mode, FK_PROGRAMMI) : ""}
      ${this._consumiHTML(m.c, m.c)}`;

    box.querySelectorAll(".fk-rscroll").forEach(r => {
      if (scorri[r.dataset.riga] != null) r.scrollLeft = scorri[r.dataset.riga];
    });
    const q = sel => box.querySelectorAll(sel);
    q("[data-fan]").forEach(b => b.addEventListener("click", () => this._srv("set_fan_mode", { fan_mode: b.dataset.fan })));
    q("[data-swing]").forEach(b => b.addEventListener("click", () => this._srv("set_swing_mode", { swing_mode: b.dataset.swing })));
    q("[data-preset]").forEach(b => b.addEventListener("click", () => this._srv("set_preset_mode", { preset_mode: b.dataset.preset })));
  }

  // Stessa forma del foglio di conferma delle altre card di famiglia (la
  // sicurezza, il frigo...): un riquadro scuro sempre uguale, qualunque sia
  // il tema del pannello, cosi non serve inventare un'altra combinazione di
  // colori solo per un si/no.
  _confirm(testo, siFai) {
    // Via il vecchio, se c'e: non si riusa un foglio gia appeso (era il modo
    // per ritrovarsi con la comparsa a meta).
    const vecchio = this.querySelector(".fk-scrim.fk-conf");
    if (vecchio) vecchio.remove();
    const ov = document.createElement("div");
    ov.className = "fk-scrim fk-conf";
    ov.innerHTML = `<div class="fk-confirm">
      <div class="fk-confirm-txt">${fhEsc(testo)}</div>
      <div class="fk-confirm-row">
        <button type="button" class="fk-cbtn" data-no>Annulla</button>
        <button type="button" class="fk-cbtn warn" data-si>Conferma</button>
      </div>
    </div>`;
    // Attaccato a "this" (fuori dalla ha-card), non a this._card: la card ha
    // overflow:hidden e backdrop-filter, che creano un containing block per
    // gli elementi position:fixed e intrappolano il foglio dentro i suoi
    // bordi invece di coprire tutto lo schermo. Verificato dal vivo: senza
    // questo il foglio esisteva nel DOM ma non si vedeva da nessuna parte.
    this.appendChild(ov);
    // Nessuna dissolvenza da innescare a mano: il foglio nasce visibile e
    // l'entrata la fa un'animazione CSS, che parte da sola. Con la comparsa
    // affidata a una transizione (e a requestAnimationFrame) bastava che la
    // scheda non fosse in primo piano perche restasse trasparente pur essendo
    // aperto — visto succedere dal vivo.
    const chiudi = () => ov.remove();
    ov.querySelector("[data-no]").onclick = chiudi;
    ov.querySelector("[data-si]").onclick = () => { chiudi(); siFai(); };
    ov.onclick = e => { if (e.target === ov) chiudi(); };
  }

  // =================================================================== timer
  // Non un conto alla rovescia del browser (morirebbe chiudendo la pagina):
  // due VERE automazioni di Home Assistant, una per l'accensione e una per lo
  // spegnimento, visibili e modificabili anche da Impostazioni.
  //
  // Ogni giorno puo avere il suo orario. Si ottiene con un trigger per giorno
  // (che porta l'id del giorno) e una condizione che accoppia "quale trigger e
  // scattato" con "che giorno e oggi": cosi le azioni si scrivono una volta
  // sola invece di ripeterle sette volte.
  _timerId(quale) {
    const slug = (this._cfg.climate || "").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    return "faber_clima_" + quale + "_" + slug;
  }

  // L'entita dell'automazione si ritrova dal suo id interno, non dal nome: il
  // nome lo slugifica Home Assistant e non e prevedibile.
  _timerEntita(quale) {
    const id = this._timerId(quale || "off");
    return Object.keys(this._hass.states).find(e =>
      e.startsWith("automation.") && this._hass.states[e].attributes.id === id) || null;
  }

  async _leggiTimer(quale) {
    try { return await this._hass.callApi("get", "config/automation/config/" + this._timerId(quale)); }
    catch (e) { return null; }
  }

  _minutiDa(v) {
    if (v == null) return 0;
    if (typeof v === "number") return Math.round(v / 60);
    if (typeof v === "object") return (v.hours || 0) * 60 + (v.minutes || 0) + Math.round((v.seconds || 0) / 60);
    const m = String(v).match(/^(\d+):(\d+)/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
  }

  _hhmm(t) { return String(t || "").slice(0, 5); }

  _sommaMinuti(hhmm, minuti) {
    const [h, m] = this._hhmm(hhmm).split(":").map(Number);
    let tot = h * 60 + m + minuti;
    tot = ((tot % 1440) + 1440) % 1440;
    return String(Math.floor(tot / 60)).padStart(2, "0") + ":" + String(tot % 60).padStart(2, "0");
  }

  // Rilegge il programma dalle automazioni: sono loro la fonte della verita,
  // cosi la card non puo mostrare una cosa e farne un'altra.
  _leggiOrari(cfg, anticipo) {
    const out = {};
    if (!cfg) return out;
    (cfg.triggers || cfg.trigger || []).forEach(t => {
      if (!t || !t.id || typeof t.at !== "string") return;
      out[t.id] = anticipo ? this._sommaMinuti(t.at, anticipo) : this._hhmm(t.at);
    });
    return out;
  }

  async _openTimer() {
    const scrim = document.createElement("div");
    scrim.className = "fk-scrim";
    const st = this._st();
    const nome = this._cfg.name || (st && st.attributes.friendly_name) || "Clima";
    scrim.innerHTML = `<div class="fk-modal"><div class="fk-mbody">Leggo il programma...</div></div>`;
    scrim.addEventListener("click", e => { if (e.target === scrim) scrim.remove(); });
    this.appendChild(scrim);
    const body = scrim.querySelector(".fk-mbody");

    const cfgOn = await this._leggiTimer("on");
    const cfgOff = await this._leggiTimer("off");
    const entOn = this._timerEntita("on"), entOff = this._timerEntita("off");

    // --------------------------------------------- cosa c'e gia impostato
    const azOn = (cfgOn && (cfgOn.actions || cfgOn.action)) || [];
    const azOff = (cfgOff && (cfgOff.actions || cfgOff.action)) || [];
    const spinaOn = azOn.some(a => a && a.action === "switch.turn_on");
    const spinaOff = azOff.some(a => a && a.action === "switch.turn_off");
    const attesa = azOff.find(a => a && a.wait_for_trigger);
    const ritardo = azOn.find(a => a && a.delay);

    const p = {
      gestisciSpina: !!(spinaOn || spinaOff),
      anticipo: ritardo ? this._minutiDa(ritardo.delay) : 10,
      soglia: 10,
      minuti: 10,
      modo: "cool",
      temp: null,
    };
    if (attesa) {
      const tr = (attesa.wait_for_trigger || [])[0] || {};
      if (typeof tr.below === "number") p.soglia = tr.below;
      p.minuti = this._minutiDa(tr.for) || 10;
    }
    const azModo = azOn.find(a => a && a.action === "climate.set_hvac_mode");
    if (azModo && azModo.data) p.modo = azModo.data.hvac_mode;
    const azTemp = azOn.find(a => a && a.action === "climate.set_temperature");
    if (azTemp && azTemp.data) p.temp = azTemp.data.temperature;

    const orariOn = this._leggiOrari(cfgOn, p.gestisciSpina ? p.anticipo : 0);
    const orariOff = this._leggiOrari(cfgOff, 0);

    const cfgOnceOn = await this._leggiTimer("once_on");
    const cfgOnceOff = await this._leggiTimer("once_off");
    const primoOrario = c => {
      const t = ((c && (c.triggers || c.trigger)) || [])[0];
      return t && typeof t.at === "string" ? this._hhmm(t.at) : "";
    };
    let onceOn = primoOrario(cfgOnceOn);
    let onceOff = primoOrario(cfgOnceOff);

    // Lo stato "attivo" guarda tutte e quattro le automazioni: un ordine
    // singolo da solo e comunque un timer che c'e, e va poter sospendere.
    const tutteEnt = ["on", "off", "once_on", "once_off"].map(q => this._timerEntita(q)).filter(Boolean);
    let attivo = tutteEnt.some(e => this._hass.states[e].state === "on");

    // Sospendere o riattivare non e "finire": si resta nel pannello e si vede
    // il risultato. Prima chiudeva tutto, e per controllare bisognava
    // riaprirlo da capo.
    const cambiaStato = async () => {
      const srv = attivo ? "turn_off" : "turn_on";
      for (const e of tutteEnt) await this._hass.callService("automation", srv, { entity_id: e });
      await new Promise(r => setTimeout(r, 700));
      attivo = tutteEnt.some(e => this._hass.states[e] && this._hass.states[e].state === "on");
      disegna();
    };
    const esisteQualcosa = !!(cfgOn || cfgOff || cfgOnceOn || cfgOnceOff);

    const GG = [["mon", "Lunedi"], ["tue", "Martedi"], ["wed", "Mercoledi"], ["thu", "Giovedi"],
                ["fri", "Venerdi"], ["sat", "Sabato"], ["sun", "Domenica"]];
    const a = st ? st.attributes : {};
    const modi = (a.hvac_modes || []).filter(x => x !== "off");
    if (!modi.includes(p.modo)) p.modo = modi[0] || "heat";
    const haPresa = !!this._cfg.presa;
    const haPotenza = !!this._cfg.power;

    const leggiCampi = () => {
      body.querySelectorAll("[data-on],[data-off]").forEach(i => {
        const g = i.dataset.on || i.dataset.off;
        if (i.dataset.on !== undefined) { if (i.value) orariOn[g] = i.value; else delete orariOn[g]; }
        else { if (i.value) orariOff[g] = i.value; else delete orariOff[g]; }
      });
      const q = id => body.querySelector(id);
      if (q("#pAnt")) p.anticipo = parseInt(q("#pAnt").value, 10) || 0;
      if (q("#pSog")) p.soglia = parseFloat(q("#pSog").value) || 0;
      if (q("#pMin")) p.minuti = parseInt(q("#pMin").value, 10) || 0;
      if (q("#pTemp")) p.temp = q("#pTemp").value === "" ? null : parseFloat(q("#pTemp").value);
      // Anche l'ordine singolo: prima Salva ignorava questi due campi, e chi
      // scriveva un orario qui e premeva Salva non salvava niente.
      if (q("#oOn")) onceOn = q("#oOn").value;
      if (q("#oOff")) onceOff = q("#oOff").value;
    };

    const disegna = () => {
      const qualcosa = Object.keys(orariOn).length || Object.keys(orariOff).length;
      // Solo spegnimenti e nessuna accensione: e un caso legittimo, ma con la
      // presa gestita ha una conseguenza che va detta prima, non scoperta.
      const soloSpegnimento = Object.keys(orariOff).filter(k => orariOff[k]).length > 0
        && Object.keys(orariOn).filter(k => orariOn[k]).length === 0;
      body.innerHTML = `
        <div class="fk-mh">
          <div class="fk-mt">Programmazione</div>
          ${esisteQualcosa ? `<span class="fk-swlab">${attivo ? "Attivo" : "Sospeso"}</span>
            <button type="button" class="fk-sw${attivo ? " on" : ""}" data-sw
            title="${attivo ? "Sospendi: gli orari restano scritti" : "Riattiva con gli orari di prima"}"><span></span></button>` : ""}
          <button type="button" class="fk-mx" data-chiudi>&times;</button>
        </div>

        <div class="fk-mgruppo">Solo per stavolta</div>
        <div class="fk-mnota">Un ordine singolo che non tocca il programma settimanale: scatta la prossima volta che l'orologio segna quell'ora, poi si disattiva da solo.</div>
        <div class="fk-once">
          <label><span>Accendi alle</span><input type="time" id="oOn" value="${fhEsc(onceOn)}"></label>
          <label><span>Spegni alle</span><input type="time" id="oOff" value="${fhEsc(onceOff)}"></label>
        </div>
        <div class="fk-mrighe">
          ${[30, 60, 90, 120].map(m => `<button type="button" class="fk-mb piccolo" data-fra="${m}">Spegni fra ${m} min</button>`).join("")}
        </div>
        ${(cfgOnceOn || cfgOnceOff) ? `<div class="fk-mrighe">
          <button type="button" class="fk-mb piccolo" data-onceoff>Annulla l'ordine singolo</button>
        </div>` : ""}
        ${(cfgOnceOn || cfgOnceOff) ? `<div class="fk-mstato acceso">Ordine singolo impostato${onceOn ? " · accende alle " + fhEsc(onceOn) : ""}${onceOff ? " · spegne alle " + fhEsc(onceOff) : ""}</div>` : ""}

        <div class="fk-mgruppo">Programma della settimana</div>
        <div class="fk-mnota">Ogni giorno puo avere i suoi orari. Lascia vuoto per non fare niente quel giorno.</div>

        <div class="fk-tab">
          <div class="fk-tr fk-th"><span></span><span>Accendi</span><span>Spegni</span></div>
          ${GG.map(([k, t]) => `<div class="fk-tr">
            <span class="fk-gnome">${t}</span>
            <input type="time" data-on="${k}" value="${fhEsc(orariOn[k] || "")}">
            <input type="time" data-off="${k}" value="${fhEsc(orariOff[k] || "")}">
          </div>`).join("")}
        </div>
        <div class="fk-mrighe">
          <button type="button" class="fk-mb piccolo" data-copia>Copia lunedi su tutti</button>
          <button type="button" class="fk-mb piccolo" data-feriali>Solo lun-ven</button>
          <button type="button" class="fk-mb piccolo" data-svuota>Svuota</button>
        </div>

        <div class="fk-mgruppo">Quando accende</div>
        <div class="fk-rscroll2">
          ${modi.map(k => {
            const mm = FK_MODI[k] || { t: k };
            return `<button type="button" class="fk-pill${p.modo === k ? " sel" : ""}" data-modo="${fhEsc(k)}">${fhEsc(mm.t)}</button>`;
          }).join("")}
        </div>
        <label class="fk-mriga"><span>Temperatura (vuoto = non la tocca)</span>
          <input type="number" id="pTemp" min="${a.min_temp ?? 7}" max="${a.max_temp ?? 35}" step="${a.target_temp_step || 1}"
            value="${p.temp == null ? "" : p.temp}"></label>

        ${haPresa ? `
          <div class="fk-mgruppo">Presa di corrente</div>
          <label class="fk-mck"><input type="checkbox" id="pSpina"${p.gestisciSpina ? " checked" : ""}>
            <span>Gestisci anche la presa</span></label>
          <div class="fk-mnota">Se la lasci spenta, il programma tocca solo il climatizzatore e la presa resta come l'hai messa tu.</div>
          ${p.gestisciSpina ? `
            <label class="fk-mriga"><span>Accendi la presa quanti minuti prima</span>
              <input type="number" id="pAnt" min="1" max="60" value="${p.anticipo}"></label>
            <label class="fk-mriga"><span>Spegni la presa dopo quanti minuti sotto soglia</span>
              <input type="number" id="pMin" min="1" max="120" value="${p.minuti}"></label>
            <label class="fk-mriga"><span>Soglia di potenza (W)</span>
              <input type="number" id="pSog" min="0" max="5000" step="1" value="${p.soglia}"></label>
            ${!haPotenza ? `<div class="fk-mavviso">Non hai collegato un sensore di potenza a questa card: non posso sapere quando il climatizzatore ha finito. Spegnero la presa ${p.minuti} minuti dopo lo spegnimento, a tempo.</div>` : ""}
          ` : ""}
        ` : `<div class="fk-mnota">Per far gestire anche la presa, collegala prima nelle impostazioni della card.</div>`}

        ${(soloSpegnimento && p.gestisciSpina && haPresa) ? `<div class="fk-mavviso">
          Hai messo solo orari di spegnimento e stai gestendo la presa: dopo lo spegnimento <b>la presa resta staccata</b>,
          e il climatizzatore non rispondera al telecomando finche non la riaccendi a mano dalla card.
          Se non lo vuoi, togli la spunta alla presa oppure metti anche un orario di accensione.
        </div>` : ""}

        ${esisteQualcosa ? `<div class="fk-mstato ${attivo ? "acceso" : "spento"}">${attivo
          ? "Programma attivo" : "Programma sospeso &mdash; gli orari restano scritti, riaccendi l'interruttore in alto quando torni"}</div>` : ""}

        <div class="fk-mfoot">
          <span class="fk-mmsg" data-msg></span>
          ${esisteQualcosa ? `<button type="button" class="fk-mb" data-sospendi>${attivo ? "Sospendi" : "Riattiva"}</button>` : ""}
          ${esisteQualcosa ? `<button type="button" class="fk-mb" data-elimina>Elimina</button>` : ""}
          <button type="button" class="fk-mb primario" data-salva>Salva</button>
        </div>`;

      body.querySelector("[data-chiudi]").addEventListener("click", () => scrim.remove());

      const sw = body.querySelector("[data-sw]");
      if (sw) sw.addEventListener("click", () => cambiaStato());

      body.querySelectorAll("[data-fra]").forEach(b => b.addEventListener("click", () => {
        leggiCampi();
        const m = parseInt(b.dataset.fra, 10);
        const d = new Date(Date.now() + m * 60000);
        onceOff = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
        onceOn = "";
        disegna();
      }));
      const bOnceOff = body.querySelector("[data-onceoff]");
      if (bOnceOff) bOnceOff.addEventListener("click", async () => {
        for (const q of ["once_on", "once_off"]) {
          try { await this._hass.callApi("delete", "config/automation/config/" + this._timerId(q)); } catch (e) { /* non c'era */ }
        }
        scrim.remove();
      });

      body.querySelectorAll("[data-modo]").forEach(b => b.addEventListener("click", () => {
        leggiCampi(); p.modo = b.dataset.modo; disegna();
      }));
      const sp = body.querySelector("#pSpina");
      if (sp) sp.addEventListener("change", () => { leggiCampi(); p.gestisciSpina = sp.checked; disegna(); });

      body.querySelector("[data-copia]").addEventListener("click", () => {
        leggiCampi();
        GG.forEach(([k]) => {
          if (orariOn.mon) orariOn[k] = orariOn.mon; else delete orariOn[k];
          if (orariOff.mon) orariOff[k] = orariOff.mon; else delete orariOff[k];
        });
        disegna();
      });
      body.querySelector("[data-feriali]").addEventListener("click", () => {
        leggiCampi();
        ["sat", "sun"].forEach(k => { delete orariOn[k]; delete orariOff[k]; });
        ["mon", "tue", "wed", "thu", "fri"].forEach(k => {
          if (orariOn.mon) orariOn[k] = orariOn.mon;
          if (orariOff.mon) orariOff[k] = orariOff.mon;
        });
        disegna();
      });
      body.querySelector("[data-svuota]").addEventListener("click", () => {
        Object.keys(orariOn).forEach(k => delete orariOn[k]);
        Object.keys(orariOff).forEach(k => delete orariOff[k]);
        disegna();
      });

      const msg = t => { const m = body.querySelector("[data-msg]"); if (m) m.textContent = t; };

      const sos = body.querySelector("[data-sospendi]");
      if (sos) sos.addEventListener("click", async () => {
        msg(attivo ? "Sospendo..." : "Riattivo...");
        await cambiaStato();
      });

      const el = body.querySelector("[data-elimina]");
      if (el) el.addEventListener("click", async () => {
        msg("Elimino...");
        for (const q of ["on", "off", "once_on", "once_off"]) {
          try { await this._hass.callApi("delete", "config/automation/config/" + this._timerId(q)); } catch (e) { /* non c'era */ }
        }
        msg("Eliminato."); setTimeout(() => scrim.remove(), 800);
      });

      body.querySelector("[data-salva]").addEventListener("click", async () => {
        leggiCampi();
        msg("Salvo...");
        try {
          // Se il programma era sospeso deve restare sospeso: uno che parte
          // per una settimana, corregge un orario e salva, non si aspetta di
          // ritrovarselo acceso. Riscrivere la configurazione lo riattiva,
          // quindi si rimette a posto subito dopo.
          const eraSospeso = (cfgOn || cfgOff) && !attivo;
          await this._scriviProgramma("on", nome, orariOn, p);
          await this._scriviProgramma("off", nome, orariOff, p);
          // Un solo tasto Salva che salva TUTTO: programma settimanale e
          // ordine singolo. Prima erano due, e quello che si preme per
          // istinto non salvava l'orario appena scritto sopra.
          await this._scriviSingolo("once_on", nome, onceOn, p);
          await this._scriviSingolo("once_off", nome, onceOff, p);
          if (eraSospeso) {
            await new Promise(r => setTimeout(r, 900));
            for (const q of ["on", "off"]) {
              const e = this._timerEntita(q);
              if (e) await this._hass.callService("automation", "turn_off", { entity_id: e });
            }
            msg("Salvato. Il programma resta sospeso.");
          } else {
            msg("Salvato.");
          }
          setTimeout(() => scrim.remove(), 1200);
        } catch (e) {
          msg("Non sono riuscito a salvare: " + ((e && e.message) || e));
        }
      });
    };
    disegna();
  }

  // Un ordine singolo: scatta alla prossima volta che l'orologio segna
  // quell'ora e poi si disattiva da solo. Niente conto alla rovescia del
  // browser, e niente condizioni sulla data che qui sarebbero solo fragili.
  async _scriviSingolo(quale, nome, ora, p) {
    if (!ora) {
      try { await this._hass.callApi("delete", "config/automation/config/" + this._timerId(quale)); } catch (e) { /* non c'era */ }
      return;
    }
    const acceso = quale === "once_on";
    const spina = p.gestisciSpina && this._cfg.presa;
    const actions = [];
    if (acceso) {
      if (spina) actions.push({ action: "switch.turn_on", target: { entity_id: this._cfg.presa } });
      actions.push({ action: "climate.set_hvac_mode", target: { entity_id: this._cfg.climate }, data: { hvac_mode: p.modo } });
      if (p.temp != null) actions.push({ action: "climate.set_temperature", target: { entity_id: this._cfg.climate }, data: { temperature: p.temp } });
    } else {
      actions.push({ action: "climate.set_hvac_mode", target: { entity_id: this._cfg.climate }, data: { hvac_mode: "off" } });
      if (spina) {
        if (this._cfg.power) actions.push({
          wait_for_trigger: [{ trigger: "numeric_state", entity_id: this._cfg.power, below: p.soglia, for: { minutes: p.minuti } }],
          timeout: { minutes: Math.max(30, p.minuti * 3) }, continue_on_timeout: true,
        });
        else actions.push({ delay: { minutes: p.minuti } });
        actions.push({ action: "switch.turn_off", target: { entity_id: this._cfg.presa } });
      }
    }
    // Si spegne da sola dopo aver agito: "this.entity_id" e il modo giusto per
    // farle riferire a se stessa senza indovinare il nome che HA le dara.
    actions.push({ action: "automation.turn_off", target: { entity_id: "{{ this.entity_id }}" }, data: { stop_actions: false } });

    await this._hass.callApi("post", "config/automation/config/" + this._timerId(quale), {
      id: this._timerId(quale),
      alias: "Faber Home — " + (acceso ? "accendi " : "spegni ") + nome + " (una volta)",
      description: "Creato da Faber Home. Ordine singolo: agisce una volta e poi si disattiva da solo.",
      mode: "single",
      triggers: [{ trigger: "time", at: (ora.length === 5 ? ora + ":00" : ora) }],
      conditions: [],
      actions,
    });
  }

  async _scriviProgramma(quale, nome, orari, p) {
    const giorni = Object.keys(orari).filter(g => orari[g]);
    // Niente orari per questo verso: se c'era un'automazione va tolta, non
    // lasciata in giro a scattare per conto suo.
    if (!giorni.length) {
      try { await this._hass.callApi("delete", "config/automation/config/" + this._timerId(quale)); } catch (e) { /* non c'era */ }
      return;
    }

    const spina = p.gestisciSpina && this._cfg.presa;
    const acceso = quale === "on";

    // La presa si accende PRIMA, quindi l'automazione parte in anticipo e
    // aspetta: cosi il climatizzatore trova gia corrente quando tocca a lui.
    const anticipo = acceso && spina ? p.anticipo : 0;
    const triggers = giorni.map(g => ({
      trigger: "time",
      at: this._sommaMinuti(orari[g], -anticipo) + ":00",
      id: g,
    }));

    // "Quale trigger e scattato" accoppiato a "che giorno e oggi": e cosi che
    // ogni giorno puo avere il suo orario senza ripetere le azioni sette volte.
    const conditions = [{
      condition: "or",
      conditions: giorni.map(g => ({
        condition: "and",
        conditions: [
          { condition: "trigger", id: g },
          { condition: "time", weekday: [g] },
        ],
      })),
    }];

    const actions = [];
    if (acceso) {
      if (spina) {
        actions.push({ action: "switch.turn_on", target: { entity_id: this._cfg.presa } });
        if (anticipo > 0) actions.push({ delay: { minutes: anticipo } });
      }
      actions.push({
        action: "climate.set_hvac_mode",
        target: { entity_id: this._cfg.climate },
        data: { hvac_mode: p.modo },
      });
      if (p.temp != null) actions.push({
        action: "climate.set_temperature",
        target: { entity_id: this._cfg.climate },
        data: { temperature: p.temp },
      });
    } else {
      actions.push({
        action: "climate.set_hvac_mode",
        target: { entity_id: this._cfg.climate },
        data: { hvac_mode: "off" },
      });
      if (spina) {
        if (this._cfg.power) {
          // Si aspetta che la potenza scenda e ci RESTI: un condizionatore che
          // si spegne fa ancora girare la ventola per un po'. Col timeout la
          // presa si spegne comunque, invece di restare accesa per sempre.
          actions.push({
            wait_for_trigger: [{
              trigger: "numeric_state",
              entity_id: this._cfg.power,
              below: p.soglia,
              for: { minutes: p.minuti },
            }],
            timeout: { minutes: Math.max(30, p.minuti * 3) },
            continue_on_timeout: true,
          });
        } else {
          // Senza sensore di potenza non si puo sapere quando ha finito: si
          // aspetta a tempo. E scritto anche nel pannello, per non illudere.
          actions.push({ delay: { minutes: p.minuti } });
        }
        actions.push({ action: "switch.turn_off", target: { entity_id: this._cfg.presa } });
      }
    }

    await this._hass.callApi("post", "config/automation/config/" + this._timerId(quale), {
      id: this._timerId(quale),
      alias: "Faber Home — " + (acceso ? "accendi " : "spegni ") + nome,
      description: "Creato da Faber Home. Programma settimanale di " + nome + "."
        + (spina ? " Gestisce anche la presa di corrente." : " Non tocca la presa di corrente."),
      // restart: un nuovo comando deve avere ragione su quello in corso,
      // altrimenti l'attesa della presa blocca tutto per mezz'ora.
      mode: "restart",
      triggers,
      conditions,
      actions,
    });
  }

  // Le opzioni sono tante (il condizionatore della sala ha 13 programmi): una
  // riga che scorre di lato, non una griglia che allunga la card all'infinito.
  _riga(etichetta, chiave, valori, attuale, mappa) {
    return `<div class="fk-riga">
      <div class="fk-rlab">${fhEsc(etichetta)}</div>
      <div class="fk-rscroll" data-riga="${fhEsc(chiave)}">
        ${valori.map(v => `<button type="button" class="fk-pill${v === attuale ? " sel" : ""}"
          data-${chiave}="${fhEsc(v)}">${fhEsc(fkNome(mappa, v))}</button>`).join("")}
      </div>
    </div>`;
  }
}

const FK_CSS = `
  .fk{display:block;position:relative;overflow:hidden;border-radius:22px;
    background-color:rgba(16,18,24,.82);border:1px solid rgba(255,255,255,.10);
    backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);
    color:#eaf1f8;box-shadow:0 10px 30px rgba(0,0,0,.28);
    transition:background-image .5s ease,border-color .5s ease}
  .fk-body{padding:16px;display:flex;flex-direction:column;gap:13px;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .fk-vuoto{padding:26px 10px;text-align:center;font-size:12.5px;font-weight:600;opacity:.6}
  .fk-top{display:flex;align-items:flex-start;gap:12px}
  .fk-titolo{flex:1;min-width:0}
  .fk-nome{font-size:15.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fk-modo{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;
    text-transform:uppercase;letter-spacing:.09em;margin-top:3px}
  .fk-modo ha-icon{--mdc-icon-size:14px}
  .fk-power{width:60px;height:60px;border-radius:18px;cursor:pointer;flex:0 0 auto;
    display:flex;align-items:center;justify-content:center;
    border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:var(--fh-c-muted,#93a1b0);
    transition:background .25s,color .25s,border-color .25s}
  .fk-power ha-icon{--mdc-icon-size:30px}
  .fk-power.on{background:rgba(56,224,138,.18);border-color:rgba(56,224,138,.5);color:var(--fh-c-ok2,#38e08a)}
  .fk-power[disabled]{opacity:.35;cursor:not-allowed}
  /* Uno stacco in piu fra la presa e l'accensione: sono le due che si
     confondono, e sbagliare significa togliere corrente invece di spegnere. */
  .fk-comandi .fk-power{margin-left:5px}
  @media (max-width:560px){
    .fk-comandi{gap:13px}
    .fk-comandi .fk-power{margin-left:7px}
    .fk-presa,.fk-timerb{width:46px;height:46px}
    .fk-power{width:62px;height:62px}
  }
  /* Tre tastini in fila su un telefono si sbagliano: e il tasto di mezzo
     stacca la CORRENTE. Piu grandi (44px, la misura minima per un dito) e piu
     distanti, con uno stacco in piu prima dell'accensione. */
  .fk-comandi{display:flex;gap:11px;flex:0 0 auto;align-items:center}
  .fk-presa{width:44px;height:44px;border-radius:14px;cursor:pointer;flex:0 0 auto;
    display:flex;align-items:center;justify-content:center;
    border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:var(--fh-c-muted,#93a1b0);
    transition:background .25s,color .25s,border-color .25s}
  .fk-presa ha-icon{--mdc-icon-size:20px}
  .fk-presa.on{background:rgba(255,176,32,.16);border-color:rgba(255,176,32,.45);color:var(--fh-c-acc,#ffb020)}
  .fk-timerb{width:44px;height:44px;border-radius:14px;cursor:pointer;flex:0 0 auto;
    display:flex;align-items:center;justify-content:center;
    border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:var(--fh-c-muted,#93a1b0);
    transition:background .25s,color .25s,border-color .25s}
  .fk-timerb ha-icon{--mdc-icon-size:20px}
  .fk-timerb.on{background:rgba(167,139,250,.18);border-color:rgba(167,139,250,.5);color:#c4b5fd}
  /* ---------------------------------------------- conferma accensione/spegnimento
     La comparsa in dissolvenza vale SOLO per il foglio di conferma, non per
     tutti gli .fk-scrim: scritta sulla classe base spegneva anche il foglio
     del timer e quello dei dettagli, che si aprono senza classe "on" e
     restavano trasparenti pur essendo li. */
  .fk-confirm{width:100%;max-width:340px;background:#1a1b21;border:1px solid rgba(255,255,255,.16);
    border-radius:22px;padding:20px 18px;box-shadow:0 24px 60px rgba(0,0,0,.6);color:#f4f6f8;
    animation:fk-entra .18s ease-out}
  @keyframes fk-entra{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.fk-confirm{animation:none}}
  .fk-confirm-txt{font-size:14px;font-weight:700;margin-bottom:16px;line-height:1.5}
  .fk-confirm-row{display:flex;gap:10px}
  .fk-cbtn{flex:1;padding:11px 0;border-radius:12px;border:1px solid rgba(255,255,255,.16);
    background:rgba(255,255,255,.06);color:#f4f6f8;font-size:13.5px;font-weight:800;cursor:pointer}
  .fk-cbtn:hover{filter:brightness(1.25)}
  .fk-cbtn.warn{background:rgba(255,176,32,.16);border-color:rgba(255,176,32,.45)}
  /* --------------------------------------------------------- stufa a pellet */
  .fk-vetro{fill:rgba(0,0,0,.45);stroke:rgba(255,255,255,.18);stroke-width:1}
  .fk-legna{stroke:rgba(255,255,255,.2);stroke-width:2.4;stroke-linecap:round;fill:none}
  .fk-griglia2{stroke:rgba(255,255,255,.22);stroke-width:2.4;stroke-linecap:round;fill:none}
  .fk-fiamma{fill:rgba(255,255,255,.14)}
  .fk-split.viva.stufa .fk-vetro{fill:color-mix(in srgb,var(--fk-c) 22%,rgba(0,0,0,.5))}
  .fk-split.viva .fk-fiamma{fill:var(--fk-c);animation:fk-brucia 1.5s ease-in-out infinite;transform-origin:36px 36px}
  .fk-split.viva .f2{animation-duration:1.1s;animation-delay:.25s;opacity:.75}
  .fk-split.viva .fk-griglia2{stroke:color-mix(in srgb,var(--fk-c) 70%,transparent)}
  @keyframes fk-brucia{
    0%,100%{transform:scaleY(.86) scaleX(1.04);opacity:.8}
    50%{transform:scaleY(1.08) scaleX(.94);opacity:1}}
  @media (prefers-reduced-motion:reduce){.fk-split.viva .fk-fiamma{animation:none}}
  /* ------------------------------------------------------------ finestrella */
  /* A schermo intero, non dentro la card: il programma settimanale e piu alto
     della card stessa (misurato: 701px contro 546px) e restava tagliato dal
     suo bordo. */
  .fk-scrim{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;
    padding:16px;box-sizing:border-box;background:rgba(4,6,10,.68);backdrop-filter:blur(6px)}
  .fk-modal{width:100%;max-width:430px;max-height:86vh;overflow-y:auto;border-radius:22px;
    background:#161a22;border:1px solid rgba(255,255,255,.14);
    box-shadow:0 20px 60px rgba(0,0,0,.6);
    /* Il colore si dichiara qui e non si eredita: dentro il pannello chiaro di
       giorno il testo arrivava quasi nero su fondo scuro, illeggibile. */
    color:#eaf1f8}
  .fk-modal *{color:inherit}
  .fk-mbody{padding:14px 15px 15px;display:flex;flex-direction:column;gap:9px}
  .fk-mh{display:flex;align-items:center;gap:8px}
  .fk-mt{flex:1;font-size:15px;font-weight:800}
  .fk-mx{width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:17px;line-height:1;
    border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;flex:0 0 auto}
  .fk-mnota{font-size:11.5px;line-height:1.45;opacity:.7}
  /* Il tasto che apre ventola/alette/programma e il grafico dei consumi:
     una riga sola in fondo alla card, al posto di quattro blocchi che la
     facevano crescere fino a doppia altezza. */
  .fk-piu{display:flex;align-items:center;gap:9px;width:100%;padding:11px 13px;border-radius:14px;
    cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;text-align:left;
    border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:inherit;opacity:.82;
    transition:background .2s,border-color .2s,opacity .2s}
  .fk-piu:hover{opacity:1;border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.09)}
  .fk-piu span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fk-piu ha-icon{--mdc-icon-size:18px;flex:0 0 auto}
  .fk-piu .fk-piuch{--mdc-icon-size:20px;opacity:.6}
  .fk-dett{display:flex;flex-direction:column;gap:9px}
  .fk-modal .fk-tipo,.fk-modal .fk-pill,.fk-modal .fk-g{color:var(--fh-c-muted,#93a1b0)}
  .fk-modal .fk-tipo.sel,.fk-modal .fk-g.sel{color:#ddd6fe}
  .fk-modal .fk-pill.sel{color:var(--fh-c-soft,#ffe9c2)}
  .fk-modal .fk-mb.primario{color:#ddd6fe}
  .fk-modal .fk-mavviso{color:var(--fh-c-warn,#ffd28a)}
  .fk-modal .fk-mstato.acceso{color:#c4b5fd}
  .fk-modal .fk-mstato.spento{color:var(--fh-c-muted,#93a1b0)}
  .fk-mgruppo{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;opacity:.5;margin-top:4px}
  .fk-tipi{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .fk-tipo{padding:9px 6px;border-radius:12px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;
    border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:var(--fh-c-muted,#93a1b0)}
  .fk-tipo.sel{border-color:rgba(167,139,250,.6);background:rgba(167,139,250,.18);color:#ddd6fe}
  .fk-mora{padding:10px;border-radius:12px;font:inherit;font-size:19px;font-weight:800;text-align:center;
    border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:inherit;
    font-variant-numeric:tabular-nums}
  .fk-gg{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .fk-g{padding:7px 2px;border-radius:9px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:800;
    border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:var(--fh-c-muted,#93a1b0)}
  .fk-g.sel{border-color:rgba(167,139,250,.6);background:rgba(167,139,250,.2);color:#ddd6fe}
  .fk-mstato{font-size:11.5px;font-weight:800;padding:7px 10px;border-radius:10px;text-align:center}
  .fk-mstato.acceso{background:rgba(167,139,250,.16);color:#c4b5fd}
  .fk-mstato.spento{background:rgba(255,255,255,.07);color:var(--fh-c-muted,#93a1b0)}
  .fk-mfoot{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px}
  .fk-mmsg{flex:1;min-width:90px;font-size:11px;font-weight:600;opacity:.7}
  .fk-mb{padding:9px 13px;border-radius:11px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:800;
    border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:inherit}
  .fk-mb.primario{border-color:rgba(167,139,250,.6);background:rgba(167,139,250,.22);color:#ddd6fe}
  .fk-mb.piccolo{padding:6px 10px;font-size:11px}
  .fk-swlab{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.6;flex:0 0 auto}
  .fk-sw{width:44px;height:25px;border-radius:14px;cursor:pointer;flex:0 0 auto;padding:0;position:relative;
    border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);transition:background .25s,border-color .25s}
  .fk-sw span{position:absolute;top:2px;left:2px;width:19px;height:19px;border-radius:50%;
    background:#93a1b0;transition:transform .25s,background .25s}
  .fk-sw.on{background:rgba(167,139,250,.3);border-color:rgba(167,139,250,.6)}
  .fk-sw.on span{transform:translateX(19px);background:#ddd6fe}
  .fk-once{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .fk-once label{display:flex;flex-direction:column;gap:4px}
  .fk-once span{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;opacity:.55}
  .fk-once input{padding:8px 6px;border-radius:10px;font:inherit;font-size:14px;font-weight:800;text-align:center;
    font-variant-numeric:tabular-nums;border:1px solid rgba(255,255,255,.13);
    background:rgba(255,255,255,.06);color:inherit}
  .fk-tab{display:flex;flex-direction:column;gap:4px}
  .fk-tr{display:grid;grid-template-columns:minmax(58px,1fr) 1fr 1fr;gap:6px;align-items:center}
  .fk-th span{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.5;text-align:center}
  .fk-gnome{font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fk-tr input[type=time]{padding:7px 4px;border-radius:9px;font:inherit;font-size:13px;font-weight:700;
    text-align:center;font-variant-numeric:tabular-nums;min-width:0;
    border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);color:inherit}
  .fk-mrighe{display:flex;gap:6px;flex-wrap:wrap}
  .fk-mriga{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600}
  .fk-mriga span{flex:1;min-width:0;line-height:1.35}
  .fk-mriga input{width:78px;flex:0 0 auto;padding:7px 8px;border-radius:9px;font:inherit;font-size:13px;
    font-weight:700;text-align:center;font-variant-numeric:tabular-nums;
    border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);color:inherit}
  .fk-mck{display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12.5px;font-weight:700}
  .fk-mck input{width:auto}
  .fk-rscroll2{display:flex;gap:6px;overflow-x:auto;padding-bottom:3px;scrollbar-width:none}
  .fk-rscroll2::-webkit-scrollbar{display:none}
  .fk-mavviso{font-size:11px;font-weight:600;line-height:1.45;padding:8px 10px;border-radius:10px;
    background:rgba(255,176,32,.13);border:1px solid rgba(255,176,32,.3);color:var(--fh-c-warn,#ffd28a)}
  .fk-staccato{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:13px;
    font-size:11.5px;font-weight:700;line-height:1.4;
    background:rgba(255,92,92,.12);border:1px solid rgba(255,92,92,.32);color:var(--fh-c-bad,#ffb0a3)}
  .fk-staccato ha-icon{--mdc-icon-size:17px;flex:0 0 auto}
  /* Senza corrente i comandi restano visibili ma spenti: nasconderli
     farebbe sembrare la card rotta invece che l'apparecchio staccato. */
  .fk.staccato .fk-modi,.fk.staccato .fk-riga,.fk.staccato .fk-target{opacity:.4;pointer-events:none}
  .fk-centro{display:flex;align-items:center;gap:14px;padding:2px 0}
  /* Lo split disegnato: le onde d'aria scorrono solo quando e acceso. Prima
     erano tre trattini nudi, che spenti sembravano un disegno rotto. */
  .fk-split{width:74px;height:60px;flex:0 0 auto}
  .fk-split svg{width:100%;height:100%;display:block;overflow:visible}
  .fk-corpo{fill:rgba(255,255,255,.10);stroke:rgba(255,255,255,.22);stroke-width:1.2}
  .fk-griglia{fill:rgba(255,255,255,.22)}
  .fk-spia{fill:rgba(255,255,255,.25)}
  .fk-onda{fill:none;stroke:rgba(255,255,255,.16);stroke-width:2.6;stroke-linecap:round}
  .fk-split.viva .fk-corpo{fill:color-mix(in srgb,var(--fk-c) 16%,transparent);
    stroke:color-mix(in srgb,var(--fk-c) 55%,transparent)}
  .fk-split.viva .fk-griglia{fill:color-mix(in srgb,var(--fk-c) 70%,transparent)}
  .fk-split.viva .fk-spia{fill:var(--fk-c);filter:drop-shadow(0 0 4px var(--fk-c))}
  .fk-split.viva .fk-onda{stroke:var(--fk-c);animation:fk-soffio 2.6s ease-in-out infinite}
  .fk-split.viva .o2{animation-delay:.35s}
  .fk-split.viva .o3{animation-delay:.7s}
  @keyframes fk-soffio{
    0%{opacity:0;transform:translateY(-7px) scaleX(.75)}
    40%{opacity:.95}
    100%{opacity:0;transform:translateY(6px) scaleX(1.1)}}
  @media (prefers-reduced-motion:reduce){
    .fk-split.viva .fk-onda{animation:none;opacity:.75}}
  .fk-lettura{flex:1;min-width:0;text-align:right}
  .fk-ora{font-size:42px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}
  .fk-ora span{font-size:20px;font-weight:800;opacity:.6}
  .fk-oralab{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.55;margin-top:5px}
  .fk-target{display:flex;align-items:center;justify-content:center;gap:14px;
    padding:9px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
  .fk-tbtn{width:40px;height:40px;border-radius:50%;cursor:pointer;font:inherit;font-size:21px;font-weight:800;
    border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:inherit;
    display:flex;align-items:center;justify-content:center;line-height:1}
  .fk-tbtn:hover{background:rgba(255,255,255,.14)}
  .fk-tval{min-width:92px;text-align:center;line-height:1}
  .fk-tval b{font-size:27px;font-weight:900;font-variant-numeric:tabular-nums}
  .fk-tval span{font-size:14px;font-weight:800;opacity:.6;margin-left:2px}
  .fk-tval small{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin-top:4px}
  .fk-modi{display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));gap:7px}
  .fk-mb{display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 4px;border-radius:14px;
    cursor:pointer;font:inherit;font-size:10.5px;font-weight:800;
    border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:var(--fh-c-muted,#93a1b0);
    transition:background .2s,color .2s,border-color .2s}
  .fk-mb ha-icon{--mdc-icon-size:19px}
  .fk-mb:hover{background:rgba(255,255,255,.1);color:#eaf1f8}
  .fk-mb.sel{color:var(--fk-c,#eaf1f8);border-color:color-mix(in srgb,var(--fk-c) 55%,transparent);
    background:color-mix(in srgb,var(--fk-c) 16%,transparent)}
  .fk-cons{display:flex;flex-direction:column;gap:9px;padding:11px;border-radius:14px;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
  .fk-crighe{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .fk-clab{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;opacity:.5}
  .fk-cval{font-size:17px;font-weight:900;line-height:1.15;font-variant-numeric:tabular-nums;margin-top:2px}
  .fk-cval small{font-size:10px;font-weight:800;opacity:.6;margin-left:3px}
  .fk-ceur{font-size:11px;font-weight:700;opacity:.6;font-variant-numeric:tabular-nums}
  .fk-cbarre{display:flex;align-items:flex-end;gap:2px;height:34px}
  .fk-cb{flex:1;min-width:0;height:100%;display:flex;align-items:flex-end}
  .fk-cb span{display:block;width:100%;border-radius:2px 2px 0 0;min-height:2px}
  .fk-cb.oggi span{outline:1px solid rgba(255,255,255,.35);outline-offset:1px}
  /* Accanto ai 42px della temperatura una riga da 11-13px spariva: questi
     sono i numeri che si guardano per sapere se sta consumando, non una nota
     a pie di pagina. */
  .fk-info{display:flex;gap:16px;font-size:17px;font-weight:800;opacity:.95;font-variant-numeric:tabular-nums}
  .fk-info span{display:inline-flex;align-items:center;gap:5px}
  .fk-info ha-icon{--mdc-icon-size:21px;opacity:.75}
  .fk-riga{display:flex;flex-direction:column;gap:5px}
  .fk-rlab{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;opacity:.5}
  /* Scorre di lato: il condizionatore della sala ha tredici programmi, in
     griglia allungherebbero la card oltre lo schermo. */
  .fk-rscroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:3px;
    scrollbar-width:none;-ms-overflow-style:none}
  .fk-rscroll::-webkit-scrollbar{display:none}
  .fk-pill{flex:0 0 auto;padding:7px 12px;border-radius:20px;cursor:pointer;font:inherit;
    font-size:11.5px;font-weight:700;white-space:nowrap;
    border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.05);color:var(--fh-c-muted,#93a1b0);
    transition:background .2s,color .2s,border-color .2s}
  .fk-pill:hover{background:rgba(255,255,255,.1);color:#eaf1f8}
  .fk-pill.sel{border-color:rgba(255,176,32,.6);background:rgba(255,176,32,.18);color:var(--fh-c-soft,#ffe9c2)}
`;

customElements.define("faber-clima", FaberClima);

class FaberClimaEditor extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({}, FK_DEFAULTS, JSON.parse(JSON.stringify(config || {})));
    if (this._interno) { this._interno = false; return; }
    if (this._hass) this._render();
  }
  set hass(h) { this._hass = h; if (this._cfg && !this._fatto) { this._fatto = true; this._render(); } }
  _emit() {
    this._interno = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true }));
  }
  _set(k, v) { this._cfg = Object.assign({}, this._cfg, { [k]: v }); this._emit(); }
  _nomeEnt(id) { const s = this._hass.states[id]; return (s && s.attributes.friendly_name) || id; }

  _picker(campo, etichetta, aiuto, prefisso, dc) {
    const sel = this._cfg[campo] || "";
    return `<div class="fke-f" data-pick="${campo}" data-pre="${prefisso}" data-dc="${dc || ""}">
      <label>${etichetta}</label>${aiuto ? `<span class="fke-h">${aiuto}</span>` : ""}
      <div class="fke-pw">
        <input type="text" class="fke-in fke-q" autocomplete="off" placeholder="Cerca..." value="${fhEsc(sel ? this._nomeEnt(sel) : "")}">
        ${sel ? `<button type="button" class="fke-x">&times;</button>` : ""}
        <div class="fke-drop" hidden></div>
      </div>
      ${sel ? `<div class="fke-id">${fhEsc(sel)}</div>` : ""}
    </div>`;
  }

  _render() {
    if (!this._cfg || !this._hass) return;
    const c = this._cfg;
    this.innerHTML = `<style>${FKE_CSS}</style>
      <div class="fke">
        ${this._picker("climate", "Climatizzatore", "L'apparecchio da comandare. Modi, velocita e programmi vengono letti da lui: compaiono solo quelli che sa fare davvero.", "climate.")}
        <div class="fke-f"><label>Nome mostrato</label>
          <span class="fke-h">Vuoto = usa il nome dell'apparecchio.</span>
          <input class="fke-in" id="fkNome" value="${fhEsc(c.name || "")}"></div>
        ${this._picker("temp", "Sensore temperatura — opzionale", "Molti split non misurano la temperatura, o la misurano dove soffiano. Un sensore in stanza dice il vero.", "sensor.", "temperature")}
        ${this._picker("humidity", "Sensore umidita — opzionale", "", "sensor.", "humidity")}
        ${this._picker("power", "Sensore potenza — opzionale", "Per vedere quanto sta consumando adesso.", "sensor.", "power")}
        ${this._picker("energy", "Contatore energia \u2014 opzionale", "Per vedere quanto ha consumato e quanto costa. Se non ce l'hai, i kWh li calcolo dal sensore di potenza.", "sensor.", "energy")}
        ${this._picker("presa", "Presa di corrente — opzionale", "La presa che alimenta il condizionatore. Diventa un secondo tasto: staccare la corrente non e spegnere, e togliere l'alimentazione. Con la presa staccata i comandi restano visibili ma spenti.", "switch.")}
        <div class="fke-f"><label>Aspetto</label>
          <span class="fke-h">Il disegno lo indovina dal nome; qui lo puoi decidere tu.</span>
          <select class="fke-in" id="fkAsp">
            <option value="auto"${c.aspetto === "auto" || !c.aspetto ? " selected" : ""}>Indovinalo dal nome</option>
            <option value="split"${c.aspetto === "split" ? " selected" : ""}>Condizionatore a muro</option>
            <option value="stufa"${c.aspetto === "stufa" ? " selected" : ""}>Stufa a pellet</option>
            <option value="radiatore"${c.aspetto === "radiatore" ? " selected" : ""}>Termosifone</option>
          </select></div>
        <div class="fke-riga2">
          <div class="fke-f"><label>Prezzo energia (&euro;/kWh)</label>
            <input class="fke-in" id="fkPrz" type="number" min="0" step="0.01" value="${c.prezzo_kwh}"></div>
          <div class="fke-f"><label>Giorni di storico</label>
            <select class="fke-in" id="fkGg">
              ${[7, 14, 30].map(n => `<option value="${n}"${(c.storico_giorni || 14) === n ? " selected" : ""}>${n} giorni</option>`).join("")}
            </select></div>
        </div>

        <div class="fke-f"><label>Cosa mostrare</label>
          <label class="fke-ck"><input type="checkbox" id="fkV"${c.mostra_ventola !== false ? " checked" : ""}> Velocita della ventola</label>
          <label class="fke-ck"><input type="checkbox" id="fkA"${c.mostra_alette !== false ? " checked" : ""}> Alette</label>
          <label class="fke-ck"><input type="checkbox" id="fkP"${c.mostra_programmi !== false ? " checked" : ""}> Programmi (eco, notte, turbo...)</label>
          <span class="fke-h">Una riga compare solo se l'apparecchio la sostiene, anche con la spunta messa.</span></div>

        <div class="fke-f"><label>Prima di accendere o spegnere</label>
          <label class="fke-ck"><input type="checkbox" id="fkConf"${c.conferma_accensione !== false ? " checked" : ""}> Chiedi conferma</label>
          <span class="fke-h">Il tasto sta proprio dove si tocca la card: capita di premerlo per sbaglio invece di aprirla. Di serie chiede conferma; togli la spunta per farlo agire subito.</span></div>
      </div>`;
    const q = s => this.querySelector(s);
    q("#fkNome").addEventListener("input", e => this._set("name", e.target.value));
    q("#fkAsp").addEventListener("change", e => this._set("aspetto", e.target.value));
    q("#fkPrz").addEventListener("change", e => this._set("prezzo_kwh", parseFloat(e.target.value) || 0));
    q("#fkGg").addEventListener("change", e => this._set("storico_giorni", parseInt(e.target.value, 10)));
    q("#fkV").addEventListener("change", e => this._set("mostra_ventola", e.target.checked));
    q("#fkA").addEventListener("change", e => this._set("mostra_alette", e.target.checked));
    q("#fkP").addEventListener("change", e => this._set("mostra_programmi", e.target.checked));
    q("#fkConf").addEventListener("change", e => this._set("conferma_accensione", e.target.checked));
    this.querySelectorAll("[data-pick]").forEach(b => this._wire(b));
  }

  _wire(box) {
    const campo = box.dataset.pick, pre = box.dataset.pre, dc = box.dataset.dc;
    const inp = box.querySelector(".fke-q"), drop = box.querySelector(".fke-drop"), x = box.querySelector(".fke-x");
    const st = this._hass.states;
    const tutte = Object.keys(st).filter(e => e.startsWith(pre));
    // Le entita col mestiere giusto stanno in cima: fra 1234 sensori, quelli
    // di temperatura sono nove e vanno trovati subito.
    const buone = dc ? tutte.filter(e => st[e].attributes.device_class === dc) : [];
    const apri = () => {
      const parole = inp.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const filtra = arr => arr.filter(e => !parole.length || parole.every(w => (e + " " + this._nomeEnt(e)).toLowerCase().includes(w)));
      const testa = filtra(buone), resto = filtra(tutte).filter(e => !testa.includes(e));
      const l = [...testa, ...resto].slice(0, 50);
      drop.innerHTML = l.length
        ? l.map(e => `<button type="button" data-id="${fhEsc(e)}"><b>${fhEsc(this._nomeEnt(e))}</b><i>${fhEsc(e)}</i></button>`).join("")
        : `<div class="fke-h" style="padding:10px">Nessuna entita trovata.</div>`;
      drop.hidden = false;
      drop.querySelectorAll("[data-id]").forEach(b => b.addEventListener("mousedown", ev => {
        ev.preventDefault(); this._set(campo, b.dataset.id); this._render();
      }));
    };
    inp.addEventListener("focus", apri);
    inp.addEventListener("input", apri);
    inp.addEventListener("blur", () => setTimeout(() => { drop.hidden = true; }, 150));
    if (x) x.addEventListener("click", () => { this._set(campo, ""); this._render(); });
  }
}

const FKE_CSS = `
  .fke{display:flex;flex-direction:column;gap:14px;padding:4px 2px;font-family:inherit}
  .fke-f{display:flex;flex-direction:column;gap:5px;min-width:0}
  .fke-f>label{font-size:13px;font-weight:700;color:var(--primary-text-color)}
  .fke-h{font-size:11.5px;line-height:1.45;color:var(--secondary-text-color)}
  .fke-in{padding:9px 10px;border-radius:9px;font-size:14px;width:100%;box-sizing:border-box;font-family:inherit;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fke-riga2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .fke-pw{position:relative}
  .fke-x{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:24px;height:24px;border:none;
    border-radius:50%;cursor:pointer;font-size:16px;line-height:1;background:var(--divider-color);color:var(--primary-text-color)}
  .fke-drop{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 4px);max-height:230px;overflow-y:auto;
    border-radius:12px;border:1px solid var(--divider-color);background:var(--ha-card-background,var(--card-background-color));
    box-shadow:0 12px 30px rgba(0,0,0,.35)}
  .fke-drop button{display:flex;flex-direction:column;gap:1px;width:100%;text-align:left;padding:8px 11px;
    border:none;background:none;cursor:pointer;font-family:inherit;color:var(--primary-text-color)}
  .fke-drop button:hover{background:rgba(255,176,32,.14)}
  .fke-drop b{font-size:13px;font-weight:700}
  .fke-drop i{font-size:10.5px;font-style:normal;color:var(--secondary-text-color)}
  .fke-id{font-size:10.5px;color:var(--secondary-text-color);font-family:ui-monospace,monospace}
  .fke-ck{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;
    color:var(--primary-text-color)}
  .fke-ck input{width:auto}
`;

customElements.define("faber-clima-editor", FaberClimaEditor);



/* ======================================================================== */
/* CARD: PERSONA                                                            */
/* L'avatar e una GIF che cambia con lo stato: una per quando e a casa, una  */
/* per quando e fuori, una per ogni zona. Il resto (batteria, dov'e, da      */
/* quanto) lo trova da solo partendo dal telefono collegato alla persona:    */
/* non si scrive niente a mano.                                             */
/* ======================================================================== */

const FP_DEFAULTS = {
  person: "",
  name: "",
  avatars: "",
  battery: "",
  address: "",
  mostra_distanza: true,
  mostra_indirizzo: true,
  mostra_batteria: true,
  forma: "cerchio",
  grandezza: "media",
  disposizione: "colonna",
};

// In colonna la foto non deve piu spartirsi la larghezza col testo, quindi le
// misure possono essere quelle vere. "Piena" la fa larga quanto la card.
// Misure ridotte: in una card quadrata l'avatar da 140 si mangiava mezza
// tessera e il nome finiva schiacciato contro il bordo. Con questi numeri la
// foto resta la protagonista ma lascia respirare le righe sotto.
const FP_GRANDEZZE = { piccola: 74, media: 108, grande: 150, piena: 9999 };

// Quanto puo essere larga al massimo una card QUADRATA, secondo la stessa
// taglia scelta per l'avatar. "Piccola" deve dare una card piccola davvero,
// non un quadrato media-taglia con dentro una foto piu piccola: sono le due
// facce della stessa scelta, non due manopole indipendenti.
const FH_QUADRA_CAP = { piccola: 220, media: 280, grande: 340, piena: 9999 };

const FP_TONI = {
  casa: { c: "#38e08a", g: "#0f7a3d", t: "A casa" },
  zona: { c: "#ffb020", g: "#9a5b00", t: "In zona" },
  fuori: { c: "#7a8896", g: "#475569", t: "Fuori casa" },
  ignoto: { c: "#7a8896", g: "#475569", t: "Non so dov'e" },
};

// Distanza in linea d'aria fra due punti (formula dell'emisenoverso).
function fpDistanza(la1, lo1, la2, lo2) {
  if ([la1, lo1, la2, lo2].some(v => typeof v !== "number" || !isFinite(v))) return null;
  const R = 6371, r = Math.PI / 180;
  const dla = (la2 - la1) * r, dlo = (lo2 - lo1) * r;
  const a = Math.sin(dla / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dlo / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// "da 2 ore", "da 3 giorni": la durata detta come la direbbe una persona.
function fpDa(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!isFinite(s) || s < 0) return "";
  if (s < 90) return "da poco";
  const m = Math.round(s / 60);
  if (m < 60) return "da " + m + " min";
  const h = Math.floor(s / 3600);
  if (h < 24) return "da " + h + (h === 1 ? " ora" : " ore");
  const g = Math.round(s / 86400);
  return "da " + g + (g === 1 ? " giorno" : " giorni");
}

// /config/www e il percorso sul DISCO; dal browser quella stessa cartella si
// chiama /local. Scriverlo sbagliato non da nemmeno un errore: Home Assistant
// risponde con la propria pagina web al posto dell'immagine, quindi si vede un
// riquadro vuoto e non si capisce perche. Meglio correggerlo che lasciarlo
// sbagliare in silenzio.
// Una riga si scrive "situazione|indirizzo", ma la barra verticale si
// dimentica facilmente: "*/local/eva3.gif" e un errore naturale, e prima
// faceva sparire la riga in silenzio. Qui si riconosce lo stesso, purche la
// situazione sia una di quelle che esistono davvero.
function fpRiga(riga, zone) {
  const i = riga.indexOf("|");
  if (i > 0) return { chiave: riga.slice(0, i).trim().toLowerCase(), valore: riga.slice(i + 1).trim() };
  const t = riga.trim();
  if (t.startsWith("*")) return { chiave: "*", valore: t.slice(1).replace(/^[:\s]+/, "").trim() };
  const parole = ["casa", "fuori", "zona", "home", "not_home"].concat(zone || []);
  const b = t.toLowerCase();
  for (const k of parole) {
    if (b.startsWith(k)) {
      const resto = t.slice(k.length).replace(/^[:\s]+/, "").trim();
      // Solo se cio che resta somiglia a un indirizzo: senno "casale" non
      // diventerebbe la situazione "casa" piu "le".
      if (/^(\/|https?:|data:)/i.test(resto)) return { chiave: k, valore: resto };
    }
  }
  // Solo un indirizzo, senza situazione davanti: vale sempre.
  if (/^(\/|https?:|data:)/i.test(t) || /\.(gif|png|jpe?g|webp|svg)$/i.test(t)) return { chiave: "*", valore: t };
  return null;
}

function fpIndirizzo(v) {
  if (!v) return v;
  const t = String(v).trim();
  if (/^(https?:|data:|\/local\/|\/api\/|\/hacsfiles\/|\/media\/)/i.test(t)) return t;
  const m = t.match(/^\/?(?:config\/)?www\/(.+)$/i);
  if (m) return "/local/" + m[1];
  // Anche il solo nome del file: quasi sempre e una cosa messa in www.
  if (/^[^/\:]+\.(gif|png|jpe?g|webp|svg)$/i.test(t)) return "/local/" + t;
  return t;
}

class FaberPersona extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-persona-editor"); }
  static getStubConfig(hass) {
    const p = Object.keys(hass && hass.states ? hass.states : {}).filter(id => id.startsWith("person."));
    return Object.assign({}, FP_DEFAULTS, { person: p[0] || "" });
  }

  setConfig(config) {
    this._cfg = Object.assign({}, FP_DEFAULTS, JSON.parse(JSON.stringify(config || {})));
    this._built = false;
    if (this._hass) this._render();
  }
  set hass(h) { this._hass = h; this._render(); }
  getCardSize() { return 4; }

  // Righe "chiave|indirizzo". La chiave e "home", "not_home", il nome di una
  // zona o il suo entity_id.
  _zoneNote() {
    return Object.keys(this._hass.states || {})
      .filter(e => e.startsWith("zone.") && e !== "zone.home")
      .map(e => (this._hass.states[e].attributes.friendly_name || e.slice(5)).toLowerCase());
  }

  _avatarMap() {
    const m = {};
    (this._cfg.avatars || "").split("\n").map(r => r.trim()).filter(Boolean).forEach(riga => {
      const c = fpRiga(riga, this._zoneNote());
      if (c && c.valore) m[c.chiave] = fpIndirizzo(c.valore);
    });
    return m;
  }

  // Le entita del telefono collegato alla persona: batteria e indirizzo si
  // trovano da soli, invece di farglieli cercare a mano fra 1234 sensori.
  _dalTelefono(st) {
    if (this._cacheFor === this._cfg.person && this._cache) return this._cache;
    const out = { battery: "", charging: "", address: "" };
    const trackers = st.attributes.device_trackers || [];
    const ents = Object.values(this._hass.entities || {});
    const devs = new Set();
    trackers.forEach(t => { const e = (this._hass.entities || {})[t]; if (e && e.device_id) devs.add(e.device_id); });
    ents.forEach(e => {
      if (!devs.has(e.device_id)) return;
      const id = e.entity_id, s = this._hass.states[id];
      if (!s) return;
      const dc = s.attributes.device_class;
      if (!out.battery && id.startsWith("sensor.") && dc === "battery") out.battery = id;
      if (!out.charging && id.startsWith("binary_sensor.") && /is_charging|charging/.test(id)) out.charging = id;
      if (!out.address && /geocoded_location/.test(id)) out.address = id;
    });
    this._cacheFor = this._cfg.person;
    this._cache = out;
    return out;
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg;
    const st = c.person ? this._hass.states[c.person] : null;

    if (!this._built) {
      this.innerHTML = `<style>${FP_CSS}</style><ha-card class="fp"><div class="fp-body"></div></ha-card>`;
      this._card = this.querySelector(".fp");
      this._body = this.querySelector(".fp-body");
      this._card.addEventListener("click", e => {
        if (e.target.closest("[data-stop]")) return;
        fhVibra(8);
        if (this._cfg.person) this.dispatchEvent(new CustomEvent("hass-more-info", {
          detail: { entityId: this._cfg.person }, bubbles: true, composed: true }));
      });
      this._built = true;
    }

    if (!st) {
      this._card.style.backgroundImage = "";
      this._body.innerHTML = `<div class="fp-vuoto">${c.person
        ? "Non trovo " + fhEsc(c.person)
        : `<b>Card Persona da configurare</b><br>Entra in modifica (la matita in alto), tocca l'ingranaggio su questa card e scegli chi mostrare.`}</div>`;
      return;
    }

    const stato = st.state;
    const aCasa = stato === "home";
    const fuoriDelTutto = stato === "not_home";
    const inZona = !aCasa && !fuoriDelTutto && stato !== "unknown" && stato !== "unavailable";
    const tono = aCasa ? FP_TONI.casa : inZona ? FP_TONI.zona : fuoriDelTutto ? FP_TONI.fuori : FP_TONI.ignoto;
    const dove = aCasa ? "A casa" : inZona ? stato : fuoriDelTutto ? "Fuori casa" : "Non so dov'e";

    // L'avatar: prima la GIF per questo stato preciso, poi quella per il
    // gruppo (in zona), poi la foto del profilo di Home Assistant.
    const map = this._avatarMap();
    const chiave = stato.toLowerCase();
    const gif = map[chiave]
      || (inZona ? (map["zona"] || map["zone"]) : null)
      || (aCasa ? map["casa"] : map["fuori"])
      || map["*"]
      || st.attributes.entity_picture
      || "";

    const auto = this._dalTelefono(st);
    const batId = c.battery || auto.battery;
    const bat = batId && this._hass.states[batId] ? parseFloat(this._hass.states[batId].state) : null;
    const inCarica = auto.charging && this._hass.states[auto.charging]
      && this._hass.states[auto.charging].state === "on";
    const indId = c.address || auto.address;
    const ind = indId && this._hass.states[indId] ? this._hass.states[indId].state : "";

    const casa = this._hass.states["zone.home"];
    const km = (!aCasa && casa) ? fpDistanza(
      st.attributes.latitude, st.attributes.longitude,
      casa.attributes.latitude, casa.attributes.longitude) : null;

    this._card.style.backgroundImage = `linear-gradient(165deg, ${tono.c}22, ${tono.c}08)`;
    this._card.style.borderColor = tono.c + "45";
    const isQuadra = c.fh_forma === "quadra" || !!this.closest(".fh-slot.quadra") || c.forma_card === "quadrata";
    if (isQuadra) this._card.classList.add("quadra");
    else this._card.classList.remove("quadra");

    const nome = c.name || st.attributes.friendly_name || "Persona";
    const righe = [];
    if (c.mostra_distanza && km != null && km >= 0.15) {
      righe.push({ i: "mdi:map-marker-distance", t: km < 1 ? Math.round(km * 1000) + " m da casa" : km.toFixed(km < 10 ? 1 : 0).replace(".", ",") + " km da casa" });
    }
    if (c.mostra_indirizzo && ind && !aCasa) {
      // L'indirizzo completo e lungo e finisce sempre con "Italia": si tiene
      // la parte che dice davvero dove, cioe via e comune.
      const corto = ind.replace(/,\s*Italia\s*$/i, "").replace(/,\s*\d{5}\s+/, ", ");
      righe.push({ i: "mdi:map-marker-outline", t: corto });
    }

    this._body.className = "fp-body" + (c.disposizione === "fianco" ? " fianco" : "");

    // L'AVATAR SI COSTRUISCE UNA VOLTA SOLA, e da qui in poi si ritocca.
    // Prima stava dentro l'innerHTML insieme a tutto il resto, e l'innerHTML
    // si riscrive a ogni aggiornamento di Home Assistant — che in questa casa
    // vuol dire di continuo. Ogni riscrittura buttava via l'<img> e ne creava
    // un'altra: la GIF ripartiva da capo ogni volta, e sembrava che andasse a
    // scatti e di corsa. Non era la GIF: era che non la si lasciava mai
    // finire. Adesso l'immagine resta la stessa e le si cambia l'indirizzo
    // solo quando cambia davvero, cosi l'animazione scorre alla sua velocita.
    if (!this._avatar) {
      this._avatar = document.createElement("div");
      this._body.appendChild(this._avatar);
      this._testo = document.createElement("div");
      this._testo.className = "fp-testo";
      this._body.appendChild(this._testo);
    }
    if (this._avatar.parentNode !== this._body) this._body.appendChild(this._avatar);
    if (this._testo.parentNode !== this._body) this._body.appendChild(this._testo);
    this._avatar.className = "fp-avatar " + (c.forma === "quadrato" ? "quad" : "") + (aCasa ? "" : " via");
    this._avatar.style.setProperty("--fp-c", tono.c);
    this._avatar.style.setProperty("--fp-d", (FP_GRANDEZZE[c.grandezza] || 140) + "px");
    if (gif) {
      let img = this._avatar.querySelector("img");
      if (!img) {
        this._avatar.innerHTML = `<img alt=""><span class="fp-pallino"></span>`;
        img = this._avatar.querySelector("img");
      }
      // Solo se e cambiata: riassegnare lo stesso src la farebbe ripartire.
      if (img.getAttribute("src") !== gif) img.setAttribute("src", gif);
    } else if (!this._avatar.querySelector(".fp-noimg")) {
      this._avatar.innerHTML = `<div class="fp-noimg"><ha-icon icon="mdi:account"></ha-icon></div><span class="fp-pallino"></span>`;
    }

    this._testo.innerHTML = `
        <div class="fp-nome">${fhEsc(nome)}</div>
        <div class="fp-stato" style="color:${tono.c};--fp-giorno:${tono.g || tono.c}">${fhEsc(dove)}</div>
        <div class="fp-da">${fhEsc(fpDa(st.last_changed))}</div>
        ${righe.length ? `<div class="fp-righe">
          ${righe.map(r => `<span><ha-icon icon="${r.i}"></ha-icon>${fhEsc(r.t)}</span>`).join("")}
        </div>` : ""}
        ${(c.mostra_batteria && bat != null) ? `<div class="fp-bat${bat <= 20 && !inCarica ? " bassa" : ""}">
          <span class="fp-bguscio"><span class="fp-blivello" style="width:${Math.max(0, Math.min(100, bat))}%"></span></span>
          ${Math.round(bat)}%
          ${inCarica ? `<ha-icon icon="mdi:lightning-bolt"></ha-icon><small>in carica</small>`
            : bat <= 20 ? `<small>batteria quasi finita</small>` : ""}
        </div>` : ""}`;
  }
}

const FP_CSS = `
  .fp{display:block;position:relative;overflow:hidden;border-radius:24px;cursor:pointer;
    background-color:rgba(16,18,24,.82);border:1px solid rgba(255,255,255,.10);
    backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);
    color:#eaf1f8;box-shadow:0 10px 30px rgba(0,0,0,.28);
    transition:background-image .5s ease,border-color .5s ease}
  /* Avatar in alto a sinistra e informazioni sotto: cosi la foto puo essere
     grande davvero, invece di doversi spartire la larghezza col testo. */
  .fp-body{padding:16px;display:flex;flex-direction:column;align-items:flex-start;gap:12px;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .fp-body.fianco{flex-direction:row;align-items:center;gap:15px}
  .fp-vuoto{padding:22px 8px;text-align:center;font-size:12.5px;font-weight:600;opacity:.6;width:100%}
  /* In una colonna stretta l'avatar cede spazio al testo invece di
     schiacciarlo: "A CASA" andava a capo su due righe. Resta quadrato grazie
     ad aspect-ratio, senza doverne fissare l'altezza. */
  .fp-avatar{position:relative;width:var(--fp-d,88px);max-width:100%;aspect-ratio:1;height:auto;
    flex:0 0 auto;border-radius:50%;
    overflow:hidden;border:2.5px solid var(--fp-c,#7a8896);
    box-shadow:0 0 0 4px color-mix(in srgb,var(--fp-c) 18%,transparent),0 8px 20px rgba(0,0,0,.35)}
  .fp-avatar.quad{border-radius:20px}
  /* Fuori casa il contorno respira piano: si nota con la coda dell'occhio
     senza diventare un lampeggio fastidioso su una card che sta sempre li. */
  .fp-avatar.via{animation:fp-respira 2.8s ease-in-out infinite}
  @keyframes fp-respira{
    0%,100%{box-shadow:0 0 0 4px color-mix(in srgb,var(--fp-c) 10%,transparent),0 8px 20px rgba(0,0,0,.35)}
    50%{box-shadow:0 0 0 7px color-mix(in srgb,var(--fp-c) 26%,transparent),0 8px 20px rgba(0,0,0,.35)}}
  @media (prefers-reduced-motion:reduce){.fp-avatar.via{animation:none}}
  /* La GIF riempie il tondo senza deformarsi: object-fit cover, non contain.
     Un avatar schiacciato si nota subito. */
  .fp-avatar img{width:100%;height:100%;object-fit:cover;display:block}
  .fp-noimg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
    background:rgba(255,255,255,.07)}
  .fp-noimg ha-icon{--mdc-icon-size:40px;color:rgba(255,255,255,.35)}
  /* Il pallino sta FUORI dal ritaglio del tondo: dentro verrebbe tagliato a
     meta dal bordo. Percio e un fratello dell'immagine, non un figlio. */
  .fp-pallino{position:absolute;right:4px;bottom:4px;width:15px;height:15px;border-radius:50%;
    background:var(--fp-c);border:2.5px solid rgba(16,18,24,.9);z-index:2}
  .fp-body.fianco .fp-avatar{max-width:40%}
  .fp-testo{flex:1;min-width:0;width:100%;display:flex;flex-direction:column;gap:2px}
  .fp-nome{font-size:17px;font-weight:900;letter-spacing:-.2px;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* In una card piccola il nome a 17px spingeva sul bordo. Qui si riduce
     insieme al resto, invece di lasciarlo grande in un quadrato stretto. */
  .fh-slot.quadra[data-taglia="piccola"] .fp-nome{font-size:14.5px}
  .fh-slot.quadra[data-taglia="piccola"] .fp-stato{font-size:9.5px}
  .fh-slot.quadra[data-taglia="piccola"] .fp-da{font-size:10px}
  .fp-stato{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}
  /* Il colore e scritto dentro l'elemento, quindi per scavalcarlo di giorno
     serve !important: e l'unico modo, non una scorciatoia. */
  .fh-app.vetro.chiaro .fp-stato{color:var(--fp-giorno)!important}
  /* La batteria era invisibile di giorno: il contorno del guscio e il suo
     nasino sono un bianco trasparente al 35%, pensato per staccarsi da un
     fondo scuro — su un fondo quasi bianco e un bianco su bianco, proprio
     come il testo di settimana scorsa. Qui diventano scuri, e il rosso
     della batteria scarica passa da un rosa che sul chiaro sta a 2,9 di
     contrasto a un rosso pieno che sta a 6,3. */
  .fh-app.vetro.chiaro .fp-bguscio{border-color:rgba(15,23,42,.4)!important}
  .fh-app.vetro.chiaro .fp-bguscio::after{background:rgba(15,23,42,.4)!important}
  .fh-app.vetro.chiaro .fp-bat.bassa{color:#b91c1c!important}
  .fh-app.vetro.chiaro .fp-bat.bassa .fp-blivello{background:#b91c1c!important}
  .fp-da{font-size:11.5px;font-weight:600;opacity:.55}
  .fp-righe{display:flex;flex-direction:column;gap:3px;margin-top:6px}
  .fp-righe span{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;opacity:.8;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fp-righe ha-icon{--mdc-icon-size:14px;flex:0 0 auto;opacity:.75}
  .fp-bat{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11.5px;font-weight:800;
    font-variant-numeric:tabular-nums;opacity:.85}
  .fp-bat ha-icon{--mdc-icon-size:14px;color:var(--fh-c-acc,#ffb020)}
  .fp-bguscio{width:34px;height:11px;border-radius:3px;padding:1.5px;flex:0 0 auto;
    border:1.5px solid rgba(255,255,255,.35);position:relative}
  .fp-bguscio::after{content:"";position:absolute;right:-4px;top:3px;width:2.5px;height:4px;
    border-radius:0 2px 2px 0;background:rgba(255,255,255,.35)}
  .fp-blivello{display:block;height:100%;border-radius:1.5px;background:#38e08a;transition:width .6s ease}
  .fp-bat.bassa .fp-blivello{background:#ff5c5c}
  .fp.quadra{aspect-ratio:1 / 1!important;height:100%!important;width:100%!important;max-height:100%!important;
    box-sizing:border-box!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
  .fp.quadra .fp-body{height:100%!important;width:100%!important;min-height:0!important;box-sizing:border-box!important;
    padding:10px 8px 8px!important;display:flex!important;flex-direction:column!important;align-items:center!important;
    justify-content:space-evenly!important;text-align:center!important;gap:2px!important;overflow:hidden!important}
  .fp.quadra .fp-body.fianco{flex-direction:row!important;align-items:center!important;justify-content:center!important;
    text-align:left!important;gap:8px!important;padding:10px!important}
  .fp.quadra .fp-avatar{width:clamp(48px,34%,80px)!important;height:auto!important;aspect-ratio:1!important;flex:0 0 auto!important;margin:0 auto!important}
  .fp.quadra .fp-body.fianco .fp-avatar{width:clamp(46px,34%,72px)!important;margin:0!important}
  .fp.quadra .fp-testo{flex:0 1 auto!important;min-width:0!important;width:100%!important;display:flex!important;
    flex-direction:column!important;align-items:center!important;gap:1px!important}
  .fp.quadra .fp-body.fianco .fp-testo{align-items:flex-start!important}
  .fp.quadra .fp-nome{font-size:clamp(12.5px,3.6vw,15.5px)!important;font-weight:800!important;line-height:1.15!important;
    text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:100%!important}
  .fp.quadra .fp-body.fianco .fp-nome{text-align:left!important}
  .fp.quadra .fp-stato{font-size:clamp(9px,2.4vw,10.5px)!important;font-weight:800!important;line-height:1.15!important;
    text-align:center!important;margin-top:1px!important;letter-spacing:.06em!important}
  .fp.quadra .fp-body.fianco .fp-stato{text-align:left!important}
  .fp.quadra .fp-da{font-size:clamp(8.5px,2.2vw,9.5px)!important;font-weight:600!important;line-height:1.15!important;
    opacity:.6!important;text-align:center!important}
  .fp.quadra .fp-body.fianco .fp-da{text-align:left!important}
  .fp.quadra .fp-bat{font-size:clamp(9px,2.4vw,10.5px)!important;font-weight:800!important;margin-top:2px!important;
    display:flex!important;align-items:center!important;justify-content:center!important;gap:4px!important}
  .fp.quadra .fp-bguscio{width:26px!important;height:9px!important;padding:1px!important}
  .fp.quadra .fp-bguscio::after{width:2px!important;height:3px!important;right:-3px!important;top:2px!important}
  .fp.quadra .fp-righe{margin-top:2px!important;gap:1px!important}
  .fp.quadra .fp-righe span{font-size:9px!important;gap:3px!important}
  .fp.quadra .fp-righe ha-icon{--mdc-icon-size:11px!important}
`;

customElements.define("faber-persona", FaberPersona);

class FaberPersonaEditor extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({}, FP_DEFAULTS, JSON.parse(JSON.stringify(config || {})));
    if (this._interno) { this._interno = false; return; }
    if (this._hass) this._render();
  }
  set hass(h) { this._hass = h; if (this._cfg && !this._fatto) { this._fatto = true; this._render(); } }
  _emit() {
    this._interno = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true }));
  }
  _set(k, v) { this._cfg = Object.assign({}, this._cfg, { [k]: v }); this._emit(); }

  _render() {
    if (!this._cfg || !this._hass) return;
    const c = this._cfg;
    const persone = Object.keys(this._hass.states).filter(e => e.startsWith("person."));
    // Si scartano le zone PASSIVE: una zona passiva non diventa mai lo stato
    // della persona (serve solo nelle condizioni), quindi un avatar per quella
    // zona non comparirebbe mai. Offrirlo sarebbe promettere una cosa che non
    // puo succedere.
    const zone = Object.keys(this._hass.states).filter(e =>
      e.startsWith("zone.") && e !== "zone.home" && !this._hass.states[e].attributes.passive);
    const nomeZona = z => (this._hass.states[z].attributes.friendly_name || z.slice(5));
    // Le "zone" di Home Assistant sono luoghi sulla mappa (il lavoro, la
    // scuola), non stanze della casa: per questo fra loro compare "Lavoro Eva".
    const mappa = {};
    (c.avatars || "").split("\n").map(r => r.trim()).filter(Boolean).forEach(riga => {
      const c = fpRiga(riga, zone.map(z => nomeZona(z).toLowerCase()));
      if (c && c.valore) mappa[c.chiave] = fpIndirizzo(c.valore);
    });
    const slots = [
      { k: "casa", t: "Quando e a casa" },
      { k: "fuori", t: "Quando e fuori" },
      ...zone.map(z => ({ k: nomeZona(z).toLowerCase(), t: "Quando e a " + nomeZona(z) })),
      { k: "*", t: "Sempre (se manca il resto)" },
    ];
    const scriviMappa = () => Object.keys(mappa).filter(k => mappa[k])
      .map(k => k + "|" + mappa[k]).join("\n");

    this.innerHTML = `<style>${FPE_CSS}</style>
      <div class="fpe">
        <div class="fpe-f"><label>Persona</label>
          <select class="fpe-in" id="fpP">
            <option value="">— scegli —</option>
            ${persone.map(p => `<option value="${p}"${p === c.person ? " selected" : ""}>${fhEsc(this._hass.states[p].attributes.friendly_name || p)}</option>`).join("")}
          </select></div>

        <div class="fpe-f"><label>Nome mostrato</label>
          <span class="fpe-h">Vuoto = il nome della persona.</span>
          <input class="fpe-in" id="fpN" value="${fhEsc(c.name || "")}"></div>

        <div class="fpe-f"><label>Avatar animati</label>
          <span class="fpe-h"><b>Il modo migliore</b>: metti le GIF in <code>config/www</code> e qui scrivi <code>/local/nome.gif</code>. Cosi il telefono le scarica una volta e poi se le tiene, e non pesano sulla dashboard. Ci arrivi da Windows con <code>\\homeassistant\config\www</code> (Samba), oppure trascinandole dentro <b>Studio Code Server</b>.<br>
            Il tasto <b>Scegli</b> qui sotto mette invece la GIF <b>dentro la card</b>: comodo dal telefono e senza copiare niente, ma il file finisce nella configurazione della dashboard, che viene riletta a ogni apertura e riscritta a ogni salvataggio. Va bene per immagini piccole, sotto i 150 KB.</span>
          <div class="fpe-slot">
            ${slots.map(sl => {
              const v = mappa[sl.k] || "";
              return `<div class="fpe-s">
                <div class="fpe-sant">${v ? `<img src="${fhEsc(v)}" alt="">` : `<span>vuoto</span>`}</div>
                <div class="fpe-sinfo">
                  <div class="fpe-sn">${fhEsc(sl.t)}</div>
                  <div class="fpe-sd">${v ? (v.startsWith("data:") ? "GIF dentro la card &middot; " + Math.round(v.length / 1400) + " KB" : fhEsc(v.slice(0, 40))) : "nessuna immagine"}</div>
                </div>
                <button type="button" class="fpe-sb" data-scegli="${fhEsc(sl.k)}">Scegli</button>
                ${v ? `<button type="button" class="fpe-sb via" data-togli="${fhEsc(sl.k)}">&times;</button>` : ""}
              </div>`;
            }).join("")}
          </div>
          <input type="file" accept="image/gif,image/png,image/jpeg,image/webp" id="fpFile" hidden>
          <div class="fpe-h" id="fpMsg"></div>
          <details class="fpe-det" open><summary>Scrivere gli indirizzi a mano (consigliato)</summary>
            <span class="fpe-h">Una riga per stato, <b>stato|indirizzo</b>. Stati: <b>casa</b>, <b>fuori</b>, <b>zona</b>, il nome di una zona, oppure <b>*</b> per una GIF sempre valida.</span>
            <textarea class="fpe-in fpe-ta" id="fpA" placeholder="casa|/local/cristian-casa.gif">${fhEsc(c.avatars || "")}</textarea>
          </details>
        </div>

        <div class="fpe-f"><label>Disposizione</label>
          <div class="fpe-scelta">
            <button type="button" class="fpe-b${(c.disposizione || "colonna") === "colonna" ? " sel" : ""}" data-disp="colonna">Foto sopra</button>
            <button type="button" class="fpe-b${c.disposizione === "fianco" ? " sel" : ""}" data-disp="fianco">Foto di fianco</button>
          </div></div>

        <div class="fpe-f"><label>Grandezza della foto</label>
          <div class="fpe-scelta">
            ${[["piccola", "Piccola"], ["media", "Media"], ["grande", "Grande"], ["piena", "Piena"]].map(([k, t]) =>
              `<button type="button" class="fpe-b${(c.grandezza || "media") === k ? " sel" : ""}" data-gr="${k}">${t}</button>`).join("")}
          </div></div>
        <div class="fpe-f"><label>Forma</label>
          <div class="fpe-scelta">
            <button type="button" class="fpe-b${c.forma !== "quadrato" ? " sel" : ""}" data-forma="cerchio">Tonda</button>
            <button type="button" class="fpe-b${c.forma === "quadrato" ? " sel" : ""}" data-forma="quadrato">Quadrata</button>
          </div></div>

        <div class="fpe-f"><label>Cosa mostrare</label>
          <label class="fpe-ck"><input type="checkbox" id="fpD"${c.mostra_distanza !== false ? " checked" : ""}> Quanto dista da casa</label>
          <label class="fpe-ck"><input type="checkbox" id="fpI"${c.mostra_indirizzo !== false ? " checked" : ""}> Indirizzo dove si trova</label>
          <label class="fpe-ck"><input type="checkbox" id="fpB"${c.mostra_batteria !== false ? " checked" : ""}> Batteria del telefono</label>
          <span class="fpe-h">Batteria e indirizzo li trova da solo dal telefono collegato alla persona.</span></div>
      </div>`;

    const q = s => this.querySelector(s);
    q("#fpP").addEventListener("change", e => { this._set("person", e.target.value); });
    q("#fpN").addEventListener("input", e => this._set("name", e.target.value));
    const ta = q("#fpA");
    if (ta) ta.addEventListener("input", e => this._set("avatars", e.target.value));
    this.querySelectorAll("[data-disp]").forEach(b => b.addEventListener("click", () => {
      this._set("disposizione", b.dataset.disp); this._render();
    }));
    this.querySelectorAll("[data-gr]").forEach(b => b.addEventListener("click", () => {
      this._set("grandezza", b.dataset.gr); this._render();
    }));
    this.querySelectorAll("[data-togli]").forEach(b => b.addEventListener("click", () => {
      delete mappa[b.dataset.togli];
      this._set("avatars", scriviMappa()); this._render();
    }));
    const file = q("#fpFile");
    this.querySelectorAll("[data-scegli]").forEach(b => b.addEventListener("click", () => {
      this._slotAperto = b.dataset.scegli;
      file.value = "";
      file.click();
    }));
    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      if (!f || !this._slotAperto) return;
      const m = q("#fpMsg");
      // Un file troppo grande finirebbe dentro la configurazione della
      // dashboard, che si carica a ogni apertura: meglio dirlo che rallentare
      // tutto in silenzio.
      const kb = Math.round(f.size / 1024);
      // Sopra questa taglia il danno e concreto: il file, gonfiato di un terzo
      // dalla codifica, viaggia dentro la configurazione della dashboard a
      // ogni apertura e a ogni salvataggio. Meglio rifiutare che rallentare
      // tutto in silenzio.
      if (f.size > 800 * 1024) {
        m.innerHTML = "Pesa " + kb + " KB: troppo per stare dentro la card (diventerebbero ~"
          + Math.round(kb * 1.34) + " KB dentro la dashboard, ricaricati ogni volta). "
          + "Mettila in <code>config/www</code> e scrivi qui <code>/local/" + fhEsc(f.name) + "</code>.";
        return;
      }
      m.textContent = "Leggo " + f.name + "...";
      const fr = new FileReader();
      fr.onload = () => {
        mappa[this._slotAperto] = String(fr.result);
        this._set("avatars", scriviMappa());
        this._render();
        const m2 = this.querySelector("#fpMsg");
        if (!m2) return;
        if (kb > 150) {
          m2.innerHTML = "Aggiunta, ma pesa " + kb + " KB: la dashboard si ricarichera piu lenta. "
            + "Meglio metterla in <code>config/www</code> e scrivere <code>/local/" + fhEsc(f.name) + "</code>.";
        } else {
          m2.textContent = "Aggiunta (" + kb + " KB).";
        }
      };
      fr.onerror = () => { m.textContent = "Non sono riuscito a leggere il file."; };
      fr.readAsDataURL(f);
    });
    q("#fpD").addEventListener("change", e => this._set("mostra_distanza", e.target.checked));
    q("#fpI").addEventListener("change", e => this._set("mostra_indirizzo", e.target.checked));
    q("#fpB").addEventListener("change", e => this._set("mostra_batteria", e.target.checked));
    this.querySelectorAll("[data-forma]").forEach(b => b.addEventListener("click", () => {
      this._set("forma", b.dataset.forma); this._render();
    }));
    // Il nome della zona va scritto esatto: meglio darglielo con un tocco che
    // farlo ricopiare a mano.
    this.querySelectorAll("[data-z]").forEach(b => b.addEventListener("click", () => {
      const ta = q("#fpA");
      ta.value = (ta.value ? ta.value.replace(/\n$/, "") + "\n" : "") + b.dataset.z + "|/local/";
      this._set("avatars", ta.value);
      ta.focus();
    }));
  }
}

const FPE_CSS = `
  .fpe{display:flex;flex-direction:column;gap:14px;padding:4px 2px;font-family:inherit}
  .fpe-f{display:flex;flex-direction:column;gap:5px;min-width:0}
  .fpe-f>label{font-size:13px;font-weight:700;color:var(--primary-text-color)}
  .fpe-h{font-size:11.5px;line-height:1.5;color:var(--secondary-text-color)}
  .fpe-h code{font-family:ui-monospace,monospace;font-size:11px;
    background:rgba(127,127,127,.18);padding:1px 4px;border-radius:4px}
  .fpe-in{padding:9px 10px;border-radius:9px;font-size:14px;width:100%;box-sizing:border-box;font-family:inherit;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fpe-ta{min-height:86px;font-family:ui-monospace,monospace;font-size:12.5px;resize:vertical}
  .fpe-slot{display:flex;flex-direction:column;gap:6px}
  .fpe-s{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:12px;
    border:1px solid var(--divider-color);background:var(--card-background-color)}
  .fpe-sant{width:42px;height:42px;border-radius:50%;overflow:hidden;flex:0 0 auto;
    display:flex;align-items:center;justify-content:center;background:rgba(127,127,127,.18)}
  .fpe-sant img{width:100%;height:100%;object-fit:cover}
  .fpe-sant span{font-size:9px;font-weight:700;color:var(--secondary-text-color)}
  .fpe-sinfo{flex:1;min-width:0}
  .fpe-sn{font-size:12.5px;font-weight:700;color:var(--primary-text-color);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fpe-sd{font-size:10.5px;color:var(--secondary-text-color);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fpe-sb{padding:6px 11px;border-radius:9px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700;
    flex:0 0 auto;border:1px solid var(--divider-color);background:var(--card-background-color);
    color:var(--primary-text-color)}
  .fpe-sb:hover{border-color:rgba(255,176,32,.6)}
  .fpe-sb.via{padding:6px 9px;font-size:14px;line-height:1}
  .fpe-det{border:1px solid var(--divider-color);border-radius:11px;padding:9px 11px;margin-top:2px}
  .fpe-det summary{font-size:12.5px;font-weight:700;cursor:pointer;color:var(--primary-text-color)}
  .fpe-zone{font-size:11.5px;color:var(--secondary-text-color);display:flex;flex-wrap:wrap;gap:5px;align-items:center}
  .fpe-z{padding:4px 9px;border-radius:14px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fpe-z:hover{border-color:rgba(255,176,32,.6)}
  .fpe-scelta{display:flex;gap:8px}
  .fpe-b{flex:1;padding:9px;border-radius:10px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fpe-b.sel{border-color:rgba(255,176,32,.7);background:rgba(255,176,32,.16)}
  .fpe-ck{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;
    color:var(--primary-text-color)}
  .fpe-ck input{width:auto}
`;

customElements.define("faber-persona-editor", FaberPersonaEditor);


window.customCards = window.customCards || [];
window.customCards.push({
  type: "faber-weather",
  name: "Faber Meteo",
  description: "Meteo nello stile della famiglia: temperatura grande, condizione in italiano, umidita/pressione/vento/direzione e i prossimi giorni.",
  preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
});
window.customCards.push({
  type: "faber-persona",
  name: "Faber Persona",
  description: "Chi c'e e dov'e, con un avatar animato che cambia con lo stato. Batteria del telefono, distanza da casa e indirizzo li trova da solo.",
  preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
});
window.customCards.push({
  type: "faber-clima",
  name: "Faber Clima",
  description: "Il condizionatore con tutti i suoi comandi: modi, temperatura, ventola, alette e programmi. Compaiono solo quelli che l'apparecchio sa fare davvero.",
  preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
});
window.customCards.push({
  type: "faber-carichi",
  name: "Faber Carichi reali",
  description: "Quanto tira davvero la casa: contatore, quanto e monitorato, quanto sfugge, e la classifica dei carichi accesi adesso.",
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

/* ===========================================================================
   FABER MEDIA — il telecomando di casa.

   Non e la pulsantiera della vecchia plancia trasportata qui: quella era una
   griglia di rettangoli grigi nati per un fondo scuro, e dentro Faber Home
   stonava. Questo e un telecomando vero: la crociera al centro, i bilancieri
   del volume e dei canali ai lati come sul telecomando che hai in mano, e le
   sorgenti in cima.

   Il cervello resta dov'era: due script gia esistenti in casa
   (`remote_press_button` con un comando, `remote_changesource` con un
   dispositivo). La card non sa niente di infrarossi: manda il nome del tasto.

   Si adatta da sola: tutte le misure sono in `cqw` (percentuale della
   larghezza della CARD, non dello schermo), quindi sul telefono in colonna
   singola e sul tablet in mezza pagina resta proporzionata senza due layout
   diversi da mantenere.
   =========================================================================== */

// I tasti della fila in basso: questa e solo la dotazione di partenza. Da qui
// in poi vivono nella configurazione della card e si cambiano dalla card
// stessa, senza passare dall'editor di Home Assistant.
const FM_TASTI = [
  { nome: "Muto", icona: "mdi:volume-off", cmd: "volume_mute" },
  { nome: "Indietro", icona: "mdi:keyboard-return", cmd: "exit" },
  { nome: "Home", icona: "mdi:home", cmd: "Home" },
  { nome: "Sorgente", icona: "mdi:import", cmd: "input" },
  { nome: "Info", icona: "mdi:information-outline", cmd: "info" },
  { nome: "Lista", icona: "mdi:format-list-bulleted", cmd: "CH.LIST" },
  { nome: "Guida", icona: "mdi:television-guide", cmd: "GUIDE" },
  { nome: "Netflix", icona: "mdi:netflix", cmd: "SOURCE_RADIO" },
];

const FM_COMANDI = {
  acceso: "Power on", spento: "power", casa: "Home", sorgente: "input",
  su: "UP", giu: "down", sinistra: "LEFT", destra: "RIGHT", ok: "OK",
  info: "info", indietro: "exit", lista: "CH.LIST", guida: "GUIDE",
  vol_su: "volume_up", vol_giu: "volume_down", muto: "volume_mute",
  ch_su: "channel+", ch_giu: "channel-", extra: "SOURCE_RADIO",
};

class FaberMedia extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({
      title: "Telecomando",
      selettore: "input_select.remote_type",
      script_tasto: "script.remote_press_button",
      script_sorgente: "script.remote_changesource",
      apprendimento: "input_boolean.remote_learning",
      comandi: {},
      tasti: null,
    }, config || {});
    this._cmd = Object.assign({}, FM_COMANDI, this._cfg.comandi || {});
    this._tasti = Array.isArray(this._cfg.tasti) ? this._cfg.tasti.slice() : FM_TASTI.slice();
    this._built = false;
  }
  set hass(hass) {
    this._hass = hass;
    if (!this._built) { this._built = true; this._render(); }
    else this._patch();
  }
  getCardSize() { return 7; }
  static getConfigElement() { return document.createElement("faber-media-editor"); }
  static getStubConfig() { return { type: "custom:faber-media", title: "Telecomando" }; }
  disconnectedCallback() { this._stopRipeti(); }

  // ================== L'UNICA PORTA DI SCRITTURA DELLA CONFIGURAZIONE =======
  // Stessa regola imparata col controllo carichi: una card non deve poter
  // riscrivere la propria configurazione se non dentro un gesto esplicito.
  // Fuori dal tasto Salva questa rifiuta e lo scrive in console.
  async _salvaConfig(tasti) {
    if (!this._gesto) {
      console.warn("[faber-media] scrittura rifiutata: nessun gesto esplicito");
      return false;
    }
    const url = (location.pathname.split("/")[1]) || "lovelace";
    const dash = await this._hass.callWS({ type: "lovelace/config", url_path: url });
    let quante = 0;
    const gira = c => {
      if (!c || typeof c !== "object") return;
      if (c.type === "custom:faber-media") {
        if (!this._cfg.fm_id || c.fm_id === this._cfg.fm_id) { c.tasti = tasti; quante++; }
      }
      ["cards", "pages", "rows", "cols"].forEach(k => {
        if (Array.isArray(c[k])) c[k].forEach(gira);
      });
      if (c.fh_popup) gira(c.fh_popup);
    };
    (dash.views || []).forEach(v => (v.cards || []).forEach(gira));
    if (quante !== 1) {
      console.warn("[faber-media] trovate " + quante + " card: non salvo per non toccare quella sbagliata");
      return false;
    }
    await this._hass.callWS({ type: "lovelace/config/save", url_path: url, config: dash });
    return true;
  }

  // Due modi di comandare. Di serie passa dagli script di casa (sala). Con
  // `remote` (e `device`) parla direttamente al Broadlink: e cosi che la
  // stessa card fa da telecomando alla TV di Gaia, che ha il suo Broadlink e
  // i suoi tasti imparati sotto il dispositivo "LG_Gaia". In quel modo
  // l'accoppiamento non ha bisogno di levette in casa: impara remote.learn_command.
  _imparando() {
    if (this._cfg.remote) return !!this._imparaLocale;
    const st = this._hass.states[this._cfg.apprendimento];
    return !!st && st.state === "on";
  }
  _accendiApprendimento(acceso) {
    if (this._cfg.remote) { this._imparaLocale = !!acceso; return; }
    const e = this._cfg.apprendimento;
    if (!e) return;
    this._hass.callService("input_boolean", acceso ? "turn_on" : "turn_off", { entity_id: e });
  }

  _sorgenti() {
    const st = this._hass.states[this._cfg.selettore];
    return {
      attiva: st ? st.state : "",
      lista: (st && st.attributes.options) || [],
    };
  }

  // --------------------------------------------------------------- comandi
  _premi(chiave) { this._mandaCmd(this._cmd[chiave]); }
  _mandaCmd(c) {
    if (!c) return;
    if (this._cfg.remote) {
      const d = { entity_id: this._cfg.remote, command: c };
      if (this._cfg.device) d.device = this._cfg.device;
      this._hass.callService("remote", this._imparaLocale ? "learn_command" : "send_command", d);
      return;
    }
    const [dom, srv] = this._cfg.script_tasto.split(".");
    this._hass.callService(dom, srv, { command: c });
  }
  _cambiaSorgente(dev) {
    const [dom, srv] = this._cfg.script_sorgente.split(".");
    this._hass.callService(dom, srv, { device: dev });
  }
  // Tenere premuto ripete: sul volume e sui canali e la differenza fra un
  // telecomando e una fila di pulsanti.
  _ripeti(chiave) {
    this._stopRipeti();
    this._premi(chiave);
    this._rip1 = setTimeout(() => {
      this._rip2 = setInterval(() => this._premi(chiave), 260);
    }, 480);
  }
  _stopRipeti() {
    if (this._rip1) { clearTimeout(this._rip1); this._rip1 = null; }
    if (this._rip2) { clearInterval(this._rip2); this._rip2 = null; }
  }

  _patch() {
    const s = this._sorgenti();
    this.querySelectorAll("[data-src]").forEach(b => {
      b.classList.toggle("on", b.dataset.src === s.attiva);
    });
  }

  _render() {
    const s = this._sorgenti();
    const c = this._cfg;
    this.innerHTML = `
      <style>
        .fm{--fm-ink:#12161c;--fm-fade:rgba(15,23,42,.55);--fm-soft:rgba(15,23,42,.055);
          --fm-line:rgba(15,23,42,.10);--fm-glass:rgba(255,255,255,.62);--fm-acc:#ffb020;
          --fm-on:#128a52;--fm-off:#c9372c;
          container-type:inline-size;
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
          color:var(--fm-ink);border-radius:26px;padding:20px 18px 22px;
          /* Un telecomando largo un metro non e un telecomando. Oltre una certa
             larghezza la card smette di allargarsi e si mette in mezzo: sul
             telefono riempie, sul tablet resta a misura di pollice. */
          max-width:520px;margin-inline:auto;
          background:var(--fm-glass);box-shadow:0 14px 34px rgba(20,26,40,.14);
          transition:background .6s ease,color .6s ease}
        .fh-app:not(.chiaro) .fm{--fm-ink:#eaf1f8;--fm-fade:rgba(234,241,248,.6);
          --fm-soft:rgba(255,255,255,.07);--fm-line:rgba(255,255,255,.12);
          --fm-glass:rgba(30,38,48,.72);--fm-on:#39d98a;--fm-off:#ff5442;
          box-shadow:0 14px 34px rgba(0,0,0,.34)}

        .fm-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .fm-tit{font-size:clamp(15px,4.6cqw,19px);font-weight:900;letter-spacing:-.01em}
        .fm-pow{display:flex;gap:8px}
        .fm-p{width:clamp(36px,10cqw,44px);height:clamp(36px,10cqw,44px);border-radius:50%;
          border:1px solid var(--fm-line);background:var(--fm-soft);color:inherit;cursor:pointer;
          display:grid;place-items:center;transition:transform .08s ease,filter .15s ease}
        .fm-p ha-icon{--mdc-icon-size:clamp(19px,5.4cqw,23px)}
        .fm-p.acceso{color:var(--fm-on)} .fm-p.spento{color:var(--fm-off)}
        .fm-p:active{transform:scale(.92)}

        .fm-src{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}
        .fm-s{flex:1 1 auto;min-width:72px;padding:9px 10px;border-radius:13px;border:1px solid var(--fm-line);
          background:var(--fm-soft);color:inherit;cursor:pointer;font:inherit;
          font-size:clamp(10.5px,3cqw,12.5px);font-weight:800;letter-spacing:.02em;
          transition:transform .08s ease,background .18s ease,color .18s ease,border-color .18s ease}
        .fm-s:active{transform:scale(.96)}
        .fm-s.on{background:var(--fm-acc);border-color:var(--fm-acc);color:#1c1400;box-shadow:0 6px 16px rgba(255,176,32,.34)}

        /* La riga centrale: bilanciere volume, crociera, bilanciere canali.
           E la disposizione del telecomando vero, e sul telefono funziona
           meglio di qualunque griglia: i pollici stanno ai lati. */
        .fm-mid{display:grid;grid-template-columns:auto 1fr auto;align-items:center;
          gap:clamp(8px,3cqw,18px);margin-top:clamp(14px,4cqw,20px)}
        .fm-rock{display:flex;flex-direction:column;align-items:center;gap:0;
          width:clamp(52px,14cqw,66px);border-radius:999px;border:1px solid var(--fm-line);
          background:var(--fm-soft);overflow:hidden}
        .fm-rb{width:100%;padding:clamp(11px,3.4cqw,15px) 0;border:0;background:none;color:inherit;
          cursor:pointer;display:grid;place-items:center;transition:background .15s ease}
        .fm-rb ha-icon{--mdc-icon-size:clamp(20px,5.6cqw,24px)}
        .fm-rb:active{background:rgba(255,176,32,.22)}
        .fm-rlab{font-size:9px;font-weight:900;letter-spacing:.1em;opacity:.55;padding:2px 0}

        .fm-pad{position:relative;width:100%;aspect-ratio:1/1;max-width:clamp(180px,52cqw,280px);
          margin:0 auto;border-radius:50%;border:1px solid var(--fm-line);background:var(--fm-soft);
          display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr;
          place-items:stretch}
        .fm-d{border:0;background:none;color:inherit;cursor:pointer;display:grid;place-items:center;
          transition:background .15s ease}
        .fm-d ha-icon{--mdc-icon-size:clamp(24px,7cqw,32px);opacity:.85}
        .fm-d:active{background:rgba(255,176,32,.2)}
        .fm-d.su{grid-area:1/2/2/3;border-radius:50% 50% 0 0}
        .fm-d.sin{grid-area:2/1/3/2;border-radius:50% 0 0 50%}
        .fm-d.des{grid-area:2/3/3/4;border-radius:0 50% 50% 0}
        .fm-d.giu{grid-area:3/2/4/3;border-radius:0 0 50% 50%}
        .fm-ok{grid-area:2/2/3/3;border:0;cursor:pointer;border-radius:50%;margin:6%;
          background:var(--fm-acc);color:#1c1400;font:inherit;font-size:clamp(13px,3.8cqw,16px);
          font-weight:900;letter-spacing:.06em;box-shadow:0 8px 20px rgba(255,176,32,.36);
          transition:transform .08s ease}
        .fm-ok:active{transform:scale(.93)}

        .fm-riga{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:clamp(12px,3.5cqw,18px)}
        .fm-b{padding:clamp(10px,2.8cqw,13px) 4px;border-radius:14px;border:1px solid var(--fm-line);
          background:var(--fm-soft);color:inherit;cursor:pointer;font:inherit;
          font-size:clamp(9.5px,2.7cqw,11.5px);font-weight:800;letter-spacing:.03em;
          display:flex;flex-direction:column;align-items:center;gap:3px;
          transition:transform .08s ease,background .15s ease}
        .fm-b ha-icon{--mdc-icon-size:clamp(17px,4.6cqw,20px);opacity:.8}
        .fm-b:active{transform:scale(.95);background:rgba(255,176,32,.16)}
        .fm-extra{margin-top:9px;width:100%;padding:13px;border-radius:15px;border:0;cursor:pointer;
          font:inherit;font-size:clamp(11px,3cqw,13px);font-weight:900;letter-spacing:.1em;
          text-transform:uppercase;background:#e50914;color:#fff;
          box-shadow:0 8px 20px rgba(229,9,20,.3);transition:transform .08s ease}
        .fm-extra:active{transform:scale(.97)}
        .fm-vuoto{font-size:12px;font-weight:700;opacity:.6;padding:10px 0}
        .fm-imp{margin-top:12px;width:100%;padding:11px;border-radius:14px;border:1px dashed var(--fm-line);
          background:none;color:inherit;cursor:pointer;font:inherit;font-size:12px;font-weight:800;
          display:flex;align-items:center;justify-content:center;gap:7px;opacity:.75}
        .fm-imp ha-icon{--mdc-icon-size:18px}
        .fm-imp:hover{opacity:1}
        .fm-scrim{position:fixed;inset:0;z-index:100;background:rgba(4,5,8,.62);backdrop-filter:blur(6px);
          display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;pointer-events:none;
          transition:opacity .18s}
        .fm-scrim.on{opacity:1;pointer-events:auto}
        .fm-modal{width:min(520px,100%);max-height:86vh;overflow:auto;border-radius:22px;
          background:#1a1b21;color:#eaf1f8;display:flex;flex-direction:column;
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
        .fm-mh{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 8px}
        .fm-mt{font-size:15px;font-weight:900}
        .fm-x{border:0;background:none;color:inherit;font-size:20px;cursor:pointer;line-height:1}
        .fm-mc{padding:0 18px 14px;display:flex;flex-direction:column;gap:11px}
        .fm-lab{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;opacity:.6}
        .fm-lab small{display:block;font-size:10px;font-weight:700;letter-spacing:0;text-transform:none;
          opacity:.85;margin-top:2px}
        .fm-riga2{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;
          background:rgba(255,255,255,.05)}
        .fm-riga2 input{flex:1 1 auto;min-width:0;padding:7px 9px;border-radius:9px;font:inherit;font-size:12.5px;
          font-weight:700;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:inherit}
        .fm-mini{border:1px solid rgba(255,255,255,.18);background:none;color:inherit;cursor:pointer;
          border-radius:9px;width:30px;height:30px;flex:0 0 auto;font-size:14px;line-height:1}
        .fm-mini:disabled{opacity:.3;cursor:not-allowed}
        .fm-add{width:100%;padding:10px;border-radius:12px;border:1px dashed rgba(255,255,255,.22);
          background:none;color:inherit;cursor:pointer;font:inherit;font-size:12.5px;font-weight:800}
        .fm-nota{font-size:10.5px;line-height:1.45;opacity:.62}
        .fm-nota.forte{opacity:1;color:#ffb020;font-weight:800}
        .fm-sw{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;
          background:rgba(255,176,32,.12);border:1px solid rgba(255,176,32,.35);font-size:12.5px;font-weight:800}
        .fm-sw input{width:18px;height:18px}
        .fm-mf{display:flex;gap:8px;padding:12px 18px 18px;border-top:1px solid rgba(255,255,255,.09)}
        .fm-mf button{flex:1;padding:11px;border:0;border-radius:12px;font:inherit;font-size:13px;
          font-weight:800;cursor:pointer}
        .fm-ann{background:rgba(255,255,255,.09);color:inherit}
        .fm-ok2{background:#ffb020;color:#1c1400}
        .fm-ok2:disabled{opacity:.4;cursor:not-allowed}

        /* Sul tablet, o quando la card ha spazio, la crociera cresce e i tasti
           di sotto si mettono in fila unica invece che a quattro colonne. */
        @container (min-width: 520px){
          .fm-riga{grid-template-columns:repeat(4,1fr);gap:10px}
          .fm{padding:26px 26px 28px}
        }
      </style>

      <div class="fm">
        <div class="fm-top">
          <div class="fm-tit">${fhEsc(c.title || "Telecomando")}</div>
          <div class="fm-pow">
            <button type="button" class="fm-p acceso" data-k="acceso" title="${this._cmd.acceso === this._cmd.spento ? "Accendi / spegni" : "Accendi"}">
              <ha-icon icon="mdi:power"></ha-icon></button>
            ${this._cmd.acceso === this._cmd.spento ? "" : `<button type="button" class="fm-p spento" data-k="spento" title="Spegni">
              <ha-icon icon="mdi:power-off"></ha-icon></button>`}
          </div>
        </div>

        ${s.lista.length ? `<div class="fm-src">
          ${s.lista.map(x => `<button type="button" class="fm-s${x === s.attiva ? " on" : ""}" data-src="${fhEsc(x)}">${fhEsc(x)}</button>`).join("")}
        </div>` : c.selettore ? `<div class="fm-vuoto">Nessun elenco sorgenti: controlla ${fhEsc(c.selettore)}</div>` : ""}

        <div class="fm-mid">
          <div class="fm-rock">
            <button type="button" class="fm-rb" data-r="vol_su"><ha-icon icon="mdi:plus"></ha-icon></button>
            <span class="fm-rlab">VOL</span>
            <button type="button" class="fm-rb" data-r="vol_giu"><ha-icon icon="mdi:minus"></ha-icon></button>
          </div>

          <div class="fm-pad">
            <button type="button" class="fm-d su"  data-k="su"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
            <button type="button" class="fm-d sin" data-k="sinistra"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
            <button type="button" class="fm-ok" data-k="ok">OK</button>
            <button type="button" class="fm-d des" data-k="destra"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
            <button type="button" class="fm-d giu" data-k="giu"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
          </div>

          <div class="fm-rock">
            <button type="button" class="fm-rb" data-r="ch_su"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
            <span class="fm-rlab">CH</span>
            <button type="button" class="fm-rb" data-r="ch_giu"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
          </div>
        </div>

        <div class="fm-riga">
          ${this._tasti.map((x, i) => `<button type="button" class="fm-b" data-cmd="${fhEsc(x.cmd)}" data-i="${i}">
            <ha-icon icon="${fhEsc(x.icona || "mdi:remote")}"></ha-icon>${fhEsc(x.nome)}</button>`).join("")}
        </div>

        <button type="button" class="fm-imp" data-imp>
          <ha-icon icon="mdi:tune-variant"></ha-icon> Tasti e accoppiamento
        </button>
      </div>`;

    // un tocco = un comando
    this.querySelectorAll("[data-k]").forEach(b => {
      b.addEventListener("click", () => this._premi(b.dataset.k));
    });
    // i tasti della fila personalizzabile mandano il comando cosi com'e scritto
    this.querySelectorAll("[data-cmd]").forEach(b => {
      b.addEventListener("click", () => this._mandaCmd(b.dataset.cmd));
    });
    const imp = this.querySelector("[data-imp]");
    if (imp) imp.addEventListener("click", () => this._apriPannello());
    // sorgenti
    this.querySelectorAll("[data-src]").forEach(b => {
      b.addEventListener("click", () => this._cambiaSorgente(b.dataset.src));
    });
    // bilancieri: tenendo premuto ripetono
    this.querySelectorAll("[data-r]").forEach(b => {
      const k = b.dataset.r;
      b.addEventListener("pointerdown", e => { e.preventDefault(); this._ripeti(k); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(ev =>
        b.addEventListener(ev, () => this._stopRipeti()));
    });
  }
}
customElements.define("faber-media", FaberMedia);

// ------------------------------------------------------------------ pannello
// Si apre dalla card, si modifica una BOZZA, e solo il tasto Salva scrive.
// Lo scrim sta agganciato al documento, non alla card: dentro Faber Home la
// card ha il vetro sfocato, che diventerebbe il riferimento dei position:fixed
// e terrebbe il pannello prigioniero nei suoi confini.
FaberMedia.prototype._apriPannello = function () {
  this._bozza = this._tasti.map(x => Object.assign({}, x));
  this._partenza = JSON.stringify(this._bozza);
  if (!this._pop) {
    this._pop = document.createElement("div");
    this._pop.className = "fm-scrim";
    document.body.appendChild(this._pop);
  }
  this._pop.innerHTML = "<style>" + (this.querySelector("style") ? this.querySelector("style").textContent : "") + "</style><div class=\"fm-modal\"></div>";
  this._modal = this._pop.querySelector(".fm-modal");
  this._pop.classList.add("on");
  this._pop.onclick = e => { if (e.target === this._pop) this._chiudiPannello(); };
  this._disegnaPannello();
};

FaberMedia.prototype._chiudiPannello = function () {
  if (this._pop) this._pop.classList.remove("on");
  this._bozza = null;
  this._nuovo = null;
};

FaberMedia.prototype._disegnaPannello = function () {
  const b = this._bozza;
  const cambiato = JSON.stringify(b) !== this._partenza;
  const imparo = this._imparando();
  this._modal.innerHTML = `
    <div class="fm-mh">
      <div class="fm-mt">Tasti e accoppiamento</div>
      <button type="button" class="fm-x" data-chiudi>&times;</button>
    </div>
    <div class="fm-mc">
      <label class="fm-sw">
        <input type="checkbox" data-impara ${imparo ? "checked" : ""}>
        <span>Modalita accoppiamento${imparo ? " — ACCESA" : ""}</span>
      </label>
      <div class="fm-nota${imparo ? " forte" : ""}">
        ${imparo
          ? "Adesso ogni tasto che tocchi qui dentro NON comanda: <b>impara</b>. Punta il telecomando vero verso il Broadlink" + (this._cfg.remote ? "" : " della sala") + " e premi il tasto entro pochi secondi. Poi spegni questa levetta."
          : this._cfg.remote ? "Accendila per insegnare un tasto nuovo: tocca il tasto qui sotto e premi quello vero sul telecomando, puntato verso il Broadlink."
          : "Accendila per insegnare un tasto nuovo: scegli il dispositivo in cima alla card (BOSE, TV, Decoder, FIRE TV), poi tocca il tasto qui sotto e premi quello vero sul telecomando."}
      </div>

      <div class="fm-lab">Tasti della fila <small>nome, icona e comando: il comando e il nome con cui il Broadlink lo ha imparato</small></div>
      ${b.map((x, i) => `
        <div class="fm-riga2">
          <input data-n="${i}" value="${fhEsc(x.nome)}" placeholder="Nome">
          <input data-c="${i}" value="${fhEsc(x.cmd)}" placeholder="Comando">
          <button type="button" class="fm-mini" data-prova="${i}" title="Prova questo tasto">&#9654;</button>
          <button type="button" class="fm-mini" data-su="${i}" ${i === 0 ? "disabled" : ""}>&uarr;</button>
          <button type="button" class="fm-mini" data-giu="${i}" ${i === b.length - 1 ? "disabled" : ""}>&darr;</button>
          <button type="button" class="fm-mini" data-via="${i}">&times;</button>
        </div>`).join("")}
      <button type="button" class="fm-add" data-nuovo>+ Aggiungi un tasto</button>
    </div>
    <div class="fm-mf">
      <button type="button" class="fm-ann" data-chiudi>Annulla</button>
      <button type="button" class="fm-ok2" data-salva ${cambiato ? "" : "disabled"}>${cambiato ? "Salva" : "Nessuna modifica"}</button>
    </div>`;

  const m = this._modal;
  m.querySelectorAll("[data-chiudi]").forEach(x => x.onclick = () => this._chiudiPannello());
  const sw = m.querySelector("[data-impara]");
  if (sw) sw.onchange = e => { this._accendiApprendimento(e.target.checked); setTimeout(() => this._disegnaPannello(), 400); };
  m.querySelectorAll("[data-n]").forEach(x => x.oninput = e => { b[+e.target.dataset.n].nome = e.target.value; this._aggiornaSalva(); });
  m.querySelectorAll("[data-c]").forEach(x => x.oninput = e => { b[+e.target.dataset.c].cmd = e.target.value; this._aggiornaSalva(); });
  m.querySelectorAll("[data-prova]").forEach(x => x.onclick = () => this._mandaCmd(b[+x.dataset.prova].cmd));
  m.querySelectorAll("[data-su]").forEach(x => x.onclick = () => {
    const i = +x.dataset.su; const tmp = b[i]; b[i] = b[i - 1]; b[i - 1] = tmp; this._disegnaPannello();
  });
  m.querySelectorAll("[data-giu]").forEach(x => x.onclick = () => {
    const i = +x.dataset.giu; const tmp = b[i]; b[i] = b[i + 1]; b[i + 1] = tmp; this._disegnaPannello();
  });
  m.querySelectorAll("[data-via]").forEach(x => x.onclick = () => { b.splice(+x.dataset.via, 1); this._disegnaPannello(); });
  const nuovo = m.querySelector("[data-nuovo]");
  if (nuovo) nuovo.onclick = () => { b.push({ nome: "Nuovo", icona: "mdi:remote", cmd: "" }); this._disegnaPannello(); };
  const ok = m.querySelector("[data-salva]");
  if (ok) ok.onclick = () => this._salva();
};

FaberMedia.prototype._aggiornaSalva = function () {
  const ok = this._modal && this._modal.querySelector("[data-salva]");
  if (!ok) return;
  const cambiato = JSON.stringify(this._bozza) !== this._partenza;
  ok.disabled = !cambiato;
  ok.textContent = cambiato ? "Salva" : "Nessuna modifica";
};

FaberMedia.prototype._salva = async function () {
  const puliti = this._bozza.filter(x => (x.nome || "").trim() && (x.cmd || "").trim());
  const ok = this._modal.querySelector("[data-salva]");
  if (ok) { ok.disabled = true; ok.textContent = "Salvo..."; }
  this._gesto = true;
  let fatto = false;
  try { fatto = await this._salvaConfig(puliti); } finally { this._gesto = false; }
  if (fatto) {
    this._tasti = puliti;
    this._cfg.tasti = puliti;
    this._built = false;
    this._render();
    this._chiudiPannello();
  } else if (ok) {
    ok.disabled = false;
    ok.textContent = "Non riesco a salvare";
  }
};

class FaberMediaEditor extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({ title: "Telecomando", selettore: "input_select.remote_type",
      script_tasto: "script.remote_press_button", script_sorgente: "script.remote_changesource",
      extra_nome: "Netflix", mostra_extra: true }, config || {});
    if (this._interno) { this._interno = false; return; }
    this._render();
  }
  set hass(h) { this._hass = h; if (!this._fatto) { this._fatto = true; this._render(); } }
  _emit() {
    this._interno = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true }));
  }
  _render() {
    if (!this._cfg || !this._hass) return;
    const sel = Object.keys(this._hass.states).filter(e => e.startsWith("input_select."));
    const scr = Object.keys(this._hass.states).filter(e => e.startsWith("script."));
    const inp = "padding:9px 10px;border-radius:8px;font-size:14px;width:100%;box-sizing:border-box;" +
      "border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)";
    const opz = (lista, val) => lista.map(e =>
      `<option value="${e}"${e === val ? " selected" : ""}>${fhEsc((this._hass.states[e].attributes.friendly_name) || e)}</option>`).join("");
    this.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;padding:6px 2px;font-family:inherit">
      <label style="font-size:13px;font-weight:600">Titolo</label>
      <input id="fmT" value="${fhEsc(this._cfg.title || "")}" style="${inp}">
      <label style="font-size:13px;font-weight:600">Menu delle sorgenti</label>
      <select id="fmS" style="${inp}">${opz(sel, this._cfg.selettore)}</select>
      <label style="font-size:13px;font-weight:600">Script del tasto premuto</label>
      <select id="fmK" style="${inp}">${opz(scr, this._cfg.script_tasto)}</select>
      <label style="font-size:13px;font-weight:600">Script del cambio sorgente</label>
      <select id="fmC" style="${inp}">${opz(scr, this._cfg.script_sorgente)}</select>
      <label style="font-size:13px;font-weight:600">Tasto grande in fondo</label>
      <input id="fmE" value="${fhEsc(this._cfg.extra_nome || "")}" style="${inp}">
      <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px">
        <input id="fmX" type="checkbox" ${this._cfg.mostra_extra ? "checked" : ""}> Mostra il tasto grande
      </label>
    </div>`;
    const q = id => this.querySelector(id);
    const set = (k, v) => { this._cfg = Object.assign({}, this._cfg, { [k]: v }); this._emit(); };
    q("#fmT").addEventListener("input", e => set("title", e.target.value));
    q("#fmS").addEventListener("change", e => set("selettore", e.target.value));
    q("#fmK").addEventListener("change", e => set("script_tasto", e.target.value));
    q("#fmC").addEventListener("change", e => set("script_sorgente", e.target.value));
    q("#fmE").addEventListener("input", e => set("extra_nome", e.target.value));
    q("#fmX").addEventListener("change", e => set("mostra_extra", e.target.checked));
  }
}
customElements.define("faber-media-editor", FaberMediaEditor);

window.customCards.push({
  type: "faber-media",
  name: "Faber Telecomando",
  description: "Il telecomando di casa: sorgenti, crociera, bilancieri di volume e canali. Manda i comandi agli script che hai gia.",
  preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
});


// ===========================================================================
// FABER CONFIRMATION MODAL (POPUP DI CONFERMA PER CANCELLO E AZIONI CRITICHE)
// ===========================================================================
window.fhConfirmAction = function(opts) {
  const existing = document.querySelector(".fh-conf-scrim");
  if (existing) existing.remove();

  const scrim = document.createElement("div");
  scrim.className = "fh-conf-scrim" + (opts.chiaro ? " chiaro" : "");
  scrim.innerHTML = `
    <style>
      .fh-conf-scrim {
        position: fixed; inset: 0; background: rgba(0,0,0,.68);
        backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
        z-index: 9999999; display: flex; align-items: center; justify-content: center;
        padding: 20px; box-sizing: border-box; animation: fhConfIn .2s ease;
      }
      .fh-conf-box {
        width: 100%; max-width: 360px; border-radius: 24px;
        background: #181d26; border: 1px solid rgba(255,255,255,.15);
        box-shadow: 0 24px 60px rgba(0,0,0,.65); color: #eaf1f8;
        padding: 22px 20px; box-sizing: border-box; display: flex;
        flex-direction: column; gap: 14px; text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      }
      .fh-conf-icon {
        width: 52px; height: 52px; border-radius: 16px; margin: 0 auto;
        background: rgba(255,176,32,.16); color: #ffb020; display: flex;
        align-items: center; justify-content: center; font-size: 28px;
      }
      .fh-conf-title { font-size: 17px; font-weight: 850; letter-spacing: -.01em; }
      .fh-conf-msg { font-size: 13.5px; opacity: .8; line-height: 1.45; }
      .fh-conf-btns { display: flex; gap: 10px; margin-top: 4px; }
      .fh-conf-btn {
        flex: 1; padding: 12px 14px; border-radius: 14px; font: inherit;
        font-size: 13px; font-weight: 850; cursor: pointer; border: none;
        transition: all .18s ease;
      }
      .fh-conf-cancel {
        background: rgba(255,255,255,.08); color: inherit;
        border: 1px solid rgba(255,255,255,.12);
      }
      .fh-conf-cancel:hover { background: rgba(255,255,255,.14); }
      .fh-conf-ok {
        background: linear-gradient(135deg, #ffb020, #e09810); color: #1c1400;
        box-shadow: 0 4px 14px rgba(255,176,32,.35);
      }
      .fh-conf-ok:hover { filter: brightness(1.08); }
      .fh-conf-btn:active { transform: scale(.96); }
      @keyframes fhConfIn { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: scale(1); } }
      /* Sta in document.body, fuori dal pannello: il tema chiaro lo riceve
         come classe sua, perche .fh-app.chiaro qui non arriva. */
      .fh-conf-scrim.chiaro .fh-conf-box { background: #ffffff; color: #12161c; border-color: rgba(15,23,42,.12);
        box-shadow: 0 24px 60px rgba(15,23,42,.25); }
      .fh-conf-scrim.chiaro .fh-conf-cancel { background: rgba(15,23,42,.06); border-color: rgba(15,23,42,.12); }
    </style>
    <div class="fh-conf-box">
      <div class="fh-conf-icon"><ha-icon icon="${opts.icon || 'mdi:alert-circle-outline'}"></ha-icon></div>
      <div class="fh-conf-title">${fhEsc(opts.title || "Conferma")}</div>
      <div class="fh-conf-msg">${fhEsc(opts.message || "Sei sicuro?")}</div>
      <div class="fh-conf-btns">
        <button type="button" class="fh-conf-btn fh-conf-cancel" id="fhConfCancel">${fhEsc(opts.cancelText || "Annulla")}</button>
        <button type="button" class="fh-conf-btn fh-conf-ok" id="fhConfOk">${fhEsc(opts.confirmText || "Conferma")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(scrim);

  const close = () => scrim.remove();
  scrim.querySelector("#fhConfCancel").onclick = close;
  scrim.onclick = (e) => { if (e.target === scrim) close(); };
  scrim.querySelector("#fhConfOk").onclick = () => {
    close();
    if (opts.onConfirm) opts.onConfirm();
  };
};

// ===========================================================================
// FABER CANCELLO (CARD VERTICALE CONFERMATA CON TIMER ANIMATO)
// ===========================================================================
const FGC_CSS = `
  .fg-card{position:relative;overflow:hidden;border-radius:24px;padding:14px 14px 12px;
    background:rgba(16,22,34,.78);border:1px solid rgba(255,255,255,.10);
    backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);
    color:#eaf1f8;box-shadow:0 10px 28px rgba(0,0,0,.3);transition:all .25s ease;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    display:flex;flex-direction:column;justify-content:space-between;min-height:142px;
    box-sizing:border-box;user-select:none}
  .fh-app.chiaro .fg-card{background:rgba(255,255,255,.78);border-color:rgba(15,23,42,.1);
    color:#12161c;box-shadow:0 10px 28px rgba(20,26,40,.1)}
  .fg-card.moving{border-color:rgba(74,222,128,.6);box-shadow:0 0 24px rgba(74,222,128,.35)}
  .fg-top{display:flex;align-items:center;justify-content:space-between;width:100%}
  .fg-icon{width:42px;height:42px;border-radius:14px;background:rgba(255,176,32,.14);
    color:#ffb020;display:flex;align-items:center;justify-content:center;font-size:22px;transition:all .2s ease}
  .fg-card.moving .fg-icon{background:rgba(74,222,128,.2);color:#4ade80;animation:fgPulse 1.2s infinite ease-in-out}
  .fg-ped-btn{display:flex;align-items:center;gap:4px;padding:5px 9px;border-radius:10px;
    border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:inherit;
    font:inherit;font-size:11px;font-weight:800;cursor:pointer;transition:all .18s ease}
  .fg-ped-btn:hover{background:rgba(255,176,32,.15);border-color:rgba(255,176,32,.35)}
  .fg-ped-btn:active{transform:scale(.95)}
  .fg-ped-btn ha-icon{--mdc-icon-size:15px;color:#ffb020}
  .fg-center{display:flex;flex-direction:column;gap:2px;margin:6px 0}
  .fg-title{font-size:15px;font-weight:850;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fg-sub{font-size:11.5px;font-weight:600;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fg-card.moving .fg-sub{color:#4ade80;font-weight:800;opacity:1}
  .fg-btn-act{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;
    padding:9px 12px;border-radius:14px;border:none;font:inherit;font-size:12px;font-weight:850;
    letter-spacing:.02em;cursor:pointer;box-sizing:border-box;transition:all .18s ease;
    background:linear-gradient(135deg,#ffb020,#e09810);color:#1c1400;box-shadow:0 4px 14px rgba(255,176,32,.35)}
  .fg-card.moving .fg-btn-act{background:linear-gradient(135deg,#4ade80,#22c55e);color:#052e16;
    box-shadow:0 4px 14px rgba(74,222,128,.45)}
  .fg-btn-act:hover{filter:brightness(1.08)}
  .fg-btn-act:active{transform:scale(.97)}
  .fg-btn-act ha-icon{--mdc-icon-size:16px}
  @keyframes fgPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.04);opacity:.85}}
`;

class FaberCancello extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-cancello-editor"); }
  setConfig(config) {
    this._cfg = Object.assign({
      name: "Cancello",
      gate_button: "button.pulsante_cancello",
      gate_script: "script.apri_cancello_timer",
      timer: "timer.timer_cancello",
      pedestrian_button: "button.cancelletto_open_door",
      pedestrian_battery: "sensor.cancelletto_batteria"
    }, config || {});
    this._built = false;
  }
  set hass(hass) {
    this._hass = hass;
    this._update();
  }
  getCardSize() { return 1; }
  static getStubConfig() { return { type: "custom:faber-cancello", name: "Cancello" }; }

  _update() {
    if (!this._hass) return;
    const tEnt = this._cfg.timer;
    const tState = this._hass.states[tEnt];
    const isMoving = tState && tState.state === "active";
    const pBatEnt = this._cfg.pedestrian_battery;
    const pBatState = pBatEnt && this._hass.states[pBatEnt] ? this._hass.states[pBatEnt].state : null;

    if (!this._built) {
      this._built = true;
      this.innerHTML = `
        <style>${FGC_CSS}</style>
        <div class="fg-card" data-card>
          <div class="fg-top">
            <div class="fg-icon" data-icon>
              <ha-icon icon="${isMoving ? 'mdi:gate-open' : 'mdi:gate'}"></ha-icon>
            </div>
            <button type="button" class="fg-ped-btn" data-act="ped" title="Cancelletto Pedonale">
              <ha-icon icon="mdi:door-open"></ha-icon>
              <span>${pBatState ? (pBatState + "%") : "Ped."}</span>
            </button>
          </div>
          <div class="fg-center">
            <div class="fg-title">${fhEsc(this._cfg.name || "Cancello")}</div>
            <div class="fg-sub" data-sub>${isMoving ? "In movimento..." : "Pronto"}</div>
          </div>
          <button type="button" class="fg-btn-act" data-act="main">
            <ha-icon icon="${isMoving ? 'mdi:progress-clock' : 'mdi:play'}"></ha-icon>
            <span data-btn-label>${isMoving ? "In Moto" : "Apri"}</span>
          </button>
        </div>`;

      const q = s => this.querySelector(s);
      const bMain = q('[data-act="main"]');
      // Aziona il cancello con lo script SCELTO nella configurazione (prima
      // il nome era scritto fisso e l'impostazione non contava), oppure col
      // pulsante. Poi fa partire il timer: e lui che fa dire alla card "in
      // movimento", e nessuna automazione di casa lo avviava — la card
      // restava sempre su "Pronto".
      const aziona = () => {
        const h = this._hass;
        const scr = this._cfg.gate_script;
        if (scr && h.states[scr]) h.callService("script", "turn_on", { entity_id: scr });
        else if (this._cfg.gate_button) h.callService("button", "press", { entity_id: this._cfg.gate_button });
        else return;
        const tm = this._cfg.timer;
        if (tm && h.states[tm] && h.states[tm].state !== "active") h.callService("timer", "start", { entity_id: tm });
      };
      if (bMain) {
        bMain.onclick = () => {
          fhVibra(10);
          if (window.fhConfirmAction) {
            window.fhConfirmAction({
              title: "Apertura Cancello",
              message: "Vuoi davvero azionare il cancello carrabile? 🚧",
              icon: "mdi:gate",
              confirmText: "Aziona Cancello",
              cancelText: "Annulla",
              chiaro: !!this.closest(".fh-app.chiaro"),
              onConfirm: () => { fhVibra(15); aziona(); }
            });
          } else aziona();
        };
      }
      const bPed = q('[data-act="ped"]');
      if (bPed) {
        bPed.onclick = () => {
          fhVibra(8);
          if (window.fhConfirmAction) {
            window.fhConfirmAction({
              title: "Cancelletto Pedonale",
              message: "Vuoi aprire il cancelletto pedonale? 🚪",
              icon: "mdi:door-open",
              confirmText: "Apri Pedonale",
              cancelText: "Annulla",
              chiaro: !!this.closest(".fh-app.chiaro"),
              onConfirm: () => {
                fhVibra(12);
                if (this._cfg.pedestrian_button) {
                  this._hass.callService("button", "press", { entity_id: this._cfg.pedestrian_button });
                }
              }
            });
          } else {
            if (this._cfg.pedestrian_button) {
              this._hass.callService("button", "press", { entity_id: this._cfg.pedestrian_button });
            }
          }
        };
      }
    }

    const card = this.querySelector("[data-card]");
    if (card) card.classList.toggle("moving", !!isMoving);
    const sub = this.querySelector("[data-sub]");
    if (sub) sub.textContent = isMoving ? "In movimento..." : "Pronto";
    const btnLabel = this.querySelector("[data-btn-label]");
    if (btnLabel) btnLabel.textContent = isMoving ? "In Moto" : "Apri";
    const iconEl = this.querySelector("[data-icon] ha-icon");
    if (iconEl) iconEl.setAttribute("icon", isMoving ? "mdi:gate-open" : "mdi:gate");
  }
}
customElements.define("faber-cancello", FaberCancello);

// ===========================================================================
// FABER FUORI CASA — accende e spegne l'automazione "fuori casa"
// La card legge le condizioni DALL'AUTOMAZIONE STESSA (sensori Wi-Fi, rete di
// casa, gruppo della famiglia, allarme, porta, prese): e lei la fonte della
// verita. La vecchia card della plancia telefono aveva i sensori scritti a
// mano e uno non esisteva piu (s22_ultra_eva): diceva "tutti fuori" con Eva
// in casa sul Wi-Fi. Qui non puo succedere, perche i nomi non li scrive
// nessuno. Se l'utente non puo leggere le automazioni (non amministratore) la
// card mostra solo acceso/spento e la famiglia; tutto si puo anche forzare
// in configurazione (presenza, wifi, ssid_casa, allarme).
// ===========================================================================
const FFC_CSS = `
  faber-fuoricasa{display:block}
  .ffc-card{position:relative;overflow:hidden;border-radius:24px;padding:14px 14px 12px;
    background-color:rgba(16,22,34,.78);border:1px solid rgba(255,255,255,.10);
    backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);
    color:#eaf1f8;box-shadow:0 10px 28px rgba(0,0,0,.3);transition:background .35s ease,border-color .35s ease;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-height:142px;
    box-sizing:border-box;user-select:none;cursor:pointer;
    --ffc-c:#93a1b0;--ffc-t:rgba(147,161,176,0)}
  .fh-app.chiaro .ffc-card{background-color:rgba(255,255,255,.78);border-color:rgba(15,23,42,.1);
    color:#12161c;box-shadow:0 10px 28px rgba(20,26,40,.1)}
  /* E la card a colorarsi del suo stato: la tinta si SOVRAPPONE al fondo,
     non lo sostituisce, cosi resta leggibile sia sul cielo scuro sia sul chiaro. */
  .ffc-card{background-image:linear-gradient(150deg,var(--ffc-t),transparent 75%)}
  .ffc-card[data-tono="ambra"]{--ffc-c:#ffb020;--ffc-t:rgba(255,176,32,.20);border-color:rgba(255,176,32,.40)}
  .ffc-card[data-tono="verde"]{--ffc-c:#4ade80;--ffc-t:rgba(74,222,128,.24);border-color:rgba(74,222,128,.50)}
  .ffc-card[data-tono="arancio"]{--ffc-c:#ff8a3d;--ffc-t:rgba(255,138,61,.24);border-color:rgba(255,138,61,.55)}
  .ffc-card[data-tono="grigio"]{--ffc-c:#93a1b0}
  .fh-app.chiaro .ffc-card[data-tono="ambra"]{--ffc-c:#b37000}
  .fh-app.chiaro .ffc-card[data-tono="verde"]{--ffc-c:#15803d}
  .fh-app.chiaro .ffc-card[data-tono="arancio"]{--ffc-c:#c2410c}
  .ffc-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .ffc-icon{width:42px;height:42px;border-radius:14px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
    color:var(--ffc-c);background:color-mix(in srgb,var(--ffc-c) 16%,transparent);transition:color .3s,background .3s}
  .ffc-icon ha-icon{--mdc-icon-size:24px}
  .ffc-card[data-tono="verde"] .ffc-icon{animation:ffcRespira 3.2s ease-in-out infinite}
  .ffc-pill{padding:4px 9px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.05em;
    color:var(--ffc-c);background:color-mix(in srgb,var(--ffc-c) 16%,transparent)}
  .ffc-testo{display:flex;flex-direction:column;gap:2px;min-width:0}
  .ffc-title{font-size:15px;font-weight:850;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ffc-stato{font-size:12.5px;font-weight:850;color:var(--ffc-c)}
  .ffc-sub{font-size:11px;font-weight:600;opacity:.72;line-height:1.25;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .ffc-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:9px 12px;border-radius:14px;
    border:1px solid transparent;font:inherit;font-size:12px;font-weight:850;letter-spacing:.02em;cursor:pointer;
    box-sizing:border-box;transition:filter .15s,transform .12s}
  .ffc-btn ha-icon{--mdc-icon-size:16px}
  .ffc-btn.accendi{background:linear-gradient(135deg,#ffb020,#e09810);color:#1c1400;box-shadow:0 4px 14px rgba(255,176,32,.35)}
  .ffc-btn.spegni{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14);color:inherit}
  .fh-app.chiaro .ffc-btn.spegni{background:rgba(15,23,42,.06);border-color:rgba(15,23,42,.12)}
  .ffc-btn:active{transform:scale(.97)}
  .ffc-btn:disabled{opacity:.5;cursor:default}
  .ffc-cond{display:none;flex-wrap:wrap;gap:6px}
  .ffc-c{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:9px;font-size:10.5px;font-weight:750;
    background:rgba(255,255,255,.07);white-space:nowrap}
  .fh-app.chiaro .ffc-c{background:rgba(15,23,42,.06)}
  .ffc-c ha-icon{--mdc-icon-size:13px;opacity:.8}
  .ffc-c.ok ha-icon{color:#4ade80}.ffc-c.no ha-icon{color:#ff8a3d}
  /* LARGA: su una riga intera la card si stende in orizzontale e mostra anche
     le condizioni, che stretta non ci stanno. Misurata con un osservatore e
     non con container-type, che chiuderebbe i popup dentro la card. */
  .ffc-card.largo{display:grid;grid-template-columns:auto 1fr auto;grid-template-areas:"icona testo bottone" "cond cond cond";
    align-items:center;column-gap:12px;row-gap:10px;min-height:0;padding:14px 16px}
  .ffc-card.largo .ffc-top{display:contents}
  .ffc-card.largo .ffc-icon{grid-area:icona;width:48px;height:48px}
  .ffc-card.largo .ffc-pill{display:none}
  .ffc-card.largo .ffc-testo{grid-area:testo}
  .ffc-card.largo .ffc-btn{grid-area:bottone;width:auto;padding:10px 16px}
  .ffc-card.largo .ffc-cond{grid-area:cond;display:flex}
  @keyframes ffcRespira{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.0)}50%{box-shadow:0 0 0 6px rgba(74,222,128,.14)}}
  @media (prefers-reduced-motion:reduce){.ffc-card[data-tono="verde"] .ffc-icon{animation:none}}

  /* Il dettaglio: sta in document.body, quindi il tema chiaro arriva come classe sua. */
  .ffc-scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    z-index:999999;display:flex;align-items:flex-end;justify-content:center;animation:ffcIn .2s ease}
  .ffc-sheet{width:100%;max-width:520px;max-height:86vh;overflow-y:auto;box-sizing:border-box;padding:18px 18px calc(22px + env(safe-area-inset-bottom,0px));
    border-radius:26px 26px 0 0;background:#161c26;color:#eaf1f8;border:1px solid rgba(255,255,255,.14);border-bottom:none;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;display:flex;flex-direction:column;gap:14px}
  .ffc-scrim.chiaro .ffc-sheet{background:#fff;color:#12161c;border-color:rgba(15,23,42,.12)}
  .ffc-sh-head{display:flex;align-items:center;gap:10px}
  .ffc-sh-head b{flex:1;font-size:17px;font-weight:900}
  .ffc-x{width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.1);color:inherit;font-size:14px;cursor:pointer}
  .ffc-scrim.chiaro .ffc-x{background:rgba(15,23,42,.07)}
  .ffc-sez{display:flex;flex-direction:column;gap:6px}
  .ffc-sez h4{margin:0;font-size:10.5px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;opacity:.6}
  .ffc-riga{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:13px;background:rgba(255,255,255,.05);font-size:13px}
  .ffc-scrim.chiaro .ffc-riga{background:rgba(15,23,42,.04)}
  .ffc-riga ha-icon{--mdc-icon-size:18px;opacity:.8;flex:0 0 auto}
  .ffc-riga span{flex:1;min-width:0}
  .ffc-riga i{font-style:normal;font-weight:800;text-align:right}
  .ffc-riga i.ok{color:#4ade80}.ffc-riga i.no{color:#ff8a3d}
  .ffc-scrim.chiaro .ffc-riga i.ok{color:#15803d}.ffc-scrim.chiaro .ffc-riga i.no{color:#c2410c}
  .ffc-nota{font-size:11.5px;opacity:.65;line-height:1.4}
  @keyframes ffcIn{from{opacity:0}to{opacity:1}}
`;

class FaberFuoriCasa extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-fuoricasa-editor"); }
  setConfig(config) {
    this._cfg = Object.assign({ name: "Fuori casa", entity: "" }, config || {});
    this._built = false;
    this._auto = null;
    this._alias = null;
  }
  static getStubConfig(hass) {
    const s = hass && hass.states ? hass.states : {};
    const trovata = Object.keys(s).find(e => e.startsWith("automation.") &&
      /fuori[\s_]*casa/i.test(e + " " + (s[e].attributes.friendly_name || "")));
    return { type: "custom:faber-fuoricasa", name: "Fuori casa", entity: trovata || "" };
  }
  getCardSize() { return 2; }

  connectedCallback() {
    if (!this._ro && window.ResizeObserver) {
      this._ro = new ResizeObserver(() => {
        const c = this.querySelector("[data-card]");
        if (c) c.classList.toggle("largo", this.clientWidth >= 330);
      });
      this._ro.observe(this);
    }
  }
  disconnectedCallback() {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  }

  set hass(hass) {
    this._hass = hass;
    this._leggiAutomazione();
    this._update();
  }

  _entita() {
    if (this._cfg.entity) return this._cfg.entity;
    return FaberFuoriCasa.getStubConfig(this._hass).entity;
  }

  // Legge la configurazione vera dell'automazione e ne ricava cosa guarda e
  // cosa fa. Si rilegge quando cambia il nome (le versioni V6.3, V6.4...).
  async _leggiAutomazione() {
    const h = this._hass;
    const st = h && h.states[this._entita()];
    if (!st || this._leggendo) return;
    const alias = st.attributes.friendly_name || "";
    if (this._auto && this._alias === alias) return;
    this._leggendo = true;
    this._alias = alias;
    const a = { presenza: "", per: 0, wifi: [], ssid: "", allarme: "", porta: "", prese: [], avvisi: 0 };
    try {
      const cfg = await h.callApi("get", "config/automation/config/" + st.attributes.id);
      const cond = JSON.stringify(cfg.conditions || cfg.condition || []);
      const tutto = JSON.stringify(cfg);
      const trig = [].concat(cfg.triggers || cfg.trigger || []);
      const tp = trig.find(t => typeof t.entity_id === "string" && /^(group|person|zone)\./.test(t.entity_id));
      if (tp) {
        a.presenza = tp.entity_id;
        const f = tp.for || {};
        a.per = (Number(f.hours) || 0) * 3600 + (Number(f.minutes) || 0) * 60 + (Number(f.seconds) || 0);
      }
      a.wifi = [...new Set(cond.match(/sensor\.[a-z0-9_]*wi_?fi[a-z0-9_]*/g) || [])];
      a.ssid = (cond.match(/!=\s*'([^']+)'/) || [])[1] || "";
      a.allarme = (tutto.match(/alarm_control_panel\.[a-z0-9_]+/) || [])[0] || "";
      a.porta = (tutto.match(/lock\.[a-z0-9_]+/) || [])[0] || "";
      const gira = v => {
        if (Array.isArray(v)) { v.forEach(gira); return; }
        if (!v || typeof v !== "object") return;
        const az = v.action || v.service;
        if (az === "switch.turn_off") {
          const t = (v.target && v.target.entity_id) || v.entity_id || (v.data && v.data.entity_id);
          [].concat(t || []).forEach(e => { if (!a.prese.includes(e)) a.prese.push(e); });
        }
        if (typeof az === "string" && az.startsWith("notify.")) a.avvisi++;
        Object.keys(v).forEach(k => gira(v[k]));
      };
      gira(cfg.actions || cfg.action || []);
    } catch (e) {
      // Non amministratore o automazione in YAML: si resta su acceso/spento.
    }
    this._auto = a;
    this._leggendo = false;
    this._update();
  }

  // Cosa guardare: prima la configurazione della card, poi l'automazione.
  _regole() {
    const a = this._auto || {};
    const c = this._cfg;
    const lista = v => Array.isArray(v) ? v : String(v || "").split(",").map(x => x.trim()).filter(Boolean);
    return {
      presenza: c.presenza || a.presenza || "",
      wifi: c.wifi ? lista(c.wifi) : (a.wifi || []),
      ssid: c.ssid_casa || a.ssid || "",
      allarme: c.allarme || a.allarme || "",
      porta: a.porta || "", prese: a.prese || [], avvisi: a.avvisi || 0, per: a.per || 0,
    };
  }

  // Il nome di chi porta quel telefono: dal sensore si risale al dispositivo,
  // e dal dispositivo alla persona che lo usa come localizzatore.
  _chiTelefono(sensore) {
    const h = this._hass;
    const reg = h.entities || {};
    const dev = (reg[sensore] || {}).device_id;
    if (dev) {
      for (const id of Object.keys(h.states)) {
        if (!id.startsWith("person.")) continue;
        const p = h.states[id];
        if ((p.attributes.device_trackers || []).some(dt => (reg[dt] || {}).device_id === dev))
          return p.attributes.friendly_name || id;
      }
      const d = (h.devices || {})[dev];
      if (d) return d.name_by_user || d.name;
    }
    const st = h.states[sensore];
    return (st && st.attributes.friendly_name) || sensore;
  }

  _situazione() {
    const h = this._hass;
    const st = h.states[this._entita()];
    if (!st) return { tono: "grigio", pill: "?", icona: "mdi:shield-off-outline", stato: "Automazione non trovata",
      sub: "Scegli l'automazione nella configurazione della card.", on: false, cond: [] };
    const r = this._regole();
    const on = st.state === "on";
    const pres = r.presenza && h.states[r.presenza];
    const fuori = pres ? pres.state !== "home" : null;
    const telefoni = r.wifi.map(w => {
      const s = h.states[w];
      const v = s ? s.state : "";
      const letto = s && !["unknown", "unavailable", ""].includes(v);
      return { w, chi: this._chiTelefono(w), rete: v, letto, aCasa: letto && !!r.ssid && v === r.ssid };
    });
    const allarme = r.allarme && h.states[r.allarme];
    const inserito = !!allarme && String(allarme.state).startsWith("armed");
    const cond = [];
    if (pres) cond.push({ ok: fuori, icona: fuori ? "mdi:account-arrow-right" : "mdi:home-account",
      testo: fuori ? "Famiglia fuori" : "Famiglia a casa" });
    telefoni.forEach(t => cond.push({ ok: t.letto && !t.aCasa, icona: t.aCasa ? "mdi:wifi" : (t.letto ? "mdi:wifi-off" : "mdi:wifi-alert"),
      testo: t.chi + ": " + (!t.letto ? "Wi-Fi non letto" : t.aCasa ? "Wi-Fi di casa" : "fuori") }));
    if (allarme) cond.push({ ok: inserito, icona: inserito ? "mdi:shield-lock" : "mdi:shield-outline",
      testo: "Allarme " + (inserito ? "inserito" : "disinserito") });

    const base = { on, cond, telefoni, fuori, inserito, pill: on ? "ATTIVA" : "SPENTA" };
    if (!on) return Object.assign(base, { tono: "grigio", icona: "mdi:shield-off-outline", stato: "Spenta",
      sub: "Uscendo non si chiude niente e l'allarme non si arma da solo." });
    if (fuori === false || fuori === null) return Object.assign(base, { tono: "ambra", icona: "mdi:shield-home",
      stato: "Pronta", sub: "Scatta da sola quando uscite tutti." });
    // Allarme inserito e famiglia fuori: la casa e chiusa, qualunque cosa dica un telefono.
    if (inserito) return Object.assign(base, { tono: "verde", icona: "mdi:shield-lock", stato: "Casa protetta",
      sub: "Tutti fuori, allarme inserito." });
    const aCasa = telefoni.filter(t => t.aCasa).map(t => t.chi);
    if (aCasa.length) return Object.assign(base, { tono: "arancio", icona: "mdi:shield-alert",
      stato: "Uscita parziale", sub: aCasa.join(" e ") + (aCasa.length > 1 ? " sono" : " è") + " ancora sul Wi-Fi di casa." });
    const nonLetti = telefoni.filter(t => !t.letto).map(t => t.chi);
    if (nonLetti.length) return Object.assign(base, { tono: "arancio", icona: "mdi:shield-alert",
      stato: "Non scatta", sub: "Il Wi-Fi di " + nonLetti.join(" e ") + " non si legge: l'automazione aspetta." });
    if (Number(st.attributes.current) > 0) return Object.assign(base, { tono: "verde", icona: "mdi:shield-sync",
      stato: "Sta chiudendo casa", sub: "Porta, prese e allarme in corso." });
    return Object.assign(base, { tono: "arancio", icona: "mdi:shield-alert", stato: "Tutti fuori",
      sub: allarme ? "Ma l'allarme non è inserito." : "Siete tutti fuori casa." });
  }

  _update() {
    const h = this._hass;
    if (!h) return;
    const s = this._situazione();
    if (!this._built) {
      this._built = true;
      this.innerHTML = `<style>${FFC_CSS}</style>
        <div class="ffc-card" data-card>
          <div class="ffc-top">
            <div class="ffc-icon"><ha-icon data-icona></ha-icon></div>
            <span class="ffc-pill" data-pill></span>
          </div>
          <div class="ffc-testo">
            <div class="ffc-title">${fhEsc(this._cfg.name || "Fuori casa")}</div>
            <div class="ffc-stato" data-stato></div>
            <div class="ffc-sub" data-sub></div>
          </div>
          <button type="button" class="ffc-btn" data-btn><ha-icon data-btnicona></ha-icon><span data-btntesto></span></button>
          <div class="ffc-cond" data-cond></div>
        </div>`;
      const card = this.querySelector("[data-card]");
      card.classList.toggle("largo", this.clientWidth >= 330);
      card.addEventListener("click", e => {
        if (e.target.closest("[data-btn]")) return;
        fhVibra(8);
        this._dettaglio();
      });
      this.querySelector("[data-btn]").addEventListener("click", e => {
        e.stopPropagation();
        this._premi();
      });
    }
    const q = sel => this.querySelector(sel);
    const card = q("[data-card]");
    if (card.dataset.tono !== s.tono) card.dataset.tono = s.tono;
    const metti = (sel, t) => { const el = q(sel); if (el && el.textContent !== t) el.textContent = t; };
    metti("[data-pill]", s.pill);
    metti("[data-stato]", s.stato);
    metti("[data-sub]", s.sub);
    const ic = q("[data-icona]");
    if (ic.getAttribute("icon") !== s.icona) ic.setAttribute("icon", s.icona);
    const btn = q("[data-btn]");
    btn.className = "ffc-btn " + (s.on ? "spegni" : "accendi");
    btn.disabled = !h.states[this._entita()];
    metti("[data-btntesto]", s.on ? "Disattiva" : "Attiva");
    const bi = q("[data-btnicona]");
    const bIcon = s.on ? "mdi:shield-off-outline" : "mdi:shield-check";
    if (bi.getAttribute("icon") !== bIcon) bi.setAttribute("icon", bIcon);
    // Le condizioni si ridisegnano solo se sono cambiate: la card riceve lo
    // stato di tutta la casa molte volte al secondo.
    const condHTML = s.cond.map(c => `<span class="ffc-c ${c.ok ? "ok" : "no"}"><ha-icon icon="${c.icona}"></ha-icon>${fhEsc(c.testo)}</span>`).join("");
    if (this._condHTML !== condHTML) { this._condHTML = condHTML; q("[data-cond]").innerHTML = condHTML; }
  }

  // Il servizio si decide AL MOMENTO del tocco, dallo stato vero. Nella card
  // di Antigravity era deciso una volta sola alla nascita della card: dopo il
  // primo cambio il tasto mandava sempre lo stesso comando.
  _premi() {
    const h = this._hass;
    const ent = this._entita();
    const st = h && h.states[ent];
    if (!st) return;
    const accesa = st.state === "on";
    const fai = () => { fhVibra(12); h.callService("automation", accesa ? "turn_off" : "turn_on", { entity_id: ent }); };
    if (!accesa) { fai(); return; }
    // Spegnere toglie una protezione: si chiede. Accendere no.
    if (window.fhConfirmAction) window.fhConfirmAction({
      title: "Disattivare Fuori casa?",
      message: "Uscendo non si chiuderà la porta, non si spegneranno le prese e l'allarme non si armerà da solo.",
      icon: "mdi:shield-off-outline", confirmText: "Disattiva", cancelText: "Annulla",
      chiaro: !!this.closest(".fh-app.chiaro"), onConfirm: fai,
    });
    else fai();
  }

  _quando(iso) {
    if (!iso) return "mai";
    const d = new Date(iso);
    if (isNaN(d)) return "mai";
    const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
    const giorno = new Date(d); giorno.setHours(0, 0, 0, 0);
    const diff = Math.round((oggi - giorno) / 86400000);
    if (diff === 0) return "oggi alle " + ora;
    if (diff === 1) return "ieri alle " + ora;
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "long" }) + " alle " + ora;
  }

  _dettaglio() {
    const h = this._hass;
    const ent = this._entita();
    const st = h.states[ent];
    if (!st) return;
    const s = this._situazione();
    const r = this._regole();
    const nome = e => { const x = h.states[e]; return (x && x.attributes.friendly_name) || e; };
    const riga = (icona, testo, valore, ok) => `<div class="ffc-riga"><ha-icon icon="${icona}"></ha-icon>
      <span>${fhEsc(testo)}</span>${valore != null ? `<i class="${ok === true ? "ok" : ok === false ? "no" : ""}">${fhEsc(valore)}</i>` : ""}</div>`;
    const quando = [];
    if (r.presenza) quando.push(riga("mdi:account-group", "Tutti fuori" + (r.per ? " da " + r.per + " secondi" : ""), null));
    if (r.allarme) quando.push(riga("mdi:shield-outline", "Allarme ancora disinserito", null));
    if (r.wifi.length) quando.push(riga("mdi:wifi-off", "Nessun telefono sul Wi-Fi" + (r.ssid ? " «" + r.ssid + "»" : " di casa"), null));
    const fa = [];
    if (r.porta) fa.push(riga("mdi:lock", "Chiude " + nome(r.porta), null));
    if (r.prese.length) fa.push(riga("mdi:power-socket-eu", "Spegne " + r.prese.length + (r.prese.length === 1 ? " presa" : " prese") + ": " + r.prese.map(nome).join(", "), null));
    if (r.allarme) fa.push(riga("mdi:shield-lock", "Arma " + nome(r.allarme), null));
    if (r.avvisi) fa.push(riga("mdi:cellphone-message", "Avvisa sul telefono", null));
    const adesso = s.cond.map(c => riga(c.icona, c.testo, c.ok ? "ok" : "no", !!c.ok));

    document.querySelectorAll(".ffc-scrim").forEach(x => x.remove());
    const scrim = document.createElement("div");
    scrim.className = "ffc-scrim" + (this.closest(".fh-app.chiaro") ? " chiaro" : "");
    scrim.innerHTML = `<style>${FFC_CSS}</style>
      <div class="ffc-sheet">
        <div class="ffc-sh-head"><b>${fhEsc(this._cfg.name || "Fuori casa")} · ${fhEsc(s.stato)}</b>
          <button type="button" class="ffc-x" data-x>✕</button></div>
        <div class="ffc-sez"><h4>Adesso</h4>
          ${riga(s.on ? "mdi:shield-check" : "mdi:shield-off-outline", "Automazione", s.on ? "attiva" : "spenta", s.on)}
          ${adesso.join("")}
          ${riga("mdi:history", "Ultima volta scattata", this._quando(st.attributes.last_triggered))}
        </div>
        ${quando.length ? `<div class="ffc-sez"><h4>Scatta quando</h4>${quando.join("")}</div>` : ""}
        ${fa.length ? `<div class="ffc-sez"><h4>Cosa fa</h4>${fa.join("")}</div>` : ""}
        ${!this._auto || (!r.presenza && !r.wifi.length) ? `<div class="ffc-nota">Le regole si leggono dall'automazione: serve un utente amministratore.</div>` : ""}
      </div>`;
    document.body.appendChild(scrim);
    const chiudi = () => scrim.remove();
    scrim.addEventListener("click", e => { if (e.target === scrim) chiudi(); });
    scrim.querySelector("[data-x]").addEventListener("click", chiudi);
  }
}
customElements.define("faber-fuoricasa", FaberFuoriCasa);

// ===========================================================================
// PEZZI COMUNI DELLE CARD PORTATE DALLA PLANCIA TELEFONO (0.101.0)
// Stessa famiglia del cancello e della spesa: tessera verticale che si colora
// del suo stato, e il dettaglio in un foglio che sale dal basso.
// ===========================================================================
const FHT_CSS = `
  faber-automazioni,faber-rifiuti,faber-robot,faber-player,faber-pulsantiera,faber-manuali{display:block}
  .fht{position:relative;overflow:hidden;border-radius:24px;padding:14px 14px 12px;
    background-color:rgba(16,22,34,.78);border:1px solid rgba(255,255,255,.10);
    backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);
    color:#eaf1f8;box-shadow:0 10px 28px rgba(0,0,0,.3);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    display:flex;flex-direction:column;gap:6px;min-height:142px;box-sizing:border-box;user-select:none;
    --t-c:#93a1b0;--t-t:rgba(147,161,176,0);
    background-image:linear-gradient(150deg,var(--t-t),transparent 75%);transition:background-color .35s,border-color .35s}
  .fh-app.chiaro .fht{background-color:rgba(255,255,255,.78);border-color:rgba(15,23,42,.1);color:#12161c;
    box-shadow:0 10px 28px rgba(20,26,40,.1)}
  .fht.tap{cursor:pointer}
  .fht[data-tono="ambra"]{--t-c:#ffb020;--t-t:rgba(255,176,32,.20);border-color:rgba(255,176,32,.40)}
  .fht[data-tono="verde"]{--t-c:#4ade80;--t-t:rgba(74,222,128,.22);border-color:rgba(74,222,128,.45)}
  .fht[data-tono="arancio"]{--t-c:#ff8a3d;--t-t:rgba(255,138,61,.24);border-color:rgba(255,138,61,.55)}
  .fht[data-tono="rosso"]{--t-c:#ff5c5c;--t-t:rgba(255,92,92,.24);border-color:rgba(255,92,92,.55)}
  .fht[data-tono="blu"]{--t-c:#5aa9ff;--t-t:rgba(90,169,255,.20);border-color:rgba(90,169,255,.40)}
  .fh-app.chiaro .fht[data-tono="ambra"]{--t-c:#b37000}
  .fh-app.chiaro .fht[data-tono="verde"]{--t-c:#15803d}
  .fh-app.chiaro .fht[data-tono="arancio"]{--t-c:#c2410c}
  .fh-app.chiaro .fht[data-tono="rosso"]{--t-c:#c62828}
  .fh-app.chiaro .fht[data-tono="blu"]{--t-c:#1d6fd1}
  .fht-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .fht-ic{width:42px;height:42px;border-radius:14px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
    color:var(--t-c);background:color-mix(in srgb,var(--t-c) 16%,transparent)}
  .fht-ic ha-icon{--mdc-icon-size:24px}
  .fht-pill{padding:4px 9px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.05em;white-space:nowrap;
    color:var(--t-c);background:color-mix(in srgb,var(--t-c) 16%,transparent);display:inline-flex;align-items:center;gap:3px}
  .fht-pill ha-icon{--mdc-icon-size:13px}
  .fht-pill[hidden]{display:none}
  .fht-testo{display:flex;flex-direction:column;gap:2px;min-width:0}
  .fht-title{font-size:15px;font-weight:850;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fht-stato{font-size:12.5px;font-weight:850;color:var(--t-c)}
  .fht-sub{font-size:11px;font-weight:600;opacity:.72;line-height:1.25;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .fht-btns{display:flex;gap:6px;margin-top:auto}
  .fht-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 6px;border-radius:13px;
    border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:inherit;font:inherit;font-size:11.5px;
    font-weight:850;cursor:pointer;box-sizing:border-box;transition:transform .12s,filter .15s;min-width:0}
  .fh-app.chiaro .fht-btn{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.12)}
  .fht-btn.pieno{background:linear-gradient(135deg,#ffb020,#e09810);border-color:transparent;color:#1c1400;
    box-shadow:0 4px 14px rgba(255,176,32,.32)}
  /* Il tasto principale resta ambra anche di giorno: la regola del tema
     chiaro qui sopra e piu specifica e lo faceva diventare grigio. */
  .fh-app.chiaro .fht-btn.pieno{background:linear-gradient(135deg,#ffb020,#e09810);border-color:transparent;color:#1c1400}
  .fht-btn ha-icon{--mdc-icon-size:17px}
  .fht-btn:active{transform:scale(.95)}
  .fht-btn:disabled{opacity:.4;cursor:default}

  /* Lo stesso rimedio dentro i fogli: la X di chiusura e l'interruttore
     delle righe. I fogli stanno fuori dal pannello e hanno il loro stile,
     quindi la regola va ripetuta qui. */
  @media (pointer: coarse){
    .fhf-x{position:relative}
    .fhf-x::before{content:"";position:absolute;inset:-6px;border-radius:inherit}
    .fhf-sw::before{content:"";position:absolute;inset:-9px -2px;border-radius:999px}
    .frb-chip{min-height:38px}
  }
  .fhf-scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    z-index:999999;display:flex;align-items:flex-end;justify-content:center;animation:fhfIn .2s ease}
  .fhf-sheet{width:100%;max-width:560px;max-height:86vh;overflow-y:auto;box-sizing:border-box;
    padding:18px 16px calc(22px + env(safe-area-inset-bottom,0px));border-radius:26px 26px 0 0;
    background:#161c26;color:#eaf1f8;border:1px solid rgba(255,255,255,.14);border-bottom:none;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;display:flex;flex-direction:column;gap:14px}
  .fhf-scrim.chiaro .fhf-sheet{background:#fff;color:#12161c;border-color:rgba(15,23,42,.12)}
  .fhf-head{display:flex;align-items:center;gap:10px}
  .fhf-head b{flex:1;font-size:17px;font-weight:900}
  .fhf-x{width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.1);color:inherit;font-size:14px;cursor:pointer}
  .fhf-scrim.chiaro .fhf-x{background:rgba(15,23,42,.07)}
  .fhf-corpo{display:flex;flex-direction:column;gap:14px}
  .fhf-sez{display:flex;flex-direction:column;gap:6px}
  .fhf-sez h4{margin:0;font-size:10.5px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;opacity:.6}
  .fhf-riga{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.05);
    font-size:13px;--r-c:#93a1b0}
  .fhf-scrim.chiaro .fhf-riga,.fh-app.chiaro .fhf-riga{background:rgba(15,23,42,.04)}
  .fhf-riga.cliccabile{cursor:pointer}
  .fhf-rig-ic{width:36px;height:36px;border-radius:11px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
    color:var(--r-c);background:color-mix(in srgb,var(--r-c) 15%,transparent)}
  .fhf-rig-ic ha-icon{--mdc-icon-size:20px}
  .fhf-rig-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
  .fhf-rig-t b{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  /* La riga sotto al titolo andava su UNA riga sola e il resto spariva nei
     tre puntini: "dall'ultimo lavaggio non risulta asc..." — proprio la parte
     che serviva leggere (Cristian: "non si legge tutto"). Adesso va a capo,
     fino a tre righe. */
  .fhf-rig-t small{font-size:11px;font-weight:600;opacity:.65;line-height:1.35;
    white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .fhf-riga{align-items:flex-start}
  .fhf-rig-ic{margin-top:1px}
  .fhf-riga.oggi{outline:2px solid var(--r-c);outline-offset:-2px}
  .fhf-val{font-weight:850;font-size:12.5px;color:var(--r-c);white-space:nowrap}
  .fhf-tasto{padding:7px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);
    color:inherit;font:inherit;font-size:11.5px;font-weight:850;cursor:pointer;white-space:nowrap}
  .fhf-scrim.chiaro .fhf-tasto,.fh-app.chiaro .fhf-tasto{background:rgba(15,23,42,.06);border-color:rgba(15,23,42,.14)}
  .fhf-tasto:active{transform:scale(.95)}
  /* L'interruttore: si capisce da lontano se e acceso, e il tocco e grande. */
  .fhf-sw{position:relative;width:46px;height:27px;border-radius:999px;border:none;cursor:pointer;flex:0 0 auto;
    background:rgba(255,255,255,.18);transition:background .2s}
  .fhf-scrim.chiaro .fhf-sw,.fh-app.chiaro .fhf-sw{background:rgba(15,23,42,.18)}
  .fhf-sw::after{content:"";position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;
    box-shadow:0 1px 4px rgba(0,0,0,.35);transition:transform .2s}
  .fhf-sw.on,.fhf-scrim.chiaro .fhf-sw.on,.fh-app.chiaro .fhf-sw.on{background:#ffb020}
  .fhf-sw.on::after{transform:translateX(19px)}
  .fhf-nota{font-size:11.5px;opacity:.65;line-height:1.4}
  /* La schermata degli orari: cambiare l'ora di un'automazione senza entrare
     nelle impostazioni di Home Assistant. */
  .fho-griglia{display:grid;grid-template-columns:1fr 1fr;gap:9px}
  .fho-c{display:flex;flex-direction:column;gap:4px;padding:10px 11px;border-radius:14px;background:rgba(255,255,255,.05)}
  .fhf-scrim.chiaro .fho-c{background:rgba(15,23,42,.04)}
  .fho-c span{font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;opacity:.6}
  .fho-c input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:11px;font:inherit;font-size:16px;font-weight:900;
    border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit}
  .fhf-scrim.chiaro .fho-c input{background:#fff;border-color:rgba(15,23,42,.18)}
  .fho-c.mosso input{border-color:#ffb020}
  .fho-salva{padding:13px;border-radius:14px;border:none;background:#ffb020;color:#1b1400;font:inherit;font-size:14px;
    font-weight:900;cursor:pointer}
  .fho-salva:disabled{background:rgba(255,255,255,.12);color:inherit;opacity:.55;cursor:default}
  .fhf-scrim.chiaro .fho-salva:disabled{background:rgba(15,23,42,.08)}
  .fho-esito{font-size:11.5px;font-weight:800;opacity:.8}
  .fho-esito.male{color:#ff8a3d}
  @keyframes fhfIn{from{opacity:0}to{opacity:1}}
`;

// ---------------------------------------------------------------- ORARI
// Gli orari fissi di un'automazione, letti dalla sua configurazione. Si
// tengono solo gli inneschi "time" con un orario scritto: quelli che puntano
// a un input_datetime o al sole si cambiano altrove e non vanno toccati qui.
function fhOrariDi(cfg) {
  const tr = (cfg && (cfg.triggers || cfg.trigger)) || [];
  const lista = Array.isArray(tr) ? tr : [tr];
  const out = [];
  lista.forEach((t, i) => {
    if ((t.trigger || t.platform) !== "time") return;
    const at = t.at;
    (Array.isArray(at) ? at : [at]).forEach((ora, k) => {
      if (typeof ora !== "string" || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(ora)) return;
      out.push({ i, k, insieme: Array.isArray(at), ora: ora.slice(0, 5), nome: fhNomeOra(t, out.length) });
    });
  });
  return out;
}

// "on2" e "off3" sono i nomi degli inneschi, non una lingua: qui diventano
// "Accende 2" e "Spegne 3".
function fhNomeOra(t, n) {
  const id = String(t.id || t.alias || "").trim();
  const m = id.match(/^(on|off|accend\w*|spegn\w*)[ _-]?(\d*)$/i);
  if (m) return (/^(on|accend)/i.test(m[1]) ? "Accende" : "Spegne") + (m[2] ? " " + m[2] : "");
  if (!id) return "Orario " + (n + 1);
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/[_-]/g, " ");
}

// Un foglio che sale dal basso, agganciato a document.body: dentro il pannello
// le card hanno il vetro sfocato, che terrebbe prigioniero un position:fixed.
// Card piccole: una tessera con un titolo e un tasto. Da sole in una riga,
// fuori dal telefono, occupano mezza riga invece di tutta.
const FH_CARD_PICCOLE = new Set(["custom:faber-robot", "custom:faber-rifiuti", "custom:faber-automazioni", "custom:faber-manuali",
  "custom:faber-cancello", "custom:faber-spesa", "custom:faber-persona", "custom:faber-pulsantiera",
  "custom:faber-player", "custom:mini-card"]);

function fhFoglio(titolo, chiaro) {
  document.querySelectorAll(".fhf-scrim").forEach(x => x.remove());
  const scrim = document.createElement("div");
  scrim.className = "fhf-scrim" + (chiaro ? " chiaro" : "");
  scrim.innerHTML = `<style>${FHT_CSS}</style><div class="fhf-sheet">
    <div class="fhf-head"><b>${fhEsc(titolo)}</b><button type="button" class="fhf-x" data-x>✕</button></div>
    <div class="fhf-corpo" data-corpo></div></div>`;
  document.body.appendChild(scrim);
  // Toccando "informazioni" su una voce si apre la scheda di Home Assistant.
  // Quella scheda vive piu in basso di questo foglio, che sta in cima a tutto:
  // restava nascosta sotto e sembrava che il tocco non avesse fatto niente.
  // Il foglio si toglie di mezzo da solo appena parte la richiesta.
  const viaPerScheda = () => chiudi();
  const chiudi = () => {
    window.removeEventListener("hass-more-info", viaPerScheda, true);
    scrim.remove();
  };
  window.addEventListener("hass-more-info", viaPerScheda, true);
  scrim.addEventListener("click", e => { if (e.target === scrim) chiudi(); });
  scrim.querySelector("[data-x]").addEventListener("click", chiudi);
  return { scrim, corpo: scrim.querySelector("[data-corpo]"), chiudi, aperto: () => document.body.contains(scrim) };
}

function fhQuando(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const g = new Date(d); g.setHours(0, 0, 0, 0);
  const diff = Math.round((oggi - g) / 86400000);
  if (diff === 0) return "oggi alle " + ora;
  if (diff === 1) return "ieri alle " + ora;
  if (diff === -1) return "domani alle " + ora;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) + " alle " + ora;
}

// ===========================================================================
// FABER AUTOMAZIONI — le routine di casa in un posto solo
// Una tessera sulla Casa ("4 attive su 6") che apre il foglio con tutto:
// automazioni con l'interruttore, script e pulsanti da eseguire, e i sensori
// di sistema (internet, alimentazione, certificato) da tenere d'occhio.
// Voce: { entity, nome, icona, nota, testi:{on,off}, ok:"on"|"off", conferma,
//         azione:"dominio.servizio", dati:{...}, tasto:"Ricarica" }
// ===========================================================================
class FaberAutomazioni extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-automazioni-editor"); }
  setConfig(c) {
    this._cfg = Object.assign({ name: "Automazioni", compatta: true, gruppi: [] }, c || {});
    this._built = false;
  }
  static getStubConfig(hass) {
    const s = (hass && hass.states) || {};
    const voci = Object.keys(s).filter(e => e.startsWith("automation.")).slice(0, 6).map(entity => ({ entity }));
    return { type: "custom:faber-automazioni", name: "Automazioni", compatta: true, gruppi: [{ titolo: "Automazioni", voci }] };
  }
  getCardSize() { return 2; }
  set hass(h) {
    this._hass = h;
    this._update();
    if (this._foglio && this._foglio.aperto()) this._disegnaLista(this._foglio.corpo);
  }

  _voci() { return (this._cfg.gruppi || []).flatMap(g => g.voci || []); }

  _leggi(v) {
    const h = this._hass;
    const st = h.states[v.entity];
    const dom = String(v.entity || "").split(".")[0];
    const r = { dom, st, nome: v.nome || (st && st.attributes.friendly_name) || v.entity || "Azione",
      icona: v.icona || { automation: "mdi:robot-outline", script: "mdi:script-text-outline", button: "mdi:gesture-tap-button",
        binary_sensor: "mdi:checkbox-marked-circle-outline", sensor: "mdi:gauge" }[dom] || "mdi:flash",
      sub: v.nota || "", on: false, ok: true, valore: "" };
    if (!st && !v.azione) { r.sub = "Non trovata in Home Assistant"; r.ok = null; return r; }
    if (dom === "automation") {
      r.on = st.state === "on";
      const ult = fhQuando(st.attributes.last_triggered);
      r.sub = (r.on ? "Attiva" : "Spenta") + (v.nota ? " · " + v.nota : "") + (ult ? " · scattata " + ult : "");
    } else if (dom === "script") {
      r.on = st.state === "on";
      r.sub = r.on ? "In esecuzione…" : (v.nota || "Pronto");
    } else if (dom === "binary_sensor") {
      const on = st.state === "on";
      const dc = st.attributes.device_class;
      const okSe = v.ok || (["problem", "safety", "smoke", "moisture", "gas", "tamper", "battery"].includes(dc) ? "off" : "on");
      r.ok = ["unavailable", "unknown"].includes(st.state) ? false : (okSe === "on" ? on : !on);
      const testi = v.testi || (dc === "connectivity" ? { on: "Connessa", off: "Scollegata" }
        : dc === "problem" ? { on: "Problema", off: "Regolare" } : { on: "Attivo", off: "Spento" });
      r.valore = ["unavailable", "unknown"].includes(st.state) ? "Non letto" : (on ? testi.on : testi.off);
    } else if (dom === "sensor") {
      const dc = st.attributes.device_class;
      const n = parseFloat(st.state);
      if (dc === "timestamp") {
        const giorni = Math.round((new Date(st.state) - new Date()) / 86400000);
        r.valore = isNaN(giorni) ? "–" : giorni >= 0 ? "fra " + giorni + (giorni === 1 ? " giorno" : " giorni") : "scaduto";
        r.ok = !isNaN(giorni) && giorni > 14;
      } else if (dc === "battery" || st.attributes.unit_of_measurement === "%") {
        r.valore = isNaN(n) ? st.state : Math.round(n) + "%";
        r.ok = isNaN(n) ? false : n > 20;
      } else {
        r.valore = st.state + (st.attributes.unit_of_measurement ? " " + st.attributes.unit_of_measurement : "");
      }
    }
    return r;
  }

  _update() {
    const h = this._hass;
    if (!h) return;
    const voci = this._voci().map(v => this._leggi(v));
    const auto = voci.filter(r => r.dom === "automation" && r.st);
    const attive = auto.filter(r => r.on).length;
    const guai = voci.filter(r => r.ok === false);
    let tono = attive ? "ambra" : "grigio", stato = attive + (attive === 1 ? " attiva" : " attive") + " su " + auto.length;
    let sub = "Routine, presenza e sistema";
    if (guai.length) { tono = "arancio"; sub = guai.map(g => g.nome + ": " + (g.valore || "da controllare")).join(" · "); }
    const firma = [tono, stato, sub].join("|");
    if (this._cfg.compatta === false) { this._inline(); return; }
    if (!this._built) {
      this._built = true;
      this.innerHTML = `<style>${FHT_CSS}</style>
        <div class="fht tap" data-card>
          <div class="fht-top"><div class="fht-ic"><ha-icon icon="mdi:robot-happy-outline"></ha-icon></div>
            <span class="fht-pill" data-pill></span></div>
          <div class="fht-testo"><div class="fht-title">${fhEsc(this._cfg.name)}</div>
            <div class="fht-stato" data-stato></div><div class="fht-sub" data-sub></div></div>
        </div>`;
      this.querySelector("[data-card]").addEventListener("click", () => { fhVibra(8); this._apri(); });
    }
    if (this._firma === firma) return;
    this._firma = firma;
    const card = this.querySelector("[data-card]");
    card.dataset.tono = tono;
    this.querySelector("[data-pill]").textContent = attive + "/" + auto.length;
    this.querySelector("[data-stato]").textContent = guai.length ? "Da controllare" : stato;
    this.querySelector("[data-sub]").textContent = sub;
  }

  _inline() {
    if (!this._built) {
      this._built = true;
      this.innerHTML = `<style>${FHT_CSS}</style><div class="fht" style="min-height:0">
        <div class="fht-title">${fhEsc(this._cfg.name)}</div><div class="fhf-corpo" data-corpo></div></div>`;
      this._caricaOrari();
    }
    this._disegnaLista(this.querySelector("[data-corpo]"));
  }

  _apri() {
    this._foglio = fhFoglio(this._cfg.name, !!this.closest(".fh-app.chiaro"));
    this._firmaLista = null;
    this._disegnaLista(this._foglio.corpo);
    this._caricaOrari();
  }

  // Legge la configurazione delle automazioni elencate, una volta sola, per
  // sapere quali hanno orari fissi. Solo lettura: la scrittura passa da
  // _salvaOrari, che e l'unico punto che tocca l'automazione.
  async _caricaOrari() {
    if (!this._hass) return;
    this._cfgAuto = this._cfgAuto || {};
    let cambiate = 0;
    for (const v of this._voci()) {
      const e = v.entity || "";
      if (!e.startsWith("automation.")) continue;
      const st = this._hass.states[e];
      const id = st && st.attributes && st.attributes.id;
      let cfg = null;
      if (id) {
        try { cfg = await this._hass.callApi("GET", "config/automation/config/" + encodeURIComponent(id)); }
        catch (err) { cfg = null; }
      }
      // Si rilegge a ogni apertura: se un orario e stato cambiato da Home
      // Assistant, qui dentro si vede subito.
      const prima = JSON.stringify(fhOrariDi(this._cfgAuto[e]));
      this._cfgAuto[e] = cfg;
      if (JSON.stringify(fhOrariDi(cfg)) !== prima) cambiate++;
    }
    if (!cambiate) return;
    if (this._foglio && this._foglio.aperto()) {
      this._foglio.corpo.__firma = null;
      this._disegnaLista(this._foglio.corpo);
    }
    const dentro = this.querySelector("[data-corpo]");
    if (dentro) { dentro.__firma = null; this._disegnaLista(dentro); }
  }

  _orariDi(entity) { return fhOrariDi((this._cfgAuto || {})[entity]); }

  // La schermata dedicata: solo le ore, in grande, e un Salva.
  _apriOrari(v) {
    const chiaro = !!this.closest(".fh-app.chiaro");
    const nome = v.nome || v.entity;
    const ore = this._orariDi(v.entity).map(o => Object.assign({}, o));
    const partenza = ore.map(o => o.ora);
    const f = fhFoglio("Orari · " + nome, chiaro);
    // fhFoglio tiene un foglio solo: chiudendo gli orari si tornerebbe al
    // pannello invece che all'elenco da cui si e partiti.
    const indietro = () => setTimeout(() => { if (!f.aperto()) this._apri(); }, 0);
    f.scrim.addEventListener("click", e => { if (e.target === f.scrim) indietro(); });
    f.scrim.querySelector("[data-x]").addEventListener("click", indietro);
    const disegna = (esito) => {
      const mosso = ore.some((o, i) => o.ora !== partenza[i]);
      f.corpo.innerHTML = `
        <div class="fhf-nota">Gli orari di <b>${fhEsc(nome)}</b>. Cambiali qui e premi Salva:
          non serve entrare nelle impostazioni di Home Assistant.</div>
        <div class="fho-griglia">
          ${ore.map((o, i) => `<label class="fho-c${o.ora !== partenza[i] ? " mosso" : ""}">
            <span>${fhEsc(o.nome)}</span>
            <input type="time" data-o="${i}" value="${fhEsc(o.ora)}">
          </label>`).join("")}
        </div>
        ${esito ? `<div class="fho-esito${esito.male ? " male" : ""}">${fhEsc(esito.testo)}</div>` : ""}
        <button type="button" class="fho-salva" data-salva ${mosso ? "" : "disabled"}>${mosso ? "Salva" : "Nessuna modifica"}</button>`;
      f.corpo.querySelectorAll("[data-o]").forEach(x => x.onchange = ev => {
        if (!/^\d{2}:\d{2}$/.test(ev.target.value)) return;
        ore[+ev.target.dataset.o].ora = ev.target.value;
        disegna();
      });
      const s = f.corpo.querySelector("[data-salva]");
      if (s) s.onclick = async () => {
        s.disabled = true; s.textContent = "Salvo…";
        const esito = await this._salvaOrari(v, ore);
        if (esito.male) { disegna(esito); return; }
        partenza.length = 0; ore.forEach(o => partenza.push(o.ora));
        disegna(esito);
      };
    };
    disegna();
  }

  // L'UNICO punto che scrive sull'automazione, e solo dentro il tasto Salva.
  // Prima rilegge la configurazione dal server e cambia soltanto gli orari:
  // se nel frattempo l'automazione e stata modificata altrove (o ha cambiato
  // forma), si ferma invece di sovrascriverla.
  async _salvaOrari(v, ore) {
    const st = this._hass.states[v.entity];
    const id = st && st.attributes && st.attributes.id;
    if (!id) return { male: true, testo: "Questa automazione non ha un codice: va cambiata da Home Assistant." };
    let cfg;
    try {
      cfg = await this._hass.callApi("GET", "config/automation/config/" + encodeURIComponent(id));
    } catch (e) {
      return { male: true, testo: "Non riesco a leggere l'automazione: " + (e.message || e) };
    }
    const adesso = fhOrariDi(cfg);
    if (adesso.length !== ore.length || adesso.some((o, i) => o.i !== ore[i].i || o.k !== ore[i].k)) {
      this._cfgAuto[v.entity] = cfg;
      return { male: true, testo: "L'automazione e cambiata da un'altra parte: riapri gli orari e riprova." };
    }
    const tr = cfg.triggers || cfg.trigger;
    ore.forEach(o => {
      const t = tr[o.i];
      if (o.insieme) t.at[o.k] = o.ora + ":00";
      else t.at = o.ora + ":00";
    });
    this._gesto = true;
    try {
      await this._hass.callApi("POST", "config/automation/config/" + encodeURIComponent(id), cfg);
    } catch (e) {
      return { male: true, testo: "Non sono riuscito a salvare: " + (e.message || e) };
    } finally {
      this._gesto = false;
    }
    this._cfgAuto[v.entity] = cfg;
    if (this._foglio && this._foglio.aperto()) { this._foglio.corpo.__firma = null; this._disegnaLista(this._foglio.corpo); }
    return { male: false, testo: "Salvato ✓ " + ore.map(o => o.nome + " " + o.ora).join(" · ") };
  }

  // Si ridisegna solo se qualcosa di quello che si vede e cambiato: la card
  // riceve lo stato di tutta la casa molte volte al secondo.
  _disegnaLista(corpo) {
    const gruppi = (this._cfg.gruppi || []).map(g => ({ titolo: g.titolo,
      voci: (g.voci || []).map(v => ({ v, r: this._leggi(v), ore: this._orariDi(v.entity) })) }));
    const firma = JSON.stringify(gruppi.map(g => g.voci.map(({ r, ore }) => [r.on, r.ok, r.sub, r.valore, ore.map(o => o.ora)])));
    if (corpo.__firma === firma) return;
    corpo.__firma = firma;
    corpo.innerHTML = gruppi.map((g, gi) => `<div class="fhf-sez">${g.titolo ? `<h4>${fhEsc(g.titolo)}</h4>` : ""}
      ${g.voci.map(({ v, r, ore }, vi) => {
        const col = r.ok === false ? "#ff8a3d" : r.on ? "#ffb020" : r.dom === "binary_sensor" || r.dom === "sensor" ? "#4ade80" : "#93a1b0";
        let ctrl = "";
        if (r.dom === "automation" && r.st) ctrl = `${ore.length ? `<button type="button" class="fhf-tasto" data-ore="${gi}.${vi}">${ore.length === 1 ? fhEsc(ore[0].ora) : "Orari"}</button>` : ""}<button type="button" class="fhf-sw${r.on ? " on" : ""}" data-sw="${gi}.${vi}" aria-label="Attiva o spegni"></button>`;
        else if (v.azione) ctrl = `<button type="button" class="fhf-tasto" data-az="${gi}.${vi}">${fhEsc(v.tasto || "Esegui")}</button>`;
        else if (r.dom === "script" && r.st) ctrl = `<button type="button" class="fhf-tasto" data-az="${gi}.${vi}">${fhEsc(v.tasto || "Avvia")}</button>`;
        else if (r.dom === "button" && r.st) ctrl = `<button type="button" class="fhf-tasto" data-az="${gi}.${vi}">${fhEsc(v.tasto || "Premi")}</button>`;
        else if (r.valore) ctrl = `<span class="fhf-val">${fhEsc(r.valore)}</span>`;
        const sub = r.sub + (ore.length > 1 ? " · " + ore.slice(0, 4).map(o => o.ora).join(", ") + (ore.length > 4 ? "…" : "") : "");
        return `<div class="fhf-riga${r.st ? " cliccabile" : ""}" style="--r-c:${col}" data-info="${fhEsc(v.entity || "")}">
          <div class="fhf-rig-ic"><ha-icon icon="${fhEsc(r.icona)}"></ha-icon></div>
          <div class="fhf-rig-t"><b>${fhEsc(r.nome)}</b>${sub ? `<small>${fhEsc(sub)}</small>` : ""}</div>${ctrl}</div>`;
      }).join("")}</div>`).join("");
    const voce = k => { const [a, b] = k.split(".").map(Number); return (this._cfg.gruppi[a].voci || [])[b]; };
    corpo.querySelectorAll("[data-sw]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const v = voce(b.dataset.sw);
      const st = this._hass.states[v.entity];
      if (!st) return;
      fhVibra(10);
      this._hass.callService("automation", st.state === "on" ? "turn_off" : "turn_on", { entity_id: v.entity });
    }));
    corpo.querySelectorAll("[data-ore]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      fhVibra(8);
      this._apriOrari(voce(b.dataset.ore));
    }));
    corpo.querySelectorAll("[data-az]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const v = voce(b.dataset.az);
      const fai = () => {
        fhVibra(12);
        if (v.azione) {
          const [d, s] = v.azione.split(".");
          this._hass.callService(d, s, Object.assign({}, v.dati || {}));
        } else if (v.entity.startsWith("script.")) this._hass.callService("script", "turn_on", { entity_id: v.entity });
        else if (v.entity.startsWith("button.")) this._hass.callService("button", "press", { entity_id: v.entity });
        b.textContent = "Fatto ✓";
        setTimeout(() => { b.textContent = v.tasto || "Esegui"; }, 1600);
      };
      if (v.conferma && window.fhConfirmAction) window.fhConfirmAction({ title: v.nome || "Confermi?", message: v.conferma,
        icon: v.icona || "mdi:help-circle-outline", confirmText: v.tasto || "Esegui", cancelText: "Annulla",
        chiaro: !!this.closest(".fh-app.chiaro"), onConfirm: fai });
      else fai();
    }));
    corpo.querySelectorAll("[data-info]").forEach(riga => riga.addEventListener("click", () => {
      const id = riga.dataset.info;
      if (id && this._hass.states[id]) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } }));
    }));
  }
}
customElements.define("faber-automazioni", FaberAutomazioni);

// ===========================================================================
// FABER RIFIUTI — "stasera esponi..." e il calendario della settimana
// Il porta a porta si espone la sera prima: la tessera dice cosa mettere fuori
// stasera, col colore del sacco. Il foglio ha la settimana e il centro raccolta.
// calendario: { lun: "Plastica e Metalli", mar: "Organico", ... dom: "" }
// centro: { nome, orari: { lun: "14:00 - 18:00", ... } }
// ===========================================================================
const FR_GIORNI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const FR_NOMI = { dom: "Domenica", lun: "Lunedì", mar: "Martedì", mer: "Mercoledì", gio: "Giovedì", ven: "Venerdì", sab: "Sabato" };
const FR_TIPI = [
  { re: /plastic|metall|lattin/i, c: "#f2b705", i: "mdi:bottle-soda-classic-outline" },
  { re: /organic|umido/i, c: "#a0712b", i: "mdi:food-apple-outline" },
  { re: /indiff|secco|residu/i, c: "#8a94a1", i: "mdi:trash-can-outline" },
  { re: /vetro/i, c: "#2fb36b", i: "mdi:bottle-wine-outline" },
  { re: /carta|cartone/i, c: "#3b8cf6", i: "mdi:newspaper-variant-outline" },
  { re: /verde|sfalci|potatur/i, c: "#65a30d", i: "mdi:leaf" },
];
function frTipi(testo) {
  const out = [];
  String(testo || "").split(/\s*(?:,|\+|\/|\se\s)\s*/i).forEach(p => {
    const t = FR_TIPI.find(x => x.re.test(p));
    if (t && !out.includes(t)) out.push(t);
  });
  return out;
}

class FaberRifiuti extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-rifiuti-editor"); }
  setConfig(c) {
    this._cfg = Object.assign({ name: "Rifiuti", calendario: {}, centro: null }, c || {});
    this._built = false;
  }
  static getStubConfig() {
    return { type: "custom:faber-rifiuti", name: "Rifiuti",
      calendario: { lun: "", mar: "", mer: "", gio: "", ven: "", sab: "", dom: "" } };
  }
  getCardSize() { return 2; }
  connectedCallback() {
    // Il giorno cambia anche se in casa non cambia niente: un controllo ogni 10 minuti.
    if (!this._tic) this._tic = setInterval(() => this._update(), 600000);
  }
  disconnectedCallback() { clearInterval(this._tic); this._tic = null; }
  set hass(h) { this._hass = h; this._update(); }

  _giorno(offset) {
    const d = new Date(); d.setDate(d.getDate() + offset);
    const k = FR_GIORNI[d.getDay()];
    const testo = (this._cfg.calendario || {})[k] || "";
    return { d, k, testo, tipi: frTipi(testo) };
  }

  _situazione() {
    const ora = new Date().getHours();
    // Prima dell'alba il camion non e ancora passato: conta il giro di oggi.
    const g = ora < 5 ? this._giorno(0) : this._giorno(1);
    if (g.testo) return { g, stato: ora < 5 ? "Passa stamattina" : "Stasera esponi", pill: ora < 5 ? "OGGI" : "DOMANI", sub: g.testo };
    for (let i = 2; i < 8; i++) {
      const n = this._giorno(i);
      if (n.testo) return { g: n, vuoto: true, stato: "Stasera niente", pill: "LIBERO",
        sub: "Prossimo: " + FR_NOMI[n.k].toLowerCase() + " · " + n.testo };
    }
    return { g, vuoto: true, stato: "Calendario vuoto", pill: "–", sub: "Scrivi i giorni nella configurazione della card." };
  }

  _update() {
    if (!this._hass) return;
    const s = this._situazione();
    const tipo = !s.vuoto && s.g.tipi[0];
    const firma = [s.stato, s.sub, s.pill, tipo ? tipo.c : ""].join("|");
    if (!this._built) {
      this._built = true;
      this.innerHTML = `<style>${FHT_CSS}</style>
        <div class="fht tap" data-card>
          <div class="fht-top"><div class="fht-ic"><ha-icon data-icona></ha-icon></div><span class="fht-pill" data-pill></span></div>
          <div class="fht-testo"><div class="fht-title">${fhEsc(this._cfg.name)}</div>
            <div class="fht-stato" data-stato></div><div class="fht-sub" data-sub></div></div>
        </div>`;
      this.querySelector("[data-card]").addEventListener("click", () => { fhVibra(8); this._apri(); });
    }
    if (this._firma === firma) return;
    this._firma = firma;
    const card = this.querySelector("[data-card]");
    // Il colore e quello del sacco: si riconosce prima di leggere.
    if (tipo) { card.style.setProperty("--t-c", tipo.c); card.style.setProperty("--t-t", tipo.c + "33"); card.style.borderColor = tipo.c + "77"; }
    else { card.style.removeProperty("--t-c"); card.style.removeProperty("--t-t"); card.style.borderColor = ""; }
    this.querySelector("[data-icona]").setAttribute("icon", tipo ? tipo.i : "mdi:recycle");
    this.querySelector("[data-pill]").textContent = s.pill;
    this.querySelector("[data-stato]").textContent = s.stato;
    this.querySelector("[data-sub]").textContent = s.sub;
  }

  _apri() {
    const f = fhFoglio(this._cfg.name, !!this.closest(".fh-app.chiaro"));
    const s = this._situazione();
    const settimana = [];
    for (let i = 0; i < 7; i++) settimana.push(this._giorno(i));
    const nomeGiorno = (g, i) => i === 0 ? "Oggi" : i === 1 ? "Domani" : FR_NOMI[g.k];
    const riga = (g, i) => {
      const t = g.tipi[0];
      const col = t ? t.c : "#93a1b0";
      const evid = !s.vuoto && g.d.toDateString() === s.g.d.toDateString();
      return `<div class="fhf-riga${evid ? " oggi" : ""}" style="--r-c:${col}">
        <div class="fhf-rig-ic"><ha-icon icon="${t ? t.i : "mdi:minus-circle-outline"}"></ha-icon></div>
        <div class="fhf-rig-t"><b>${fhEsc(nomeGiorno(g, i))}</b><small>${fhEsc(g.testo || "Nessun ritiro")}</small></div>
        ${g.tipi.length > 1 ? `<span class="fhf-val">${g.tipi.map(x => `<ha-icon icon="${x.i}" style="--mdc-icon-size:18px;color:${x.c}"></ha-icon>`).join("")}</span>` : ""}
        ${evid ? `<span class="fhf-val">${i === 0 ? "passa oggi" : "esponi stasera"}</span>` : ""}</div>`;
    };
    const c = this._cfg.centro;
    let centro = "";
    if (c && c.orari) {
      const oggiK = FR_GIORNI[new Date().getDay()];
      const ordine = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"].filter(k => c.orari[k]);
      const aperto = (() => {
        const o = c.orari[oggiK];
        if (!o) return false;
        const m = o.match(/(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/);
        if (!m) return false;
        const now = new Date(); const min = now.getHours() * 60 + now.getMinutes();
        return min >= (+m[1]) * 60 + (+m[2]) && min < (+m[3]) * 60 + (+m[4]);
      })();
      centro = `<div class="fhf-sez"><h4>${fhEsc(c.nome || "Centro raccolta")}</h4>
        ${ordine.map(k => `<div class="fhf-riga${k === oggiK ? " oggi" : ""}" style="--r-c:${k === oggiK && aperto ? "#4ade80" : "#93a1b0"}">
          <div class="fhf-rig-ic"><ha-icon icon="mdi:warehouse"></ha-icon></div>
          <div class="fhf-rig-t"><b>${fhEsc(FR_NOMI[k])}</b><small>${fhEsc(c.orari[k])}</small></div>
          ${k === oggiK ? `<span class="fhf-val">${aperto ? "aperto adesso" : "oggi"}</span>` : ""}</div>`).join("")}</div>`;
    }
    f.corpo.innerHTML = `<div class="fhf-sez"><h4>Porta a porta · si espone la sera prima</h4>${settimana.map(riga).join("")}</div>${centro}`;
  }
}
customElements.define("faber-rifiuti", FaberRifiuti);

// ===========================================================================
// FABER MANUALI — i libretti di casa, a portata di tocco
// Il manuale del forno stava in fondo a una pagina della vecchia plancia, in
// un riquadro grigio con scritto "MANUALE FORNO": si trovava solo se sapevi
// gia dov'era. Qui diventa una tessera come le altre, nella stanza
// dell'apparecchio, e ci stanno dentro tutti i libretti di quella stanza.
// Con un libretto solo il tocco lo apre subito; con piu di uno si apre
// l'elenco. Il link puo essere un indirizzo internet o un file caricato in
// Home Assistant (/local/...).
// Voce: { nome, icona, url, nota }
// ===========================================================================
class FaberManuali extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-manuali-editor"); }
  setConfig(c) {
    this._cfg = Object.assign({ name: "Manuali", voci: [] }, c || {});
    this._built = false;
    this._firma = null;
  }
  static getStubConfig() {
    return { type: "custom:faber-manuali", name: "Manuali",
      voci: [{ nome: "Manuale forno", icona: "mdi:stove", url: "" }] };
  }
  getCardSize() { return 2; }
  set hass(h) { this._hass = h; this._update(); }

  _voci() { return (this._cfg.voci || []).filter(v => v && (v.url || "").trim()); }

  _apriUrl(url) {
    const u = String(url || "").trim();
    if (!u) return;
    fhVibra(8);
    // Un indirizzo dentro Home Assistant si apre nel pannello, senza uscire
    // dall'app; uno esterno nel browser.
    if (u.startsWith("/") && !u.startsWith("/local/") && !u.startsWith("/api/")) {
      history.pushState(null, "", u);
      window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
      return;
    }
    window.open(u, "_blank", "noopener");
  }

  _update() {
    if (!this._hass) return;
    const voci = this._voci();
    const uno = voci.length === 1 ? voci[0] : null;
    const stato = !voci.length ? "Nessun libretto"
      : uno ? "Apri il libretto" : voci.length + " libretti";
    const sub = !voci.length ? "Aggiungili nella configurazione della card"
      : uno ? (uno.nota || uno.nome || "") : voci.map(v => v.nome).filter(Boolean).join(" \u00b7 ");
    const firma = [stato, sub, voci.length].join("|");
    if (!this._built) {
      this._built = true;
      this.innerHTML = `<style>${FHT_CSS}</style>
        <div class="fht tap" data-card data-tono="blu">
          <div class="fht-top"><div class="fht-ic"><ha-icon data-icona icon="mdi:book-open-page-variant"></ha-icon></div>
            <span class="fht-pill" data-pill></span></div>
          <div class="fht-testo"><div class="fht-title">${fhEsc(this._cfg.name || "Manuali")}</div>
            <div class="fht-stato" data-stato></div><div class="fht-sub" data-sub></div></div>
        </div>`;
      this.querySelector("[data-card]").addEventListener("click", () => {
        const l = this._voci();
        if (l.length === 1) this._apriUrl(l[0].url);
        else if (l.length) this._apri();
      });
    }
    if (this._firma === firma) return;
    this._firma = firma;
    const pill = this.querySelector("[data-pill]");
    pill.hidden = voci.length < 2;
    pill.textContent = voci.length;
    // Con un libretto solo la tessera prende la sua icona: si riconosce da
    // lontano che quello e il forno.
    this.querySelector("[data-icona]").setAttribute("icon",
      (uno && uno.icona) || "mdi:book-open-page-variant");
    this.querySelector("[data-stato]").textContent = stato;
    this.querySelector("[data-sub]").textContent = sub;
  }

  _apri() {
    const f = fhFoglio(this._cfg.name || "Manuali", !!this.closest(".fh-app.chiaro"));
    f.corpo.innerHTML = `<div class="fhf-sez"><h4>Tocca un libretto per aprirlo</h4>${this._voci().map((v, i) =>
      `<div class="fhf-riga cliccabile" data-i="${i}" style="--r-c:#5aa9ff">
        <div class="fhf-rig-ic"><ha-icon icon="${fhEsc(v.icona || "mdi:book-open-page-variant")}"></ha-icon></div>
        <div class="fhf-rig-t"><b>${fhEsc(v.nome || "Libretto")}</b>${v.nota ? `<small>${fhEsc(v.nota)}</small>` : ""}</div>
        <span class="fhf-val">apri</span></div>`).join("")}</div>`;
    f.corpo.querySelectorAll("[data-i]").forEach(r => r.addEventListener("click", () => {
      const v = this._voci()[parseInt(r.dataset.i, 10)];
      if (v) { this._apriUrl(v.url); f.chiudi(); }
    }));
  }
}
customElements.define("faber-manuali", FaberManuali);

class FaberManualiEditor extends HTMLElement {
  setConfig(c) { this._cfg = Object.assign({ name: "Manuali", voci: [] }, c || {}); this._draw(); }
  set hass(h) { this._hass = h; }
  _emit() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true })); }
  _draw() {
    if (!this._cfg) return;
    const c = this._cfg;
    const voci = c.voci || [];
    this.innerHTML = `<style>
      .fme{display:flex;flex-direction:column;gap:12px;padding:6px 2px;font-family:inherit}
      .fme .fld{display:flex;flex-direction:column;gap:5px}
      .fme label{font-size:13px;font-weight:600;color:var(--primary-text-color)}
      .fme .h{font-size:11.5px;color:var(--secondary-text-color);line-height:1.45}
      .fme input{padding:10px 11px;border-radius:8px;font-size:15px;font-family:inherit;
        border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
      .fme .riga{border:1px solid var(--divider-color);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}
      .fme .row{display:flex;gap:8px}.fme .row>.fld{flex:1}
      .fme button{padding:8px 12px;border-radius:9px;border:1px solid var(--divider-color);
        background:var(--card-background-color);color:var(--primary-text-color);font:inherit;cursor:pointer}
      .fme .via{color:#c62828}
    </style>
    <div class="fme">
      <div class="fld"><label>Titolo della tessera</label>
        <input id="m_nome" value="${fhEsc(c.name || "")}" placeholder="Manuali"></div>
      <div class="h">Un libretto solo: il tocco lo apre subito e la tessera prende la sua icona.
        Piu libretti: il tocco apre l'elenco. L'indirizzo puo essere un link internet
        (https://...) o un file caricato in Home Assistant (/local/forno.pdf).</div>
      ${voci.map((v, i) => `<div class="riga" data-i="${i}">
        <div class="row">
          <div class="fld"><label>Nome</label><input data-f="nome" value="${fhEsc(v.nome || "")}" placeholder="Manuale forno"></div>
          <div class="fld"><label>Icona</label><input data-f="icona" value="${fhEsc(v.icona || "")}" placeholder="mdi:stove"></div>
        </div>
        <div class="fld"><label>Indirizzo</label><input data-f="url" value="${fhEsc(v.url || "")}" placeholder="https://..."></div>
        <div class="fld"><label>Nota (sotto il nome)</label><input data-f="nota" value="${fhEsc(v.nota || "")}" placeholder="istruzioni e programmi"></div>
        <div class="row"><button data-act="su">\u2191</button><button data-act="giu">\u2193</button><button class="via" data-act="via">Elimina</button></div>
      </div>`).join("")}
      <button id="m_add">+ Aggiungi un libretto</button>
    </div>`;
    const q = s => this.querySelector(s);
    q("#m_nome").addEventListener("input", e => { this._cfg = Object.assign({}, this._cfg, { name: e.target.value }); this._emit(); });
    q("#m_add").addEventListener("click", () => {
      this._cfg = Object.assign({}, this._cfg, { voci: (this._cfg.voci || []).concat([{ nome: "", icona: "", url: "", nota: "" }]) });
      this._draw(); this._emit();
    });
    this.querySelectorAll(".riga").forEach(r => {
      const i = parseInt(r.dataset.i, 10);
      r.querySelectorAll("[data-f]").forEach(inp => inp.addEventListener("input", () => {
        const l = (this._cfg.voci || []).slice();
        l[i] = Object.assign({}, l[i], { [inp.dataset.f]: inp.value });
        this._cfg = Object.assign({}, this._cfg, { voci: l });
        this._emit();
      }));
      r.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
        const l = (this._cfg.voci || []).slice();
        const a = b.dataset.act;
        if (a === "su" && i > 0) { const [x] = l.splice(i, 1); l.splice(i - 1, 0, x); }
        else if (a === "giu" && i < l.length - 1) { const [x] = l.splice(i, 1); l.splice(i + 1, 0, x); }
        else if (a === "via") l.splice(i, 1);
        this._cfg = Object.assign({}, this._cfg, { voci: l });
        this._draw(); this._emit();
      }));
    });
  }
}
customElements.define("faber-manuali-editor", FaberManualiEditor);


// ===========================================================================
// FABER ROBOT — il robot aspirapolvere: tessera + foglio "come l'app Xiaomi"
// La tessera dice stato, batteria e da quanto non pulisce. Il tocco apre il
// foglio: la mappa (se c'e un'entita mappa) o le stanze da scegliere, i
// comandi, cosa fa (aspira/lava, forza, acqua), la base, le scene, le ultime
// pulizie e i ricambi. Solo quello che il robot ha davvero: il robot sala ha
// meno cose del robot camere e il suo foglio e piu corto, non pieno di tasti
// morti.
// ===========================================================================
const FRB_STATI = { cleaning: "Sta pulendo", docked: "In base", returning: "Torna alla base", paused: "In pausa",
  idle: "Fermo", error: "Errore", unavailable: "Non raggiungibile", unknown: "Sconosciuto" };
const FRB_CSS = `
  .frb-svg{width:46px;height:46px;flex:0 0 auto}
  .frb-spaz{transform-box:fill-box;transform-origin:center}
  .fht[data-pulisce="1"] .frb-spaz{animation:frbGira .6s linear infinite}
  .fht[data-pulisce="1"] .frb-corpo{animation:frbVai 3.2s ease-in-out infinite}
  .frb-led{fill:var(--t-c)}
  @keyframes frbGira{to{transform:rotate(360deg)}}
  @keyframes frbVai{0%,100%{transform:translate(0,0)}25%{transform:translate(2px,-1px)}75%{transform:translate(-2px,1px)}}
  @media (prefers-reduced-motion:reduce){.frb-spaz,.frb-corpo{animation:none!important}}
`;
const FRB_FOGLIO_CSS = `
  .fhf-corpo>[data-s]{display:flex;flex-direction:column;gap:12px}
  .fhf-corpo>[data-s]:empty{display:none}
  .frb-stato{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:850;color:var(--t-c,#5aa9ff)}
  .frb-stato i{width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 0 4px color-mix(in srgb,currentColor 22%,transparent)}
  .frb-mappa{position:relative;border-radius:20px;overflow:hidden;background:#0d1320;border:1px solid rgba(255,255,255,.08);
    min-height:150px;display:flex;flex-direction:column;align-items:stretch;justify-content:center}
  .fhf-scrim.chiaro .frb-mappa{background:#eef2f7;border-color:rgba(15,23,42,.08)}
  .frb-mappa img{width:100%;max-height:44vh;object-fit:contain;display:block;background:#0d1320}
  .fhf-scrim.chiaro .frb-mappa img{background:#eef2f7}
  .frb-stanze{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;padding:10px;box-sizing:border-box}
  .frb-st{position:relative;border:none;border-radius:14px;padding:10px;min-height:58px;font:inherit;font-size:12.5px;font-weight:850;
    color:#0e1522;cursor:pointer;background:var(--s-c);display:flex;align-items:flex-end;text-align:left;opacity:.78;
    transition:transform .12s,box-shadow .15s,opacity .15s;overflow:hidden;word-break:break-word}
  .frb-st:active{transform:scale(.96)}
  .frb-st.sel{opacity:1;box-shadow:inset 0 0 0 3px #fff,0 6px 18px rgba(0,0,0,.35)}
  .fhf-scrim.chiaro .frb-st.sel{box-shadow:inset 0 0 0 3px #12161c,0 6px 18px rgba(20,26,40,.2)}
  .frb-st.sel::after{content:"✓";position:absolute;top:6px;right:7px;width:19px;height:19px;border-radius:50%;background:#0e1522;
    color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}
  .frb-vuota{display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px 14px;text-align:center;font-size:12px;font-weight:700;opacity:.75}
  .frb-vuota .frb-svg{width:64px;height:64px}
  .frb-dati{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px}
  .frb-dato{border-radius:14px;padding:10px 11px;background:rgba(255,255,255,.05);display:flex;flex-direction:column;gap:1px;min-width:0}
  .fhf-scrim.chiaro .frb-dato{background:rgba(15,23,42,.045)}
  .frb-dato b{font-size:18px;font-weight:900;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .frb-dato small{font-size:10.5px;font-weight:700;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .frb-comandi{display:flex;gap:10px}
  .frb-cmd{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 6px;border-radius:18px;
    border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:12px;
    font-weight:850;cursor:pointer;min-width:0;transition:transform .12s}
  .fhf-scrim.chiaro .frb-cmd{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.12)}
  .frb-cmd ha-icon{--mdc-icon-size:26px}
  .frb-cmd:active{transform:scale(.95)}
  .frb-cmd.pieno,.fhf-scrim.chiaro .frb-cmd.pieno{background:linear-gradient(135deg,#ffb020,#e09810);color:#1c1400;
    border-color:transparent;box-shadow:0 6px 18px rgba(255,176,32,.3)}
  .frb-chips{display:flex;flex-wrap:wrap;gap:6px}
  .frb-chip{padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);
    color:inherit;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
  .fhf-scrim.chiaro .frb-chip{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.14)}
  .frb-chip.sel,.fhf-scrim.chiaro .frb-chip.sel{background:#ffb020;border-color:transparent;color:#1c1400}
  .frb-tasti{display:flex;flex-wrap:wrap;gap:6px}
  /* LA CHAT COL ROBOT. Le stesse bolle della Mini Card, cosi chiedere a un
     apparecchio e sempre la stessa cosa in tutta la casa. */
  .frb-chat{display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;padding:4px 2px;margin-bottom:10px}
  .frb-bolla{max-width:86%;padding:9px 12px;border-radius:16px;font-size:13px;font-weight:600;line-height:1.45}
  .frb-bolla b{font-weight:900}
  .frb-mia{align-self:flex-end;background:rgba(90,169,255,.22);border-bottom-right-radius:5px}
  .frb-sua{align-self:flex-start;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-bottom-left-radius:5px}
  .fhf-scrim.chiaro .frb-mia{background:rgba(52,140,205,.18)}
  .fhf-scrim.chiaro .frb-sua{background:rgba(15,30,45,.06);border-color:rgba(15,30,45,.12)}
  .frb-riga-chiedi{display:flex;gap:8px;margin-top:4px}
  .frb-riga-chiedi input{flex:1;min-width:0;padding:11px 13px;border-radius:14px;font:inherit;font-size:14px;font-weight:600;
    border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;outline:none}
  .fhf-scrim.chiaro .frb-riga-chiedi input{background:rgba(15,23,42,.04);border-color:rgba(15,23,42,.14)}
  .frb-barra{height:6px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:5px}
  .fhf-scrim.chiaro .frb-barra{background:rgba(15,23,42,.1)}
  .frb-barra i{display:block;height:100%;border-radius:99px;background:var(--r-c)}
  .frb-acc{border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03)}
  .frb-acch{display:flex;align-items:center;gap:10px;width:100%;padding:12px 13px;border:0;background:none;
    color:inherit;font:inherit;font-size:14px;font-weight:800;cursor:pointer;text-align:left}
  .frb-acch ha-icon{--mdc-icon-size:19px;opacity:.85;flex:none}
  .frb-acch span{flex:1;min-width:0}
  .frb-nota{font-size:11.5px;font-weight:700;opacity:.65;text-align:right;max-width:52%;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .frb-frec{transition:transform .18s ease;opacity:.55!important}
  .frb-acc.on .frb-frec{transform:rotate(180deg)}
  .frb-acc:not(.on) .frb-accc{display:none}
  .frb-accc{padding:0 11px 11px}
  .frb-accc>.fhf-sez{margin:0}
  .fh-app.chiaro .frb-acc,.fhf-scrim.chiaro .frb-acc{border-color:rgba(0,0,0,.1);background:rgba(0,0,0,.02)}
  .frb-perche{color:#ffb98a!important;font-weight:700}
  .frb-ore{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:2px 2px 4px 58px;font-size:11px;font-weight:700;opacity:.9}
  .frb-ore .frb-chip{padding:5px 10px;font-size:11px}
`;
// Colori tenui come le stanze nell'app Xiaomi: si distinguono senza leggere.
const FRB_COLORI = ["#8fc8ff", "#ffc98f", "#b6e3a1", "#f5a9c7", "#c7b5ff", "#ffe08a", "#9fe3d9", "#ffb3a7"];
// Le entita di Xiaomi Home si chiamano "select.xiaomi_de_<id>_<modello>_<chiave>_p_2_4":
// la chiave in mezzo ("sweep_mop_type") e la stessa su tutti i modelli, i
// numeri in fondo no (la forza e p_2_3 sul robot sala e p_2_9 sul camere).
// Quelle di Dreame Vacuum si chiamano come il robot: "select.robot_sala_cleaning_mode".
// Per questo la card cerca per chiave, e solo dentro il dispositivo del robot.
function frbChiave(eid, pref) {
  const i = eid.indexOf(".");
  let k = eid.slice(i + 1);
  if (pref && k.startsWith(pref + "_")) k = k.slice(pref.length + 1);
  else k = k.replace(/^xiaomi_[a-z]{2}_\d+_[a-z0-9]+_/, "");
  return eid.slice(0, i) + ":" + k.replace(/_[pae]_\d+_\d+$/, "");
}
// I GUASTI DEI ROBOT XIAOMI, detti in italiano.
// Il robot manda un numero e basta: "segnala il guasto 210030" non serve a
// nessuno (Cristian: "non si capisce cos'e"). Questi sono i codici che si
// conoscono; quelli che non si conoscono restano numeri, ma almeno si dice
// che sono numeri che il robot non spiega, invece di far finta.
const FRB_ERR_XIAOMI = {
  "100001": "il sensore laser non vede: controlla che non sia sporco o coperto",
  "100002": "sensore di caduta sporco o guasto",
  "100003": "il paraurti e bloccato: liberalo e puliscilo",
  "100005": "problema alla spazzola principale: controlla che non sia aggrovigliata",
  "100006": "problema alla spazzola laterale",
  "100008": "ruote sollevate: e alzato, su una soglia alta o fermo in base",
  "100009": "problema al contenitore della polvere o al filtro",
  "100015": "il supporto del panno e caduto",
  "100022": "errore interno del robot",
  "100026": "serbatoio dell'acqua pulita vuoto",
  "100027": "serbatoio dell'acqua sporca pieno",
  "100028": "problema al vassoio della base",
  "100031": "non riesce a parlare con la base",
  "100034": "detersivo finito",
  "100038": "non riesce a tornare in base: la strada e bloccata",
  "210005": "non e arrivato dove doveva: strada bloccata o porta chiusa",
};
function frbErrore(codice) {
  const c = String(codice || "").trim();
  if (!c || c === "0") return "";
  return FRB_ERR_XIAOMI[c] || "";
}

// I GUASTI ATTIVI ADESSO. Il sensore "fault" resta appiccicato all'ultimo
// codice visto anche quando il problema e passato (il robot camere e rimasto
// a 210030 per un giorno intero, a robot fermo in base e funzionante): la
// verita sta nell'altro sensore, quello che manda la lista dei guasti in
// corso, e quando dice [0] vuol dire che va tutto bene.
function frbGuastiOra(st) {
  const ids = st("sensor:fault_ids");
  if (ids) {
    try {
      const j = JSON.parse(ids.state);
      const lista = (j && j.fault) || [];
      return lista.map(String).filter(x => x && x !== "0");
    } catch (e) { /* non e un json: si guarda il sensore normale */ }
  }
  const g = st("sensor:fault") || st("sensor:error");
  if (!g) return [];
  const s = String(g.state);
  return /^(no_error|none|0|no_fault|nessun)/i.test(s) ? [] : [s];
}

// L'ASCIUGATURA E' PARTITA?
// Il robot non ha un sensore che dice "sto asciugando": l'evento "asciugatura
// finita" arriva due ore dopo. Ma il TASTO lo sa — in Home Assistant un
// button si ricorda quando e stato premuto l'ultima volta — e la base dice da
// quanti minuti sta lavorando. Cosi il tasto premuto si vede subito, invece
// di far ricomparire "Asciugali adesso" come se non fosse successo niente
// (Cristian: "mi dice fatto ma poi mi rimette asciuga adesso").
function frbAsciugaOra(st) {
  const b = st("button:start_dry") || st("button:manual_drying");
  const ms = b ? Date.parse(b.state) : NaN;
  if (!isFinite(ms)) return null;
  // Quanto dura: lo dice il robot (2 ore di suo).
  const d = st("select:drying_time") || st("number:drying_time");
  let ore = parseFloat(String((d && d.state) || "")) || 2;
  if (ore > 12) ore = ore / 60;              // se lo desse in minuti
  const fine = ms + ore * 3600000;
  if (Date.now() > fine) return null;
  // Se la base dice che sta ferma, l'asciugatura e stata interrotta: non si
  // continua a dire che sta lavorando quando non e vero.
  const base = st("sensor:base_station_working_status");
  if (base) {
    try {
      const j = JSON.parse(base.state);
      if (j && Number(j.mode) === 0) return null;
    } catch (e) { /* non e un json: si tiene buono il tasto */ }
  }
  const stop = st("sensor:self_wash_base_status");
  if (stop && stop.state === "idle" && Date.now() - ms > 300000) return null;
  return { da: ms, fine };
}

// COSA NON VA NEL ROBOT, detto da fuori.
// La card lo sa gia, ma quando la card non e aperta non lo sa nessuno: la
// riga "Serve qualcosa?" in cima alla Home deve poterlo chiedere senza
// montare la card. Qui dentro ci sono solo i segnali che si leggono al volo,
// senza andare a prendere lo storico: gli eventi della base (i panni lavati
// dopo l'ultima asciugatura), il sacchetto, l'acqua, il guasto.
function frbGuai(hass, entityId, nome) {
  const out = [];
  if (!hass || !entityId) return out;
  const reg = hass.entities || {};
  const dev = (reg[entityId] || {}).device_id;
  if (!dev) return out;
  const pref = String(entityId).split(".")[1] || "";
  const m = {};
  Object.keys(reg).forEach(e => {
    if (reg[e].device_id !== dev) return;
    const k = frbChiave(e, pref);
    (m[k] = m[k] || []).push(e);
  });
  const st = k => { const e = (m[k] || [])[0]; const s = e ? hass.states[e] : null;
    return s && !["unavailable", "unknown"].includes(s.state) ? s : null; };
  const quando = k => { const s = st(k); const ms = s ? Date.parse(s.state) : NaN; return isFinite(ms) ? ms : null; };
  const chi = nome || "Robot";

  // Panni lavati e mai asciugati: dopo tre ore e il momento di dirlo.
  const lavato = quando("event:mop_wash_complete");
  const asciutto = quando("event:dry_complete");
  const inCorso = frbAsciugaOra(st);
  if (!inCorso && lavato && (!asciutto || asciutto < lavato) && (Date.now() - lavato) > 3 * 3600000) {
    out.push({ testo: chi + ": panni lavati " + frbDa(lavato) + " e mai asciugati",
      icona: "mdi:weather-windy", colore: "ambra", ent: (m["event:dry_complete"] || [])[0] || entityId,
      asciuga: (m["button:start_dry"] || m["button:manual_drying"] || [])[0] || "" });
  }
  const sac = st("sensor:dust_bag_life_level");
  if (sac && isFinite(+sac.state) && +sac.state < 15) {
    out.push({ testo: chi + ": sacchetto della polvere al " + Math.round(+sac.state) + "%",
      icona: "mdi:sack", colore: "ambra", ent: sac.entity_id });
  }
  const acqua = st("sensor:low_water_warning");
  if (acqua && !/no_warning|no warning|none/i.test(acqua.state)) {
    out.push({ testo: chi + ": manca l'acqua", icona: "mdi:water-alert-outline", colore: "ambra", ent: acqua.entity_id });
  }
  const g = st("sensor:fault") || st("sensor:error");
  frbGuastiOra(st).forEach(cod => {
    const spiegato = frbErrore(cod) || (g && g.attributes.description) || "";
    out.push({
      testo: chi + ": " + (spiegato || "guasto che non so tradurre (codice " + cod + ")"),
      icona: "mdi:robot-vacuum-alert", colore: "rosso", ent: (g && g.entity_id) || entityId,
    });
  });
  return out;
}

function frbOrdine(eid) {
  const m = eid.match(/_[pae]_(\d+)_(\d+)$/);
  return m ? (+m[1]) * 1000 + (+m[2]) : 0;
}
function frbFa(d) {
  const ore = (Date.now() - d.getTime()) / 3600000;
  if (!isFinite(ore) || ore < 0) return "";
  if (ore < 1) return "meno di un'ora";
  if (ore < 36) return Math.round(ore) + (Math.round(ore) === 1 ? " ora" : " ore");
  return Math.round(ore / 24) + " giorni";
}
const FRB_FASI = {
  sweeping: "sta aspirando", mopping: "sta lavando", sweeping_and_mopping: "aspira e lava insieme",
  washing: "lava i panni in base", drying: "asciuga i panni", returning: "torna in base",
  back_home: "torna in base", paused: "in pausa", building: "sta facendo la mappa",
};

const FRB_SCELTE = [
  { k: ["select:sweep_mop_type", "select:cleaning_mode"], t: "Cosa fa", o: { "Sweep": "Aspira", "Mop": "Lava", "Sweep Mop": "Aspira e lava",
    "Sweep Before Mopping": "Prima aspira, poi lava", sweeping: "Aspira", mopping: "Lava", sweeping_and_mopping: "Aspira e lava",
    mopping_after_sweeping: "Prima aspira, poi lava",
    "Sweeping": "Aspira", "Mopping": "Lava", "Sweeping and mopping": "Aspira e lava",
    "Mopping after sweeping": "Prima aspira, poi lava" } },
  { k: ["select:mode", "select:suction_level"], t: "Forza aspirazione", o: { "Silent": "Silenziosa", "Basic": "Normale", "Strong": "Forte",
    "Full Speed": "Massima", quiet: "Silenziosa", standard: "Normale", strong: "Forte", turbo: "Massima" } },
  { k: ["select:mop_water_output_level", "select:mop_pad_humidity"], t: "Acqua sul panno", o: { "Off": "Niente", "Level1": "Poca",
    "Level2": "Media", "Level3": "Tanta", slightly_dry: "Poca", moist: "Media", wet: "Tanta" } },
  { k: ["select:clean_times"], t: "Passate", o: { "One Time": "Una", "Two Time": "Due", "Three Time": "Tre" } },
  { k: ["select:sweep_route", "select:mopping_type"], t: "Percorso", o: { "Quick": "Veloce", "Daily": "Normale", "Careful": "Accurato",
    deep: "Profondo", daily: "Normale", accurate: "Accurato" } },
  { k: ["select:mop_wash_level"], t: "Lavaggio dei panni", o: { deep: "Profondo", daily: "Normale" } },
];
const FRB_BASE = [
  { k: ["button:start_dust_arrest", "button:start_auto_empty"], t: "Svuota polvere", i: "mdi:delete-empty-outline" },
  { k: ["button:start_mop_wash", "button:self_clean"], t: "Lava i panni", i: "mdi:water-sync" },
  { k: ["button:start_dry", "button:manual_drying"], t: "Asciuga i panni", i: "mdi:weather-windy" },
];
const FRB_INTERR = [
  { k: ["switch:auto_dust_arrest", "switch:auto_dust_collecting"], t: "Svuota da solo", s: "Alla fine di ogni pulizia", i: "mdi:delete-restore" },
  { k: ["switch:auto_mop_dry", "switch:auto_drying"], t: "Asciuga i panni da solo", s: "Dopo il lavaggio, niente cattivi odori", i: "mdi:weather-windy" },
  { k: ["switch:self_clean"], t: "Sciacqua i panni durante la pulizia", s: "Torna in base a lavarli e riparte", i: "mdi:water-sync" },
  { k: ["switch:carpet_boost"], t: "Più forza sui tappeti", s: "", i: "mdi:rug" },
  { k: ["switch:no_disturb", "switch:dnd"], t: "Non disturbare", s: "Di notte non parte da solo e non parla", i: "mdi:sleep" },
  { k: ["switch:child_lock"], t: "Blocco bambini", s: "I tasti sul robot non funzionano", i: "mdi:lock-outline" },
];
const FRB_RICAMBI = [
  { k: "sensor:brush_life_level", o: "sensor:brush_left_time", t: ["Spazzola principale", "Spazzola laterale"], i: "mdi:broom" },
  { k: "sensor:main_brush_left", o: "sensor:main_brush_time_left", t: ["Spazzola principale"], i: "mdi:broom" },
  { k: "sensor:side_brush_left", o: "sensor:side_brush_time_left", t: ["Spazzola laterale"], i: "mdi:broom" },
  { k: "sensor:filter_life_level", o: "sensor:filter_left_time", t: ["Filtro"], i: "mdi:air-filter" },
  { k: "sensor:filter_left", o: "sensor:filter_time_left", t: ["Filtro"], i: "mdi:air-filter" },
  { k: "sensor:mop_life_level", o: "sensor:mop_left_time", t: ["Panni"], i: "mdi:texture-box" },
  { k: "sensor:mop_pad_left", o: "sensor:mop_pad_time_left", t: ["Panni"], i: "mdi:texture-box" },
  { k: "sensor:dust_bag_life_level", o: "sensor:dust_bag_left_time", t: ["Sacchetto polvere"], i: "mdi:sack" },
  { k: "sensor:dust_bag_life_level", o: "sensor:dust_bag_left_time", t: ["Sacchetto polvere"], i: "mdi:sack" },
  { k: "sensor:detergent_left", o: "sensor:detergent_time_left", t: ["Detersivo"], i: "mdi:bottle-tonic-outline" },
];
// Cosa fanno le scene: il nome da solo ("Quando uscite") non dice le regole.
const FRB_SCENE = [
  { re: /quando_uscite/, i: "mdi:home-export-outline", s: "Parte se in casa non c'è nessuno da 10 minuti (8:00–20:30)" },
  { re: /rientro/, i: "mdi:home-import-outline", s: "Quando torna qualcuno, rimanda alla base il robot partito da solo" },
  { re: /dopo_cena/, i: "mdi:silverware-fork-knife", s: "Alle 21:45 pulisce il piano terra" },
  { re: /avvisi/, i: "mdi:bell-ring-outline", s: "Ti avvisa se si blocca o se un ricambio è finito" },
];
function frbDisegno() {
  return `<svg class="frb-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <g class="frb-corpo">
      <circle cx="24" cy="24" r="19" fill="#3a4150" stroke="#050608" stroke-width="1.2"/>
      <circle cx="24" cy="24" r="15" fill="#2a303c"/>
      <rect x="16" y="9" width="16" height="6" rx="3" fill="#4a5261"/>
      <circle cx="24" cy="24" r="5" fill="#4a5261" stroke="#050608" stroke-width=".8"/>
      <circle class="frb-led" cx="24" cy="24" r="2"/>
      <g class="frb-spaz" transform="translate(9 35)"><g stroke="#8a94a1" stroke-width="1.3" stroke-linecap="round">
        <path d="M0 -5V5M-5 0H5M-3.5 -3.5L3.5 3.5M-3.5 3.5L3.5 -3.5"/></g></g>
    </g></svg>`;
}
// Le sezioni del foglio che stanno in una tendina, nell'ordine in cui
// compaiono. Quelle fuori da qui (stato, numeri, comandi) sono sempre aperte.
// COSA STA FACENDO LA BASE. Sono gli stati che il robot manda in inglese:
// qui diventano una frase che si capisce.
const FRB_LAVAGGIO = {
  idle: "ferma", washing: "sta lavando i panni", drying: "sta asciugando i panni",
  paused: "in pausa", returning: "sta tornando in base a lavarsi",
  clean_add_water: "carica l'acqua per lavare", adding_water: "sta caricando l'acqua",
};
const FRB_SVUOTO = { idle: "ferma", active: "sta svuotando la polvere", not_performed: "non fatto" };

// Da quanto tempo: "3 minuti fa", "ieri alle 21:10". Sotto le dieci ore si
// dice il tempo passato, sopra si dice il giorno e l'ora — e come lo direbbe
// una persona.
function frbDa(ms) {
  if (!ms || !isFinite(ms)) return "";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "adesso";
  if (min < 60) return min + (min === 1 ? " minuto fa" : " minuti fa");
  const ore = Math.round(min / 60);
  if (ore < 10) return ore + (ore === 1 ? " ora fa" : " ore fa");
  return fhQuando(new Date(ms).toISOString());
}

const FRB_TENDINE = [
  ["mappa", "Mappa e stanze", "mdi:map-outline"],
  ["domande", "Chiedi al robot", "mdi:comment-question-outline"],
  ["modi", "Come pulisce", "mdi:tune-variant"],
  ["base", "Base di ricarica", "mdi:home-lightning-bolt-outline"],
  ["scene", "Scene", "mdi:movie-open-play-outline"],
  ["storia", "Pulizie", "mdi:history"],
  ["ricambi", "Ricambi", "mdi:wrench-outline"],
];


// ---------------------------------------------------------------------------
// LE SCHEDE DI MODIFICA DELLE CARD CHE NON CE L'AVEVANO.
//
// Otto card su quattordici si potevano cambiare solo scrivendo YAML a mano, e
// dal telefono non e una strada. Invece di scrivere otto schede quasi uguali,
// qui c'e un motore solo: ogni card dichiara i suoi campi e la scheda si
// costruisce da se. Aggiungere un campo domani vuol dire aggiungere una riga.
//
// Tipi di campo: testo, numero, si_no, entita (con elenco a discesa filtrato
// per dominio), entita_liste (piu entita), json (per le parti strutturate:
// gruppi, tasti, calendario).
// ---------------------------------------------------------------------------
const FH_CAMPI = {
  "faber-automazioni": [
    { k: "name", t: "Nome della card", tipo: "testo" },
    { k: "compatta", t: "Vista compatta", tipo: "si_no", aiuto: "Righe strette: più automazioni nello stesso spazio." },
    { k: "gruppi", t: "Gruppi e voci", tipo: "json",
      aiuto: 'Elenco di gruppi. Esempio: [{"titolo":"Luci","voci":[{"entity":"automation.luci_sera"}]}]' },
  ],
  "faber-cancello": [
    { k: "name", t: "Nome della card", tipo: "testo" },
    { k: "gate_button", t: "Pulsante del cancello", tipo: "entita", dom: ["button.", "switch.", "script."] },
    { k: "gate_script", t: "Script di apertura con timer", tipo: "entita", dom: ["script."] },
    { k: "timer", t: "Timer del cancello", tipo: "entita", dom: ["timer."] },
    { k: "pedestrian_button", t: "Pulsante del cancelletto", tipo: "entita", dom: ["button.", "switch.", "lock."] },
    { k: "pedestrian_battery", t: "Batteria del cancelletto", tipo: "entita", dom: ["sensor."] },
  ],
  "faber-fuoricasa": [
    { k: "name", t: "Nome della card", tipo: "testo" },
    { k: "entity", t: "Automazione o allarme da comandare", tipo: "entita",
      dom: ["automation.", "alarm_control_panel.", "input_boolean."] },
  ],
  "faber-player": [
    { k: "name", t: "Nome della card", tipo: "testo" },
    { k: "entity", t: "Lettore principale", tipo: "entita", dom: ["media_player."] },
    { k: "entities", t: "Altri lettori fra cui scegliere", tipo: "entita_liste", dom: ["media_player."] },
  ],
  "faber-pulsantiera": [
    { k: "name", t: "Nome della card", tipo: "testo" },
    { k: "icona", t: "Icona", tipo: "testo", aiuto: "Nome di un'icona mdi, per esempio mdi:remote." },
    { k: "remote", t: "Telecomando (remote)", tipo: "entita", dom: ["remote."] },
    { k: "device", t: "Nome del dispositivo nel telecomando", tipo: "testo" },
    { k: "colonne", t: "Tasti per riga", tipo: "numero", min: 1, max: 6 },
    { k: "tasti", t: "I tasti", tipo: "json",
      aiuto: 'Esempio: [{"t":"Accendi","c":"POWER","i":"mdi:power"}]' },
  ],
  "faber-rifiuti": [
    { k: "name", t: "Nome della card", tipo: "testo" },
    { k: "calendario", t: "Calendario della raccolta", tipo: "json",
      aiuto: 'Giorni della settimana e cosa si porta fuori. Esempio: {"1":["Plastica"],"4":["Organico"]}' },
    { k: "centro", t: "Centro di raccolta", tipo: "json", aiuto: 'Esempio: {"nome":"Isola ecologica","orari":"Sab 8-12"}' },
  ],
  "faber-robot": [
    { k: "name", t: "Nome della card", tipo: "testo" },
    { k: "entity", t: "Il robot", tipo: "entita", dom: ["vacuum."] },
    { k: "mappa", t: "Mappa (camera o immagine)", tipo: "entita", dom: ["camera.", "image."],
      aiuto: "Lasciando vuoto la cerca da sola fra le entità del robot." },
    { k: "ultima", t: "Quando ha pulito l'ultima volta", tipo: "entita", dom: ["input_datetime."] },
    { k: "ore", t: "Ore senza pulizia (per le scene)", tipo: "entita", dom: ["input_number."] },
    { k: "scene", t: "Automazioni mostrate come scene", tipo: "json",
      aiuto: 'Esempio: ["automation.robot_quando_uscite"]. Vuoto = le trova da sola fra quelle che iniziano con automation.robot_' },
    { k: "stanze", t: "Nomi delle stanze", tipo: "json",
      aiuto: 'Numero della stanza sul robot e come si chiama. Esempio: {"5":"Camera Leo","16":"Studio"}' },
  ],
  "faber-spesa": [
    { k: "name", t: "Nome della card", tipo: "testo" },
    { k: "entity", t: "Lista della spesa", tipo: "entita", dom: ["todo."] },
  ],
};

function fhCampoHTML(c, val, stile) {
  const id = "fc_" + c.k;
  const aiuto = c.aiuto ? `<span style="font-size:11.5px;opacity:.7;line-height:1.35">${fhEsc(c.aiuto)}</span>` : "";
  let campo;
  if (c.tipo === "si_no") {
    campo = `<label style="display:flex;gap:8px;align-items:center;font-size:14px">
      <input type="checkbox" id="${id}"${val ? " checked" : ""}> Attiva</label>`;
  } else if (c.tipo === "numero") {
    campo = `<input type="number" id="${id}" min="${c.min ?? 0}" max="${c.max ?? 99}" value="${fhEsc(String(val ?? ""))}" style="${stile}">`;
  } else if (c.tipo === "json") {
    let testo = "";
    if (val !== undefined && val !== null && val !== "") {
      testo = JSON.stringify(val, null, 1);
    }
    campo = `<textarea id="${id}" rows="4" spellcheck="false" style="${stile};font-family:ui-monospace,Menlo,monospace;font-size:12.5px;resize:vertical">${fhEsc(testo)}</textarea>
      <span id="${id}_esito" style="font-size:11.5px;font-weight:700"></span>`;
  } else if (c.tipo === "entita_liste") {
    campo = `<textarea id="${id}" rows="3" spellcheck="false" placeholder="un’entità per riga" style="${stile};font-family:ui-monospace,Menlo,monospace;font-size:12.5px;resize:vertical">${fhEsc((val || []).join("\n"))}</textarea>`;
  } else if (c.tipo === "entita") {
    campo = `<input id="${id}" list="${id}_l" value="${fhEsc(val || "")}" placeholder="scrivi per cercare" style="${stile}">
      <datalist id="${id}_l"></datalist>`;
  } else {
    campo = `<input id="${id}" value="${fhEsc(val == null ? "" : String(val))}" style="${stile}">`;
  }
  return `<div style="display:flex;flex-direction:column;gap:5px">
    <label for="${id}" style="font-size:13px;font-weight:700">${fhEsc(c.t)}</label>${aiuto}${campo}</div>`;
}

// Una classe sola, registrata con otto nomi diversi: ognuno si porta dietro
// l'elenco dei suoi campi.
function fhRegistraEditor(tag, campi) {
  class FhEditorGenerico extends HTMLElement {
    setConfig(config) {
      this._cfg = Object.assign({}, config || {});
      if (this._interno) { this._interno = false; return; }
      this._render();
    }
    set hass(h) { this._hass = h; if (!this._fatto) { this._fatto = true; this._render(); } }
    _emit() {
      this._interno = true;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true }));
    }
    _set(k, v) {
      const n = Object.assign({}, this._cfg);
      if (v === "" || v === undefined) delete n[k]; else n[k] = v;
      this._cfg = n;
      this._emit();
    }
    _render() {
      if (!this._cfg || !this._hass) return;
      const stile = "padding:9px 10px;border-radius:8px;font-size:14px;width:100%;box-sizing:border-box;" +
        "border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)";
      this.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px;padding:6px 2px;font-family:inherit">
        ${campi.map(c => fhCampoHTML(c, this._cfg[c.k], stile)).join("")}
      </div>`;
      const q = k => this.querySelector("#fc_" + k);
      campi.forEach(c => {
        const el = q(c.k);
        if (!el) return;
        if (c.tipo === "si_no") {
          el.onchange = () => this._set(c.k, el.checked);
        } else if (c.tipo === "numero") {
          el.onchange = () => this._set(c.k, parseInt(el.value, 10) || undefined);
        } else if (c.tipo === "json") {
          const esito = this.querySelector("#fc_" + c.k + "_esito");
          el.onchange = () => {
            const t = el.value.trim();
            if (!t) { esito.textContent = ""; esito.style.color = ""; this._set(c.k, undefined); return; }
            // Scritto a mano si sbaglia: meglio dirlo subito invece di
            // salvare una configurazione rotta.
            let v = null, ok = true;
            try { v = JSON.parse(t); } catch (e) { ok = false; }
            if (!ok) {
              esito.textContent = "Non è scritto bene: controlla parentesi e virgole.";
              esito.style.color = "var(--error-color, #ff5c5c)";
              return;
            }
            esito.textContent = "A posto.";
            esito.style.color = "var(--success-color, #4ade80)";
            this._set(c.k, v);
          };
        } else if (c.tipo === "entita_liste") {
          el.onchange = () => {
            const l = el.value.split("\n").map(x => x.trim()).filter(Boolean);
            this._set(c.k, l.length ? l : undefined);
          };
        } else {
          if (c.tipo === "entita") {
            const dl = this.querySelector("#fc_" + c.k + "_l");
            const dom = c.dom || [];
            Object.keys(this._hass.states)
              .filter(e => !dom.length || dom.some(d => e.startsWith(d)))
              .sort()
              .slice(0, 400)
              .forEach(e => {
                const o = document.createElement("option");
                o.value = e;
                const n = this._hass.states[e].attributes.friendly_name;
                if (n) o.label = n;
                dl.appendChild(o);
              });
          }
          el.onchange = () => this._set(c.k, el.value.trim());
        }
      });
    }
  }
  customElements.define(tag, FhEditorGenerico);
}

Object.keys(FH_CAMPI).forEach(t => fhRegistraEditor(t + "-editor", FH_CAMPI[t]));

class FaberRobot extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-robot-editor"); }
  setConfig(c) {
    this._cfg = Object.assign({ name: "", entity: "", mappa: "", ultima: "", stanze: null, scene: null,
      ore: "input_number.robot_ore_senza_pulizia", doppia: "" }, c || {});
    this._built = false;
  }
  static getStubConfig(hass) {
    const e = Object.keys((hass && hass.states) || {}).find(x => x.startsWith("vacuum.")) || "";
    return { type: "custom:faber-robot", name: "Robot", entity: e };
  }
  getCardSize() { return 2; }
  disconnectedCallback() { clearInterval(this._timerMappa); this._timerMappa = null; }
  set hass(h) {
    this._hass = h;
    this._update();
    if (this._foglio && this._foglio.aperto()) this._disegnaFoglio();
  }

  _nome() {
    const st = this._hass && this._hass.states[this._cfg.entity];
    return this._cfg.name || (st && st.attributes.friendly_name) || "Robot";
  }

  // Tutte le entita del dispositivo del robot, divise per chiave e in ordine.
  _entita() {
    const h = this._hass, reg = h.entities || {};
    if (this._cache && this._cache.reg === reg) return this._cache.m;
    const dev = (reg[this._cfg.entity] || {}).device_id;
    const pref = String(this._cfg.entity).split(".")[1] || "";
    const m = {};
    if (dev) Object.keys(reg).forEach(e => {
      if (reg[e].device_id !== dev) return;
      const k = frbChiave(e, pref);
      (m[k] = m[k] || []).push(e);
    });
    Object.values(m).forEach(l => l.sort((a, b) => frbOrdine(a) - frbOrdine(b)));
    this._cache = { reg, m };
    return m;
  }
  _e(k, i) { const l = this._entita()[k]; return l ? l[i || 0] || null : null; }
  _k(lista) { return [].concat(lista).find(k => this._e(k)) || null; }
  // Dreame Vacuum: stanze, mappa e comando per stanza sono suoi.
  _dreame() { const r = (this._hass.entities || {})[this._cfg.entity]; return !!(r && r.platform === "dreame_vacuum"); }
  _mappaId() { return this._cfg.mappa || this._e("camera:map"); }

  // Il tasto "Aspira e poi lava" ha senso solo se lo script esiste e non e
  // gia in corso: premuto due volte non deve far niente di strano, e mentre
  // gira il robot sta gia facendo proprio quello.
  _doppia() {
    const id = this._cfg.doppia;
    const s = id && this._hass && this._hass.states[id];
    return s ? { id, inCorso: s.state === "on" } : null;
  }
  // IL PROGRAMMA E LA FASE.
  // "Prima aspira, poi lava" e un'IMPOSTAZIONE del robot, non un comando:
  // senza vederla scritta non si capisce se e attiva. Mentre il robot lavora
  // la scelta diventa "non disponibile" — la blocca lui — e allora il nome si
  // legge dall'attributo del vacuum, che resta buono.
  _programma() {
    const st = this._hass.states[this._cfg.entity];
    const k = this._k(["select:cleaning_mode", "select:sweep_mop_type"]);
    const sel = k && this._st(k);
    const nomi = FRB_SCELTE[0].o;
    let grezzo = sel && !["unavailable", "unknown"].includes(sel.state) ? sel.state : "";
    if (!grezzo && st) grezzo = st.attributes.cleaning_mode || "";
    const testo = grezzo ? (nomi[grezzo] || grezzo) : "";
    const fs = this._st("sensor:state");
    const fase = fs ? (FRB_FASI[fs.state] || "") : "";
    return { testo, fase, doppio: /after_sweeping|Before Mopping|after sweeping/i.test(grezzo) };
  }

  // LO STORICO DELLA BASE. Lo stato di adesso dice "ferma", ma non dice se i
  // panni sono stati lavati stamattina o tre giorni fa — che e la domanda vera
  // (Cristian: "non so se ha pulito i panni, se si sono asciugati, se la
  // polvere e stata svuotata"). Si leggono gli ultimi tre giorni di quei due
  // sensori e si cerca l'ultima volta che hanno lavorato davvero.
  async _caricaBase() {
    const ids = [this._e("sensor:self_wash_base_status"), this._e("sensor:auto_empty_status")].filter(Boolean);
    if (!ids.length || !this._hass) return;
    const chiave = ids.join("|");
    if (this._baseKey === chiave && Date.now() - (this._baseTs || 0) < 120000) return;
    this._baseKey = chiave;
    this._baseTs = Date.now();
    try {
      const fine = new Date();
      const inizio = new Date(fine.getTime() - 3 * 86400000);
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: inizio.toISOString(), end_time: fine.toISOString(),
        entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false,
      });
      const storia = {};
      ids.forEach(id => {
        storia[id] = ((res && res[id]) || []).map(x => ({
          t: x.lu !== undefined ? x.lu * 1000 : new Date(x.last_updated || x.last_changed || x.lc).getTime(),
          s: x.s !== undefined ? x.s : x.state,
        })).filter(x => isFinite(x.t)).sort((a, b) => a.t - b.t);
      });
      this._baseStoria = storia;
    } catch (e) {
      this._baseStoria = null;
    }
    if (this._foglio && this._foglio.aperto()) this._disegnaFoglio();
  }

  // L'ultima volta che quel sensore e stato in uno di quegli stati: quando ha
  // finito e quanto e durata.
  _ultimoLavoro(id, stati) {
    const punti = (this._baseStoria || {})[id];
    if (!punti || !punti.length) return null;
    let fine = null, inizio = null, durata = 0, inCorso = false;
    for (let i = punti.length - 1; i >= 0; i--) {
      if (stati.includes(punti[i].s)) {
        fine = i + 1 < punti.length ? punti[i + 1].t : Date.now();
        inCorso = i + 1 >= punti.length;
        // Un lavaggio vero non e un blocco solo: il robot lava, si ferma un
        // minuto, rilava. Sono tre "washing" separati da due "idle" brevi, e
        // contarne uno solo faceva dire "4 minuti" a un lavaggio da dieci.
        // Le pause sotto i sei minuti fanno parte dello stesso lavoro.
        let j = i;
        while (j > 0) {
          if (stati.includes(punti[j - 1].s)) { j--; continue; }
          if (j - 2 >= 0 && stati.includes(punti[j - 2].s) && (punti[j].t - punti[j - 1].t) < 360000) { j -= 2; continue; }
          break;
        }
        inizio = punti[j].t;
        durata = Math.round((fine - inizio) / 60000);
        break;
      }
    }
    return fine ? { fine, inizio, durata, inCorso } : null;
  }

  // C'E QUALCOSA CHE NON VA IN BASE? La stessa domanda serve in tre posti —
  // la tendina, la tessera sulla pagina e la riga "Serve qualcosa?" della
  // Home — quindi la risposta si calcola qui, una volta sola.
  guaioBase() {
    try {
      const g = this._righeBase().find(r => r.guai);
      return g ? { t: g.t, s: g.s, az: g.az || null } : null;
    } catch (e) {
      return null;
    }
  }

  // L'asciugatura in corso: quando finisce, e il tasto per fermarla prima.
  _rigaAsciugaOra(a) {
    const ora = new Date(a.fine).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const min = Math.max(1, Math.round((a.fine - Date.now()) / 60000));
    const resta = min >= 60 ? Math.round(min / 60) + (Math.round(min / 60) === 1 ? " ora" : " ore") : min + " minuti";
    const stop = this._e(this._k(["button:stop_dry", "button:stop_drying"]));
    return { i: "mdi:weather-windy", c: "#ffb020", t: "Sta asciugando i panni",
      s: "partita " + frbDa(a.da) + " \u00b7 finisce verso le " + ora + ", fra " + resta,
      az: stop ? { e: stop, t: "Ferma" } : null };
  }

  // Le righe della base: panni, asciugatura, polvere, acqua, detersivo.
  // I due robot raccontano la stessa cosa in due modi diversi, e tutti e due
  // vanno letti:
  //  - il Dreame ha un sensore che dice cosa sta facendo la base adesso
  //    ("washing", "drying"), e il quando si ricava dallo storico;
  //  - lo Xiaomi non ha quel sensore, ma manda un EVENTO ogni volta che
  //    finisce un lavoro (panni lavati, panni asciutti, polvere svuotata) e
  //    quell'evento porta con se l'ora esatta: piu preciso dello storico.
  _righeBase() {
    const out = [];
    const asciugaOra = frbAsciugaOra(k => this._st(k));
    const lavId = this._e("sensor:self_wash_base_status");
    const lav = lavId && this._hass.states[lavId];
    const asciuga = this._st("sensor:dry_left_time");
    // L'ora dell'ultimo evento: lo stato di un'entita "event" e il momento in
    // cui e successo.
    const quandoEv = k => {
      const s = this._st(k);
      const ms = s ? Date.parse(s.state) : NaN;
      return isFinite(ms) ? ms : null;
    };

    if (lav) {
      const s = String(lav.state);
      const testo = FRB_LAVAGGIO[s] || s;
      if (["washing", "drying", "adding_water", "clean_add_water"].includes(s)) {
        const resta = s === "drying" && asciuga && +asciuga.state > 0
          ? " \u00b7 finisce fra " + Math.round(+asciuga.state / 60) + "h" : "";
        out.push({ i: s === "drying" ? "mdi:weather-windy" : "mdi:water-sync", c: "#ffb020",
          t: testo.charAt(0).toUpperCase() + testo.slice(1), s: "in questo momento" + resta });
      } else if (asciugaOra) {
        out.push(this._rigaAsciugaOra(asciugaOra));
        const l = this._ultimoLavoro(lavId, ["washing"]);
        if (l) out.push({ i: "mdi:water-sync", c: "#4ade80", t: "Panni lavati",
          s: frbDa(l.fine) + (l.durata ? " \u00b7 " + l.durata + " minuti di lavaggio" : "") });
      } else {
        const l = this._ultimoLavoro(lavId, ["washing"]);
        const a = this._ultimoLavoro(lavId, ["drying"]);
        const mai = this._baseStoria ? "mai, negli ultimi tre giorni" : "sto guardando\u2026";
        out.push({ i: "mdi:water-sync", c: l ? "#4ade80" : "#93a1b0", t: "Panni lavati",
          s: l ? frbDa(l.fine) + (l.durata ? " \u00b7 " + l.durata + " minuti di lavaggio" : "") : mai });
        const bagnati = l && (!a || a.fine < l.fine) && (Date.now() - l.fine) > 3 * 3600000;
        out.push({ i: "mdi:weather-windy", c: bagnati ? "#ff8a3d" : a ? "#4ade80" : "#93a1b0", t: "Panni asciugati",
          s: (a ? frbDa(a.fine) + (a.durata ? " \u00b7 " + (a.durata >= 60 ? Math.round(a.durata / 60) + " ore" : a.durata + " minuti") + " di asciugatura" : "") : mai)
            + (bagnati ? " \u00b7 dall'ultimo lavaggio non risulta asciugatura" : ""),
          guai: !!bagnati,
          az: bagnati ? { e: this._e(this._k(["button:start_dry", "button:manual_drying"])), t: "Asciugali adesso" } : null });
      }
    } else {
      // Xiaomi: gli eventi della base.
      const lavato = quandoEv("event:mop_wash_complete");
      const asciutto = quandoEv("event:dry_complete");
      if (lavato) out.push({ i: "mdi:water-sync", c: "#4ade80", t: "Panni lavati", s: frbDa(lavato) });
      if (asciugaOra) out.push(this._rigaAsciugaOra(asciugaOra));
      else if (asciutto) {
        // Asciugatura piu vecchia dell'ultimo lavaggio = i panni sono rimasti
        // bagnati, ed e la cosa che porta i cattivi odori. Ma i panni si
        // lavano anche DURANTE la pulizia, ogni tot metri quadri (39 volte in
        // una settimana, su questo robot): appena finito e normale che
        // l'asciugatura non sia ancora partita. Si avvisa solo dopo tre ore,
        // se no la riga sarebbe arancione quasi sempre e non direbbe niente.
        const bagnati = lavato && asciutto < lavato && (Date.now() - lavato) > 3 * 3600000;
        // Quando c'e qualcosa che non va, il rimedio sta nella riga stessa: il
        // tasto per asciugarli adesso, senza andarlo a cercare fra i comandi.
        out.push({ i: "mdi:weather-windy", c: bagnati ? "#ff8a3d" : "#4ade80", t: "Panni asciugati",
          s: frbDa(asciutto) + (bagnati ? " \u00b7 dall'ultimo lavaggio non risulta asciugatura" : ""),
          guai: !!bagnati,
          az: bagnati ? { e: this._e(this._k(["button:start_dry", "button:manual_drying"])), t: "Asciugali adesso" } : null });
      }
    }

    // Il panno: il Dreame dice installed/removed, lo Xiaomi acceso/spento.
    const panno = this._st("sensor:mop_pad") || this._st("binary_sensor:mop_status");
    if (panno) {
      const su = /^(inst|on|vero|true)/i.test(String(panno.state));
      out.push({ i: "mdi:texture-box", c: su ? "#4ade80" : "#93a1b0", t: "Panno",
        s: su ? "montato sul robot" : "tolto" });
    }

    const svId = this._e("sensor:auto_empty_status");
    const sv = svId && this._hass.states[svId];
    if (sv) {
      const s = String(sv.state);
      if (s === "active") {
        out.push({ i: "mdi:delete-empty-outline", c: "#ffb020", t: "Polvere", s: "la sta svuotando adesso" });
      } else {
        const v = this._ultimoLavoro(svId, ["active"]);
        out.push({ i: "mdi:delete-empty-outline", c: v ? "#4ade80" : "#93a1b0", t: "Polvere svuotata",
          s: v ? frbDa(v.fine) : (this._baseStoria ? "mai, negli ultimi tre giorni" : "sto guardando\u2026") });
      }
    } else {
      const svuotato = quandoEv("event:dust_arrest_complete");
      if (svuotato) out.push({ i: "mdi:delete-empty-outline", c: "#4ade80", t: "Polvere svuotata", s: frbDa(svuotato) });
    }

    const acqua = this._st("sensor:low_water_warning");
    if (acqua && !/no_warning|no warning|none/i.test(acqua.state)) {
      out.push({ i: "mdi:water-alert-outline", c: "#ff8a3d", t: "Acqua", s: "il serbatoio e da riempire", guai: true });
    }
    const det = this._st("sensor:detergent_left") || this._st("sensor:detergent_left_level");
    if (det && isFinite(+det.state)) {
      const n = Math.round(+det.state);
      out.push({ i: "mdi:bottle-tonic-outline", c: n < 15 ? "#ff8a3d" : "#4ade80", t: "Detersivo",
        s: "ne resta il " + n + "%" });
    }
    // Il sacchetto della polvere: quando e pieno il robot non svuota piu, e
    // te ne accorgi solo quando la spazzatura resta dentro.
    const sac = this._st("sensor:dust_bag_life_level");
    if (sac && isFinite(+sac.state)) {
      const n = Math.round(+sac.state);
      out.push({ i: "mdi:sack", c: n < 15 ? "#ff8a3d" : "#4ade80", t: "Sacchetto della polvere",
        s: n <= 0 ? "pieno: va cambiato" : "ancora il " + n + "%", guai: n < 15 });
    }
    return out;
  }

  // =========================================================================
  // CHIEDERE AL ROBOT
  // Gli stessi dati che stanno nelle tendine, ma a domanda. Non c'e niente di
  // inventato: le risposte si costruiscono con i numeri che il robot ha gia
  // dato, e quando non c'e la risposta lo si dice. Se nella card e stato
  // scelto un assistente, le domande che non rientrano nei casi noti vanno a
  // lui — ma coi fatti gia calcolati e l'ordine di non inventare numeri.
  // =========================================================================
  _fattiRobot() {
    const h = this._hass;
    const st = h.states[this._cfg.entity];
    const f = {};
    f.nome = this._nome();
    f.stato = st ? (FRB_STATI[st.state] || st.state) : "non risponde";
    const prog = this._programma();
    f.programma = prog.testo || "";
    f.fase = prog.fase || "";
    const bat = st ? this._batteria(st) : null;
    f.batteria = bat != null ? bat + "%" : "";
    const u = this._ultima();
    f.ultima = u ? fhQuando(u.toISOString()) : "";
    const tutte = this._pulizie();
    f.ultimaPulizia = tutte[0] || null;
    const settimana = tutte.filter(x => Date.now() - x.t.getTime() < 7 * 86400000);
    f.settimana = settimana.length;
    f.mqSettimana = settimana.reduce((a, x) => a + (x.mq || 0), 0);
    f.minSettimana = Math.round(settimana.reduce((a, x) => a + (x.sec || 0), 0) / 60);
    f.base = this._righeBase();
    const stanza = this._st("sensor:current_room");
    f.stanza = stanza ? stanza.state : "";
    f.stanze = this._stanze().map(s => s.nome);
    const g = this._st("sensor:fault") || this._st("sensor:error");
    f.guasto = g && !/^(no_error|none|0|no_fault|nessun)/i.test(String(g.state))
      ? (g.attributes.description || String(g.state)) : "";
    f.ricambi = [];
    FRB_RICAMBI.forEach(r => (this._entita()[r.k] || []).forEach((e, i) => {
      const s = h.states[e];
      const n = s ? parseFloat(s.state) : NaN;
      if (!isNaN(n)) f.ricambi.push({ nome: r.t[i] || r.t[0], perc: Math.round(n) });
    }));
    const adesso = this._adesso();
    f.adesso = adesso;
    return f;
  }

  // La scheda che si passa all'assistente: fatti, non frasi.
  _schedaRobot(f) {
    const r = [
      "Robot: " + f.nome,
      "Stato adesso: " + f.stato + (f.fase ? " (" + f.fase + ")" : ""),
      f.programma ? "Programma impostato: " + f.programma : "",
      f.batteria ? "Batteria: " + f.batteria : "",
      f.ultima ? "Ultima pulizia: " + f.ultima : "",
      f.ultimaPulizia ? "Ultimo giro: " + (f.ultimaPulizia.mq || 0) + " m2 in " +
        Math.round((f.ultimaPulizia.sec || 0) / 60) + " minuti" +
        (f.ultimaPulizia.ok === false ? " (non finita)" : "") : "",
      "Pulizie negli ultimi 7 giorni: " + f.settimana + " (" + f.mqSettimana + " m2, " + f.minSettimana + " minuti)",
      f.stanza ? "Stanza in cui si trova: " + f.stanza : "",
      f.stanze.length ? "Stanze che conosce: " + f.stanze.join(", ") : "",
      f.guasto ? "Guasto in corso: " + f.guasto : "Nessun guasto",
    ];
    f.base.forEach(b => r.push(b.t + ": " + b.s));
    f.ricambi.forEach(x => r.push("Ricambio " + x.nome + ": " + x.perc + "%"));
    return r.filter(Boolean).join("\n");
  }

  // Capire la domanda: si cercano le parole che contano. Niente di magico, e
  // quando non si capisce lo si dice invece di rispondere a caso.
  _capisciRobot(testo) {
    const q = String(testo || "").toLowerCase()
      .replace(/[àá]/g, "a").replace(/[èé]/g, "e").replace(/[ìí]/g, "i").replace(/[òó]/g, "o").replace(/[ùú]/g, "u");
    if (/asciug/.test(q)) return "asciugatura";
    if (/pann|mocio|straccio|moci/.test(q)) return "panni";
    if (/polver|svuot|sacchett|cestin|bidon/.test(q)) return "polvere";
    if (/acqua|detersiv|serbatoi/.test(q)) return "liquidi";
    if (/batteri|carica|carico/.test(q)) return "batteria";
    if (/guast|problem|errore|bloccat|incastr|fermo perche/.test(q)) return "guasto";
    if (/ricambi|spazzol|filtro|consumabil|cambiare/.test(q)) return "ricambi";
    if (/dove sei|dove ti trovi|in che stanza|dove stai/.test(q)) return "dove";
    if (/quali stanze|che stanze|quante stanze|stanze conosci/.test(q)) return "stanze";
    if (/quante volte|quanti giri|settimana|quante pulizie/.test(q)) return "quante";
    if (/quanti metri|quanto hai pulito|mq|metri quadr|area/.test(q)) return "area";
    if (/programma|modalita|aspiri|lavi|come pulisci|cosa stai facendo|che fai/.test(q)) return "programma";
    if (/quando.*(pulit|passat|finito)|ultima pulizia|ultimo giro|hai pulito/.test(q)) return "ultima";
    if (/come stai|tutto bene|tutto a posto|come va/.test(q)) return "riassunto";
    return null;
  }

  _rispostaRobot(intento, f) {
    const b = n => (f.base.find(x => new RegExp(n, "i").test(x.t)) || {}).s || "";
    if (intento === "panni") {
      const l = b("Panni lavati"), a = b("Panni asciugati"), pa = b("^Panno$");
      if (!l && !a) return "Di questo non so dirti niente: la mia base non manda a Home Assistant quando lava i panni.";
      return [l ? "Panni lavati <b>" + l + "</b>." : "", a ? "Asciugati <b>" + a + "</b>." : "",
        pa ? "Il panno adesso e <b>" + pa + "</b>." : ""].filter(Boolean).join(" ");
    }
    if (intento === "asciugatura") {
      const a = b("Panni asciugati");
      return a ? "Panni asciugati <b>" + a + "</b>."
        : "Non ho un dato sull'asciugatura: questa base non lo dice a Home Assistant.";
    }
    if (intento === "polvere") {
      const v = b("Polvere"), s = b("Sacchetto");
      if (!v && !s) return "Non so dirti quando ho svuotato la polvere: la mia base non lo manda.";
      return [v ? "Polvere svuotata <b>" + v + "</b>." : "", s ? "Sacchetto: <b>" + s + "</b>." : ""].filter(Boolean).join(" ");
    }
    if (intento === "liquidi") {
      const acqua = b("Acqua"), det = b("Detersivo");
      if (!acqua && !det) return "Acqua e detersivo non li misuro.";
      return [acqua ? "Acqua: <b>" + acqua + "</b>." : "Il serbatoio non segnala problemi.",
        det ? "Detersivo: <b>" + det + "</b>." : ""].filter(Boolean).join(" ");
    }
    if (intento === "batteria") {
      if (!f.batteria) return "La batteria non riesco a leggerla.";
      const n = parseInt(f.batteria, 10);
      return "Sono al <b>" + f.batteria + "</b>" + (n >= 95 ? ", carico." : n < 25 ? ": mi conviene tornare in base." : ".");
    }
    if (intento === "guasto") {
      return f.guasto ? "Si, c'e un problema: <b>" + fhEsc(f.guasto) + "</b>."
        : "No, nessun guasto: sono <b>" + f.stato.toLowerCase() + "</b>.";
    }
    if (intento === "ricambi") {
      if (!f.ricambi.length) return "Questo robot non dice a che punto sono i ricambi.";
      const ord = f.ricambi.slice().sort((a, c) => a.perc - c.perc);
      const testa = ord.slice(0, 3).map(x => x.nome.toLowerCase() + " <b>" + x.perc + "%</b>").join(", ");
      return (ord[0].perc < 15 ? "Il piu consumato e messo male: " : "I piu consumati: ") + testa + ".";
    }
    if (intento === "dove") {
      if (f.stanza) return "Sono in <b>" + fhEsc(f.stanza) + "</b>.";
      return "Non dico in che stanza sono. Adesso sono <b>" + f.stato.toLowerCase() + "</b>.";
    }
    if (intento === "stanze") {
      return f.stanze.length ? "Conosco " + f.stanze.length + " stanze: <b>" + f.stanze.join("</b>, <b>") + "</b>."
        : "Non ho una mappa a stanze: pulisco tutta la casa.";
    }
    if (intento === "quante") {
      if (!f.settimana) return "Negli ultimi sette giorni non risulta nessuna pulizia.";
      return "Negli ultimi sette giorni ho pulito <b>" + f.settimana +
        (f.settimana === 1 ? " volta" : " volte") + "</b>" +
        (f.mqSettimana ? ", <b>" + f.mqSettimana + " m\u00b2</b> in tutto" : "") +
        (f.minSettimana ? " e <b>" + f.minSettimana + " minuti</b> di lavoro" : "") + ".";
    }
    if (intento === "area") {
      if (!isNaN(f.adesso.mq) && f.stato === "Sta pulendo") return "Finora ho fatto <b>" + f.adesso.mq + " m\u00b2</b> in " + f.adesso.min + " minuti.";
      const u = f.ultimaPulizia;
      if (!u) return "Non ho il dato dei metri quadri.";
      return "L'ultima volta ho fatto <b>" + (u.mq || 0) + " m\u00b2</b> in <b>" +
        Math.round((u.sec || 0) / 60) + " minuti</b>" + (u.ok === false ? ", ma non ho finito" : "") + ".";
    }
    if (intento === "programma") {
      const pezzi = [];
      if (f.programma) pezzi.push("Sono impostato su <b>" + fhEsc(f.programma) + "</b>");
      pezzi.push(f.fase ? "adesso <b>" + fhEsc(f.fase) + "</b>" : "adesso sono <b>" + f.stato.toLowerCase() + "</b>");
      return pezzi.join(", ") + ".";
    }
    if (intento === "ultima") {
      if (!f.ultima) return "Non risulta nessuna pulizia in memoria.";
      const u = f.ultimaPulizia;
      return "Ho pulito <b>" + f.ultima + "</b>" + (u ? ": " + (u.mq || 0) + " m\u00b2 in " +
        Math.round((u.sec || 0) / 60) + " minuti" + (u.ok === false ? ", senza finire" : "") : "") + ".";
    }
    if (intento === "riassunto") {
      const parti = ["Sono <b>" + f.stato.toLowerCase() + "</b>"];
      if (f.batteria) parti.push("batteria " + f.batteria);
      if (f.ultima) parti.push("ultima pulizia " + f.ultima);
      const l = (f.base.find(x => /Panni lavati/.test(x.t)) || {}).s;
      if (l) parti.push("panni lavati " + l);
      if (f.guasto) parti.push("ma c'e un problema: " + f.guasto);
      return parti.join(" \u00b7 ") + ".";
    }
    return null;
  }

  async _chiediRobot(testo) {
    if (!testo) return;
    this._chat = (this._chat || []).concat([{ chi: "io", t: testo }]);
    this._disegnaFoglio();
    const f = this._fattiRobot();
    let risposta = this._rispostaRobot(this._capisciRobot(testo), f);
    if (!risposta && this._cfg.agente) {
      this._chat = this._chat.concat([{ chi: "lui", t: "ci penso\u2026" }]);
      this._disegnaFoglio();
      risposta = await this._agenteRobot(testo, f);
      this._chat.pop();
    }
    if (!risposta) {
      risposta = "Questa non l'ho capita. Prova con: <b>quando hai lavato i panni</b>, " +
        "<b>hai svuotato la polvere</b>, <b>quando hai pulito</b>, <b>quante volte questa settimana</b>, " +
        "<b>come stai</b>.";
    }
    this._chat = this._chat.concat([{ chi: "lui", t: risposta }]);
    this._disegnaFoglio();
  }

  async _agenteRobot(testo, f) {
    const ag = this._cfg.agente;
    if (!ag || !this._hass) return null;
    const prompt = [
      "Sei " + f.nome + ", un robot aspirapolvere di casa che parla in prima persona.",
      "Rispondi in italiano, al massimo due frasi, tono semplice.",
      "Usa SOLO i dati qui sotto. Se la risposta non c'e nei dati dillo chiaramente",
      "e non inventare nessun numero.",
      "",
      "DATI:",
      this._schedaRobot(f),
      "",
      "DOMANDA: " + testo,
    ].join("\n");
    try {
      const res = await this._hass.callWS({ type: "conversation/process", text: prompt, agent_id: ag });
      const r = res && res.response && res.response.speech && res.response.speech.plain
        && res.response.speech.plain.speech;
      return (r && fhEsc(String(r).trim())) || null;
    } catch (e) {
      return null;
    }
  }

  _sezDomande() {
    const pronte = [
      "Quando hai lavato i panni?",
      "I panni sono asciutti?",
      "Hai svuotato la polvere?",
      "Quando hai pulito?",
      "Quante volte questa settimana?",
      "Come stai?",
    ];
    const chat = (this._chat || []).map(m => m.chi === "io"
      ? `<div class="frb-bolla frb-mia">${fhEsc(m.t)}</div>`
      : `<div class="frb-bolla frb-sua">${m.t}</div>`).join("");
    return `<div class="fhf-sez">
      <div class="frb-chat">${chat || `<div class="frb-bolla frb-sua">Chiedimi quello che vuoi:
        i panni, la polvere, quando ho pulito l'ultima volta, come sto.</div>`}</div>
      <div class="frb-chips">${pronte.map(d => `<button type="button" class="frb-chip" data-dom="${fhEsc(d)}">${fhEsc(d)}</button>`).join("")}</div>
      <div class="frb-riga-chiedi">
        <input data-chiedi placeholder="scrivi la tua domanda" autocomplete="off">
        <button type="button" class="frb-chip sel" data-invia>Chiedi</button>
      </div>
      ${this._cfg.agente ? "" : `<div class="fh-note" style="margin-top:8px">Rispondo con i miei dati.
        Per le domande libere si puo collegare un assistente nella configurazione della card.</div>`}</div>`;
  }

  // Quanto ha pulito finora: Xiaomi Home da i secondi, Dreame i minuti.
  _adesso() {
    const a = this._st("sensor:cleaning_area") || this._st("sensor:cleaned_area");
    const t = this._st("sensor:cleaning_time");
    const min = t ? (t.attributes.unit_of_measurement === "min" ? +t.state : +t.state / 60) : NaN;
    return { mq: a ? Math.round(+a.state) : NaN, min: Math.round(min) };
  }
  _st(k, i) {
    const e = this._e(k, i);
    const s = e ? this._hass.states[e] : null;
    return s && !["unavailable", "unknown"].includes(s.state) ? s : null;
  }

  _batteria(st) {
    if (st.attributes.battery_level != null) return Math.round(st.attributes.battery_level);
    if (typeof st.attributes.battery === "number") return Math.round(st.attributes.battery);
    const h = this._hass, reg = h.entities || {};
    const dev = (reg[this._cfg.entity] || {}).device_id;
    if (!dev) return null;
    const b = Object.keys(this._entita()).filter(k => k.startsWith("sensor:")).map(k => this._e(k))
      .find(e => h.states[e] && h.states[e].attributes.device_class === "battery");
    const n = b ? parseFloat(h.states[b].state) : NaN;
    return isNaN(n) ? null : Math.round(n);
  }

  // Le ultime pulizie che il robot stesso ricorda ("02605_32000_1": 2605
  // secondi, 32 m²). Letto a pezzi e non come JSON: Home Assistant taglia gli
  // stati oltre i 255 caratteri e l'ultimo pezzo arriva spezzato.
  _pulizie() {
    const st = this._st("sensor:clean_record");
    const out = [];
    if (st) String(st.state).replace(/"label":"(\d+)_(\d+)_\d+","stime":(\d{10})\b/g, (_, s, a, t) => {
      out.push({ sec: +s, mq: Math.round(+a / 1000), t: new Date(+t * 1000) });
    });
    // Dreame: { "09-13 22:20": { timestamp, cleaning_time: "31 min", cleaned_area: "24 m²" } }
    // e la mappa di quel giro fra le immagini della camera mappa.
    const dh = this._hass.states[this._e("sensor:cleaning_history")];
    if (!out.length && dh) {
      const mp = this._hass.states[this._mappaId()];
      const foto = (mp && mp.attributes.cleaning_history_picture) || {};
      Object.keys(dh.attributes).forEach(k => {
        const v = dh.attributes[k];
        if (!v || typeof v !== "object" || !v.timestamp) return;
        const chiave = k.replace("-", "/");
        const img = Object.keys(foto).find(f => f.includes(chiave));
        const panno = String(v.mop_pad || "");
        out.push({ sec: (parseInt(v.cleaning_time, 10) || 0) * 60, mq: parseInt(v.cleaned_area, 10) || 0,
          t: new Date(v.timestamp * 1000), ok: v.completed !== false, img: img ? foto[img] : "",
          fase: panno ? (/^inst/i.test(panno) ? "lavaggio" : "aspirazione") : "",
          metodo: /custom/i.test(String(v.cleanup_method || "")) ? "stanze scelte" : "" });
      });
      out.sort((a, b) => b.t - a.t);
    }
    return out;
  }
  // CHI HA FERMATO LA PULIZIA. Il giro finito a meta non spiega niente da
  // solo. Il registro di Home Assistant invece tiene, per ogni cambio di
  // stato, il contesto di chi l'ha provocato: se e stata un'automazione ne
  // esce il nome, se e stato qualcuno dall'app esce l'utente.
  async _perche(i) {
    const x = this._pulizie()[i];
    if (!x) return;
    const h = this._hass;
    this._motivi = this._motivi || {};
    const chiave = +x.t;
    if (this._motivi[chiave] !== undefined) return;
    this._motivi[chiave] = "cerco…";
    this._disegnaFoglio();
    const fine = new Date(x.t.getTime() + (x.sec || 0) * 1000);
    let testo = "";
    try {
      const ev = await h.callWS({
        type: "logbook/get_events",
        start_time: new Date(fine.getTime() - 5 * 60000).toISOString(),
        end_time: new Date(fine.getTime() + 5 * 60000).toISOString(),
        entity_ids: [this._cfg.entity],
      });
      // Il primo ritorno alla base dopo la fine: e quello il momento buono.
      const r = (ev || []).filter(e => ["returning", "docked", "idle", "paused"].includes(e.state))
        .sort((a, b) => (a.when || 0) - (b.when || 0))[0];
      const ora = r && r.when ? new Date(r.when * 1000).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";
      const nome = r && (r.context_entity_id_name || r.context_name || "");
      if (r && r.context_entity_id && String(r.context_entity_id).startsWith("automation.")) {
        testo = `l'ha richiamato l'automazione «${nome || r.context_entity_id}»${ora ? " alle " + ora : ""}`;
      } else if (r && r.context_user_id) {
        testo = `l'ha richiamato qualcuno dall'app${ora ? " alle " + ora : ""}`;
      } else if (r && nome) {
        testo = `rientrato per «${nome}»${ora ? " alle " + ora : ""}`;
      }
    } catch (e) {
      testo = "";
    }
    if (!testo) {
      // Niente contesto: guardo se si e fermato per conto suo.
      const g = this._st("sensor:fault") || this._st("sensor:error");
      const b = this._batteria(h.states[this._cfg.entity]);
      if (g && !["no_error", "none", "0", "no_fault"].includes(String(g.state))) testo = "guasto: " + g.state;
      else if (b != null && b < 20) testo = "e tornato a caricarsi, la batteria era agli sgoccioli";
      else testo = "e tornato alla base prima di finire, ma nel registro non c'e chi l'ha mandato";
    }
    this._motivi[chiave] = testo;
    this._disegnaFoglio();
  }

  // Quando ha pulito l'ultima volta: l'helper che segna ogni partenza (tiene
  // conto anche della pulizia programmata dall'app), se no quello che dice lui.
  _ultima() {
    const h = this._hass;
    const u = this._cfg.ultima && h.states[this._cfg.ultima];
    if (u && u.attributes.timestamp) return new Date(u.attributes.timestamp * 1000);
    const p = this._pulizie()[0];
    if (p) return p.t;
    const s = this._st("sensor:last_clean_time");
    const n = s ? parseInt(s.state, 10) : NaN;
    return n > 1e9 ? new Date(n * 1000) : null;
  }
  _stanze() {
    const nomi = this._cfg.stanze || {};
    const out = [];
    const v = this._hass.states[this._cfg.entity];
    const rooms = v && v.attributes.rooms;
    if (rooms && typeof rooms === "object") {
      const lista = rooms[v.attributes.selected_map] || Object.values(rooms)[0] || [];
      lista.forEach(r => out.push({ id: String(r.id), nome: nomi[r.id] || r.name || "Stanza " + r.id }));
      return out;
    }
    const st = this._st("sensor:room_information");
    if (st) String(st.state).replace(/"id":(\d+),"name":"([^"]*)"/g, (_, id, n) => {
      out.push({ id, nome: nomi[id] || n || "Stanza " + id });
    });
    // Un robot che non dice le sue stanze (il robot sala) le puo avere dalla
    // configurazione: stanze: { "3": "Cucina", "5": "Sala" }.
    if (!st) Object.keys(nomi).forEach(id => out.push({ id, nome: nomi[id] }));
    return out;
  }
  _programmi() {
    const st = this._st("sensor:order_clean");
    const out = [];
    // "time":3102 e 0x0C1E: 12 e 30.
    if (st) String(st.state).replace(/"on":(true|false),"week":(\d+),"time":(\d+)/g, (_, on, w, t) => {
      const ora = (+t) >> 8, min = (+t) & 255;
      if (ora < 24 && min < 60) out.push({ on: on === "true", tutti: ((+w) & 127) === 127, ora, min });
    });
    return out;
  }
  _scene() {
    const h = this._hass;
    const lista = Array.isArray(this._cfg.scene) ? this._cfg.scene
      : Object.keys(h.states).filter(e => e.startsWith("automation.robot_") && !e.includes("registro"));
    return lista.filter(e => h.states[e]);
  }

  _update() {
    const h = this._hass;
    if (!h) return;
    const st = h.states[this._cfg.entity];
    const f = st ? Number(st.attributes.supported_features) || 0 : 0;
    const stato = st ? st.state : "unavailable";
    const tono = { cleaning: "verde", returning: "ambra", paused: "ambra", error: "rosso", unavailable: "grigio" }[stato] || "blu";
    const bat = st ? this._batteria(st) : null;
    const pulisce = stato === "cleaning";
    const tasti = [];
    if (st && !pulisce && (f & 8192)) tasti.push({ k: "start", i: "mdi:play", t: stato === "paused" ? "Riprendi" : "Avvia", pieno: true });
    const dp = this._doppia();
    if (st && dp && !dp.inCorso && stato === "docked") tasti.push({ k: "doppia", i: "mdi:water-plus", t: "Aspira + lava" });
    if (pulisce && (f & 4)) tasti.push({ k: "pause", i: "mdi:pause", t: "Pausa", pieno: true });
    else if (pulisce && (f & 8)) tasti.push({ k: "stop", i: "mdi:stop", t: "Ferma", pieno: true });
    if (st && stato !== "docked" && (f & 16)) tasti.push({ k: "return_to_base", i: "mdi:home-import-outline", t: "Base" });
    let sub = "";
    if (!st) sub = "Robot non trovato";
    else if (pulisce) {
      const ad = this._adesso();
      sub = [ad.mq > 0 ? ad.mq + " m²" : "", ad.min > 0 ? ad.min + " min" : ""].filter(Boolean).join(" · ");
    } else {
      const u = this._ultima();
      if (u && frbFa(u)) sub = "Ultima pulizia " + frbFa(u) + " fa";
    }
    // Il programma davanti a tutto: e la risposta alla domanda "adesso cosa
    // fa se parte?". Mentre lavora, al posto del programma si legge la fase.
    const pr = this._programma();
    if (pr.testo) {
      const testa = pulisce && pr.fase ? pr.testo + " · " + pr.fase : pr.testo;
      sub = testa + (sub ? " · " + sub : "");
    }
    if (dp && dp.inCorso) sub = "Prima aspira, poi lava" + (sub ? " · " + sub : "");
    if (!sub && st) sub = st.attributes.fan_speed ? "Aspirazione: " + st.attributes.fan_speed : st.attributes.status || "";
    const firma = [stato, bat, sub, tasti.map(x => x.k).join()].join("|");
    if (!this._built) {
      this._built = true;
      this.innerHTML = `<style>${FHT_CSS}${FRB_CSS}</style>
        <div class="fht tap" data-card>
          <div class="fht-top">${frbDisegno()}<span class="fht-pill" data-pill></span></div>
          <div class="fht-testo"><div class="fht-title" data-titolo></div>
            <div class="fht-stato" data-stato></div><div class="fht-sub" data-sub></div></div>
          <div class="fht-btns" data-btns></div>
        </div>`;
      this.querySelector("[data-card]").addEventListener("click", () => { fhVibra(8); this._apri(); });
    }
    if (this._firma === firma) return;
    this._firma = firma;
    const card = this.querySelector("[data-card]");
    card.dataset.tono = tono;
    card.dataset.pulisce = pulisce ? "1" : "0";
    this.querySelector("[data-titolo]").textContent = this._nome();
    const pill = this.querySelector("[data-pill]");
    pill.hidden = bat == null;
    pill.innerHTML = bat != null
      ? `<ha-icon icon="${bat > 90 ? "mdi:battery" : bat < 20 ? "mdi:battery-alert-variant-outline" : "mdi:battery-" + Math.max(10, Math.round(bat / 10) * 10)}"></ha-icon>${bat}%` : "";
    this.querySelector("[data-stato]").textContent = FRB_STATI[stato] || stato;
    this.querySelector("[data-sub]").textContent = sub;
    const box = this.querySelector("[data-btns]");
    box.innerHTML = tasti.map(x => `<button type="button" class="fht-btn${x.pieno ? " pieno" : ""}" data-k="${x.k}"><ha-icon icon="${x.i}"></ha-icon>${x.t}</button>`).join("");
    box.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      fhVibra(10);
      // script.turn_on e non script.<nome>: lo script aspetta la fine del giro,
      // e il tocco non deve restare appeso per un'ora.
      if (b.dataset.k === "doppia") this._hass.callService("script", "turn_on", { entity_id: this._cfg.doppia });
      else this._hass.callService("vacuum", b.dataset.k, { entity_id: this._cfg.entity });
    }));
  }

  // ---------------------------------------------------------------- foglio
  _apri() {
    if (!this._hass) return;
    this._foglio = fhFoglio(this._nome(), !!this.closest(".fh-app.chiaro"));
    this._sel = new Set();
    this._storica = null;
    const c = this._foglio.corpo;
    // Le tendine restano come le ha lasciate l'ultima volta: di suo e aperta
    // solo la mappa, che e il motivo per cui questo foglio si apre.
    if (!this._aperte) this._aperte = new Set(["mappa"]);
    c.innerHTML = `<style>${FRB_FOGLIO_CSS}</style>
      <div data-s="stato"></div><div data-s="dati"></div><div data-s="cmd"></div>
      ${FRB_TENDINE.map(([n, t, i]) => `<section class="frb-acc${this._aperte.has(n) ? " on" : ""}" data-acc="${n}">
        <button type="button" class="frb-acch" data-acco="${n}">
          <ha-icon icon="${i}"></ha-icon><span>${fhEsc(t)}</span>
          <b class="frb-nota" data-nota></b>
          <ha-icon class="frb-frec" icon="mdi:chevron-down"></ha-icon></button>
        <div class="frb-accc" data-s="${n}"></div></section>`).join("")}
      <button type="button" class="fhf-tasto" data-tutto style="align-self:flex-start">Tutte le impostazioni</button>`;
    c.addEventListener("click", e => this._clic(e));
    // Invio da tastiera: su un telefono e il tasto che si preme per davvero.
    c.addEventListener("keydown", e => {
      if (e.key !== "Enter" || !e.target.hasAttribute("data-chiedi")) return;
      const testo = e.target.value.trim();
      if (!testo) return;
      e.target.value = "";
      this._chiediRobot(testo);
    });
    this._disegnaFoglio();
    this._caricaBase();
    clearInterval(this._timerMappa);
    this._timerMappa = setInterval(() => {
      if (!this._foglio || !this._foglio.aperto()) { clearInterval(this._timerMappa); this._timerMappa = null; return; }
      this._aggiornaMappa();
    }, 5000);
  }

  // Ogni pezzo del foglio si ridisegna solo se e cambiato: lo stato di casa
  // arriva molte volte al secondo, e un tocco a meta ridisegno si perde.
  _sez(nome, html, nota) {
    const el = this._foglio.corpo.querySelector(`[data-s="${nome}"]`);
    if (!el) return;
    const box = el.closest("[data-acc]");
    if (box) {
      // Una tendina senza niente dentro non deve nemmeno comparire.
      const vuota = !html || !String(html).trim();
      box.style.display = vuota ? "none" : "";
      const n = box.querySelector("[data-nota]");
      if (n && n.textContent !== (nota || "")) n.textContent = nota || "";
    }
    if (el.__f === html) return;
    el.__f = html;
    el.innerHTML = html;
  }

  _disegnaFoglio() {
    const h = this._hass;
    const st = h.states[this._cfg.entity];
    const stato = st ? st.state : "unavailable";
    const f = st ? Number(st.attributes.supported_features) || 0 : 0;
    const pulisce = stato === "cleaning";
    const col = { cleaning: "#4ade80", returning: "#ffb020", paused: "#ffb020", error: "#ff5c5c", unavailable: "#93a1b0" }[stato] || "#5aa9ff";

    // Stato in una riga, come in cima all'app.
    const carica = this._st("sensor:charging_state") || this._st("sensor:charging_status");
    const guasto = this._st("sensor:fault") || this._st("sensor:error");
    let extra = "";
    if (stato === "docked" && carica) extra = ["Charging", "charging"].includes(carica.state) ? "in carica" : "carico";
    if (stato === "error" && guasto) extra = guasto.attributes.description || "codice " + guasto.state;
    const asciuga = this._st("sensor:dry_left_time");
    if (asciuga && +asciuga.state > 0) extra = (extra ? extra + " · " : "") + "asciuga i panni";
    const fase = this._programma();
    if (fase.fase && stato === "cleaning") extra = fase.fase + (extra ? " · " + extra : "");
    this._sez("stato", `<div class="frb-stato" style="color:${col}"><i></i>${fhEsc(FRB_STATI[stato] || stato)}${extra ? `<span style="opacity:.7;font-weight:700">· ${fhEsc(extra)}</span>` : ""}</div>`);

    // La mappa: l'immagine vera se c'e, altrimenti le stanze fanno da mappa.
    const stanze = this._stanze();
    const ms = this._mappaId() && h.states[this._mappaId()];
    const tessere = stanze.map((s, i) => `<button type="button" class="frb-st${this._sel.has(s.id) ? " sel" : ""}"
      style="--s-c:${FRB_COLORI[i % FRB_COLORI.length]}" data-stanza="${fhEsc(s.id)}">${fhEsc(s.nome)}</button>`).join("");
    let mappa;
    if (ms && ms.attributes.entity_picture) {
      mappa = `<div class="frb-mappa"><img data-mappa alt="Mappa di ${fhEsc(this._nome())}"></div>
        ${this._storica ? `<div class="frb-chips"><span class="fhf-nota" style="flex:1">Mappa della pulizia di ${fhEsc(this._storica.q)}</span>
          <button type="button" class="frb-chip sel" data-adesso>Mappa di adesso</button></div>` : ""}
        ${stanze.length ? `<div class="fhf-sez"><h4>Tocca le stanze da pulire</h4><div class="frb-chips">${stanze.map(s =>
          `<button type="button" class="frb-chip${this._sel.has(s.id) ? " sel" : ""}" data-stanza="${fhEsc(s.id)}">${fhEsc(s.nome)}</button>`).join("")}</div></div>` : ""}`;
    } else if (stanze.length) {
      mappa = `<div class="fhf-sez"><h4>Tocca le stanze da pulire · niente = tutta la casa</h4>
        <div class="frb-mappa"><div class="frb-stanze">${tessere}</div></div></div>`;
    } else {
      mappa = `<div class="frb-mappa"><div class="frb-vuota">${frbDisegno()}
        <span>Pulisce tutta la casa: questo robot non dice a Home Assistant le sue stanze.</span></div></div>`;
    }
    this._sez("mappa", mappa, stanze.length ? (stanze.length === 1 ? "1 stanza" : stanze.length + " stanze") : "");
    this._sez("domande", this._sezDomande(), (this._chat || []).length ? "" : "panni, polvere, pulizie");
    this._aggiornaMappa();

    // I numeri: batteria, da quanto non pulisce, com'e andata l'ultima volta.
    const dati = [];
    const bat = st ? this._batteria(st) : null;
    if (bat != null) dati.push([bat + "%", "batteria"]);
    const p = this._pulizie()[0];
    if (pulisce) {
      const ad = this._adesso();
      if (!isNaN(ad.mq)) dati.push([ad.mq + " m²", "puliti finora"]);
      if (!isNaN(ad.min)) dati.push([ad.min + " min", "da quando è partito"]);
    } else {
      const u = this._ultima();
      if (u && frbFa(u)) dati.push([frbFa(u), "dall'ultima pulizia"]);
      if (p) dati.push([p.mq + " m²", Math.round(p.sec / 60) + " min l'ultima volta"]);
    }
    this._sez("dati", dati.length ? `<div class="frb-dati">${dati.map(([v, l]) =>
      `<div class="frb-dato"><b>${fhEsc(v)}</b><small>${fhEsc(l)}</small></div>`).join("")}</div>` : "");

    // I comandi grandi. Con delle stanze scelte il tasto principale diventa
    // "Pulisci N stanze"; senza, pulisce tutta la casa.
    const cmd = [];
    const nStanze = this._sel.size;
    if (st && !pulisce && (f & 8192)) {
      if (nStanze && stato !== "paused") cmd.push({ c: "stanze", i: "mdi:floor-plan", t: nStanze === 1 ? "Pulisci la stanza" : "Pulisci " + nStanze + " stanze", pieno: true });
      else cmd.push({ c: "start", i: "mdi:play", t: stato === "paused" ? "Riprendi" : "Pulisci tutto", pieno: true });
      const dp = this._doppia();
      if (dp && !dp.inCorso && stato === "docked") cmd.push({ c: "doppia", i: "mdi:water-plus", t: "Aspira e poi lava", pieno: true });
    }
    if (pulisce && (f & 4)) cmd.push({ c: "pause", i: "mdi:pause", t: "Pausa", pieno: true });
    else if (pulisce && (f & 8)) cmd.push({ c: "stop", i: "mdi:stop", t: "Ferma", pieno: true });
    if (st && stato !== "docked" && (f & 16)) cmd.push({ c: "return_to_base", i: "mdi:home-import-outline", t: "Torna in base" });
    if (st && (f & 512)) cmd.push({ c: "locate", i: "mdi:map-marker-radius", t: "Dove sei?" });
    this._sez("cmd", `<div class="frb-comandi">${cmd.map(x => `<button type="button" class="frb-cmd${x.pieno ? " pieno" : ""}" data-cmd="${x.c}">
      <ha-icon icon="${x.i}"></ha-icon>${fhEsc(x.t)}</button>`).join("")}</div>`);

    // Come pulisce: solo le scelte che questo robot ha.
    const scelto = [];
    this._sez("modi", FRB_SCELTE.map(s => {
      const k = this._k(s.k);
      const e = k && this._e(k), ss = k && this._st(k);
      if (!ss || !Array.isArray(ss.attributes.options)) return "";
      scelto.push(s.o[ss.state] || ss.state);
      return `<div class="fhf-sez"><h4>${fhEsc(s.t)}</h4>${["unavailable", "unknown"].includes(ss.state)
        ? `<div class="fh-note">Mentre il robot lavora questa scelta la blocca lui: si cambia a robot fermo.</div>`
        : `<div class="frb-chips">${ss.attributes.options.map(o =>
        `<button type="button" class="frb-chip${o === ss.state ? " sel" : ""}" data-opt-ent="${e}" data-opt="${fhEsc(o)}">${fhEsc(s.o[o] || o)}</button>`).join("")}</div>`}</div>`;
    }).join(""), [fase.testo || scelto[0], fase.fase && stato === "cleaning" ? fase.fase : scelto[1]].filter(Boolean).join(" · "));

    // La base: i tasti che fanno qualcosa subito e le abitudini fisse.
    const tasti = FRB_BASE.filter(b => this._k(b.k)).map(b => {
      const k = this._k(b.k);
      if (k === "button:start_dry" && asciuga && +asciuga.state > 0 && this._e("button:stop_dry"))
        return `<button type="button" class="fhf-tasto" data-press="${this._e("button:stop_dry")}">Ferma asciugatura</button>`;
      return `<button type="button" class="fhf-tasto" data-press="${this._e(k)}">${fhEsc(b.t)}</button>`;
    });
    const interr = FRB_INTERR.map(x => ({ x, s: this._k(x.k) && this._st(this._k(x.k)) })).filter(o => o.s).map(({ x, s }) =>
      `<div class="fhf-riga" style="--r-c:${s.state === "on" ? "#ffb020" : "#93a1b0"}"><div class="fhf-rig-ic"><ha-icon icon="${x.i}"></ha-icon></div>
        <div class="fhf-rig-t"><b>${fhEsc(x.t)}</b>${x.s ? `<small>${fhEsc(x.s)}</small>` : ""}</div>
        <button type="button" class="fhf-sw${s.state === "on" ? " on" : ""}" data-sw="${s.entity_id}" aria-label="${fhEsc(x.t)}"></button></div>`);
    const righeBase = this._righeBase();
    const statoBase = righeBase.map(r => `<div class="fhf-riga" style="--r-c:${r.c}">
      <div class="fhf-rig-ic"><ha-icon icon="${r.i}"></ha-icon></div>
      <div class="fhf-rig-t"><b>${fhEsc(r.t)}</b><small>${fhEsc(r.s)}</small></div>
      ${r.az && r.az.e ? `<button type="button" class="fhf-tasto" data-press="${r.az.e}">${fhEsc(r.az.t)}</button>` : ""}</div>`).join("");
    // La nota accanto al titolo: se c'e qualcosa che non va si legge DA
    // CHIUSA, se no la tendina resta chiusa e l'anomalia non la vede nessuno.
    const guaio = righeBase.find(r => r.guai);
    this._sez("base", tasti.length || interr.length || statoBase ? `<div class="fhf-sez">
      ${statoBase}${tasti.length ? `<div class="frb-tasti">${tasti.join("")}</div>` : ""}${interr.join("")}</div>` : "",
      guaio ? "\u26a0 " + guaio.t.toLowerCase() + ": " + guaio.s
        : (righeBase.find(r => r.c === "#ffb020") || righeBase.find(r => /Panni lavati/.test(r.t)) || {}).s || "");
    this._guaioBase = guaio || null;

    // Le scene: automazioni con l'interruttore, e le ore della regola "non
    // ripartire se ha appena pulito" sotto "Quando uscite".
    const ore = this._cfg.ore && h.states[this._cfg.ore];
    const oreVal = ore ? Math.round(parseFloat(ore.state)) : null;
    const scene = this._scene().map(id => {
      const a = h.states[id];
      const on = a.state === "on";
      const info = FRB_SCENE.find(x => x.re.test(id)) || {};
      const nome = String(a.attributes.friendly_name || id).replace(/^robot\s*·\s*/i, "");
      const ult = fhQuando(a.attributes.last_triggered);
      const riga = `<div class="fhf-riga" style="--r-c:${on ? "#ffb020" : "#93a1b0"}"><div class="fhf-rig-ic"><ha-icon icon="${info.i || "mdi:robot-vacuum"}"></ha-icon></div>
        <div class="fhf-rig-t"><b>${fhEsc(nome)}</b><small>${fhEsc(info.s || (on ? "Attiva" : "Spenta"))}${ult ? " · l'ultima volta " + fhEsc(ult) : ""}</small></div>
        <button type="button" class="fhf-sw${on ? " on" : ""}" data-sw="${id}" aria-label="${fhEsc(nome)}"></button></div>`;
      const conOre = oreVal != null && /quando_uscite|dopo_cena/.test(id);
      return riga + (conOre ? `<div class="frb-ore">Non se ha pulito nelle ultime ${[2, 4, 6, 12, 24].map(n =>
        `<button type="button" class="frb-chip${n === oreVal ? " sel" : ""}" data-ore="${n}">${n}</button>`).join("")} ore</div>` : "");
    });
    this._sez("scene", scene.length ? `<div class="fhf-sez">${scene.join("")}</div>` : "",
      scene.length === 1 ? "1 scena" : scene.length + " scene");

    // Cosa ha fatto e cosa fara.
    const tutte = this._pulizie();
    const quante = this._tutteLePulizie ? tutte.length : 5;
    const oreMin = t => t.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const storia = tutte.slice(0, quante).map((x, i) => {
      const q = fhQuando(x.t.toISOString());
      const vista = this._storica && this._storica.img === x.img;
      const min = Math.round((x.sec || 0) / 60);
      const fine = new Date(x.t.getTime() + (x.sec || 0) * 1000);
      const motivo = (this._motivi || {})[+x.t];
      const righe = [`dalle ${oreMin(x.t)} alle ${oreMin(fine)} · ${min} ${min === 1 ? "minuto" : "minuti"}`];
      if (x.mq) righe.push(x.mq + " m²");
      if (x.fase) righe.push(x.fase);
      if (x.metodo) righe.push(x.metodo);
      return `<div class="fhf-riga${x.img ? " cliccabile" : ""}${vista ? " oggi" : ""}" style="--r-c:${x.ok === false ? "#ff8a3d" : "#5aa9ff"}"
        ${x.img ? `data-storia="${fhEsc(x.img)}" data-quando="${fhEsc(q)}"` : ""}>
        <div class="fhf-rig-ic"><ha-icon icon="${x.ok === false ? "mdi:alert-circle-outline" : "mdi:check-circle-outline"}"></ha-icon></div>
        <div class="fhf-rig-t"><b>${fhEsc(q)}${x.ok === false ? ` <span style="color:#ff8a3d">· non finita</span>` : ""}</b>
          <small>${fhEsc(righe.join(" · "))}</small>
          ${motivo ? `<small class="frb-perche">${fhEsc(motivo)}</small>` : ""}</div>
        ${x.ok === false && !motivo ? `<button type="button" class="frb-chip" data-perche="${i}">perché?</button>`
          : x.img ? `<span class="fhf-val">${vista ? "sulla mappa" : "vedi"}</span>` : ""}</div>`;
    });
    if (tutte.length > 5) storia.push(`<div class="frb-chips"><button type="button" class="frb-chip" data-tutte>${
      this._tutteLePulizie ? "Mostra solo le ultime 5" : "Tutte le " + tutte.length + " pulizie"}</button></div>`);
    const prog = this._programmi().map(x => `<div class="fhf-riga" style="--r-c:${x.on ? "#ffb020" : "#93a1b0"}">
      <div class="fhf-rig-ic"><ha-icon icon="mdi:calendar-clock"></ha-icon></div>
      <div class="fhf-rig-t"><b>${x.tutti ? "Ogni giorno" : "Alcuni giorni"} alle ${String(x.ora).padStart(2, "0")}:${String(x.min).padStart(2, "0")}</b>
        <small>Programmata dall'app Xiaomi · si cambia da lì</small></div><span class="fhf-val">${x.on ? "attiva" : "spenta"}</span></div>`);
    const ultimaP = tutte[0];
    this._sez("storia", storia.length || prog.length ? `<div class="fhf-sez">${prog.join("")}${storia.join("")}</div>` : "",
      ultimaP ? fhQuando(ultimaP.t.toISOString()) + (ultimaP.ok === false ? " · non finita" : "") : "");

    // I ricambi: la barra si vede da lontano, le ore dicono quando.
    const ricambi = [];
    const minimi = [];
    FRB_RICAMBI.forEach(r => (this._entita()[r.k] || []).forEach((e, i) => {
      const s = h.states[e];
      const n = s ? parseFloat(s.state) : NaN;
      if (isNaN(n)) return;
      minimi.push(Math.round(n));
      const o = this._st(r.o, i);
      const c = n < 10 ? "#ff5c5c" : n < 25 ? "#ff8a3d" : "#4ade80";
      ricambi.push(`<div class="fhf-riga" style="--r-c:${c}"><div class="fhf-rig-ic"><ha-icon icon="${r.i}"></ha-icon></div>
        <div class="fhf-rig-t"><b>${fhEsc(r.t[i] || r.t[0])}</b><small>${o && +o.state >= 0 ? "ancora circa " + Math.round(+o.state) +
          (o.attributes.unit_of_measurement === "d" ? " giorni" : " ore di lavoro") : ""}</small>
          <div class="frb-barra"><i style="width:${Math.max(3, Math.min(100, n))}%"></i></div></div>
        <span class="fhf-val">${Math.round(n)}%</span></div>`);
    }));
    this._sez("ricambi", ricambi.length ? `<div class="fhf-sez">${ricambi.join("")}</div>` : "",
      ricambi.length ? "il più basso " + Math.min.apply(null, minimi) + "%" : "");
  }

  // La mappa si rinfresca da sola: ogni 5 secondi mentre pulisce, ogni
  // minuto da ferma (una camera di Home Assistant tiene lo stesso indirizzo
  // e cambia solo l'immagine).
  _aggiornaMappa() {
    const img = this._foglio && this._foglio.corpo.querySelector("[data-mappa]");
    const ms = this._mappaId() && this._hass.states[this._mappaId()];
    if (!img || !ms || !ms.attributes.entity_picture) return;
    const st = this._hass.states[this._cfg.entity];
    const passo = st && st.state === "cleaning" ? 5000 : 60000;
    const pic = this._storica ? this._storica.img : ms.attributes.entity_picture;
    const url = pic + (pic.includes("?") ? "&" : "?") + "v=" + Math.floor(Date.now() / passo);
    if (img.dataset.url === url) return;
    img.dataset.url = url;
    img.src = this._hass.hassUrl ? this._hass.hassUrl(url) : url;
  }

  _clic(e) {
    const testa = e.target.closest("[data-acco]");
    if (testa) {
      fhVibra(6);
      const n = testa.dataset.acco;
      if (this._aperte.has(n)) this._aperte.delete(n); else this._aperte.add(n);
      const box = testa.closest("[data-acc]");
      if (box) box.classList.toggle("on", this._aperte.has(n));
      return;
    }
    const perche = e.target.closest("[data-perche]");
    if (perche) { fhVibra(8); this._perche(+perche.dataset.perche); return; }
    if (e.target.closest("[data-tutte]")) {
      fhVibra(8);
      this._tutteLePulizie = !this._tutteLePulizie;
      this._disegnaFoglio();
      return;
    }
    const riga = e.target.closest("[data-storia]");
    if (riga) {
      fhVibra(8);
      this._storica = this._storica && this._storica.img === riga.dataset.storia ? null
        : { img: riga.dataset.storia, q: riga.dataset.quando };
      this._disegnaFoglio();
      const m = this._foglio.corpo.querySelector("[data-s=mappa]");
      if (m && m.scrollIntoView) m.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.dom) { fhVibra(8); this._chiediRobot(b.dataset.dom); return; }
    if (b.hasAttribute("data-invia")) {
      const inp = this._foglio.corpo.querySelector("[data-chiedi]");
      const testo = inp ? inp.value.trim() : "";
      if (!testo) return;
      inp.value = "";
      fhVibra(8);
      this._chiediRobot(testo);
      return;
    }
    const h = this._hass, ent = this._cfg.entity;
    const fatto = () => { b.style.transform = "scale(.94)"; setTimeout(() => { b.style.transform = ""; }, 180); };
    if (b.hasAttribute("data-tutto")) {
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: ent } }));
      return;
    }
    fhVibra(10);
    if (b.hasAttribute("data-adesso")) {
      this._storica = null;
      this._disegnaFoglio();
    } else if (b.dataset.stanza) {
      const id = b.dataset.stanza;
      if (this._sel.has(id)) this._sel.delete(id); else this._sel.add(id);
      this._disegnaFoglio();
    } else if (b.dataset.cmd === "stanze") {
      // Xiaomi Home legge il messaggio come YAML: gli id vanno fra
      // virgolette ("4,6"), senno "4" diventa un numero e "4,6" una lista.
      if (!this._sel.size) return;
      if (this._dreame()) {
        h.callService("dreame_vacuum", "vacuum_clean_segment", { entity_id: ent, segments: [...this._sel].map(Number) });
      } else {
        const n = this._e("notify:start_vacuum_room_sweep") || this._e("notify:start_room_sweep");
        if (!n) return;
        h.callService("notify", "send_message", { entity_id: n, message: JSON.stringify([...this._sel].join(",")) });
      }
      this._sel.clear();
      fatto();
      this._disegnaFoglio();
    } else if (b.dataset.cmd === "doppia") {
      if (!this._cfg.doppia) return;
      h.callService("script", "turn_on", { entity_id: this._cfg.doppia });
      fatto();
    } else if (b.dataset.cmd) {
      h.callService("vacuum", b.dataset.cmd, { entity_id: ent });
      fatto();
    } else if (b.dataset.optEnt) {
      h.callService("select", "select_option", { entity_id: b.dataset.optEnt, option: b.dataset.opt });
      b.parentElement.querySelectorAll(".frb-chip").forEach(x => x.classList.toggle("sel", x === b));
    } else if (b.dataset.press) {
      h.callService("button", "press", { entity_id: b.dataset.press });
      const t = b.textContent;
      b.textContent = "Fatto ✓";
      setTimeout(() => { b.textContent = t; }, 1600);
    } else if (b.dataset.sw) {
      const id = b.dataset.sw;
      h.callService(id.split(".")[0], "toggle", { entity_id: id });
      b.classList.toggle("on");
    } else if (b.dataset.ore && this._cfg.ore) {
      h.callService("input_number", "set_value", { entity_id: this._cfg.ore, value: +b.dataset.ore });
      b.parentElement.querySelectorAll(".frb-chip").forEach(x => x.classList.toggle("sel", x === b));
    }
  }
}
customElements.define("faber-robot", FaberRobot);

// ===========================================================================
// FABER PLAYER — casse Alexa, Fire TV, cassa del bagno
// Una card per tutte: se ne passi piu d'una (entities) si sceglie la cassa
// dalle chip in alto. I tasti sono quelli che l'apparecchio dichiara.
// ===========================================================================
const FPL_CSS = `
  .fpl{min-height:0;gap:10px}
  .fpl-head{display:flex;align-items:center;gap:12px;cursor:pointer}
  .fpl-art{width:58px;height:58px;border-radius:16px;flex:0 0 auto;background:color-mix(in srgb,var(--t-c) 16%,transparent);
    display:flex;align-items:center;justify-content:center;color:var(--t-c);overflow:hidden;background-size:cover;background-position:center}
  .fpl-art ha-icon{--mdc-icon-size:28px}
  .fpl-art.foto ha-icon{display:none}
  .fpl-pow{margin-left:auto;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.14);
    background:rgba(255,255,255,.07);color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .fh-app.chiaro .fpl-pow{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.12)}
  .fpl-pow.on{color:#4ade80}
  .fpl-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:1px}
  .fpl-chips::-webkit-scrollbar{display:none}
  .fpl-chip{flex:0 0 auto;padding:6px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);
    color:inherit;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap}
  .fh-app.chiaro .fpl-chip{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.12)}
  .fpl-chip ha-icon{--mdc-icon-size:15px}
  .fpl-chip.sel{background:#ffb020;border-color:#ffb020;color:#1c1400}
  .fpl-chip.suona::after{content:"";width:6px;height:6px;border-radius:50%;background:#4ade80}
  .fpl-ctrl{display:flex;align-items:center;justify-content:center;gap:14px}
  .fpl-c{width:44px;height:44px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:inherit;cursor:pointer;
    display:flex;align-items:center;justify-content:center}
  .fh-app.chiaro .fpl-c{background:rgba(15,23,42,.06)}
  .fpl-c.grande{width:56px;height:56px;background:linear-gradient(135deg,#ffb020,#e09810);color:#1c1400;box-shadow:0 4px 14px rgba(255,176,32,.35)}
  .fh-app.chiaro .fpl-c.grande{background:linear-gradient(135deg,#ffb020,#e09810);color:#1c1400}
  .fpl-c ha-icon{--mdc-icon-size:24px}
  .fpl-c:active{transform:scale(.93)}
  .fpl-vol{display:flex;align-items:center;gap:8px}
  .fpl-vol ha-icon{--mdc-icon-size:18px;opacity:.7;cursor:pointer}
  .fpl-vol input{flex:1;accent-color:#ffb020;height:24px}
  .fpl-src{display:flex;gap:6px;flex-wrap:wrap}
`;
class FaberPlayer extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-player-editor"); }
  setConfig(c) {
    this._cfg = Object.assign({ name: "", entity: "", entities: [] }, c || {});
    this._lista = [...new Set([this._cfg.entity, ...(this._cfg.entities || [])].filter(Boolean))];
    this._sel = this._lista[0] || "";
    this._built = false;
  }
  static getStubConfig(hass) {
    const e = Object.keys((hass && hass.states) || {}).find(x => x.startsWith("media_player.")) || "";
    return { type: "custom:faber-player", entity: e };
  }
  getCardSize() { return 3; }
  set hass(h) {
    this._hass = h;
    // Se ne sta suonando un'altra e quella scelta e ferma, si passa da sola a
    // quella che suona: e quasi sempre quella che si vuole comandare.
    if (!this._scelto && this._lista.length > 1) {
      const suona = this._lista.find(e => h.states[e] && h.states[e].state === "playing");
      if (suona) this._sel = suona;
    }
    this._update();
  }

  _icona(st) {
    const dc = st && st.attributes.device_class;
    return dc === "tv" ? "mdi:television" : dc === "speaker" ? "mdi:speaker" : "mdi:speaker-wireless";
  }

  _update() {
    const h = this._hass;
    if (!h) return;
    const id = this._sel;
    const st = h.states[id];
    const a = st ? st.attributes : {};
    const f = Number(a.supported_features) || 0;
    const stato = st ? st.state : "unavailable";
    const suona = stato === "playing";
    const spento = ["off", "unavailable", "standby"].includes(stato);
    const titolo = a.media_title || { playing: "In riproduzione", paused: "In pausa", idle: "In attesa", on: "Acceso",
      off: "Spento", standby: "In standby", unavailable: "Non raggiungibile" }[stato] || stato;
    const sotto = [a.media_artist, a.media_album_name].filter(Boolean).join(" · ") || (a.friendly_name || id);
    const vol = a.volume_level != null ? Math.round(a.volume_level * 100) : null;
    const firma = JSON.stringify([id, stato, titolo, sotto, a.entity_picture, vol, a.is_volume_muted, a.source,
      this._lista.map(e => h.states[e] && h.states[e].state)]);
    if (this._firma === firma || this._trascino) return;
    this._firma = firma;
    const nomeDi = e => { const s = h.states[e]; return (s && s.attributes.friendly_name) || e; };
    const chips = this._lista.length > 1 ? `<div class="fpl-chips">${this._lista.map(e => {
      const s = h.states[e];
      return `<button type="button" class="fpl-chip${e === id ? " sel" : ""}${s && s.state === "playing" ? " suona" : ""}" data-sel="${fhEsc(e)}">
        <ha-icon icon="${this._icona(s)}"></ha-icon>${fhEsc(nomeDi(e))}</button>`;
    }).join("")}</div>` : "";
    const pp = (f & 1) || (f & 16384);
    const ctrl = spento ? "" : `<div class="fpl-ctrl">
      ${f & 16 ? `<button type="button" class="fpl-c" data-srv="media_previous_track"><ha-icon icon="mdi:skip-previous"></ha-icon></button>` : ""}
      ${pp ? `<button type="button" class="fpl-c grande" data-srv="media_play_pause"><ha-icon icon="${suona ? "mdi:pause" : "mdi:play"}"></ha-icon></button>` : ""}
      ${f & 32 ? `<button type="button" class="fpl-c" data-srv="media_next_track"><ha-icon icon="mdi:skip-next"></ha-icon></button>` : ""}
    </div>`;
    const volHTML = !spento && vol != null && (f & 4) ? `<div class="fpl-vol">
      <ha-icon icon="${a.is_volume_muted ? "mdi:volume-off" : "mdi:volume-medium"}" data-muto></ha-icon>
      <input type="range" min="0" max="100" step="2" value="${vol}" data-vol aria-label="Volume">
      <span class="fhf-val" style="--r-c:inherit;min-width:34px;text-align:right">${vol}%</span></div>` : "";
    const src = !spento && (f & 2048) && (a.source_list || []).length && (a.source_list || []).length <= 8
      ? `<div class="fpl-src">${a.source_list.map(x => `<button type="button" class="fpl-chip${x === a.source ? " sel" : ""}" data-src="${fhEsc(x)}">${fhEsc(x)}</button>`).join("")}</div>` : "";
    const pow = (f & 128) || (f & 256) ? `<button type="button" class="fpl-pow${spento ? "" : " on"}" data-pow title="Accendi o spegni"><ha-icon icon="mdi:power"></ha-icon></button>` : "";
    this.innerHTML = `<style>${FHT_CSS}${FPL_CSS}</style>
      <div class="fht fpl" data-tono="${suona ? "ambra" : spento ? "grigio" : "blu"}">
        ${chips}
        <div class="fpl-head" data-info>
          <div class="fpl-art${a.entity_picture ? " foto" : ""}" ${a.entity_picture ? `style="background-image:url('${fhEsc(a.entity_picture)}')"` : ""}>
            <ha-icon icon="${this._icona(st)}"></ha-icon></div>
          <div class="fht-testo"><div class="fht-title">${fhEsc(this._cfg.name && this._lista.length === 1 ? this._cfg.name : titolo)}</div>
            <div class="fht-sub">${fhEsc(this._cfg.name && this._lista.length === 1 ? titolo + " · " + sotto : sotto)}</div></div>
          ${pow}
        </div>
        ${ctrl}${volHTML}${src}
      </div>`;
    const srv = (s, d) => { fhVibra(8); h.callService("media_player", s, Object.assign({ entity_id: id }, d || {})); };
    this.querySelectorAll("[data-sel]").forEach(b => b.addEventListener("click", () => {
      this._sel = b.dataset.sel; this._scelto = true; this._firma = null; this._update();
    }));
    this.querySelectorAll("[data-srv]").forEach(b => b.addEventListener("click", () => srv(b.dataset.srv)));
    this.querySelectorAll("[data-src]").forEach(b => b.addEventListener("click", () => srv("select_source", { source: b.dataset.src })));
    const pw = this.querySelector("[data-pow]");
    if (pw) pw.addEventListener("click", e => { e.stopPropagation(); srv(spento ? "turn_on" : "turn_off"); });
    const mu = this.querySelector("[data-muto]");
    if (mu && (f & 8)) mu.addEventListener("click", () => srv("volume_mute", { is_volume_muted: !a.is_volume_muted }));
    const vr = this.querySelector("[data-vol]");
    if (vr) {
      vr.addEventListener("pointerdown", () => { this._trascino = true; });
      vr.addEventListener("change", () => { this._trascino = false; srv("volume_set", { volume_level: +vr.value / 100 }); });
      vr.addEventListener("input", () => { const l = vr.nextElementSibling; if (l) l.textContent = vr.value + "%"; });
    }
    const info = this.querySelector("[data-info]");
    if (info) info.addEventListener("click", () =>
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } })));
  }
}
customElements.define("faber-player", FaberPlayer);

// ===========================================================================
// FABER PULSANTIERA — telecomandi semplici e pulsanti di casa
// Stufa della camera (Broadlink), movimento della telecamera, qualunque fila
// di comandi. Un tasto manda un comando al Broadlink (remote + device) oppure
// preme un'entita (button.*, script.*).
// tasti: [{ nome, icona, cmd | entity, ripeti, pausa, principale, vuoto }]
// ===========================================================================
const FPU_CSS = `
  .fpu{min-height:0;gap:10px}
  .fpu-grid{display:grid;grid-template-columns:repeat(var(--fpu-n,3),1fr);gap:8px}
  .fpu-t{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:12px 6px;border-radius:16px;
    border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:11px;font-weight:800;
    cursor:pointer;min-height:64px;transition:transform .12s,background .2s}
  .fh-app.chiaro .fpu-t{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.12)}
  .fpu-t ha-icon{--mdc-icon-size:24px;color:#ffb020}
  .fh-app.chiaro .fpu-t.principale{background:linear-gradient(135deg,#ffb020,#e09810);border-color:transparent;color:#1c1400}
  .fpu-t.principale{background:linear-gradient(135deg,#ffb020,#e09810);border-color:transparent;color:#1c1400;
    box-shadow:0 4px 14px rgba(255,176,32,.32)}
  .fpu-t.principale ha-icon{color:#1c1400}
  .fpu-t.vuoto{visibility:hidden}
  .fpu-t:active{transform:scale(.94)}
  .fpu-t.inviato{background:rgba(74,222,128,.25)}
`;
class FaberPulsantiera extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-pulsantiera-editor"); }
  setConfig(c) {
    this._cfg = Object.assign({ name: "Comandi", icona: "mdi:remote", remote: "", device: "", colonne: 3, tasti: [] }, c || {});
    this._built = false;
  }
  static getStubConfig() {
    return { type: "custom:faber-pulsantiera", name: "Comandi", icona: "mdi:remote", remote: "", device: "",
      tasti: [{ nome: "Accendi", icona: "mdi:power", cmd: "power", principale: true }] };
  }
  getCardSize() { return 3; }
  set hass(h) {
    this._hass = h;
    if (this._built) return;
    this._built = true;
    const c = this._cfg;
    this.innerHTML = `<style>${FHT_CSS}${FPU_CSS}</style>
      <div class="fht fpu">
        <div class="fht-top" style="justify-content:flex-start;gap:10px"><div class="fht-ic"><ha-icon icon="${fhEsc(c.icona)}"></ha-icon></div>
          <div class="fht-testo"><div class="fht-title">${fhEsc(c.name)}</div>${c.nota ? `<div class="fht-sub">${fhEsc(c.nota)}</div>` : ""}</div></div>
        <div class="fpu-grid" style="--fpu-n:${Math.max(1, Math.min(6, +c.colonne || 3))}">
          ${(c.tasti || []).map((t, i) => t.vuoto ? `<span class="fpu-t vuoto"></span>`
            : `<button type="button" class="fpu-t${t.principale ? " principale" : ""}" data-i="${i}">
                <ha-icon icon="${fhEsc(t.icona || "mdi:circle-medium")}"></ha-icon>${fhEsc(t.nome || "")}</button>`).join("")}
        </div>
      </div>`;
    this.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
      const t = c.tasti[+b.dataset.i];
      const fai = () => {
        this._manda(t);
        fhVibra(t.principale ? 18 : 10);
        b.classList.add("inviato");
        setTimeout(() => b.classList.remove("inviato"), 450);
      };
      // Un cancello o una porta si aprono solo dopo un si: il tasto sta a un
      // dito dallo scorrimento della pagina.
      if (t.conferma && window.fhConfirmAction) window.fhConfirmAction({ title: t.nome || c.name, message: t.conferma,
        icon: t.icona || c.icona, confirmText: t.nome || "Conferma", cancelText: "Annulla",
        chiaro: !!this.closest(".fh-app.chiaro"), onConfirm: fai });
      else fai();
    }));
  }
  _manda(t) {
    const h = this._hass;
    const c = this._cfg;
    if (t.entity) {
      const d = t.entity.split(".")[0];
      if (d === "button") h.callService("button", "press", { entity_id: t.entity });
      else if (d === "script") h.callService("script", "turn_on", { entity_id: t.entity });
      else h.callService(d, "toggle", { entity_id: t.entity });
      return;
    }
    if (!c.remote || !t.cmd) return;
    const dati = { entity_id: c.remote, command: t.cmd };
    if (c.device) dati.device = c.device;
    if (t.ripeti || c.ripeti) dati.num_repeats = +(t.ripeti || c.ripeti);
    if (t.pausa || c.pausa) dati.delay_secs = +(t.pausa || c.pausa);
    h.callService("remote", "send_command", dati);
  }
}
customElements.define("faber-pulsantiera", FaberPulsantiera);

// ===========================================================================
// FABER SPESA (CARD VERTICALE CON POPUP MINI-APP)
// ===========================================================================
const FSP_CSS = `
  .fsp-scrim{position:fixed;inset:0;background:rgba(0,0,0,.68);backdrop-filter:blur(14px);
    -webkit-backdrop-filter:blur(14px);z-index:999999;display:flex;align-items:center;justify-content:center;
    padding:16px;box-sizing:border-box;animation:fspFadeIn .2s ease}
  .fsp-modal{width:100%;max-width:480px;max-height:86vh;overflow:hidden;border-radius:24px;
    background:rgba(18,22,30,.95);border:1px solid rgba(255,255,255,.14);
    box-shadow:0 24px 64px rgba(0,0,0,.65);color:#eaf1f8;display:flex;flex-direction:column;
    gap:14px;padding:20px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
  .fh-app.chiaro .fsp-modal,.fsp-scrim.chiaro .fsp-modal{background:rgba(255,255,255,.95);border-color:rgba(15,23,42,.12);
    color:#12161c;box-shadow:0 24px 64px rgba(20,26,40,.2)}
  .fsp-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .fsp-modal-titlebox{display:flex;align-items:center;gap:10px}
  .fsp-modal-icon{width:42px;height:42px;border-radius:12px;background:rgba(255,176,32,.16);
    color:#ffb020;display:flex;align-items:center;justify-content:center;font-size:22px}
  .fsp-modal-title{font-size:17px;font-weight:900;letter-spacing:-.01em}
  .fsp-modal-sub{font-size:11px;font-weight:600;opacity:.65;margin-top:2px}
  .fsp-modal-actions{display:flex;align-items:center;gap:8px}
  .fsp-modal-badge{padding:4px 10px;border-radius:999px;font-size:11px;font-weight:900;background:#ffb020;color:#1c1400}
  .fsp-modal-close{width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.1);
    color:inherit;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;
    transition:background .15s}
  .fsp-modal-close:hover{background:rgba(255,84,66,.2);color:#ff5442}
  .fsp-tabs{display:flex;gap:6px;background:rgba(255,255,255,.06);padding:3px;border-radius:12px}
  .fh-app.chiaro .fsp-tabs,.fsp-scrim.chiaro .fsp-tabs{background:rgba(15,23,42,.06)}
  .fsp-tab{flex:1;padding:7px 10px;border:none;border-radius:9px;background:none;
    color:inherit;cursor:pointer;font:inherit;font-size:12px;font-weight:800;transition:all .15s ease}
  .fsp-tab.active{background:#ffb020;color:#1c1400;box-shadow:0 2px 8px rgba(255,176,32,.35)}
  .fsp-addrow{display:flex;gap:8px;align-items:center}
  .fsp-input{flex:1;min-width:0;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);
    background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:13.5px;font-weight:600;
    outline:none;transition:border-color .2s,box-shadow .2s}
  .fh-app.chiaro .fsp-input,.fsp-scrim.chiaro .fsp-input{background:rgba(15,23,42,.04);border-color:rgba(15,23,42,.12)}
  .fsp-input:focus{border-color:#ffb020;box-shadow:0 0 0 3px rgba(255,176,32,.25)}
  .fsp-addbtn{width:44px;height:44px;border-radius:14px;border:none;background:#ffb020;color:#1c1400;
    display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:22px;flex:0 0 auto;
    transition:all .15s ease}
  .fsp-addbtn:hover{filter:brightness(1.1);transform:scale(1.04)}
  .fsp-addbtn:active{transform:scale(.95)}
  .fsp-list{display:flex;flex-direction:column;gap:6px;max-height:380px;overflow-y:auto;padding-right:4px}
  .fsp-list::-webkit-scrollbar{width:4px}
  .fsp-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:4px}
  .fsp-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:14px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:all .2s ease}
  .fh-app.chiaro .fsp-item,.fsp-scrim.chiaro .fsp-item{background:rgba(15,23,42,.03);border-color:rgba(15,23,42,.06)}
  .fsp-item:hover{background:rgba(255,255,255,.08)}
  .fsp-item.done{opacity:.55}
  .fsp-item.done .fsp-text{text-decoration:line-through}
  .fsp-check{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.3);
    background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
    padding:0;color:transparent;transition:all .2s cubic-bezier(.2,.8,.2,1);flex:0 0 auto}
  .fsp-item.done .fsp-check{background:#38e08a;border-color:#38e08a;color:#0b2b16}
  /* Il popup sta in document.body, fuori dal pannello: di giorno riceve la
     classe "chiaro" sua. Senza, restava nero su un pannello chiaro e i bordi
     bianchi del cerchietto e della X sparivano sul bianco. */
  .fsp-scrim.chiaro .fsp-check{border-color:rgba(15,23,42,.3)}
  .fsp-scrim.chiaro .fsp-modal-close{background:rgba(15,23,42,.07)}
  .fsp-scrim.chiaro .fsp-list::-webkit-scrollbar-thumb{background:rgba(15,23,42,.2)}
  .fsp-check ha-icon{--mdc-icon-size:14px}
  .fsp-text{flex:1;min-width:0;font-size:13.5px;font-weight:700;word-break:break-word}
  .fsp-del{width:28px;height:28px;border-radius:8px;border:none;background:none;
    color:rgba(255,255,255,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;
    transition:all .15s ease}
  .fh-app.chiaro .fsp-del,.fsp-scrim.chiaro .fsp-del{color:rgba(15,23,42,.3)}
  .fsp-del:hover{color:#ff5442;background:rgba(255,84,66,.15)}
  .fsp-empty{padding:26px 14px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:.65}
  .fsp-empty ha-icon{--mdc-icon-size:42px;color:#ffb020}
  .fsp-empty b{font-size:14px}
  .fsp-empty small{font-size:11.5px}
  .fsp-clear-btn{align-self:flex-end;padding:7px 12px;border-radius:10px;border:none;cursor:pointer;
    font:inherit;font-size:11px;font-weight:800;background:rgba(255,84,66,.14);color:#ff5442;
    transition:all .15s ease}
  .fsp-clear-btn:hover{background:#ff5442;color:#fff}

  /* Vertical Card */
  .fsp-card{position:relative;overflow:hidden;border-radius:24px;padding:14px 14px 12px;
    background:rgba(16,22,34,.78);border:1px solid rgba(255,255,255,.10);
    backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);
    color:#eaf1f8;box-shadow:0 10px 28px rgba(0,0,0,.3);transition:all .25s ease;
    cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;min-height:142px;
    box-sizing:border-box;user-select:none}
  .fh-app.chiaro .fsp-card{background:rgba(255,255,255,.78);border-color:rgba(15,23,42,.1);
    color:#12161c;box-shadow:0 10px 28px rgba(20,26,40,.1)}
  .fsp-card:active{transform:scale(.98)}
  .fsp-top{display:flex;align-items:center;justify-content:space-between;width:100%}
  .fsp-icon{width:42px;height:42px;border-radius:14px;background:rgba(255,176,32,.14);
    color:#ffb020;display:flex;align-items:center;justify-content:center;font-size:22px}
  .fsp-badge-pill{padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:900;
    background:#ffb020;color:#1c1400;box-shadow:0 2px 10px rgba(255,176,32,.4)}
  .fsp-center{display:flex;flex-direction:column;gap:2px;margin:6px 0}
  .fsp-title{font-size:15px;font-weight:850;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fsp-sub{font-size:11.5px;font-weight:600;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fsp-btn-act{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;
    padding:9px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);
    background:rgba(255,255,255,.08);color:inherit;font:inherit;font-size:12px;font-weight:850;
    letter-spacing:.02em;cursor:pointer;box-sizing:border-box;transition:all .18s ease}
  .fh-app.chiaro .fsp-btn-act{background:rgba(15,23,42,.06);border-color:rgba(15,23,42,.12)}
  .fsp-card:hover .fsp-btn-act{background:#ffb020;color:#1c1400;border-color:#ffb020}
  .fsp-btn-act ha-icon{--mdc-icon-size:16px}
  @keyframes fspFadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
`;

window.fhOpenSpesaModal = async function(hass, entityId = "todo.shopping_list", opts = {}) {
  if (!hass) return;
  const existing = document.querySelector(".fsp-scrim");
  if (existing) existing.remove();

  let activeTab = "da_comprare";
  let items = [];

  const scrim = document.createElement("div");
  scrim.className = "fsp-scrim" + (opts && opts.chiaro ? " chiaro" : "");
  scrim.innerHTML = `
    <style>${FSP_CSS}</style>
    <div class="fsp-modal">
      <div class="fsp-modal-head">
        <div class="fsp-modal-titlebox">
          <div class="fsp-modal-icon"><ha-icon icon="mdi:cart-outline"></ha-icon></div>
          <div>
            <div class="fsp-modal-title">Lista della Spesa</div>
            <div class="fsp-modal-sub" id="fspSub">Caricamento...</div>
          </div>
        </div>
        <div class="fsp-modal-actions">
          <div class="fsp-modal-badge" id="fspBadge">0</div>
          <button type="button" class="fsp-modal-close" id="fspClose" title="Chiudi">✕</button>
        </div>
      </div>
      <div class="fsp-tabs">
        <button type="button" class="fsp-tab active" data-tab="da_comprare" id="fspTabNeeds">Da Comprare (0)</button>
        <button type="button" class="fsp-tab" data-tab="completati" id="fspTabDone">Completati (0)</button>
      </div>
      <form class="fsp-addrow" id="fspForm">
        <input type="text" class="fsp-input" placeholder="Aggiungi alla spesa (es. Latte, Pasta)..." id="fspInput" required autocomplete="off">
        <button type="submit" class="fsp-addbtn" title="Aggiungi">+</button>
      </form>
      <div id="fspClearWrap" style="display:none;align-self:flex-end;">
        <button type="button" class="fsp-clear-btn" id="fspClearDone">
          <ha-icon icon="mdi:delete-sweep-outline"></ha-icon> Svuota completati
        </button>
      </div>
      <div class="fsp-list" id="fspList"></div>
    </div>
  `;

  document.body.appendChild(scrim);

  const fetchItems = async () => {
    try {
      const res = await hass.callWS({ type: "todo/item/list", entity_id: entityId });
      items = (res && res.items) || [];
    } catch (e) {
      try {
        const res = await hass.callWS({
          type: "call_service", domain: "todo", service: "get_items",
          service_data: { status: ["needs_action", "completed"] },
          target: { entity_id: entityId }, return_response: true
        });
        const d = res && res.response && res.response[entityId];
        items = (d && d.items) || [];
      } catch (e2) {
        items = [];
      }
    }
    renderModal();
  };

  const renderModal = () => {
    const daComprare = items.filter(i => i.status === "needs_action");
    const completati = items.filter(i => i.status === "completed");
    const activeList = activeTab === "da_comprare" ? daComprare : completati;

    const sub = scrim.querySelector("#fspSub");
    if (sub) sub.textContent = `${daComprare.length} ${daComprare.length === 1 ? "articolo da acquistare" : "articoli da acquistare"}`;
    const badge = scrim.querySelector("#fspBadge");
    if (badge) badge.textContent = daComprare.length;
    const tabNeeds = scrim.querySelector("#fspTabNeeds");
    if (tabNeeds) {
      tabNeeds.textContent = `Da Comprare (${daComprare.length})`;
      tabNeeds.classList.toggle("active", activeTab === "da_comprare");
    }
    const tabDone = scrim.querySelector("#fspTabDone");
    if (tabDone) {
      tabDone.textContent = `Completati (${completati.length})`;
      tabDone.classList.toggle("active", activeTab === "completati");
    }
    const clearWrap = scrim.querySelector("#fspClearWrap");
    if (clearWrap) clearWrap.style.display = (activeTab === "completati" && completati.length) ? "block" : "none";

    const listEl = scrim.querySelector("#fspList");
    if (!listEl) return;

    if (!activeList.length) {
      listEl.innerHTML = `
        <div class="fsp-empty">
          <ha-icon icon="${activeTab === "da_comprare" ? "mdi:cart-check" : "mdi:check-all"}"></ha-icon>
          <b>${activeTab === "da_comprare" ? "Carrello vuoto!" : "Nessun completato"}</b>
          <small>${activeTab === "da_comprare" ? "Aggiungi articoli con la barra qui sopra." : "Gli articoli comprati appariranno qui."}</small>
        </div>`;
    } else {
      listEl.innerHTML = activeList.map(item => `
        <div class="fsp-item${item.status === "completed" ? " done" : ""}" data-uid="${fhEsc(item.uid)}">
          <button type="button" class="fsp-check" data-act="check" title="Segna completato">
            <ha-icon icon="mdi:check"></ha-icon>
          </button>
          <div class="fsp-text">${fhEsc(item.summary)}</div>
          <button type="button" class="fsp-del" data-act="del" title="Elimina">
            <ha-icon icon="mdi:trash-can-outline"></ha-icon>
          </button>
        </div>
      `).join("");
    }

    listEl.querySelectorAll(".fsp-item").forEach(el => {
      const uid = el.dataset.uid;
      const target = items.find(i => i.uid === uid);
      if (!target) return;
      const chk = el.querySelector('[data-act="check"]');
      if (chk) {
        chk.onclick = async (e) => {
          e.stopPropagation();
          fhVibra(8);
          const newStatus = target.status === "completed" ? "needs_action" : "completed";
          target.status = newStatus;
          renderModal();
          try {
            await hass.callService("todo", "update_item", { entity_id: entityId, item: uid, status: newStatus });
          } finally { fetchItems(); }
        };
      }
      const del = el.querySelector('[data-act="del"]');
      if (del) {
        del.onclick = async (e) => {
          e.stopPropagation();
          fhVibra(8);
          items = items.filter(i => i.uid !== uid);
          renderModal();
          try {
            await hass.callService("todo", "remove_item", { entity_id: entityId, item: uid });
          } finally { fetchItems(); }
        };
      }
    });
  };

  scrim.querySelector("#fspClose").onclick = () => scrim.remove();
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };

  scrim.querySelectorAll(".fsp-tab").forEach(b => b.onclick = () => {
    activeTab = b.dataset.tab;
    renderModal();
  });

  const form = scrim.querySelector("#fspForm");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const inp = scrim.querySelector("#fspInput");
      const val = inp ? inp.value.trim() : "";
      if (!val) return;
      inp.value = "";
      fhVibra(8);
      const tmp = { uid: "tmp_" + Date.now(), summary: val, status: "needs_action" };
      items.unshift(tmp);
      renderModal();
      try {
        await hass.callService("todo", "add_item", { entity_id: entityId, item: val });
      } finally { fetchItems(); }
    };
  }

  const clearBtn = scrim.querySelector("#fspClearDone");
  if (clearBtn) {
    clearBtn.onclick = async () => {
      fhVibra(10);
      const toRemove = items.filter(i => i.status === "completed").map(i => i.uid);
      items = items.filter(i => i.status !== "completed");
      renderModal();
      for (const u of toRemove) {
        try { await hass.callService("todo", "remove_item", { entity_id: entityId, item: u }); } catch (err) {}
      }
      fetchItems();
    };
  }

  fetchItems();
};

class FaberSpesa extends HTMLElement {
  static getConfigElement() { return document.createElement("faber-spesa-editor"); }
  setConfig(config) {
    this._cfg = Object.assign({
      entity: "todo.shopping_list",
      name: "Spesa"
    }, config || {});
    this._built = false;
  }
  set hass(hass) {
    this._hass = hass;
    this._update();
  }
  getCardSize() { return 1; }
  static getStubConfig() { return { type: "custom:faber-spesa", name: "Spesa" }; }

  _update() {
    if (!this._hass) return;
    const st = this._hass.states[this._cfg.entity];
    const count = st ? (parseInt(st.state, 10) || 0) : 0;

    if (!this._built) {
      this._built = true;
      this.innerHTML = `
        <style>${FSP_CSS}</style>
        <div class="fsp-card" data-card>
          <div class="fsp-top">
            <div class="fsp-icon"><ha-icon icon="mdi:cart-outline"></ha-icon></div>
            <div class="fsp-badge-pill" data-badge>${count}</div>
          </div>
          <div class="fsp-center">
            <div class="fsp-title">${fhEsc(this._cfg.name || "Spesa")}</div>
            <div class="fsp-sub" data-sub>${count > 0 ? (`${count} da acquistare`) : "Tutto fatto"}</div>
          </div>
          <button type="button" class="fsp-btn-act" data-btn>
            <span>Apri Lista</span>
            <ha-icon icon="mdi:arrow-right"></ha-icon>
          </button>
        </div>`;

      const c = this.querySelector("[data-card]");
      if (c) {
        c.onclick = (e) => {
          fhVibra(8);
          if (window.fhOpenSpesaModal) {
            window.fhOpenSpesaModal(this._hass, this._cfg.entity, { chiaro: !!this.closest(".fh-app.chiaro") });
          }
        };
      }
    }

    const sub = this.querySelector("[data-sub]");
    if (sub) sub.textContent = count > 0 ? `${count} da acquistare` : "Tutto fatto · tocca per aprire";
    const badge = this.querySelector("[data-badge]");
    if (badge) badge.textContent = count;
  }
}
customElements.define("faber-spesa", FaberSpesa);

window.customCards = window.customCards || [];
const existingCards = window.customCards.map(x => x.type);
if (!existingCards.includes("faber-cancello")) {
  window.customCards.push({
    type: "faber-cancello",
    name: "Faber Cancello",
    description: "Comando per cancello carrabile con timer animato e cancelletto pedonale.",
    preview: true,
    documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
  });
}
if (!existingCards.includes("faber-fuoricasa")) {
  window.customCards.push({
    type: "faber-fuoricasa",
    name: "Faber Fuori casa",
    description: "Attiva e disattiva l'automazione fuori casa, con le condizioni lette dall'automazione stessa.",
    preview: true,
    documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
  });
}
if (!existingCards.includes("faber-automazioni")) window.customCards.push({ type: "faber-automazioni", name: "Faber Automazioni", description: "Routine, presenza e sistema: interruttori e stato in un foglio.", preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home" });
if (!existingCards.includes("faber-rifiuti")) window.customCards.push({ type: "faber-rifiuti", name: "Faber Rifiuti", description: "Cosa esporre stasera, calendario porta a porta e centro raccolta.", preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home" });
if (!existingCards.includes("faber-manuali")) window.customCards.push({ type: "faber-manuali", name: "Faber Manuali", description: "I libretti di casa: uno solo si apre al tocco, piu di uno aprono l'elenco.", preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home" });
if (!existingCards.includes("faber-robot")) window.customCards.push({ type: "faber-robot", name: "Faber Robot", description: "Robot aspirapolvere: stato e comandi; il tocco apre mappa/stanze, modalità, base, scene e ricambi.", preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home" });
if (!existingCards.includes("faber-player")) window.customCards.push({ type: "faber-player", name: "Faber Player", description: "Casse Alexa, Fire TV e altoparlanti con scelta della cassa.", preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home" });
if (!existingCards.includes("faber-pulsantiera")) window.customCards.push({ type: "faber-pulsantiera", name: "Faber Pulsantiera", description: "Tasti per telecomandi Broadlink e pulsanti di casa.", preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-faber-home" });
if (!existingCards.includes("faber-spesa")) {
  window.customCards.push({
    type: "faber-spesa",
    name: "Faber Spesa",
    description: "Card spettacolare e interattiva per la lista della spesa con popup mini-app.",
    preview: true,
    documentationURL: "https://github.com/cristianwebonline/ha-faber-home",
  });
}
