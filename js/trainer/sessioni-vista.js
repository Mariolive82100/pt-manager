// Andamento, tabella e dettaglio delle sessioni svolte
import { $, crea } from "../core/ui.js";
import { TIPI } from "../core/calcoli-allenamento.js";
import { disegnaDettaglioEfficienza } from "../core/vista-efficienza.js";

const dataItaliana = (iso) => iso.split("-").reverse().join("/");
const it = (n) => n.toLocaleString("it-IT");
const presente = (v) => v !== null && v !== undefined;

function carico(s) {
  const voci = [];
  if (presente(s.volumeEseguito)) voci.push(it(s.volumeEseguito) + " kg");
  if (presente(s.km)) voci.push(it(s.km) + " km");
  if (!voci.length && presente(s.zonaPct)) voci.push(s.zonaPct + "% in zona");
  return voci.join(" · ") || "–";
}

const voto = (s) => (s.efficienza === null ? "–" : s.efficienza + (s.parziale ? "*" : ""));

function barra(s, scelta, seleziona) {
  const colonna = crea("span", { className: "colonna colonna-" + s.tipo });
  colonna.style.height = Math.max(3, s.efficienza ?? 0) + "%";
  const b = crea("button", { type: "button", className: "barra-sessione" },
    crea("span", { textContent: voto(s) }), colonna,
    crea("small", { textContent: dataItaliana(s.data).slice(0, 5) }));
  b.title = `${s.nome} · ${TIPI[s.tipo]}`;
  b.setAttribute("aria-pressed", String(s.id === scelta));
  b.addEventListener("click", () => seleziona(s.id));
  return b;
}

function dettaglio(s, alElimina) {
  $("dettaglio-titolo").textContent = `Dettaglio · ${dataItaliana(s.data)}`;
  $("dettaglio-nome").textContent = s.nome;
  disegnaDettaglioEfficienza($("dettaglio-efficienza"), s);
  const dati = [["Durata", s.minEffettivi + " min"], ["Kcal", presente(s.kcal) ? it(s.kcal) : "–"]];
  if (presente(s.volumeEseguito)) dati.push(["Volume", `${it(s.volumeEseguito)} / ${it(s.volumePrevisto)} kg`]);
  if (presente(s.zonaPct)) dati.push(["Tempo in zona", s.zonaPct + "%"]);
  if (presente(s.km)) dati.push(["Distanza", it(s.km) + " km"]);
  dati.push(["RPE", presente(s.rpe) ? s.rpe + " / 10" : "–"],
    ["Inserita da", s.origine === "atleta" ? "Atleta" : "Trainer"]);
  $("dettaglio-dati").replaceChildren(...dati.map(([e, v]) => crea("div", { className: "dato" },
    crea("span", { textContent: e }), crea("strong", { textContent: v }))));
  const b = crea("button", { type: "button", className: "btn btn-ghost", textContent: "Elimina sessione" });
  b.addEventListener("click", () => alElimina(s, b));
  $("dettaglio-azioni").replaceChildren(b);
}

// sessioni: dalla più recente alla più vecchia
export function disegnaSessioni(sessioni, alElimina, scelta = sessioni[0]?.id) {
  const vuoto = !sessioni.length;
  $("sessioni-vuoto").hidden = !vuoto;
  $("sessioni-blocco").hidden = vuoto;
  if (vuoto) return;
  const seleziona = (id) => disegnaSessioni(sessioni, alElimina, id);
  $("andamento").replaceChildren(
    ...sessioni.slice(0, 10).reverse().map((s) => barra(s, scelta, seleziona)));

  $("sessioni-righe").replaceChildren(...sessioni.map((s) => {
    const nome = crea("button", { type: "button", className: "link-sessione", textContent: s.nome });
    nome.addEventListener("click", () => {
      seleziona(s.id);
      $("dettaglio").scrollIntoView({ block: "nearest" });
    });
    const riga = crea("tr", {},
      crea("td", { textContent: dataItaliana(s.data) }),
      crea("td", {}, nome, crea("small", { textContent: TIPI[s.tipo] })),
      crea("td", {}, crea("span", { textContent: `${s.minEffettivi} / ${s.minPrevisti} min` }),
        crea("small", { textContent: presente(s.kcal) ? it(s.kcal) + " kcal" : "kcal –" })),
      crea("td", { textContent: carico(s) }),
      crea("td", { textContent: s.rpe ?? "–" }),
      crea("td", { className: "voto", textContent: voto(s) }));
    if (s.id === scelta) riga.className = "riga-scelta";
    return riga;
  }));
  $("nota-parziali").hidden = !sessioni.some((s) => s.parziale);
  dettaglio(sessioni.find((s) => s.id === scelta) || sessioni[0], alElimina);
}
