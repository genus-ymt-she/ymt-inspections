// Trimmed shape of the Wikipedia "On this day" feed used by the relay and app tests
const page = t => [{ content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/" + encodeURIComponent(t) } } }];
export const EVENTS = { events: [
  { year: 2001, text: "A bombing in the city centre killed several people.", pages: page("Bombing") },
  { year: 1999, text: "The International Space Station receives its first crew module after a successful rocket launch.", pages: page("ISS") },
  { year: 1985, text: "A notorious murder trial ends in the capital.", pages: page("Trial") },
  { year: 1932, text: "The Sydney Harbour Bridge is officially opened in Sydney, Australia.", pages: page("Sydney Harbour Bridge") },
  { year: 1902, text: "The first public library in the region opens its doors to readers.", pages: page("Library") },
  { year: 1869, text: "The Suez Canal is opened to shipping, linking the Mediterranean and Red seas.", pages: page("Suez Canal") },
  { year: 1829, text: "The Swan River Colony is founded in Western Australia, later the city of Perth.", pages: page("Swan River Colony") },
  { year: 1783, text: "The first manned hot-air balloon flight takes place in Paris.", pages: page("Balloon") },
  { year: 1610, text: "Galileo Galilei observes the moons of Jupiter with his telescope.", pages: page("Galileo") }
] };
export const BIRTHS = { births: [{ year: 1950, text: "Jane Example, Australian engineer", pages: page("Jane Example") }] };
