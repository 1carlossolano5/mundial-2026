/* =====================================================================
   Mundial 2026 - Resumen en video (YouTube): busqueda, reproductor y respaldo
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
// Canal oficial de ESPN Fans (resúmenes para Latam, reproducibles en Colombia).
const ESPN_FANS_ID = "UCFmMw7yTuLTCuMhpZD5dVsg";
// Sus resúmenes de partido terminan con un tag "M1", "M2"… (los distingue de
// clips o análisis). No usamos el número exacto: no calza con el de FIFA.
const RESUMEN_TAG = /\bM\d{1,3}\b/;

// Pide los candidatos a la función y los ordena priorizando: (1) canal ESPN Fans
// + RESUMEN, (2) ESPN Fans, (3) cualquier RESUMEN, (4) el resto. Devuelve ids.
async function youtubeVideoIds(query) {
  const url = new URL("/api/youtube", window.location.origin);
  url.searchParams.set("q", query);
  const r = await fetch(url);
  if (!r.ok) throw new Error("sin función");
  const d = await r.json();
  const cands = d.candidates && d.candidates.length
    ? d.candidates
    : (d.ids || (d.videoId ? [d.videoId] : [])).map((id) => ({ id, title: "", channelId: "" }));
  if (!cands.length) throw new Error("sin video");
  const score = (c) =>
    (c.channelId === ESPN_FANS_ID ? 2 : 0) + (RESUMEN_TAG.test(c.title || "") ? 1 : 0);
  return cands
    .map((c, i) => ({ c, i }))
    .sort((a, b) => score(b.c) - score(a.c) || a.i - b.i) // estable: respeta relevancia
    .map((x) => x.c.id);
}

// Carga (una sola vez) la API del reproductor de YouTube.
let ytApiPromise = null;
function loadYouTubeApi() {
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return ytApiPromise;
}

// Reproduce el primer candidato que NO dé error (bloqueo por región/embed) en
// el navegador del visitante. Si ninguno reproduce, deja un link a YouTube.
async function playFirstPlayable(box, ids, query) {
  await loadYouTubeApi();
  if (!document.body.contains(box)) return;
  box.innerHTML = `<div class="yt-frame"><div class="yt-host"></div></div>`;
  const host = box.querySelector(".yt-host");
  let cur = 0;
  const fallback = () => {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    box.innerHTML = `<a class="yt-btn" href="${ytUrl}" target="_blank" rel="noopener">▶ Ver resumen en YouTube</a>
      <p class="watch-note">No se encontró un resumen reproducible en tu país; ábrelo en YouTube.</p>`;
  };
  const player = new YT.Player(host, {
    videoId: ids[0],
    playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
    events: {
      // Errores 2/5/100/101/150 = inválido, no embebible o bloqueado por región.
      onError: () => {
        cur++;
        if (cur < ids.length) player.loadVideoById(ids[cur]);
        else fallback();
      },
    },
  });
}

// Rellena el contenedor: miniatura (clic para reproducir) o link de respaldo.
async function hydrateMatchVideo(box, nh, na) {
  if (!box) return;
  // Prioriza el canal ESPN Fans y su video de RESUMEN; si por región estuviera
  // bloqueado, el reproductor salta al siguiente candidato.
  const query = `${nh} vs ${na} resumen ESPN Mundial 2026`;
  try {
    const ids = await youtubeVideoIds(query);
    if (!document.body.contains(box)) return; // se abrió otro partido
    box.innerHTML = `
      <button class="yt-thumb" aria-label="Reproducir resumen de ${nh} vs ${na}">
        <img src="https://i.ytimg.com/vi/${ids[0]}/hqdefault.jpg" alt="" loading="lazy" />
        <span class="yt-play" aria-hidden="true">▶</span>
        <span class="yt-cap">▶ Resumen y goles · ${nh} vs ${na}</span>
      </button>`;
    box.querySelector(".yt-thumb").addEventListener("click", () => playFirstPlayable(box, ids, query));
  } catch {
    // Respaldo (Live Server / sin función / sin resultado): link a la búsqueda.
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    box.innerHTML = `<a class="yt-btn" href="${ytUrl}" target="_blank" rel="noopener">▶ Ver resumen en YouTube</a>
      <p class="watch-note">El video se incrusta aquí en el sitio publicado; abre YouTube si lo ves en local.</p>`;
  }
}