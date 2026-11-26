// Calcoli sulle misurazioni (nessuna grafica, nessun database)
export const CORPO = ["peso", "vita", "fianchi", "torace", "fcRiposo", "fcMax"];
export const MASSIMALI = [
  ["squat", "Squat"], ["panca", "Panca piana"],
  ["stacco", "Stacco"], ["military", "Military press"]
];

const presente = (v) => v !== null && v !== undefined && v !== "";

export function bmi(pesoKg, altezzaCm) {
  return pesoKg && altezzaCm ? (pesoKg / (altezzaCm / 100) ** 2).toFixed(1) : null;
}

// Dalla più recente alla più vecchia (le date sono "AAAA-MM-GG")
export const ordina = (misure) => [...misure].sort((a, b) => b.data.localeCompare(a.data));

// Valori da mostrare nel profilo. Per ogni voce vale il dato più recente.
// daMisure elenca le voci che le rilevazioni hanno già sostituito: se non ne
// resta nessuna, tornano vuote. Le altre mantengono il valore iniziale.
// troncata = esistono rilevazioni più vecchie non lette: non si svuota nulla.
export function valoriCorrenti(misure, atleta, troncata = false) {
  const lista = ordina(misure);
  const daMisure = new Set(atleta.daMisure || []);
  const scegli = (chiave, attuale) => {
    const trovata = lista.find((m) => presente(m[chiave]));
    if (trovata) { daMisure.add(chiave); return trovata[chiave]; }
    if (daMisure.has(chiave) && !troncata) return null;
    return attuale ?? null;
  };
  const valori = Object.fromEntries(CORPO.map((c) => [c, scegli(c, atleta[c])]));
  valori.massimali = Object.fromEntries(
    MASSIMALI.map(([c]) => [c, scegli(c, atleta.massimali?.[c])]));
  valori.daMisure = [...daMisure];
  return valori;
}

// Stessa data di alcuni mesi prima (31 maggio - 3 mesi = 28/29 febbraio)
export function mesiPrima(iso, mesi) {
  const [a, m, g] = iso.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m - mesi, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 - mesi, Math.min(g, ultimo))).toISOString().slice(0, 10);
}

// Confronta il dato più recente con l'ultimo di almeno 3 mesi prima,
// oppure con il più vecchio disponibile. null = nessun confronto possibile
export function variazione(misure, chiave) {
  const [ultima, ...precedenti] = ordina(misure).filter((m) => presente(m[chiave]));
  if (!precedenti.length) return null;
  const soglia = mesiPrima(ultima.data, 3);
  const base = precedenti.find((m) => m.data <= soglia) || precedenti[precedenti.length - 1];
  return { differenza: Math.round((ultima[chiave] - base[chiave]) * 10) / 10, dal: base.data };
}
