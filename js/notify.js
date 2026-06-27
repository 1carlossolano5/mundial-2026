/* =====================================================================
   Mundial 2026 - Recordatorios y avisos de partido
   ---------------------------------------------------------------------
   Avisa (mientras la página está abierta, aunque sea en una pestaña de
   fondo) de: faltan 10 min, arrancó, gol, tarjeta roja/amarilla y final.
   - Solo de los partidos que el usuario decide SEGUIR (botón 🔔 en el modal).
   - Cada evento se avisa UNA sola vez (sin spam).
   - Amarillas apagadas por defecto (son las más frecuentes).
   - "Agregar al calendario" (.ics) sirve como recordatorio aun con la
     página cerrada (lo maneja el calendario del teléfono).

   Depende de globals de otros módulos: fifaCalendar, fifaApi, fifaState,
   loc, FIFA_COMP, FIFA_SEASON, FIFA_EV_ICON, fifaCalPromise.
   ===================================================================== */
const Notify = (function () {
  const K_FOLLOW = "mundial2026_follow";
  const K_SETT = "mundial2026_notify_settings";
  const K_STATE = "mundial2026_notify_state";
  const POLL_MS = 45000;

  const DEFAULT_SETT = { previo: true, inicio: true, goles: true, rojas: true, amarillas: false, final: true };

  const read = (k, def) => {
    try { return JSON.parse(localStorage.getItem(k)) || def; } catch { return def; }
  };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const getFollow = () => read(K_FOLLOW, {});
  const getSett = () => Object.assign({}, DEFAULT_SETT, read(K_SETT, {}));
  const getState = () => read(K_STATE, {});

  function isFollowing(id) { return !!getFollow()[id]; }

  function follow(meta) {
    const f = getFollow();
    f[meta.id] = { id: meta.id, stage: meta.stage, ts: meta.ts, home: meta.home, away: meta.away };
    write(K_FOLLOW, f);
    requestPermission();
    renderPanel();
    tick(); // chequeo inmediato (p. ej. si ya faltan <10 min)
  }
  function unfollow(id) {
    const f = getFollow(); delete f[id]; write(K_FOLLOW, f);
    const st = getState(); delete st[id]; write(K_STATE, st);
    renderPanel();
  }
  function toggle(meta) {
    if (isFollowing(meta.id)) unfollow(meta.id);
    else follow(meta);
    return isFollowing(meta.id);
  }

  // --- Permiso de notificaciones del sistema ---
  function requestPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then(renderPanel).catch(() => {});
    }
  }

  // --- Mostrar un aviso (toast en página + notificación del sistema si la pestaña no está visible) ---
  function emit(title, body, tag) {
    const visible = document.visibilityState === "visible";
    if (!visible && "Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification(title, { body, tag, icon: "/img/icons/icon-192.png", badge: "/img/icons/icon-192.png" });
        n.onclick = () => { window.focus(); n.close(); };
        return;
      } catch {}
    }
    toast(title, body);
  }

  function toast(title, body) {
    let wrap = document.getElementById("toastWrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toastWrap";
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = `<b class="toast__title"></b><span class="toast__body"></span><button class="toast__x" aria-label="Cerrar">✕</button>`;
    el.querySelector(".toast__title").textContent = title;
    el.querySelector(".toast__body").textContent = body || "";
    wrap.appendChild(el);
    const close = () => { el.classList.add("toast--out"); setTimeout(() => el.remove(), 300); };
    el.querySelector(".toast__x").addEventListener("click", close);
    setTimeout(close, 8000);
  }

  // --- Sondeo: detecta y dispara los avisos ---
  let timer = null;
  function startPoller() {
    if (timer) return;
    timer = setInterval(tick, POLL_MS);
  }

  async function tick() {
    const follow = getFollow();
    const ids = Object.keys(follow);
    if (!ids.length) return;
    const sett = getSett();
    const st = getState();

    let cal;
    try {
      if (typeof fifaCalPromise !== "undefined") fifaCalPromise = null; // forzar datos frescos
      cal = await fifaCalendar();
    } catch { return; }
    const byId = {};
    for (const m of cal) byId[m.id] = m;
    const now = Date.now();

    for (const id of ids) {
      const m = byId[id] || follow[id];
      const s = (st[id] = st[id] || { pre10: false, started: false, final: false, seen: [] });
      const estado = typeof fifaState === "function" ? fifaState(m.status) : (m.status === 0 ? "fin" : m.status === 3 || m.status === 12 ? "live" : "prog");
      const partido = `${m.home || follow[id].home} vs ${m.away || follow[id].away}`;
      const ts = m.ts || follow[id].ts;

      // Faltan 10 min
      if (sett.previo && estado === "prog" && ts && ts - now > 0 && ts - now <= 10 * 60000 && !s.pre10) {
        s.pre10 = true; emit("⏳ Faltan 10 minutos", partido, "pre-" + id);
      }
      // Arrancó
      if (sett.inicio && estado === "live" && !s.started) {
        s.started = true; emit("🟢 ¡Arrancó el partido!", partido, "start-" + id);
      }
      // Eventos en vivo (gol / tarjetas)
      if (estado === "live" && m.stage) {
        let events = [];
        try { events = await fifaApi(`timelines/${FIFA_COMP}/${FIFA_SEASON}/${m.stage}/${m.id}`).then((d) => d.Event || []); } catch {}
        for (const e of events) {
          const tipoOn = (e.Type === 0 && sett.goles) || (e.Type === 3 && sett.rojas) || (e.Type === 2 && sett.amarillas);
          if (!tipoOn) continue;
          const key = `${e.Type}|${e.MatchMinute || ""}|${e.IdPlayer || ""}|${(typeof loc === "function" ? loc(e.EventDescription) : "")}`;
          if (s.seen.includes(key)) continue;
          s.seen.push(key);
          const ico = (typeof FIFA_EV_ICON !== "undefined" && FIFA_EV_ICON[e.Type]) || "•";
          const titulo = e.Type === 0 ? `${ico} ¡Gol!` : e.Type === 3 ? `${ico} Tarjeta roja` : `${ico} Tarjeta amarilla`;
          const desc = (typeof loc === "function" && loc(e.EventDescription)) || partido;
          emit(`${titulo} · ${partido}`, `${e.MatchMinute ? e.MatchMinute + " · " : ""}${desc}`, key);
        }
      }
      // Final
      if (sett.final && estado === "fin" && !s.final) {
        s.final = true;
        const marcador = m.homeScore != null && m.awayScore != null ? ` ${m.homeScore}-${m.awayScore}` : "";
        emit("🏁 Final del partido", `${partido}${marcador}`, "final-" + id);
        unfollow(id); // se quita solo para no acumular partidos viejos
      }
    }
    write(K_STATE, st);
  }

  // --- Descarga .ics (recordatorio en el calendario del teléfono) ---
  function downloadIcs(meta) {
    const start = new Date(Number(meta.ts));
    if (isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + 2 * 60 * 60000);
    const fmt = (d) =>
      d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z";
    const pad = (n) => String(n).padStart(2, "0");
    const title = `⚽ ${meta.home} vs ${meta.away} · Mundial 2026`;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mundial2026//ES",
      "BEGIN:VEVENT",
      "UID:m" + meta.ts + "-" + (meta.id || "") + "@mundial2026",
      "DTSTAMP:" + fmt(new Date(Number(meta.ts))),
      "DTSTART:" + fmt(start), "DTEND:" + fmt(end),
      "SUMMARY:" + title,
      meta.venue ? "LOCATION:" + String(meta.venue).replace(/[,;]/g, " ") : "",
      "DESCRIPTION:Partido del Mundial 2026.",
      "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:" + title, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mundial-${(meta.home || "partido").toLowerCase()}-${(meta.away || "").toLowerCase()}.ics`.replace(/\s+/g, "-");
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("📅 Recordatorio listo", "Ábrelo para agregarlo a tu calendario.");
  }

  // --- Panel de ajustes (sección Calendario) ---
  const SETT_LABELS = [
    ["previo", "⏳ Aviso 10 min antes"],
    ["inicio", "🟢 Cuando arranca"],
    ["goles", "⚽ Goles"],
    ["rojas", "🟥 Tarjetas rojas"],
    ["amarillas", "🟨 Tarjetas amarillas"],
    ["final", "🏁 Final del partido"],
  ];
  function renderPanel() {
    const panel = document.getElementById("notifyPanel");
    if (!panel) return;
    const sett = getSett();
    const follow = getFollow();
    const ids = Object.keys(follow);
    const permiso = "Notification" in window ? Notification.permission : "unsupported";
    const permisoMsg =
      permiso === "granted" ? `<span class="np-ok">✓ Permiso concedido</span>`
      : permiso === "denied" ? `<span class="np-warn">Permiso bloqueado — solo verás avisos dentro de la página.</span>`
      : permiso === "unsupported" ? `<span class="np-warn">Tu navegador no soporta notificaciones del sistema.</span>`
      : `<button class="np-perm" id="notifyPerm">Activar notificaciones del sistema</button>`;

    panel.innerHTML = `
      <div class="np-head"><b>🔔 Avisos de partido</b><button class="np-x" id="notifyClose" aria-label="Cerrar">✕</button></div>
      <p class="np-note">Te avisamos de los partidos que sigas (botón 🔔 al abrir un partido), <b>mientras esta página esté abierta</b>.</p>
      <div class="np-perm-row">${permisoMsg}</div>
      <div class="np-toggles">
        ${SETT_LABELS.map(([k, label]) => `
          <label class="np-toggle">
            <input type="checkbox" data-sett="${k}" ${sett[k] ? "checked" : ""} />
            <span>${label}</span>
          </label>`).join("")}
      </div>
      <div class="np-follow">
        <b>Siguiendo (${ids.length})</b>
        ${ids.length
          ? ids.map((id) => `<div class="np-foll-row"><span>${follow[id].home} vs ${follow[id].away}</span><button class="np-unfoll" data-unfollow="${id}" aria-label="Dejar de seguir">✕</button></div>`).join("")
          : `<p class="np-empty">Aún no sigues ningún partido. Abre un partido y toca 🔔 Seguir.</p>`}
      </div>`;
  }

  // --- Cableado de eventos (delegación, sobrevive a innerHTML) ---
  function wire() {
    // Botón "🔔 Notificaciones" en la sección Calendario
    document.addEventListener("click", (e) => {
      const open = e.target.closest("#notifyOpen");
      if (open) { const p = document.getElementById("notifyPanel"); if (p) { renderPanel(); p.hidden = !p.hidden; } return; }
      if (e.target.closest("#notifyClose")) { document.getElementById("notifyPanel").hidden = true; return; }
      if (e.target.closest("#notifyPerm")) { requestPermission(); return; }

      // Seguir / dejar de seguir desde el modal del partido
      const fb = e.target.closest(".mm-act--follow");
      if (fb) {
        const meta = { id: fb.dataset.mid, stage: fb.dataset.mstage, ts: Number(fb.dataset.mts), home: fb.dataset.mh, away: fb.dataset.ma };
        const on = toggle(meta);
        fb.classList.toggle("is-on", on);
        fb.querySelector(".mm-act__ico").textContent = on ? "🔕" : "🔔";
        fb.querySelector(".mm-act__txt").textContent = on ? "Siguiendo" : "Seguir partido";
        toast(on ? "🔔 Siguiendo este partido" : "🔕 Dejaste de seguirlo", on ? "Te avisaremos de los eventos." : "");
        return;
      }
      // Agregar al calendario (.ics)
      const ics = e.target.closest(".mm-act--ics");
      if (ics) { downloadIcs({ id: ics.dataset.mid, ts: Number(ics.dataset.mts), home: ics.dataset.mh, away: ics.dataset.ma, venue: ics.dataset.mvenue }); return; }

      // Quitar de la lista (panel)
      const un = e.target.closest("[data-unfollow]");
      if (un) { unfollow(un.dataset.unfollow); return; }
    });

    // Toggles de ajustes
    document.addEventListener("change", (e) => {
      const cb = e.target.closest("[data-sett]");
      if (!cb) return;
      const sett = getSett(); sett[cb.dataset.sett] = cb.checked; write(K_SETT, sett);
    });
  }

  function init() {
    wire();
    renderPanel();
    startPoller();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { isFollowing, follow, unfollow, toggle, downloadIcs };
})();
