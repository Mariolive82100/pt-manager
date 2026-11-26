// Riduce l'immagine nel browser. Ridisegnandola si eliminano anche i dati
// nascosti del file originale (luogo dello scatto, modello del telefono...)
const LARGHEZZA = 360;
const ALTEZZA = 480;
export const MASSIMO_CARATTERI = 95000; // le regole accettano meno di 100000

function carica(file) {
  return new Promise((ok, errore) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); errore({ code: "app/foto-non-leggibile" }); };
    img.src = url;
  });
}

// Restituisce un testo "data:image/jpeg;base64,..." ritagliato a fototessera
export async function riduciFoto(file) {
  const img = await carica(file);
  if (!img.naturalWidth || !img.naturalHeight) throw { code: "app/foto-non-leggibile" };
  const tela = document.createElement("canvas");
  tela.width = LARGHEZZA;
  tela.height = ALTEZZA;
  const disegno = tela.getContext("2d");
  disegno.fillStyle = "#fff";
  disegno.fillRect(0, 0, LARGHEZZA, ALTEZZA);

  // Ritaglio centrale 3:4; nelle foto verticali si favorisce la parte alta
  const scala = Math.max(LARGHEZZA / img.naturalWidth, ALTEZZA / img.naturalHeight);
  const l = LARGHEZZA / scala;
  const a = ALTEZZA / scala;
  disegno.drawImage(img, (img.naturalWidth - l) / 2, (img.naturalHeight - a) / 3, l, a,
    0, 0, LARGHEZZA, ALTEZZA);

  for (let qualita = 0.82; qualita >= 0.42; qualita -= 0.1) {
    const dati = tela.toDataURL("image/jpeg", qualita);
    if (dati.length <= MASSIMO_CARATTERI) return dati;
  }
  throw { code: "app/foto-troppo-pesante" };
}
