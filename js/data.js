/* =====================================================================
   Datos fijos del Mundial 2026 — sorteo oficial (12 grupos x 4)
   ---------------------------------------------------------------------
   Estos datos no dependen de ninguna API, así que los Grupos y el
   Simulador siempre funcionan completos. Los resultados y fotos en vivo
   se traen aparte desde TheSportsDB. Los escudos están en /img.
   ===================================================================== */

const GROUPS = [
  { letter: "A", teams: [
    { name: "México", flag: "🇲🇽", img: "img/mexico.png" },
    { name: "Corea del Sur", flag: "🇰🇷", img: "img/south-korea.png" },
    { name: "Chequia", flag: "🇨🇿", img: "img/czechia.png" },
    { name: "Sudáfrica", flag: "🇿🇦", img: "img/south-africa.png" },
  ]},
  { letter: "B", teams: [
    { name: "Canadá", flag: "🇨🇦", img: "img/canada.png" },
    { name: "Bosnia y Herzegovina", flag: "🇧🇦", img: "img/bosnia-herzegovina.png" },
    { name: "Catar", flag: "🇶🇦", img: "img/qatar.png" },
    { name: "Suiza", flag: "🇨🇭", img: "img/switzerland.png" },
  ]},
  { letter: "C", teams: [
    { name: "Brasil", flag: "🇧🇷", img: "img/brazil.png" },
    { name: "Marruecos", flag: "🇲🇦", img: "img/morocco.png" },
    { name: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", img: "img/scotland.png" },
    { name: "Haití", flag: "🇭🇹", img: "img/haiti.png" },
  ]},
  { letter: "D", teams: [
    { name: "Estados Unidos", flag: "🇺🇸", img: "img/united-states.png" },
    { name: "Paraguay", flag: "🇵🇾", img: "img/paraguay.png" },
    { name: "Australia", flag: "🇦🇺", img: "img/australia.png" },
    { name: "Turquía", flag: "🇹🇷", img: "img/turkiye.png" },
  ]},
  { letter: "E", teams: [
    { name: "Alemania", flag: "🇩🇪", img: "img/germany.png" },
    { name: "Curazao", flag: "🇨🇼", img: "img/curacao.png" },
    { name: "Costa de Marfil", flag: "🇨🇮", img: "img/ivory-coast.png" },
    { name: "Ecuador", flag: "🇪🇨", img: "img/ecuador.png" },
  ]},
  { letter: "F", teams: [
    { name: "Países Bajos", flag: "🇳🇱", img: "img/netherlands.png" },
    { name: "Japón", flag: "🇯🇵", img: "img/japan.png" },
    { name: "Suecia", flag: "🇸🇪", img: "img/sweden.png" },
    { name: "Túnez", flag: "🇹🇳", img: "img/tunisia.png" },
  ]},
  { letter: "G", teams: [
    { name: "Bélgica", flag: "🇧🇪", img: "img/belgium.png" },
    { name: "Egipto", flag: "🇪🇬", img: "img/egypt.png" },
    { name: "Irán", flag: "🇮🇷", img: "img/iran.png" },
    { name: "Nueva Zelanda", flag: "🇳🇿", img: "img/new-zealand.png" },
  ]},
  { letter: "H", teams: [
    { name: "España", flag: "🇪🇸", img: "img/spain.png" },
    { name: "Cabo Verde", flag: "🇨🇻", img: "img/cape-verde.png" },
    { name: "Arabia Saudita", flag: "🇸🇦", img: "img/saudi-arabia.png" },
    { name: "Uruguay", flag: "🇺🇾", img: "img/uruguay.png" },
  ]},
  { letter: "I", teams: [
    { name: "Francia", flag: "🇫🇷", img: "img/france.png" },
    { name: "Senegal", flag: "🇸🇳", img: "img/senegal.png" },
    { name: "Irak", flag: "🇮🇶", img: "img/iraq.png" },
    { name: "Noruega", flag: "🇳🇴", img: "img/norway.png" },
  ]},
  { letter: "J", teams: [
    { name: "Argentina", flag: "🇦🇷", img: "img/argentina.png" },
    { name: "Argelia", flag: "🇩🇿", img: "img/algeria.png" },
    { name: "Austria", flag: "🇦🇹", img: "img/austria.png" },
    { name: "Jordania", flag: "🇯🇴", img: "img/jordan.png" },
  ]},
  { letter: "K", teams: [
    { name: "Portugal", flag: "🇵🇹", img: "img/portugal.png" },
    { name: "R.D. Congo", flag: "🇨🇩", img: "img/dr-congo.png" },
    { name: "Uzbekistán", flag: "🇺🇿", img: "img/uzbekistan.png" },
    { name: "Colombia", flag: "🇨🇴", img: "img/colombia.png" },
  ]},
  { letter: "L", teams: [
    { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", img: "img/england.png" },
    { name: "Croacia", flag: "🇭🇷", img: "img/croatia.png" },
    { name: "Ghana", flag: "🇬🇭", img: "img/ghana.png" },
    { name: "Panamá", flag: "🇵🇦", img: "img/panama.png" },
  ]},
];

// Las 16 sedes del Mundial 2026 (capacidades aproximadas).
const STADIUMS = [
  { name: "Estadio Azteca", city: "Ciudad de México", country: "México", flag: "🇲🇽", cap: "83.000" },
  { name: "Estadio Akron", city: "Guadalajara", country: "México", flag: "🇲🇽", cap: "48.000" },
  { name: "Estadio BBVA", city: "Monterrey", country: "México", flag: "🇲🇽", cap: "53.500" },
  { name: "BC Place", city: "Vancouver", country: "Canadá", flag: "🇨🇦", cap: "54.500" },
  { name: "BMO Field", city: "Toronto", country: "Canadá", flag: "🇨🇦", cap: "45.000" },
  { name: "MetLife Stadium", city: "Nueva York / Nueva Jersey", country: "EE.UU.", flag: "🇺🇸", cap: "82.500" },
  { name: "SoFi Stadium", city: "Los Ángeles", country: "EE.UU.", flag: "🇺🇸", cap: "70.000" },
  { name: "AT&T Stadium", city: "Dallas", country: "EE.UU.", flag: "🇺🇸", cap: "80.000" },
  { name: "NRG Stadium", city: "Houston", country: "EE.UU.", flag: "🇺🇸", cap: "72.000" },
  { name: "Mercedes-Benz Stadium", city: "Atlanta", country: "EE.UU.", flag: "🇺🇸", cap: "71.000" },
  { name: "Arrowhead Stadium", city: "Kansas City", country: "EE.UU.", flag: "🇺🇸", cap: "76.000" },
  { name: "Lincoln Financial Field", city: "Filadelfia", country: "EE.UU.", flag: "🇺🇸", cap: "69.000" },
  { name: "Levi's Stadium", city: "San Francisco Bay", country: "EE.UU.", flag: "🇺🇸", cap: "68.500" },
  { name: "Lumen Field", city: "Seattle", country: "EE.UU.", flag: "🇺🇸", cap: "68.700" },
  { name: "Gillette Stadium", city: "Boston", country: "EE.UU.", flag: "🇺🇸", cap: "65.900" },
  { name: "Hard Rock Stadium", city: "Miami", country: "EE.UU.", flag: "🇺🇸", cap: "65.300" },
];
