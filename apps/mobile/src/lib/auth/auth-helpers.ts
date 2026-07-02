const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function validatePassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export function toAuthError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong. Please try again.';
  }

  const message = (error as { message?: string }).message ?? '';

  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (message.includes('For security purposes')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  return 'Something went wrong. Please try again.';
}
