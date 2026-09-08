# Faber Home

Non una card: **un'applicazione a schermo intero** dentro Home Assistant.

- **Sfondo animato** a particelle su canvas (si ferma da solo quando la pagina non è visibile e rispetta "riduci animazioni" di sistema — su un tablet a muro deve poter restare acceso tutto il giorno).
- **Intestazione propria**: orologio grande, data in italiano, meteo con temperatura, e chip di stato che al tocco accendono o spengono.
- **Pagine** con barra di navigazione in basso, dove **il cerchio ambra rialzato segue la pagina attiva** invece di stare fisso al centro.
- Dentro le pagine, **card di Home Assistant vere** — qualunque tipo, comprese le altre della famiglia Faber — disposte in righe e colonne.

## Stato

Prima tappa: il guscio (sfondo, intestazione, pagine, navigazione, rendering delle card). In arrivo: modalità modifica con righe/colonne trascinabili, store delle card, cataloghi di chip e badge.

## Installazione (HACS)

1. HACS → Repository personalizzati → aggiungi `cristianwebonline/ha-faber-home` come "Lovelace".
2. Installa "Faber Home" e aggiungi la risorsa dashboard.
3. Crea una dashboard con un'unica vista di tipo `panel` contenente `{"type":"custom:faber-home"}`.
