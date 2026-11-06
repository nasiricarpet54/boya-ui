/**
 * `salons.gallery` is a TEXT column and travels as a JSON string over the wire
 * ('["a.jpg","b.jpg"]'), while every consumer treats it as string[]. Older rows
 * may hold null or a bare comma list. Normalize once, at the edge, so gallery
 * rendering never crashes on `.map()` of a string again.
 */
export const parseGallery = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.filter((u) => typeof u === 'string' && u.trim() !== '');
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((u) => typeof u === 'string' && u.trim() !== '');
  } catch {
    // Not JSON — fall through to comma/space splitting below.
  }
  // Legacy bare list: 'a.jpg,b.jpg'
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
};
