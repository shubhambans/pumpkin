/* Pumpkin POLST demo.
   Two paths: Ruth's sample story (scripted here, sends nothing) and "Build your own
   story" (real replies from the API worker named in config.js). Both end in the same
   clinician-review draft. The draft is never a medical order. */
(() => {
  "use strict";

  const root = document.querySelector("[data-polst]");
  if (!root) return;

  const API = String(window.PUMPKIN_API || "").replace(/\/+$/, "");
  const FORM = "Washington POLST, REV 04/2021";
  const LABEL = "Draft—requires clinician review; not a valid medical order.";
  let maxReplies = 5;
  let maxChars = 600;

  const GREETING =
    "Hello. I’m Pumpkin’s conversation guide. I’m an AI assistant, not a doctor or a nurse, and nothing we write here is a medical order. " +
    "I’ll ask a few questions about what matters to you, and a clinician would review the notes with you afterwards. " +
    "To start: tell me a little about your health right now, and what a good day looks like for you.";

  // The form's own wording, from the Washington POLST, REV 04/2021.
  const FIELDS = [
    { id: "conditions_goals", where: "Page 1", label: "Medical conditions / individual goals" },
    {
      id: "section_a_cpr",
      where: "Section A",
      label: "Use of Cardiopulmonary Resuscitation (CPR): when the individual has NO pulse and is not breathing",
      options: { yes: "YES – Attempt Resuscitation / CPR", no: "NO – Do Not Attempt Resuscitation (DNAR) / Allow Natural Death" },
    },
    {
      id: "section_b_level",
      where: "Section B",
      label: "Level of Medical Interventions: when the individual has a pulse and/or is breathing",
      options: { full: "FULL TREATMENT", selective: "SELECTIVE TREATMENT", comfort: "COMFORT-FOCUSED TREATMENT" },
    },
    { id: "additional_orders", where: "Section B", label: "Additional orders (e.g., blood products, dialysis)" },
    { id: "discussed_with", where: "Section C", label: "Discussed with" },
    { id: "advance_documents", where: "Section C", label: "Individual has: Durable Power of Attorney for Health Care / Health Care Directive (Living Will)" },
    {
      id: "nutrition",
      where: "Page 2",
      label: "Preference: Medically Assisted Nutrition (not required; does not affect orders on page 1)",
      options: { avoid: "Preference is to avoid medically assisted nutrition.", discuss: "Preference is to discuss medically assisted nutrition options, as indicated." },
    },
  ];
  const STATUS = { patient_stated: "Patient stated", needs_clarification: "Needs clarification", not_discussed: "Not discussed" };

  /* ---------- Ruth's sample story ---------- */

  const stated = (id, value, extra) => ({ id, status: "patient_stated", value, ...extra });
  const unclear = (id, note, value) => ({ id, status: "needs_clarification", value: value || "", note });

  const SAMPLE = [
    {
      ask: GREETING,
      replies: [
        { text: "I’m 82. My heart failure put me in the hospital twice this year. A good day is my garden and my daughter’s cooking.", set: [stated("conditions_goals", "Heart failure, two hospital stays this year. Values time in her garden and with her daughter.")] },
        { text: "My heart is weak and I get short of breath. A good day is being at home with my cat and the crossword.", set: [stated("conditions_goals", "Weak heart, short of breath. Values being at home.")] },
      ],
    },
    {
      ask: "Thank you, Ruth. Here is a hard one. If your heart stopped and you were not breathing, some people want CPR attempted, which means chest compressions and often a breathing tube. Others want to be allowed a natural death. What have you thought about that?",
      replies: [
        { text: "I do not want CPR. When my time comes, let me go.", set: [stated("section_a_cpr", "no")] },
        { text: "I would want them to try CPR.", set: [stated("section_a_cpr", "yes")] },
        { text: "I honestly don’t know. I’d need to hear more from my doctor first.", set: [unclear("section_a_cpr", "She said she does not know and wants to hear more from her doctor.")], open: "CPR: Ruth has not decided and asked for more information from her doctor." },
      ],
    },
    {
      ask: "That’s noted in your words. Now suppose you were seriously ill but still breathing. How far would you want treatment to go: everything, including a breathing machine and intensive care; treatment that avoids those; or comfort above all?",
      replies: [
        { text: "Treat what can be treated, but no breathing machine, and no intensive care if it can be avoided.", set: [stated("section_b_level", "selective")] },
        { text: "Keep me comfortable at home. I don’t want to go back to the hospital.", set: [stated("section_b_level", "comfort")] },
        { text: "Everything, including the breathing machine.", set: [stated("section_b_level", "full")] },
      ],
    },
    {
      ask: "You mentioned your daughter. Have you and she talked about this, and does she see it the way you do?",
      replies: [
        { text: "Dana wants everything done. I’ve told her that’s not what I want.", set: [stated("discussed_with", "Individual. Daughter is aware and disagrees.")], conflict: "Ruth’s daughter wants everything done; Ruth says that is not what she wants. This draft follows Ruth’s own words, not her daughter’s." },
        { text: "We agree. She knows my wishes.", set: [stated("discussed_with", "Individual. Daughter is aware and agrees.")] },
        { text: "We haven’t talked about it yet.", set: [unclear("discussed_with", "She has not yet talked with her daughter.", "Individual only so far.")], open: "Ruth has not yet discussed her wishes with her daughter." },
      ],
    },
    {
      ask: "Last question. If you could not eat enough by mouth, how would you feel about a feeding tube? And do you have a living will, or someone named to make health decisions for you?",
      replies: [
        { text: "No feeding tube. Dana has my health care power of attorney.", set: [stated("nutrition", "avoid"), stated("advance_documents", "Durable Power of Attorney for Health Care (daughter).")] },
        { text: "I’d want to talk the feeding tube through with my doctor. I don’t have any papers yet.", set: [stated("nutrition", "discuss"), stated("advance_documents", "None yet.")] },
      ],
    },
  ];
  const SAMPLE_CLOSE = "Thank you, Ruth. I’ve kept what you said in your own words, including what is still open. A clinician would go through these notes with you. Nothing is decided until then.";

  function sampleReview(picks) {
    const fields = new Map(FIELDS.map((field) => [field.id, { id: field.id, status: "not_discussed", value: "", basis: "", note: "" }]));
    const conflicts = [];
    const uncertainties = [];
    picks.forEach((reply) => {
      reply.set.forEach((entry) => fields.set(entry.id, { basis: reply.text, note: "", ...entry }));
      if (reply.conflict) conflicts.push(reply.conflict);
      if (reply.open) uncertainties.push(reply.open);
    });
    const level = fields.get("section_b_level").value;
    const reading = {
      selective: "Ruth appears to want her illness treated while avoiding a breathing machine and intensive care.",
      comfort: "Ruth appears to put comfort and staying at home ahead of further hospital treatment.",
      full: "Ruth appears to want all available treatment.",
    };
    return {
      respondent: "patient",
      fields: [...fields.values()],
      stated: picks.map((reply) => reply.text),
      interpretation: [reading[level], "This reading comes from five short replies and has not been checked with Ruth."].filter(Boolean),
      quotes: picks.map((reply, i) => ({ quote: reply.text, topic: ["Health and goals", "CPR", "Level of treatment", "Family", "Nutrition and documents"][i] })),
      conflicts,
      uncertainties,
      followups: ["Confirm each preference with Ruth directly, in her own words.", "Additional orders, such as blood products or dialysis, were not discussed."],
    };
  }

  /* ---------- small DOM helpers ---------- */

  const el = (tag, props, ...children) => {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (value === true) node.setAttribute(key, "");
      else if (value !== false && value != null) node.setAttribute(key, value);
    });
    children.flat(Infinity).forEach((child) => child != null && node.append(child));
    return node;
  };
  const arrow = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 12");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "12");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M0 6h22M17 1l5 5-5 5");
    svg.append(path);
    return svg;
  };
  // replaceChildren would print a missing node as the word "null".
  const put = (node, ...children) => node.replaceChildren(...children.flat(Infinity).filter((child) => child != null));
  const show = (...nodes) => {
    put(root, ...nodes);
    if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: "start" });
  };

  const MESSAGES = {
    disabled: "The live conversation is switched off right now. Ruth’s sample story still works.",
    budget_exhausted: "The demo has used its budget for today, so the live conversation is paused until tomorrow. Ruth’s sample story still works.",
    provider_limit: "The AI service is at its limit right now. Please try again later, or follow Ruth’s sample story.",
    visitor_limit: "You have started as many live conversations as this demo allows in a day. Ruth’s sample story still works.",
    rate_limited: "That was a lot of requests in a short time. Please wait a minute and try again.",
    session_limit: "This conversation has reached its limit of five replies.",
    bad_session: "This conversation has expired. Please start again.",
    offline: "The live conversation could not be reached. Please try again, or follow Ruth’s sample story.",
    unconnected: "The live conversation is not connected yet. Ruth’s sample story works now.",
  };
  const explain = (code) => MESSAGES[code] || MESSAGES.offline;

  async function api(path, body) {
    let response;
    try {
      response = await fetch(API + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
    } catch {
      throw new Error("offline");
    }
    let data = {};
    try {
      data = await response.json();
    } catch {
      /* fall through */
    }
    if (!response.ok) throw new Error(data.error || "offline");
    return data;
  }

  /* ---------- start ---------- */

  async function start(notice) {
    const status = el("p", { class: "polst__status", role: "status" });
    const own = el(
      "button",
      { type: "button", class: "choice", disabled: true, onclick: () => beginOwn(status) },
      el("span", { class: "choice__title" }, "Build your own story", arrow()),
      el("span", { class: "choice__text", text: "Type your own replies, up to five, and see what the guide asks. Please don’t enter real names or anything that identifies a patient." })
    );
    show(
      notice ? el("p", { class: "polst__notice", role: "alert", text: notice }) : null,
      el(
        "div",
        { class: "choices" },
        el(
          "button",
          { type: "button", class: "choice", onclick: beginSample },
          el("span", { class: "choice__title" }, "Explore a sample story", arrow()),
          el("span", { class: "choice__text", text: "Follow Ruth, a made-up patient. You choose her replies. No typing, and nothing is sent anywhere." })
        ),
        own
      ),
      status
    );
    if (!API) {
      status.textContent = MESSAGES.unconnected;
      return;
    }
    try {
      const info = await api("/status");
      if (info.state === "ok") own.disabled = false;
      else status.textContent = explain(info.state);
    } catch (error) {
      status.textContent = explain(error.message);
    }
  }

  /* ---------- conversation ---------- */

  function chatView(title, note) {
    const counter = el("p", { class: "polst__count" });
    const log = el("ol", { class: "log", role: "log", "aria-live": "polite", "aria-label": "Conversation" });
    const dock = el("div", { class: "dock" });
    const say = (who, text, pending) => {
      const item = el("li", { class: `turn turn--${who === "Guide" ? "guide" : "person"}${pending ? " is-pending" : ""}` }, el("span", { class: "turn__who", text: who }), el("p", { text }));
      log.append(item);
      item.scrollIntoView({ block: "nearest" });
      return item;
    };
    show(
      el("div", { class: "sheet" }, el("div", { class: "sheet__head" }, el("p", { class: "sheet__label", text: title }), counter), note ? el("p", { class: "sheet__note", text: note }) : null, log, dock),
      el("div", { class: "pager" }, el("button", { type: "button", class: "pager__back", onclick: () => start(), text: "Start over" }))
    );
    return { counter, log, dock, say };
  }

  function beginSample() {
    const view = chatView("Sample story: Ruth, 82 (made up)", "Scripted for this demo. Nothing you choose here is sent anywhere.");
    const picks = [];
    const messages = [];
    const step = () => {
      const index = picks.length;
      view.counter.textContent = index < SAMPLE.length ? `Reply ${index + 1} of ${SAMPLE.length}` : `${SAMPLE.length} of ${SAMPLE.length} replies used`;
      if (index === SAMPLE.length) {
        view.say("Guide", SAMPLE_CLOSE);
        put(view.dock, nextButton("See the draft for clinician review", () => reviewView(sampleReview(picks), transcript(messages, SAMPLE_CLOSE), "Ruth’s sample story (scripted)")));
        return;
      }
      view.say("Guide", SAMPLE[index].ask);
      messages.push({ role: "assistant", content: SAMPLE[index].ask });
      const group = el("fieldset", { class: "replies" }, el("legend", { text: "Choose Ruth’s reply" }));
      SAMPLE[index].replies.forEach((reply) => {
        group.append(
          el("button", {
            type: "button",
            class: "reply",
            text: reply.text,
            onclick: () => {
              picks.push(reply);
              messages.push({ role: "user", content: reply.text });
              view.say("Ruth", reply.text);
              step();
            },
          })
        );
      });
      const finish = index >= 2 ? el("button", { type: "button", class: "dock__finish", text: "Finish now", onclick: () => reviewView(sampleReview(picks), transcript(messages), "Ruth’s sample story (scripted), finished early") }) : null;
      put(view.dock, group, finish);
    };
    step();
  }

  const transcript = (messages, closing) => (closing ? [...messages, { role: "assistant", content: closing }] : messages);
  const nextButton = (label, handler) => el("div", { class: "pager pager--inline" }, el("button", { type: "button", class: "pager__next", onclick: handler }, label, arrow()));

  async function beginOwn(status) {
    status.textContent = "Starting…";
    let session;
    try {
      session = await api("/session", {});
    } catch (error) {
      status.textContent = explain(error.message);
      return;
    }
    maxReplies = session.maxReplies || maxReplies;
    maxChars = session.maxChars || maxChars;
    const greeting = session.greeting || GREETING;
    const view = chatView("Your story", "Do not enter real names or anything that identifies a patient. Your replies are not stored.");
    const sent = []; // what goes to the server: user and assistant turns after the greeting
    let used = 0;
    view.say("Guide", greeting);

    const toReview = async () => {
      put(view.dock, el("p", { class: "dock__wait", role: "status", text: "Drafting the notes for clinician review…" }));
      try {
        const data = await api("/review", { token: session.token, messages: sent });
        reviewView(data.review, [{ role: "assistant", content: greeting }, ...sent], "A live AI conversation");
      } catch (error) {
        put(view.dock, el("p", { class: "polst__notice", role: "alert", text: explain(error.message) }), nextButton("Try the draft again", toReview));
      }
    };

    const compose = () => {
      view.counter.textContent = used < maxReplies ? `Reply ${used + 1} of ${maxReplies}` : `${maxReplies} of ${maxReplies} replies used`;
      if (used >= maxReplies) {
        put(view.dock, nextButton("See the draft for clinician review", toReview));
        return;
      }
      const left = el("span", { class: "dock__left", text: `${maxChars} characters left` });
      const box = el("textarea", { class: "dock__box", rows: "3", maxlength: String(maxChars), "aria-label": "Your reply", placeholder: "Type your reply. “I’m not sure” is a fine answer." });
      const send = el("button", { type: "submit", class: "dock__send", disabled: true }, "Send", arrow());
      box.addEventListener("input", () => {
        left.textContent = `${maxChars - box.value.length} characters left`;
        send.disabled = !box.value.trim();
      });
      box.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !send.disabled) form.requestSubmit();
      });
      const form = el(
        "form",
        {
          class: "dock__form",
          onsubmit: async (event) => {
            event.preventDefault();
            const text = box.value.trim();
            if (!text) return;
            sent.push({ role: "user", content: text });
            used += 1;
            view.say("You", text);
            const waiting = view.say("Guide", "…", true);
            put(view.dock);
            view.counter.textContent = `${used} of ${maxReplies} replies used`;
            try {
              const data = await api("/chat", { token: session.token, messages: sent });
              waiting.remove();
              view.say("Guide", data.reply);
              sent.push({ role: "assistant", content: data.reply });
              compose();
            } catch (error) {
              waiting.remove();
              sent.pop();
              used -= 1;
              const stop = ["session_limit", "budget_exhausted", "disabled", "visitor_limit", "bad_session", "provider_limit"].includes(error.message);
              put(view.dock, el("p", { class: "polst__notice", role: "alert", text: explain(error.message) }));
              if (stop && sent.length) view.dock.append(nextButton("See the draft from what you wrote", toReview));
              else if (!stop) compose();
            }
          },
        },
        box,
        el("div", { class: "dock__row" }, left, send)
      );
      const finish = used >= 1 ? el("button", { type: "button", class: "dock__finish", text: "Finish now", onclick: toReview }) : null;
      put(view.dock, form, finish);
      box.focus();
    };
    compose();
  }

  /* ---------- clinician review ---------- */

  function reviewView(review, conversation, source) {
    const fieldById = new Map(review.fields.map((field) => [field.id, field]));
    const conflicts = [...review.conflicts];
    if (fieldById.get("section_a_cpr")?.value === "yes" && ["selective", "comfort"].includes(fieldById.get("section_b_level")?.value)) {
      conflicts.push("Section A says “YES – Attempt Resuscitation / CPR”, which the form pairs with Full Treatment in Section B, but a lower level was chosen in Section B.");
    }
    const open = review.fields.filter((field) => field.status !== "patient_stated").map((field) => FIELDS.find((item) => item.id === field.id)).filter(Boolean);

    const rows = FIELDS.map((meta) => {
      const field = fieldById.get(meta.id) || { status: "not_discussed", value: "", basis: "", note: "" };
      const status = el("select", { "aria-label": `Status: ${meta.label}` }, Object.entries(STATUS).map(([value, label]) => el("option", { value, selected: value === field.status, text: label })));
      const value = meta.options
        ? el("select", { "aria-label": `Draft: ${meta.label}` }, el("option", { value: "", text: "No draft value" }), Object.entries(meta.options).map(([key, label]) => el("option", { value: key, selected: key === field.value, text: label })))
        : el("input", { type: "text", value: field.value, "aria-label": `Draft: ${meta.label}`, placeholder: "No draft value" });
      const row = el(
        "div",
        { class: "field", "data-status": field.status },
        el("p", { class: "field__where", text: meta.where }),
        el("p", { class: "field__label", text: meta.label }),
        el("div", { class: "field__controls" }, status, value),
        field.basis ? el("p", { class: "field__basis" }, el("span", { text: "Their words: " }), `“${field.basis}”`) : null,
        field.note ? el("p", { class: "field__note", text: field.note }) : null
      );
      status.addEventListener("change", () => {
        row.dataset.status = status.value;
        edited();
      });
      value.addEventListener("input", edited);
      return row;
    });

    const fixed = (where, label, text) => el("div", { class: "field field--fixed" }, el("p", { class: "field__where", text: where }), el("p", { class: "field__label", text: label }), el("p", { class: "field__note", text }));
    const list = (items, empty) => (items.length ? el("ul", { class: "notes", role: "list" }, items.map((item) => el("li", { text: item }))) : el("p", { class: "review__none", text: empty }));

    const state = el("p", { class: "review__state", role: "status", text: "Not reviewed." });
    const reviewer = el("input", { type: "text", id: "reviewer", autocomplete: "off", placeholder: "For example: A. Clinician, ARNP (demo)" });
    const notes = el("textarea", { id: "review-notes", rows: "4", placeholder: "Notes from the review" });
    const done = el("input", { type: "checkbox", id: "review-done" });
    function edited() {
      if (done.checked) {
        done.checked = false;
        mark();
      }
    }
    function mark() {
      state.textContent = done.checked
        ? `Marked as reviewed in this demo${reviewer.value.trim() ? ` by ${reviewer.value.trim()}` : ""}, ${new Date().toLocaleString()}. The review is simulated: no clinician was verified, and nothing has been signed.`
        : "Not reviewed.";
      state.classList.toggle("is-done", done.checked);
    }
    done.addEventListener("change", mark);
    reviewer.addEventListener("input", () => done.checked && mark());

    const questions = conversation.filter((message) => message.role === "assistant").map((message) => message.content);
    const section = (number, title, ...body) => el("section", { class: "review__part" }, el("h3", { class: "subhead" }, el("b", { text: `${number} ` }), title), body);

    show(
      el(
        "article",
        { class: "review", "aria-label": "Draft for clinician review" },
        el("p", { class: "review__banner", text: LABEL }),
        el("p", { class: "review__meta", text: `Mapped to: ${FORM} (Washington State Medical Association and Department of Health). Source: ${source}. Generated ${new Date().toLocaleString()}.` }),
        review.respondent !== "patient"
          ? el("p", { class: "polst__notice", text: "The replies may not have come from the patient. Nothing below is marked as stated by the patient; confirm every item with the patient directly." })
          : null,

        section(
          1,
          "Draft mapping to the form",
          el("p", { class: "review__lede", text: "Each field is marked as stated by the patient, needing clarification, or not discussed. Gaps are left empty. A clinician can change any of it." }),
          rows,
          fixed("Section C", "Signatures: MD/DO/ARNP/PA-C, and the individual or legal medical decision maker (mandatory)", "Not signed. A POLST is valid only when signed by a clinician and by the individual or their legal medical decision maker."),
          fixed("Page 1", "Name and date of birth", "Not collected in this demo.")
        ),

        section(
          2,
          "Summary",
          el(
            "div",
            { class: "pair review__pair" },
            el("div", {}, el("p", { class: "sheet__label", text: "What the person said" }), list(review.stated, "Nothing recorded.")),
            el("div", {}, el("p", { class: "sheet__label", text: "The AI’s interpretation (unverified)" }), list(review.interpretation, "No interpretation offered."))
          )
        ),

        section(
          3,
          "Conversation notes",
          el("p", { class: "sheet__label", text: "In their words" }),
          review.quotes.length ? el("ul", { class: "notes", role: "list" }, review.quotes.map((item) => el("li", {}, `“${item.quote}”`, el("span", { class: "notes__topic", text: ` ${item.topic}` })))) : el("p", { class: "review__none", text: "No quotes recorded." }),
          el("p", { class: "sheet__label", text: "Questions the guide asked" }),
          list(questions, "None."),
          el("details", { class: "review__all" }, el("summary", { text: "Read the whole conversation" }), el("ol", { class: "log log--plain" }, conversation.map((message) => el("li", { class: `turn turn--${message.role === "assistant" ? "guide" : "person"}` }, el("span", { class: "turn__who", text: message.role === "assistant" ? "Guide" : "Person" }), el("p", { text: message.content })))))
        ),

        section(
          4,
          "Conflicts, uncertainties and questions for the clinician",
          el("p", { class: "sheet__label", text: "Conflicts" }),
          list(conflicts, "None noted."),
          el("p", { class: "sheet__label", text: "Uncertainties" }),
          list([...review.uncertainties, ...open.map((meta) => `${meta.where}, “${meta.label}” is not settled.`)], "None noted."),
          el("p", { class: "sheet__label", text: "Questions to ask" }),
          list(review.followups, "None suggested.")
        ),

        section(
          5,
          "Clinician review (simulated)",
          el("p", { class: "review__lede", text: "In this demo anyone can play the reviewer. No clinician is signed in or verified, so marking the draft as reviewed does not approve it, sign it, or make it an order. How long a real review takes depends on the patient and the clinician." }),
          el("label", { for: "reviewer", class: "sheet__label", text: "Reviewer" }),
          reviewer,
          el("label", { for: "review-notes", class: "sheet__label", text: "Reviewer’s notes" }),
          notes,
          el("label", { class: "review__check", for: "review-done" }, done, " Mark as reviewed (simulated)"),
          state
        ),
        el("p", { class: "review__banner review__banner--foot", text: LABEL })
      ),
      el(
        "div",
        { class: "pager" },
        el("button", { type: "button", class: "pager__back", onclick: () => start(), text: "Start over" }),
        el("button", { type: "button", class: "pager__next", onclick: () => window.print() }, "View or print the draft", arrow())
      )
    );
  }

  start();
})();
