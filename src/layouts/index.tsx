import { CandidatesScreen } from '../screens/Candidates';
import { OutreachScreen } from '../screens/Outreach';
import { SearchScreen } from '../screens/Search';
import { CandidatesSplit } from './CandidatesSplit';
import { CandidatesGrid } from './CandidatesGrid';
import { OutreachFocus } from './OutreachFocus';
import { OutreachBoard } from './OutreachBoard';
import { SearchConversational } from './SearchConversational';
import { SearchLivePreview } from './SearchLivePreview';
import { useVariant } from './LayoutPicker';

/* Variant A is the existing screen, untouched — nothing regresses. */

export function SearchRoute() {
  const v = useVariant('search');
  if (v === 'b') return <SearchConversational />;
  if (v === 'c') return <SearchLivePreview />;
  return <SearchScreen />;
}

export function CandidatesRoute() {
  const v = useVariant('candidates');
  if (v === 'b') return <CandidatesSplit />;
  if (v === 'c') return <CandidatesGrid />;
  return <CandidatesScreen />;
}

export function OutreachRoute() {
  const v = useVariant('outreach');
  if (v === 'b') return <OutreachFocus />;
  if (v === 'c') return <OutreachBoard />;
  return <OutreachScreen />;
}
