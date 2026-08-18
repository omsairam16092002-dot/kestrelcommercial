/** Turn a listing address into a geocodable street query (lots/units share the same pin). */
export function streetFromAddress(address: string): string {
  const trimmed = address.replace(/\s+/g, " ").trim();
  const unitOnStreet = trimmed.match(/^(?:unit|lot|u)\s+[^,]+,\s*(.+)$/i);
  if (unitOnStreet?.[1]) return stripTrailingNote(unitOnStreet[1]);
  const ground = trimmed.match(/^g0?\d+[a-z]?\s*,\s*(.+)$/i);
  if (ground?.[1]) return stripTrailingNote(ground[1]);
  const numbered = trimmed.match(/^\d{1,4}[a-z]?\s*,\s*(.+)$/i);
  if (numbered?.[1] && /\b(st|street|rd|road|ave|avenue|dr|drive|ct|court|cres|crescent|pl|place|hwy|parade|way)\b/i.test(numbered[1])) {
    return stripTrailingNote(numbered[1]);
  }
  return stripTrailingNote(trimmed);
}

function stripTrailingNote(value: string) {
  return value.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function geocodeQuery(p: {
  address: string;
  suburb: string;
  state?: string;
  postcode?: string;
}): string {
  const street = streetFromAddress(p.address);
  const state = p.state || "VIC";
  return `${street}, ${p.suburb} ${state} ${p.postcode}, Australia`.replace(/\s+/g, " ").trim();
}

export function suburbQuery(p: { suburb: string; state?: string; postcode?: string }): string {
  const state = p.state || "VIC";
  return `${p.suburb} ${state} ${p.postcode}, Australia`.replace(/\s+/g, " ").trim();
}

export function pinLooksAustralian(lat: number, lng: number) {
  return lat < -10 && lat > -44 && lng > 112 && lng < 154 && !(lat === 0 && lng === 0);
}
