/* =====================================================================
   Vercel Serverless Function — proxy hacia la API pública de FIFA
   ---------------------------------------------------------------------
   api.fifa.com publica gratis el detalle completo del Mundial 2026:
   alineaciones (26 jugadores con foto), táctica, técnico, árbitro y el
   minuto a minuto (goles, tarjetas, cambios) ya traducido al español.
   No requiere clave. Este proxy cachea y evita problemas de CORS.

   El frontend llama así:
     /api/fifa?path=timelines/17/285023/289273/400021443
   ===================================================================== */

const BASE = "https://api.fifa.com/api/v3/";

// Solo permitimos estas rutas de la API de FIFA.
const ALLOWED = [
  /^calendar\/matches$/,
  /^live\/football\/\d+\/\d+\/\d+\/\d+$/,
  /^timelines\/\d+\/\d+\/\d+\/\d+$/,
  /^teams\/\d+\/squad$/,
];

export default async function handler(req, res) {
  const { path = "", ...rest } = req.query;
  if (!ALLOWED.some((re) => re.test(path))) {
    return res.status(400).json({ error: "Ruta no permitida." });
  }

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(rest)) url.searchParams.set(k, v);
  if (!url.searchParams.has("language")) url.searchParams.set("language", "es");

  try {
    const r = await fetch(url.toString());
    const data = await r.json();
    // 30s: suficiente para "en vivo" sin golpear la API de FIFA.
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "No se pudo conectar con la API de FIFA." });
  }
}
