// Finestra degli esercizi personalizzati
import { $, crea } from "../core/ui.js";
import { MASSIMALI } from "../core/calcoli-misure.js";
import { leggiEsercizi, aggiungiEsercizio, togliEsercizio } from "../core/db-esercizi.js";
import { testoErrore } from "../core/errori.js";
import { ESERCIZI_BASE } from "../core/esercizi-base.js";
import { st } from "./stato.js";

let risolvi = null;
let aggiunto = null;
let disponibile = false;
let alCambio = () => {};

function errore(testo) {
  $("esercizi-errore").textContent = testo;
  $("esercizi-errore").hidden = !testo;
}

function disegnaElenco() {
  $("esercizi-elenco").replaceChildren(...st.personalizzati.map((v) => {
    const b = crea("button", { type: "button", className: "btn btn-ghost", textContent: "Elimina" });
    b.addEventListener("click", () => elimina(v.nome, b));
    const legato = MASSIMALI.find(([c]) => c === v.rm)?.[1];
    return crea("li", {},
      crea("span", { textContent: v.nome + (legato ? ` · 1RM ${legato}` : "") }), b);
  }));
}

async function elimina(nome, pulsante) {
  if (!confirm(`Eliminare "${nome}" dall'elenco? Le schede già salvate non cambiano.`)) return;
  pulsante.disabled = true;
  try {
    st.personalizzati = await togliEsercizio(nome);
    disegnaElenco();
    alCambio();
  } catch (e) {
    console.error(e);
    pulsante.disabled = false;
    errore(testoErrore(e));
  }
}

export async function caricaEsercizi() {
  try {
    st.personalizzati = await leggiEsercizi();
    disponibile = true;
  } catch (e) {
    console.error(e);
    disponibile = false;
  }
  return disponibile;
}

// Restituisce il nome del nuovo esercizio, oppure null
export function apriEsercizi() {
  aggiunto = null;
  errore(disponibile ? "" : "Esercizi personalizzati non disponibili. Controlla la connessione e le regole Firebase, poi ricarica la pagina.");
  $("form-esercizio").reset();
  $("btn-esercizio-salva").disabled = !disponibile;
  disegnaElenco();
  $("dialogo-esercizi").showModal();
  return new Promise((r) => { risolvi = r; });
}

export function avviaDialogoEsercizi(funzione) {
  alCambio = funzione;
  $("esercizio-rm").replaceChildren(
    crea("option", { value: "", textContent: "Nessuno" }),
    ...MASSIMALI.map(([c, n]) => crea("option", { value: c, textContent: n })));

  $("form-esercizio").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const nome = $("esercizio-nome").value.trim().replace(/\s+/g, " ");
    if (!nome) return;
    if (ESERCIZI_BASE.some((v) => v.nome.toLowerCase() === nome.toLowerCase())) {
      return errore("È già presente nell'elenco di base.");
    }
    $("btn-esercizio-salva").disabled = true;
    try {
      st.personalizzati = await aggiungiEsercizio(nome, $("esercizio-rm").value);
      aggiunto = nome;
      $("dialogo-esercizi").close();
    } catch (e) {
      console.error(e);
      errore(testoErrore(e));
    } finally {
      $("btn-esercizio-salva").disabled = false;
    }
  });
  $("btn-esercizi-chiudi").addEventListener("click", () => $("dialogo-esercizi").close());
  $("dialogo-esercizi").addEventListener("close", () => {
    risolvi?.(aggiunto);
    risolvi = null;
  });
}
