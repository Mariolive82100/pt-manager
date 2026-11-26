// Schede pianificate e sessioni svolte: lettura e salvataggio
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit,
  runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { aggiornaRiepilogo } from "./calcoli-allenamento.js";

export const MASSIMO_SCHEDE = 30;   // tetti alle letture (piano Spark)
export const MASSIMO_SESSIONI = 60;

const raccolta = (atletaId, nome) => collection(db, "atleti", atletaId, nome);
const scheda = (atletaId, id) => doc(db, "atleti", atletaId, "schede", id);
const sessione = (atletaId, id) => doc(db, "atleti", atletaId, "sessioni", id);

async function recenti(atletaId, nome, quante) {
  const r = await getDocs(query(raccolta(atletaId, nome), orderBy("data", "desc"), limit(quante)));
  return r.docs.map((d) => ({ ...d.data(), id: d.id }));
}
export const elencaSchede = (atletaId) => recenti(atletaId, "schede", MASSIMO_SCHEDE);
export const elencaSessioni = (atletaId) => recenti(atletaId, "sessioni", MASSIMO_SESSIONI);

export async function leggiScheda(atletaId, id) {
  const d = await getDoc(scheda(atletaId, id));
  return d.exists() ? { ...d.data(), id } : null;
}

// id = null per una scheda nuova. Una scheda completata non si modifica
export async function salvaScheda(atletaId, id, dati) {
  if (!id) {
    const rif = doc(raccolta(atletaId, "schede"));
    await setDoc(rif, { ...dati, creatoIl: serverTimestamp(), aggiornatoIl: serverTimestamp() });
    return rif.id;
  }
  await runTransaction(db, async (t) => {
    const attuale = await t.get(scheda(atletaId, id));
    if (!attuale.exists()) throw { code: "app/scheda-inesistente" };
    if (attuale.data().stato === "completata") throw { code: "app/scheda-completata" };
    t.update(scheda(atletaId, id), { ...dati, aggiornatoIl: serverTimestamp() });
  });
  return id;
}

export const eliminaScheda = (atletaId, id) => deleteDoc(scheda(atletaId, id));

// Sessione, riepilogo dell'atleta e stato della scheda vengono salvati insieme
export async function registraSessione(atletaId, dati) {
  const rif = doc(raccolta(atletaId, "sessioni"));
  const rifAtleta = doc(db, "atleti", atletaId);
  await runTransaction(db, async (t) => {
    const atleta = await t.get(rifAtleta);
    if (!atleta.exists()) throw { code: "app/atleta-inesistente" };
    if (dati.schedaId) {
      const s = await t.get(scheda(atletaId, dati.schedaId));
      if (!s.exists()) throw { code: "app/scheda-inesistente" };
      if (s.data().stato !== "assegnata") throw { code: "app/scheda-completata" };
    }
    t.set(rif, { ...dati, creatoIl: serverTimestamp() });
    t.update(rifAtleta, {
      riepilogo: aggiornaRiepilogo(atleta.data().riepilogo, rif.id,
        { data: dati.data, efficienza: dati.efficienza }),
      aggiornatoIl: serverTimestamp()
    });
    if (dati.schedaId) t.update(scheda(atletaId, dati.schedaId), { stato: "completata" });
  });
  return rif.id;
}

// Restituisce il riepilogo aggiornato. La scheda collegata torna "assegnata"
export async function eliminaSessione(atletaId, voce) {
  const rifAtleta = doc(db, "atleti", atletaId);
  let riepilogo;
  await runTransaction(db, async (t) => {
    const atleta = await t.get(rifAtleta);
    if (!atleta.exists()) throw { code: "app/atleta-inesistente" };
    const collegata = voce.schedaId ? await t.get(scheda(atletaId, voce.schedaId)) : null;
    riepilogo = aggiornaRiepilogo(atleta.data().riepilogo, voce.id, null);
    t.delete(sessione(atletaId, voce.id));
    t.update(rifAtleta, { riepilogo, aggiornatoIl: serverTimestamp() });
    if (collegata?.exists()) t.update(scheda(atletaId, voce.schedaId), { stato: "assegnata" });
  });
  return riepilogo;
}
