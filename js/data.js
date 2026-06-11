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

// Las 16 sedes del Mundial 2026 (capacidades aproximadas) con foto, resumen e historia.
// Las fotos van en img/estadios/<slug>.jpg (si falta alguna, se muestra un degradado).
const STADIUMS = [
  {
    name: "Estadio Azteca", city: "Ciudad de México", country: "México", flag: "🇲🇽", cap: "83.000",
    img: "img/estadios/azteca.jpg",
    desc: "Templo del fútbol mexicano, inaugurado en 1966. Casa de la selección de México y del Club América.",
    wc: "Único estadio que ha albergado DOS finales del Mundial (1970 y 1986). En 2026 será el primero del mundo en jugar partidos en tres Copas del Mundo, e inaugurará el torneo. Aquí Maradona marcó la 'Mano de Dios' y el 'Gol del Siglo' en 1986.",
  },
  {
    name: "Estadio Akron", city: "Guadalajara", country: "México", flag: "🇲🇽", cap: "48.000",
    img: "img/estadios/akron.jpg",
    desc: "Casa de las Chivas de Guadalajara (2010). Su diseño evoca un volcán rodeado de una nube.",
    wc: "Debuta como sede de una Copa del Mundo en 2026.",
  },
  {
    name: "Estadio BBVA", city: "Monterrey", country: "México", flag: "🇲🇽", cap: "53.500",
    img: "img/estadios/bbva.jpg",
    desc: "Apodado 'El Gigante de Acero', casa de Rayados de Monterrey (2015), con vista al Cerro de la Silla.",
    wc: "Será sede mundialista por primera vez en 2026.",
  },
  {
    name: "BC Place", city: "Vancouver", country: "Canadá", flag: "🇨🇦", cap: "54.500",
    img: "img/estadios/bc-place.jpg",
    desc: "Estadio de Vancouver con techo retráctil de cables, inaugurado en 1983 y renovado en 2011.",
    wc: "Albergó la final del Mundial Femenino 2015; debuta en el Mundial masculino en 2026.",
  },
  {
    name: "BMO Field", city: "Toronto", country: "Canadá", flag: "🇨🇦", cap: "45.000",
    img: "img/estadios/bmo.jpg",
    desc: "Hogar del Toronto FC y de la selección de Canadá, junto al lago Ontario (2007).",
    wc: "Primera vez como sede del Mundial en 2026; Canadá debuta como anfitrión.",
  },
  {
    name: "MetLife Stadium", city: "Nueva York / Nueva Jersey", country: "EE.UU.", flag: "🇺🇸", cap: "82.500",
    img: "img/estadios/metlife.jpg",
    desc: "Uno de los estadios más grandes de EE.UU., casa de los Giants y Jets de la NFL (2010).",
    wc: "Albergará la GRAN FINAL del Mundial 2026, el 19 de julio.",
  },
  {
    name: "SoFi Stadium", city: "Los Ángeles", country: "EE.UU.", flag: "🇺🇸", cap: "70.000",
    img: "img/estadios/sofi.jpg",
    desc: "El estadio más moderno y costoso de EE.UU. (2020), casa de Rams y Chargers, con una pantalla ovalada gigante.",
    wc: "Debut mundialista en 2026.",
  },
  {
    name: "AT&T Stadium", city: "Dallas", country: "EE.UU.", flag: "🇺🇸", cap: "80.000",
    img: "img/estadios/att.jpg",
    desc: "Apodado 'Jerry World', casa de los Cowboys (2009), famoso por su pantalla colgante descomunal.",
    wc: "Una de las sedes con más partidos del Mundial 2026, incluida una semifinal.",
  },
  {
    name: "NRG Stadium", city: "Houston", country: "EE.UU.", flag: "🇺🇸", cap: "72.000",
    img: "img/estadios/nrg.jpg",
    desc: "Primer estadio de la NFL con techo retráctil (2002), casa de los Houston Texans.",
    wc: "Debuta como sede mundialista en 2026.",
  },
  {
    name: "Mercedes-Benz Stadium", city: "Atlanta", country: "EE.UU.", flag: "🇺🇸", cap: "71.000",
    img: "img/estadios/mercedes-benz.jpg",
    desc: "Casa de Falcons y Atlanta United (2017), con un techo retráctil en forma de cámara fotográfica.",
    wc: "Sede del Mundial 2026 por primera vez, con partidos de eliminatorias.",
  },
  {
    name: "Arrowhead Stadium", city: "Kansas City", country: "EE.UU.", flag: "🇺🇸", cap: "76.000",
    img: "img/estadios/arrowhead.jpg",
    desc: "Casa de los Kansas City Chiefs; tiene el récord Guinness al estadio más ruidoso del mundo.",
    wc: "Debut mundialista en 2026.",
  },
  {
    name: "Lincoln Financial Field", city: "Filadelfia", country: "EE.UU.", flag: "🇺🇸", cap: "69.000",
    img: "img/estadios/lincoln.jpg",
    desc: "Hogar de los Philadelphia Eagles, inaugurado en 2003.",
    wc: "Será sede por primera vez en 2026.",
  },
  {
    name: "Levi's Stadium", city: "San Francisco Bay", country: "EE.UU.", flag: "🇺🇸", cap: "68.500",
    img: "img/estadios/levis.jpg",
    desc: "Casa de los San Francisco 49ers (2014) en Santa Clara, referente en tecnología y sostenibilidad.",
    wc: "Debut como sede mundialista en 2026.",
  },
  {
    name: "Lumen Field", city: "Seattle", country: "EE.UU.", flag: "🇺🇸", cap: "68.700",
    img: "img/estadios/lumen.jpg",
    desc: "Casa de Seahawks y Sounders, conocido por su afición ensordecedora.",
    wc: "Primera vez en un Mundial en 2026.",
  },
  {
    name: "Gillette Stadium", city: "Boston", country: "EE.UU.", flag: "🇺🇸", cap: "65.900",
    img: "img/estadios/gillette.jpg",
    desc: "Hogar de los New England Patriots, inaugurado en 2002 en Foxborough.",
    wc: "Debuta como sede mundialista en 2026.",
  },
  {
    name: "Hard Rock Stadium", city: "Miami", country: "EE.UU.", flag: "🇺🇸", cap: "65.300",
    img: "img/estadios/hard-rock.jpg",
    desc: "Casa de los Miami Dolphins y del GP de Miami de Fórmula 1, renovado en 2016.",
    wc: "Sede del Mundial 2026 con partidos de eliminatorias, incluido el del tercer puesto.",
  },
];

// Traducción de los nombres de selección (como los entrega TheSportsDB) → español.
const TEAM_ES = {
  "Algeria": "Argelia", "Argentina": "Argentina", "Australia": "Australia", "Austria": "Austria",
  "Belgium": "Bélgica", "Bosnia-Herzegovina": "Bosnia y Herzegovina", "Brazil": "Brasil",
  "Canada": "Canadá", "Cape Verde": "Cabo Verde", "Colombia": "Colombia", "Croatia": "Croacia",
  "Curaçao": "Curazao", "Curacao": "Curazao", "Czech Republic": "Chequia", "Czechia": "Chequia",
  "DR Congo": "R.D. Congo", "Ecuador": "Ecuador", "Egypt": "Egipto", "England": "Inglaterra",
  "France": "Francia", "Germany": "Alemania", "Ghana": "Ghana", "Haiti": "Haití", "Iran": "Irán",
  "Iraq": "Irak", "Ivory Coast": "Costa de Marfil", "Japan": "Japón", "Jordan": "Jordania",
  "Mexico": "México", "Morocco": "Marruecos", "Netherlands": "Países Bajos", "New Zealand": "Nueva Zelanda",
  "Norway": "Noruega", "Panama": "Panamá", "Paraguay": "Paraguay", "Portugal": "Portugal",
  "Qatar": "Catar", "Saudi Arabia": "Arabia Saudita", "Scotland": "Escocia", "Senegal": "Senegal",
  "South Africa": "Sudáfrica", "South Korea": "Corea del Sur", "Spain": "España", "Sweden": "Suecia",
  "Switzerland": "Suiza", "Tunisia": "Túnez", "Turkey": "Turquía", "Türkiye": "Turquía",
  "USA": "Estados Unidos", "United States": "Estados Unidos", "Uruguay": "Uruguay", "Uzbekistan": "Uzbekistán",
};
