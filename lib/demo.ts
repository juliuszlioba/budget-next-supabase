import "server-only";

/** Credentials for the shared demo account, or null when the demo isn't set up (DEMO_EMAIL / DEMO_PASSWORD). */
export function demoCredentials() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  return email && password ? { email, password } : null;
}
