// Copia temporanea dell'allenamento in corso, per non perderlo se l'app si chiude.
// Solo inizio, serie, ripetizioni, carichi e blocchi spuntati:
// niente note sanitarie, misure, kcal o RPE
const CHIAVE = "ptm-allenamento";

export function leggiBozza() {
  try { return JSON.parse(localStorage.getItem(CHIAVE)); } catch { return null; }
}

// false = il telefono non permette di salvare
export function salvaBozza(bozza) {
  try { localStorage.setItem(CHIAVE, JSON.stringify(bozza)); return true; } catch { return false; }
}

export function cancellaBozza() {
  try { localStorage.removeItem(CHIAVE); } catch { /* niente da cancellare */ }
}
