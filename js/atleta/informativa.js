// Testo dell'informativa. Se cambia, aumentare VERSIONE: l'app richiede di nuovo il consenso
import { crea } from "../core/ui.js";
import { TITOLARE } from "../core/titolare.js";

export const VERSIONE_INFORMATIVA = "bozza-1";

const SEZIONI = [
  ["Chi tratta i dati", `Titolare del trattamento: ${TITOLARE.nome}. Contatto: ${TITOLARE.contatto}. Un eventuale assistente tecnico può accedere ai dati solo se autorizzato dal titolare.`],
  ["Quali dati", "Nome, data di nascita, sesso, email, obiettivo, misure del corpo, frequenza cardiaca, massimali, test fisici, allenamenti svolti e fatica percepita. Dati sulla salute: traumi, interventi e patologie."],
  ["Perché", "Per preparare e seguire i tuoi allenamenti tenendo conto delle tue condizioni fisiche. La base giuridica, compreso il tuo consenso esplicito per i dati sulla salute, è in corso di verifica."],
  ["Chi può vederli", "Tu e il tuo personal trainer. Gli altri atleti non vedono i tuoi dati."],
  ["Dove sono conservati", "Il database è su Google Firebase, nella regione di Milano. Il servizio di accesso di Google può trattare dati, come l'email, anche fuori dall'Unione europea. I file dell'app sono pubblicati su GitHub, che riceve dati tecnici di connessione come l'indirizzo IP."],
  ["Sul tuo telefono", "Durante un allenamento l'app salva temporaneamente solo ora di inizio, serie, ripetizioni, carichi e blocchi svolti. La copia si cancella dopo l'invio o quando esci."],
  ["Per quanto tempo", "[DA COMPLETARE: durata di conservazione]"],
  ["I tuoi diritti", "Puoi chiedere accesso, correzione, cancellazione, limitazione e copia dei tuoi dati, e puoi ritirare il consenso in qualsiasi momento. Il ritiro blocca l'app ma non cancella automaticamente i dati: per cancellarli scrivi al titolare. Puoi presentare reclamo al Garante per la protezione dei dati personali."]
];

export function testoInformativa() {
  return [
    crea("p", { className: "avviso", textContent: "BOZZA da far verificare a un consulente privacy. Da non usare con dati veri." }),
    ...SEZIONI.flatMap(([titolo, testo]) =>
      [crea("h4", { textContent: titolo }), crea("p", { textContent: testo })])
  ];
}
