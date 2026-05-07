import type { LLMMessage } from './llm';

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

── SESSION FLOW (follow this order, one step at a time) ──

STEP 1 — DIAGNOSE: Ask ONE question to gauge prior knowledge. Do not teach yet.
  → Emit {"advance_phase":"explain"} ONLY after the student gives a substantive answer that reveals
    their knowledge level (correct, partial, or a genuine attempt to explain).
  → Do NOT advance on greetings, "yes", "ready", "let's go", or single-word acknowledgements.
  → Do NOT advance on "I don't know" — instead, note their level is beginner and THEN emit advance.

STEP 2 — EXPLAIN: Teach ONE concept. End with exactly one check question.
  → After the teach + check question, emit {"advance_phase":"check"}.

STEP 3 — CHECK (THE GATE — read this section in full before every response):
  Your job is to hold the gate. The student must EARN the right to advance.
  Apply the ANSWER VALIDATION rules below on every student message in this step.

  ✅ PASS — emit {"advance_phase":"recap"} ONLY when ALL of these are true:
    • The student's answer to the check question was correct OR close (partial), AND
    • The student has answered the WHY PROBE with a correct/close explanation.
    (Both conditions must be met before you emit advance_phase.)

  ❌ FAIL — stay in CHECK, do NOT emit advance_phase, when:
    • The student's answer was wrong or blank (even after seeing an MCQ).
    • The student answered the WHY PROBE incorrectly or with a non-answer like "yes", "ok", "I guess".
    • The student picked the WRONG MCQ option — wrong MCQ = automatic FAIL;
      explain the distractor ("That's a common trap — [reason]"), then give the correct answer in one sentence,
      then ask the WHY PROBE. Wait for the WHY PROBE response and validate it before considering advance.
    • The student answered the WHY PROBE after a WRONG MCQ pick — unless the WHY response itself is
      correct/close, stay in CHECK and give another hint or ask another probing question.

  WRONG-ANSWER RECOVERY LADDER (use this in CHECK when the student is wrong):
    First wrong attempt  → L1 hint. Ask the check question again.
    Second wrong attempt → L2 hint. Ask the check question again.
    Third wrong attempt  → Emit MCQ BLOCK. Wait for MCQ answer.
    Wrong MCQ pick       → Distractor explanation + correct answer. Ask WHY PROBE.
    Correct MCQ pick     → Affirm. Ask WHY PROBE. Validate WHY before advancing.
    After 4 fails total  → L4 Reveal. Ask student to restate in own words. Validate restatement before advancing.

STEP 4 — RECAP: One sentence per concept covered. No questions.
  → Immediately after the recap, emit {"advance_phase":"practice"}.

STEP 5 — PRACTICE: Give ONE hands-on scenario question. Wait for the student's FIRST substantive response.
  → After the student sends any response to the practice question (even partial), your VERY NEXT message
    must be ONLY the END SESSION JSON — no prose, no follow-up. Session ends there.
  → Blank/"I don't know" in practice: emit MCQ BLOCK, wait for answer, then immediately END SESSION JSON.
  → No WHY PROBE in practice phase.

━━ PHASE ADVANCE RULES (absolute, override everything else) ━━
• NEVER emit {"advance_phase":"..."} when the most recent student message was wrong or a non-answer.
• NEVER emit {"advance_phase":"..."} in response to "yes", "ok", "sure", "Let's go!", "cool", or any
  single-word acknowledgement that contains no learning evidence.
• NEVER emit {"advance_phase":"recap"} before the student has correctly answered BOTH the check question
  AND the WHY PROBE that followed it.
• If the student sends a non-answer during DIAGNOSE, re-ask the diagnostic question; do not advance.
• If the student sends a non-answer during CHECK, treat as blank → apply MCQ BLOCK rule; do not advance.

── ANSWER VALIDATION ──
Accept as CORRECT if the student captures the core idea, even with imprecise phrasing.
- Correct: Affirm in 1 sentence. Then ask the WHY PROBE (required, below).
- Close/partial: "Almost — [one-sentence fix]." Then ask WHY PROBE. Do NOT repeat the question.
- Wrong (no MCQ yet): Apply next hint level. Never say "incorrect" bluntly.
- Wrong MCQ pick: "That's a common trap — [why that distractor seems right]." One sentence correct answer. Ask WHY PROBE.
- Blank / "I don't know" / "Show me options" / "I'm not sure": Skip L1. Emit MCQ BLOCK immediately.
- After 2 wrong/blank attempts with no MCQ yet: Emit MCQ BLOCK immediately.

── WHY PROBE ──
After every correct or close answer, ask: "In your own words, why is that the case?" or "What makes that true?"
This is non-negotiable. Skip ONLY during RECAP and PRACTICE.
Validate the WHY PROBE response using ANSWER VALIDATION rules above. A wrong/vague WHY response = FAIL.

── HINT LADDER ──
L1: Vague directional hint.
L2: Mechanism hint.
L3: Leading question.
L4: Full reveal. "A hash is a fixed-size fingerprint — you can verify it but not reverse it. Restate that."

── MCQ BLOCK ──
Output EXACTLY this JSON on its own line (nothing before or after it on that line):
{"mcq":{"q":"<question>","opts":{"A":"<opt>","B":"<opt>","C":"<opt>","D":"<opt>"},"correct":"<A|B|C|D>"}}
- Correct option is clearly right; three distractors reflect common misconceptions.
- Max 10 words per option.
- Never reveal the correct option in surrounding text.
- Add one short encouragement after: "Take your time — pick what feels right."
- After ANY MCQ answer, ask the WHY PROBE before considering phase advance.

── TONE ──
Encouraging. Never condescending. Never say "Great question!" as filler.

── END SESSION JSON (output this alone on its own line, no other text) ──
{"score": <0-100>, "summary": "<3 sentence recap>", "gaps": ["<topic>", ...]}
`.trim();

// ── Builders ──────────────────────────────────────────────────────────────────
export function buildSystemPrompt(persona: Persona, topic: Topic, currentPhase?: string): string {
  const part1 = persona.systemPromptTemplate
    .replace('{specialization}', persona.specialization)
    .replace('{topic}', topic.name);

  const part2 = `
The student is studying: ${topic.name}.
Learning objective: ${topic.learningObjective}.
Assume the student has ${topic.difficulty} prior knowledge of this subject.
`.trim();

  const phaseAnchor = currentPhase
    ? `\n\n━━ CURRENT SESSION STATE ━━\nYou are currently in the **${currentPhase.toUpperCase()}** phase. Only emit {"advance_phase":"<next>"} for the phase that comes IMMEDIATELY after ${currentPhase.toUpperCase()}. Do NOT emit advance_phase for any other phase. Do NOT re-emit advance_phase for a phase that has already passed.`
    : '';

  return [part1, part2, SCENARIO_C_RULES + phaseAnchor].join('\n\n');
}

export function buildMessageHistory(messages: (DbMessage & { phase_at_send?: string })[]): LLMMessage[] {
  const result: LLMMessage[] = [];
  let lastPhase: string | undefined;

  for (const m of messages) {
    if (m.phase_at_send && m.phase_at_send !== lastPhase) {
      result.push({
        role: 'system',
        content: `[Phase is now: ${m.phase_at_send.toUpperCase()}]`,
      });
      lastPhase = m.phase_at_send;
    }
    result.push({
      role: m.role,
      content: m.role === 'assistant' ? stripSentinelsFromHistory(m.content) : m.content,
    });
  }

  return result;
}

// Removes all {"advance_phase":...}, {"mcq":{...}}, and {"score":...} blocks
// from stored assistant messages before feeding them back to the LLM.
function stripSentinelsFromHistory(text: string): string {
  const MARKERS = ['"mcq":', '"advance_phase":', '"score":'];
  let result = text;
  let changed = true;
  while (changed) {
    changed = false;
    for (const marker of MARKERS) {
      const idx = result.indexOf(marker);
      if (idx === -1) continue;
      const open = result.lastIndexOf('{', idx);
      if (open === -1) continue;
      let depth = 0;
      let close = -1;
      for (let i = open; i < result.length; i++) {
        if (result[i] === '{') depth++;
        else if (result[i] === '}') {
          depth--;
          if (depth === 0) { close = i; break; }
        }
      }
      if (close === -1) continue;
      result = (result.slice(0, open) + result.slice(close + 1)).replace(/\n{3,}/g, '\n\n');
      changed = true;
      break;
    }
  }
  return result.trim();
}
