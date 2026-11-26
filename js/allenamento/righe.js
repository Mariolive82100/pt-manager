// Editor di esercizi e blocchi cardio
import { $, crea } from "../core/ui.js";
import {
  ZONE, testoZona, percentualeDaCarico, caricoDaPercentuale, minutiElemento
} from "../core/calcoli-allenamento.js";
import { MASSIMALI } from "../core/calcoli-misure.js";
import { BLOCCHI_CARDIO } from "../core/esercizi-base.js";
import { st, elementi, tuttiEsercizi, massimale } from "./stato.js";

const NUOVO = "__nuovo__";
let alCambio = () => {};
let alNuovoEsercizio = async () => null;

const numero = (testo) => (testo === "" ? null : Number(testo));

function campo(etichetta, input) {
  return crea("label", { className: "mini" }, crea("span", { textContent: etichetta }), input);
}

function inputNumero(e, chiave, min, max, passo, dopo) {
  const i = crea("input", {
    type: "number", className: "input", min, max, step: passo,
    value: e[chiave] ?? "", name: chiave
  });
  i.addEventListener("input", () => { e[chiave] = numero(i.value); dopo?.(); alCambio(); });
  return i;
}

function sceltaEsercizio(e) {
  const select = crea("select", { className: "input nome-elemento", name: "esercizio" });
  select.setAttribute("aria-label", "Esercizio");
  const opzione = (v) => crea("option", { value: v.nome, textContent: v.nome });
  const base = tuttiEsercizi().filter((v) => !st.personalizzati.includes(v));
  select.append(crea("option", { value: "", textContent: "Scegli l'esercizio…" }));
  if (st.personalizzati.length) {
    select.append(crea("optgroup", { label: "Personalizzati" }, ...st.personalizzati.map(opzione)));
  }
  select.append(crea("optgroup", { label: "Elenco di base" }, ...base.map(opzione)));
  // Esercizio di una vecchia scheda non più in elenco: resta selezionato
  if (e.nome && !tuttiEsercizi().some((v) => v.nome === e.nome)) {
    select.append(opzione(e));
  }
  select.append(crea("option", { value: NUOVO, textContent: "+ Esercizi personalizzati…" }));
  select.value = e.nome;
  select.addEventListener("change", async () => {
    let scelto = select.value;
    if (scelto === NUOVO) scelto = (await alNuovoEsercizio()) ?? e.nome;
    const voce = tuttiEsercizi().find((v) => v.nome === scelto);
    if (voce) { e.nome = voce.nome; e.rm = voce.rm; }
    else if (scelto === "") { e.nome = ""; e.rm = ""; }
    disegnaRighe();
    alCambio();
  });
  return select;
}

function campiForza(e) {
  const max = massimale(e.rm);
  const pct = crea("input", {
    type: "number", className: "input", min: 1, max: 150, step: 1, name: "pct",
    value: percentualeDaCarico(e.kg, max) ?? "", disabled: !max
  });
  const kg = inputNumero(e, "kg", 0, 600, 0.5,
    () => { pct.value = percentualeDaCarico(e.kg, max) ?? ""; });
  pct.addEventListener("input", () => {
    const carico = caricoDaPercentuale(pct.value, max);
    if (carico === null) return;
    e.kg = carico;
    kg.value = carico;
    alCambio();
  });
  let nota = "";
  if (e.nome && !e.rm) nota = "Esercizio non collegato a un massimale.";
  else if (e.rm && !max) {
    const nome = MASSIMALI.find(([c]) => c === e.rm)?.[1] || e.rm;
    nota = `Manca il massimale ${nome}: inseriscilo nelle Misurazioni.`;
  }
  return [
    campo("Serie", inputNumero(e, "serie", 1, 30, 1)),
    campo("Rip.", inputNumero(e, "rip", 1, 200, 1)),
    campo("Carico kg", kg),
    campo("% 1RM", pct),
    campo("Recupero s", inputNumero(e, "recupero", 0, 900, 5)),
    nota ? crea("span", { className: "muted nota-riga", textContent: nota }) : null
  ];
}

function campiCardio(e) {
  const bpm = crea("span", { className: "zona-bpm" });
  const aggiorna = () => { bpm.textContent = testoZona(e.zona, st.atleta?.fcMax); };
  const zona = crea("select", { className: "input", name: "zona" },
    ...ZONE.map((z, i) => crea("option", { value: i + 1, textContent: "Z" + (i + 1) })));
  zona.value = e.zona;
  zona.addEventListener("change", () => { e.zona = Number(zona.value); aggiorna(); alCambio(); });
  aggiorna();
  return [
    campo("Rip.", inputNumero(e, "rip", 1, 100, 1)),
    campo("Durata min", inputNumero(e, "minuti", 0.5, 600, 0.5)),
    campo("Zona", zona),
    bpm
  ];
}

function azione(testo, etichetta, disabilitato, funzione) {
  const b = crea("button", {
    type: "button", className: "btn btn-ghost btn-icona", textContent: testo,
    disabled: disabilitato
  });
  b.setAttribute("aria-label", etichetta);
  b.addEventListener("click", () => { funzione(); disegnaRighe(); alCambio(); });
  return b;
}

function riga(e, i, lista) {
  let nome;
  if (e.k === "forza") {
    nome = sceltaEsercizio(e);
  } else {
    nome = crea("input", {
      className: "input nome-elemento", value: e.nome, maxLength: 80,
      placeholder: "Nome del blocco", name: "blocco"
    });
    nome.setAttribute("list", "blocchi-cardio");
    nome.setAttribute("aria-label", "Nome del blocco cardio");
    nome.addEventListener("input", () => { e.nome = nome.value; alCambio(); });
  }
  const scambia = (j) => { [lista[i], lista[j]] = [lista[j], lista[i]]; };
  return crea("li", { className: "elemento elemento-" + e.k },
    crea("span", { className: "elemento-num", textContent: i + 1 }),
    crea("div", { className: "elemento-corpo" },
      crea("div", { className: "elemento-testa" },
        crea("span", {
          className: "tag " + (e.k === "forza" ? "tag-accent" : "tag-outline"),
          textContent: e.k === "forza" ? "Forza" : "Cardio"
        }), nome),
      crea("div", { className: "elemento-campi" },
        ...(e.k === "forza" ? campiForza(e) : campiCardio(e)))),
    crea("div", { className: "elemento-azioni" },
      azione("↑", "Sposta su", i === 0, () => scambia(i - 1)),
      azione("↓", "Sposta giù", i === lista.length - 1, () => scambia(i + 1)),
      azione("×", "Rimuovi", false, () => lista.splice(i, 1))));
}

export function disegnaRighe() {
  $("elementi").replaceChildren(...elementi().map(riga));
  $("btn-add-forza").hidden = st.tipo === "cardio";
  $("btn-add-cardio").hidden = st.tipo === "forza";
}

// Striscia che mostra l'alternanza nella sessione mista
export function disegnaStriscia() {
  $("striscia").hidden = st.tipo !== "misto";
  if (st.tipo !== "misto") return;
  $("striscia").replaceChildren(...elementi().map((e) => {
    const s = crea("span", { className: "tratto tratto-" + e.k, title: e.nome || "Senza nome" });
    s.style.flexGrow = Math.max(0.5, minutiElemento(e) || 0);
    return s;
  }));
}

export function avviaRighe(opzioni) {
  alCambio = opzioni.alCambio;
  alNuovoEsercizio = opzioni.alNuovoEsercizio;
  $("blocchi-cardio").replaceChildren(
    ...BLOCCHI_CARDIO.map((n) => crea("option", { value: n })));
}
