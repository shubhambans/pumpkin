/* Where the demo's API lives. This is a public address, not a secret.
   The Claude API key is stored only in the Cloudflare Worker's secrets.
   Leave empty until the Worker is deployed; the sample story works without it. */
const LIVE_API = "";
// On a developer's machine, talk to the Worker running locally (`npx wrangler dev`).
window.PUMPKIN_API = location.hostname === "localhost" ? "http://127.0.0.1:8790" : LIVE_API;
