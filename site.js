/* Pumpkin: the cookie question and the maps that depend on the answer.
   The site sets exactly one cookie, to remember that answer. */
(() => {
  "use strict";

  const NAME = "pumpkin_cookies";
  const SIX_MONTHS = 60 * 60 * 24 * 180;
  // Scope the cookie to this site's folder, not the whole host.
  const base = new URL(".", document.currentScript.src).pathname;

  const stored = document.cookie.match(/(?:^|;\s*)pumpkin_cookies=(yes|no)/);
  let choice = stored ? stored[1] : null;

  const maps = [...document.querySelectorAll("[data-map]")];

  const loadMaps = () => {
    maps.forEach((map) => {
      if (map.querySelector("iframe")) return;
      const frame = document.createElement("iframe");
      frame.src = map.dataset.map;
      frame.title = map.dataset.mapTitle;
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer";
      map.replaceChildren(frame);
    });
  };

  const banner = document.createElement("section");
  banner.className = "cookie";
  banner.hidden = true;
  banner.tabIndex = -1;
  banner.setAttribute("aria-labelledby", "cookie-title");
  banner.innerHTML = `
    <p><strong id="cookie-title">Cookies.</strong> We keep one, to remember your answer here. If you accept, the maps under Location load from OpenStreetMap, which may set its own. No advertising.</p>
    <div class="cookie__actions">
      <button type="button" class="button button--quiet button--small" data-cookie="no">Decline</button>
      <button type="button" class="button button--ink button--small" data-cookie="yes">Accept</button>
    </div>`;

  const decide = (value) => {
    const hadMaps = maps.some((map) => map.querySelector("iframe"));
    choice = value;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${NAME}=${value}; Max-Age=${SIX_MONTHS}; Path=${base}; SameSite=Lax${secure}`;
    banner.hidden = true;
    if (value === "yes") {
      loadMaps();
    } else if (hadMaps) {
      // Withdrawn consent: drop the third-party frames by reloading without them.
      location.reload();
    }
  };

  banner.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cookie]");
    if (button) decide(button.dataset.cookie);
  });

  const skip = document.querySelector(".skip-link");
  if (skip) skip.after(banner);
  else document.body.prepend(banner);

  document.querySelectorAll("[data-map-show]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => decide("yes"));
  });

  document.querySelectorAll("[data-cookie-settings]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => {
      banner.hidden = false;
      banner.focus();
    });
  });

  const show = () => {
    banner.hidden = false;
  };

  // On a short phone the notice would sit on top of the page's main button.
  // Nothing loads before an answer, so there it waits for the first scroll.
  const coversAction = () => {
    const action = document.querySelector(".hero .button");
    if (!action) return false;
    banner.hidden = false;
    const a = action.getBoundingClientRect();
    const b = banner.getBoundingClientRect();
    banner.hidden = true;
    return a.bottom > b.top && a.top < b.bottom && a.right > b.left && a.left < b.right;
  };

  if (choice === "yes") loadMaps();
  if (choice === null) {
    if (coversAction()) window.addEventListener("scroll", show, { once: true, passive: true });
    else show();
  }
})();
