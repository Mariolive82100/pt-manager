// Lettura e salvataggio di atleti e inviti
import {
  collection, doc, getDocs, query, where, orderBy, limit,
  runTransaction, serverTimestamp, writeBatch, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export const MASSIMO_ATLETI = 200; // tetto alle letture (piano Spark)

export async function elencaAtleti() {
  const risultato = await getDocs(
    query(collection(db, "atleti"), orderBy("nome"), limit(MASSIMO_ATLETI)));
  return risultato.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// id = null per un nuovo atleta. Restituisce l'id salvato.
// Atleta, invito e revoca dei vecchi accessi vengono salvati tutti insieme.
export async function salvaAtleta(id, dati, trainerUid) {
  const rif = id ? doc(db, "atleti", id) : doc(collection(db, "atleti"));

  // Profili di accesso già collegati: servono se l'email cambia
  const accessi = id
    ? (await getDocs(query(collection(db, "utenti"), where("atletaId", "==", id)))).docs
    : [];

  await runTransaction(db, async (t) => {
    // Firestore richiede tutte le letture prima delle scritture
    const precedente = id ? await t.get(rif) : null;
    if (id && !precedente.exists()) throw { code: "app/atleta-inesistente" };

    const rifInvito = dati.email ? doc(db, "inviti", dati.email) : null;
    const invito = rifInvito ? await t.get(rifInvito) : null;
    if (invito && invito.exists() && invito.data().atletaId !== rif.id) {
      throw { code: "app/email-gia-usata" };
    }

    const vecchiaEmail = precedente ? precedente.data().email : "";
    const record = { ...dati, aggiornatoIl: serverTimestamp() };

    if (id) t.update(rif, record);
    else t.set(rif, { ...record, riepilogo: [], creatoIl: serverTimestamp() });

    if (rifInvito) t.set(rifInvito, { atletaId: rif.id, trainerUid });

    if (vecchiaEmail && vecchiaEmail !== dati.email) {
      t.delete(doc(db, "inviti", vecchiaEmail));
      accessi.forEach((a) => t.delete(a.ref));
    }
  });

  return rif.id;
}

const SOTTORACCOLTE = ["salute", "misurazioni", "schede", "sessioni"];
const BLOCCO = 400; // un gruppo di scritture ne accetta al massimo 500

async function cancellaInBlocchi(riferimenti) {
  for (let i = 0; i < riferimenti.length; i += BLOCCO) {
    const gruppo = writeBatch(db);
    riferimenti.slice(i, i + BLOCCO).forEach((r) => gruppo.delete(r));
    await gruppo.commit();
  }
}

const riferimentiDi = async (richiesta) =>
  (await getDocs(richiesta)).docs.map((d) => d.ref);

// Cancellazione definitiva. Se si interrompe, si può ripetere:
// la scheda atleta viene eliminata per ultima.
export async function eliminaAtleta(id) {
  const rif = doc(db, "atleti", id);

  // 1. Revoca l'accesso: inviti e profili collegati (mai quelli trainer)
  const inviti = await riferimentiDi(query(collection(db, "inviti"), where("atletaId", "==", id)));
  const accessi = (await getDocs(query(collection(db, "utenti"), where("atletaId", "==", id))))
    .docs.filter((d) => d.data().ruolo === "atleta").map((d) => d.ref);
  await cancellaInBlocchi([...inviti, ...accessi]);

  // 2. Cancella i dati collegati (Firestore non lo fa da solo)
  for (const nome of SOTTORACCOLTE) {
    await cancellaInBlocchi(await riferimentiDi(collection(db, "atleti", id, nome)));
  }
  await cancellaInBlocchi(["foto", "consenso"].map((n) => doc(db, "atleti", id, "privato", n)));

  // 3. Infine la scheda atleta
  await deleteDoc(rif);
}

// livello: 0-3 assegnato dal trainer, null = automatico
export const salvaLivello = (id, livello) =>
  updateDoc(doc(db, "atleti", id),
    { livelloTrainer: livello, aggiornatoIl: serverTimestamp() });
