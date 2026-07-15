// Shared display helpers for the Medical Info module.
// blood_type and allergy `type` are free-form/frontend-defined codes per the API contract
// (docs/api/medical-info.json) — these are the label mappings this module renders with.

export interface CodeOption<T> {
  value: T;
  label: string;
}

export const BLOOD_TYPE_OPTIONS: CodeOption<number>[] = [
  { value: 1, label: "A" },
  { value: 2, label: "B" },
  { value: 3, label: "AB" },
  { value: 4, label: "O" },
];

export function bloodTypeLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return "-";
  return BLOOD_TYPE_OPTIONS.find((o) => o.value === code)?.label ?? String(code);
}

export const ALLERGY_TYPE_OPTIONS: CodeOption<string>[] = [
  { value: "drug", label: "แพ้ยา" },
  { value: "food", label: "แพ้อาหาร" },
  { value: "other", label: "อื่นๆ" },
];

export function allergyTypeLabel(type: string | null | undefined): string {
  if (!type) return "-";
  return ALLERGY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
