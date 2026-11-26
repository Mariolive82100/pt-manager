// Schermata del consenso
import { $ } from "../core/ui.js";
import { testoInformativa, VERSIONE_INFORMATIVA } from "./informativa.js";
import { salvaConsenso } from "../core/db-atleta.js";
import { testoErrore } from "../core/errori.js";

export const consensoValido = (c) =>
  c?.accettato === true && c.versione === VERSIONE_INFORMATIVA;

let atletaId = null;
let alAccettato = () => {};

export function mostraConsenso(id, precedente) {
  atletaId = id;
  $("consenso-testo").replaceChildren(...testoInformativa());
  $("consenso-spunta").checked = false;
  $("btn-accetta").disabled = true;
  $("consenso-nota").textContent = !precedente ? ""
    : precedente.accettato ? "L'informativa è cambiata: leggila e conferma di nuovo."
      : "Hai ritirato il consenso. Per usare di nuovo l'app devi accettare.";
  $("vista-consenso").hidden = false;
}

export function avviaConsenso(funzione) {
  alAccettato = funzione;
  $("consenso-spunta").addEventListener("change", (ev) => {
    $("btn-accetta").disabled = !ev.target.checked;
  });
  $("btn-accetta").addEventListener("click", async () => {
    $("btn-accetta").disabled = true;
    $("consenso-errore").hidden = true;
    try {
      await salvaConsenso(atletaId, true, VERSIONE_INFORMATIVA);
      $("vista-consenso").hidden = true;
      alAccettato();
    } catch (e) {
      console.error(e);
      $("consenso-errore").textContent = testoErrore(e);
      $("consenso-errore").hidden = false;
      $("btn-accetta").disabled = !$("consenso-spunta").checked;
    }
  });
}
