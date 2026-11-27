// Allenamento svolto dall'atleta: calcoli e dati da inviare (nessuna grafica)
import {
  efficienza, isoLocale, ripetizioni, aTempo, roundATempo, completamentoPerEsercizio
} from "./calcoli-allenamento.js";

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

// Codice breve che cambia se il trainer modifica la scheda.
// Elenco esplicito dei campi: il database non conserva il loro ordine
export function impronta(s) {
  const testo = JSON.stringify([s.tipo, s.minForza, s.minCardio, s.volumeKg,
    // I campi "a tempo" si aggiungono solo se presenti: le altre schede non cambiano codice
    s.elementi.map((e) => [e.k, e.nome, e.serie, e.rip, e.kg, e.recupero, e.minuti, e.zona,
      ...(aTempo(e) ? [e.modo, e.lavoro] : [])])]);
  let h = 5381;
  for (const c of testo) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

// Contiene solo inizio, serie, ripetizioni, carichi e blocchi spuntati
export function nuovaBozza(uid, atletaId, scheda, adesso = Date.now()) {
  return {
    uid, atletaId, schedaId: scheda.id, impronta: impronta(scheda), inizio: adesso,
    stato: scheda.elementi.map((e) => (e.k === "forza"
      // A tempo le ripetizioni partono vuote: si scrivono solo quelle contate davvero
      ? { serie: Array.from({ length: e.serie },
        () => ({ rip: aTempo(e) ? null : e.rip, kg: e.kg, fatta: false })) }
      : { fatto: false }))
  };
}

export const bozzaValida = (bozza, scheda) =>
  bozza.schedaId === scheda.id && bozza.impronta === impronta(scheda) &&
  Array.isArray(bozza.stato) && bozza.stato.length === scheda.elementi.length;

// Serie registrate per gli esercizi a tempo (true) o a ripetizioni (false)
const serieDi = (scheda, bozza, tempo) => bozza.stato.flatMap((e, i) =>
  (aTempo(scheda.elementi[i]) === tempo ? e.serie || [] : [])).filter((s) => s.fatta);

export const volumeEseguito = (scheda, bozza) => Math.round(
  serieDi(scheda, bozza, false).reduce((t, s) => t + num(s.rip) * num(s.kg), 0));

export const ripetizioniEseguite = (scheda, bozza) =>
  serieDi(scheda, bozza, false).reduce((t, s) => t + num(s.rip), 0);

export const roundEseguiti = (scheda, bozza) => serieDi(scheda, bozza, true).length;

// Cosa non risulta spuntato, per avvisare prima dell'invio
export function nonSpuntati(bozza) {
  const serie = bozza.stato.flatMap((e) => e.serie || []).filter((s) => !s.fatta).length;
  const blocchi = bozza.stato.filter((e) => e.fatto === false).length;
  return { serie, blocchi };
}

export const minutiTrascorsi = (inizio, fine) =>
  Math.max(1, Math.round((fine - inizio) / 60000));

const presente = (v) => v !== null && v !== undefined;

// valori: numeri inseriti a fine allenamento (null = campo vuoto)
export function problemaInvio(scheda, valori) {
  const v = valori;
  if (!(v.minEffettivi >= 1 && v.minEffettivi <= 1000)) return "Controlla la durata in minuti.";
  if (scheda.tipo !== "forza") {
    if (!presente(v.cardioMin) || !presente(v.zonaMin)) {
      return "Indica i minuti di cardio svolti e i minuti in zona (anche 0).";
    }
    if (v.cardioMin < 0 || v.zonaMin < 0) return "I minuti non possono essere negativi.";
    if (v.cardioMin > v.minEffettivi) return "I minuti di cardio superano la durata totale.";
    if (v.zonaMin > v.cardioMin) return "I minuti in zona non possono superare quelli di cardio.";
  }
  if ([v.kcal, v.km].some((x) => presente(x) && x < 0)) return "Kcal e km non possono essere negativi.";
  if (v.kcal > 10000 || v.km > 1000) return "Controlla kcal e km.";
  if (!presente(v.rpe)) return "Seleziona quanto è stato faticoso (RPE).";
  return "";
}

export function componiSessione(scheda, bozza, valori) {
  const forza = scheda.tipo !== "cardio";
  const cardio = scheda.tipo !== "forza";
  const round = forza ? roundATempo(scheda.elementi) : 0;
  const dati = {
    data: isoLocale(new Date(bozza.inizio)), nome: scheda.nome, tipo: scheda.tipo,
    origine: "atleta", schedaId: scheda.id,
    minForza: scheda.minForza || 0, minCardio: scheda.minCardio || 0,
    minPrevisti: scheda.durataMin, minEffettivi: valori.minEffettivi,
    kcal: valori.kcal ?? null,
    volumePrevisto: forza ? scheda.volumeKg : null,
    volumeEseguito: forza ? volumeEseguito(scheda, bozza) : null,
    ripPreviste: forza ? ripetizioni(scheda.elementi) : null,
    ripEseguite: forza ? ripetizioniEseguite(scheda, bozza) : null,
    ...(round ? {
      roundPrevisti: round, roundEseguiti: roundEseguiti(scheda, bozza),
      compForza: completamentoPerEsercizio(scheda.elementi, bozza.stato.map((e) => e.serie))
    } : {}),
    regolaCardio: cardio ? 2 : null,
    cardioMin: cardio ? valori.cardioMin ?? null : null,
    zonaMin: cardio ? valori.zonaMin ?? null : null,
    zonaPct: !cardio || !presente(valori.cardioMin) || !presente(valori.zonaMin) ? null
      : valori.cardioMin > 0 ? Math.min(100, Math.round((100 * valori.zonaMin) / valori.cardioMin)) : 0,
    km: cardio ? valori.km ?? null : null,
    rpe: valori.rpe ?? null,
    dettaglio: scheda.elementi.map((e, i) => (e.k === "forza"
      ? {
        k: e.k, nome: e.nome, ...(aTempo(e) ? { modo: e.modo, lavoro: e.lavoro } : {}),
        serie: bozza.stato[i].serie.map((s) => ({ rip: num(s.rip), kg: num(s.kg), fatta: s.fatta }))
      }
      : { k: e.k, nome: e.nome, fatto: bozza.stato[i].fatto }))
  };
  const esito = efficienza(dati);
  return { ...dati, efficienza: esito.punteggio, parziale: esito.parziale };
}
