// Raccolta di tutti i dati di un atleta per l'esportazione (solo trainer).
// Legge direttamente dal server: senza rete si ferma, invece di dare un file incompleto.
// Nessun limite: avviene solo su richiesta
import {
  collection, doc, getDocFromServer, getDocsFromServer, query, where
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Le date del database diventano testo leggibile (AAAA-MM-GGThh:mm:ssZ)
export function semplifica(v) {
  if (v && typeof v.toDate === "function") return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(semplifica);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, semplifica(x)]));
  }
  return v;
}

async function uno(...percorso) {
  const d = await getDocFromServer(doc(db, ...percorso));
  return d.exists() ? semplifica(d.data()) : null;
}

async function tutti(richiesta) {
  const r = await getDocsFromServer(richiesta);
  return r.docs.map((d) => ({ codice: d.id, ...semplifica(d.data()) }));
}

export async function raccogliDati(atletaId) {
  const anagrafica = await uno("atleti", atletaId);
  if (!anagrafica) throw { code: "app/atleta-inesistente" };
  const [foto, consenso] = await Promise.all(
    ["foto", "consenso"].map((n) => uno("atleti", atletaId, "privato", n)));
  const [salute, misurazioni, schede, sessioni] = await Promise.all(
    ["salute", "misurazioni", "schede", "sessioni"]
      .map((n) => tutti(collection(db, "atleti", atletaId, n))));
  const [inviti, accessi] = await Promise.all(["inviti", "utenti"]
    .map((n) => tutti(query(collection(db, n), where("atletaId", "==", atletaId)))));
  return {
    esportatoIl: new Date().toISOString(),
    codiceAtleta: atletaId,
    anagrafica,
    consensoNellApp: consenso,
    foto: foto?.dati ?? null,
    noteSanitarie: salute,
    misurazioni,
    schede,
    sessioni,
    inviti,
    accessi
  };
}
