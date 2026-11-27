// Scheda Misurazioni: caricamento, modulo e salvataggio
import { $, avviso } from "../core/ui.js";
import { DATI_SANITARI } from "../core/funzioni.js";
import { elencaMisure, salvaMisura, eliminaMisura, MASSIMO_MISURE } from "../core/db-misure.js";
import { CORPO, MASSIMALI } from "../core/calcoli-misure.js";
import { disegnaStorico, disegnaMassimali, dataItaliana } from "./misure-vista.js";

const CAMPI = [...CORPO, ...MASSIMALI.map(([c]) => c)];

let atleta = null;
let misure = null;   // null = non ancora lette o lettura fallita
let stato = "";      // "" | "caricamento" | "errore"
let inModifica = null;
let richiesta = 0;
let visibile = false;
let opzioni = {};

const campo = (nome) => $("form-misura").elements.namedItem(nome);
// Il consenso scritto è richiesto solo con i dati sanitari attivi
const manca = () => DATI_SANITARI && !atleta.consensoScritto;

function chiudiForm() {
  inModifica = null;
  $("form-misura").reset();
  $("form-misura").hidden = true;
}

function apriForm(voce) {
  if (manca()) return;
  inModifica = voce?.id ?? null;
  $("form-misura").reset();
  $("titolo-misura").textContent = voce ? "Modifica rilevazione" : "Nuova rilevazione";
  const d = new Date();
  const oggi = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  campo("data").max = oggi;
  campo("data").value = voce ? voce.data : oggi;
  if (voce) CAMPI.forEach((n) => { campo(n).value = voce[n] ?? ""; });
  $("form-misura").hidden = false;
  $("form-misura").scrollIntoView({ block: "nearest" });
}

export function disegnaMisure() {
  if (!atleta) return;
  const bloccata = manca();
  $("misure-blocco").hidden = !bloccata;
  if (bloccata) chiudiForm();
  $("btn-nuova-misura").disabled = bloccata || misure === null;
  $("misure-stato").hidden = misure !== null;
  $("misure-stato-testo").textContent = stato === "errore"
    ? "Impossibile leggere le misurazioni. Non significa che non ce ne siano."
    : "Caricamento delle misurazioni…";
  $("btn-misure-riprova").hidden = stato !== "errore";
  $("misure-storico").hidden = misure === null;
  if (misure) disegnaStorico(misure, atleta, { bloccata, alModifica: apriForm, alElimina: rimuovi });
  disegnaMassimali(misure, atleta);
}

async function carica() {
  const mia = ++richiesta;
  misure = null;
  stato = "caricamento";
  disegnaMisure();
  try {
    const lette = await elencaMisure(atleta.id);
    if (mia !== richiesta) return;
    misure = lette;
    stato = "";
    if (misure.length === MASSIMO_MISURE) avviso(`Sono mostrate le ultime ${MASSIMO_MISURE} rilevazioni.`);
  } catch (e) {
    console.error(e);
    if (mia !== richiesta) return;
    stato = "errore";
  }
  disegnaMisure();
}

// Chiamata ogni volta che si apre un profilo. Legge solo se la scheda è aperta
export function mostraMisure(scelto) {
  atleta = scelto;
  misure = null;
  stato = "";
  richiesta++;
  chiudiForm();
  if (visibile) carica();
}

export function schedaMisureVisibile(valore) {
  const appenaAperta = valore && !visibile;
  visibile = valore;
  if (appenaAperta && atleta && misure === null && stato !== "caricamento") carica();
}

// Salva o elimina, poi aggiorna profilo e storico
async function esegui(operazione, messaggio, pulsante) {
  const scelto = atleta;
  pulsante.disabled = true;
  try {
    const valori = await operazione(scelto);
    Object.assign(scelto, valori);
    if (atleta !== scelto) return;
    chiudiForm();
    opzioni.alAggiornato(scelto);
    avviso(messaggio);
    carica();
  } catch (e) {
    console.error(e);
    avviso(opzioni.testoErrore(e), true);
  } finally {
    pulsante.disabled = false;
  }
}

function rimuovi(voce, pulsante) {
  if (!confirm(`Eliminare definitivamente la rilevazione del ${dataItaliana(voce.data)}?`)) return;
  esegui((a) => eliminaMisura(a, voce.id), "Rilevazione eliminata.", pulsante);
}

export function avviaMisure(impostazioni) {
  opzioni = impostazioni;
  $("btn-nuova-misura").addEventListener("click", () => apriForm(null));
  $("btn-misura-annulla").addEventListener("click", chiudiForm);
  $("btn-misure-riprova").addEventListener("click", carica);

  $("form-misura").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (manca()) return;
    const dati = { data: campo("data").value };
    CAMPI.forEach((n) => { dati[n] = campo(n).value === "" ? null : Number(campo(n).value); });
    if (CAMPI.every((n) => dati[n] === null)) {
      avviso("Inserisci almeno un valore oltre alla data.", true);
      return;
    }
    const vecchioId = inModifica;
    esegui((a) => salvaMisura(a, vecchioId, dati), "Rilevazione salvata.", $("btn-misura-salva"));
  });
}
