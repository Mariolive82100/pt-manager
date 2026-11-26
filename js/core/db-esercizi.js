// Esercizi personalizzati: un solo documento, quindi una sola lettura
import { doc, getDoc, runTransaction, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export const MASSIMO_ESERCIZI = 200;
const rif = () => doc(db, "impostazioni", "esercizi");

export async function leggiEsercizi() {
  const d = await getDoc(rif());
  return d.exists() ? d.data().voci || [] : [];
}

async function modifica(funzione) {
  let voci;
  await runTransaction(db, async (t) => {
    const d = await t.get(rif());
    voci = funzione(d.exists() ? d.data().voci || [] : []);
    t.set(rif(), { voci, aggiornatoIl: serverTimestamp() });
  });
  return voci;
}

const uguale = (a, b) => a.localeCompare(b, "it", { sensitivity: "base" }) === 0;

export const aggiungiEsercizio = (nome, rm) => modifica((voci) => {
  if (voci.some((v) => uguale(v.nome, nome))) throw { code: "app/esercizio-presente" };
  if (voci.length >= MASSIMO_ESERCIZI) throw { code: "app/troppi-esercizi" };
  return [...voci, { nome, rm }].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
});

export const togliEsercizio = (nome) =>
  modifica((voci) => voci.filter((v) => v.nome !== nome));
