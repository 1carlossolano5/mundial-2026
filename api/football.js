/* =====================================================================
   Vercel Serverless Function — proxy hacia API-Football (api-sports.io)
   ---------------------------------------------------------------------
   El frontend NUNCA ve la API key. Esta función vive en el servidor,
   lee la clave de una variable de entorno (APIFOOTBALL_KEY) y reenvía
   la petición a API-Football agregando la cabecera de autenticación.

   El frontend llama así:
     /api/football?path=standings&league=1&season=2026
   ===================================================================== */

const API_BASE = "https://v3.football.api-sports.io/";

// Solo permitimos estos endpoints (evita usar el proxy para otra cosa).
const ALLOWED = [
  "teams",
  "players",
  "players/squads",
  "fixtures",
  "standings",
  "venues",
  "leagues",
  "coachs",
];

export default async function handler(req, res) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) {
    return res.status(500).json({
      error:
        "Falta APIFOOTBALL_KEY en el servidor. Configúrala en Vercel (Settings → Environment Variables) o en .env.local para pruebas locales.",
    });
  }

  const { path = "", ...rest } = req.query;
  if (!ALLOWED.includes(path)) {
    return res.status(400).json({ error: "Ruta no permitida." });
  }

  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(rest)) url.searchParams.set(k, v);

  try {
    const r = await fetch(url.toString(), {
      headers: { "x-apisports-key": key },
    });
    const data = await r.json();
    // Caché en el borde de Vercel: muchos usuarios comparten la misma
    // respuesta, así gastamos muy pocas peticiones del límite diario.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "No se pudo conectar con API-Football." });
  }
}
