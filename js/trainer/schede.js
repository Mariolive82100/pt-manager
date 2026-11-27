// Passaggio tra le quattro schede del profilo
import { $, crea } from "../core/ui.js";
import { DATI_SANITARI } from "../core/funzioni.js";

const SCHEDE = [
  ["allenamenti", "Allenamenti"], ["salute", "Salute"],
  ["misurazioni", "Misurazioni"], ["livello", "Livello"]
].filter(([chiave]) => DATI_SANITARI || chiave !== "salute");
let attiva = "allenamenti";
let alCambio = () => {};

function disegna() {
  $("schede").replaceChildren(...SCHEDE.map(([chiave, etichetta]) => {
    const b = crea("button", { type: "button", className: "scheda", textContent: etichetta });
    b.setAttribute("aria-pressed", String(chiave === attiva));
    b.addEventListener("click", () => { attiva = chiave; disegna(); });
    return b;
  }));
  SCHEDE.forEach(([chiave]) => { $("pannello-" + chiave).hidden = chiave !== attiva; });
  alCambio(attiva);
}

export function avviaSchede(funzione) {
  alCambio = funzione;
  disegna();
}
