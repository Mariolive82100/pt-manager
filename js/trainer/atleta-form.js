// Creazione e modifica di un atleta
import { $ } from "../core/ui.js";
import { livelloCalcolato, nomeLivello } from "../core/calcoli.js";

const NUMERI = ["altezzaCm", "cooperM", "fcRiposo", "fcMax"];
const MASSIMALI = ["squat", "panca", "stacco", "military"];
const TESTI = ["nome", "dataNascita", "sesso", "obiettivo", "inizioAllenamento", "email"];

const campo = (nome) => $("form-atleta").elements.namedItem(nome);
const numero = (nome) => (campo(nome).value === "" ? null : Number(campo(nome).value));

// Legge il modulo e restituisce i dati pronti da salvare
function leggi() {
  const dati = {};
  TESTI.forEach((n) => { dati[n] = campo(n).value.trim(); });
  dati.email = dati.email.toLowerCase();
  NUMERI.forEach((n) => { dati[n] = numero(n); });
  dati.massimali = Object.fromEntries(MASSIMALI.map((n) => [n, numero(n)]));
  dati.livelloTrainer = numero("livelloTrainer");
  // In modifica questi valori si aggiornano solo dalla scheda Misurazioni
  if ($("valori-iniziali").disabled) {
    delete dati.fcRiposo;
    delete dati.fcMax;
    delete dati.massimali;
  }
  return dati;
}

function aggiornaAnteprima() {
  $("anteprima-livello").textContent =
    "Livello calcolato: " + nomeLivello(livelloCalcolato(leggi()));
}

export function compilaForm(atleta) {
  const form = $("form-atleta");
  form.reset();
  $("valori-iniziali").hidden = $("valori-iniziali").disabled = !!atleta;
  $("titolo-form").textContent = atleta ? "Modifica atleta" : "Nuovo atleta";
  if (atleta) {
    [...TESTI, ...NUMERI, "livelloTrainer"].forEach((n) => { campo(n).value = atleta[n] ?? ""; });
    MASSIMALI.forEach((n) => { campo(n).value = atleta.massimali?.[n] ?? ""; });
  }
  // Non si possono scegliere date future
  const oggi = new Date();
  const locale = new Date(oggi - oggi.getTimezoneOffset() * 60000).toISOString();
  campo("dataNascita").max = locale.slice(0, 10);
  campo("inizioAllenamento").max = locale.slice(0, 7);
  aggiornaAnteprima();
}

export function avviaForm({ alSalva, alAnnulla }) {
  const form = $("form-atleta");
  form.addEventListener("input", aggiornaAnteprima);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const dati = leggi();
    // "required" non blocca un nome fatto di soli spazi
    if (!dati.nome) { campo("nome").value = ""; form.reportValidity(); return; }
    alSalva(dati);
  });
  $("btn-annulla").addEventListener("click", alAnnulla);
}
