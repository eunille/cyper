export interface SessionResult {
  sessionId: string;
  topicId: string;
  personaId: string;
  personaName: string;
  personaRole: string;
  topicName: string;
  topicCategory: string;
  topicDifficulty: string;
  startedAt: string;
  endedAt: string | null;
  score: number | null;
  summary: string | null;
  gaps: string[];
  durationMs: number | null;
  totalMessages: number;
  userMessages: number;
}

export interface Message {
  message_id: string;
  role: string;
  content: string;
  sequence: number;
  phase_at_send: string;
}

export interface ResultData {
  session: SessionResult;
  messages: Message[];
  phaseCounts: Record<string, number>;
}
