import { query } from '@/lib/server/db';
import { LearnPageClient } from './LearnPageClient';

export default async function LearnPage() {
  const personas = await query<{
    persona_id: string;
    name: string;
    role: string;
    specialization: string;
    teaching_style: string;
    tone: string;
  }>(`SELECT persona_id, name, role, specialization, teaching_style, tone FROM personas ORDER BY name`);

  const mapped = personas.map((p) => ({
    personaId: p.persona_id,
    name: p.name,
    role: p.role,
    specialization: p.specialization,
    teachingStyle: p.teaching_style,
    tone: p.tone,
  }));

  return <LearnPageClient personas={mapped} />;
}
