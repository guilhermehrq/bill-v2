// Translates known Supabase Auth error messages to pt-BR.
// Falls back to the original message if no mapping is found.
const MAP: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos",
  "Email not confirmed": "Confirme seu email antes de entrar",
  "User already registered": "Já existe uma conta com esse email",
  "Password should be at least 6 characters": "A senha precisa ter ao menos 6 caracteres",
  "Signup requires a valid password": "Informe uma senha válida",
  "Email rate limit exceeded": "Muitas tentativas. Tente novamente em alguns minutos.",
};

export function translateAuthError(message: string): string {
  return MAP[message] ?? message;
}
