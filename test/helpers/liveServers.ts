const SITE = process.env.FRONTEND_URL || "http://localhost:3000";
const API = process.env.API_URL || "http://localhost:4000";

export async function waitForLiveServers(attempts = 12, delayMs = 500) {
  for (let i = 0; i < attempts; i++) {
    try {
      const [health, home] = await Promise.all([
        fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) }),
        fetch(`${SITE}/`, { signal: AbortSignal.timeout(4000) }),
      ]);
      if (health.ok && home.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

export { SITE, API };
