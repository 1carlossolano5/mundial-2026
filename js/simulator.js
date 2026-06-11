/* =====================================================================
   Simulador del Mundial 2026  (cuadro oficial FIFA)
   ---------------------------------------------------------------------
   Dos modos:
     • Fácil   -> ordenas cada grupo y eliges 8 terceros (clic).
     • Resultados -> metes los marcadores; la tabla y los clasificados
                     se calculan solos (pts -> dif. de gol -> goles).
   Eliminatorias con la estructura OFICIAL (32avos→final): los 1°/2° van
   en slots fijos por letra y los 8 terceros se asignan a sus slots
   permitidos (sin rivales repetidos del mismo grupo).
   Se guarda todo en localStorage.
   ===================================================================== */

const SIM_KEY = "mundial2026_sim_v2";
const $simRoot = document.getElementById("simRoot");

// Calendario de un grupo de 4: 6 partidos (índices de los equipos del grupo).
const SCHEDULE = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];

// --- Estructura OFICIAL de 32avos, EN ORDEN DE CUADRO ---
// p = puesto (1 o 2) de un grupo; t = tercero de uno de esos grupos.
// El orden del array hace que emparejar (0,1),(2,3)... reproduzca el
// cuadro real (16avos, cuartos, semis, final).
const R32 = [
  { a: { p: 1, g: "E" }, b: { t: ["A", "B", "C", "D", "F"] } }, // 74
  { a: { p: 1, g: "I" }, b: { t: ["C", "D", "F", "G", "H"] } }, // 77
  { a: { p: 2, g: "A" }, b: { p: 2, g: "B" } },                 // 73
  { a: { p: 1, g: "F" }, b: { p: 2, g: "C" } },                 // 75
  { a: { p: 2, g: "K" }, b: { p: 2, g: "L" } },                 // 83
  { a: { p: 1, g: "H" }, b: { p: 2, g: "J" } },                 // 84
  { a: { p: 1, g: "D" }, b: { t: ["B", "E", "F", "I", "J"] } }, // 81
  { a: { p: 1, g: "G" }, b: { t: ["A", "E", "H", "I", "J"] } }, // 82
  { a: { p: 1, g: "C" }, b: { p: 2, g: "F" } },                 // 76
  { a: { p: 2, g: "E" }, b: { p: 2, g: "I" } },                 // 78
  { a: { p: 1, g: "A" }, b: { t: ["C", "E", "F", "H", "I"] } }, // 79
  { a: { p: 1, g: "L" }, b: { t: ["E", "H", "I", "J", "K"] } }, // 80
  { a: { p: 1, g: "J" }, b: { p: 2, g: "H" } },                 // 86
  { a: { p: 2, g: "D" }, b: { p: 2, g: "G" } },                 // 88
  { a: { p: 1, g: "B" }, b: { t: ["E", "F", "G", "I", "J"] } }, // 85
  { a: { p: 1, g: "K" }, b: { t: ["D", "E", "I", "J", "L"] } }, // 87
];
const ROUND_NAMES = ["32avos", "16avos", "Cuartos", "Semifinal", "Final"];

// =====================================================================
// ESTADO
// =====================================================================
let sim = loadSim();

function blankSim() {
  return { mode: null, step: "groups", order: {}, scores: {}, thirds: [], picks: {}, kscores: {} };
}
function loadSim() {
  try {
    return Object.assign(blankSim(), JSON.parse(localStorage.getItem(SIM_KEY)) || {});
  } catch {
    return blankSim();
  }
}
function saveSim() {
  localStorage.setItem(SIM_KEY, JSON.stringify(sim));
}
function resetSim() {
  sim = blankSim();
  saveSim();
  renderSim();
}

// =====================================================================
// CÁLCULOS DE GRUPO
// =====================================================================
function group(letter) {
  return GROUPS.find((g) => g.letter === letter);
}

// Tabla calculada de un grupo (modo resultados).
function standingsForGroup(letter) {
  const g = group(letter);
  const st = g.teams.map((t) => ({ team: t, pts: 0, pj: 0, gf: 0, gc: 0, dg: 0 }));
  SCHEDULE.forEach((pair, mi) => {
    const s = sim.scores[`${letter}-${mi}`];
    if (!s || s.h === "" || s.a === "" || s.h == null || s.a == null) return;
    const h = Number(s.h), a = Number(s.a);
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    const [hi, ai] = pair;
    st[hi].pj++; st[ai].pj++;
    st[hi].gf += h; st[hi].gc += a;
    st[ai].gf += a; st[ai].gc += h;
    if (h > a) st[hi].pts += 3;
    else if (h < a) st[ai].pts += 3;
    else { st[hi].pts++; st[ai].pts++; }
  });
  st.forEach((s) => (s.dg = s.gf - s.gc));
  st.sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.team.name.localeCompare(y.team.name));
  return st;
}

// Equipos del grupo en orden de clasificación (según el modo).
function groupRanking(letter) {
  if (sim.mode === "results") return standingsForGroup(letter).map((s) => s.team);
  const g = group(letter);
  return (sim.order[letter] || []).map((i) => g.teams[i]);
}
function teamAt(letter, pos) {
  return groupRanking(letter)[pos] || null;
}

function groupComplete(letter) {
  if (sim.mode === "results") {
    return SCHEDULE.every((_, mi) => {
      const s = sim.scores[`${letter}-${mi}`];
      return s && s.h !== "" && s.a !== "" && s.h != null && s.a != null;
    });
  }
  return (sim.order[letter] || []).length === 4;
}
function allGroupsComplete() {
  return GROUPS.every((g) => groupComplete(g.letter));
}

// Letras de los grupos cuyos terceros clasifican (8).
function qualifiedThirdLetters() {
  if (sim.mode === "easy") return sim.thirds.slice();
  // resultados: ranking de los 12 terceros, top 8
  const arr = GROUPS.map((g) => {
    const s = standingsForGroup(g.letter)[2];
    return { letter: g.letter, pts: s.pts, dg: s.dg, gf: s.gf, name: s.team.name };
  });
  arr.sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.name.localeCompare(y.name));
  return arr.slice(0, 8).map((t) => t.letter);
}

// =====================================================================
// ASIGNACIÓN DE TERCEROS A SUS SLOTS (backtracking, como tabla FIFA)
// =====================================================================
function assignThirds(qualified) {
  const slots = R32.map((m, i) => (m.b.t ? { i, set: m.b.t } : null)).filter(Boolean);
  const used = new Set();
  const result = {};
  function solve(k) {
    if (k === slots.length) return true;
    const slot = slots[k];
    for (const gLetter of slot.set) {
      if (qualified.includes(gLetter) && !used.has(gLetter)) {
        used.add(gLetter);
        result[slot.i] = gLetter;
        if (solve(k + 1)) return true;
        used.delete(gLetter);
        delete result[slot.i];
      }
    }
    return false;
  }
  return solve(0) ? result : null;
}

// =====================================================================
// CONSTRUCCIÓN DEL CUADRO
// =====================================================================
function slotTeam(spec, idx, assign) {
  if (spec.p) return teamAt(spec.g, spec.p - 1);
  const letter = assign ? assign[idx] : null;
  return letter ? teamAt(letter, 2) : null;
}
function buildR32() {
  const assign = assignThirds(qualifiedThirdLetters());
  return R32.map((m, idx) => ({
    a: slotTeam(m.a, idx, assign),
    b: slotTeam(m.b, idx, assign),
  }));
}
// Ganador de una llave. Modo fácil = clic guardado. Modo resultados = por marcador
// (+ penales si hay empate). Devuelve el equipo ganador o null si falta definir.
function matchWinner(r, i, a, b) {
  if (sim.mode === "results") {
    const s = sim.kscores[`${r}-${i}`];
    if (!s || s.h === "" || s.a === "" || s.h == null || s.a == null) return null;
    const hn = Number(s.h), an = Number(s.a);
    if (Number.isNaN(hn) || Number.isNaN(an)) return null;
    if (hn > an) return a;
    if (an > hn) return b;
    if (s.pen && a && a.name === s.pen) return a;
    if (s.pen && b && b.name === s.pen) return b;
    return null; // empate sin penales resueltos
  }
  const name = sim.picks[`${r}-${i}`];
  if (!name) return null;
  if (a && a.name === name) return a;
  if (b && b.name === name) return b;
  return null;
}
function computeRounds() {
  let prev = buildR32().map((m, i) => ({ a: m.a, b: m.b, winner: matchWinner(0, i, m.a, m.b) }));
  const rounds = [prev];
  for (let r = 1; r < 5; r++) {
    const cur = [];
    for (let i = 0; i < prev.length / 2; i++) {
      const a = prev[2 * i].winner, b = prev[2 * i + 1].winner;
      cur.push({ a, b, winner: matchWinner(r, i, a, b) });
    }
    rounds.push(cur);
    prev = cur;
  }
  return rounds;
}

// =====================================================================
// RENDER PRINCIPAL
// =====================================================================
function renderSim() {
  if (!$simRoot) return;
  if (!sim.mode) return renderModePicker();
  if (sim.step === "bracket") return renderBracket();
  if (sim.step === "thirds") return renderThirds();
  return renderGroupsStep();
}

function topBar(active) {
  const steps =
    sim.mode === "results"
      ? [["groups", "1. Resultados"], ["bracket", "2. Eliminatorias"]]
      : [["groups", "1. Grupos"], ["thirds", "2. Terceros"], ["bracket", "3. Eliminatorias"]];
  return `<div class="sim-top">
    <div class="sim-steps">${steps
      .map(([id, l]) => `<span class="sim-step ${id === active ? "is-active" : ""}">${l}</span>`)
      .join("")}</div>
    <button class="sim-reset" id="simReset">↺ Reiniciar / cambiar modo</button>
  </div>`;
}

// ---- Selector de modo ----
function renderModePicker() {
  $simRoot.innerHTML = `
    <p class="sim-hint">Elige cómo quieres simular el Mundial:</p>
    <div class="mode-grid">
      <button class="mode-card" data-mode="easy">
        <div class="mode-card__icon">🟢</div>
        <h3>Modo fácil</h3>
        <p>Ordena cada grupo y elige los clasificados con un clic. Rápido y sin marcadores.</p>
      </button>
      <button class="mode-card" data-mode="results">
        <div class="mode-card__icon">📊</div>
        <h3>Modo con resultados</h3>
        <p>Mete los marcadores de cada partido y la tabla se calcula sola (puntos y diferencia de gol).</p>
      </button>
    </div>`;
  $simRoot.querySelectorAll(".mode-card").forEach((b) =>
    b.addEventListener("click", () => {
      sim = blankSim();
      sim.mode = b.dataset.mode;
      saveSim();
      renderSim();
    })
  );
}

// ---- Paso grupos: MODO FÁCIL (ordenar) ----
function renderGroupsStep() {
  if (sim.mode === "results") return renderScoresStep();
  const done = allGroupsComplete();
  $simRoot.innerHTML = `
    ${topBar("groups")}
    <p class="sim-hint">Haz clic en los equipos en el orden en que crees que terminarán (1° a 4°). 1° y 2° clasifican; el 3° compite por los mejores terceros. Vuelve a tocar un equipo para quitarle el puesto.</p>
    <div class="groups-grid">
      ${GROUPS.map((g) => {
        const order = sim.order[g.letter] || [];
        return `<div class="group-card ${groupComplete(g.letter) ? "is-done" : ""}">
          <div class="group-card__head">Grupo ${g.letter} ${groupComplete(g.letter) ? "✓" : ""}</div>
          ${g.teams
            .map((t, i) => {
              const pos = order.indexOf(i);
              const cls = pos === 0 || pos === 1 ? "q1" : pos === 2 ? "q3" : pos === 3 ? "q4" : "";
              return `<button class="sim-team ${cls}" data-group="${g.letter}" data-idx="${i}">
                <span class="sim-team__pos">${pos === -1 ? "" : pos + 1}</span>
                <img src="${t.img}" alt="${t.name}" loading="lazy" />
                <span class="sim-team__name">${t.name}</span>
              </button>`;
            })
            .join("")}
        </div>`;
      }).join("")}
    </div>
    <div class="sim-actions">
      <button class="btn sim-next" id="simNext" ${done ? "" : "disabled"}><span>Continuar a terceros</span><span class="btn__icon" aria-hidden="true">→</span></button>
    </div>`;

  $simRoot.querySelectorAll(".sim-team").forEach((btn) =>
    btn.addEventListener("click", () => {
      const letter = btn.dataset.group, idx = Number(btn.dataset.idx);
      const order = sim.order[letter] || (sim.order[letter] = []);
      const at = order.indexOf(idx);
      if (at !== -1) order.splice(at, 1);
      else if (order.length < 4) order.push(idx);
      saveSim();
      renderGroupsStep();
    })
  );
  bindCommon();
  document.getElementById("simNext").addEventListener("click", () => {
    sim.step = "thirds"; saveSim(); renderSim();
  });
}

// ---- Paso grupos: MODO RESULTADOS (marcadores) ----
function standingsTable(letter) {
  const st = standingsForGroup(letter);
  return `<table class="stand">
    <tr><th></th><th>Equipo</th><th>PJ</th><th>DG</th><th>Pts</th></tr>
    ${st
      .map(
        (s, i) => `<tr class="${i < 2 ? "q1" : i === 2 ? "q3" : "q4"}">
          <td>${i + 1}</td>
          <td class="stand__team"><img src="${s.team.img}" alt=""><span>${s.team.name}</span></td>
          <td>${s.pj}</td><td>${s.dg > 0 ? "+" + s.dg : s.dg}</td><td><b>${s.pts}</b></td>
        </tr>`
      )
      .join("")}
  </table>`;
}

function renderScoresStep() {
  const done = allGroupsComplete();
  $simRoot.innerHTML = `
    ${topBar("groups")}
    <p class="sim-hint">Escribe el marcador de cada partido. La tabla se actualiza sola; clasifican 1° y 2° de cada grupo + los 8 mejores terceros (por puntos y diferencia de gol).</p>
    <div class="groups-grid groups-grid--wide">
      ${GROUPS.map((g) => {
        const matchesHtml = SCHEDULE.map((pair, mi) => {
          const home = g.teams[pair[0]], away = g.teams[pair[1]];
          const s = sim.scores[`${g.letter}-${mi}`] || {};
          return `<div class="match-row">
            <span class="match-team home"><img src="${home.img}" alt=""><span>${home.name}</span></span>
            <input class="score" type="number" min="0" inputmode="numeric" value="${s.h ?? ""}" data-g="${g.letter}" data-m="${mi}" data-s="h" aria-label="Goles ${home.name}" />
            <span class="vs">-</span>
            <input class="score" type="number" min="0" inputmode="numeric" value="${s.a ?? ""}" data-g="${g.letter}" data-m="${mi}" data-s="a" aria-label="Goles ${away.name}" />
            <span class="match-team away"><span>${away.name}</span><img src="${away.img}" alt=""></span>
          </div>`;
        }).join("");
        return `<div class="group-card ${groupComplete(g.letter) ? "is-done" : ""}">
          <div class="group-card__head">Grupo ${g.letter} ${groupComplete(g.letter) ? "✓" : ""}</div>
          <div class="standings" id="st-${g.letter}">${standingsTable(g.letter)}</div>
          <div class="matches">${matchesHtml}</div>
        </div>`;
      }).join("")}
    </div>
    <div class="sim-actions">
      <button class="btn sim-next" id="simNext" ${done ? "" : "disabled"}><span>Ir a las eliminatorias</span><span class="btn__icon" aria-hidden="true">→</span></button>
    </div>`;

  // Actualizar SOLO la tabla afectada al escribir (no re-renderizar inputs -> no se pierde el foco).
  $simRoot.querySelectorAll("input.score").forEach((inp) =>
    inp.addEventListener("input", () => {
      const key = `${inp.dataset.g}-${inp.dataset.m}`;
      const s = sim.scores[key] || (sim.scores[key] = { h: "", a: "" });
      s[inp.dataset.s] = inp.value;
      saveSim();
      const stEl = document.getElementById("st-" + inp.dataset.g);
      if (stEl) stEl.innerHTML = standingsTable(inp.dataset.g);
      const card = inp.closest(".group-card");
      if (card) card.classList.toggle("is-done", groupComplete(inp.dataset.g));
      const next = document.getElementById("simNext");
      if (next) next.disabled = !allGroupsComplete();
    })
  );
  bindCommon();
  document.getElementById("simNext").addEventListener("click", () => {
    sim.step = "bracket"; saveSim(); renderSim();
  });
}

// ---- Paso terceros (solo modo fácil) ----
function renderThirds() {
  $simRoot.innerHTML = `
    ${topBar("thirds")}
    <p class="sim-hint">Elige los <b>8 mejores terceros</b> que avanzan (${sim.thirds.length}/8).</p>
    <div class="thirds-grid">
      ${GROUPS.map((g) => {
        const t = teamAt(g.letter, 2);
        const sel = sim.thirds.includes(g.letter);
        return `<button class="third-card ${sel ? "is-sel" : ""}" data-group="${g.letter}">
          <img src="${t.img}" alt="${t.name}" loading="lazy" />
          <span class="third-card__name">${t.name}</span>
          <span class="third-card__group">3° Grupo ${g.letter}</span>
          <span class="third-card__check">${sel ? "✓" : ""}</span>
        </button>`;
      }).join("")}
    </div>
    <div class="sim-actions">
      <button class="btn btn--ghost sim-back" id="simBack"><span class="btn__icon" aria-hidden="true">←</span><span>Volver</span></button>
      <button class="btn sim-next" id="simNext" ${sim.thirds.length === 8 ? "" : "disabled"}><span>Armar eliminatorias</span><span class="btn__icon" aria-hidden="true">→</span></button>
    </div>`;

  $simRoot.querySelectorAll(".third-card").forEach((btn) =>
    btn.addEventListener("click", () => {
      const letter = btn.dataset.group;
      const at = sim.thirds.indexOf(letter);
      if (at !== -1) sim.thirds.splice(at, 1);
      else if (sim.thirds.length < 8) sim.thirds.push(letter);
      saveSim();
      renderThirds();
    })
  );
  bindCommon();
  document.getElementById("simBack").addEventListener("click", () => { sim.step = "groups"; saveSim(); renderSim(); });
  document.getElementById("simNext").addEventListener("click", () => { sim.step = "bracket"; saveSim(); renderSim(); });
}

// ---- Paso eliminatorias ----
// Modo fácil: equipo clicable
function teamSlot(team, m, r, i) {
  if (!team) return `<div class="bracket-team is-empty">Por definir</div>`;
  const win = m.winner && m.winner.name === team.name;
  return `<button class="bracket-team ${win ? "is-winner" : ""}" data-r="${r}" data-i="${i}" data-name="${team.name}">
    <img src="${team.img}" alt=""><span>${team.name}</span>
  </button>`;
}
// Modo resultados: marcador por llave + penales si hay empate
function bracketScoreMatch(m, r, i) {
  if (!m.a || !m.b) {
    const stat = (t) => (t
      ? `<div class="bracket-team"><img src="${t.img}" alt=""><span>${t.name}</span></div>`
      : `<div class="bracket-team is-empty">Por definir</div>`);
    return `<div class="bracket-match">${stat(m.a)}${stat(m.b)}</div>`;
  }
  const s = sim.kscores[`${r}-${i}`] || {};
  const win = m.winner;
  const lleno = s.h !== "" && s.a !== "" && s.h != null && s.a != null;
  const empate = lleno && Number(s.h) === Number(s.a);
  const row = (team, side) => `
    <div class="bk-row ${win && win.name === team.name ? "is-winner" : ""}">
      <img src="${team.img}" alt="" /><span>${team.name}</span>
      <input class="bk-input" type="number" min="0" inputmode="numeric" value="${s[side] ?? ""}" data-r="${r}" data-i="${i}" data-side="${side}" aria-label="Goles ${team.name}" />
    </div>`;
  return `<div class="bracket-match bk-match">
    ${row(m.a, "h")}
    ${row(m.b, "a")}
    ${empate ? `<div class="bk-pen">
      <span>Empate · pasa por penales:</span>
      <div class="bk-pen__btns">
        <button class="bk-pen-btn ${s.pen === m.a.name ? "is-on" : ""}" data-pen="${m.a.name}" data-r="${r}" data-i="${i}">${m.a.name}</button>
        <button class="bk-pen-btn ${s.pen === m.b.name ? "is-on" : ""}" data-pen="${m.b.name}" data-r="${r}" data-i="${i}">${m.b.name}</button>
      </div>
    </div>` : ""}
  </div>`;
}
function renderBracket() {
  const rounds = computeRounds();
  const champ = rounds[4][0].winner;
  const results = sim.mode === "results";
  $simRoot.innerHTML = `
    ${topBar("bracket")}
    <p class="sim-hint">${results
      ? "Mete el marcador de cada llave. Si hay empate, elige quién pasa por <b>penales</b>. 🏆 (Cuadro oficial FIFA 2026.)"
      : "Haz clic en quien gana cada llave hasta el campeón. 🏆 (Cuadro oficial FIFA 2026.)"}</p>
    ${
      champ
        ? `<div class="champion"><span>🏆 Tu campeón del Mundial</span>
            <div class="champion__team"><img src="${champ.img}" alt=""><b>${champ.name}</b></div></div>`
        : ""
    }
    <div class="bracket">
      ${rounds
        .map(
          (matches, r) => `<div class="bracket__col">
            <div class="bracket__round">${ROUND_NAMES[r]}</div>
            ${matches.map((m, i) => results ? bracketScoreMatch(m, r, i) : `<div class="bracket-match">${teamSlot(m.a, m, r, i)}${teamSlot(m.b, m, r, i)}</div>`).join("")}
          </div>`
        )
        .join("")}
    </div>
    <div class="sim-actions">
      <button class="btn btn--ghost sim-back" id="simBack"><span class="btn__icon" aria-hidden="true">←</span><span>Volver</span></button>
    </div>`;

  if (results) {
    // Marcadores: recalculamos al salir del campo (change) para no perder el foco.
    $simRoot.querySelectorAll(".bk-input").forEach((inp) =>
      inp.addEventListener("change", () => {
        const key = `${inp.dataset.r}-${inp.dataset.i}`;
        const s = sim.kscores[key] || (sim.kscores[key] = { h: "", a: "", pen: null });
        s[inp.dataset.side] = inp.value;
        if (s.h !== "" && s.a !== "" && Number(s.h) !== Number(s.a)) s.pen = null;
        saveSim();
        renderBracket();
      })
    );
    $simRoot.querySelectorAll(".bk-pen-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        const key = `${btn.dataset.r}-${btn.dataset.i}`;
        const s = sim.kscores[key] || (sim.kscores[key] = { h: "", a: "", pen: null });
        s.pen = btn.dataset.pen;
        saveSim();
        renderBracket();
      })
    );
  } else {
    $simRoot.querySelectorAll(".bracket-team[data-name]").forEach((btn) =>
      btn.addEventListener("click", () => {
        sim.picks[`${btn.dataset.r}-${btn.dataset.i}`] = btn.dataset.name;
        saveSim();
        renderBracket();
      })
    );
  }
  bindCommon();
  document.getElementById("simBack").addEventListener("click", () => {
    sim.step = sim.mode === "results" ? "groups" : "thirds";
    saveSim();
    renderSim();
  });
}

function bindCommon() {
  const r = document.getElementById("simReset");
  if (r) r.addEventListener("click", resetSim);
}

renderSim();
