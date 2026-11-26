// Calcoli sugli allenamenti (nessuna grafica, nessun database)
export const TIPI = { forza: "Forza", cardio: "Cardio", misto: "Misto" };
export const ZONE = [[50, 60], [60, 70], [70, 80], [80, 90], [90, 100]];
const SECONDI_SERIE = 40;
const KCAL_MIN_ZONA = [6, 8, 10, 12, 14]; // stima indicativa per 75 kg
const KCAL_MIN_FORZA = 6;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const somma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);
const al1 = (v) => Math.min(1, Math.max(0, v));
const diTipo = (elementi, k) => elementi.filter((e) => e.k === k);

export const volume = (elementi) => Math.round(somma(
  diTipo(elementi, "forza"), (e) => num(e.serie) * num(e.rip) * num(e.kg)));

export const ripetizioni = (elementi) =>
  somma(diTipo(elementi, "forza"), (e) => num(e.serie) * num(e.rip));

export const serieTotali = (elementi) =>
  somma(diTipo(elementi, "forza"), (e) => num(e.serie));

// Durata di un elemento in minuti. Forza: 40 secondi per serie più recupero
export const minutiElemento = (e) => (e.k === "forza"
  ? (num(e.serie) * (SECONDI_SERIE + num(e.recupero))) / 60
  : num(e.rip) * num(e.minuti));

// Stima in minuti interi di una parte ("forza" o "cardio")
export function stimaMinuti(elementi, k) {
  const totale = somma(diTipo(elementi, k), minutiElemento);
  return totale > 0 ? Math.max(1, Math.round(totale)) : 0;
}

// Kcal indicative, solo se si conosce il peso
export function stimaKcal(elementi, minutiForza, peso) {
  if (!peso) return null;
  const cardio = somma(diTipo(elementi, "cardio"),
    (e) => minutiElemento(e) * (KCAL_MIN_ZONA[num(e.zona) - 1] || 0));
  return Math.round(((num(minutiForza) * KCAL_MIN_FORZA + cardio) * peso) / 75);
}

export function testoZona(zona, fcMax) {
  const z = ZONE[zona - 1];
  if (!z) return "–";
  if (!fcMax) return `${z[0]}–${z[1]}% FC max`;
  const bpm = z.map((p) => Math.round((fcMax * p) / 100));
  return `${bpm[0]}–${bpm[1]} bpm (${z[0]}–${z[1]}%)`;
}

export const arrotondaCarico = (kg) => Math.round(kg / 2.5) * 2.5;
export const percentualeDaCarico = (kg, massimale) =>
  massimale && num(kg) > 0 ? Math.round((num(kg) / massimale) * 100) : null;
export const caricoDaPercentuale = (pct, massimale) =>
  massimale && num(pct) > 0 ? arrotondaCarico((massimale * num(pct)) / 100) : null;

const presente = (v) => v !== null && v !== undefined && v !== "";

// Senza carichi previsti (corpo libero) la forza si misura in ripetizioni
export const suRipetizioni = (s) => s.tipo !== "cardio" &&
  presente(s.volumePrevisto) && num(s.volumePrevisto) === 0 &&
  num(s.ripPreviste) > 0 && presente(s.ripEseguite);

function completamentoForza(s) {
  if (suRipetizioni(s)) return al1(num(s.ripEseguite) / num(s.ripPreviste));
  return num(s.volumePrevisto) > 0 && presente(s.volumeEseguito)
    ? al1(num(s.volumeEseguito) / num(s.volumePrevisto)) : null;
}

// regolaCardio 2: minuti in zona ÷ il maggiore tra previsti e svolti.
// Senza il contrassegno (sessioni precedenti e del trainer) vale la percentuale
function completamentoCardio(s) {
  if (s.regolaCardio !== 2) {
    return presente(s.zonaPct) ? al1(num(s.zonaPct) / 100) : null;
  }
  if (!presente(s.zonaMin) || !presente(s.cardioMin)) return null;
  const base = Math.max(num(s.minCardio), num(s.cardioMin));
  return base > 0 ? al1(num(s.zonaMin) / base) : null;
}

// Completamento 0-1, null se mancano i dati necessari
export function completamento(s) {
  const forza = completamentoForza(s);
  const cardio = completamentoCardio(s);
  if (s.tipo === "forza") return forza;
  if (s.tipo === "cardio") return cardio;
  const pesi = num(s.minForza) + num(s.minCardio);
  if (forza === null || cardio === null || !num(s.minForza) || !num(s.minCardio)) return null;
  return (forza * num(s.minForza) + cardio * num(s.minCardio)) / pesi;
}

// Indice 0-100. Senza kcal si ricalcola sugli altri due pesi ("parziale")
export function efficienza(s) {
  const compl = completamento(s);
  const previsti = num(s.minPrevisti);
  const effettivi = num(s.minEffettivi);
  const tempi = previsti > 0 && effettivi > 0 ? al1(previsti / effettivi) : null;
  const kcalMin = presente(s.kcal) && effettivi > 0 ? num(s.kcal) / effettivi : null;
  const energia = kcalMin === null ? null : al1(kcalMin / 9);
  let punteggio = null;
  if (compl !== null && tempi !== null) {
    punteggio = energia === null
      ? Math.round((100 * (45 * compl + 30 * tempi)) / 75)
      : Math.round(45 * compl + 30 * tempi + 25 * energia);
  }
  return {
    punteggio, parziale: punteggio !== null && energia === null,
    completamento: compl, tempi, energia, kcalMin
  };
}

export function giudizio(p) {
  if (p === null) return "non calcolabile";
  return p >= 85 ? "ottima" : p >= 70 ? "buona" : p >= 55 ? "sufficiente" : "bassa";
}

// Date "AAAA-MM-GG" nell'ora locale
export function isoLocale(d = new Date()) {
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export function giorniPrima(iso, giorni) {
  const [a, m, g] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, g - giorni)).toISOString().slice(0, 10);
}
// Ultimi 30 giorni, oggi compreso
export function ultimi30(sessioni, oggi = isoLocale()) {
  const dal = giorniPrima(oggi, 29);
  return sessioni.filter((s) => s.data >= dal && s.data <= oggi);
}

const media = (valori) =>
  valori.length ? Math.round(somma(valori, Number) / valori.length) : null;

export function kpi(sessioni, oggi = isoLocale()) {
  const recenti = ultimi30(sessioni, oggi);
  return {
    efficienza: media(recenti.map((s) => s.efficienza).filter(Number.isFinite)),
    parziali: recenti.filter((s) => s.parziale).length,
    sessioni: recenti.length,
    perTipo: Object.fromEntries(
      Object.keys(TIPI).map((t) => [t, recenti.filter((s) => s.tipo === t).length])),
    volume: media(recenti.map((s) => s.volumeEseguito).filter((v) => Number.isFinite(v) && v > 0)),
    kcal: media(recenti.map((s) => s.kcal).filter(Number.isFinite))
  };
}

// Riepilogo salvato nella scheda atleta: serve all'elenco senza altre letture
export const MASSIMO_RIEPILOGO = 60;
export function aggiornaRiepilogo(riepilogo, id, voce) {
  const resto = (riepilogo || []).filter((r) => r.id !== id);
  if (voce) resto.push({ id, ...voce });
  return resto.sort((a, b) => b.data.localeCompare(a.data)).slice(0, MASSIMO_RIEPILOGO);
}
