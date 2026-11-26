// Calcoli sull'atleta: età, anzianità e livello (nessuna grafica)
export const LIVELLI = ["Principiante", "Intermedio", "Avanzato", "Pro"];

// dataNascita nel formato "AAAA-MM-GG"
export function eta(dataNascita, oggi = new Date()) {
  if (!dataNascita) return null;
  const [a, m, g] = dataNascita.split("-").map(Number);
  let anni = oggi.getFullYear() - a;
  const mese = oggi.getMonth() + 1;
  if (mese < m || (mese === m && oggi.getDate() < g)) anni--;
  return anni;
}

// inizio nel formato "AAAA-MM": restituisce gli anni, anche con decimali
export function anniAllenamento(inizio, oggi = new Date()) {
  if (!inizio) return null;
  const [a, m] = inizio.split("-").map(Number);
  const mesi = (oggi.getFullYear() - a) * 12 + (oggi.getMonth() + 1 - m);
  return Math.max(0, mesi) / 12;
}

// Posizione nella scala: quante soglie sono state raggiunte (0-3)
const fascia = (valore, soglie) => soglie.filter((s) => valore >= s).length;

export const livelloCooper = (metri) =>
  metri ? fascia(metri, [2000, 2400, 2800]) : null;

export const livelloAnzianita = (anni) =>
  anni === null ? null : fascia(anni, [1, 3, 6]);

// Media dei due livelli, arrotondata per difetto. null = dati mancanti
export function livelloCalcolato(atleta) {
  const c = livelloCooper(atleta.cooperM);
  const y = livelloAnzianita(anniAllenamento(atleta.inizioAllenamento));
  return c === null || y === null ? null : Math.floor((c + y) / 2);
}

// Il livello assegnato dal trainer prevale su quello calcolato
export const livelloEffettivo = (atleta) =>
  atleta.livelloTrainer ?? livelloCalcolato(atleta);

export const nomeLivello = (n) => (n === null ? "Da definire" : LIVELLI[n]);
