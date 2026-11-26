// Disegno dello storico e dei massimali
import { $, crea } from "../core/ui.js";
import { bmi, variazione, MASSIMALI } from "../core/calcoli-misure.js";

export const dataItaliana = (iso) => iso.split("-").reverse().join("/");
const numero = (v) => v.toLocaleString("it-IT");
const testo = (v, unita = "") => (v ? numero(v) + unita : "–");

export function disegnaStorico(misure, atleta, { bloccata, alModifica, alElimina }) {
  $("misure-righe").replaceChildren(...misure.map((m) => {
    const modifica = crea("button", {
      type: "button", className: "btn btn-ghost", textContent: "Modifica", disabled: bloccata
    });
    modifica.addEventListener("click", () => alModifica(m));
    const elimina = crea("button", { type: "button", className: "btn btn-ghost", textContent: "Elimina" });
    elimina.addEventListener("click", () => alElimina(m, elimina));
    const forza = MASSIMALI.filter(([c]) => m[c]).map(([c, nome]) => `${nome} ${numero(m[c])}`);
    const indice = bmi(m.peso, atleta.altezzaCm);
    const celle = [
      dataItaliana(m.data), testo(m.peso, " kg"), indice ? indice.replace(".", ",") : "–",
      testo(m.vita, " cm"), testo(m.fianchi, " cm"), testo(m.torace, " cm"),
      testo(m.fcRiposo), testo(m.fcMax), forza.join(" · ") || "–"
    ].map((t) => crea("td", { textContent: t }));
    return crea("tr", {}, ...celle, crea("td", { className: "azioni" }, modifica, elimina));
  }));
  $("misure-tabella").hidden = misure.length === 0;
  $("misure-vuoto").hidden = misure.length > 0;
}

// misure = null se lo storico non è disponibile
export function disegnaMassimali(misure, atleta) {
  const valori = atleta.massimali || {};
  const massimo = Math.max(0, ...MASSIMALI.map(([c]) => valori[c] || 0));
  $("rm-lista").replaceChildren(...MASSIMALI.map(([chiave, nome]) => {
    const kg = valori[chiave];
    const note = [];
    if (kg && atleta.peso) note.push(`${(kg / atleta.peso).toFixed(2).replace(".", ",")} × peso corporeo`);
    const v = misure && variazione(misure, chiave);
    if (v) note.push(`${v.differenza > 0 ? "+" : ""}${numero(v.differenza)} kg dal ${dataItaliana(v.dal)}`);
    const barra = crea("div", { className: "barra" }, crea("div"));
    barra.firstChild.style.width = kg ? Math.round((kg / massimo) * 100) + "%" : "0";
    return crea("div", { className: "rm" },
      crea("span", { textContent: nome }),
      crea("strong", { textContent: testo(kg, " kg") }),
      barra,
      crea("small", { textContent: note.join(" · ") }));
  }));
}
