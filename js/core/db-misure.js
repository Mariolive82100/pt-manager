// Misurazioni: lettura e salvataggio. L'identificativo è la data
import {
  collection, doc, getDocs, query, orderBy, limit, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { valoriCorrenti, ordina } from "./calcoli-misure.js";

export const MASSIMO_MISURE = 60; // tetto alle letture (piano Spark)

const misura = (atletaId, id) => doc(db, "atleti", atletaId, "misurazioni", id);

export async function elencaMisure(atletaId) {
  const risultato = await getDocs(query(
    collection(db, "atleti", atletaId, "misurazioni"),
    orderBy("data", "desc"), limit(MASSIMO_MISURE)));
  return ordina(risultato.docs.map((d) => ({ ...d.data(), id: d.id })));
}

// Rilevazione e valori del profilo vengono salvati insieme.
// vecchioId: rilevazione di partenza; nuova: null se va eliminata
async function applica(atleta, vecchioId, nuova) {
  const lette = await elencaMisure(atleta.id);
  const troncata = lette.length === MASSIMO_MISURE;
  const rifAtleta = doc(db, "atleti", atleta.id);
  let valori;

  await runTransaction(db, async (t) => {
    const profilo = await t.get(rifAtleta);
    if (!profilo.exists()) throw { code: "app/atleta-inesistente" };
    if (nuova && nuova.data !== vecchioId) {
      const occupata = await t.get(misura(atleta.id, nuova.data));
      if (occupata.exists()) throw { code: "app/data-occupata" };
    }

    const restanti = lette.filter((m) => m.id !== vecchioId);
    if (nuova) restanti.push(nuova);
    valori = valoriCorrenti(restanti, profilo.data(), troncata);

    if (vecchioId && vecchioId !== nuova?.data) t.delete(misura(atleta.id, vecchioId));
    if (nuova) t.set(misura(atleta.id, nuova.data), { ...nuova, aggiornatoIl: serverTimestamp() });
    t.update(rifAtleta, { ...valori, aggiornatoIl: serverTimestamp() });
  });

  return valori;
}

export const salvaMisura = (atleta, vecchioId, dati) => applica(atleta, vecchioId, dati);
export const eliminaMisura = (atleta, id) => applica(atleta, id, null);
