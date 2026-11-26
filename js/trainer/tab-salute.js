// Scheda Salute: consenso scritto, note sanitarie e contatore nel profilo
import { $, crea, avviso } from "../core/ui.js";
import {
  elencaNote, salvaNota, eliminaNota, salvaConsensoScritto, MASSIMO_NOTE
} from "../core/db-salute.js";

const GRUPPI = [["trauma", "Traumi"], ["intervento", "Interventi"], ["patologia", "Patologie"]];

let atleta = null;
let note = null;      // null = non ancora lette o lettura fallita
let inModifica = null;
let richiesta = 0;    // scarta le risposte relative a un profilo precedente
let testoErrore = String;

const oggi = () => {
  const d = new Date();
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const dataItaliana = (iso) => iso.split("-").reverse().join("/");
const campo = (nome) => $("form-nota").elements.namedItem(nome);

function chiudiForm() {
  inModifica = null;
  $("form-nota").reset();
  $("form-nota").hidden = true;
}

function apriForm(voce) {
  if (!atleta.consensoScritto) return;
  inModifica = voce?.id ?? null;
  $("form-nota").reset();
  $("titolo-nota").textContent = voce ? "Modifica nota" : "Nuova nota";
  if (voce) ["tipo", "titolo", "dettagli"].forEach((n) => { campo(n).value = voce[n] ?? ""; });
  $("form-nota").hidden = false;
  $("form-nota").scrollIntoView({ block: "nearest" });
}

function disegnaConsenso() {
  const data = atleta.consensoScritto || "";
  $("consenso-data").value = data;
  $("consenso-data").max = oggi();
  $("consenso-stato").textContent = data
    ? "Consenso scritto indicato in data " + dataItaliana(data) + "."
    : "Nessun consenso indicato: non puoi aggiungere o modificare note.";
  $("btn-consenso-togli").hidden = !data;
  $("btn-nuova-nota").disabled = !data || note === null;
}

function rigaNota(voce) {
  const modifica = crea("button", {
    type: "button", className: "btn btn-ghost", textContent: "Modifica",
    disabled: !atleta.consensoScritto
  });
  modifica.addEventListener("click", () => apriForm(voce));
  const elimina = crea("button", { type: "button", className: "btn btn-ghost", textContent: "Elimina" });
  elimina.addEventListener("click", () => rimuovi(voce, elimina));
  return crea("div", { className: "nota" },
    crea("strong", { textContent: voce.titolo }),
    crea("span", { className: "nota-dettagli", textContent: voce.dettagli || "" }),
    crea("div", { className: "riga-tag" }, modifica, elimina));
}

function disegnaNote(stato = "") {
  const contatore = $("p-note");
  contatore.hidden = false;
  contatore.textContent = note === null
    ? (stato === "errore" ? "Note sanitarie non disponibili" : "Note sanitarie…")
    : note.length === 1 ? "1 nota sanitaria" : `${note.length} note sanitarie`;

  $("salute-stato").hidden = note !== null;
  $("salute-stato-testo").textContent = stato === "errore"
    ? "Impossibile leggere le note sanitarie. Non significa che non ce ne siano."
    : "Caricamento delle note…";
  $("btn-salute-riprova").hidden = stato !== "errore";

  $("gruppi-salute").replaceChildren(...(note === null ? [] : GRUPPI.map(([tipo, titolo]) => {
    const voci = note.filter((n) => n.tipo === tipo);
    return crea("div", { className: "card" },
      crea("span", { className: "kicker", textContent: titolo }),
      ...(voci.length ? voci.map(rigaNota)
        : [crea("span", { className: "muted", textContent: "Nessuna segnalazione" })]));
  })));
  disegnaConsenso();
}

async function carica() {
  const mia = ++richiesta;
  note = null;
  disegnaNote();
  try {
    const lette = await elencaNote(atleta.id);
    if (mia !== richiesta) return;
    note = lette;
    disegnaNote();
    if (note.length === MASSIMO_NOTE) avviso(`Sono mostrate solo ${MASSIMO_NOTE} note.`, true);
  } catch (e) {
    console.error(e);
    if (mia !== richiesta) return;
    disegnaNote("errore");
  }
}

// Chiamata ogni volta che si apre un profilo
export function mostraSalute(scelto) {
  atleta = scelto;
  chiudiForm();
  carica();
}

async function rimuovi(voce, pulsante) {
  if (!confirm(`Eliminare definitivamente la nota "${voce.titolo}"?`)) return;
  const id = atleta.id;
  pulsante.disabled = true;
  try {
    await eliminaNota(id, voce.id);
    if (atleta.id !== id) return;
    chiudiForm();
    avviso("Nota eliminata.");
    carica();
  } catch (e) {
    console.error(e);
    pulsante.disabled = false;
    avviso(testoErrore(e), true);
  }
}

async function cambiaConsenso(data, pulsante) {
  const scelto = atleta;
  pulsante.disabled = true;
  try {
    await salvaConsensoScritto(scelto.id, data);
    scelto.consensoScritto = data;
    if (atleta !== scelto) return;
    chiudiForm();
    disegnaNote(note === null ? "errore" : "");
    avviso(data ? "Data del consenso salvata." : "Indicazione del consenso rimossa.");
  } catch (e) {
    console.error(e);
    avviso(testoErrore(e), true);
  } finally {
    pulsante.disabled = false;
  }
}

export function avviaSalute(opzioni) {
  testoErrore = opzioni.testoErrore;

  $("form-consenso").addEventListener("submit", (ev) => {
    ev.preventDefault();
    cambiaConsenso($("consenso-data").value, $("btn-consenso-salva"));
  });
  $("btn-consenso-togli").addEventListener("click", (ev) => {
    if (confirm("Togliere l'indicazione del consenso? Le note esistenti NON vengono cancellate.")) {
      cambiaConsenso("", ev.currentTarget);
    }
  });
  $("btn-salute-riprova").addEventListener("click", carica);
  $("btn-nuova-nota").addEventListener("click", () => apriForm(null));
  $("btn-nota-annulla").addEventListener("click", chiudiForm);

  $("form-nota").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!atleta.consensoScritto) return;
    const dati = {
      tipo: campo("tipo").value,
      titolo: campo("titolo").value.trim(),
      dettagli: campo("dettagli").value.trim()
    };
    if (!dati.titolo) { campo("titolo").value = ""; ev.target.reportValidity(); return; }
    const id = atleta.id;
    $("btn-nota-salva").disabled = true;
    try {
      await salvaNota(id, inModifica, dati);
      if (atleta.id !== id) return;
      chiudiForm();
      avviso("Nota salvata.");
      carica();
    } catch (e) {
      console.error(e);
      avviso(testoErrore(e), true);
    } finally {
      $("btn-nota-salva").disabled = false;
    }
  });
}
