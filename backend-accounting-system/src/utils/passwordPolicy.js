function getPasswordPolicyError(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain an uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain a number.";
  }
  return null;
}

module.exports = { getPasswordPolicyError };
