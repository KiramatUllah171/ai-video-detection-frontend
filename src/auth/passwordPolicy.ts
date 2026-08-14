export function isStrongPassword(password: string) {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
}

export function isStrongPasswordErrorMessage(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('uppercase') ||
    normalized.includes('special character') ||
    normalized.includes('one number') ||
    normalized.includes('strong password')
}
