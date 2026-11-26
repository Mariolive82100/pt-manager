// Passaggio tra le quattro schede del profilo
import { $, crea } from "../core/ui.js";

const SCHEDE = [
  ["allenamenti", "Allenamenti"], ["salute", "Salute"],
  ["misurazioni", "Misurazioni"], ["livello", "Livello"]
];
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
