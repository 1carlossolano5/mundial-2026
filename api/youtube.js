/* =====================================================================
   Vercel Serverless Function — busca el resumen de un partido en YouTube
   ---------------------------------------------------------------------
   Sin API key: pide la página de resultados de YouTube (filtrada a videos)
   y extrae el primer videoId. Se hace en el servidor porque YouTube no
   permite leerla desde el navegador (CORS). El frontend luego incrusta
   https://www.youtube.com/embed/<videoId>.

   Devuelve VARIOS candidatos; el frontend prueba cada uno con el reproductor
   de YouTube y se queda con el primero que sí reproduce en el país del visitante
   (algunos resúmenes están bloqueados por región al incrustarse).

   Uso:  /api/youtube?q=México vs Sudáfrica resumen Mundial 2026
   ===================================================================== */

export default async function handler(req, res) {
  const q = (req.query.q || "").toString().slice(0, 120);
  if (!q) return res.status(400).json({ error: "Falta el parámetro q." });

  // Región del visitante (Vercel la inyecta); por defecto Colombia.
  const country = (req.headers["x-vercel-ip-country"] || "CO").toString().slice(0, 2);

  // sp=EgIQAQ%3D%3D = filtro "tipo: video"; hl/gl + cookie CONSENT evitan el
  // muro de consentimiento que YouTube muestra a algunos servidores.
  const url =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(q) +
    "&sp=EgIQAQ%253D%253D&hl=es&gl=" +
    encodeURIComponent(country);

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "es-CO,es;q=0.9",
        Cookie: "CONSENT=YES+cb",
      },
    });
    const html = await r.text();
    // Cada videoRenderer trae su videoId y su título juntos; los emparejamos
    // por bloque para poder filtrar por el nº de partido ("M1", "M2"… de ESPN).
    const candidates = [];
    for (const chunk of html.split('"videoRenderer":').slice(1)) {
      const id = chunk.match(/"videoId":"([\w-]{11})"/);
      if (!id || candidates.some((c) => c.id === id[1])) continue;
      const title = chunk.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
      candidates.push({ id: id[1], title: title ? title[1] : "" });
      if (candidates.length >= 8) break;
    }
    // Los resúmenes no cambian una vez publicados: cache larga.
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({
      candidates,
      ids: candidates.map((c) => c.id),
      videoId: candidates[0] ? candidates[0].id : null,
    });
  } catch (err) {
    return res.status(502).json({ error: "No se pudo buscar el video." });
  }
}
