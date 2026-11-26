// Letture e scritture dell'app atleta
import {
  collection, doc, getDoc, getDocs, setDoc, query, where, limit,
  runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { aggiornaRiepilogo } from "./calcoli-allenamento.js";
import { impronta } from "./sessione-atleta.js";

const MASSIMO_DA_FARE = 30; // tetto alle letture (piano Spark)

async function leggi(...percorso) {
  const d = await getDoc(doc(db, ...percorso));
  return d.exists() ? d.data() : null;
}

export async function leggiAtleta(id) {
  const dati = await leggi("atleti", id);
  return dati ? { ...dati, id } : null;
}

export const leggiConsenso = (atletaId) => leggi("atleti", atletaId, "privato", "consenso");

export const salvaConsenso = (atletaId, accettato, versione) =>
  setDoc(doc(db, "atleti", atletaId, "privato", "consenso"),
    { accettato, versione, data: serverTimestamp() });

// Il filtro sullo stato è obbligatorio: le regole nascondono le bozze.
// L'ordine si fa qui, senza dover creare un indice nel database
export async function elencaDaFare(atletaId) {
  const r = await getDocs(query(collection(db, "atleti", atletaId, "schede"),
    where("stato", "==", "assegnata"), limit(MASSIMO_DA_FARE)));
  return r.docs.map((d) => ({ ...d.data(), id: d.id }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

// La sessione ha lo stesso codice della scheda: un secondo invio non la duplica
export async function inviaSessione(atletaId, dati, improntaScheda) {
  const rifSessione = doc(db, "atleti", atletaId, "sessioni", dati.schedaId);
  const rifScheda = doc(db, "atleti", atletaId, "schede", dati.schedaId);
  const rifAtleta = doc(db, "atleti", atletaId);
  await runTransaction(db, async (t) => {
    if ((await t.get(rifSessione)).exists()) return; // già arrivata
    const atleta = await t.get(rifAtleta);
    const scheda = await t.get(rifScheda);
    if (!atleta.exists() || !scheda.exists()) throw { code: "app/scheda-inesistente" };
    if (scheda.data().stato !== "assegnata") throw { code: "app/scheda-completata" };
    if (impronta(scheda.data()) !== improntaScheda) throw { code: "app/scheda-modificata" };
    t.set(rifSessione, { ...dati, creatoIl: serverTimestamp() });
    t.update(rifAtleta, {
      riepilogo: aggiornaRiepilogo(atleta.data().riepilogo, dati.schedaId,
        { data: dati.data, efficienza: dati.efficienza }),
      aggiornatoIl: serverTimestamp()
    });
    t.update(rifScheda, { stato: "completata" });
  });
}
