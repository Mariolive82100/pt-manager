// Accesso, ruoli e inviti. Nessuna grafica in questo file.
import {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

export function osservaAccesso(funzione) {
  return onAuthStateChanged(auth, funzione);
}

export function accediConGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export function accediConEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registraConEmail(email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(user);
}

export function inviaVerifica() {
  return sendEmailVerification(auth.currentUser);
}

// Ricarica l'utente e aggiorna il "gettone" letto dalle regole di sicurezza
export async function controllaVerifica() {
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export function recuperaPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function esci() {
  return signOut(auth);
}

// Risponde: { stato: "ok", ruolo, atletaId } | { stato: "verifica" } | { stato: "non-abilitato" }
export async function leggiProfilo(user) {
  const rifProfilo = doc(db, "utenti", user.uid);
  const profilo = await getDoc(rifProfilo);
  if (profilo.exists()) return { stato: "ok", ...profilo.data() };

  if (!user.emailVerified) return { stato: "verifica" };

  // Primo accesso di un atleta invitato: crea il suo profilo
  const invito = await getDoc(doc(db, "inviti", user.email.toLowerCase()));
  if (!invito.exists()) return { stato: "non-abilitato" };

  const dati = { ruolo: "atleta", atletaId: invito.data().atletaId };
  await setDoc(rifProfilo, dati);
  return { stato: "ok", ...dati };
}

const ERRORI = {
  "auth/invalid-credential": "Email o password non corrette.",
  "auth/invalid-email": "L'indirizzo email non è valido.",
  "auth/email-already-in-use": "Esiste già un account con questa email: prova ad accedere, usa Google o recupera la password.",
  "auth/weak-password": "La password è troppo debole.",
  "auth/too-many-requests": "Troppi tentativi. Aspetta qualche minuto.",
  "auth/popup-blocked": "Il browser ha bloccato la finestra di Google. Consenti i popup e riprova.",
  "auth/unauthorized-domain": "Questo sito non è autorizzato in Firebase.",
  "auth/network-request-failed": "Connessione assente o instabile.",
  "permission-denied": "Accesso negato dalle regole di sicurezza."
};

// Testo vuoto = l'utente ha solo chiuso la finestra di Google
export function messaggioErrore(errore) {
  const codice = errore && errore.code;
  if (codice === "auth/popup-closed-by-user" || codice === "auth/cancelled-popup-request") return "";
  return ERRORI[codice] || `Si è verificato un errore (${codice || "sconosciuto"}).`;
}
