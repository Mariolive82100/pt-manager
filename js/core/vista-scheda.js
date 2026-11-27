// Esercizi e blocchi in sola lettura: scheda da fare e dettaglio di una sessione
import { crea } from "./ui.js";
import { testoZona, aTempo } from "./calcoli-allenamento.js";

const it = (n) => Number(n || 0).toLocaleString("it-IT");

const riga = (titolo, ...testi) => crea("li", { className: "voce-scheda" },
  crea("strong", { textContent: titolo }),
  ...testi.filter(Boolean).map((t) => crea("span", { textContent: t })));

export function elencoPrevisto(elementi, fcMax) {
  return crea("ul", { className: "voci-scheda" }, ...elementi.map((e) => (e.k === "forza"
    ? riga(e.nome,
      (aTempo(e) ? `${e.serie} round × ${e.lavoro} s` : `${e.serie} serie × ${e.rip} rip.`) +
        ` · ${e.kg ? it(e.kg) + " kg" : "corpo libero"}` +
        (aTempo(e) && e.rip ? ` · obiettivo ${e.rip} rip.` : ""),
      `Recupero ${e.recupero} s`)
    : riga(e.nome,
      `${e.rip > 1 ? e.rip + " × " : ""}${it(e.minuti)} min · Z${e.zona}`,
      testoZona(e.zona, fcMax)))));
}

// dettaglio: quanto registrato dall'atleta
export function elencoSvolto(dettaglio) {
  return crea("ul", { className: "voci-scheda" }, ...dettaglio.map((e) => {
    if (e.k === "cardio") return riga(e.nome, e.fatto ? "Blocco svolto" : "Blocco non spuntato");
    const fatte = e.serie.filter((s) => s.fatta);
    if (e.modo === "tempo") {
      const contate = fatte.filter((s) => s.rip);
      return riga(e.nome,
        `Round svolti: ${fatte.length} di ${e.serie.length} (${e.lavoro} s)`,
        contate.map((s) => `${s.rip} rip.${s.kg ? ` × ${it(s.kg)} kg` : ""}`).join(" · "));
    }
    return riga(e.nome,
      `Serie svolte: ${fatte.length} di ${e.serie.length}`,
      fatte.map((s) => `${s.rip} × ${it(s.kg)} kg`).join(" · "));
  }));
}
