// A stand-in for the Claude API, for local tests only. No key, no network, no cost.
// Run: node worker/test/mock-claude.mjs   (listens on 127.0.0.1:8799)
import http from "node:http";

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      const usage = { input_tokens: 400, output_tokens: 100 };
      res.setHeader("content-type", "application/json");
      if (body.tools) {
        // Deliberately misbehaves: claims the patient stated things with no matching words,
        // so the worker's own checks can be seen to downgrade them.
        res.end(
          JSON.stringify({
            usage,
            content: [
              {
                type: "tool_use",
                name: "record_review",
                input: {
                  respondent: "patient",
                  fields: [
                    { id: "section_a_cpr", status: "patient_stated", value: "no", basis: "I do not want CPR", note: "" },
                    { id: "section_b_level", status: "patient_stated", value: "comfort", basis: "words the person never wrote", note: "" },
                    { id: "nutrition", status: "patient_stated", value: "tube-please", basis: "", note: "" },
                  ],
                  stated: ["Does not want CPR."],
                  interpretation: ["Appears to favour comfort."],
                  quotes: [{ quote: "I do not want CPR", topic: "CPR" }, { quote: "an invented quote", topic: "x" }],
                  conflicts: [],
                  uncertainties: [],
                  followups: ["Confirm level of treatment."],
                },
              },
            ],
          })
        );
      } else {
        res.end(JSON.stringify({ usage, content: [{ type: "text", text: `Mock reply ${body.messages.length}. What matters most to you?` }] }));
      }
    });
  })
  .listen(8799, "127.0.0.1", () => console.log("mock Claude API on 127.0.0.1:8799"));
