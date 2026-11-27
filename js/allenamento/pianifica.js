// Pianificazione: durata prevista, riepilogo dal vivo, controlli e dati da salvare
import { $, crea } from "../core/ui.js";
import {
  volume, serieTotali, stimaMinuti, stimaKcal, percentualeDaCarico, aTempo, roundATempo
} from "../core/calcoli-allenamento.js";
import { st, elementi, massimale, haForza, haCardio } from "./stato.js";

// null = vale la stima automatica
const corretti = { forza: null, cardio: null };
const PARTI = ["forza", "cardio"];
const attiva = (k) => (k === "forza" ? haForza() : haCardio());

export const minutiPrevisti = (k) =>
  (attiva(k) ? corretti[k] ?? stimaMinuti(elementi(), k) : 0);

const migliaia = (n) => n.toLocaleString("it-IT");

export function aggiornaRiepilogoPiano() {
  PARTI.forEach((k) => {
    $("durata-" + k + "-box").hidden = !attiva(k);
    const campo = $("durata-" + k);
    if (campo !== document.activeElement) campo.value = minutiPrevisti(k) || "";
    $("stima-" + k).textContent = corretti[k] === null
      ? "Stima automatica" : `Corretta da te (stima: ${stimaMinuti(elementi(), k)} min)`;
  });
  const lista = elementi();
  const totale = minutiPrevisti("forza") + minutiPrevisti("cardio");
  const voci = [];
  if (haForza()) {
    voci.push(["Esercizi", lista.filter((e) => e.k === "forza").length],
      ["Serie totali", serieTotali(lista)], ["Volume", migliaia(volume(lista)) + " kg"]);
    if (roundATempo(lista)) voci.push(["di cui round a tempo", roundATempo(lista)]);
  }
  if (haCardio()) voci.push(["Blocchi cardio", lista.filter((e) => e.k === "cardio").length]);
  voci.push(["Durata prevista", totale + " min"]);
  const kcal = stimaKcal(lista, minutiPrevisti("forza"), st.atleta?.peso);
  voci.push(["Kcal indicative", kcal === null ? "manca il peso" : migliaia(kcal)]);
  if (st.tipo === "misto" && totale) {
    voci.push(["Quota forza", Math.round((100 * minutiPrevisti("forza")) / totale) + "%"]);
  }
  $("riepilogo").replaceChildren(...voci.map(([etichetta, valore]) => crea("div", { className: "dato" },
    crea("span", { textContent: etichetta }), crea("strong", { textContent: valore }))));
}

const intero = (v, min) => Number.isInteger(v) && v >= min;

// Restituisce il primo problema che impedisce di assegnare, oppure ""
export function problemaScheda() {
  const lista = elementi();
  if (!lista.length) return "Aggiungi almeno un esercizio o un blocco.";
  if (st.tipo === "misto" && !(lista.some((e) => e.k === "forza") && lista.some((e) => e.k === "cardio"))) {
    return "Una sessione mista richiede almeno un esercizio di forza e un blocco cardio.";
  }
  for (const [i, e] of lista.entries()) {
    const n = `Riga ${i + 1}: `;
    if (!e.nome.trim()) return n + (e.k === "forza" ? "scegli l'esercizio." : "dai un nome al blocco.");
    if (e.k === "forza") {
      if (aTempo(e)) {
        if (!intero(e.serie, 1) || !intero(e.lavoro, 1) || e.lavoro > 3600) {
          return n + "indica round e secondi di lavoro con numeri interi.";
        }
        if (e.rip !== null && !intero(e.rip, 1)) return n + "le ripetizioni obiettivo sono un numero intero, oppure vuote.";
      } else if (!intero(e.serie, 1) || !intero(e.rip, 1)) {
        return n + "serie e ripetizioni devono essere numeri interi.";
      }
      if ((e.kg ?? 0) < 0) return n + "il carico non può essere negativo.";
      if (!(e.recupero >= 0) || e.recupero === null) return n + "indica il recupero (anche 0).";
    } else if (!intero(e.rip, 1) || !(e.minuti > 0)) {
      return n + "indica ripetizioni e durata.";
    }
  }
  for (const k of PARTI) {
    if (attiva(k) && !(minutiPrevisti(k) > 0)) return "La durata prevista deve essere maggiore di zero.";
  }
  return "";
}

function pulito(e) {
  if (e.k === "cardio") {
    return { k: e.k, nome: e.nome.trim(), rip: e.rip, minuti: e.minuti, zona: e.zona };
  }
  const kg = e.kg ?? 0;
  return {
    ...(aTempo(e) ? { modo: e.modo, lavoro: e.lavoro } : {}),
    k: e.k, nome: e.nome, rm: e.rm, serie: e.serie, rip: e.rip, kg,
    pct: percentualeDaCarico(kg, massimale(e.rm)), recupero: e.recupero
  };
}

export function datiScheda(stato) {
  const lista = elementi().map(pulito);
  const minForza = minutiPrevisti("forza");
  const minCardio = minutiPrevisti("cardio");
  return {
    data: $("f-data").value, nome: $("f-nome").value.trim(), tipo: st.tipo, stato,
    elementi: lista, minForza, minCardio, durataMin: minForza + minCardio,
    durataCorretta: { forza: corretti.forza !== null, cardio: corretti.cardio !== null },
    volumeKg: volume(lista), note: $("f-note").value.trim()
  };
}

// Riporta nella pagina una scheda salvata
export function caricaScheda(s) {
  st.tipo = s.tipo;
  st.liste[s.tipo] = s.elementi.map((e) => ({ ...e }));
  corretti.forza = s.durataCorretta?.forza ? s.minForza : null;
  corretti.cardio = s.durataCorretta?.cardio ? s.minCardio : null;
  $("f-note").value = s.note || "";
}

export function avviaPianifica(alCambio) {
  PARTI.forEach((k) => {
    const campo = $("durata-" + k);
    campo.addEventListener("input", () => {
      const v = Number(campo.value);
      corretti[k] = campo.value === "" ? null : v;
      alCambio();
    });
    campo.addEventListener("blur", alCambio);
  });
}
