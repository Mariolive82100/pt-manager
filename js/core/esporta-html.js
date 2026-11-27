// Versione leggibile dell'esportazione (stampabile anche in PDF).
// Mostra tutti i campi ricevuti: quelli senza etichetta usano il nome interno
const ETICHETTE = {
  codice: "Codice", codiceAtleta: "Codice atleta", esportatoIl: "Esportato il",
  nome: "Nome", dataNascita: "Data di nascita", sesso: "Sesso", obiettivo: "Obiettivo",
  inizioAllenamento: "Inizio allenamento", email: "Email", altezzaCm: "Altezza (cm)",
  cooperM: "Test di Cooper (m)", fcRiposo: "FC riposo (bpm)", fcMax: "FC max (bpm)",
  peso: "Peso (kg)", vita: "Vita (cm)", fianchi: "Fianchi (cm)", torace: "Torace (cm)",
  massimali: "Massimali 1RM (kg)", squat: "Squat", panca: "Panca piana", stacco: "Stacco",
  military: "Military press", livelloTrainer: "Livello assegnato dal trainer (0-3)",
  consensoScritto: "Data del consenso scritto", riepilogo: "Riepilogo efficienza",
  creatoIl: "Creato il", aggiornatoIl: "Aggiornato il", accettato: "Accettato",
  versione: "Versione dell'informativa", data: "Data", tipo: "Tipo", titolo: "Titolo",
  dettagli: "Dettagli", stato: "Stato", elementi: "Esercizi e blocchi", dettaglio: "Dettaglio svolto",
  modo: "Modalità", lavoro: "Lavoro per round (s)", roundPrevisti: "Round a tempo previsti",
  roundEseguiti: "Round a tempo svolti", compForza: "Completamento forza (0-1)",
  k: "Parte", rm: "Massimale collegato", serie: "Serie", rip: "Ripetizioni", kg: "Carico (kg)",
  pct: "% del massimale", recupero: "Recupero (s)", minuti: "Minuti", zona: "Zona FC",
  fatta: "Serie svolta", fatto: "Blocco svolto", note: "Note", origine: "Inserita da",
  schedaId: "Codice scheda", minForza: "Minuti previsti forza", minCardio: "Minuti previsti cardio",
  minPrevisti: "Minuti previsti", minEffettivi: "Minuti effettivi", durataMin: "Durata prevista (min)",
  durataCorretta: "Durata corretta a mano", volumeKg: "Volume previsto (kg)",
  volumePrevisto: "Volume previsto (kg)", volumeEseguito: "Volume eseguito (kg)",
  ripPreviste: "Ripetizioni previste", ripEseguite: "Ripetizioni eseguite",
  cardioMin: "Minuti cardio svolti", zonaMin: "Minuti in zona", zonaPct: "Tempo in zona (%)",
  regolaCardio: "Regola di calcolo cardio", kcal: "Kcal", km: "Km", rpe: "Fatica (RPE)",
  efficienza: "Efficienza", parziale: "Efficienza parziale", forza: "Forza", cardio: "Cardio",
  ruolo: "Ruolo", atletaId: "Codice atleta", trainerUid: "Codice trainer", id: "Codice", uid: "Codice"
};

const SEZIONI = [
  ["anagrafica", "Anagrafica e valori attuali"], ["consensoNellApp", "Consenso dato nell'app"],
  ["noteSanitarie", "Note sanitarie"], ["misurazioni", "Misurazioni"],
  ["schede", "Schede di allenamento"], ["sessioni", "Sessioni svolte"],
  ["inviti", "Inviti"], ["accessi", "Account di accesso collegati"]
];

export const pulisci = (testo) => String(testo).replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const vuoto = (v) => v === null || v === undefined || v === "" ||
  (Array.isArray(v) && !v.length);

function valore(v) {
  if (vuoto(v)) return "–";
  if (typeof v === "boolean") return v ? "Sì" : "No";
  if (Array.isArray(v)) return v.map((x) => `<div class="voce">${valore(x)}</div>`).join("");
  if (typeof v === "object") return tabella(v);
  return pulisci(v);
}

const tabella = (oggetto) => "<table>" + Object.entries(oggetto)
  .map(([k, v]) => `<tr><th>${pulisci(ETICHETTE[k] || k)}</th><td>${valore(v)}</td></tr>`)
  .join("") + "</table>";

const STILE = "body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#1d1f20}" +
  "table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 8px;" +
  "text-align:left;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}" +
  "th{width:220px;font-weight:600}.voce{margin-bottom:10px}img{width:180px}h2{margin-top:28px}";

export function componiHtml(dati) {
  const nome = pulisci(dati.anagrafica.nome);
  const foto = typeof dati.foto === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dati.foto)
    ? `<h2>Foto</h2><img src="${dati.foto}" alt="Foto">` : "<h2>Foto</h2><p>–</p>";
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<title>Dati di ${nome}</title><style>${STILE}</style></head><body>
<h1>P.T. Manager · Dati di ${nome}</h1>
<p><strong>Documento riservato: contiene dati sulla salute.</strong> Esportato il ${pulisci(dati.esportatoIl)}. Codice atleta: ${pulisci(dati.codiceAtleta)}.</p>
${foto}
${SEZIONI.map(([k, titolo]) => `<h2>${titolo}</h2>${valore(dati[k])}`).join("\n")}
</body></html>
`;
}

// "dati-mario-rossi-2026-11-26"
export function nomeFile(nome, data) {
  const base = String(nome).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `dati-${base || "atleta"}-${data.slice(0, 10)}`;
}
