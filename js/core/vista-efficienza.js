// Punteggio di efficienza con le tre componenti (anteprima e dettaglio)
import { crea } from "./ui.js";
import { efficienza, giudizio, suRipetizioni } from "./calcoli-allenamento.js";

const perCento = (x) => Math.round(x * 100) + "%";
const COMPLETAMENTO = {
  forza: "Volume completato", cardio: "Tempo in zona FC", misto: "Completamento forza + cardio"
};

function parte(etichetta, peso, valore, nota) {
  const barra = crea("div", { className: "barra" }, crea("div"));
  barra.firstChild.style.width = valore === null ? "0" : perCento(valore);
  return crea("div", { className: "parte" },
    crea("div", { className: "parte-testa" },
      crea("span", { textContent: `${etichetta} · peso ${peso}` }),
      crea("strong", { textContent: valore === null ? "non disponibile" : perCento(valore) })),
    barra,
    nota ? crea("span", { className: "muted", textContent: nota }) : null);
}

export function disegnaDettaglioEfficienza(contenitore, s) {
  const e = efficienza(s);
  const note = [];
  if (e.parziale) note.push("Efficienza parziale: senza kcal è calcolata solo su completamento e tempi.");
  if (s.tipo === "misto" && s.minForza && s.minCardio) {
    const quota = Math.round((100 * s.minForza) / (s.minForza + s.minCardio));
    note.push(`Completamento pesato sul tempo previsto: forza ${quota}%, cardio ${100 - quota}%.`);
  }
  if (s.regolaCardio === 2 && Number.isFinite(s.cardioMin) && Number.isFinite(s.zonaMin)) {
    const base = Math.max(s.minCardio || 0, s.cardioMin).toLocaleString("it-IT");
    note.push(`Cardio: ${s.zonaMin.toLocaleString("it-IT")} min in zona su ${base} (il maggiore tra previsti e svolti).`);
  }
  if (suRipetizioni(s)) {
    note.push(`Nessun carico previsto: la forza è calcolata sulle ripetizioni (${s.ripEseguite} di ${s.ripPreviste}).`);
  } else if (s.tipo !== "cardio" && s.volumePrevisto === 0) {
    note.push("Con volume previsto pari a zero il completamento non è calcolabile.");
  }
  contenitore.replaceChildren(
    crea("div", { className: "punteggio" },
      crea("span", { className: "punteggio-numero", textContent: e.punteggio ?? "–" }),
      crea("span", {
        className: "muted",
        textContent: e.punteggio === null ? "dati insufficienti"
          : `su 100 · ${giudizio(e.punteggio)}${e.parziale ? " · parziale" : ""}`
      })),
    parte(s.tipo === "forza" && suRipetizioni(s) ? "Ripetizioni completate" : COMPLETAMENTO[s.tipo], e.parziale ? "60%" : "45%", e.completamento),
    parte("Rispetto dei tempi", e.parziale ? "40%" : "30%", e.tempi,
      s.minEffettivi && s.minPrevisti ? `${s.minEffettivi} min effettivi su ${s.minPrevisti} previsti` : ""),
    parte("Resa energetica", e.parziale ? "esclusa" : "25%", e.energia,
      e.kcalMin === null ? "" : `${e.kcalMin.toFixed(1).replace(".", ",")} kcal/min (riferimento 9)`),
    ...note.map((t) => crea("span", { className: "avviso", textContent: t })));
}
