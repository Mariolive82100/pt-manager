// Pulsante "Esporta dati": prepara i due file e li offre da scaricare
import { $ } from "../core/ui.js";
import { raccogliDati } from "../core/db-esporta.js";
import { componiHtml, nomeFile } from "../core/esporta-html.js";
import { isoLocale } from "../core/calcoli-allenamento.js";

let atleta = null;
let indirizzi = [];
let richiesta = 0;

// Toglie dalla memoria i file preparati (contengono dati personali)
export function azzeraEsporta(scelto = null) {
  atleta = scelto;
  richiesta += 1;
  indirizzi.forEach((u) => URL.revokeObjectURL(u));
  indirizzi = [];
  ["esporta-html", "esporta-json"].forEach((id) => $(id).removeAttribute("href"));
  $("esporta-file").hidden = true;
  $("esporta-stato").textContent = "";
  $("esporta-stato").className = "muted";
  $("btn-esporta").disabled = false;
}

function collega(id, contenuto, tipo, file) {
  const url = URL.createObjectURL(new Blob([contenuto], { type: tipo }));
  indirizzi.push(url);
  $(id).href = url;
  $(id).download = file;
}

export function avviaEsporta({ testoErrore }) {
  $("btn-esporta").addEventListener("click", async () => {
    const scelto = atleta;
    azzeraEsporta(scelto);
    const mia = richiesta;
    $("btn-esporta").disabled = true;
    $("esporta-stato").textContent = "Raccolta dei dati…";
    try {
      const dati = await raccogliDati(scelto.id);
      if (mia !== richiesta) return;
      const base = nomeFile(dati.anagrafica.nome, isoLocale());
      collega("esporta-html", componiHtml(dati), "text/html", base + ".html");
      collega("esporta-json", JSON.stringify(dati, null, 2), "application/json", base + ".json");
      $("esporta-file").hidden = false;
      $("esporta-stato").textContent =
        "File pronti. Contengono dati personali: consegnali in modo sicuro e poi cancellali da questo computer (anche dal cestino).";
      $("esporta-stato").className = "avviso";
    } catch (e) {
      console.error(e);
      if (mia !== richiesta) return;
      $("esporta-stato").textContent = "Esportazione non riuscita: serve la connessione. " + testoErrore(e);
      $("esporta-stato").className = "avviso avviso-errore";
    } finally {
      if (mia === richiesta) $("btn-esporta").disabled = false;
    }
  });
}
