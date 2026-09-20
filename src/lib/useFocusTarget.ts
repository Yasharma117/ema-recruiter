import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store';

/**
 * Landing behaviour for a notification's click-through.
 *
 * A notification that drops you on the right screen but the wrong person has
 * not delivered you anywhere. Every outreach layout therefore consumes the same
 * target the same way: select that record, and if what happened was a moved
 * call, open the confirmation — because that is the whole reason the
 * notification existed.
 *
 * One-shot by design. The target is cleared from both the store and the URL as
 * soon as it lands, so a refresh or a later navigation does not re-open a
 * dialog about something you already dealt with.
 */
export function useFocusTarget(
  onFocus: (candidateId: string, movedCall: boolean) => void,
) {
  const { focusCandidate, setFocusCandidate, outreach } = useStore();
  const [params, setParams] = useSearchParams();
  const target = focusCandidate ?? params.get('focus');

  // The callback is rebuilt every render; a ref keeps it out of the deps so the
  // effect fires on the target, not on the parent re-rendering.
  const cb = React.useRef(onFocus);
  cb.current = onFocus;

  React.useEffect(() => {
    if (!target) return;
    const record = outreach.find((r) => r.candidateId === target);
    if (!record) return;

    cb.current(target, record.state === 'reschedule-requested');

    setFocusCandidate(null);
    if (params.get('focus')) {
      const next = new URLSearchParams(params);
      next.delete('focus');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, outreach]);

  return target;
}
