// EBSU (Ebonyi State University, Abakaliki) campus zones.
// Coordinates are approximate centers around the main campus (~6.288°N, 8.067°E).
// Each zone has a radius in km; nearest matching zone wins.

export type EbsuZone = {
  id: string;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

export const EBSU_ZONES: EbsuZone[] = [
  { id: "main-gate",  name: "Main Gate",                 emoji: "🚪", lat: 6.2885, lng: 8.0675, radiusKm: 0.25 },
  { id: "cas",        name: "Faculty of Arts (CAS)",     emoji: "🎭", lat: 6.2890, lng: 8.0690, radiusKm: 0.20 },
  { id: "science",    name: "Faculty of Science",        emoji: "🧪", lat: 6.2895, lng: 8.0660, radiusKm: 0.25 },
  { id: "engineering",name: "Faculty of Engineering",    emoji: "⚙️", lat: 6.2870, lng: 8.0700, radiusKm: 0.30 },
  { id: "law",        name: "Faculty of Law",            emoji: "⚖️", lat: 6.2900, lng: 8.0650, radiusKm: 0.20 },
  { id: "medicine",   name: "College of Medicine",       emoji: "🩺", lat: 6.2860, lng: 8.0640, radiusKm: 0.30 },
  { id: "library",    name: "University Library",        emoji: "📚", lat: 6.2882, lng: 8.0680, radiusKm: 0.15 },
  { id: "auditorium", name: "Auditorium",                emoji: "🎤", lat: 6.2878, lng: 8.0672, radiusKm: 0.15 },
  { id: "sug",        name: "SUG / Student Center",      emoji: "🏛️", lat: 6.2876, lng: 8.0685, radiusKm: 0.15 },
  { id: "hostel-a",   name: "Hostel Area A",             emoji: "🏠", lat: 6.2855, lng: 8.0710, radiusKm: 0.30 },
  { id: "hostel-b",   name: "Hostel Area B",             emoji: "🏠", lat: 6.2910, lng: 8.0710, radiusKm: 0.30 },
  { id: "sports",     name: "Sports Complex",            emoji: "⚽", lat: 6.2920, lng: 8.0680, radiusKm: 0.30 },
  { id: "cafeteria",  name: "Cafeteria / Mami Market",   emoji: "🍲", lat: 6.2872, lng: 8.0695, radiusKm: 0.20 },
  { id: "chapel",     name: "Chapel / Mosque area",      emoji: "🕊️", lat: 6.2898, lng: 8.0700, radiusKm: 0.20 },
];

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Find the closest EBSU zone for a coordinate.
 * Returns the zone if you're inside its radius, otherwise returns the nearest
 * zone with `nearby: true` so we can say "near X".
 */
export function resolveZone(coords: { lat: number; lng: number }):
  | { zone: EbsuZone; distanceKm: number; inside: boolean }
  | null {
  let best: { zone: EbsuZone; distanceKm: number } | null = null;
  for (const z of EBSU_ZONES) {
    const d = haversineKm(coords, { lat: z.lat, lng: z.lng });
    if (!best || d < best.distanceKm) best = { zone: z, distanceKm: d };
  }
  if (!best) return null;
  return { ...best, inside: best.distanceKm <= best.zone.radiusKm };
}
