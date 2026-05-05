-- CyberTutor AI — Full DDL
-- Run order matters: referenced tables before referencing tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. users
-- ─────────────────────────────────────────────
CREATE TABLE users (
  user_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ─────────────────────────────────────────────
-- 2. personas  (seeded, no FK dependencies)
-- ─────────────────────────────────────────────
CREATE TABLE personas (
  persona_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(100) NOT NULL,
  role                   VARCHAR(100) NOT NULL,
  specialization         TEXT         NOT NULL,
  teaching_style         TEXT         NOT NULL,
  tone                   TEXT         NOT NULL,
  system_prompt_template TEXT         NOT NULL
);

-- ─────────────────────────────────────────────
-- 3. topics  (references personas)
-- ─────────────────────────────────────────────
CREATE TABLE topics (
  topic_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(150) NOT NULL,
  category           VARCHAR(50)  NOT NULL,
  difficulty         VARCHAR(15)  NOT NULL
                     CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  learning_objective TEXT         NOT NULL,
  suggested_persona  UUID         REFERENCES personas(persona_id)
);

-- ─────────────────────────────────────────────
-- 4. sessions  (references users, personas, topics)
-- ─────────────────────────────────────────────
CREATE TABLE sessions (
  session_id UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(user_id),
  persona_id UUID         NOT NULL REFERENCES personas(persona_id),
  topic_id   UUID         NOT NULL REFERENCES topics(topic_id),
  started_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at   TIMESTAMPTZ,
  phase      VARCHAR(20)  NOT NULL DEFAULT 'diagnostic'
             CHECK (phase IN ('diagnostic', 'explain', 'check', 'recap', 'practice', 'ended')),
  score      SMALLINT     CHECK (score BETWEEN 0 AND 100),
  summary    TEXT,
  gaps       TEXT[]       DEFAULT '{}'
);

-- ─────────────────────────────────────────────
-- 5. messages  (references sessions)
-- ─────────────────────────────────────────────
CREATE TABLE messages (
  message_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID         NOT NULL REFERENCES sessions(session_id),
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT         NOT NULL,
  sequence      INTEGER      NOT NULL,
  phase_at_send VARCHAR(20)  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  token_count   INTEGER,

  UNIQUE (session_id, sequence)
);

-- ─────────────────────────────────────────────
-- 6. user_progress  (references users, topics)
-- ─────────────────────────────────────────────
CREATE TABLE user_progress (
  progress_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(user_id),
  topic_id     UUID        NOT NULL REFERENCES topics(topic_id),
  attempts     INTEGER     NOT NULL DEFAULT 0,
  best_score   SMALLINT,
  last_score   SMALLINT,
  mastered     BOOLEAN     NOT NULL DEFAULT FALSE,
  last_studied TIMESTAMPTZ,

  UNIQUE (user_id, topic_id)
);

-- ─────────────────────────────────────────────
-- 7. audit_log  (insert-only, nullable FKs)
-- ─────────────────────────────────────────────
CREATE TABLE audit_log (
  log_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  session_id  UUID,
  endpoint    VARCHAR(100) NOT NULL,
  ip_address  INET,
  status_code SMALLINT     NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
