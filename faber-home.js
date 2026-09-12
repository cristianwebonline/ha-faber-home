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
const FH_VERSION = "0.96.0";
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
    cardStyle: "piene",
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
  setScene(mode, dark, forza) {
    const f = forza == null ? this.forza : Math.max(0, Math.min(1, forza));
    const changed = mode !== this.mode || dark !== this.dark || f !== this.forza;
    this.mode = mode || "stars";
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
      for (let i = 0, n = this._count(7000); i < n; i++)
        p.push({ x: R() * this.w, y: R() * this.h, r: .8 + R() * 1.6, vy: -(.08 + R() * .14), vx: (R() - .5) * .08, a: .15 + R() * .35 });
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
        d.y += d.vy * an; d.x += d.vx * an;
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
        // Da .55-1 a .18-1: prima una stella debole passava da 0,12 a 0,22 di
        // trasparenza, cioe un decimo di scarto su un puntino di un pixel —
        // si muoveva per il computer, non per l'occhio. E' lo stesso errore
        // fatto con le animazioni delle icone: un movimento c'era, ma sotto
        // la soglia in cui qualcuno lo nota.
        // A forza piena scintilla da .18 a 1; abbassandola il fondo si alza e
        // l'oscillazione si stringe, fino a restare quasi ferma.
        const f = this.forza == null ? .7 : this.forza;
        const min = 1 - .82 * f;
        const tw = min + (1 - min) * (.5 + .5 * Math.sin(t * d.sp + d.ph));
        // L'alone si disegna prima, sotto la stella, e RESPIRA insieme a lei:
        // e l'alone che fa "luce", il puntino da solo fa "granello".
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
  @keyframes fhVapore{0%{opacity:0;transform:translateY(2px) scaleX(.7)}
    35%{opacity:.85}100%{opacity:0;transform:translateY(-9px) scaleX(1.25)}}
  @keyframes fhGoccia{0%{opacity:0;transform:translateY(0)}
    20%{opacity:.9}100%{opacity:0;transform:translateY(11px)}}
  @keyframes fhGira{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes fhDondola{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
  @keyframes fhSonno{0%{opacity:0;transform:translate(0,0) scale(.6)}
    30%{opacity:.9}100%{opacity:0;transform:translate(5px,-9px) scale(1.1)}}
  @keyframes fhSchermo{0%,100%{opacity:.25}50%{opacity:.85}}
  @keyframes fhLampada{0%,100%{opacity:.3}50%{opacity:.75}}
  @keyframes fhSole{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
  .fh-arte svg{display:block;overflow:visible}
  .fh-arte .an{transform-box:fill-box;transform-origin:center}
  .fh-vapore{animation:fhVapore 2.6s ease-out infinite}
  .fh-goccia{animation:fhGoccia 1.9s ease-in infinite}
  .fh-cestello{animation:fhGira 4.2s linear infinite}
  .fh-foglia{animation:fhDondola 3.4s ease-in-out infinite}
  .fh-zzz{animation:fhSonno 3.2s ease-out infinite}
  .fh-schermo{animation:fhSchermo 3s ease-in-out infinite}
  .fh-luce{animation:fhLampada 3.4s ease-in-out infinite}
  .fh-sole{animation:fhSole 3.6s ease-in-out infinite}
  @media (prefers-reduced-motion: reduce){
    .fh-vapore,.fh-goccia,.fh-cestello,.fh-foglia,.fh-zzz,.fh-schermo,.fh-luce,.fh-sole{animation:none}
  }`;

// LE ICONE DELLA FUCINA.
// Non se ne fa una copia: si legge la stessa raccolta che usa Mini Card
// (`faber_icone` nelle preferenze del frontend). Un'icona disegnata col
// telefono si ritrova qui, e viceversa.
const FH_CHIAVE_ICONE = "faber_icone";
let FH_ICONE_MIE = null;
async function fhIconeCarica(hass) {
  if (FH_ICONE_MIE) return FH_ICONE_MIE;
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
  ["camera", "Camera"], ["cameretta", "Cameretta (stella)"], ["cameretta2", "Cameretta (palla)"],
  ["cucina", "Cucina"], ["sala", "Sala"], ["bagno", "Bagno"], ["lavatoio", "Lavatoio"],
  ["giardino", "Giardino"], ["ufficio", "Ufficio"], ["porta", "Generica"],
];

// Dal nome dell'icona si indovina la scena: cosi le stanze che ci sono gia
// funzionano senza toccare niente. Con `arte:` nella pagina si forza a mano.
function fhTipoStanza(pg) {
  if (pg.arte) return pg.arte;
  const i = String(pg.icon || "").toLowerCase();
  const n = String(pg.title || "").toLowerCase();
  const cerca = s => i.includes(s) || n.includes(s);
  if (cerca("bed") || cerca("camera")) return "camera";
  if (cerca("silverware") || cerca("cucina") || cerca("countertop")) return "cucina";
  if (cerca("sofa") || cerca("sala") || cerca("soggiorno")) return "sala";
  if (cerca("shower") || cerca("toilet") || cerca("bagno")) return "bagno";
  if (cerca("washing") || cerca("lavatoio") || cerca("bucato")) return "lavatoio";
  if (cerca("flower") || cerca("giardino") || cerca("tree")) return "giardino";
  if (cerca("desk") || cerca("ufficio") || cerca("office")) return "ufficio";
  return "porta";
}

function fhArteStanza(tipo, s) {
  const w = `width="${s}" height="${s}" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"`;
  const scene = {
    camera: `
      <path class="fh-zzz" style="animation-delay:0s" d="M30 17h5l-5 5h5" stroke-width="1.7" opacity=".9"/>
      <path class="fh-zzz" style="animation-delay:1.1s" d="M36 12h3.5l-3.5 3.5h3.5" stroke-width="1.5" opacity=".7"/>
      <path d="M7 34v-9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3"/>
      <path d="M19 28h18a4 4 0 0 1 4 4v2"/>
      <path d="M5 34h38"/><path d="M9 34v3"/><path d="M39 34v3"/>
      <rect x="9" y="23" width="8" height="5" rx="2.2" fill="currentColor" opacity=".22" stroke="none"/>`,
    cameretta: `
      <g class="fh-sole an" style="transform-origin:34px 13px">
        <path d="M34 9l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z"
          fill="currentColor" stroke="none" opacity=".5"/></g>
      <path d="M8 34v-8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2"/>
      <path d="M18 28h14a4 4 0 0 1 4 4v2"/>
      <path d="M6 34h32"/><path d="M10 34v3"/><path d="M34 34v3"/>
      <rect x="10" y="24" width="6" height="4" rx="1.8" fill="currentColor" opacity=".22" stroke="none"/>`,
    cameretta2: `
      <g class="fh-foglia an" style="transform-origin:34px 14px">
        <circle cx="34" cy="14" r="4.6"/><path d="M29.6 12.6c2.6 1 6.2 1 8.8 0" stroke-width="1.5"/>
        <path d="M34 9.4c-1.4 2.6-1.4 6.6 0 9.2" stroke-width="1.5"/></g>
      <path d="M8 34v-8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2"/>
      <path d="M18 28h14a4 4 0 0 1 4 4v2"/>
      <path d="M6 34h32"/><path d="M10 34v3"/><path d="M34 34v3"/>
      <rect x="10" y="24" width="6" height="4" rx="1.8" fill="currentColor" opacity=".22" stroke="none"/>`,
    cucina: `
      <path class="fh-vapore" style="animation-delay:0s" d="M20 17c0-2 2-2 2-4" stroke-width="1.7" opacity=".8"/>
      <path class="fh-vapore" style="animation-delay:.7s" d="M24 16c0-2 2-2 2-4" stroke-width="1.7" opacity=".8"/>
      <path class="fh-vapore" style="animation-delay:1.4s" d="M28 17c0-2 2-2 2-4" stroke-width="1.7" opacity=".8"/>
      <path d="M14 23h20l-1.6 12a3 3 0 0 1-3 2.6h-10.8a3 3 0 0 1-3-2.6z"/>
      <path d="M12 23h24"/><path d="M34 26h4a2.5 2.5 0 0 1 0 5h-3"/>`,
    sala: `
      <rect class="fh-schermo" x="30" y="10" width="13" height="9" rx="1.6" fill="currentColor" stroke="none" opacity=".3"/>
      <rect x="30" y="10" width="13" height="9" rx="1.6"/>
      <path d="M34.5 22h4"/>
      <path d="M6 33v-7a3 3 0 0 1 3-3 3 3 0 0 1 3 3v2"/>
      <path d="M26 33v-7a3 3 0 0 1 3-3 3 3 0 0 1 3 3v7"/>
      <path d="M12 28h14a2 2 0 0 1 2 2v3H10v-3a2 2 0 0 1 2-2z"/>
      <path d="M8 33h24"/><path d="M11 33v3"/><path d="M29 33v3"/>`,
    bagno: `
      <path d="M24 8v6"/><path d="M16 14h16a1 1 0 0 1 1 1v2H15v-2a1 1 0 0 1 1-1z"/>
      <circle class="fh-goccia" style="animation-delay:0s" cx="19" cy="21" r="1.5" fill="currentColor" stroke="none"/>
      <circle class="fh-goccia" style="animation-delay:.6s" cx="24" cy="21" r="1.5" fill="currentColor" stroke="none"/>
      <circle class="fh-goccia" style="animation-delay:1.2s" cx="29" cy="21" r="1.5" fill="currentColor" stroke="none"/>
      <path d="M9 32h30v2a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5z"/>
      <path d="M7 32h34"/>`,
    lavatoio: `
      <rect x="11" y="8" width="26" height="32" rx="4"/>
      <path d="M15 14h8"/><circle cx="32" cy="14" r="1.4" fill="currentColor" stroke="none"/>
      <circle cx="24" cy="27" r="8.5"/>
      <g class="fh-cestello an">
        <circle cx="24" cy="27" r="5" stroke-width="1.7" opacity=".85"/>
        <path d="M24 22v3" stroke-width="1.7"/><path d="M24 29v3" stroke-width="1.7"/>
        <path d="M19 27h3" stroke-width="1.7"/><path d="M26 27h3" stroke-width="1.7"/>
      </g>`,
    giardino: `
      <circle class="fh-sole an" cx="37" cy="12" r="4" fill="currentColor" stroke="none" opacity=".45"/>
      <circle cx="37" cy="12" r="4"/>
      <path d="M24 40V24"/>
      <g class="fh-foglia an"><path d="M24 27c-7 0-10-4-10-9 6 0 10 3 10 9z"/></g>
      <g class="fh-foglia an" style="animation-delay:1.2s"><path d="M24 31c6 0 9-3 9-8-5 0-9 3-9 8z"/></g>
      <path d="M16 40h16"/>`,
    ufficio: `
      <path class="fh-luce" d="M18 20l-8 12h16z" fill="currentColor" stroke="none" opacity=".35"/>
      <path d="M14 12h8l4 8h-8z"/><path d="M18 20v4"/>
      <path d="M7 32h34"/><path d="M11 32v6"/><path d="M37 32v6"/>
      <rect x="28" y="24" width="11" height="8" rx="1.4"/>`,
    porta: `
      <path d="M14 8h20v32H14z"/><path d="M11 40h26"/>
      <circle class="fh-luce" cx="29" cy="24" r="1.8" fill="currentColor" stroke="none"/>
      <path d="M20 8v32" opacity=".35"/>`,
  };
  return `<svg ${w}>${scene[tipo] || scene.porta}</svg>`;
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
            <button type="button" class="fh-ic" data-act="tema" data-tema="${fhEsc(this._cfg.appearance.temaFisso || "auto")}"
              title="${fhTitoloTema(this._cfg.appearance.temaFisso, this._isDark())}">
              <ha-icon icon="${this._isDark() ? "mdi:weather-night" : "mdi:white-balance-sunny"}"></ha-icon></button>
            <button type="button" class="fh-ic" data-act="reload" title="Ricarica"><ha-icon icon="mdi:refresh"></ha-icon></button>
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
        if (ic) ic.setAttribute("icon", scuro ? "mdi:weather-night" : "mdi:white-balance-sunny");
        this._save(true);
      }
      else if (b.dataset.act === "reload") location.reload();
    }));
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
    let n = 0;
    [...new Set(ent)].forEach(e => {
      const st = hass.states[e];
      if (!st) return;
      if (e.startsWith("climate.")) { if (!["off", "unavailable", "unknown"].includes(st.state)) n++; }
      else if (["on", "open", "unlocked"].includes(st.state)) n++;
    });
    return n;
  }
  // Il termometro della stanza: il primo sensore di temperatura che le sue card
  // nominano. Nessuna configurazione in piu da tenere allineata.
  _tempDiPagina(id) {
    const hass = this._hass;
    if (!hass) return null;
    const ent = this._entitaDiPagina(id, ["temp"]);
    for (const e of [...new Set(ent)]) {
      const st = hass.states[e];
      const v = st ? parseFloat(st.state) : NaN;
      if (!isNaN(v)) return v;
    }
    return null;
  }

  _chipsHTML() { return this._chipsDati().map(d => this._chipHTML(d)).join(""); }

  _chipHTML(d) {
    const tag = d.tipo === "meteo" ? "div" : "button";
    const attr = d.tipo === "meteo" ? "" :
      d.tipo === "link" ? ` type="button" data-chip-link="${fhEsc(d.target)}"`
      : d.tipo === "pagina" ? ` type="button" data-chip-page="${fhEsc(d.target)}"`
      : ` type="button" data-chip-entity="${fhEsc(d.target || "")}"`;
    return `<${tag} class="fh-chip${d.on ? " on" : ""}" data-key="${fhEsc(d.key)}"${attr}>
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
    const stesse = nodi.length === dati.length &&
      dati.every((d, i) => nodi[i].dataset.key === d.key);
    if (stesse) {
      dati.forEach((d, i) => {
        const n = nodi[i];
        n.classList.toggle("on", !!d.on);
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

  _chipsDati() {
    const hass = this._hass;
    const h = this._cfg.header;
    const out = [];
    const wEnt = h.weather && hass ? hass.states[h.weather] : null;
    const tEnt = h.temperature && hass ? hass.states[h.temperature] : null;
    const temp = tEnt ? tEnt.state : (wEnt && wEnt.attributes ? wEnt.attributes.temperature : null);
    if (temp != null) {
      out.push({
        key: "meteo", tipo: "meteo",
        icon: wEnt ? (FH_WEATHER_ICON[wEnt.state] || "mdi:weather-partly-cloudy") : "mdi:thermometer",
        label: temp + "\u00b0",
        sotto: wEnt ? (FH_WEATHER_IT[wEnt.state] || wEnt.state) : "",
      });
    }
    (h.chips || []).forEach(chip => {
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
    this._renderPage();
    this._inCima();
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
    // Il cerchio ambra rialzato NON è una voce fissa: marca la pagina attiva,
    // e si sposta quando cambi pagina.
    nav.innerHTML = `<div class="fh-navbar">${voci.map(({ pg: p, i }) => i === this._page
      ? `<button type="button" class="fh-navitem active" data-page="${i}">
           <span class="fh-navcircle"><ha-icon icon="${fhEsc(p.icon || "mdi:circle")}"></ha-icon></span>
           <span class="fh-navlabel">${fhEsc(p.title || "")}</span>
         </button>`
      : `<button type="button" class="fh-navitem${p.nascosta && !modoStanza ? " nascosta" : ""}" data-page="${i}">
           <ha-icon icon="${fhEsc(p.icon || "mdi:circle-outline")}"></ha-icon>
           <span class="fh-navlabel">${fhEsc(p.title || "")}</span>
         </button>`).join("")}</div>`;
    // IL TASTO STANZE.
    // Con una pagina per stanza la barra non le puo contenere tutte, e la Casa
    // riempita di tessere diventa un muro. Cosi le stanze stanno dietro un
    // tasto solo: si tocca, si sceglie, si e dentro.
    const stanze = this._cfg.pages.filter(p => p.stanza);
    if (stanze.length && !this._edit) {
      const barra = nav.querySelector(".fh-navbar");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fh-navitem";
      b.innerHTML = `<ha-icon icon="mdi:floor-plan"></ha-icon><span class="fh-navlabel">Stanze</span>`;
      b.addEventListener("click", () => this._apriStanze());
      barra.appendChild(b);
    }
    nav.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.dataset.page, 10);
      if (i === this._page) return;
      this._vaiPagina(i);
    }));
    // La barra e appena stata ridisegnata e puo aver cambiato altezza (una
    // pagina in piu, una nascosta): rimisuro, senno lo spazio sotto resta
    // tarato su quella di prima e l'ultima card finisce coperta.
    this._misuraNav();
    // Ora che ci sono tutte le voci (Stanze compreso) si guarda se ci stanno:
    // se non ci stanno la barra scorre invece di schiacciarle in tacche
    // illeggibili.
    this._adattaBarra(nav);
    // Se la barra scorre, la voce attiva si porta al centro da sola.
    const barra = nav.querySelector(".fh-navbar.molte");
    const attiva = barra && barra.querySelector(".fh-navitem.active");
    if (barra && attiva) {
      const x = attiva.offsetLeft - (barra.clientWidth - attiva.offsetWidth) / 2;
      barra.scrollTo({ left: Math.max(0, x), behavior: this._navPronta ? "smooth" : "auto" });
      this._navPronta = true;
    }
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
  _fasciaDa(w) { return w < 560 ? "tel" : w < 920 ? "tab" : "desk"; }

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
    this._misuraNav();
    this._misuraQuadre();
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
        // La PRIMA misura vera fa sempre ridisegnare, anche se la fascia
        // sembra la stessa: quella di partenza era una supposizione, non una
        // misura, e il numero di colonne poteva gia essere sbagliato.
        if (primaVolta || cambiata) this._renderPage();
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
    const n = (row.cols || []).length || 1;
    const f = this._fasciaOra();
    const scelto = f === "tel" ? row.n_tel : f === "tab" ? row.n_tab : row.n_desk;
    if (scelto) return Math.max(1, Math.min(n, scelto));
    const minima = f === "tel" ? 165 : 240;
    // Se la larghezza vera non si conosce ancora, si chiede alla finestra
    // invece di inventarne una: prima qui c'era 900, cioe uno schermo grande,
    // e su un telefono usciva una pagina a tre colonne piu larga dello schermo.
    const w = this._larghezza || this.clientWidth || window.innerWidth || 400;
    return Math.max(1, Math.min(n, Math.floor((w + 14) / (minima + 14))));
  }

  async _renderPage() {
    const main = this.querySelector("[data-main]");
    if (!main) return;
    this._watchFascia();
    this._applySidebar();
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
      const n = this._colonneRiga(row);
      inner.style.setProperty("--fh-n", n);
      // Quando le colonne non ci stanno tutte in riga (tre colonne su un
      // telefono che ne mostra due), quelle di troppo vanno a capo e il
      // risultato e un accavallamento: card di altezze diverse, disallineate,
      // con buchi in mezzo. In quel caso si smonta il raggruppamento in
      // colonne e le card entrano DIRETTAMENTE nella griglia: cosi quelle
      // sulla stessa riga combaciano sempre. In modifica no: li servono gli
      // strumenti di colonna.
      const piatta = !this._edit && n < (row.cols || []).length;
      inner.classList.toggle("piatta", piatta);
      (row.cols || []).forEach((col, ci) => {
        const colEl = document.createElement("div");
        colEl.className = "fh-col";
        // Una colonna non puo occupare piu tracce di quante ne esistano: su
        // telefono con due colonne, una "larga 3" prenderebbe il posto di
        // colonne che non ci sono e sfonderebbe la griglia.
        const quante = Math.min(col.span || 1, n);
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
          // Smontando il gruppo la larghezza della colonna deve passare alle
          // CARD, che diventano loro gli elementi della griglia. Senza questo
          // una card larga due colonne si ritrovava stretta in una sola: era
          // il meteo che tornava verticale appena salvato, mentre in modifica
          // (dove il gruppo resta montato) si vedeva giusto.
          if (piatta && quante > 1) slot.style.gridColumn = `span ${quante}`;
          const h = this._altezzaCard(cardCfg);
          if (h) { slot.style.setProperty("--fh-h", h + "px"); slot.classList.add("fissa"); }
          if (cardCfg && cardCfg.fh_forma === "quadra") {
            slot.classList.add("quadra");
            // La misura del quadrato segue la taglia scelta per la card
            // (oggi solo la persona ce l'ha): "piccola" deve dare un
            // quadrato piccolo davvero, non un quadrato uguale a tutti con
            // dentro una foto piu piccola.
            const cap = FH_QUADRA_CAP[cardCfg.grandezza];
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

  // Quanto e larga ogni casella quadrata, adesso: glielo si chiede dopo che
  // la pagina e stata disposta, perche prima la larghezza non esiste ancora.
  // Si scrive come altezza MINIMA, non fissa: e la differenza fra una card
  // quadrata e una card tagliata.
  // Misurare la larghezza e scrivere l'altezza non innesca nessun giro
  // vizioso: cambiando l'altezza la larghezza non si muove.
  _misuraQuadre() {
    const quadre = this.querySelectorAll(".fh-slot.quadra");
    if (!quadre.length) return;
    const applica = () => quadre.forEach(el => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) el.style.setProperty("--fh-q", w + "px");
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
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "fissa") rows[ri].fissa = !rows[ri].fissa;
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
      this.querySelectorAll(".fh-menupop").forEach(x => { if (x !== pop) x.hidden = true; });
      pop.hidden = !pop.hidden;
      if (!pop.hidden) {
        const chiudi = () => { pop.hidden = true; document.removeEventListener("click", chiudi, true); };
        setTimeout(() => document.addEventListener("click", chiudi, true), 0);
      }
    });
    el.querySelectorAll("[data-forma]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      pop.hidden = true;
      this._formaCard(ri, ci, di, b.dataset.forma);
    }));
    this._wireDrag(el.querySelector("[data-grip]"), ri, ci, di);
    const cols = this._cfg.pages[this._page].rows[ri].cols;
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "menu") return;
      if (pop) pop.hidden = true;
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
    scrim.addEventListener("click", e => { if (e.target === scrim) scrim.remove(); });
    sheet.querySelector("[data-close]").addEventListener("click", () => scrim.remove());
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
    this._sheet("Disegno di " + (pg.title || "questa stanza"), box, false);
    const mie = await fhIconeCarica(this._hass);
    const draw = () => {
      const ora = fhTipoStanza(pg);
      box.innerHTML = `
        <style>${FH_ARTE_CSS}</style>
        <div class="fh-lab2">Disegni del pannello <small>si muovono da soli</small></div>
        <div class="fh-disegni">${FH_SCENE.map(([id, nome]) => `
          <button type="button" class="fh-dis${!pg.icona_svg && ora === id ? " on" : ""}" data-scena="${id}">
            <span class="fh-arte">${fhArteStanza(id, 40)}</span><span>${fhEsc(nome)}</span>
          </button>`).join("")}</div>

        <div class="fh-lab2" style="margin-top:16px">Le tue icone <small>quelle della Fucina</small></div>
        ${mie.length ? `<div class="fh-disegni">${mie.map(ic => `
          <button type="button" class="fh-dis${pg.icona_id === ic.id ? " on" : ""}" data-mia="${fhEsc(ic.id)}">
            <span class="fh-arte fucina">${ic.svg}</span><span>${fhEsc(ic.nome || "senza nome")}</span>
          </button>`).join("")}</div>`
          : `<div class="fh-note">La raccolta e vuota. Le icone si disegnano con la <b>Fucina Icone</b> e si salvano
             dall'editor di una Mini Card: da li finiscono nella raccolta e compaiono anche qui.</div>`}
        <button type="button" class="fh-btn primary" data-torna style="width:100%;margin-top:16px">
          Torna alle stanze</button>`;
      const tr = box.querySelector("[data-torna]");
      if (tr) tr.addEventListener("click", () => {
        const s = this.querySelector(".fh-scrim"); if (s) s.remove();
        this._modificaStanze = true;
        this._apriStanze(true);
      });
      box.querySelectorAll("[data-scena]").forEach(b => b.addEventListener("click", () => {
        pg.arte = b.dataset.scena;
        pg.icona_svg = ""; pg.icona_id = "";
        this._stanzeMosse = true;
        draw();
      }));
      box.querySelectorAll("[data-mia]").forEach(b => b.addEventListener("click", () => {
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
    this._sheet("Aggiungi una stanza", box, false);
  }

  // Chiedere un testo senza `prompt`: nella WebView dell'app la finestrella di
  // sistema non compare e il tasto sembra rotto.
  _chiediNome(valore, poi) {
    const box = document.createElement("div");
    box.innerHTML = `<input class="fh-input" id="fhNome" value="${fhEsc(valore)}" placeholder="Nome della stanza"
        style="width:100%;box-sizing:border-box">
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
    if (!mantieni) { this._ordinaStanze = false; this._modificaStanze = false; }
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
      const acc = this._contaAccesiPagina(p.id);
      return `<div class="fh-stanza${acc ? " viva" : ""}${ord ? " ord" : ""}" data-vai="${i}"
        style="--ritardo:${(k % 5) * 140}ms">
        <span class="fh-alone"></span>
        <span class="fh-arte${p.icona_svg ? " fucina" : ""}">${p.icona_svg
          ? p.icona_svg
          : fhArteStanza(fhTipoStanza(p), 46)}</span>
        <span class="fh-stanzanome">${fhEsc(p.title || p.id)}</span>
        <span class="fh-stanzadati">
          ${gr != null ? `<b>${String(gr.toFixed(1)).replace(".", ",")}\u00b0</b>` : ""}
          ${acc ? `<i>${acc} ${acc === 1 ? "acceso" : "accesi"}</i>` : ""}
        </span>
        ${ord ? `<span class="fh-frecce">
          <button type="button" data-su="${k}" ${k === 0 ? "disabled" : ""}>&larr;</button>
          <button type="button" data-giu="${k}" ${k === stanze.length - 1 ? "disabled" : ""}>&rarr;</button>
        </span>` : ""}
        ${mod ? `<span class="fh-frecce">
          <button type="button" data-scena="${i}" title="Cambia disegno"><ha-icon icon="mdi:palette-outline"></ha-icon></button>
          <button type="button" data-rinomina="${i}" title="Rinomina"><ha-icon icon="mdi:rename-outline"></ha-icon></button>
          <button type="button" class="via" data-togli="${i}" title="Togli dalle stanze">&times;</button>
        </span>` : ""}
      </div>`;
    }).join("")}
      ${mod ? `<button type="button" class="fh-stanza aggiungi" data-nuova>
        <ha-icon icon="mdi:plus"></ha-icon><span class="fh-stanzanome">Nuova stanza</span></button>` : ""}
      </div>
      ${ord ? `<div class="fh-note">Le frecce spostano la stanza nell'elenco. Si salva premendo <b>Fatto</b> o chiudendo il foglio.</div>` : ""}
      ${mod ? `<div class="fh-note">La tavolozza cambia il disegno, la matita il nome, la <b>&times;</b> toglie la stanza dall'elenco (la pagina resta, non si cancella niente). Si salva premendo <b>Fatto</b> o chiudendo il foglio.</div>` : ""}`;

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
      const buone = dc ? tutte.filter(e => st[e].attributes.device_class === dc) : [];
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

        ${this._entityListHTML("stWeather", h.weather, "weather.", "Meteo")}
        ${this._entityListHTML("stTemp", h.temperature, "sensor.", "Temperatura mostrata", "temperature")}
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
        draw();
        this._segnaFascia();   // e' li che si accende o si spegne il vetro
        apply();
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
    const w = this._cfg.header.weather;
    const cond = w && this._hass && this._hass.states[w] ? this._hass.states[w].state : "";
    if (cond !== this._lastCond) {
      this._lastCond = cond;
      const app = this.querySelector(".fh-app");
      if (app) app.style.background = this._pageBackground();
    }
    this._updateChips();
  }

  _wireChips() {
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
  /* Il quadrato e una misura MINIMA, non un vincolo: se il contenuto chiede
     piu spazio la card si allunga invece di tagliarlo. Su schermo largo lo
     spazio c'e e resta quadrata; su una colonna da 165px del telefono si
     allunga quel tanto che basta a far entrare foto, nome, stato e batteria. */
  .fh-slot.quadra{width:100%;min-height:var(--fh-q,0px);
    max-width:min(100%,var(--fh-quadra,340px));margin-inline:auto}
  .fh-slot.quadra>*:not(.fh-tools):not(.fh-shield):not(.fh-ang){
    display:block;height:auto;min-height:100%}
  .fh-slot.quadra ha-card{min-height:100%;height:auto;box-sizing:border-box}
  /* In una card quadrata il contenuto e piu corto del riquadro: senza questo
     resta appeso in alto e sotto la batteria si apre mezza card vuota.
     Centrato in verticale il vuoto si divide fra sopra e sotto e non si nota
     piu; la foto invece cresce con la card, cosi il quadrato si riempie
     davvero invece di ospitare un francobollo in mezzo al bianco. */
  .fh-slot.quadra .fp-body{min-height:100%;height:auto;box-sizing:border-box;justify-content:center}
  .fh-slot.quadra .fp-avatar{width:min(var(--fp-d,108px) * 1.35, 58%)}
  /* Il blocco del testo nasce con flex:1, cioe "prenditi tutto lo spazio che
     avanza": in una card alta quanto serve va benissimo, ma in una quadrata
     si allungava lui e lo spazio libero finiva DENTRO di lui, sotto la
     batteria. Cosi il centraggio qui sopra non aveva niente da centrare.
     Nel quadrato il testo torna alto quanto il suo contenuto, e il vuoto
     torna al corpo della card che lo divide fra sopra e sotto. */
  .fh-slot.quadra .fp-testo{flex:0 0 auto}
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
  .fh-menupop{position:absolute;right:0;top:34px;z-index:30;min-width:196px;padding:6px;
    border-radius:16px;border:1px solid rgba(255,255,255,.16);
    background:#171b22;color:#eaf1f8;
    box-shadow:0 18px 44px rgba(0,0,0,.6)}
  .fh-app.vetro.chiaro .fh-menupop{background:#fbfaf7;color:#12161c;
    border-color:rgba(15,23,42,.14);box-shadow:0 18px 44px rgba(15,23,42,.22)}
  .fh-app.vetro.chiaro .fh-mi{color:#12161c}
  .fh-app.vetro.chiaro .fh-milab{color:#4b5563}
  .fh-app.vetro.chiaro .fh-misep{background:rgba(15,23,42,.12)}
  .fh-mi{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border-radius:9px;
    border:none;background:none;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;
    text-align:left;color:inherit}
  .fh-mi ha-icon{--mdc-icon-size:16px;flex:0 0 auto;opacity:.75}
  .fh-mi:hover{background:rgba(255,176,32,.14)}
  .fh-mi.rosso{color:#ff8f8f}
  .fh-app.vetro.chiaro .fh-mi.rosso{color:#b91c1c!important}
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
  .fh-app.vetro .fh-main{
    --ha-card-background:rgba(255,255,255,.10);
    --card-background-color:rgba(255,255,255,.10);
    --ha-card-border-color:rgba(255,255,255,.16);
    --ha-card-box-shadow:0 8px 26px rgba(0,0,0,.34);
  }
  .fh-app.vetro .fh-slot ha-card{
    backdrop-filter:blur(20px) saturate(1.25);
    -webkit-backdrop-filter:blur(20px) saturate(1.25);
  }
  /* LE CARD DI CASA NOSTRA hanno il colore di fondo scritto dentro di se
     (--mc-panel, --eca-panel, --csc-panel...), quindi la variabile di Home
     Assistant qui sopra non le tocca nemmeno: restavano piene mentre le
     altre diventavano di vetro. E siccome sono proprio quelle che riempiono
     la pagina, il cielo non si vedeva da nessuna parte — ecco perche le
     stelle "mancavano" anche dopo averle infittite: c'erano, ma sotto a dei
     pannelli opachi. Qui si riscrive la LORO variabile, non il loro sfondo:
     cosi tutto quello che ci e costruito sopra (velature, bordi, sfumature)
     resta coerente invece di essere schiacciato da un colore piatto. */
  /* Senza passare da .fh-slot: quel pezzo in mezzo legava la regola alla
     forma esatta dell'impalcatura, e se la card sta annidata anche solo un
     gradino piu in la la regola non la trova. Qui basta stare dentro il
     pannello. L'important non e pigrizia: sto deliberatamente scavalcando lo
     stile interno di un componente, e voglio che vinca sempre, anche se un
     domani quella card dichiara il proprio fondo in modo piu forte. */
  .fh-range{width:100%;accent-color:var(--fh-acc,#ffb020);height:26px}
  .fh-rangeval{font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;
    text-align:right;padding-top:4px;color:var(--fh-ink)}
  /* DI NOTTE il vetro deve SCHIARIRE. Prima era scuro (18,24,34) sopra un
     cielo gia scuro: due scuri sovrapposti non si distinguono, e il risultato
     e che il vetro sembrava non esserci affatto. Un vetro smerigliato sopra
     il buio si vede perche e piu CHIARO di cio che copre. Bianco a bassa
     trasparenza: le stelle passano, e il testo chiaro delle card resta
     leggibile perche il fondo complessivo resta scuro. */
  .fh-app.vetro .mc{--mc-panel:rgba(255,255,255,.09)!important}
  .fh-app.vetro .eca{--eca-panel:rgba(255,255,255,.09)!important;--eca-solid:rgba(22,28,38,.92)!important}
  .fh-app.vetro .csc{--csc-panel:rgba(255,255,255,.09)!important}
  .fh-app.vetro .cbc{--cbc-panel:rgba(255,255,255,.09)!important}
  .fh-app.vetro .cec{--cec-panel:rgba(255,255,255,.09)!important}
  /* La card del METEO resta fuori dal vetro, ed e voluto.
     Ha gia una veste per ogni tempo — sereno ambra, nuvoloso celeste con le
     nuvole, pioggia blu, neve quasi bianca — ognuna col suo testo scuro
     abbinato. Imporle il vetro voleva dire coprirla di bianco e cancellare
     proprio quella veste: cambiava il tempo e la card restava sempre uguale.
     Qui il vetro toglieva invece di aggiungere, quindi non si mette. */
  .fh-app.vetro .fc,
  .fh-app.vetro .fk,
  .fh-app.vetro .fp{background:rgba(255,255,255,.09)!important}
  /* Il vetro ha senso solo se sfoca: senza, e una card sbiadita. */
  /* IL VETRO VA SUL RIQUADRO, NON SUL CONTENITORE.
     Sicurezza, Bucato ed Elettrodomestici hanno gia il loro backdrop-filter
     sul riquadro interno: quello che aggiungevamo qui sul contenitore esterno
     era ridondante, e faceva un danno. Un elemento con backdrop-filter diventa
     il riferimento dei position:fixed che contiene, e i fogli a schermo intero
     di quelle card (le ultime attivita, il dettaglio dell ora) restavano
     prigionieri dentro i confini della card, sotto la barra in basso, invece
     di coprire lo schermo. Mini Card lo faceva gia bene: il vetro su .mc-card
     e i fogli agganciati a .mc. Energia resta qui perche il vetro ce l ha solo
     da noi; i suoi fogli infatti si agganciano al documento. */
  .fh-app.vetro .mc-card,
  .fh-app.vetro .eca,
  .fh-app.vetro .fc,
  .fh-app.vetro .fk,
  .fh-app.vetro .fp{
    backdrop-filter:blur(18px) saturate(1.2)!important;
    -webkit-backdrop-filter:blur(18px) saturate(1.2)!important;
  }
  /* Di giorno, chiare. */
  /* DI GIORNO il vetro resta SCURO, ed e voluto. Le card di casa hanno il
     testo chiaro scritto dentro (--csc-ink #eaf1f8 e simili), con decine di
     colori d'accento pensati per il fondo scuro: verde chiaro, ambra, azzurro.
     Schiarendo il vetro il testo bianco finiva su bianco — quello che si
     vedeva stamattina. Rigirare tutti quei colori uno per uno vorrebbe dire
     rifare sei card e dimenticarne comunque qualcuno; un vetro scuro sopra
     un cielo chiaro invece si legge benissimo, si vede che e vetro, e non
     rompe niente. E' la stessa scelta di un paio di occhiali da sole. */
  .fh-app.vetro.chiaro .mc{--mc-panel:rgba(255,255,255,.62)!important;--mc-ink:#12161c!important;--mc-muted:#4b5563!important}
  .fh-app.vetro.chiaro .eca{--eca-panel:rgba(255,255,255,.62)!important;--eca-ink:#12161c!important;--eca-muted:#4b5563!important;--eca-faint:#64748b!important}
  .fh-app.vetro.chiaro .csc{--csc-panel:rgba(255,255,255,.62)!important;--csc-ink:#12161c!important;--csc-muted:#4b5563!important}
  .fh-app.vetro.chiaro .cbc{--cbc-panel:rgba(255,255,255,.62)!important;--cbc-ink:#12161c!important;--cbc-muted:#4b5563!important}
  .fh-app.vetro.chiaro .cec{--cec-panel:rgba(255,255,255,.62)!important;--cec-ink:#12161c!important;--cec-muted:#4b5563!important}
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
  .fh-app.vetro.chiaro .fp{background:rgba(255,255,255,.62)!important;color:#12161c!important;
    border-color:rgba(15,23,42,.12)!important}

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
    --ha-card-background:rgba(255,255,255,.58);
    --card-background-color:rgba(255,255,255,.58);
    --ha-card-border-color:rgba(15,23,42,.12);
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
    overscroll-behavior-x:contain;scroll-behavior:smooth;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%);
    mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%)}
  .fh-navbar.molte::-webkit-scrollbar{display:none}
  .fh-navbar.molte .fh-navitem{flex:0 0 auto;min-width:66px;scroll-snap-align:center}
  .fh-navbar{display:flex;align-items:flex-end;justify-content:space-around;gap:4px;
    max-width:560px;margin:0 auto;padding:8px 10px;pointer-events:auto;
    background:var(--fh-panel,rgba(30,38,48,.78));border:1px solid var(--fh-stroke,rgba(255,255,255,.09));border-radius:26px;
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 12px 30px rgba(0,0,0,.45)}
  /* L'ELENCO DELLE STANZE.
     Una griglia di nomi non dice niente: qui ogni riquadro porta gia la
     temperatura della stanza e quanto c'e di acceso, e l'icona respira. Il
     movimento e sfalsato fra un riquadro e l'altro, cosi sembra vivo e non una
     fila di cose che pulsano insieme. */
  .fh-stanzegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));gap:11px}
  .fh-stanza{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:7px;padding:20px 9px 16px;border-radius:20px;cursor:pointer;font:inherit;
    font-size:12.5px;font-weight:800;color:inherit;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:rgba(255,255,255,.06);
    transition:transform .1s ease,background .18s ease,border-color .18s ease}
  .fh-app.chiaro .fh-stanza{background:rgba(15,23,42,.05)}
  .fh-arte{position:relative;opacity:.92;line-height:0;
    animation:fh-respira 4.6s ease-in-out infinite;animation-delay:var(--ritardo,0ms)}
  .fh-stanzetop{display:flex;justify-content:flex-end;margin-bottom:10px}
  .fh-ordbtn{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:11px;cursor:pointer;
    font:inherit;font-size:12px;font-weight:800;color:inherit;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.14));background:rgba(255,255,255,.06)}
  .fh-ordbtn ha-icon{--mdc-icon-size:16px}
  .fh-ordbtn.on{background:#ffb020;border-color:#ffb020;color:#1c1400}
  .fh-stanza.ord{cursor:default}
  .fh-frecce{display:flex;gap:6px;margin-top:8px}
  .fh-frecce button{width:30px;height:26px;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;
    color:inherit;border:1px solid var(--fh-stroke,rgba(255,255,255,.18));background:rgba(255,255,255,.08)}
  .fh-frecce button:disabled{opacity:.3;cursor:not-allowed}
  .fh-frecce button ha-icon{--mdc-icon-size:15px}
  .fh-frecce button.via{color:#ff8f80}
  .fh-frecce button.chiede{width:auto;padding:0 8px;font-size:11px;font-weight:800;color:#ff5442;
    border-color:rgba(255,84,66,.5)}
  .fh-lab2{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;opacity:.6;
    margin-bottom:8px}
  .fh-lab2 small{font-size:10px;font-weight:700;letter-spacing:0;text-transform:none;opacity:.85;
    margin-left:6px}
  .fh-disegni{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:9px}
  .fh-dis{display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 6px;border-radius:15px;
    cursor:pointer;font:inherit;font-size:10.5px;font-weight:800;color:inherit;text-align:center;
    border:1px solid var(--fh-stroke,rgba(255,255,255,.12));background:rgba(255,255,255,.05)}
  .fh-dis:hover{background:rgba(255,176,32,.14)}
  .fh-dis.on{border-color:#ffb020;background:rgba(255,176,32,.18);color:#ffb020}
  .fh-arte.fucina svg{width:46px;height:46px}
  .fh-dis .fh-arte.fucina svg{width:40px;height:40px}
  .fh-stanza.aggiungi{border-style:dashed;opacity:.75}
  .fh-stanza.aggiungi ha-icon{--mdc-icon-size:28px}
  .fh-stanza.aggiungi:hover{opacity:1}
  .fh-stanzetop{gap:8px}
  .fh-stanza:active{transform:scale(.95)}
  .fh-stanza:hover{background:rgba(255,176,32,.14);border-color:rgba(255,176,32,.4)}
  .fh-stanzanome{line-height:1.2;text-align:center}
  .fh-stanzadati{display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1.15}
  .fh-stanzadati b{font-size:14px;font-weight:900;font-variant-numeric:tabular-nums}
  .fh-stanzadati i{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.03em;opacity:.62}
  /* L'alone si accende solo dove c'e qualcosa acceso: in un colpo d'occhio si
     vede dove sta consumando la casa. */
  .fh-alone{position:absolute;top:-30%;left:50%;width:120%;aspect-ratio:1/1;transform:translateX(-50%);
    border-radius:50%;background:radial-gradient(circle,rgba(255,176,32,.30),rgba(255,176,32,0) 62%);
    opacity:0;transition:opacity .4s ease;pointer-events:none}
  .fh-stanza.viva .fh-alone{opacity:1;animation:fh-pulsa 3.2s ease-in-out infinite;
    animation-delay:var(--ritardo,0ms)}
  .fh-stanza.viva .fh-arte{color:#ffb020;opacity:1}
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
  .fh-span.sel{border-color:rgba(255,176,32,.6);background:rgba(255,176,32,.18);color:var(--fh-c-soft,#ffe9c2)}
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
  .fh-sheetbody{flex:1 1 auto;min-height:0;overflow-y:auto;padding:4px 16px 24px;display:flex;flex-direction:column;gap:10px}

  .fh-sheetfoot{flex:0 0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
    padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));
    background:var(--ha-card-background,var(--card-background-color,#1c1f26));
    border-top:1px solid var(--divider-color)}
  .fh-footmsg{flex:1;min-width:120px;font-size:11.5px;color:var(--secondary-text-color)}
  .fh-catgroup{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
    color:var(--secondary-text-color);margin-top:8px}
  .fh-catlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
  .fh-catitem{display:flex;align-items:center;gap:8px;padding:11px;border-radius:14px;cursor:pointer;font:inherit;
    border:1px solid var(--divider-color);background:var(--card-background-color);
    color:var(--primary-text-color);font-size:12.5px;font-weight:700;text-align:left}
  .fh-catitem ha-icon{--mdc-icon-size:20px;color:var(--fh-c-acc,#ffb020);flex:0 0 auto}
  .fh-catitem:hover{border-color:rgba(255,176,32,.5)}
  .fh-json{width:100%;min-height:120px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;
    line-height:1.45;padding:10px;border-radius:12px;box-sizing:border-box;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fh-note{font-size:11.5px;color:var(--secondary-text-color)}
  .fh-pagerow{display:flex;align-items:center;gap:6px;padding:8px;border-radius:12px;
    border:1px solid var(--divider-color);background:var(--card-background-color)}
  .fh-pagerow ha-icon{--mdc-icon-size:18px;color:var(--fh-c-acc,#ffb020);flex:0 0 auto}
  .fh-input{flex:1;min-width:0;padding:8px 10px;border-radius:9px;font:inherit;font-size:13px;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .fh-input.small{flex:0 0 110px}



  .fh-cardwrap{position:relative}
  .fh-tap{position:absolute;inset:0;cursor:pointer;border-radius:18px}
  .fh-cardwrap.has-popup:hover .fh-tap{background:rgba(255,255,255,.04)}
  .fh-popscrim{position:fixed;inset:0;z-index:25;background:rgba(5,8,13,.62);backdrop-filter:blur(7px);
    display:flex;align-items:flex-end;justify-content:center}
  .fh-popup{width:100%;max-width:620px;max-height:88vh;display:flex;flex-direction:column;
    background:var(--fh-panel,rgba(24,30,40,.97));border:1px solid var(--fh-stroke,rgba(255,255,255,.1));
    border-bottom:none;border-radius:26px 26px 0 0;box-shadow:0 -18px 54px rgba(0,0,0,.55);
    animation:fhPopUp .22s ease-out}
  @keyframes fhPopUp{from{transform:translateY(20px);opacity:.5}to{transform:translateY(0);opacity:1}}
  .fh-pophead{display:flex;align-items:center;gap:10px;padding:16px 18px 8px}
  .fh-poptitle{flex:1;font-size:17px;font-weight:800;color:var(--fh-ink,#eaf1f8)}
  .fh-popbody{overflow-y:auto;padding:4px 16px 24px;display:flex;flex-direction:column;gap:14px}
  .fh-pcrow{display:flex;align-items:center;gap:6px;padding:9px 11px;border-radius:12px;
    border:1px solid var(--divider-color);background:var(--card-background-color)}
  .fh-pcname{flex:1;min-width:0;font-size:12.5px;font-weight:700;color:var(--primary-text-color);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .fh-addbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
  .fh-addbar .fh-addrow{flex:1;min-width:150px;margin-top:0}
  .fh-roomrow{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:14px;cursor:pointer;
    border:1px solid var(--divider-color);background:var(--card-background-color)}
  .fh-roomrow input{width:auto;flex:0 0 auto}
  .fh-roominfo{display:flex;flex-direction:column;gap:2px;min-width:0}
  .fh-dvlist{display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow-y:auto}
  .fh-dv{display:flex;flex-direction:column;gap:2px;padding:11px 13px;border-radius:14px;cursor:pointer;
    text-align:left;font:inherit;border:1px solid var(--divider-color);background:var(--card-background-color)}
  .fh-dv:hover{border-color:rgba(255,176,32,.55)}
  .fh-dvname{font-size:13.5px;font-weight:700;color:var(--primary-text-color)}
  .fh-dvmeta{font-size:11px;font-weight:600;color:var(--secondary-text-color)}
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
  cloudy:           { a: "#e2e7ee", b: "#c3ccd8", ink: "#2f3946", soft: "rgba(255,255,255,.6)",  cap: "#525f6e", art: "cloud",
                      na: "#333a45", nb: "#20252e", nink: "#e4e9f0", nsoft: "rgba(255,255,255,.11)", ncap: "#a9b3c0" },
  rainy:            { a: "#cbdded", b: "#9fbdd6", ink: "#1e3245", soft: "rgba(255,255,255,.5)",  art: "rain", cap: "#3c5b75",
                      na: "#25384c", nb: "#152230", nink: "#dbe9f6", nsoft: "rgba(255,255,255,.10)", ncap: "#9dbcd4" },
  pouring:          { a: "#b9d0e4", b: "#87a9c7", ink: "#16283a", soft: "rgba(255,255,255,.45)", art: "rain", cap: "#33506b",
                      na: "#1e3145", nb: "#101c28", nink: "#d3e6f5", nsoft: "rgba(255,255,255,.10)", ncap: "#8fb2cd" },
  snowy:            { a: "#eef5fb", b: "#d3e6f3", ink: "#23374b", soft: "rgba(255,255,255,.65)", cap: "#456079", art: "snow",
                      na: "#2e3d4d", nb: "#1b2530", nink: "#e9f3fb", nsoft: "rgba(255,255,255,.12)", ncap: "#b3c7d8" },
  "snowy-rainy":    { a: "#e4eef7", b: "#c6dcec", ink: "#22364a", soft: "rgba(255,255,255,.6)",  cap: "#44607a", art: "snow",
                      na: "#2b3a4a", nb: "#19232e", nink: "#e5eff8", nsoft: "rgba(255,255,255,.11)", ncap: "#aec2d3" },
  fog:              { a: "#e9e7e1", b: "#cfccc4", ink: "#3a3830", soft: "rgba(255,255,255,.6)",  cap: "#5d5a50", art: "fog",
                      na: "#3a3833", nb: "#232220", nink: "#ece9e2", nsoft: "rgba(255,255,255,.11)", ncap: "#b5b0a5" },
  hail:             { a: "#dce8f2", b: "#b6cddf", ink: "#1f3345", soft: "rgba(255,255,255,.5)",  cap: "#3e5a72", art: "snow",
                      na: "#27384a", nb: "#16222e", nink: "#dceaf6", nsoft: "rgba(255,255,255,.11)", ncap: "#9bb8cf" },
  windy:            { a: "#e3ece9", b: "#c2d5cf", ink: "#263b36", soft: "rgba(255,255,255,.6)",  cap: "#476059", art: "cloud",
                      na: "#2b3a36", nb: "#192421", nink: "#e2ede9", nsoft: "rgba(255,255,255,.11)", ncap: "#a7bdb6" },
  "windy-variant":  { a: "#e3ece9", b: "#c2d5cf", ink: "#263b36", soft: "rgba(255,255,255,.6)",  cap: "#476059", art: "cloud",
                      na: "#2b3a36", nb: "#192421", nink: "#e2ede9", nsoft: "rgba(255,255,255,.11)", ncap: "#a7bdb6" },
  lightning:        { a: "#ded4f2", b: "#b9a6e0", ink: "#2f2153", soft: "rgba(255,255,255,.5)",  cap: "#513c7d", art: "storm",
                      na: "#372a5c", nb: "#20183a", nink: "#e9deff", nsoft: "rgba(255,255,255,.11)", ncap: "#b7a4e0" },
  "lightning-rainy":{ a: "#d6cbee", b: "#ad98da", ink: "#2a1d4d", soft: "rgba(255,255,255,.45)", art: "storm", cap: "#4a3572",
                      na: "#31255a", nb: "#1b1436", nink: "#e5d9ff", nsoft: "rgba(255,255,255,.11)", ncap: "#ae9bdc" },
  exceptional:      { a: "#ffdcd2", b: "#f6b09b", ink: "#5c2415", soft: "rgba(255,255,255,.5)",  cap: "#8a4230", art: "sun",
                      na: "#4d2a20", nb: "#2b1712", nink: "#ffdccf", nsoft: "rgba(255,255,255,.11)", ncap: "#d9a08c" },
};
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

function fwArt(kind, size, still, quando) {
  const s = size || 76;
  const cls = still ? "" : " fw-anim";
  const u = "fw" + (++FW_SEME);
  const S = v => `<svg class="fw-art-svg${cls}" viewBox="0 0 100 100" width="${s}" height="${s}" style="display:block;overflow:visible">${v}</svg>`;
  const cloud = (x, y, sc, fill, klass) => `<g class="${klass || ""}" transform="translate(${x} ${y}) scale(${sc})">
    <path d="M26 62 Q10 62 10 49 Q10 37 23 36 Q27 22 42 22 Q58 22 62 35 Q78 34 80 47 Q82 62 66 62 Z" fill="${fill}"/></g>`;
  switch (kind) {
    // Il sole di prima era un cerchio piatto con otto stecche uguali: una
    // icona, non un sole. Questo ha un disco che sfuma dal bianco caldo al
    // rame sul bordo, una corona che respira, e raggi affusolati lunghi e
    // corti alternati: la stessa forma che si disegna a mano.
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
            return `<path d="M50 ${punta} L${50 + base} 30 Q50 27.5 ${50 - base} 30 Z" fill="url(#${u}r)" transform="rotate(${d} 50 50)"/>`;
          }).join("")}
        </g>
        <circle cx="50" cy="50" r="22.5" fill="url(#${u}d)"/>
        <path d="M36 41 Q44 32 57 33" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>
      </g>`);
    // La luna non e piu una falce sempre uguale: e quella di stanotte. Il
    // confine fra luce e ombra e una mezza ellisse che si stringe fino a
    // diventare una riga dritta al quarto e poi si riapre dall'altra parte;
    // con la stessa forma si ritaglia il disco illuminato, cosi i crateri si
    // vedono solo dove batte il sole. Nelle previsioni prende la data del
    // giorno, quindi la luna di giovedi e davvero quella di giovedi.
    case "moon": {
      const f = fwFaseLuna(quando);
      const r = 26, cx = 50, cy = 50;
      const d0 = Math.cos(2 * Math.PI * f.p);
      const rx = (Math.abs(d0) * r).toFixed(2);
      const cresce = f.p < 0.5;
      const su = `${cx} ${cy - r}`, giu = `${cx} ${cy + r}`;
      // Andando dal basso verso l'alto, sweep 0 curva a destra e 1 a sinistra.
      const fuori = cresce ? 1 : 0;
      const term = cresce ? (d0 > 0 ? 0 : 1) : (d0 < 0 ? 0 : 1);
      const luce = `M ${su} A ${r} ${r} 0 0 ${fuori} ${giu} A ${rx} ${r} 0 0 ${term} ${su} Z`;
      // A luna nuova non resta niente da illuminare: senza un filo di bordo
      // sembrerebbe che il disegno non sia arrivato.
      const nuova = f.k < 0.035;
      return S(`
        <defs>
          <radialGradient id="${u}l" cx="36%" cy="30%" r="78%">
            <stop offset="0%" stop-color="#fffdf3"/>
            <stop offset="55%" stop-color="#ffeec4"/>
            <stop offset="100%" stop-color="#e9c887"/>
          </radialGradient>
          <radialGradient id="${u}g" cx="50%" cy="50%" r="50%">
            <stop offset="50%" stop-color="rgba(255,236,190,.26)"/>
            <stop offset="100%" stop-color="rgba(255,236,190,0)"/>
          </radialGradient>
          <clipPath id="${u}c"><path d="${luce}"/></clipPath>
        </defs>
        <g>
          <title>${fhEsc(f.nome)} · ${Math.round(f.k * 100)}% illuminata</title>
          <circle class="fw-halo" cx="${cx}" cy="${cy}" r="42" fill="url(#${u}g)"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,.06)"
            stroke="rgba(255,246,222,${nuova ? ".40" : ".16"})" stroke-width="1"/>
          ${nuova ? "" : `<path d="${luce}" fill="url(#${u}l)"/>
          <g clip-path="url(#${u}c)" fill="#c2a26a" opacity=".26">
            <circle cx="43" cy="41" r="6.2"/><circle cx="58" cy="58" r="4.6"/>
            <circle cx="47" cy="63" r="3.1"/><circle cx="61" cy="39" r="2.7"/>
            <circle cx="37" cy="55" r="2.3"/><circle cx="52" cy="48" r="1.9"/>
          </g>`}
          <circle class="fw-star fw-s1" cx="20" cy="22" r="2.4" fill="#fff5dd"/>
          <circle class="fw-star fw-s2" cx="83" cy="28" r="1.8" fill="#fff5dd"/>
          <circle class="fw-star fw-s3" cx="79" cy="76" r="2.1" fill="#fff5dd"/>
        </g>`);
    }
    case "partly": return S(`
      <defs>
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
            const punta = i % 2 === 0 ? 9 : 14;
            return `<path d="M36 ${punta} L39.2 25 Q36 23.2 32.8 25 Z" fill="url(#${u}r)" transform="rotate(${d} 36 34)"/>`;
          }).join("")}
        </g>
        <circle cx="36" cy="34" r="16" fill="url(#${u}d)"/>
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
  @keyframes fwBreath{0%,100%{transform:scale(.94);opacity:.55}50%{transform:scale(1.06);opacity:1}}
  @keyframes fwDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
  @keyframes fwDrift2{0%,100%{transform:translateX(0)}50%{transform:translateX(-6px)}}
  @keyframes fwFall{0%{transform:translateY(-6px);opacity:0}20%{opacity:1}100%{transform:translateY(24px);opacity:0}}
  @keyframes fwSway{0%{transform:translate(0,-6px);opacity:0}25%{opacity:1}100%{transform:translate(6px,24px);opacity:0}}
  @keyframes fwSlide{0%,100%{transform:translateX(0)}50%{transform:translateX(8px)}}
  @keyframes fwFlash{0%,88%,100%{opacity:.25}90%,96%{opacity:1}}
  @keyframes fwTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
  .fw-anim .fw-rays{transform-origin:50px 50px;animation:fwSpin 60s linear infinite}
  .fw-anim .fw-rays-sm{transform-origin:36px 34px}
  .fw-anim .fw-halo{transform-origin:50px 50px;animation:fwBreath 6s ease-in-out infinite}
  .fw-anim .fw-drift{animation:fwDrift 7s ease-in-out infinite}
  .fw-anim .fw-drift2{animation:fwDrift2 9s ease-in-out infinite}
  /* La pioggia scendeva in 1,4 secondi: da guardare era un tamburello, e su
     una card che sta li tutto il giorno stanca. Rallentata a 2,6 e resa piu
     discreta, con le tre gocce piu distanziate fra loro. */
  .fw-anim .fw-drop{animation:fwFall 2.6s linear infinite;opacity:.8}
  .fw-anim .fw-flake{animation:fwSway 5s linear infinite}
  .fw-anim .fw-fog{animation:fwSlide 6s ease-in-out infinite}
  .fw-anim .fw-bolt{animation:fwFlash 6s ease-in-out infinite}
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
        </div>
      </div>`;
    const style = document.createElement("style");
    style.textContent = `
      .fw-scrim{position:fixed;inset:0;z-index:30;background:rgba(6,9,14,.6);backdrop-filter:blur(6px);
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
    if (Math.abs(p) < 3) return `<div class="fc-ieri pari">come ieri a quest'ora</div>`;
    const giu = p < 0;
    return `<div class="fc-ieri ${giu ? "giu" : "su"}">${giu ? "&darr;" : "&uarr;"} ${Math.abs(p)}% di ieri</div>`;
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
      this._card.addEventListener("click", e => {
        if (e.target.closest("[data-riga]")) return;
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
      this._body.innerHTML = `
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
        </div>` : `<div class="fc-vuoto">Adesso non c'e niente di acceso.</div>`}`;
      this._body.querySelectorAll("[data-riga]").forEach(b => b.addEventListener("click", e => {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent("hass-more-info", {
          detail: { entityId: b.dataset.riga }, bubbles: true, composed: true,
        }));
      }));
      return;
    }

    this._body.innerHTML = `
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
    `;

    this._body.querySelectorAll("[data-riga]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        detail: { entityId: b.dataset.riga }, bubbles: true, composed: true,
      }));
    }));
  }
}

const FC_CSS = `
  .fc{display:block;position:relative;overflow:hidden;border-radius:22px;container-type:inline-size;
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
  .fc-ieri{font-size:10.5px;font-weight:800;letter-spacing:.01em;margin-top:2px;white-space:nowrap}
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
const PC_DEFAULTS = { title: "Controllo Carichi" };

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

  _lista() {
    const H = this._hass.states, out = [];
    for (let i = 1; i <= PC_MAX; i++) {
      const t = H["input_text.carico_" + i + "_potenza"];
      const id = t ? String(t.state || "").trim() : "";
      if (!id || ["Seleziona", "unknown", "unavailable"].includes(id)) continue;
      const sw = (H["input_text.carico_" + i + "_switch"] || {}).state || "";
      const st = H[id], so = H["input_number.potenza_" + i + "_sospesa"];
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
    const tot = this._n("sensor.potenza_carichi_selezionato");
    const imm = this._n("sensor.potenza_massima_immediato");
    const rit = this._n("sensor.potenza_massima_ritardato");
    const attivo = this._s("input_boolean.attiva_power_control") === "on";
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
      imm: this._n("input_number.potenza_massima_immediato") || 0,
      rit: this._n("input_number.potenza_massima_ritardato") || 0,
      tImm: this._n("input_number.tempo_stop_immediato") || 0,
      tRit: this._n("input_number.tempo_stop_ritardato") || 0,
      tStart: this._n("input_number.tempo_start") || 0,
      imp: this._n("input_number.controllo_carichi_potenza_impegnata") || 0,
      tol: this._n("input_number.controllo_carichi_tolleranza_contatore") || 0,
      mar: this._n("input_number.controllo_carichi_margine_prima_del_picco") || 0,
      acceso: this._n("input_number.controllo_carichi_carico_acceso_sopra") || 0,
      voce: this._s("input_boolean.controllo_carichi_avvisi_vocali") === "on",
      dest: this._lista_testo("input_text.controllo_carichi_destinatari_avvisi"),
      alto: this._lista_testo("input_text.controllo_carichi_altoparlanti_avvisi"),
      attivo: this._s("input_boolean.attiva_power_control") === "on",
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
  .pc-gr input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:10px;font:inherit;font-size:13px;font-weight:800;
    border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit}
  .fh-app.chiaro .pc-gr input{background:#fff;border-color:rgba(15,23,42,.18)}
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
      </div>`;
    this.querySelector("#pceTit").addEventListener("input", e => this._set("title", e.target.value));
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
  .fp{display:block;position:relative;overflow:hidden;border-radius:22px;cursor:pointer;
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
  .fp-bat.bassa{color:#ff8f8f}
  /* Niente @container qui: dichiarare un contenitore porta con se
     contain:layout, che creerebbe un contesto di impilamento e rimetterebbe i
     popup prigionieri dentro la card. Lo spazio lo gestisce max-width. */

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

  _imparando() {
    const st = this._hass.states[this._cfg.apprendimento];
    return !!st && st.state === "on";
  }
  _accendiApprendimento(acceso) {
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
            <button type="button" class="fm-p acceso" data-k="acceso" title="Accendi">
              <ha-icon icon="mdi:power"></ha-icon></button>
            <button type="button" class="fm-p spento" data-k="spento" title="Spegni">
              <ha-icon icon="mdi:power-off"></ha-icon></button>
          </div>
        </div>

        ${s.lista.length ? `<div class="fm-src">
          ${s.lista.map(x => `<button type="button" class="fm-s${x === s.attiva ? " on" : ""}" data-src="${fhEsc(x)}">${fhEsc(x)}</button>`).join("")}
        </div>` : `<div class="fm-vuoto">Nessun elenco sorgenti: controlla ${fhEsc(c.selettore)}</div>`}

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
          ? "Adesso ogni tasto che tocchi qui dentro NON comanda: <b>impara</b>. Punta il telecomando vero verso il Broadlink della sala e premi il tasto entro pochi secondi. Poi spegni questa levetta."
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
