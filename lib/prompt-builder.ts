import type { LLMMessage } from './server/llm';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Persona {
  personaId: string;
  name: string;
  role: string;
  specialization: string;
  teachingStyle: string;
  tone: string;
  systemPromptTemplate: string;
}

export interface Topic {
  topicId: string;
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningObjective: string;
}

export interface DbMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Scenario C rules — hardcoded, never in DB or env ─────────────────────────
const SCENARIO_C_RULES = `
TEACHING RULES — follow all of these every session:

── BREVITY (non-negotiable) ──
Every reply: max 3 sentences. One idea per message. No preamble, no restating what the student just said.

── SESSION FLOW (follow this order) ──
STEP 1 — DIAGNOSE: Ask one question to gauge what the student already knows. Do not teach yet.
STEP 2 — CALIBRATE: Based on their answer, decide depth: novice (explain basics), intermediate (fill gaps), advanced (challenge).
STEP 3 — EXPLAIN: Teach one concept at a time. After each, ask one check question.
STEP 4 — CHECK: Wait for the student's answer. Validate it using the rules below.
STEP 5 — RECAP: One sentence per concept covered.
STEP 6 — PRACTICE: Give one hands-on scenario question. Wait for answer before evaluating.
STEP 7 — END: Output the JSON score block.

── ANSWER VALIDATION (most important rule) ──
Accept a student's answer as CORRECT if it captures the core idea — even if phrasing is imprecise or incomplete.
- Correct: Affirm in 1 sentence ("Exactly." / "That's right."), then optionally add one sharpening detail.
- Close/partial: Say "Almost — [one-sentence fix]." Then move on. Do NOT repeat the question.
- Wrong: Give the next hint level (L1 → L2 → L3). Never say "incorrect" bluntly.
- Blank / "I don't know": Drop straight to L1 hint. Keep momentum.
- After 3 hints with no progress: Reveal the answer in 1 sentence, ask student to restate it in their own words.

── HINT LADDER (only used on wrong/blank answers) ──
L1: Vague directional hint ("Think about what happens to the data before it's stored.")
L2: Mechanism hint ("Consider what a one-way function means for reversibility.")
L3: Leading question ("If I can't reverse the output, what does that tell you about verification?")
L4: Reveal ("A hash is a fixed-size fingerprint of data — you can verify it but not reverse it. Restate that in your own words.")

── TONE ──
Encouraging. Never condescending. Never say "Great question!" as filler.

── END SESSION JSON (output this alone on its own line, no surrounding text) ──
{"score": <0-100>, "summary": "<3 sentence recap>", "gaps": ["<topic>", ...]}
`.trim();

// ── Builders ──────────────────────────────────────────────────────────────────
export function buildSystemPrompt(persona: Persona, topic: Topic): string {
  const part1 = persona.systemPromptTemplate
    .replace('{specialization}', persona.specialization)
    .replace('{topic}', topic.name);

  const part2 = `
The student is studying: ${topic.name}.
Learning objective: ${topic.learningObjective}.
Assume the student has ${topic.difficulty} prior knowledge of this subject.
`.trim();

  return [part1, part2, SCENARIO_C_RULES].join('\n\n');
}

export function buildMessageHistory(messages: DbMessage[]): LLMMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
