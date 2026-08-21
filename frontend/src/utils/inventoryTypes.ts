/**
 * Canonical inventory types — the single spelling of this concept in the UI.
 *
 * MEDICINE      -> owned by the Medicine master (prescribable drugs)
 * MEDICAL_ITEM  -> owned by the Item master (clinical consumables, not prescribable)
 * NON_MEDICAL   -> owned by the Item master (everything else)
 *
 * These strings match `Master_Category.InventoryType` in the database and the
 * `inventoryType` / `itemType` fields on every API. Never introduce another
 * spelling (Medicine/MED/Drug/...) for the same concept.
 */
export const INVENTORY_TYPES = [
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'MEDICAL_ITEM', label: 'Medical Item' },
  { value: 'NON_MEDICAL', label: 'Non-Medical Item' },
] as const;

export type InventoryType = typeof INVENTORY_TYPES[number]['value'];

/** Human label for a stored type value; echoes the raw value if unknown. */
export const typeLabel = (v: string | null | undefined): string =>
  INVENTORY_TYPES.find(t => t.value === v)?.label ?? v ?? '';
