// Password policy, enforced client-side on sign-up and reset. (Also set a
// matching minimum in Supabase → Authentication → Passwords for defence in depth.)
export const PASSWORD_HINT =
  "At least 10 characters, with an uppercase letter, a lowercase letter and a number.";

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(pw)) return "Include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Include an uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Include a number.";
  return null;
}
