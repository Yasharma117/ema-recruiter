import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, MagnifyingGlass, SquaresFour } from '@phosphor-icons/react';
import { Button } from '../components/ui';
import { AppShell } from '../components/AppShell';

/**
 * The front door.
 *
 * Nine layouts were built across three screens, and three of them are the
 * answer. Opening straight into the app made those indistinguishable, so the
 * two things are named and separated here — and the finished product is the
 * one wearing the green.
 *
 * Deliberately plain. The two buttons are the content; anything written around
 * them is a paragraph standing between someone and the thing they came to see.
 * No wash either: that belongs to the search cold start, which is a screen with
 * nothing on it. This one has the only two decisions that matter.
 */
export function Landing() {
  const navigate = useNavigate();

  return (
    <AppShell chrome="hidden">
      <div className="h-full overflow-y-auto bg-[var(--app-background)]">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-[560px]">
            <h1 className="text-[30px] leading-[36px] font-bold text-[var(--fg1)] animate-[emaRise_240ms_var(--ease-out-quint)_backwards]">
              Yash’s Ema assignment
            </h1>

            <div className="mt-6 flex items-start gap-3 flex-wrap animate-[emaRise_240ms_var(--ease-out-quint)_60ms_backwards]">
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  icon={<MagnifyingGlass size={16} weight="bold" />}
                  iconRight={<ArrowRight size={14} />}
                  onClick={() => navigate('/search?mode=flow')}
                >
                  View the final screens
                </Button>
                <span className="text-xs text-[var(--fg2)]">The finished flow, end to end.</span>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  variant="secondary"
                  color="altBrand"
                  icon={<SquaresFour size={16} />}
                  onClick={() => navigate('/candidates?mode=variants')}
                >
                  Explore layout variations
                </Button>
                <span className="text-xs text-[var(--fg2)]">The ones we went over on Friday’s call.</span>
              </div>
            </div>

            <div className="mt-10 pt-4 border-t border-[var(--beige-300)] text-xs text-[var(--fg3)] animate-[emaRise_240ms_var(--ease-out-quint)_120ms_backwards]">
              <NavLink to="/docs/NOTES.md" className="font-medium text-[var(--fg2)] hover:text-[var(--fg1)] hover:underline">
                NOTES.md
              </NavLink>
              {' · '}
              <NavLink to="/docs/LAYOUTS.md" className="font-medium text-[var(--fg2)] hover:text-[var(--fg1)] hover:underline">
                LAYOUTS.md
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
