import { useParams, Navigate } from 'react-router-dom';
import { marked } from 'marked';
import { AppShell } from '../components/AppShell';
import notes from '../../NOTES.md?raw';
import layouts from '../../LAYOUTS.md?raw';

export const DOCS: Record<string, string> = { 'NOTES.md': notes, 'LAYOUTS.md': layouts };

/** Renders the repo's own markdown, so the write-up ships with the prototype. */
export function DocScreen() {
  const { file = '' } = useParams();
  const md = DOCS[file];
  if (!md) return <Navigate to="/candidates" replace />;
  return (
    <AppShell breadcrumbs={['Docs', file]}>
      <div className="h-full overflow-y-auto">
        <article className="doc max-w-[760px] mx-auto px-8 py-10" dangerouslySetInnerHTML={{ __html: marked.parse(md) as string }} />
      </div>
    </AppShell>
  );
}
