// Pulsanti e messaggi della sola schermata di accesso
import {
  osservaAccesso, accediConGoogle, accediConEmail, registraConEmail,
  inviaVerifica, controllaVerifica, recuperaPassword, esci,
  leggiProfilo, messaggioErrore
} from "../core/auth.js";

const $ = (id) => document.getElementById(id);
const VISTE = ["caricamento", "accesso", "verifica", "non-abilitato", "entrato"];
let registrazione = false;

function mostra(nome) {
  VISTE.forEach((v) => { $("vista-" + v).hidden = v !== nome; });
}

function avviso(testo, errore = false) {
  const box = $("messaggio");
  box.textContent = testo;
  box.hidden = !testo;
  box.classList.toggle("avviso-errore", errore);
}

// Esegue un'azione bloccando il pulsante e mostrando gli errori
async function esegui(pulsante, azione) {
  pulsante.disabled = true;
  avviso("");
  try {
    await azione();
  } catch (e) {
    console.error(e);
    avviso(messaggioErrore(e), true);
  } finally {
    pulsante.disabled = false;
  }
}

async function apriProfilo(user) {
  const profilo = await leggiProfilo(user);
  if (profilo.stato === "verifica") {
    $("email-verifica").textContent = user.email;
    mostra("verifica");
  } else if (profilo.stato === "non-abilitato") {
    $("email-non-abilitato").textContent = user.email;
    $("codice-account").textContent = user.uid;
    mostra("non-abilitato");
  } else {
    $("ruolo").textContent = profilo.ruolo;
    mostra("entrato");
  }
}

osservaAccesso(async (user) => {
  if (!user) {
    $("password").value = "";
    mostra("accesso");
    return;
  }
  mostra("caricamento");
  try {
    await apriProfilo(user);
  } catch (e) {
    console.error(e);
    avviso(messaggioErrore(e), true);
    await esci();
  }
});

$("btn-google").addEventListener("click", (ev) => esegui(ev.currentTarget, accediConGoogle));

$("form-email").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  esegui($("btn-invia"), async () => {
    if (!registrazione) return accediConEmail(email, password);
    if (password.length < 8) {
      avviso("La password deve avere almeno 8 caratteri.", true);
      return;
    }
    await registraConEmail(email, password);
    avviso("Ti abbiamo inviato il link di verifica.");
  });
});

$("btn-cambia").addEventListener("click", () => {
  registrazione = !registrazione;
  const titolo = registrazione ? "Crea la password" : "Accedi";
  $("titolo-accesso").textContent = titolo;
  $("btn-invia").textContent = titolo;
  $("btn-cambia").textContent = registrazione ? "Hai già un account? Accedi" : "Primo accesso? Crea la password";
  $("btn-recupera").hidden = registrazione;
  $("password").autocomplete = registrazione ? "new-password" : "current-password";
  avviso("");
});

$("btn-recupera").addEventListener("click", (ev) => {
  const email = $("email").value.trim();
  if (!email) {
    avviso("Scrivi prima la tua email nel campo qui sotto.", true);
    $("email").focus();
    return;
  }
  esegui(ev.currentTarget, async () => {
    await recuperaPassword(email);
    avviso("Se l'indirizzo è registrato, riceverai un'email per cambiare la password.");
  });
});

$("btn-reinvia").addEventListener("click", (ev) => esegui(ev.currentTarget, async () => {
  await inviaVerifica();
  avviso("Link inviato di nuovo.");
}));

$("btn-verificato").addEventListener("click", (ev) => esegui(ev.currentTarget, async () => {
  const user = await controllaVerifica();
  if (!user.emailVerified) {
    avviso("L'email non risulta ancora verificata.", true);
    return;
  }
  await apriProfilo(user);
}));

document.querySelectorAll(".js-esci").forEach((b) =>
  b.addEventListener("click", () => esegui(b, esci)));
