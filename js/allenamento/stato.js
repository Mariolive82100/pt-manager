// Dati condivisi della pagina "Nuovo allenamento"
import { ESERCIZI_BASE } from "../core/esercizi-base.js";

export const st = {
  modo: "pianifica",
  tipo: "forza",
  atleta: null,
  personalizzati: [],
  // Ogni tipo ha la sua lista: cambiando tipo non si perde nulla
  liste: { forza: [], cardio: [], misto: [] }
};

export const nuovoForza = () =>
  ({ k: "forza", nome: "", rm: "", serie: 3, rip: 10, kg: null, recupero: 90 });
export const nuovoCardio = () =>
  ({ k: "cardio", nome: "", rip: 1, minuti: 10, zona: 2 });

st.liste.forza.push(nuovoForza());
st.liste.cardio.push(nuovoCardio());
st.liste.misto.push(nuovoCardio(), nuovoForza());

export const elementi = () => st.liste[st.tipo];
export const tuttiEsercizi = () => [...ESERCIZI_BASE, ...st.personalizzati];
export const massimale = (rm) => (rm ? st.atleta?.massimali?.[rm] || null : null);
export const haForza = () => st.tipo !== "cardio";
export const haCardio = () => st.tipo !== "forza";
