/** Ghép className có điều kiện (thay clsx, không cần dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
