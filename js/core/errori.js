// Messaggi di errore dell'area trainer
import { messaggioErrore } from "./auth.js";

const ERRORI = {
  "app/email-gia-usata": "Questa email è già assegnata a un altro atleta.",
  "app/data-occupata": "Esiste già una rilevazione in questa data: modifica quella.",
  "app/atleta-inesistente": "Questo atleta non esiste più. Ricarica la pagina.",
  "app/scheda-inesistente": "Questa scheda non esiste più. Ricarica la pagina.",
  "app/copia-inesistente": "La scheda da duplicare non esiste più. Torna al profilo dell'atleta.",
  "app/scheda-completata": "Questa scheda risulta già completata o ritirata. Ricarica la pagina.",
  "app/foto-non-leggibile": "Immagine non leggibile. Usa una foto in formato JPG o PNG.",
  "app/foto-troppo-pesante": "Non riesco a ridurre abbastanza questa foto: scegline un'altra.",
  "app/scheda-modificata": "Il trainer ha modificato la scheda: questo allenamento non può essere inviato. Contattalo.",
  "app/esercizio-presente": "Esiste già un esercizio con questo nome.",
  "app/troppi-esercizi": "Hai raggiunto il numero massimo di esercizi personalizzati."
};

export const testoErrore = (e) => ERRORI[e?.code] || messaggioErrore(e);
