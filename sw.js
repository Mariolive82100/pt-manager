// Service worker minimo: prima la rete, la copia salvata solo se la rete manca.
// Salva esclusivamente i file dell'app: i dati degli atleti non passano di qui.

// Prefisso diverso nell'eventuale versione beta (stesso dominio)
const PREFISSO = "ptm-ufficiale-";
const CACHE = PREFISSO + "v1";
const TIPI = /\.(html|css|js|json|png|woff2)$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil((async () => {
    const nomi = await caches.keys();
    await Promise.all(nomi
      .filter((n) => n.startsWith(PREFISSO) && n !== CACHE)
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (evento) => {
  const richiesta = evento.request;
  const url = new URL(richiesta.url);
  // Firebase, Google e tutto ciò che è esterno all'app non viene toccato
  if (richiesta.method !== "GET" || !url.href.startsWith(self.registration.scope)) return;

  const percorso = url.pathname;
  const salvabile = percorso.endsWith("/") || TIPI.test(percorso);
  const chiave = url.origin + percorso; // senza eventuali parametri

  evento.respondWith((async () => {
    try {
      // "no-cache": chiede sempre al server se il file è cambiato
      const risposta = await fetch(richiesta, { cache: "no-cache" });
      if (salvabile && risposta.ok && !risposta.redirected) {
        const copia = risposta.clone();
        evento.waitUntil(caches.open(CACHE).then((c) => c.put(chiave, copia)));
      }
      return risposta;
    } catch (errore) {
      const salvata = await caches.match(chiave, { cacheName: CACHE });
      if (salvata) return salvata;
      throw errore;
    }
  })());
});
