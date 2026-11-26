// Funzioni grafiche comuni
export const $ = (id) => document.getElementById(id);

// Crea un elemento. I testi non vengono mai interpretati come HTML
export function crea(tag, proprieta = {}, ...figli) {
  const nodo = Object.assign(document.createElement(tag), proprieta);
  nodo.append(...figli.filter((f) => f !== null && f !== undefined));
  return nodo;
}

export function avviso(testo, errore = false) {
  const box = $("messaggio");
  box.textContent = testo;
  box.hidden = !testo;
  box.classList.toggle("avviso-errore", errore);
  if (testo) box.scrollIntoView({ block: "nearest" });
}

export const iniziali = (nome) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
