// Elenco di base. "rm" indica il massimale usato per la % 1RM
const voce = (nome, rm = "") => ({ nome, rm });

export const ESERCIZI_BASE = [
  voce("Squat", "squat"), voce("Panca piana", "panca"),
  voce("Stacco da terra", "stacco"), voce("Military press", "military"),
  voce("Squat frontale"), voce("Affondi bulgari"), voce("Affondi camminati"),
  voce("Pressa"), voce("Leg extension"), voce("Leg curl"), voce("Calf raise"),
  voce("Stacco rumeno"), voce("Hip thrust"),
  voce("Panca inclinata"), voce("Croci con manubri"), voce("Piegamenti"),
  voce("Dip alle parallele"), voce("Trazioni alla sbarra"), voce("Lat machine"),
  voce("Rematore con bilanciere"), voce("Pulley basso"),
  voce("Alzate laterali"), voce("Face pull"),
  voce("Curl con bilanciere"), voce("Curl con manubri"),
  voce("Push down"), voce("French press"),
  voce("Plank"), voce("Crunch"), voce("Russian twist")
];

export const BLOCCHI_CARDIO = [
  "Riscaldamento", "Lavoro continuo", "Ripetute", "Recupero attivo", "Defaticamento",
  "Corsa", "Tapis roulant", "Bike", "Ellittica", "Vogatore"
];
