// Allenamento in corso: cronometro, serie e blocchi
import { $, crea } from "../core/ui.js";
import { testoZona, aTempo } from "../core/calcoli-allenamento.js";
import { nuovaBozza, bozzaValida } from "../core/sessione-atleta.js";
import { leggiBozza, salvaBozza, cancellaBozza } from "./bozza-locale.js";

let scheda = null;
let bozza = null;
let orologio = null;
let alTermine = () => {};
let alAnnullo = () => {};

function conserva() {
  $("avviso-salvataggio").hidden = salvaBozza(bozza);
}

function tempo() {
  const secondi = Math.max(0, Math.floor((Date.now() - bozza.inizio) / 1000));
  const parti = [Math.floor(secondi / 3600), Math.floor(secondi / 60) % 60, secondi % 60];
  $("cronometro").textContent = parti.map((n) => String(n).padStart(2, "0")).join(":");
}

export const fermaCronometro = () => clearInterval(orologio);

function inputSerie(serie, chiave, etichetta, passo) {
  const i = crea("input", {
    type: "number", className: "input", min: 0, step: passo, value: serie[chiave] ?? ""
  });
  i.inputMode = "decimal";
  i.name = chiave;
  i.addEventListener("input", () => {
    serie[chiave] = i.value === "" ? 0 : Number(i.value);
    conserva();
  });
  return crea("label", { className: "mini-serie" }, crea("span", { textContent: etichetta }), i);
}

function spunta(attiva, testo, funzione, fatto = "✓ Fatta") {
  const b = crea("button", { type: "button", className: "spunta" });
  const disegna = (v) => {
    b.setAttribute("aria-pressed", String(v));
    b.textContent = v ? fatto : testo;
  };
  disegna(attiva);
  b.addEventListener("click", () => {
    const nuovo = b.getAttribute("aria-pressed") !== "true";
    disegna(nuovo);
    funzione(nuovo);
    conserva();
  });
  return b;
}

function cartaElemento(e, i, fcMax) {
  const stato = bozza.stato[i];
  if (e.k === "cardio") {
    return crea("article", { className: "card esercizio" },
      crea("h4", { textContent: e.nome }),
      crea("span", { textContent:
        `${e.rip > 1 ? e.rip + " × " : ""}${e.minuti} min · Z${e.zona} · ${testoZona(e.zona, fcMax)}` }),
      spunta(stato.fatto, "Segna come svolto", (v) => { stato.fatto = v; }, "✓ Svolto"));
  }
  const tempo = aTempo(e);
  return crea("article", { className: "card esercizio" },
    crea("h4", { textContent: e.nome }),
    crea("span", { className: "muted", textContent: tempo
      ? `${e.serie} round × ${e.lavoro} s di lavoro · recupero ${e.recupero} s` +
        (e.rip ? ` · obiettivo ${e.rip} rip.` : "")
      : `${e.serie} × ${e.rip} · recupero ${e.recupero} s` }),
    tempo ? crea("span", { className: "muted", textContent:
      "Segna i round svolti. Le ripetizioni sono facoltative." }) : null,
    ...stato.serie.map((s, n) => crea("div", { className: "serie" },
      crea("span", { className: "serie-num", textContent: n + 1 }),
      inputSerie(s, "rip", "Rip.", 1),
      inputSerie(s, "kg", "Kg", 0.5),
      spunta(s.fatta, tempo ? "Fatto?" : "Fatta?", (v) => { s.fatta = v; },
        tempo ? "✓ Fatto" : "✓ Fatta"))));
}

// Inizia un nuovo allenamento o riprende quello salvato
export function apriAllenamento(s, atleta, uid) {
  scheda = s;
  const salvata = leggiBozza();
  bozza = salvata && salvata.uid === uid && bozzaValida(salvata, s)
    ? salvata : nuovaBozza(uid, atleta.id, s);
  conserva();
  $("corso-nome").textContent = s.nome;
  $("corso-note").hidden = !s.note;
  $("corso-note").textContent = s.note ? "Note del trainer: " + s.note : "";
  $("corso-elementi").replaceChildren(
    ...s.elementi.map((e, i) => cartaElemento(e, i, atleta.fcMax)));
  riprendiCronometro();
}

export function riprendiCronometro() {
  fermaCronometro();
  tempo();
  orologio = setInterval(tempo, 1000);
}

export function avviaAllenamento(opzioni) {
  alTermine = opzioni.alTermine;
  alAnnullo = opzioni.alAnnullo;
  $("btn-termina").addEventListener("click", () => {
    fermaCronometro();
    alTermine(scheda, bozza, Date.now());
  });
  $("btn-abbandona").addEventListener("click", () => {
    if (!confirm("Annullare l'allenamento? Quello che hai registrato andrà perso.")) return;
    fermaCronometro();
    cancellaBozza();
    alAnnullo();
  });
}
