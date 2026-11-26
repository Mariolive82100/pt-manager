// Elenco atleti con ricerca e filtro per livello
import { $, crea } from "../core/ui.js";
import { LIVELLI, livelloEffettivo, nomeLivello } from "../core/calcoli.js";

const stato = { atleti: [], testo: "", livello: -1, scelto: null, alClic: () => {} };

// Efficienza media dalle ultime sessioni ("–" se non ce ne sono)
function efficienza(atleta) {
  const valori = (atleta.riepilogo || []).map((s) => s.efficienza).filter(Number.isFinite);
  return valori.length ? Math.round(valori.reduce((a, b) => a + b, 0) / valori.length) : "–";
}

function disegna() {
  const visibili = stato.atleti.filter((a) =>
    a.nome.toLowerCase().includes(stato.testo) &&
    (stato.livello < 0 || livelloEffettivo(a) === stato.livello));

  $("conteggio").textContent = `${visibili.length} di ${stato.atleti.length}`;
  $("elenco-vuoto").hidden = visibili.length > 0;
  $("elenco-vuoto").textContent = stato.atleti.length ? "Nessun risultato" : "Nessun atleta inserito";

  $("elenco").replaceChildren(...visibili.map((a) => {
    const riga = crea("button", { type: "button", className: "riga-atleta" },
      crea("span", { className: "riga-nome", textContent: a.nome }),
      crea("span", { className: "riga-eff" },
        String(efficienza(a)), crea("small", { textContent: "eff." })),
      crea("span", { className: "riga-info" },
        crea("span", { className: "tag tag-accent", textContent: nomeLivello(livelloEffettivo(a)) }),
        crea("span", { textContent: a.obiettivo || "" })));
    if (a.id === stato.scelto) riga.setAttribute("aria-current", "true");
    riga.addEventListener("click", () => stato.alClic(a.id));
    return riga;
  }));

  $("filtri").replaceChildren(...["Tutti", ...LIVELLI].map((etichetta, i) => {
    const attivo = stato.livello === i - 1;
    const b = crea("button", {
      type: "button", textContent: etichetta,
      className: "filtro tag " + (attivo ? "tag-accent" : "tag-neutral")
    });
    b.setAttribute("aria-pressed", String(attivo));
    b.addEventListener("click", () => { stato.livello = i - 1; disegna(); });
    return b;
  }));
}

export function avviaElenco(alClic) {
  stato.alClic = alClic;
  $("cerca").addEventListener("input", (ev) => {
    stato.testo = ev.target.value.trim().toLowerCase();
    disegna();
  });
}

export function aggiornaElenco(atleti, scelto) {
  stato.atleti = atleti;
  stato.scelto = scelto;
  disegna();
}
