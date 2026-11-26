// Dati sanitari: lettura e salvataggio (cache solo in memoria)
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export const MASSIMO_NOTE = 100; // tetto alle letture (piano Spark)

const note = (atletaId) => collection(db, "atleti", atletaId, "salute");
const nota = (atletaId, id) => doc(db, "atleti", atletaId, "salute", id);

export async function elencaNote(atletaId) {
  const risultato = await getDocs(query(note(atletaId), limit(MASSIMO_NOTE)));
  return risultato.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.titolo.localeCompare(b.titolo, "it"));
}

// id = null per una nuova nota
export function salvaNota(atletaId, id, { tipo, titolo, dettagli }) {
  const dati = { tipo, titolo, dettagli, aggiornatoIl: serverTimestamp() };
  return id
    ? updateDoc(nota(atletaId, id), dati)
    : addDoc(note(atletaId), { ...dati, creatoIl: serverTimestamp() });
}

export const eliminaNota = (atletaId, id) => deleteDoc(nota(atletaId, id));

// data "AAAA-MM-GG" del consenso scritto; testo vuoto = nessun consenso
export const salvaConsensoScritto = (atletaId, data) =>
  updateDoc(doc(db, "atleti", atletaId),
    { consensoScritto: data, aggiornatoIl: serverTimestamp() });
