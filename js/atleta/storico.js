// Storico delle proprie sessioni
import { $, crea } from "../core/ui.js";
import { TIPI } from "../core/calcoli-allenamento.js";
import { elencaSessioni } from "../core/db-allenamenti.js";
import { disegnaDettaglioEfficienza } from "../core/vista-efficienza.js";
import { elencoSvolto } from "../core/vista-scheda.js";
import { dataItaliana } from "./oggi.js";

let richiesta = 0;

function carta(s) {
  const dentro = crea("div", { className: "efficienza" });
  const voto = s.efficienza === null ? "–" : s.efficienza + (s.parziale ? "*" : "");
  const dettaglio = crea("details", { className: "card" },
    crea("summary", {},
      crea("span", {}, crea("strong", { textContent: s.nome }),
        crea("small", { textContent: `${dataItaliana(s.data)} · ${TIPI[s.tipo]}` })),
      crea("span", { className: "voto-atleta", textContent: voto })),
    dentro);
  dettaglio.addEventListener("toggle", () => {
    if (!dettaglio.open || dentro.childElementCount) return;
    const punteggio = crea("div", { className: "efficienza" });
    disegnaDettaglioEfficienza(punteggio, s);
    dentro.append(punteggio,
      ...(s.dettaglio ? [elencoSvolto(s.dettaglio)] : []));
  });
  return dettaglio;
}

export async function mostraStorico(atletaId) {
  const mia = ++richiesta;
  const testo = (t, classe = "muted") => crea("p", { className: classe, textContent: t });
  $("storico-elenco").replaceChildren(testo("Caricamento…"));
  try {
    const sessioni = await elencaSessioni(atletaId);
    if (mia !== richiesta) return;
    $("storico-elenco").replaceChildren(...(sessioni.length
      ? [...sessioni.map(carta), ...(sessioni.some((s) => s.parziale)
        ? [testo("* efficienza parziale, calcolata senza kcal.")] : [])]
      : [testo("Nessuna sessione registrata.")]));
  } catch (e) {
    console.error(e);
    if (mia !== richiesta) return;
    $("storico-elenco").replaceChildren(testo(
      "Impossibile leggere lo storico. Tocca di nuovo Storico per riprovare.", "avviso avviso-errore"));
  }
}
