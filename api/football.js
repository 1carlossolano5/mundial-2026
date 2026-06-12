/* =====================================================================
   Vercel Serverless Function — proxy hacia TheSportsDB
   ---------------------------------------------------------------------
   TheSportsDB tiene datos del Mundial 2026 (liga 4429): partidos, estadios,
   escudos, resultados y jugadores con foto. La clave gratuita es pública
   ("3"); igual usamos este proxy para cachear y evitar problemas de CORS.

   El frontend llama así:
     /api/football?path=eventsseason.php&id=4429&s=2026
   ===================================================================== */

const KEY = process.env.SPORTSDB_KEY || "3"; // "3" = clave pública de prueba
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}/`;

// Solo permitimos estos endpoints de TheSportsDB.
const ALLOWED = [
  "eventsseason.php",   // partidos de una temporada
  "eventsround.php",    // partidos por jornada
  "eventsnextleague.php",
  "eventspastleague.php",
  "eventslast.php",     // últimos partidos de un equipo
  "lookuptable.php",    // tabla de posiciones
  "lookup_all_players.php", // jugadores de un equipo (con foto)
  "lookupteam.php",     // info de un equipo
  "lookupplayer.php",   // info de un jugador
  "lookupevent.php",    // info de un partido
  "lookuplineup.php",   // alineaciones de un partido
  "lookuptimeline.php", // goles, tarjetas y cambios de un partido
  "lookupeventstats.php", // estadísticas de un partido
  "searchteams.php",    // buscar un equipo por nombre
];

export default async function handler(req, res) {
  const { path = "", ...rest } = req.query;
  if (!ALLOWED.includes(path)) {
    return res.status(400).json({ error: "Ruta no permitida." });
  }

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(rest)) url.searchParams.set(k, v);

  try {
    const r = await fetch(url.toString());
    const data = await r.json();
    // Caché en el borde de Vercel: comparte respuestas entre usuarios.
    // 60s para que los resultados en vivo se refresquen rápido.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "No se pudo conectar con TheSportsDB." });
  }
}
