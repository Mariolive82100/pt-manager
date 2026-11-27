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

// Esercizio di forza "A tempo": round da tot secondi, ripetizioni solo come obiettivo
export const aTempo = (e) => e.k === "forza" && e.modo === "tempo";
const aRipetizioni = (elementi) => diTipo(elementi, "forza").filter((e) => !aTempo(e));

// Volume e ripetizioni riguardano solo gli esercizi a ripetizioni
export const volume = (elementi) => Math.round(somma(
  aRipetizioni(elementi), (e) => num(e.serie) * num(e.rip) * num(e.kg)));

export const ripetizioni = (elementi) =>
  somma(aRipetizioni(elementi), (e) => num(e.serie) * num(e.rip));

export const roundATempo = (elementi) =>
  somma(elementi.filter(aTempo), (e) => num(e.serie));

export const serieTotali = (elementi) =>
  somma(diTipo(elementi, "forza"), (e) => num(e.serie));

// Durata di un elemento in minuti. Forza: 40 secondi per serie più recupero,
// oppure i secondi di lavoro negli esercizi a tempo
export const minutiElemento = (e) => (e.k === "forza"
  ? (num(e.serie) * ((aTempo(e) ? num(e.lavoro) : SECONDI_SERIE) + num(e.recupero))) / 60
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

// Media dei completamenti (0-1) pesata sui minuti previsti; null se mancano dati
export function mediaPesata(parti) {
  const valide = parti.filter((p) => p.peso > 0);
  const pesi = somma(valide, (p) => p.peso);
  if (!pesi || valide.some((p) => p.valore === null)) return null;
  return al1(somma(valide, (p) => al1(p.valore) * p.peso) / pesi);
}

// Completamento forza dall'allenamento dell'atleta, esercizio per esercizio.
// serieSvolte[i] = serie (o round) registrate per elementi[i]
export function completamentoPerEsercizio(elementi, serieSvolte) {
  return mediaPesata(elementi.map((e, i) => {
    if (e.k !== "forza") return { peso: 0, valore: null };
    const fatte = (serieSvolte[i] || []).filter((s) => s.fatta);
    let valore;
    if (aTempo(e)) valore = fatte.length / num(e.serie);
    else if (num(e.kg) > 0) {
      valore = somma(fatte, (s) => num(s.rip) * num(s.kg)) / (num(e.serie) * num(e.rip) * num(e.kg));
    } else valore = somma(fatte, (s) => num(s.rip)) / (num(e.serie) * num(e.rip));
    return { peso: minutiElemento(e), valore: al1(valore) };
  }));
}

// Registrazione del trainer: due gruppi (a ripetizioni e a tempo), pesati sulla durata.
// Restituisce null se mancano dati
export function completamentoPerGruppi(elementi, dati) {
  const minuti = (lista) => somma(lista, minutiElemento);
  const altri = aRipetizioni(elementi);
  const tempo = elementi.filter(aTempo);
  let valoreAltri = null;
  if (num(dati.volumePrevisto) > 0 && presente(dati.volumeEseguito)) {
    valoreAltri = num(dati.volumeEseguito) / num(dati.volumePrevisto);
  } else if (num(dati.ripPreviste) > 0 && presente(dati.ripEseguite)) {
    valoreAltri = num(dati.ripEseguite) / num(dati.ripPreviste);
  }
  const previsti = roundATempo(elementi);
  return mediaPesata([
    { peso: minuti(altri), valore: valoreAltri },
    { peso: minuti(tempo),
      valore: presente(dati.roundEseguiti) && previsti ? num(dati.roundEseguiti) / previsti : null }
  ]);
}

// Sessioni con esercizi a tempo: il completamento forza è già pesato (compForza)
export const conTempo = (s) => s.tipo !== "cardio" && num(s.roundPrevisti) > 0;

// Senza carichi previsti (corpo libero) la forza si misura in ripetizioni
export const suRipetizioni = (s) => s.tipo !== "cardio" && !conTempo(s) &&
  presente(s.volumePrevisto) && num(s.volumePrevisto) === 0 &&
  num(s.ripPreviste) > 0 && presente(s.ripEseguite);

function completamentoForza(s) {
  if (conTempo(s)) return presente(s.compForza) ? al1(num(s.compForza)) : null;
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
