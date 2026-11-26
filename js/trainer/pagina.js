// Avvio dell'area trainer e controllo del ruolo
import { osservaAccesso, leggiProfilo, esci, messaggioErrore } from "../core/auth.js";
import { elencaAtleti, salvaAtleta, MASSIMO_ATLETI } from "../core/db-atleti.js";
import { $, crea, avviso, iniziali } from "../core/ui.js";
import {
  eta, anniAllenamento, livelloCalcolato, livelloEffettivo, nomeLivello
} from "../core/calcoli.js";
import { avviaElenco, aggiornaElenco } from "./elenco.js";
import { avviaForm, compilaForm } from "./atleta-form.js";
import { avviaElimina, chiediElimina } from "./atleta-elimina.js";

let trainer = null;
let atleti = [];
let scelto = null;
let inModifica = null; // id in modifica, null = nuovo

const trova = (id) => atleti.find((a) => a.id === id);

function mostra(vista) {
  ["vuoto", "profilo", "form"].forEach((v) => { $("vista-" + v).hidden = v !== vista; });
}

const dato = (etichetta, valore) => crea("div", { className: "dato" },
  crea("span", { textContent: etichetta }), crea("strong", { textContent: valore }));

const con = (valore, unita) => (valore ? `${valore} ${unita}` : "–");

function testoAnni(anni) {
  if (anni === null) return "–";
  if (anni < 1) return "Meno di 1 anno";
  const n = Math.floor(anni);
  return n === 1 ? "1 anno" : `${n} anni`;
}

function disegnaProfilo(a) {
  $("p-iniziali").textContent = iniziali(a.nome);
  $("p-sopra").textContent =
    `Profilo atleta · ${a.sesso === "F" ? "Donna" : "Uomo"} · ${eta(a.dataNascita)} anni`;
  $("p-nome").textContent = a.nome;
  $("p-livello").textContent = "Livello: " + nomeLivello(livelloEffettivo(a));
  $("p-calcolato").textContent = "Calcolato: " + nomeLivello(livelloCalcolato(a));
  $("p-obiettivo").textContent = a.obiettivo ? "Obiettivo: " + a.obiettivo : "";
  const m = a.massimali || {};
  $("p-dati").replaceChildren(
    dato("Altezza", con(a.altezzaCm, "cm")),
    dato("Test di Cooper", con(a.cooperM, "m")),
    dato("Anzianità", testoAnni(anniAllenamento(a.inizioAllenamento))),
    dato("FC riposo", con(a.fcRiposo, "bpm")),
    dato("FC max", con(a.fcMax, "bpm")),
    dato("1RM Squat", con(m.squat, "kg")),
    dato("1RM Panca piana", con(m.panca, "kg")),
    dato("1RM Stacco", con(m.stacco, "kg")),
    dato("1RM Military press", con(m.military, "kg")));
  $("p-email").textContent = a.email || "Nessuna email: l'atleta non può ancora accedere.";
  $("btn-copia").hidden = !a.email;
}

function apri(id) {
  scelto = id;
  avviso("");
  aggiornaElenco(atleti, scelto);
  const atleta = trova(id);
  if (!atleta) return mostra("vuoto");
  disegnaProfilo(atleta);
  mostra("profilo");
}

function apriForm(id) {
  inModifica = id;
  avviso("");
  compilaForm(id ? trova(id) : null);
  mostra("form");
  $("vista-form").scrollIntoView();
}

const ERRORI_ATLETA = {
  "app/email-gia-usata": "Questa email è già assegnata a un altro atleta.",
  "app/atleta-inesistente": "Questo atleta non esiste più. Ricarica la pagina."
};
const testoErrore = (e) => ERRORI_ATLETA[e?.code] || messaggioErrore(e);

async function salva(dati) {
  const pulsante = $("btn-salva");
  const vecchio = inModifica ? trova(inModifica) : null;
  if (vecchio?.email && vecchio.email !== dati.email &&
      !confirm("Cambiando o togliendo l'email, l'accesso collegato a quella precedente viene revocato. Continuare?")) {
    return;
  }
  pulsante.disabled = true;
  $("btn-annulla").disabled = true;
  avviso("");
  try {
    const id = await salvaAtleta(inModifica, dati, trainer.uid);
    // Aggiorna l'elenco in memoria: nessuna nuova lettura dal database
    atleti = [...atleti.filter((a) => a.id !== id), { ...vecchio, ...dati, id }]
      .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
    apri(id);
    avviso("Atleta salvato.");
  } catch (e) {
    console.error(e);
    avviso(testoErrore(e), true);
  } finally {
    pulsante.disabled = false;
    $("btn-annulla").disabled = false;
  }
}

async function copiaLink() {
  const link = new URL("./", location.href).href;
  try {
    await navigator.clipboard.writeText(link);
    avviso("Link copiato. Mandalo all'atleta: dovrà accedere con l'email indicata.");
  } catch {
    avviso("Copia questo link: " + link);
  }
}

avviaElenco(apri);
avviaForm({ alSalva: salva, alAnnulla: () => apri(scelto) });
$("btn-nuovo").addEventListener("click", () => apriForm(null));
$("btn-modifica").addEventListener("click", () => apriForm(scelto));
$("btn-copia").addEventListener("click", copiaLink);
avviaElimina({
  testoErrore,
  alEliminato: (id) => {
    atleti = atleti.filter((a) => a.id !== id);
    apri(null);
    avviso("Atleta eliminato.");
  }
});
$("btn-elimina").addEventListener("click", () => chiediElimina(trova(scelto)));
$("btn-esci").addEventListener("click", () => esci());

osservaAccesso(async (user) => {
  if (!user) return location.replace("./");
  try {
    const profilo = await leggiProfilo(user);
    if (profilo.stato !== "ok" || profilo.ruolo !== "trainer") return location.replace("./");
    trainer = user;
    atleti = await elencaAtleti();
    $("caricamento").hidden = true;
    $("area").hidden = false;
    aggiornaElenco(atleti, scelto);
    mostra("vuoto");
    if (atleti.length === MASSIMO_ATLETI) {
      avviso(`Sono mostrati i primi ${MASSIMO_ATLETI} atleti.`);
    }
  } catch (e) {
    console.error(e);
    $("caricamento").hidden = true;
    avviso(testoErrore(e), true);
  }
});
