# Pumpkin POLST demo API

A Cloudflare Worker that sits between the demo page and the Claude API, so the API key never reaches a browser or this repository.

## Deploy (about five minutes)

Run these from this `worker` folder, in your own terminal.

1. Sign in to Cloudflare. A browser window opens for you to approve.

   ```
   npx wrangler login
   ```

2. Deploy the Worker. Note the address it prints, like `https://pumpkin-polst.<your-name>.workers.dev`.

   ```
   npx wrangler deploy
   ```

3. Add the two secrets. Each command prompts you to paste the value; it is sent straight to Cloudflare and is not saved in any file here.

   ```
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put SESSION_SECRET
   ```

   For `ANTHROPIC_API_KEY`, paste a newly created key from the Anthropic Console. For `SESSION_SECRET`, paste any long random string (for example the output of `openssl rand -hex 32`).

   You can also add both in the Cloudflare dashboard: Workers & Pages, `pumpkin-polst`, Settings, Variables and Secrets, Add, type "Secret".

4. Put the Worker's address in `../config.js` as `LIVE_API`, commit and push. That address is public and safe to commit.

5. In the Anthropic Console, set a monthly spend limit on the workspace that owns the key. This is the only hard dollar cap; see below.

## What stops abuse

Enforced by this Worker's code, whatever the browser sends:

- Five user replies per conversation. Each session token buys at most five model replies and two drafts.
- 600 characters per reply; 1,200 output tokens per reply; 5,000 for a draft.
- Per visitor (hashed IP address): 6 conversations a day, 12 requests a minute.
- Across everyone, per UTC day: 300 model calls and 600,000 tokens. After that the page shows "budget used for today".
- Only pages on `ALLOWED_ORIGINS` can call it from a browser. This stops other websites embedding it. It does not stop a script that fakes the header, which is what the caps above are for.
- Kill switch: set `DEMO_ENABLED` to `"false"` in the dashboard (or in `wrangler.toml` and redeploy). Every model call stops; Ruth's sample story keeps working.

Depends on Anthropic, not this code:

- The dollar limit. The token cap above bounds usage, but only the spend limit in the Anthropic Console guarantees a maximum bill.
- Anthropic's own rate limits. When they are hit, the page says the AI service is at its limit.

All the numbers are in `wrangler.toml` and can be changed there.

## Privacy

The Worker does not store or log conversation text. It keeps counters only, keyed by a hash of the visitor's address, and they expire within two days. The one thing it keeps for longer is the review totals: when a live draft is marked as reviewed, `POST /outcome` adds to a count of fields kept or changed and the seconds the review took (once per session, numbers only), and `GET /totals` returns the sums. Replies are sent to Anthropic's API to generate the response. This demo has not had the privacy, security and clinical review needed for real patient information.

## Test locally without a key

```
node test/mock-claude.mjs
npx wrangler dev --port 8790 --var ALLOWED_ORIGINS:http://localhost:8741
```

with a `.dev.vars` file (ignored by git) containing placeholder values:

```
ANTHROPIC_API_KEY=placeholder
SESSION_SECRET=local-test-secret
ANTHROPIC_BASE_URL=http://127.0.0.1:8799
```
