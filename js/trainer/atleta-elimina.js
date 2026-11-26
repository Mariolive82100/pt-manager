// Finestra di conferma per eliminare un atleta
import { $, avviso } from "../core/ui.js";
import { eliminaAtleta } from "../core/db-atleti.js";

let atleta = null;
let inCorso = false;

const pulito = (testo) => testo.trim().replace(/\s+/g, " ").toLowerCase();
const confermato = () =>
  !!atleta && pulito($("elimina-conferma").value) === pulito(atleta.nome);

function errore(testo) {
  $("elimina-errore").textContent = testo;
  $("elimina-errore").hidden = !testo;
}

function blocca(valore) {
  inCorso = valore;
  $("elimina-conferma").disabled = valore;
  $("btn-elimina-annulla").disabled = valore;
  $("btn-elimina-conferma").disabled = valore || !confermato();
  $("btn-elimina-conferma").textContent = valore ? "Elimino…" : "Elimina definitivamente";
}

export function chiediElimina(scelto) {
  atleta = scelto;
  $("elimina-nome").textContent = atleta.nome;
  $("elimina-conferma").value = "";
  errore("");
  avviso("");
  blocca(false);
  $("dialogo-elimina").showModal();
}

export function avviaElimina({ alEliminato, testoErrore }) {
  const dialogo = $("dialogo-elimina");
  $("elimina-conferma").addEventListener("input", () => {
    $("btn-elimina-conferma").disabled = !confermato();
  });
  $("btn-elimina-annulla").addEventListener("click", () => dialogo.close());
  // Il tasto Esc non deve chiudere la finestra durante la cancellazione
  dialogo.addEventListener("cancel", (ev) => { if (inCorso) ev.preventDefault(); });

  $("form-elimina").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (inCorso || !confermato()) return;
    errore("");
    blocca(true);
    try {
      await eliminaAtleta(atleta.id);
      dialogo.close();
      alEliminato(atleta.id);
    } catch (e) {
      console.error(e);
      errore(testoErrore(e) + " La cancellazione potrebbe essere parziale: riprova.");
    } finally {
      blocca(false);
    }
  });
}
