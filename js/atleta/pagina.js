// Avvio dell'app atleta: ruolo, consenso, schede di navigazione e uscita
import { osservaAccesso, leggiProfilo, esci } from "../core/auth.js";
import { leggiAtleta, leggiConsenso, salvaConsenso } from "../core/db-atleta.js";
import { testoErrore } from "../core/errori.js";
import { $, avviso } from "../core/ui.js";
import "../core/versione.js";
import { testoInformativa, VERSIONE_INFORMATIVA } from "./informativa.js";
import { avviaConsenso, mostraConsenso, consensoValido } from "./consenso.js";
import { avviaOggi, mostraOggi } from "./oggi.js";
import {
  avviaAllenamento, apriAllenamento, fermaCronometro, riprendiCronometro
} from "./allenamento.js";
import { avviaFine, apriFine } from "./fine.js";
import { mostraStorico } from "./storico.js";
import { mostraMieiDati } from "./miei-dati.js";
import { leggiBozza, cancellaBozza } from "./bozza-locale.js";

const SCHEDE = ["oggi", "storico", "dati"];
const PASSI = ["elenco", "corso", "fine", "inviato"];
let utente = null;
let atleta = null;

// Passi della scheda "Oggi"
function passo(nome) {
  PASSI.forEach((p) => { $("passo-" + p).hidden = p !== nome; });
  // Durante l'allenamento niente cambio di schermata
  $("schede-atleta").hidden = nome === "corso" || nome === "fine";
  avviso("");
  window.scrollTo(0, 0);
}

function apriScheda(nome) {
  SCHEDE.forEach((s) => {
    $("pannello-" + s).hidden = s !== nome;
    $("tab-" + s).setAttribute("aria-pressed", String(s === nome));
  });
  if (nome === "oggi") { passo("elenco"); mostraOggi(atleta); }
  if (nome === "storico") mostraStorico(atleta.id);
  if (nome === "dati") mostraMieiDati(atleta);
}

function entra() {
  $("app").hidden = false;
  apriScheda("oggi");
}

async function ritiraConsenso(pulsante) {
  if (!confirm("Ritirare il consenso? L'app si bloccherà. I dati non vengono cancellati: per cancellarli contatta il trainer.")) return;
  pulsante.disabled = true;
  try {
    await salvaConsenso(atleta.id, false, VERSIONE_INFORMATIVA);
    cancellaBozza();
    location.reload(); // toglie dallo schermo tutti i dati già letti
  } catch (e) {
    console.error(e);
    pulsante.disabled = false;
    avviso(testoErrore(e), true);
  }
}

async function uscita() {
  if (leggiBozza() && !confirm("C'è un allenamento non inviato. Uscendo andrà perso. Uscire?")) return;
  fermaCronometro();
  cancellaBozza();
  await esci();
}

avviaConsenso(entra);
avviaOggi((scheda) => {
  passo("corso");
  apriAllenamento(scheda, atleta, utente.uid);
});
avviaAllenamento({
  alTermine: (scheda, bozza, fine) => { passo("fine"); apriFine(scheda, bozza, fine); },
  alAnnullo: () => { passo("elenco"); mostraOggi(); }
});
avviaFine({
  alRitorno: () => { passo("corso"); riprendiCronometro(); },
  alInviato: (dati) => {
    passo("inviato");
    $("inviato-punteggio").textContent = dati.efficienza ?? "–";
    $("inviato-testo").textContent = dati.efficienza === null
      ? "Sessione inviata al trainer. L'efficienza non è calcolabile per questa scheda."
      : `Indice di efficienza${dati.parziale ? " (parziale)" : ""} · sessione inviata al trainer.`;
  }
});
SCHEDE.forEach((s) => $("tab-" + s).addEventListener("click", () => apriScheda(s)));
$("btn-inviato-ok").addEventListener("click", () => apriScheda("oggi"));
$("btn-ritira").addEventListener("click", (ev) => ritiraConsenso(ev.currentTarget));
$("informativa-app").addEventListener("toggle", () =>
  $("informativa-testo").replaceChildren(...testoInformativa()));
document.querySelectorAll(".js-esci").forEach((b) => b.addEventListener("click", uscita));

osservaAccesso(async (user) => {
  if (!user) {
    cancellaBozza();
    return location.replace("./");
  }
  utente = user;
  try {
    const profilo = await leggiProfilo(user);
    if (profilo.stato === "ok" && profilo.ruolo === "trainer") return location.replace("trainer.html");
    if (profilo.stato !== "ok" || profilo.ruolo !== "atleta") return location.replace("./");
    const bozza = leggiBozza();
    if (bozza && bozza.uid !== user.uid) cancellaBozza();
    atleta = await leggiAtleta(profilo.atletaId);
    if (!atleta) throw { code: "app/atleta-inesistente" };
    $("nome-atleta").textContent = atleta.nome;
    const consenso = await leggiConsenso(atleta.id);
    $("caricamento").hidden = true;
    if (consensoValido(consenso)) return entra();
    cancellaBozza();
    mostraConsenso(atleta.id, consenso);
  } catch (e) {
    console.error(e);
    $("caricamento").hidden = true;
    avviso(testoErrore(e), true);
  }
});
