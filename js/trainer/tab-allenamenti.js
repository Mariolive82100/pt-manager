// Scheda Allenamenti: KPI degli ultimi 30 giorni, schede da completare e storico
import { $, crea, avviso } from "../core/ui.js";
import { TIPI, kpi } from "../core/calcoli-allenamento.js";
import {
  elencaSchede, elencaSessioni, eliminaScheda, eliminaSessione
} from "../core/db-allenamenti.js";
import { disegnaSessioni } from "./sessioni-vista.js";

const memoria = new Map(); // evita di rileggere lo stesso atleta
let atleta = null;
let dati = null;
let richiesta = 0;
let testoErrore = String;
let alRiepilogo = () => {};

const dataItaliana = (iso) => iso.split("-").reverse().join("/");
const it = (n) => n.toLocaleString("it-IT");

function indirizzo(modo, idScheda) {
  const p = new URLSearchParams({ atleta: atleta.id, modo });
  if (idScheda) p.set("scheda", idScheda);
  return "allenamento.html?" + p;
}

function riquadro(etichetta, valore, unita, nota) {
  return crea("div", { className: "dato" },
    crea("span", { textContent: etichetta }),
    crea("strong", { textContent: valore === null ? "–" : it(valore) + unita }),
    crea("small", { textContent: nota }));
}

function disegnaKpi() {
  const k = dati ? kpi(dati.sessioni) : null;
  const tipi = k ? Object.entries(TIPI).filter(([t]) => k.perTipo[t])
    .map(([t, n]) => `${n.toLowerCase()} ${k.perTipo[t]}`).join(" · ") : "";
  $("kpi").replaceChildren(
    riquadro("Efficienza media", k?.efficienza ?? null, "/100",
      k?.parziali ? `ultimi 30 gg · parziali: ${k.parziali}` : "ultimi 30 gg"),
    riquadro("Sessioni · 30 gg", k ? k.sessioni : null, "", tipi || "ultimi 30 gg"),
    riquadro("Volume medio", k?.volume ?? null, " kg", "sessioni con forza"),
    riquadro("Kcal medie", k?.kcal ?? null, " kcal", "dove indicate"));
}

function pulsante(testo, funzione) {
  const b = crea("button", { type: "button", className: "btn btn-ghost", textContent: testo });
  b.addEventListener("click", () => funzione(b));
  return b;
}

function rigaScheda(s) {
  const assegnata = s.stato === "assegnata";
  return crea("li", { className: "riga-scheda" },
    crea("div", {},
      crea("strong", { textContent: s.nome }),
      crea("span", { className: "muted", textContent:
        `${dataItaliana(s.data)} · ${TIPI[s.tipo]} · ${s.durataMin || "–"} min` })),
    crea("span", {
      className: "tag " + (assegnata ? "tag-accent" : "tag-neutral"),
      textContent: assegnata ? "Assegnata" : "Bozza"
    }),
    crea("div", { className: "riga-tag" },
      crea("a", { className: "btn btn-ghost", textContent: "Modifica", href: indirizzo("pianifica", s.id) }),
      assegnata ? crea("a", { className: "btn btn-ghost", textContent: "Registra", href: indirizzo("registra", s.id) }) : null,
      pulsante("Elimina", (b) => rimuoviScheda(s, b))));
}

function disegna(errore = false) {
  disegnaKpi();
  $("allenamenti-stato").hidden = Boolean(dati);
  $("allenamenti-stato-testo").textContent = errore
    ? "Impossibile leggere gli allenamenti." : "Caricamento degli allenamenti…";
  $("btn-allenamenti-riprova").hidden = !errore;
  $("allenamenti-contenuto").hidden = !dati;
  if (!dati) return;
  const aperte = dati.schede.filter((s) => s.stato !== "completata");
  $("schede-vuoto").hidden = aperte.length > 0;
  $("schede-lista").replaceChildren(...aperte.map(rigaScheda));
  disegnaSessioni(dati.sessioni, rimuoviSessione);
}

async function carica(forza = false) {
  const mia = ++richiesta;
  const id = atleta.id;
  dati = forza ? null : memoria.get(id) || null;
  disegna();
  if (dati) return;
  try {
    const [schede, sessioni] = await Promise.all([elencaSchede(id), elencaSessioni(id)]);
    memoria.set(id, { schede, sessioni });
    if (mia !== richiesta) return;
    dati = memoria.get(id);
    disegna();
  } catch (e) {
    console.error(e);
    if (mia === richiesta) disegna(true);
  }
}

async function rimuoviScheda(s, b) {
  if (!confirm(`Eliminare definitivamente la scheda "${s.nome}"?`)) return;
  const id = atleta.id;
  b.disabled = true;
  try {
    await eliminaScheda(id, s.id);
    memoria.delete(id);
    if (atleta.id !== id) return;
    avviso("Scheda eliminata.");
    carica();
  } catch (e) {
    console.error(e);
    b.disabled = false;
    avviso(testoErrore(e), true);
  }
}

async function rimuoviSessione(s, b) {
  if (!confirm(`Eliminare definitivamente la sessione "${s.nome}" del ${dataItaliana(s.data)}?` +
    (s.schedaId ? " La scheda collegata tornerà tra quelle da completare." : ""))) return;
  const scelto = atleta;
  b.disabled = true;
  try {
    scelto.riepilogo = await eliminaSessione(scelto.id, s);
    memoria.delete(scelto.id);
    alRiepilogo();
    if (atleta !== scelto) return;
    avviso("Sessione eliminata.");
    carica();
  } catch (e) {
    console.error(e);
    b.disabled = false;
    avviso(testoErrore(e), true);
  }
}

// Chiamata ogni volta che si apre un profilo
export function mostraAllenamenti(scelto) {
  atleta = scelto;
  $("btn-nuovo-allenamento").href = indirizzo("pianifica");
  $("btn-pianifica").href = indirizzo("pianifica");
  $("btn-registra").href = indirizzo("registra");
  carica();
}

export const dimenticaAllenamenti = (id) => memoria.delete(id);

export function avviaAllenamenti(opzioni) {
  testoErrore = opzioni.testoErrore;
  alRiepilogo = opzioni.alRiepilogo;
  $("btn-allenamenti-riprova").addEventListener("click", () => carica(true));
  $("btn-allenamenti-aggiorna").addEventListener("click", () => carica(true));
}
