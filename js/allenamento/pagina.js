// Avvio della pagina "Nuovo allenamento"
import { osservaAccesso, leggiProfilo, esci } from "../core/auth.js";
import { elencaAtleti } from "../core/db-atleti.js";
import { salvaScheda, leggiScheda, registraSessione } from "../core/db-allenamenti.js";
import { $, crea, avviso } from "../core/ui.js";
import { TIPI, isoLocale } from "../core/calcoli-allenamento.js";
import { livelloEffettivo, nomeLivello } from "../core/calcoli.js";
import { testoErrore } from "../core/errori.js";
import "../core/versione.js";
import { st, elementi, nuovoForza, nuovoCardio, haCardio } from "./stato.js";
import { avviaRighe, disegnaRighe, disegnaStriscia } from "./righe.js";
import { avviaDialogoEsercizi, apriEsercizi, caricaEsercizi } from "./esercizi-dialogo.js";
import { avviaNoteSanitarie, caricaNoteSanitarie, noteLette } from "./note-sanitarie.js";
import {
  avviaPianifica, aggiornaRiepilogoPiano, problemaScheda, datiScheda, caricaScheda
} from "./pianifica.js";
import {
  avviaRegistrazione, aggiornaRegistrazione, problemaSessione, datiSessione,
  caricaSchedeAssegnate, schedaScelta
} from "./registra.js";

const parametri = new URLSearchParams(location.search);
let atleti = [];
let schedaInModifica = null; // scheda esistente aperta dal profilo
const date = { pianifica: isoLocale(), registra: isoLocale() };
let nomeScritto = false;
const nomi = { // nome della sessione, separato per le due modalità
  pianifica: { testo: "", scritto: false }, registra: { testo: "", scritto: false }
};
let modificata = false;
let salvataggio = false;
let schedeCaricatePer = null;

const piano = () => st.modo === "pianifica";
const primoNome = () => st.atleta.nome.split(/\s+/)[0];

function aggiorna() {
  if (!st.atleta) return;
  document.querySelectorAll("[name=modo]").forEach((r) => { r.checked = r.value === st.modo; });
  document.querySelectorAll("[name=tipo]").forEach((r) => {
    r.checked = r.value === st.tipo;
    r.disabled = !piano() && Boolean(schedaScelta());
  });
  $("titolo-pagina").textContent = !piano() ? "Registra sessione"
    : schedaInModifica ? "Modifica scheda" : "Pianifica scheda";
  $("etichetta-data").textContent = piano() ? "Data prevista" : "Data di svolgimento";
  $("f-data").max = piano() ? "" : isoLocale();
  if (!nomeScritto) $("f-nome").value = (!piano() && schedaScelta()?.nome) || TIPI[st.tipo];
  const fc = st.atleta.fcMax;
  $("info-atleta").textContent = [
    nomeLivello(livelloEffettivo(st.atleta)),
    st.atleta.obiettivo ? "obiettivo: " + st.atleta.obiettivo : "",
    fc ? `FC max ${fc} bpm` : "FC max mancante"
  ].filter(Boolean).join(" · ");
  $("avviso-fc").hidden = !(piano() && haCardio() && !fc);
  $("sezione-pianifica").hidden = !piano();
  $("sezione-registra").hidden = piano();
  $("box-riepilogo").hidden = !piano();
  $("box-anteprima").hidden = piano();
  $("btn-bozza").hidden = !piano();
  $("btn-bozza").textContent = schedaInModifica?.stato === "assegnata"
    ? "Ritira e salva come bozza" : "Salva come bozza";
  $("btn-salva").textContent = piano() ? "Assegna a " + primoNome() : "Aggiungi allo storico";
  // In pianificazione si salva solo dopo aver mostrato le note sanitarie
  const bloccato = salvataggio || (piano() && !noteLette());
  $("btn-salva").disabled = bloccato;
  $("btn-bozza").disabled = bloccato;
  if (piano()) { aggiornaRiepilogoPiano(); disegnaStriscia(); }
  else aggiornaRegistrazione();
}

function cambiata() {
  modificata = true;
  $("errore-salva").hidden = true;
  aggiorna();
}

function cambiaModo(modo) {
  date[st.modo] = $("f-data").value;
  nomi[st.modo] = { testo: $("f-nome").value, scritto: nomeScritto };
  st.modo = modo;
  $("f-data").value = date[modo];
  nomeScritto = nomi[modo].scritto;
  $("f-nome").value = nomi[modo].testo;
  if (!piano() && schedeCaricatePer !== st.atleta.id) {
    schedeCaricatePer = st.atleta.id;
    caricaSchedeAssegnate();
  } else if (!piano() && schedaScelta()) {
    st.tipo = schedaScelta().tipo; // la scheda scelta impone il suo tipo
  }
  disegnaRighe();
  aggiorna();
}

function scegliAtleta(id, idScheda = "") {
  st.atleta = atleti.find((a) => a.id === id);
  $("f-atleta").value = id;
  $("torna").href = "trainer.html#atleta=" + encodeURIComponent(id);
  $("annulla").href = $("torna").href;
  caricaNoteSanitarie();
  schedeCaricatePer = null;
  if (!piano()) {
    schedeCaricatePer = id;
    caricaSchedeAssegnate(idScheda);
  }
  disegnaRighe();
  aggiorna();
}

// Chiamata quando in registrazione si sceglie una scheda o la sessione libera
function usaScheda(scheda) {
  if (piano()) return;
  if (scheda) st.tipo = scheda.tipo;
  nomeScritto = false;
  aggiorna();
}

function mostraSalvato(occhiello, testo) {
  modificata = false;
  $("modulo").hidden = true;
  $("salvato").hidden = false;
  $("salvato-occhiello").textContent = occhiello;
  $("salvato-titolo").textContent = $("f-nome").value.trim();
  $("salvato-testo").textContent = testo;
  $("salvato-profilo").href = $("torna").href;
  $("salvato-altro").href =
    `allenamento.html?atleta=${encodeURIComponent(st.atleta.id)}&modo=${st.modo}`;
  window.scrollTo(0, 0);
}

function errore(testo) {
  $("errore-salva").textContent = testo;
  $("errore-salva").hidden = !testo;
}

async function salva(statoScheda) {
  if (!$("f-data").value) return errore("Indica la data.");
  if (!$("f-nome").value.trim()) return errore("Dai un nome alla sessione.");
  if (!piano() && $("f-data").value > isoLocale()) return errore("Una sessione svolta non può avere una data futura.");
  // Le bozze possono essere incomplete
  const problema = !piano() ? problemaSessione()
    : statoScheda === "assegnata" ? problemaScheda() : "";
  if (problema) return errore(problema);

  salvataggio = true;
  $("campi").disabled = true;
  aggiorna();
  errore("");
  try {
    if (piano()) {
      await salvaScheda(st.atleta.id, schedaInModifica?.id || null, datiScheda(statoScheda));
      const assegnata = statoScheda === "assegnata";
      mostraSalvato(assegnata ? "Scheda assegnata" : "Bozza salvata", assegnata
        ? `Salvata per ${st.atleta.nome}. L'atleta potrà vederla quando sarà pronta la sua app.`
        : "Non è assegnata. Puoi riprenderla dal profilo dell'atleta.");
    } else {
      const dati = datiSessione();
      await registraSessione(st.atleta.id, dati);
      mostraSalvato(dati.efficienza === null ? "Sessione registrata"
        : `Sessione registrata · efficienza ${dati.efficienza}/100${dati.parziale ? " (parziale)" : ""}`,
      "Aggiunta allo storico di " + st.atleta.nome + ".");
    }
  } catch (e) {
    console.error(e);
    errore(testoErrore(e));
  } finally {
    salvataggio = false;
    $("campi").disabled = false;
    if (!$("modulo").hidden) aggiorna();
  }
}

function collega() {
  avviaRighe({ alCambio: cambiata, alNuovoEsercizio: apriEsercizi });
  avviaDialogoEsercizi(disegnaRighe);
  avviaNoteSanitarie(aggiorna);
  avviaPianifica(cambiata);
  avviaRegistrazione({ alCambio: cambiata, alCambioScheda: usaScheda });

  document.querySelectorAll("[name=modo]").forEach((r) =>
    r.addEventListener("change", () => cambiaModo(r.value)));
  document.querySelectorAll("[name=tipo]").forEach((r) =>
    r.addEventListener("change", () => { st.tipo = r.value; disegnaRighe(); cambiata(); }));
  $("f-atleta").addEventListener("change", (ev) => scegliAtleta(ev.target.value));
  $("f-nome").addEventListener("input", () => { nomeScritto = true; cambiata(); });
  $("f-data").addEventListener("input", cambiata);
  $("f-note").addEventListener("input", cambiata);
  $("btn-add-forza").addEventListener("click", () => {
    elementi().push(nuovoForza()); disegnaRighe(); cambiata();
  });
  $("btn-add-cardio").addEventListener("click", () => {
    elementi().push(nuovoCardio()); disegnaRighe(); cambiata();
  });
  $("btn-salva").addEventListener("click", () => salva("assegnata"));
  $("btn-bozza").addEventListener("click", () => salva("bozza"));
  $("btn-esci").addEventListener("click", () => esci());
  window.addEventListener("beforeunload", (ev) => { if (modificata) ev.preventDefault(); });
}

async function prepara() {
  atleti = await elencaAtleti();
  const richiesto = parametri.get("atleta");
  const atleta = atleti.find((a) => a.id === richiesto);
  if (!atleta) {
    throw { code: "app/atleta-inesistente" };
  }
  st.modo = parametri.get("modo") === "registra" ? "registra" : "pianifica";
  $("f-atleta").replaceChildren(
    ...atleti.map((a) => crea("option", { value: a.id, textContent: a.nome })));
  $("f-data").value = date[st.modo];

  const personalizzatiOk = await caricaEsercizi();
  const idScheda = parametri.get("scheda") || "";
  if (idScheda && piano()) {
    const scheda = await leggiScheda(atleta.id, idScheda);
    if (!scheda) throw { code: "app/scheda-inesistente" };
    if (scheda.stato === "completata") throw { code: "app/scheda-completata" };
    schedaInModifica = scheda;
    caricaScheda(scheda);
    $("f-data").value = date.pianifica = scheda.data;
    $("f-nome").value = scheda.nome;
    nomeScritto = true;
    $("f-atleta").disabled = true;
    // Mentre si modifica una scheda non si cambia modalità: eviterebbe errori
    document.querySelector("[name=modo][value=registra]").disabled = true;
  }

  collega();
  $("caricamento").hidden = true;
  $("modulo").hidden = false;
  scegliAtleta(atleta.id, idScheda);
  if (!personalizzatiOk) avviso("Esercizi personalizzati non disponibili: usa l'elenco di base.", true);
}

osservaAccesso(async (user) => {
  if (!user) return location.replace("./");
  try {
    const profilo = await leggiProfilo(user);
    if (profilo.stato !== "ok" || profilo.ruolo !== "trainer") return location.replace("./");
    await prepara();
  } catch (e) {
    console.error(e);
    $("caricamento").hidden = true;
    avviso(testoErrore(e), true);
  }
});
