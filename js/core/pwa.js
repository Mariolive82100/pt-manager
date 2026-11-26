// Attiva il service worker. Script semplice: funziona anche senza rete verso Firebase
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .catch((e) => console.warn("Service worker non attivato", e));
  });
}
