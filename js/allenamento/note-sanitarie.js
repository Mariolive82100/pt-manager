// Note sanitarie dell'atleta: sempre visibili mentre si lavora
import { $, crea } from "../core/ui.js";
import { elencaNote } from "../core/db-salute.js";
import { st } from "./stato.js";

const NOMI = { trauma: "Trauma", intervento: "Intervento", patologia: "Patologia" };
let lette = false;
let richiesta = 0;
let alCambio = () => {};

export const noteLette = () => lette;

function disegna(note, fallita = false) {
  const atleta = st.atleta;
  $("sanitarie-titolo").textContent = "Note sanitarie · " + atleta.nome;
  $("btn-sanitarie-riprova").hidden = !fallita;
  const messaggio = (testo, classe = "muted") => crea("span", { className: classe, textContent: testo });

  if (!note) {
    $("sanitarie-lista").replaceChildren(fallita
      ? messaggio("Impossibile leggere le note sanitarie. Non significa che non ce ne siano. Il salvataggio della scheda è bloccato.", "avviso avviso-errore")
      : messaggio("Caricamento delle note…"));
    return;
  }
  const voci = note.map((n) => crea("div", { className: "nota-sanitaria" },
    crea("strong", { textContent: n.titolo }),
    messaggio(NOMI[n.tipo] || "Nota"),
    n.dettagli ? crea("span", { className: "nota-dettagli", textContent: n.dettagli }) : null));
  if (!voci.length) voci.push(messaggio("Nessuna segnalazione"));
  if (!atleta.consensoScritto) {
    voci.push(messaggio("Attenzione: consenso scritto non indicato. Le informazioni sanitarie potrebbero mancare.", "avviso"));
  }
  $("sanitarie-lista").replaceChildren(...voci);
}

export async function caricaNoteSanitarie() {
  const mia = ++richiesta;
  const id = st.atleta.id;
  lette = false;
  disegna(null);
  alCambio();
  try {
    const note = await elencaNote(id);
    if (mia !== richiesta) return;
    lette = true;
    disegna(note);
  } catch (e) {
    console.error(e);
    if (mia !== richiesta) return;
    disegna(null, true);
  }
  alCambio();
}

export function avviaNoteSanitarie(funzione) {
  alCambio = funzione;
  $("btn-sanitarie-riprova").addEventListener("click", caricaNoteSanitarie);
}
