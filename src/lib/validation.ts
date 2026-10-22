export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Critical" | "Weak" | "Moderate" | "Good" | "Optimal";
  color: string;
  feedback: string[];
}

export function isValidEmail(email: string): boolean {
  // RFC 5322 compliant regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "Critical",
      color: "bg-zinc-700",
      feedback: ["Enter a flight clearance password."],
    };
  }

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push("Minimum 8 characters required.");
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add uppercase letters.");
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add numeric characters.");
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add special symbols.");
  }

  // Bonus check for high entropy
  if (password.length >= 14 && score === 4) {
    score = 4;
  }

  const mappedScore = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;

  const strengthMap: Record<0 | 1 | 2 | 3 | 4, { label: PasswordStrength["label"]; color: string }> = {
    0: { label: "Critical", color: "bg-red-500/80" },
    1: { label: "Weak", color: "bg-red-500" },
    2: { label: "Moderate", color: "bg-amber-400" },
    3: { label: "Good", color: "bg-cyan-400" },
    4: { label: "Optimal", color: "bg-emerald-400" },
  };

  return {
    score: mappedScore,
    label: strengthMap[mappedScore].label,
    color: strengthMap[mappedScore].color,
    feedback: feedback.length > 0 ? feedback : ["Password meets all security criteria."],
  };
}

export function validateLoginForm(email: string, password: string): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};

  if (!email.trim()) {
    errors.email = "Pilot ID (email) is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid pilot email format.";
  }

  if (!password) {
    errors.password = "Security password is required.";
  }

  return errors;
}

export function validateSignUpForm(data: {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.displayName.trim()) {
    errors.displayName = "Pilot call sign is required.";
  } else if (data.displayName.trim().length < 2) {
    errors.displayName = "Call sign must be at least 2 characters.";
  } else if (data.displayName.trim().length > 30) {
    errors.displayName = "Call sign must be under 30 characters.";
  }

  if (!data.email.trim()) {
    errors.email = "Flight email is required.";
  } else if (!isValidEmail(data.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!data.password) {
    errors.password = "Password is required.";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!data.acceptTerms) {
    errors.acceptTerms = "You must acknowledge the pilot flight terms.";
  }

  return errors;
}
