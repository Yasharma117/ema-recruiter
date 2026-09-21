import React from 'react';
import { cx } from './ui';

/**
 * A company's mark, in a table of 110 rows.
 *
 * Down a column, a logo is recognised before a word is read — which is the
 * whole job of this cell, since nobody reads "Stripe" so much as spots it. The
 * tenure underneath stays the thing you actually read.
 *
 * Logos are fetched rather than bundled: 27 companies' trademarks in a public
 * repo is a licensing question a prototype should not be answering, and the
 * favicon endpoint needs no key. The cost is a network dependency, so the
 * fallback is not an error state — it is a designed monogram that renders
 * immediately, covers the one fictional company in the data, and is what the
 * whole column looks like offline. It has to hold up on its own.
 */
const DOMAIN: Record<string, string> = {
  Adyen: 'adyen.com',
  Affirm: 'affirm.com',
  Amazon: 'amazon.com',
  Block: 'block.xyz',
  Brex: 'brex.com',
  'Capital One': 'capitalone.com',
  Chime: 'chime.com',
  Coinbase: 'coinbase.com',
  Datadog: 'datadoghq.com',
  DeepMind: 'deepmind.google',
  'Google Brain': 'google.com',
  Indeed: 'indeed.com',
  Klarna: 'klarna.com',
  Nubank: 'nubank.com.br',
  Palantir: 'palantir.com',
  Plaid: 'plaid.com',
  Ramp: 'ramp.com',
  Robinhood: 'robinhood.com',
  Splunk: 'splunk.com',
  Spotify: 'spotify.com',
  Square: 'squareup.com',
  Stripe: 'stripe.com',
  'Two Sigma': 'twosigma.com',
  'Wells Fargo': 'wellsfargo.com',
  Wise: 'wise.com',
  iFood: 'ifood.com.br',
  // Northwind Financial is invented, so it has no domain and always monograms.
};

/** First letters of the first two words — "Wells Fargo" reads better as WF. */
function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function CompanyLogo({ name, size = 22 }: { name: string; size?: number }) {
  const domain = DOMAIN[name];
  const [failed, setFailed] = React.useState(false);

  const box = cx(
    'shrink-0 rounded-[5px] overflow-hidden select-none',
    'border border-[var(--border-subtle)] bg-white',
  );

  if (!domain || failed) {
    return (
      <span
        aria-hidden
        className={cx(box, 'inline-flex items-center justify-center bg-[var(--bg3)]')}
        style={{ width: size, height: size }}
      >
        <span
          className="font-bold text-[var(--fg2)] leading-none"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initials(name)}
        </span>
      </span>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      aria-hidden
      loading="lazy"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cx(box, 'object-contain')}
      style={{ width: size, height: size }}
    />
  );
}
