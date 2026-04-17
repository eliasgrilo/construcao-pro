/**
 * Maps Supabase auth error messages to user-facing pt-BR strings.
 * Supabase returns English error messages from the GoTrue API; this module
 * translates the most common ones so the UI never leaks raw English errors.
 */

const AUTH_ERROR_MAP: Array<[string, string]> = [
  ['Invalid login credentials', 'E-mail ou senha incorretos.'],
  ['Email not confirmed', 'E-mail não confirmado. Verifique sua caixa de entrada.'],
  ['Too many requests', 'Muitas tentativas. Aguarde um momento e tente novamente.'],
  ['User already registered', 'E-mail já cadastrado. Faça login ou recupere sua senha.'],
  ['Password should be at least 6 characters', 'A senha deve ter no mínimo 6 caracteres.'],
  ['Signup requires a valid password', 'Informe uma senha válida para criar sua conta.'],
  ['Unable to validate email address: invalid format', 'Formato de e-mail inválido.'],
  ['Email rate limit exceeded', 'Limite de envio de e-mails atingido. Tente mais tarde.'],
  ['over_email_send_rate_limit', 'Limite de envio de e-mails atingido. Tente mais tarde.'],
  ['For security purposes', 'Por segurança, aguarde um momento antes de tentar novamente.'],
]

export function mapAuthError(error: unknown): string {
  if (!(error instanceof Error)) return 'Ocorreu um erro inesperado.'
  const msg = error.message
  for (const [key, translated] of AUTH_ERROR_MAP) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return translated
  }
  // Return the raw message as fallback — may still be English for uncommon errors,
  // but that's better than hiding the problem entirely.
  return msg || 'Ocorreu um erro inesperado.'
}
