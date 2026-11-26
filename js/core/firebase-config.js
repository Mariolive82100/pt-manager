// Collegamento a Firebase: unico file con la configurazione
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAC7XDstwaSFsMV2vcoPqB4mSv1L8k_kDw",
  authDomain: "pt-manager-39ab6.firebaseapp.com",
  projectId: "pt-manager-39ab6",
  storageBucket: "pt-manager-39ab6.firebasestorage.app",
  messagingSenderId: "1007481799100",
  appId: "1:1007481799100:web:6dc66b1adeaf28c9a3ebb9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.languageCode = "it"; // email di Firebase in italiano

// Cache solo in memoria (predefinita): i dati sanitari
// non restano salvati sul dispositivo
export const db = getFirestore(app);
