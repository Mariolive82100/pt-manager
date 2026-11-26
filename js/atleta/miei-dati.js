// I miei dati: note sanitarie e misurazioni in sola lettura
import { $, crea } from "../core/ui.js";
import { elencaNote } from "../core/db-salute.js";
import { elencaMisure } from "../core/db-misure.js";
import { CORPO, MASSIMALI, bmi } from "../core/calcoli-misure.js";
import { dataItaliana } from "./oggi.js";

const GRUPPI = [["trauma", "Traumi"], ["intervento", "Interventi"], ["patologia", "Patologie"]];
const ETICHETTE = {
  peso: ["Peso", "kg"], vita: ["Vita", "cm"], fianchi: ["Fianchi", "cm"],
  torace: ["Torace", "cm"], fcRiposo: ["FC riposo", "bpm"], fcMax: ["FC max", "bpm"]
};
let richiesta = 0;

const testo = (t, classe = "muted") => crea("span", { className: classe, textContent: t });
const valore = (v, unita) => (v ? `${v.toLocaleString("it-IT")} ${unita}` : "–");
const dato = (e, v) => crea("div", { className: "dato" },
  crea("span", { textContent: e }), crea("strong", { textContent: v }));

function disegnaValori(a) {
  const m = a.massimali || {};
  $("miei-valori").replaceChildren(
    dato("Altezza", valore(a.altezzaCm, "cm")),
    ...CORPO.map((c) => dato(ETICHETTE[c][0], valore(a[c], ETICHETTE[c][1]))),
    dato("BMI", bmi(a.peso, a.altezzaCm)?.replace(".", ",") ?? "–"),
    ...MASSIMALI.map(([c, n]) => dato("1RM " + n, valore(m[c], "kg"))));
}

function storicoMisura(m) {
  const voci = [
    ...CORPO.filter((c) => m[c]).map((c) => `${ETICHETTE[c][0]} ${valore(m[c], ETICHETTE[c][1])}`),
    ...MASSIMALI.filter(([c]) => m[c]).map(([c, n]) => `${n} ${valore(m[c], "kg")}`)];
  return crea("li", { className: "voce-scheda" },
    crea("strong", { textContent: dataItaliana(m.data) }),
    crea("span", { textContent: voci.join(" · ") }));
}

async function sezione(id, mia, leggi, disegna, errore) {
  $(id).replaceChildren(testo("Caricamento…"));
  try {
    const dati = await leggi();
    if (mia === richiesta) $(id).replaceChildren(...disegna(dati));
  } catch (e) {
    console.error(e);
    if (mia === richiesta) $(id).replaceChildren(testo(errore, "avviso avviso-errore"));
  }
}

export function mostraMieiDati(atleta) {
  const mia = ++richiesta;
  disegnaValori(atleta);
  sezione("mie-note", mia, () => elencaNote(atleta.id), (note) => {
    if (!note.length) return [testo("Nessuna segnalazione registrata.")];
    return GRUPPI.flatMap(([tipo, titolo]) => {
      const voci = note.filter((n) => n.tipo === tipo);
      return voci.length ? [crea("h4", { textContent: titolo }),
        ...voci.map((n) => crea("div", { className: "voce-scheda" },
          crea("strong", { textContent: n.titolo }),
          testo(n.dettagli || "")))] : [];
    });
  }, "Impossibile leggere le note sanitarie. Non significa che non ce ne siano.");
  sezione("mie-misure", mia, () => elencaMisure(atleta.id), (lista) => (lista.length
    ? [crea("ul", { className: "voci-scheda" }, ...lista.map(storicoMisura))]
    : [testo("Nessuna rilevazione.")]),
  "Impossibile leggere le misurazioni.");
}
