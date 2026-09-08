/**
 * The backend (Mongoose) returns documents keyed by `_id`. The frontend types/components
 * are written against `id`. This recursively mirrors `_id` -> `id` (keeping `_id` too, in
 * case anything needs the raw Mongo id) on every object/array in an API response, including
 * populated sub-documents (e.g. payroll.userId, task.assignedTo when populated).
 */
export function normalizeDoc<T = any>(doc: any): T {
  if (doc === null || doc === undefined) return doc;
  if (Array.isArray(doc)) return doc.map((d) => normalizeDoc(d)) as any;
  if (typeof doc !== 'object') return doc;
  // Don't try to walk into Date objects etc.
  if (doc instanceof Date) return doc as any;

  const out: any = {};
  for (const [k, v] of Object.entries(doc)) {
    out[k] = v && typeof v === 'object' ? normalizeDoc(v) : v;
  }
  if (doc._id && out.id === undefined) out.id = doc._id;
  return out;
}
