// Registrazione di una sessione svolta con anteprima dell'efficienza
import { $, crea } from "../core/ui.js";
import { efficienza, ripetizioni } from "../core/calcoli-allenamento.js";
import { elencaSchede } from "../core/db-allenamenti.js";
import { st, haForza, haCardio } from "./stato.js";
import { disegnaDettaglioEfficienza } from "../core/vista-efficienza.js";

let schede = [];     // schede assegnate dell'atleta scelto
let scelta = null;   // null = sessione libera
let rpe = null;
let richiesta = 0;
let alCambioScheda = () => {};
let alCambio = () => {};

const numero = (id) => ($(id).value === "" ? null : Number($(id).value));
export const schedaScelta = () => scelta;
// Con volume previsto 0 (corpo libero) servono le ripetizioni
const senzaCarico = () => haForza() && numero("r-volume-prev") === 0;
const CAMPI_EFFETTIVI = ["r-effettivi", "r-kcal", "r-volume", "r-rip", "r-zona", "r-km"];

export function datiSessione() {
  const forza = haForza();
  const cardio = haCardio();
  const misto = st.tipo === "misto";
  const minForza = misto ? numero("r-prev-forza") : forza ? numero("r-previsti") : 0;
  const minCardio = misto ? numero("r-prev-cardio") : cardio ? numero("r-previsti") : 0;
  const dati = {
    data: $("f-data").value, nome: $("f-nome").value.trim(), tipo: st.tipo,
    origine: "trainer", schedaId: scelta?.id || "",
    minForza: minForza || 0, minCardio: minCardio || 0,
    minPrevisti: misto ? (minForza || 0) + (minCardio || 0) : numero("r-previsti"),
    minEffettivi: numero("r-effettivi"), kcal: numero("r-kcal"),
    volumePrevisto: forza ? numero("r-volume-prev") : null,
    volumeEseguito: forza ? numero("r-volume") : null,
    ripPreviste: senzaCarico() ? numero("r-rip-prev") : null,
    ripEseguite: senzaCarico() ? numero("r-rip") : null,
    zonaPct: cardio ? numero("r-zona") : null,
    km: cardio ? numero("r-km") : null,
    rpe
  };
  const e = efficienza(dati);
  return { ...dati, efficienza: e.punteggio, parziale: e.parziale };
}

export function problemaSessione() {
  const d = datiSessione();
  if (st.tipo === "misto" && !(d.minForza > 0 && d.minCardio > 0)) {
    return "Indica i minuti previsti di forza e di cardio.";
  }
  if (!(d.minPrevisti > 0)) return "Indica il tempo previsto.";
  if (!(d.minEffettivi > 0)) return "Indica il tempo effettivo.";
  if (haForza() && (d.volumePrevisto === null || d.volumeEseguito === null)) {
    return "Indica volume previsto ed eseguito (0 per il solo corpo libero).";
  }
  if (senzaCarico() && !(d.ripPreviste > 0 && d.ripEseguite !== null)) {
    return "Senza carichi indica le ripetizioni previste ed eseguite.";
  }
  if (haCardio() && d.zonaPct === null) return "Indica la percentuale di tempo in zona FC.";
  const negativi = [d.kcal, d.volumePrevisto, d.volumeEseguito, d.ripEseguite, d.km, d.zonaPct]
    .some((v) => v !== null && v < 0);
  if (negativi || d.zonaPct > 100) return "Controlla i valori: niente numeri negativi, zona al massimo 100%.";
  if (d.rpe === null) return "Seleziona la fatica percepita (RPE).";
  return "";
}

export function aggiornaRegistrazione() {
  const misto = st.tipo === "misto";
  $("r-previsti-box").hidden = misto;
  $("r-prev-forza-box").hidden = !misto;
  $("r-prev-cardio-box").hidden = !misto;
  ["r-volume-prev-box", "r-volume-box"].forEach((id) => { $(id).hidden = !haForza(); });
  ["r-rip-prev-box", "r-rip-box"].forEach((id) => { $(id).hidden = !senzaCarico(); });
  ["r-zona-box", "r-km-box"].forEach((id) => { $(id).hidden = !haCardio(); });
  [...$("rpe").children].forEach((b, i) => b.setAttribute("aria-pressed", String(rpe === i + 1)));
  const dati = datiSessione();
  disegnaDettaglioEfficienza($("anteprima"), dati);
}

function scegli(id) {
  scelta = schede.find((s) => s.id === id) || null;
  $("r-scheda").value = scelta?.id || "";
  // Cambiando scheda i dati svolti si azzerano, per non attribuirli a quella sbagliata
  CAMPI_EFFETTIVI.forEach((c) => { $(c).value = ""; });
  rpe = null;
  $("r-previsti").value = scelta ? scelta.durataMin : "";
  $("r-prev-forza").value = scelta ? scelta.minForza || "" : "";
  $("r-prev-cardio").value = scelta ? scelta.minCardio || "" : "";
  $("r-volume-prev").value = scelta && scelta.tipo !== "cardio" ? scelta.volumeKg : "";
  $("r-rip-prev").value = scelta && scelta.tipo !== "cardio" ? ripetizioni(scelta.elementi) : "";
  alCambioScheda(scelta);
}

export async function caricaSchedeAssegnate(idIniziale = "") {
  const mia = ++richiesta;
  const atletaId = st.atleta.id;
  schede = [];
  $("r-scheda").disabled = true;
  disegnaScelte();
  scegli("");
  $("r-scheda-stato").textContent = "Caricamento delle schede…";
  try {
    const lette = await elencaSchede(atletaId);
    if (mia !== richiesta) return;
    schede = lette.filter((s) => s.stato === "assegnata");
    disegnaScelte();
    $("r-scheda-stato").textContent = schede.length ? "" : "Nessuna scheda assegnata da completare.";
    $("r-scheda").disabled = false;
    if (idIniziale) {
      scegli(idIniziale);
      if (!scelta) $("r-scheda-stato").textContent = "La scheda richiesta non risulta più tra quelle da completare.";
    }
  } catch (e) {
    console.error(e);
    if (mia !== richiesta) return;
    $("r-scheda-stato").textContent = "Impossibile leggere le schede: puoi registrare una sessione libera.";
    $("r-scheda").disabled = false;
  }
}

function disegnaScelte() {
  $("r-scheda").replaceChildren(
    crea("option", { value: "", textContent: "Sessione libera (senza scheda)" }),
    ...schede.map((s) => crea("option", {
      value: s.id, textContent: `${s.data.split("-").reverse().join("/")} · ${s.nome}`
    })));
}

export function avviaRegistrazione(opzioni) {
  alCambio = opzioni.alCambio;
  alCambioScheda = opzioni.alCambioScheda;
  $("rpe").replaceChildren(...Array.from({ length: 10 }, (_, i) => {
    const b = crea("button", { type: "button", textContent: i + 1 });
    b.addEventListener("click", () => { rpe = i + 1; alCambio(); });
    return b;
  }));
  $("sezione-registra").addEventListener("input", alCambio);
  $("r-scheda").addEventListener("change", (ev) => scegli(ev.target.value));
}
