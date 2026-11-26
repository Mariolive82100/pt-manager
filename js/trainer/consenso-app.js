// Stato del consenso che l'atleta ha dato nella sua app (solo lettura)
import { $ } from "../core/ui.js";
import { leggiConsenso } from "../core/db-atleta.js";

let richiesta = 0;

function testo(c) {
  if (!c) return "Consenso nell'app: non ancora dato.";
  const quando = c.data?.toDate ? " il " + c.data.toDate().toLocaleDateString("it-IT") : "";
  return c.accettato
    ? `Consenso nell'app: accettato${quando}.`
    : `Consenso nell'app: RITIRATO${quando}. Verifica con l'atleta come gestire i suoi dati.`;
}

export async function mostraConsensoApp(atletaId) {
  const mia = ++richiesta;
  const riga = $("consenso-app");
  riga.textContent = "Consenso nell'app: lettura…";
  riga.className = "muted";
  try {
    const c = await leggiConsenso(atletaId);
    if (mia !== richiesta) return;
    riga.textContent = testo(c);
    if (c && !c.accettato) riga.className = "avviso avviso-errore";
  } catch (e) {
    console.error(e);
    if (mia === richiesta) riga.textContent = "Consenso nell'app: non leggibile al momento.";
  }
}
