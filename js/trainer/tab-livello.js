// Scheda Livello: livello assegnato dal trainer e livello calcolato dai test
import { $, crea, avviso } from "../core/ui.js";
import {
  LIVELLI, nomeLivello, livelloCalcolato, livelloCooper,
  livelloAnzianita, anniAllenamento
} from "../core/calcoli.js";
import { salvaLivello } from "../core/db-atleti.js";

let atleta = null;
let salvataggio = false;
let opzioni = {};

function nota(assegnato, calcolato) {
  if (assegnato === null) {
    return calcolato === null
      ? "Automatico: mancano dati per calcolare il livello."
      : "Automatico: vale il livello calcolato dai test.";
  }
  if (calcolato === null) return "Vale il livello assegnato. Quello calcolato non è disponibile.";
  if (assegnato === calcolato) return "Coincide con il livello calcolato dai test.";
  return `${assegnato > calcolato ? "Più alto" : "Più basso"} del livello calcolato (${nomeLivello(calcolato)}). Prevale quello assegnato.`;
}

function rigaTest(titolo, riferimento, valore, livello) {
  return crea("div", { className: "test-livello" },
    crea("span", {}, titolo, crea("small", { textContent: riferimento })),
    crea("strong", {}, valore,
      crea("small", { textContent: livello === null ? "Dato mancante" : "→ " + LIVELLI[livello] })));
}

function disegna() {
  const assegnato = atleta.livelloTrainer ?? null;
  const calcolato = livelloCalcolato(atleta);

  $("livello-scelte").replaceChildren(...[null, 0, 1, 2, 3].map((n) => {
    const b = crea("button", {
      type: "button", className: "scelta-livello", disabled: salvataggio,
      textContent: n === null ? "Automatico" : LIVELLI[n]
    });
    b.setAttribute("aria-pressed", String(n === assegnato));
    b.addEventListener("click", () => { if (n !== assegnato) assegna(n); });
    return b;
  }));
  $("livello-nota").textContent = nota(assegnato, calcolato);
  $("livello-calcolato").textContent = nomeLivello(calcolato);

  const anni = anniAllenamento(atleta.inizioAllenamento);
  const inizio = atleta.inizioAllenamento?.split("-").reverse().join("/");
  $("livello-test").replaceChildren(
    rigaTest("Test di Cooper (12 min)", "Soglie: 2000 / 2400 / 2800 m",
      atleta.cooperM ? atleta.cooperM.toLocaleString("it-IT") + " m" : "–",
      livelloCooper(atleta.cooperM)),
    rigaTest("Anzianità di allenamento", "Soglie: 1 / 3 / 6 anni",
      inizio ? "dal " + inizio : "–", livelloAnzianita(anni)));
}

async function assegna(livello) {
  const scelto = atleta;
  salvataggio = true;
  disegna();
  try {
    await salvaLivello(scelto.id, livello);
    scelto.livelloTrainer = livello;
    opzioni.alAggiornato(scelto, atleta === scelto);
    if (atleta === scelto) avviso("Livello salvato.");
  } catch (e) {
    console.error(e);
    avviso(opzioni.testoErrore(e), true);
  } finally {
    salvataggio = false;
    disegna();
  }
}

export function mostraLivello(scelto) {
  atleta = scelto;
  disegna();
}

export function avviaLivello(impostazioni) {
  opzioni = impostazioni;
  $("btn-livello-dati").addEventListener("click", () => opzioni.alModificaDati());
}
