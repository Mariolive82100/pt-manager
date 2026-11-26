// Versione del programma: va aumentata a ogni aggiornamento pubblicato
export const VERSIONE = "0.5.0";

document.querySelectorAll(".js-versione").forEach((nodo) => {
  nodo.textContent = "Versione " + VERSIONE;
});
