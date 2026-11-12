/* Pumpkin demo: one made-up decision, followed through four steps.
   Without this script the four steps simply read top to bottom. */
(() => {
  "use strict";

  const demo = document.querySelector("[data-demo]");
  if (!demo) return;

  const panels = [...demo.querySelectorAll("[data-panel]")];
  const tabs = [...demo.querySelectorAll("[data-go]")];
  const answers = demo.querySelector("[data-answers]");
  const states = demo.querySelector("[data-states]");
  const sign = demo.querySelector("[data-sign]");
  const signed = demo.querySelector("[data-signed]");
  const signedNote = demo.querySelector("[data-signed-note]");
  const lookup = demo.querySelector("[data-lookup]");
  const result = demo.querySelector("[data-result]");
  const last = panels.length - 1;

  // Each answer, as Ruth would write it in the directive.
  const WISHES = {
    calm: [
      "Please make sure my daughter, Dana, is with me.",
      "Please give me a quiet room and play my own music.",
      "Please explain each step to me before it happens.",
    ],
    avoid: [
      "Do not hold me down or restrain me.",
      "Do not leave me on my own.",
      "Keep bright lights and noise away from me at night.",
    ],
    meds: [
      "Calming medicine is fine, at the lowest dose that works.",
      "Calming medicine is a last resort. Call my daughter first.",
      "Calming medicine only if I am a danger to myself or others.",
    ],
  };

  // The same answers, as the emergency team reads them.
  const TEAM = {
    calm: [
      "Her daughter at her side.",
      "A quiet room and her own music.",
      "Each step explained before it happens.",
    ],
    avoid: [
      "Holding her down or restraining her.",
      "Leaving her on her own.",
      "Bright lights and noise at night.",
    ],
    meds: [
      "Fine, at the lowest dose that works.",
      "A last resort. Call her daughter first.",
      "Only if she is a danger to herself or others.",
    ],
  };

  // What changes from state to state. Simplified: the real rules have more detail.
  const STATES = {
    Washington: {
      title: "Health Care Directive",
      law: "RCW 70.122",
      voice: "My health care agent",
      rule: "two witnesses or a notary",
      note: "Wishes about psychiatric care can go in a separate Mental Health Advance Directive.",
    },
    Oregon: {
      title: "Advance Directive for Health Care",
      law: "ORS 127.505 to 127.660",
      voice: "My health care representative",
      rule: "two adult witnesses or a notary",
      note: "Wishes about psychiatric care go in a separate Declaration for Mental Health Treatment.",
    },
    California: {
      title: "Advance Health Care Directive",
      law: "Probate Code, division 4.7",
      voice: "My agent",
      rule: "two adult witnesses or a notary",
      note: "In a skilled nursing facility, a patient advocate or ombudsman must witness it too.",
    },
    Texas: {
      title: "Directive to Physicians and Family or Surrogates",
      law: "Health and Safety Code, chapter 166",
      voice: "My agent, named in a Medical Power of Attorney",
      rule: "two witnesses or a notary",
      note: "Wishes about psychiatric care go in a separate Declaration for Mental Health Treatment.",
    },
    "New York": {
      title: "Health Care Proxy",
      law: "Public Health Law, article 29-C",
      voice: "My health care agent",
      rule: "two adult witnesses",
      note: "There is no notary option, and the agent cannot be one of the witnesses.",
    },
    Florida: {
      title: "Designation of Health Care Surrogate",
      law: "Florida Statutes, chapter 765",
      voice: "My health care surrogate",
      rule: "two adult witnesses, one of them not a spouse or blood relative",
      note: "The surrogate cannot be one of the witnesses.",
    },
  };

  let step = 0;
  let isSigned = false;
  let isFound = false;

  const fill = (selector, text) => {
    demo.querySelectorAll(selector).forEach((node) => {
      if (node.textContent === text) return;
      node.textContent = text;
      // Let the change register: restart the quiet fade on what just changed.
      node.classList.remove("is-new");
      void node.offsetWidth;
      node.classList.add("is-new");
    });
  };

  const syncAnswers = () => {
    const data = new FormData(answers);
    Object.keys(WISHES).forEach((key) => {
      const choice = Number(data.get(key));
      fill(`[data-wish="${key}"]`, WISHES[key][choice]);
      fill(`[data-team="${key}"]`, TEAM[key][choice]);
    });
  };

  const syncState = () => {
    const name = states.querySelector("input:checked").value;
    const state = STATES[name];
    fill("[data-state-name]", name);
    fill("[data-state-title]", state.title);
    fill("[data-state-law]", state.law);
    fill("[data-state-voice]", state.voice);
    fill("[data-state-rule]", state.rule);
    fill("[data-state-signing]", `Signed before ${state.rule}.`);
    fill("[data-state-note]", state.note);
  };

  const syncRecord = () => {
    fill("[data-status]", isSigned ? "signed" : "draft");
    sign.hidden = isSigned;
    signed.hidden = !isSigned;
    signedNote.hidden = !isSigned;
    lookup.hidden = isFound;
    result.hidden = !isFound;
    demo.querySelectorAll("[data-unknown]").forEach((node) => {
      node.hidden = isFound;
    });
    demo.querySelectorAll("[data-found]").forEach((node) => {
      node.hidden = !isFound;
    });
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
    states.querySelector("input").checked = true;
    syncAnswers();
    syncState();
    show(0, true);
  };

  const on = (selector, handler) => {
    demo.querySelectorAll(selector).forEach((node) => node.addEventListener("click", handler));
  };

  answers.addEventListener("change", syncAnswers);
  answers.addEventListener("submit", (event) => event.preventDefault());
  states.addEventListener("change", syncState);

  sign.addEventListener("click", () => {
    isSigned = true;
    syncRecord();
    signed.focus();
  });

  lookup.addEventListener("click", () => {
    isFound = true;
    syncRecord();
  });

  tabs.forEach((tab, i) => tab.addEventListener("click", () => show(i, true)));
  on("[data-next]", () => show(step + 1, true));
  on("[data-back]", () => show(step - 1, true));
  on("[data-restart]", restart);

  signed.tabIndex = -1;
  states.hidden = false;
  demo.querySelector(".demo__steps").hidden = false;
  demo.querySelectorAll(".pager").forEach((pager) => {
    pager.hidden = false;
  });
  syncAnswers();
  syncState();
  show(0, false);
  // Only now, so nothing fades on first paint.
  demo.classList.add("is-live");
})();
