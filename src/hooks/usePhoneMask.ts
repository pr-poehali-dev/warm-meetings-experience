import { useCallback } from "react";

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("7") ? digits.slice(1) : digits.startsWith("8") ? digits.slice(1) : digits;
  const d = local.slice(0, 10);
  let result = "+7";
  if (d.length > 0) result += `(${d.slice(0, 3)}`;
  if (d.length >= 4) result += `)${d.slice(3, 6)}`;
  if (d.length >= 7) result += `-${d.slice(6, 8)}`;
  if (d.length >= 9) result += `-${d.slice(8, 10)}`;
  return result;
}

export function isPhoneComplete(phone: string): boolean {
  return phone.replace(/\D/g, "").length === 11;
}

export function usePhoneMask(onChange: (value: string) => void) {
  return useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(formatPhone(e.target.value));
    },
    [onChange]
  );
}