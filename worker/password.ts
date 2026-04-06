/**
 * Password validation and strength checking utilities
 */

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0-4
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 8) { score++; } else { errors.push('At least 8 characters'); }
  if (/[A-Z]/.test(password)) { score++; } else { errors.push('At least one uppercase letter'); }
  if (/[a-z]/.test(password)) { score++; } else { errors.push('At least one lowercase letter'); }
  if (/[0-9]/.test(password)) { score++; } else { errors.push('At least one number'); }

  return {
    valid: errors.length === 0,
    score,
    errors,
  };
}

export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0: case 1: return 'Weak';
    case 2: return 'Fair';
    case 3: return 'Good';
    case 4: return 'Strong';
    default: return '';
  }
}

export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0: case 1: return 'text-red-500';
    case 2: return 'text-amber-500';
    case 3: return 'text-blue-500';
    case 4: return 'text-emerald-500';
    default: return 'text-slate-400';
  }
}
