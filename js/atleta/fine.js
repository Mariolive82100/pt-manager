// Fine allenamento: dati finali, anteprima e invio al trainer
import { $, crea } from "../core/ui.js";
import {
  componiSessione, problemaInvio, minutiTrascorsi, nonSpuntati, volumeEseguito
} from "../core/sessione-atleta.js";
import { disegnaDettaglioEfficienza } from "../core/vista-efficienza.js";
import { inviaSessione } from "../core/db-atleta.js";
import { testoErrore } from "../core/errori.js";
import { cancellaBozza } from "./bozza-locale.js";

const CAMPI = {
  minEffettivi: "f-durata", cardioMin: "f-cardio", zonaMin: "f-zona", kcal: "f-kcal", km: "f-km"
};
let scheda = null;
let bozza = null;
let rpe = null;
let invio = false;
let alInviato = () => {};

const valori = () => ({
  ...Object.fromEntries(Object.entries(CAMPI)
    .map(([k, id]) => [k, $(id).value === "" ? null : Number($(id).value)])),
  rpe
});

function errore(testo) {
  $("errore-invio").textContent = testo;
  $("errore-invio").hidden = !testo;
}

function aggiorna() {
  [...$("rpe").children].forEach((b, i) => b.setAttribute("aria-pressed", String(rpe === i + 1)));
  disegnaDettaglioEfficienza($("anteprima"), componiSessione(scheda, bozza, valori()));
}

export function apriFine(s, b, fine) {
  scheda = s;
  bozza = b;
  rpe = null;
  Object.values(CAMPI).forEach((id) => { $(id).value = ""; });
  $("f-durata").value = minutiTrascorsi(b.inizio, fine);
  ["f-cardio-box", "f-zona-box", "f-km-box"].forEach((id) => { $(id).hidden = s.tipo === "forza"; });
  $("fine-volume").hidden = s.tipo === "cardio";
  $("fine-volume").textContent =
    `Volume eseguito: ${volumeEseguito(b).toLocaleString("it-IT")} kg (previsto ${s.volumeKg.toLocaleString("it-IT")} kg)`;
  errore("");
  aggiorna();
}

async function invia() {
  if (invio) return;
  const v = valori();
  const problema = problemaInvio(scheda, v);
  if (problema) return errore(problema);
  const { serie, blocchi } = nonSpuntati(bozza);
  const mancanti = [serie ? `serie: ${serie}` : "", blocchi ? `blocchi cardio: ${blocchi}` : ""]
    .filter(Boolean).join(", ");
  if (!confirm((mancanti ? `Non hai spuntato (${mancanti}). ` : "") +
    "Inviare al trainer? Dopo l'invio non potrai modificare.")) return;

  const dati = componiSessione(scheda, bozza, v);
  invio = true;
  $("campi-fine").disabled = true;
  $("btn-invia-sessione").textContent = "Invio in corso…";
  errore("");
  try {
    await inviaSessione(bozza.atletaId, dati, bozza.impronta);
    cancellaBozza();
    alInviato(dati);
  } catch (e) {
    console.error(e);
    errore(e?.code === "permission-denied"
      ? "Invio rifiutato: la scheda potrebbe essere stata ritirata, oppure il consenso non è attivo. Contatta il trainer."
      : testoErrore(e) + " I dati restano qui: non chiudere l'app e riprova.");
  } finally {
    invio = false;
    $("campi-fine").disabled = false;
    $("btn-invia-sessione").textContent = "Invia al trainer";
  }
}

export function avviaFine(opzioni) {
  alInviato = opzioni.alInviato;
  $("rpe").replaceChildren(...Array.from({ length: 10 }, (_, i) => {
    const b = crea("button", { type: "button", textContent: i + 1 });
    b.addEventListener("click", () => { rpe = i + 1; errore(""); aggiorna(); });
    return b;
  }));
  $("campi-fine").addEventListener("input", () => { errore(""); aggiorna(); });
  $("btn-invia-sessione").addEventListener("click", invia);
  $("btn-torna-corso").addEventListener("click", opzioni.alRitorno);
}
