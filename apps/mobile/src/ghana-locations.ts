export type GhanaLocation = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  aliases: string[];
};

export const ghanaLocations: GhanaLocation[] = [
  { id: "accra", label: "Accra", lat: 5.6037, lng: -0.187, aliases: ["accra", "greater accra"] },
  { id: "osu", label: "Osu, Accra", lat: 5.556, lng: -0.174, aliases: ["osu", "oxford street", "osu oxford"] },
  { id: "east-legon", label: "East Legon, Accra", lat: 5.639, lng: -0.154, aliases: ["east legon", "legon"] },
  { id: "west-legon", label: "West Legon, Accra", lat: 5.651, lng: -0.208, aliases: ["west legon"] },
  { id: "adjiriganor", label: "Adjiriganor, Accra", lat: 5.645, lng: -0.136, aliases: ["adjiriganor"] },
  { id: "ashaley-botwe", label: "Ashaley Botwe, Accra", lat: 5.667, lng: -0.13, aliases: ["ashaley botwe", "botwe"] },
  { id: "airport-residential", label: "Airport Residential, Accra", lat: 5.605, lng: -0.171, aliases: ["airport residential", "airport", "airport area"] },
  { id: "roman-ridge", label: "Roman Ridge, Accra", lat: 5.604, lng: -0.181, aliases: ["roman ridge"] },
  { id: "ridge", label: "Ridge, Accra", lat: 5.568, lng: -0.196, aliases: ["ridge", "north ridge"] },
  { id: "cantonments", label: "Cantonments, Accra", lat: 5.572, lng: -0.187, aliases: ["cantonments"] },
  { id: "labone", label: "Labone, Accra", lat: 5.562, lng: -0.167, aliases: ["labone"] },
  { id: "dzorwulu", label: "Dzorwulu, Accra", lat: 5.62, lng: -0.226, aliases: ["dzorwulu"] },
  { id: "tesano", label: "Tesano, Accra", lat: 5.603, lng: -0.244, aliases: ["tesano"] },
  { id: "abelemkpe", label: "Abelemkpe, Accra", lat: 5.594, lng: -0.223, aliases: ["abelemkpe"] },
  { id: "kokomlemle", label: "Kokomlemle, Accra", lat: 5.571, lng: -0.215, aliases: ["kokomlemle"] },
  { id: "spintex", label: "Spintex, Accra", lat: 5.628, lng: -0.099, aliases: ["spintex", "spintex road"] },
  { id: "madina", label: "Madina, Accra", lat: 5.685, lng: -0.164, aliases: ["madina"] },
  { id: "adenta", label: "Adenta, Accra", lat: 5.705, lng: -0.171, aliases: ["adenta"] },
  { id: "haatso", label: "Haatso, Accra", lat: 5.664, lng: -0.229, aliases: ["haatso"] },
  { id: "taifa", label: "Taifa, Accra", lat: 5.671, lng: -0.251, aliases: ["taifa"] },
  { id: "dome", label: "Dome, Accra", lat: 5.673, lng: -0.235, aliases: ["dome"] },
  { id: "kwabenya", label: "Kwabenya, Accra", lat: 5.705, lng: -0.263, aliases: ["kwabenya"] },
  { id: "oyarifa", label: "Oyarifa, Accra", lat: 5.742, lng: -0.144, aliases: ["oyarifa"] },
  { id: "pokuase", label: "Pokuase, Accra", lat: 5.699, lng: -0.294, aliases: ["pokuase"] },
  { id: "dansoman", label: "Dansoman, Accra", lat: 5.56, lng: -0.267, aliases: ["dansoman"] },
  { id: "kaneshie", label: "Kaneshie, Accra", lat: 5.566, lng: -0.24, aliases: ["kaneshie", "north kaneshie"] },
  { id: "achimota", label: "Achimota, Accra", lat: 5.624, lng: -0.233, aliases: ["achimota"] },
  { id: "weija", label: "Weija, Accra", lat: 5.576, lng: -0.333, aliases: ["weija"] },
  { id: "teshie", label: "Teshie, Accra", lat: 5.583, lng: -0.107, aliases: ["teshie"] },
  { id: "nungua", label: "Nungua, Accra", lat: 5.601, lng: -0.077, aliases: ["nungua"] },
  { id: "sakumono", label: "Sakumono, Tema", lat: 5.636, lng: -0.057, aliases: ["sakumono"] },
  { id: "lashibi", label: "Lashibi, Tema", lat: 5.674, lng: -0.074, aliases: ["lashibi"] },
  { id: "baatsona", label: "Baatsona, Accra", lat: 5.621, lng: -0.081, aliases: ["baatsona"] },
  { id: "kasoa", label: "Kasoa, Central Region", lat: 5.534, lng: -0.416, aliases: ["kasoa"] },
  { id: "tema", label: "Tema", lat: 5.6698, lng: -0.0166, aliases: ["tema"] },
  { id: "tema-community-1", label: "Community 1, Tema", lat: 5.665, lng: -0.006, aliases: ["community 1", "tema community 1", "comm 1"] },
  { id: "tema-community-2", label: "Community 2, Tema", lat: 5.664, lng: -0.015, aliases: ["community 2", "tema community 2", "comm 2"] },
  { id: "tema-community-7", label: "Community 7, Tema", lat: 5.676, lng: -0.019, aliases: ["community 7", "tema community 7", "comm 7"] },
  { id: "tema-community-9", label: "Community 9, Tema", lat: 5.684, lng: -0.017, aliases: ["community 9", "tema community 9", "comm 9"] },
  { id: "tema-community-12", label: "Community 12, Tema", lat: 5.692, lng: -0.006, aliases: ["community 12", "tema community 12", "comm 12"] },
  { id: "tema-community-18", label: "Community 18, Tema", lat: 5.669, lng: -0.015, aliases: ["community 18", "tema community 18", "comm 18"] },
  { id: "tema-community-25", label: "Community 25, Tema", lat: 5.705, lng: -0.028, aliases: ["community 25", "tema community 25", "comm 25"] },
  { id: "ashaiman", label: "Ashaiman", lat: 5.701, lng: -0.03, aliases: ["ashaiman"] },
  { id: "kumasi", label: "Kumasi", lat: 6.6885, lng: -1.6244, aliases: ["kumasi"] },
  { id: "adum", label: "Adum, Kumasi", lat: 6.688, lng: -1.624, aliases: ["adum", "kumasi adum"] },
  { id: "asuoyeboah", label: "Asuoyeboah, Kumasi", lat: 6.73, lng: -1.57, aliases: ["asuoyeboah"] },
  { id: "suame", label: "Suame, Kumasi", lat: 6.716, lng: -1.634, aliases: ["suame"] },
  { id: "kenyasi", label: "Kenyasi, Kumasi", lat: 6.663, lng: -1.651, aliases: ["kenyasi", "kumasi kenyasi"] },
  { id: "dichemso", label: "Dichemso, Kumasi", lat: 6.71, lng: -1.64, aliases: ["dichemso"] },
  { id: "ahodwo", label: "Ahodwo, Kumasi", lat: 6.705, lng: -1.607, aliases: ["ahodwo"] },
  { id: "takoradi", label: "Takoradi, Western Region", lat: 4.897, lng: -1.755, aliases: ["takoradi"] },
  { id: "tarkwa", label: "Tarkwa, Western Region", lat: 5.303, lng: -1.996, aliases: ["tarkwa"] },
  { id: "cape-coast", label: "Cape Coast, Central Region", lat: 5.105, lng: -1.246, aliases: ["cape coast"] },
  { id: "tamale", label: "Tamale, Northern Region", lat: 9.407, lng: -0.853, aliases: ["tamale"] },
  { id: "ho", label: "Ho, Volta Region", lat: 6.611, lng: 0.471, aliases: ["ho"] },
  { id: "koforidua", label: "Koforidua, Eastern Region", lat: 6.091, lng: -0.259, aliases: ["koforidua"] },
  { id: "sunyani", label: "Sunyani, Bono Region", lat: 7.339, lng: -2.326, aliases: ["sunyani"] },
  { id: "bolgatanga", label: "Bolgatanga, Upper East Region", lat: 10.785, lng: -0.851, aliases: ["bolgatanga", "bolga"] },
  { id: "wa", label: "Wa, Upper West Region", lat: 10.061, lng: -2.502, aliases: ["wa"] }
];

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function searchGhanaLocations(query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  return ghanaLocations
    .map((location) => {
      const aliases = [location.label, ...location.aliases]
        .flatMap((alias) => {
          const normalizedAlias = normalizeText(alias);
          return [normalizedAlias, normalizedAlias.replace(/\s+/g, "")];
        });
      const collapsedQuery = normalizedQuery.replace(/\s+/g, "");
      const exact = aliases.some((alias) => alias === normalizedQuery);
      const startsWith = aliases.some((alias) => alias.startsWith(normalizedQuery) || alias.startsWith(collapsedQuery));
      const wordStart = aliases.some((alias) => alias.split(/\s+/).some((word) => word.startsWith(normalizedQuery)));
      const includes = aliases.some((alias) => alias.includes(normalizedQuery) || alias.includes(collapsedQuery));
      const score = exact ? 6 : startsWith ? 5 : wordStart ? 4 : includes ? 3 : 0;
      return { location, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.location.label.localeCompare(right.location.label))
    .map((entry) => ({
      id: entry.location.id,
      fullAddress: entry.location.label,
      lat: entry.location.lat,
      lng: entry.location.lng
    }));
}
