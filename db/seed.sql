-- CyberTutor AI — Seed Data
-- Uses sub-selects on name to avoid hardcoding UUIDs.

-- ─────────────────────────────────────────────
-- Personas
-- ─────────────────────────────────────────────
INSERT INTO personas (name, role, specialization, teaching_style, tone, system_prompt_template) VALUES
(
  'Prof. Chen',
  'Network Security Professor',
  'Networking and Protocols',
  'Socratic — asks before telling. Never lectures before gauging baseline.',
  'Calm, precise, methodical',
  'You are Prof. Chen, a Network Security Professor specializing in Networking and Protocols.
Your communication style: Socratic — you ask targeted questions before explaining anything.
Your domain: {specialization}.
Your tone: calm, precise, and methodical.'
),
(
  'Agent Ramos',
  'Threat Intelligence Analyst',
  'Threat Intelligence and the Cyber Kill Chain',
  'Scenario-based — teaches from the attacker perspective using real incident narratives.',
  'Intense, narrative-driven, urgent',
  'You are Agent Ramos, a Threat Intelligence Analyst specializing in Threat Intel and the Cyber Kill Chain.
Your communication style: scenario-based — you place the student inside real attack narratives.
Your domain: {specialization}.
Your tone: intense, narrative-driven, urgent.'
),
(
  'Dr. Kapoor',
  'Cryptography Researcher',
  'Cryptography and Data Safety',
  'First-principles — builds understanding from mathematical foundations before practical application.',
  'Methodical, analogy-heavy, deliberate',
  'You are Dr. Kapoor, a Cryptography Researcher specializing in Cryptography and Data Safety.
Your communication style: first-principles — you build from math upward, always grounding abstractions in concrete analogies.
Your domain: {specialization}.
Your tone: methodical, analogy-heavy, deliberate.'
),
(
  'Maya Cruz',
  'Cybersecurity Career Coach',
  'Career Development and Certifications',
  'Coaching — sets goals, identifies gaps, builds structured study plans.',
  'Encouraging, structured, goal-oriented',
  'You are Maya Cruz, a Cybersecurity Career Coach specializing in Career Development and Certifications.
Your communication style: coaching — you help students set goals, identify knowledge gaps, and create actionable plans.
Your domain: {specialization}.
Your tone: encouraging, structured, goal-oriented.'
);

-- ─────────────────────────────────────────────
-- Topics
-- ─────────────────────────────────────────────

-- Foundations (Prof. Chen)
INSERT INTO topics (name, category, difficulty, learning_objective, suggested_persona) VALUES
(
  'What is Networking?',
  'Foundations',
  'beginner',
  'Understand what a computer network is, why networks exist, and the basic models (OSI, TCP/IP) that describe how data moves.',
  (SELECT persona_id FROM personas WHERE name = 'Prof. Chen')
),
(
  'What is a Firewall?',
  'Foundations',
  'beginner',
  'Explain what a firewall does, the difference between stateful and stateless inspection, and where firewalls sit in a network.',
  (SELECT persona_id FROM personas WHERE name = 'Prof. Chen')
),
(
  'DNS Explained',
  'Foundations',
  'beginner',
  'Describe how DNS resolves domain names to IP addresses and identify common DNS-based attack vectors.',
  (SELECT persona_id FROM personas WHERE name = 'Prof. Chen')
),
(
  'HTTP vs HTTPS',
  'Foundations',
  'beginner',
  'Explain the difference between HTTP and HTTPS, how TLS protects data in transit, and why unencrypted HTTP is dangerous.',
  (SELECT persona_id FROM personas WHERE name = 'Prof. Chen')
),

-- Threat Landscape (Agent Ramos)
(
  'Cyber Kill Chain — 7 Stages',
  'Threat Landscape',
  'intermediate',
  'Name and describe each of the 7 stages of the Cyber Kill Chain and explain how defenders can interrupt each stage.',
  (SELECT persona_id FROM personas WHERE name = 'Agent Ramos')
),
(
  'Types of Malware',
  'Threat Landscape',
  'intermediate',
  'Distinguish between viruses, worms, trojans, ransomware, spyware, and rootkits by behavior and propagation method.',
  (SELECT persona_id FROM personas WHERE name = 'Agent Ramos')
),
(
  'Social Engineering & Phishing',
  'Threat Landscape',
  'beginner',
  'Identify social engineering tactics, recognize phishing indicators, and describe defensive countermeasures.',
  (SELECT persona_id FROM personas WHERE name = 'Agent Ramos')
),
(
  'What is a Zero-Day?',
  'Threat Landscape',
  'intermediate',
  'Define a zero-day vulnerability, explain its lifecycle from discovery to patch, and describe how organizations manage zero-day risk.',
  (SELECT persona_id FROM personas WHERE name = 'Agent Ramos')
),

-- Defense & Operations
(
  'What is a SOC?',
  'Defense & Operations',
  'beginner',
  'Describe the purpose of a Security Operations Center, the roles within it, and the tools (SIEM, SOAR) used day-to-day.',
  (SELECT persona_id FROM personas WHERE name = 'Maya Cruz')
),
(
  'Incident Response Basics',
  'Defense & Operations',
  'intermediate',
  'Explain the six phases of incident response (Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned).',
  (SELECT persona_id FROM personas WHERE name = 'Prof. Chen')
),
(
  'Log Analysis Intro',
  'Defense & Operations',
  'intermediate',
  'Read and interpret common log formats (syslog, Windows Event Log, web server logs) and identify anomalous entries.',
  (SELECT persona_id FROM personas WHERE name = 'Prof. Chen')
),

-- Cryptography (Dr. Kapoor)
(
  'Symmetric vs Asymmetric Encryption',
  'Cryptography',
  'intermediate',
  'Contrast symmetric and asymmetric encryption algorithms, explain key exchange problems, and identify when each is appropriate.',
  (SELECT persona_id FROM personas WHERE name = 'Dr. Kapoor')
),
(
  'What is Hashing?',
  'Cryptography',
  'beginner',
  'Explain what a cryptographic hash function does, describe its properties (deterministic, one-way, collision-resistant), and name common algorithms.',
  (SELECT persona_id FROM personas WHERE name = 'Dr. Kapoor')
),
(
  'TLS Handshake',
  'Cryptography',
  'advanced',
  'Walk through each step of the TLS 1.3 handshake, explain what is negotiated at each step, and identify where authentication and key exchange occur.',
  (SELECT persona_id FROM personas WHERE name = 'Dr. Kapoor')
);
