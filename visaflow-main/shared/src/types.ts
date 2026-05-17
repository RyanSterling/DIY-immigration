/**
 * Value types for canonical fields.
 * This is the single source of truth for field value types.
 */
export type ValueType = "text" | "date" | "number" | "boolean" | "country";

export interface CanonicalFieldDef {
  type: ValueType;
  displayName: string;
}
