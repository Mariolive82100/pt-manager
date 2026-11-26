// Scheda di oggi, altre schede da completare e anteprima prima di iniziare
import { $, crea } from "../core/ui.js";
import { TIPI, isoLocale } from "../core/calcoli-allenamento.js";
import { elencaDaFare } from "../core/db-atleta.js";
import { bozzaValida } from "../core/sessione-atleta.js";
import { elencoPrevisto } from "../core/vista-scheda.js";
import { leggiBozza, cancellaBozza } from "./bozza-locale.js";

let atleta = null;
let richiesta = 0;
let alInizio = () => {};

export const dataItaliana = (iso) => iso.split("-").reverse().join("/");

function intestazione(s) {
  return `${dataItaliana(s.data)} · ${TIPI[s.tipo]} · ${s.durataMin} min previsti`;
}

function carta(s, diOggi) {
  const bozza = leggiBozza();
  const inCorso = bozza?.schedaId === s.id;
  const apri = crea("button", {
    type: "button", className: "btn btn-block" + (diOggi || inCorso ? " btn-primary" : ""),
    textContent: inCorso ? "Riprendi allenamento" : "Inizia allenamento"
  });
  // Un solo allenamento alla volta
  apri.disabled = Boolean(bozza) && !inCorso;
  apri.addEventListener("click", () => alInizio(s));
  const corpo = [
    s.note ? crea("p", { className: "avviso note-trainer", textContent: "Note del trainer: " + s.note }) : null,
    elencoPrevisto(s.elementi, atleta.fcMax)
  ].filter(Boolean);
  return crea("article", { className: "card" },
    crea("span", { className: "kicker", textContent: diOggi ? "Scheda di oggi" : "Da completare" }),
    crea("h3", { textContent: s.nome }),
    crea("span", { className: "muted", textContent: intestazione(s) }),
    ...(diOggi ? corpo : [crea("details", {},
      crea("summary", { textContent: "Vedi il contenuto" }), ...corpo)]),
    apri);
}

export async function mostraOggi(scelto = atleta) {
  atleta = scelto;
  const mia = ++richiesta;
  $("oggi-elenco").replaceChildren(crea("p", { className: "muted", textContent: "Caricamento…" }));
  try {
    const schede = await elencaDaFare(atleta.id);
    if (mia !== richiesta) return;

    // Copia temporanea non più utilizzabile: scheda ritirata o modificata
    const bozza = leggiBozza();
    const collegata = bozza && schede.find((s) => s.id === bozza.schedaId);
    let scartata = false;
    if (bozza && (!collegata || !bozzaValida(bozza, collegata))) {
      cancellaBozza();
      scartata = true;
    }

    const oggi = isoLocale();
    const diOggi = schede.filter((s) => s.data === oggi);
    const altre = schede.filter((s) => s.data !== oggi);
    const voci = [];
    if (scartata) voci.push(crea("p", { className: "avviso", textContent:
      "L'allenamento in corso è stato annullato perché la scheda è stata modificata, ritirata o già completata." }));
    if (!diOggi.length) voci.push(crea("p", { className: "muted", textContent:
      schede.length ? "Per oggi non c'è una scheda." : "Non hai schede da completare." }));
    voci.push(...diOggi.map((s) => carta(s, true)), ...altre.map((s) => carta(s, false)));
    $("oggi-elenco").replaceChildren(...voci);
  } catch (e) {
    console.error(e);
    if (mia !== richiesta) return;
    const riprova = crea("button", { type: "button", className: "btn", textContent: "Riprova" });
    riprova.addEventListener("click", () => mostraOggi());
    $("oggi-elenco").replaceChildren(crea("p", { className: "avviso avviso-errore",
      textContent: "Impossibile leggere le schede. Controlla la connessione." }), riprova);
  }
}

export function avviaOggi(funzione) {
  alInizio = funzione;
}
