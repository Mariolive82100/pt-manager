// Foto tessera: un solo documento per atleta, leggibile solo dal trainer
import {
  doc, getDoc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const rif = (atletaId) => doc(db, "atleti", atletaId, "privato", "foto");

export async function leggiFoto(atletaId) {
  const d = await getDoc(rif(atletaId));
  return d.exists() ? d.data().dati : null;
}

export const salvaFoto = (atletaId, dati) => setDoc(rif(atletaId), { dati });
export const eliminaFoto = (atletaId) => deleteDoc(rif(atletaId));
