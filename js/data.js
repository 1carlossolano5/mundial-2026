/* =====================================================================
   Datos fijos del Mundial 2026 — sorteo oficial (12 grupos x 4)
   ---------------------------------------------------------------------
   Estos datos no dependen de ninguna API, así que los Grupos y el
   Simulador siempre funcionan completos. Los resultados y fotos en vivo
   se traen aparte desde TheSportsDB.
   ===================================================================== */

const GROUPS = [
  { letter: "A", teams: [
    { name: "México", flag: "🇲🇽" },
    { name: "Corea del Sur", flag: "🇰🇷" },
    { name: "Chequia", flag: "🇨🇿" },
    { name: "Sudáfrica", flag: "🇿🇦" },
  ]},
  { letter: "B", teams: [
    { name: "Canadá", flag: "🇨🇦" },
    { name: "Bosnia y Herzegovina", flag: "🇧🇦" },
    { name: "Catar", flag: "🇶🇦" },
    { name: "Suiza", flag: "🇨🇭" },
  ]},
  { letter: "C", teams: [
    { name: "Brasil", flag: "🇧🇷" },
    { name: "Marruecos", flag: "🇲🇦" },
    { name: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    { name: "Haití", flag: "🇭🇹" },
  ]},
  { letter: "D", teams: [
    { name: "Estados Unidos", flag: "🇺🇸" },
    { name: "Paraguay", flag: "🇵🇾" },
    { name: "Australia", flag: "🇦🇺" },
    { name: "Turquía", flag: "🇹🇷" },
  ]},
  { letter: "E", teams: [
    { name: "Alemania", flag: "🇩🇪" },
    { name: "Curazao", flag: "🇨🇼" },
    { name: "Costa de Marfil", flag: "🇨🇮" },
    { name: "Ecuador", flag: "🇪🇨" },
  ]},
  { letter: "F", teams: [
    { name: "Países Bajos", flag: "🇳🇱" },
    { name: "Japón", flag: "🇯🇵" },
    { name: "Suecia", flag: "🇸🇪" },
    { name: "Túnez", flag: "🇹🇳" },
  ]},
  { letter: "G", teams: [
    { name: "Bélgica", flag: "🇧🇪" },
    { name: "Egipto", flag: "🇪🇬" },
    { name: "Irán", flag: "🇮🇷" },
    { name: "Nueva Zelanda", flag: "🇳🇿" },
  ]},
  { letter: "H", teams: [
    { name: "España", flag: "🇪🇸" },
    { name: "Cabo Verde", flag: "🇨🇻" },
    { name: "Arabia Saudita", flag: "🇸🇦" },
    { name: "Uruguay", flag: "🇺🇾" },
  ]},
  { letter: "I", teams: [
    { name: "Francia", flag: "🇫🇷" },
    { name: "Senegal", flag: "🇸🇳" },
    { name: "Irak", flag: "🇮🇶" },
    { name: "Noruega", flag: "🇳🇴" },
  ]},
  { letter: "J", teams: [
    { name: "Argentina", flag: "🇦🇷" },
    { name: "Argelia", flag: "🇩🇿" },
    { name: "Austria", flag: "🇦🇹" },
    { name: "Jordania", flag: "🇯🇴" },
  ]},
  { letter: "K", teams: [
    { name: "Portugal", flag: "🇵🇹" },
    { name: "R.D. Congo", flag: "🇨🇩" },
    { name: "Uzbekistán", flag: "🇺🇿" },
    { name: "Colombia", flag: "🇨🇴" },
  ]},
  { letter: "L", teams: [
    { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { name: "Croacia", flag: "🇭🇷" },
    { name: "Ghana", flag: "🇬🇭" },
    { name: "Panamá", flag: "🇵🇦" },
  ]},
];
