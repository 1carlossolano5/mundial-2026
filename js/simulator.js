/* =====================================================================
   Simulador del Mundial 2026
   Formato: 12 grupos -> 1° y 2° clasifican + 8 mejores terceros = 32
   -> eliminatorias (32avos -> 16avos -> cuartos -> semis -> final).
   El usuario predice todo; se guarda en localStorage.
   ===================================================================== */

const SIM_KEY = "mundial2026_sim";
const $simRoot = document.getElementById("simRoot");

let sim = loadSim();

function blankSim() {
  return { step: "groups", order: {}, thirds: [], picks: {} };
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

// Equipo en la posición `pos` (0-3) del grupo `letter`, según el orden elegido.
function teamAt(letter, pos) {
  const g = GROUPS.find((x) => x.letter === letter);
  const order = sim.order[letter] || [];
  const idx = order[pos];
  return idx == null ? null : g.teams[idx];
}

function groupDone(letter) {
  return (sim.order[letter] || []).length === 4;
}
function allGroupsDone() {
  return GROUPS.every((g) => groupDone(g.letter));
}

// =====================================================================
// RENDER PRINCIPAL
// =====================================================================
function renderSim() {
  if (!$simRoot) return;
  if (sim.step === "bracket") return renderBracket();
  if (sim.step === "thirds") return renderThirds();
  return renderGroupsStep();
}

function stepsBar(active) {
  const steps = [
    ["groups", "1. Grupos"],
    ["thirds", "2. Mejores terceros"],
    ["bracket", "3. Eliminatorias"],
  ];
  return `<div class="sim-steps">${steps
    .map(
      ([id, label]) =>
        `<span class="sim-step ${id === active ? "is-active" : ""}">${label}</span>`
    )
    .join("")}</div>
    <button class="sim-reset" id="simReset">↺ Reiniciar</button>`;
}

// =====================================================================
// PASO 1 — GRUPOS (ordenar 1°→4°)
// =====================================================================
function renderGroupsStep() {
  const done = allGroupsDone();
  $simRoot.innerHTML = `
    ${stepsBar("groups")}
    <p class="sim-hint">Haz clic en los equipos en el orden en que crees que quedarán (1° a 4°). El 1° y 2° clasifican; el 3° compite por los mejores terceros. Vuelve a tocar un equipo para quitarle el puesto.</p>
    <div class="groups-grid">
      ${GROUPS.map((g) => {
        const order = sim.order[g.letter] || [];
        return `<div class="group-card ${groupDone(g.letter) ? "is-done" : ""}">
          <div class="group-card__head">Grupo ${g.letter} ${groupDone(g.letter) ? "✓" : ""}</div>
          ${g.teams
            .map((t, i) => {
              const pos = order.indexOf(i); // -1 si no está
              const rank = pos === -1 ? "" : pos + 1;
              const cls = pos === 0 || pos === 1 ? "q1" : pos === 2 ? "q3" : pos === 3 ? "q4" : "";
              return `<button class="sim-team ${cls}" data-group="${g.letter}" data-idx="${i}">
                <span class="sim-team__pos">${rank}</span>
                <img src="${t.img}" alt="${t.name}" loading="lazy" />
                <span class="sim-team__name">${t.name}</span>
              </button>`;
            })
            .join("")}
        </div>`;
      }).join("")}
    </div>
    <div class="sim-actions">
      <button class="sim-next" id="simToThirds" ${done ? "" : "disabled"}>
        Continuar a mejores terceros →
      </button>
    </div>
  `;

  // Clic en equipo: asignar/quitar puesto
  $simRoot.querySelectorAll(".sim-team").forEach((btn) => {
    btn.addEventListener("click", () => {
      const letter = btn.dataset.group;
      const idx = Number(btn.dataset.idx);
      const order = sim.order[letter] || (sim.order[letter] = []);
      const at = order.indexOf(idx);
      if (at !== -1) order.splice(at, 1); // quitar
      else if (order.length < 4) order.push(idx); // asignar siguiente puesto
      saveSim();
      renderGroupsStep();
    });
  });

  document.getElementById("simReset").addEventListener("click", resetSim);
  document.getElementById("simToThirds").addEventListener("click", () => {
    sim.step = "thirds";
    saveSim();
    renderSim();
  });
}

// =====================================================================
// PASO 2 — MEJORES TERCEROS (elegir 8 de 12)
// =====================================================================
function renderThirds() {
  $simRoot.innerHTML = `
    ${stepsBar("thirds")}
    <p class="sim-hint">Elige los <b>8 mejores terceros</b> que avanzan a la fase final (${sim.thirds.length}/8 seleccionados).</p>
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
      <button class="sim-back" id="simBackGroups">← Volver a grupos</button>
      <button class="sim-next" id="simToBracket" ${sim.thirds.length === 8 ? "" : "disabled"}>
        Armar eliminatorias →
      </button>
    </div>
  `;

  $simRoot.querySelectorAll(".third-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const letter = btn.dataset.group;
      const at = sim.thirds.indexOf(letter);
      if (at !== -1) sim.thirds.splice(at, 1);
      else if (sim.thirds.length < 8) sim.thirds.push(letter);
      saveSim();
      renderThirds();
    });
  });

  document.getElementById("simReset").addEventListener("click", resetSim);
  document.getElementById("simBackGroups").addEventListener("click", () => {
    sim.step = "groups";
    saveSim();
    renderSim();
  });
  document.getElementById("simToBracket").addEventListener("click", () => {
    sim.step = "bracket";
    saveSim();
    renderSim();
  });
}

// =====================================================================
// PASO 3 — ELIMINATORIAS (bracket)
// =====================================================================
const ROUND_NAMES = ["32avos", "16avos", "Cuartos", "Semis", "Final"];

// Construye los 16 partidos de 32avos a partir de los clasificados.
function buildR32() {
  const winners = GROUPS.map((g) => teamAt(g.letter, 0));
  const runners = GROUPS.map((g) => teamAt(g.letter, 1));
  const thirds = sim.thirds.map((letter) => teamAt(letter, 2));
  const others = [...runners, ...thirds]; // 12 + 8 = 20
  const matches = [];
  for (let i = 0; i < 12; i++) matches.push({ a: winners[i], b: others[i] });
  for (let j = 0; j < 4; j++) matches.push({ a: others[12 + 2 * j], b: others[12 + 2 * j + 1] });
  return matches; // 16 partidos
}

// Ganador válido guardado para el partido (round r, índice i), o null.
function pickOf(r, i, a, b) {
  const name = sim.picks[`${r}-${i}`];
  if (!name) return null;
  if (a && a.name === name) return a;
  if (b && b.name === name) return b;
  return null; // el pick ya no es válido (cambió un resultado anterior)
}

// Devuelve los partidos de una ronda (con a, b, winner ya calculados).
function computeRounds() {
  const r32 = buildR32();
  const rounds = [];
  // Ronda 0
  let prev = r32.map((m, i) => ({ a: m.a, b: m.b, winner: pickOf(0, i, m.a, m.b) }));
  rounds.push(prev);
  // Rondas siguientes
  for (let r = 1; r < 5; r++) {
    const count = prev.length / 2;
    const cur = [];
    for (let i = 0; i < count; i++) {
      const a = prev[2 * i].winner;
      const b = prev[2 * i + 1].winner;
      cur.push({ a, b, winner: pickOf(r, i, a, b) });
    }
    rounds.push(cur);
    prev = cur;
  }
  return rounds;
}

function renderBracket() {
  const rounds = computeRounds();
  const champion = rounds[4][0].winner;

  $simRoot.innerHTML = `
    ${stepsBar("bracket")}
    <p class="sim-hint">Haz clic en el equipo que crees que gana cada llave, hasta llegar al campeón. 🏆</p>
    ${
      champion
        ? `<div class="champion"><span>🏆 Tu campeón del Mundial</span>
            <div class="champion__team"><img src="${champion.img}" alt="${champion.name}" /><b>${champion.name}</b></div></div>`
        : ""
    }
    <div class="bracket">
      ${rounds
        .map(
          (matches, r) => `
        <div class="bracket__col">
          <div class="bracket__round">${ROUND_NAMES[r]}</div>
          ${matches
            .map((m, i) => matchHtml(m, r, i))
            .join("")}
        </div>`
        )
        .join("")}
    </div>
    <div class="sim-actions">
      <button class="sim-back" id="simBackThirds">← Volver a terceros</button>
    </div>
  `;

  $simRoot.querySelectorAll(".bracket-team[data-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const r = btn.dataset.r;
      const i = btn.dataset.i;
      sim.picks[`${r}-${i}`] = btn.dataset.name;
      saveSim();
      renderBracket();
    });
  });

  document.getElementById("simReset").addEventListener("click", resetSim);
  document.getElementById("simBackThirds").addEventListener("click", () => {
    sim.step = "thirds";
    saveSim();
    renderSim();
  });
}

function teamSlot(team, m, r, i) {
  if (!team) return `<div class="bracket-team is-empty">Por definir</div>`;
  const isWinner = m.winner && m.winner.name === team.name;
  return `<button class="bracket-team ${isWinner ? "is-winner" : ""}" data-pick data-r="${r}" data-i="${i}" data-name="${team.name}">
    <img src="${team.img}" alt="${team.name}" />
    <span>${team.name}</span>
  </button>`;
}

function matchHtml(m, r, i) {
  return `<div class="bracket-match">
    ${teamSlot(m.a, m, r, i)}
    ${teamSlot(m.b, m, r, i)}
  </div>`;
}

// Inicializa (renderiza por si la sección ya está visible).
renderSim();
