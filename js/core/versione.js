// Versione del programma: va aumentata a ogni aggiornamento pubblicato
export const VERSIONE = "0.9.1";

document.querySelectorAll(".js-versione").forEach((nodo) => {
  nodo.textContent = "Versione " + VERSIONE;
});
