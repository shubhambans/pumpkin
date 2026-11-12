/* Pumpkin demo: a made-up session in four steps.
   Without this script the four steps simply read top to bottom. */
(() => {
  "use strict";

  const demo = document.querySelector("[data-demo]");
  if (!demo) return;

  const panels = [...demo.querySelectorAll("[data-panel]")];
  const tabs = [...demo.querySelectorAll("[data-go]")];
  const answers = demo.querySelector("[data-answers]");
  const state = demo.querySelector("[data-state]");
  const sign = demo.querySelector("[data-sign]");
  const signed = demo.querySelector("[data-signed]");
  const lookup = demo.querySelector("[data-lookup]");
  const result = demo.querySelector("[data-result]");
  const last = panels.length - 1;

  // What each answer becomes in the directive, in Ruth's own voice.
  const WISHES = {
    calm: [
      "Please make sure my daughter, Dana, is with me.",
      "Please give me a quiet room and play my own music.",
      "Please explain each step to me before it happens.",
    ],
    goal: [
      "Keep me comfortable, even if that means less time.",
      "Try treatment for a short, agreed period first. If it is not helping, keep me comfortable.",
      "Use every treatment that could give me more time.",
    ],
    voice: ["My daughter, Dana.", "My son, Paul.", "My sister, June."],
  };
  const VOICES = ["Dana", "Paul", "June"];

  let step = 0;
  let isSigned = false;
  let isFound = false;

  const fill = (selector, text) => {
    demo.querySelectorAll(selector).forEach((node) => {
      node.textContent = text;
    });
  };

  const syncAnswers = () => {
    const data = new FormData(answers);
    Object.keys(WISHES).forEach((key) => {
      fill(`[data-wish="${key}"]`, WISHES[key][Number(data.get(key))]);
    });
    fill("[data-voice-name]", VOICES[Number(data.get("voice"))]);
  };

  const syncRecord = () => {
    fill("[data-status]", isSigned ? "signed" : "draft");
    fill("[data-state-name]", state.value);
    sign.hidden = isSigned;
    signed.hidden = !isSigned;
    lookup.hidden = isFound;
    result.hidden = !isFound;
  };

  const show = (index, moveFocus) => {
    step = Math.min(last, Math.max(0, index));
    // Arriving at the crisis means the directive was signed along the way.
    if (step === last) isSigned = true;
    panels.forEach((panel, i) => {
      panel.hidden = i !== step;
    });
    tabs.forEach((tab, i) => {
      if (i === step) tab.setAttribute("aria-current", "step");
      else tab.removeAttribute("aria-current");
    });
    syncRecord();
    if (moveFocus) {
      if (demo.getBoundingClientRect().top < 0) demo.scrollIntoView({ block: "start" });
      panels[step].querySelector("h2").focus({ preventScroll: true });
    }
  };

  const restart = () => {
    isSigned = false;
    isFound = false;
    answers.reset();
    state.selectedIndex = 0;
    syncAnswers();
    show(0, true);
  };

  const on = (selector, handler) => {
    demo.querySelectorAll(selector).forEach((node) => node.addEventListener("click", handler));
  };

  answers.addEventListener("change", syncAnswers);
  answers.addEventListener("submit", (event) => event.preventDefault());
  state.addEventListener("change", syncRecord);

  sign.addEventListener("click", () => {
    isSigned = true;
    syncRecord();
  });

  lookup.addEventListener("click", () => {
    isFound = true;
    syncRecord();
  });

  tabs.forEach((tab, i) => tab.addEventListener("click", () => show(i, true)));
  on("[data-next]", () => show(step + 1, true));
  on("[data-back]", () => show(step - 1, true));
  on("[data-restart]", restart);

  demo.classList.add("is-live");
  demo.querySelector(".demo__steps").hidden = false;
  demo.querySelectorAll(".demo__nav").forEach((nav) => {
    nav.hidden = false;
  });
  syncAnswers();
  show(0, false);
})();
