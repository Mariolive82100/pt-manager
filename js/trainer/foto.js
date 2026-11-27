// Foto tessera nel profilo: caricamento, sostituzione e rimozione
import { $, crea, avviso } from "../core/ui.js";
import { leggiFoto, salvaFoto, eliminaFoto } from "../core/db-foto.js";
import { riduciFoto } from "../core/riduci-foto.js";
import { FOTO_ATLETI } from "../core/funzioni.js";

const lette = new Map(); // solo in memoria: evita di rileggere la stessa foto
let atleta = null;
let occupato = false;
let alErrore = (e) => String(e);

function disegna(stato) {
  const dati = lette.get(atleta.id) || null;
  const valida = typeof dati === "string" && dati.startsWith("data:image/jpeg;base64,");
  const riquadro = $("p-iniziali");
  riquadro.classList.toggle("con-foto", valida);
  if (valida) {
    riquadro.replaceChildren(crea("img", { src: dati, alt: "Foto di " + atleta.nome }));
  } else {
    riquadro.textContent = riquadro.dataset.iniziali;
  }
  const pronta = lette.has(atleta.id);
  $("btn-foto").textContent = valida ? "Cambia foto" : "Carica foto";
  $("btn-foto").disabled = occupato || !pronta;
  $("btn-foto").hidden = !FOTO_ATLETI;
  $("btn-foto-togli").hidden = !dati;
  $("btn-foto-togli").disabled = occupato;
  $("foto-stato").textContent = stato ?? "";
}

export async function mostraFoto(scelto, iniziali) {
  atleta = scelto;
  $("p-iniziali").dataset.iniziali = iniziali;
  const id = scelto.id;
  disegna(lette.has(id) ? "" : "Lettura…");
  if (lette.has(id)) return;
  try {
    const dati = await leggiFoto(id);
    lette.set(id, dati);
    if (atleta.id === id) disegna();
  } catch (e) {
    console.error(e);
    if (atleta.id === id) disegna("Foto non leggibile. Riapri il profilo per riprovare.");
  }
}

export const dimenticaFoto = (id) => lette.delete(id);

async function esegui(attesa, azione) {
  const destinatario = atleta;
  occupato = true;
  avviso("");
  disegna(attesa);
  try {
    await azione(destinatario.id);
  } catch (e) {
    console.error(e);
    avviso(alErrore(e), true);
  } finally {
    occupato = false;
    disegna();
  }
}

export function avviaFoto({ testoErrore }) {
  alErrore = testoErrore;
  let perChi = null; // atleta per cui è stata aperta la scelta del file
  if (FOTO_ATLETI) $("btn-foto").addEventListener("click", () => {
    perChi = atleta.id;
    $("foto-file").value = "";
    $("foto-file").click();
  });
  if (FOTO_ATLETI) $("foto-file").addEventListener("change", () => {
    const file = $("foto-file").files[0];
    if (!file || perChi !== atleta.id) return;
    esegui("Salvataggio…", async (id) => {
      const dati = await riduciFoto(file);
      await salvaFoto(id, dati);
      lette.set(id, dati);
    });
  });
  $("btn-foto-togli").addEventListener("click", () => {
    if (!confirm(`Eliminare la foto di ${atleta.nome}?`)) return;
    esegui("Elimino…", async (id) => {
      await eliminaFoto(id);
      lette.set(id, null);
    });
  });
}
