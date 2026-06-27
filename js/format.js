/* =====================================================================
   Mundial 2026 - Helpers de formato: fechas, horas, nombres y estado de partido
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fmtFecha(s) {
  const [y, m, d] = (s || "").split("-").map(Number);
  return m ? `${d} de ${MESES[m - 1]}` : s;
}

// TheSportsDB entrega las horas en UTC. Las convertimos a la hora LOCAL
// del visitante (en Colombia se ve hora de Colombia, etc.) usando su navegador.
function matchDate(e) {
  const ts = e.strTimestamp
    ? e.strTimestamp + "Z"
    : (e.dateEvent || "") + "T" + (e.strTime || "00:00:00") + "Z";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
// Nombres de equipos en español si el navegador está en español; si no, se dejan
// como los entrega la API (depende del idioma de quien abre el link).
// Las fechas y horas siguen el mismo criterio para no mezclar idiomas.
const APP_ES = (navigator.language || "es").toLowerCase().startsWith("es");
const APP_LOCALE = APP_ES ? "es" : navigator.language || "en";
function fmtHoraLocal(d) {
  return d.toLocaleTimeString(APP_LOCALE, { hour: "numeric", minute: "2-digit", hour12: true });
}
function teamName(x) {
  if (!x) return "";
  return APP_ES && typeof TEAM_ES !== "undefined" ? TEAM_ES[x] || x : x;
}
function fmtFechaLocal(d) {
  return d.toLocaleDateString(APP_LOCALE, { weekday: "long", day: "numeric", month: "long" });
}

// Estado de un partido FIFA: 0 = terminado · 3/12 = en vivo · resto = programado.
function fifaState(status) {
  if (status === 0) return "fin";
  if (status === 3 || status === 12) return "live";
  return "prog";
}