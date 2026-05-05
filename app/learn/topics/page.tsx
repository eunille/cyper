import { query } from '@/lib/server/db';
import { TopicsPageClient } from './TopicsPageClient';

export default async function TopicsPage() {
  const topics = await query<{
    topic_id: string;
    name: string;
    category: string;
    difficulty: string;
  }>(`SELECT topic_id, name, category, difficulty FROM topics ORDER BY category, name`);

  const mapped = topics.map((t) => ({
    topicId: t.topic_id,
    name: t.name,
    category: t.category,
    difficulty: t.difficulty as 'beginner' | 'intermediate' | 'advanced',
  }));

  return <TopicsPageClient topics={mapped} />;
}
