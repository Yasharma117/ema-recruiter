import type { Candidate, CriterionScore, Evidence, Signal } from '../lib/types';

/* Scores are baked into the fixture rather than computed at runtime, so
   re-weighting the scorecard re-ranks instantly with no recompute. */

const ev = {
  work: (source: string, when: string, quote: string, href = '#'): Evidence =>
    ({ kind: 'work', source, when, quote, href }),
  repo: (source: string, meta: string, href = '#'): Evidence =>
    ({ kind: 'repo', source, meta, href }),
  pub: (source: string, meta: string, href = '#'): Evidence =>
    ({ kind: 'publication', source, meta, href }),
  ats: (source: string, when: string, quote: string): Evidence =>
    ({ kind: 'internal', source, when, quote }),
  inferred: (source: string): Evidence => ({ kind: 'inferred', source }),
};

const s = (
  criterionId: string,
  score: number | null,
  confidence: 'high' | 'medium' | 'low',
  summary: string,
  whyNotFive: string | undefined,
  evidence: Evidence[],
): CriterionScore => ({ criterionId, score, confidence, summary, whyNotFive, evidence });

const STALE: Signal = { kind: 'stale', label: 'Stale profile', detail: 'Profile last updated over 18 months ago. Current role may be out of date.' };

export const CANDIDATES: Candidate[] = [
  {
    id: 'c_kavya',
    name: 'Kavya Raghunathan',
    title: 'Staff Machine Learning Engineer',
    company: 'Stripe',
    companyTenure: '4y 2m',
    location: 'San Francisco, CA',
    timezone: 'PDT',
    yearsExperience: 11,
    source: 'public',
    profileUpdated: 'Feb 2026',
    profileAgeMonths: 1,
    email: 'k.raghunathan@hey.com',
    emailVerified: true,
    linkedin: 'in/kavyaraghunathan',
    avatarTone: 'green',
    education: 'MS Computer Science, Carnegie Mellon',
    summary:
      'Eleven years in ML infrastructure, the last four owning Stripe Radar\'s real-time inference path. ' +
      'Has run models under PCI and SOC 2 constraints, which is the closest public analogue to the model ' +
      'governance this role sits under. Strongest on serving scale; has never formally managed.',
    roles: [
      { title: 'Staff Machine Learning Engineer', company: 'Stripe', start: 'Jan 2022', end: null, bullet: 'Owns the Radar inference platform — 40k predictions/sec at p99 of 23ms across 4 regions.' },
      { title: 'Senior ML Engineer', company: 'Stripe', start: 'Dec 2021', end: 'Jan 2022' },
      { title: 'ML Engineer', company: 'Adyen', start: 'Mar 2018', end: 'Nov 2021', bullet: 'Built the feature store behind Adyen\'s card-not-present fraud models.' },
      { title: 'Software Engineer', company: 'Palantir', start: 'Jul 2015', end: 'Feb 2018' },
    ],
    news: [
      { title: 'Stripe expands Radar to adaptive rate limiting', source: 'TechCrunch', when: '3 weeks ago' },
      { title: 'Spoke at MLSys 2025 — "Serving risk models under latency SLOs"', source: 'MLSys', when: 'Nov 2025' },
    ],
    signals: [],
    scores: [
      s('c_serving', 5, 'high', 'Owns Radar inference at 40k req/s', undefined, [
        ev.work('Staff ML Engineer · Stripe', 'Jan 2022 – present', 'Owns the Radar inference platform — 40k predictions/sec at p99 of 23ms across 4 regions.'),
        ev.pub('Serving risk models under latency SLOs', 'MLSys 2025 · 1st of 4 authors'),
      ]),
      s('c_seniority', 5, 'high', 'Staff at Stripe, 11 years', undefined, [
        ev.work('Staff ML Engineer · Stripe', 'Jan 2022 – present', 'Promoted to Staff after owning the Radar latency reduction programme across three teams.'),
      ]),
      s('c_regulated', 5, 'high', '8 years in payments under PCI', undefined, [
        ev.work('ML Engineer · Adyen', 'Mar 2018 – Nov 2021', 'Built the feature store behind Adyen\'s card-not-present fraud models.'),
        ev.work('Staff ML Engineer · Stripe', 'Jan 2022 – present', 'Radar operates under PCI DSS and SOC 2 model change control.'),
      ]),
      s('c_leadership', 2, 'high', 'Led 2 engineers, role asks for 5+', '2 not 4: led a pod of 2, and the scorecard bar is a team of 5 or org-wide direction.', [
        ev.work('Staff ML Engineer · Stripe', 'Jan 2022 – present', 'Technical lead for a pod of two engineers on the inference platform.'),
      ]),
      s('c_oss', 4, 'high', 'shardkit — 1.2k stars, active', '4 not 5: widely used but not a category-defining project.', [
        ev.repo('github.com/kavya/shardkit', 'Rust · 1.2k stars · last commit Feb 2026'),
        ev.pub('Serving risk models under latency SLOs', 'MLSys 2025 · 1st of 4 authors'),
      ]),
      s('c_risk', 5, 'high', 'Fraud models at Stripe and Adyen', undefined, [
        ev.work('ML Engineer · Adyen', 'Mar 2018 – Nov 2021', 'Card-not-present fraud detection, shipped to production across EU traffic.'),
      ]),
    ],
  },

  {
    id: 'c_marcus',
    name: 'Marcus Delacroix',
    title: 'Principal Engineer, ML Platform',
    company: 'Block',
    companyTenure: '3y 7m',
    location: 'Oakland, CA',
    timezone: 'PDT',
    yearsExperience: 14,
    source: 'public',
    profileUpdated: 'Jan 2026',
    profileAgeMonths: 2,
    email: 'marcus.delacroix@fastmail.com',
    emailVerified: true,
    linkedin: 'in/marcusdelacroix',
    avatarTone: 'purple',
    education: 'BS Electrical Engineering, Georgia Tech',
    summary:
      'Fourteen years, currently Principal at Block running the ML platform org. The inverse of Kavya: ' +
      'deep organisational leadership and regulated-domain exposure, lighter on hands-on serving scale ' +
      'in the last three years.',
    roles: [
      { title: 'Principal Engineer, ML Platform', company: 'Block', start: 'Aug 2022', end: null, bullet: 'Sets technical direction for 18 engineers across 3 teams; owns the model governance review process.' },
      { title: 'Staff Engineer', company: 'Block', start: 'May 2020', end: 'Aug 2022', bullet: 'Built Cash App\'s real-time scoring service, 12k req/s peak.' },
      { title: 'Senior Engineer', company: 'Capital One', start: 'Jun 2016', end: 'Apr 2020', bullet: 'Credit risk model deployment under OCC model risk management guidance.' },
    ],
    news: [
      { title: 'Block open-sources its feature governance tooling', source: 'InfoQ', when: '2 months ago' },
    ],
    signals: [],
    scores: [
      s('c_serving', 3, 'medium', 'Built scoring service, 3 years ago', '3 not 5: 12k req/s and the hands-on work was 2020–22; now largely directional.', [
        ev.work('Staff Engineer · Block', 'May 2020 – Aug 2022', 'Built Cash App\'s real-time scoring service, 12k req/s peak.'),
        ev.inferred('Current Principal role described in org terms; no serving metrics stated after 2022.'),
      ]),
      s('c_seniority', 5, 'high', 'Principal at Block, 14 years', undefined, [
        ev.work('Principal Engineer · Block', 'Aug 2022 – present', 'Sets technical direction for 18 engineers across 3 teams.'),
      ]),
      s('c_regulated', 5, 'high', 'Capital One + Block, OCC exposure', undefined, [
        ev.work('Senior Engineer · Capital One', 'Jun 2016 – Apr 2020', 'Credit risk model deployment under OCC model risk management guidance.'),
        ev.work('Principal Engineer · Block', 'Aug 2022 – present', 'Owns the model governance review process.'),
      ]),
      s('c_leadership', 5, 'high', 'Directs 18 engineers across 3 teams', undefined, [
        ev.work('Principal Engineer · Block', 'Aug 2022 – present', 'Sets technical direction for 18 engineers across 3 teams.'),
      ]),
      s('c_oss', 2, 'medium', 'No personal repos; team shipped one', '2 not 4: the open-source release is his org\'s, not attributable to him individually.', [
        ev.inferred('Named in Block\'s feature-governance release announcement, but not as a committer.'),
      ]),
      s('c_risk', 5, 'high', 'Credit and payments risk, 9 years', undefined, [
        ev.work('Senior Engineer · Capital One', 'Jun 2016 – Apr 2020', 'Credit risk model deployment under OCC model risk management guidance.'),
      ]),
    ],
  },

  {
    id: 'c_priya',
    name: 'Priya Venkatesan',
    title: 'Senior Staff Engineer',
    company: 'Mercury',
    companyTenure: '3 weeks',
    location: 'New York, NY',
    timezone: 'EDT',
    yearsExperience: 10,
    source: 'internal',
    profileUpdated: 'Mar 2026',
    profileAgeMonths: 0,
    email: 'priya.v@northwind.com',
    emailVerified: true,
    linkedin: 'in/priyavenkatesan',
    avatarTone: 'green',
    education: 'PhD Computer Science, UT Austin',
    summary:
      'Came through our own ATS eleven months ago for a Staff Backend role and got to final round. ' +
      'Started at Mercury three weeks ago, which makes her a long shot right now but worth a relationship.',
    roles: [
      { title: 'Senior Staff Engineer', company: 'Mercury', start: 'Mar 2026', end: null },
      { title: 'Staff Engineer', company: 'Plaid', start: 'Feb 2021', end: 'Feb 2026', bullet: 'Led the transaction enrichment ML service — 28k req/s, 99.98% availability.' },
      { title: 'Senior Engineer', company: 'Two Sigma', start: 'Aug 2017', end: 'Jan 2021' },
    ],
    news: [
      { title: 'Joined Mercury as Senior Staff Engineer', source: 'LinkedIn', when: '3 weeks ago' },
    ],
    signals: [
      { kind: 'recently-moved', label: 'Started 3 weeks ago', detail: 'Started at Mercury 3 weeks ago — unlikely to move.' },
      { kind: 'previously-rejected', label: 'Previously interviewed', detail: 'Final round for Staff Backend, Apr 2025. Feedback: strong systems depth, passed on for domain fit.' },
    ],
    scores: [
      s('c_serving', 5, 'high', 'Enrichment service at 28k req/s', undefined, [
        ev.work('Staff Engineer · Plaid', 'Feb 2021 – Feb 2026', 'Led the transaction enrichment ML service — 28k req/s, 99.98% availability.'),
        ev.ats('Greenhouse · Staff Backend, Apr 2025', 'Interview panel', 'Walked through the Plaid enrichment architecture in depth. Panel rated systems design 4/4.'),
      ]),
      s('c_seniority', 5, 'high', 'Senior Staff, 10 years', undefined, [
        ev.work('Senior Staff Engineer · Mercury', 'Mar 2026 – present', ''),
      ]),
      s('c_regulated', 4, 'high', '5 years fintech at Plaid', '4 not 5: fintech throughout, but no direct model-governance ownership stated.', [
        ev.work('Staff Engineer · Plaid', 'Feb 2021 – Feb 2026', 'Transaction enrichment across bank-linked accounts under SOC 2.'),
      ]),
      s('c_leadership', 4, 'high', 'Led enrichment team of 6', '4 not 5: team-level leadership, not org-wide direction.', [
        ev.work('Staff Engineer · Plaid', 'Feb 2021 – Feb 2026', 'Led a team of 6 on transaction enrichment.'),
      ]),
      s('c_oss', 3, 'medium', 'PhD publications, no recent OSS', '3 not 5: strong academic record but nothing shipped publicly since 2019.', [
        ev.pub('Streaming Feature Aggregation at Scale', 'VLDB 2019 · 2nd of 5 authors'),
      ]),
      s('c_risk', 3, 'medium', 'Adjacent to risk, not owned', '3 not 5: enrichment feeds risk models but she did not own scoring.', [
        ev.inferred('Transaction enrichment is upstream of risk; no fraud or credit model ownership stated.'),
      ]),
    ],
  },

  {
    id: 'c_tobias',
    name: 'Tobias Lindqvist',
    title: 'Machine Learning Engineer',
    company: 'Klarna',
    companyTenure: '5y 1m',
    location: 'Stockholm, Sweden',
    timezone: 'CET',
    yearsExperience: 9,
    source: 'public',
    profileUpdated: 'Aug 2024',
    profileAgeMonths: 19,
    email: null,
    emailVerified: false,
    linkedin: 'in/tobiaslindqvist',
    avatarTone: 'beige',
    education: 'MSc Machine Learning, KTH',
    summary:
      'Nine years, five at Klarna on buy-now-pay-later credit models. Strong regulated-domain and risk ' +
      'fit. Two problems: no email on file, and the profile has not been touched in 19 months so the ' +
      'current role may be stale.',
    roles: [
      { title: 'Machine Learning Engineer', company: 'Klarna', start: 'Feb 2021', end: null, bullet: 'Owns the underwriting model for BNPL across the Nordics.' },
      { title: 'Data Scientist', company: 'Spotify', start: 'Sep 2017', end: 'Jan 2021' },
    ],
    news: [],
    signals: [
      STALE,
      { kind: 'no-email', label: 'No email on file', detail: 'No verified address found. LinkedIn is the only channel.' },
    ],
    scores: [
      s('c_serving', 3, 'low', 'Serving scale not stated anywhere', '3 not 5: owns a production model but no throughput or latency figures are public.', [
        ev.inferred('Inferred from "owns the underwriting model" — no serving metrics in the profile.'),
      ]),
      s('c_seniority', 3, 'low', 'IC title, 9 years, no staff scope', '3 not 5: nine years of experience but the title has not moved since 2021.', [
        ev.inferred('Inferred from title and tenure only. No scope or promotion detail on the profile.'),
      ]),
      s('c_regulated', 5, 'high', 'BNPL underwriting under EU rules', undefined, [
        ev.work('ML Engineer · Klarna', 'Feb 2021 – present', 'Owns the underwriting model for BNPL across the Nordics.'),
      ]),
      s('c_leadership', null, 'low', 'No evidence found', undefined, [
        ev.inferred('Nothing in the profile speaks to team or technical leadership.'),
      ]),
      s('c_oss', null, 'low', 'No evidence found', undefined, [
        ev.inferred('No public repositories or publications located.'),
      ]),
      s('c_risk', 5, 'high', 'Credit risk models, 5 years', undefined, [
        ev.work('ML Engineer · Klarna', 'Feb 2021 – present', 'Underwriting and credit decisioning for BNPL.'),
      ]),
    ],
  },

  {
    id: 'c_amara',
    name: 'Amara Osei',
    title: 'Senior Machine Learning Engineer',
    company: 'Affirm',
    companyTenure: '2y 9m',
    location: 'Remote — Austin, TX',
    timezone: 'CDT',
    yearsExperience: 8,
    source: 'public',
    profileUpdated: 'Jan 2026',
    profileAgeMonths: 2,
    email: 'amara.osei@proton.me',
    emailVerified: true,
    linkedin: 'in/amaraosei',
    avatarTone: 'purple',
    education: 'BS Mathematics, Howard University',
    summary:
      'Eight years, currently Senior at Affirm on the risk decisioning platform. Right domain, right ' +
      'scale, one level below the bar — the open question is whether this is a stretch hire.',
    roles: [
      { title: 'Senior ML Engineer', company: 'Affirm', start: 'Jun 2023', end: null, bullet: 'Rebuilt the real-time decisioning service to 15k req/s, cut p99 from 180ms to 41ms.' },
      { title: 'ML Engineer', company: 'Chime', start: 'Mar 2020', end: 'May 2023', bullet: 'Fraud detection models for ACH and card disputes.' },
      { title: 'Data Engineer', company: 'Indeed', start: 'Jul 2018', end: 'Feb 2020' },
    ],
    news: [
      { title: 'Affirm reports lower loss rates on new decisioning stack', source: 'American Banker', when: '5 weeks ago' },
    ],
    signals: [],
    scores: [
      s('c_serving', 4, 'high', 'Decisioning service at 15k req/s', '4 not 5: real production scale, an order of magnitude under the strongest candidates.', [
        ev.work('Senior ML Engineer · Affirm', 'Jun 2023 – present', 'Rebuilt the real-time decisioning service to 15k req/s, cut p99 from 180ms to 41ms.'),
      ]),
      s('c_seniority', 3, 'high', 'Senior, 8 years — one level below', '3 not 5: eight years and clear trajectory, but not yet operating at staff scope.', [
        ev.work('Senior ML Engineer · Affirm', 'Jun 2023 – present', ''),
      ]),
      s('c_regulated', 5, 'high', 'Six years in lending and banking', undefined, [
        ev.work('ML Engineer · Chime', 'Mar 2020 – May 2023', 'Fraud detection models for ACH and card disputes.'),
      ]),
      s('c_leadership', 3, 'medium', 'Tech lead on one project', '3 not 5: project-level leadership without formal reports.', [
        ev.work('Senior ML Engineer · Affirm', 'Jun 2023 – present', 'Technical lead for the decisioning rebuild.'),
      ]),
      s('c_oss', 3, 'high', 'Two talks, modest repo activity', '3 not 5: conference talks but no widely adopted project.', [
        ev.repo('github.com/aosei/featurelint', 'Python · 180 stars · last commit Sep 2025'),
      ]),
      s('c_risk', 5, 'high', 'Fraud and credit at Chime + Affirm', undefined, [
        ev.work('ML Engineer · Chime', 'Mar 2020 – May 2023', 'Fraud detection models for ACH and card disputes.'),
      ]),
    ],
  },

  {
    id: 'c_hiroshi',
    name: 'Hiroshi Nakamura',
    title: 'Research Scientist',
    company: 'DeepMind',
    companyTenure: '4y 4m',
    location: 'London, UK',
    timezone: 'BST',
    yearsExperience: 12,
    source: 'public',
    profileUpdated: 'Dec 2025',
    profileAgeMonths: 3,
    email: 'h.nakamura@gmail.com',
    emailVerified: false,
    linkedin: 'in/hiroshinakamura',
    avatarTone: 'beige',
    education: 'PhD Machine Learning, University of Tokyo',
    summary:
      'Exceptional researcher, wrong shape for this role. The brief explicitly excludes pure research ' +
      'profiles, and he fails the production-serving requirement — kept visible rather than filtered ' +
      'out so the judgment is the recruiter\'s.',
    roles: [
      { title: 'Research Scientist', company: 'DeepMind', start: 'Nov 2021', end: null, bullet: 'Efficient inference research; 14 papers, 3 first-author at NeurIPS.' },
      { title: 'Research Engineer', company: 'Google Brain', start: 'Mar 2017', end: 'Oct 2021' },
    ],
    news: [
      { title: 'NeurIPS 2025 best paper runner-up', source: 'NeurIPS', when: 'Dec 2025' },
    ],
    signals: [{ kind: 'gate-failed', label: 'Fails a required criterion' }],
    scores: [
      s('c_serving', 2, 'high', 'Research inference, never productionised', '2 not 4: the work is about inference efficiency, but none of it has run in production.', [
        ev.work('Research Scientist · DeepMind', 'Nov 2021 – present', 'Efficient inference research; 14 papers, 3 first-author at NeurIPS.'),
        ev.inferred('No production deployment, SLO or throughput figures anywhere in the profile.'),
      ]),
      s('c_seniority', 4, 'high', '12 years, senior research scope', '4 not 5: senior in research, without the engineering ownership the role needs.', [
        ev.work('Research Scientist · DeepMind', 'Nov 2021 – present', ''),
      ]),
      s('c_regulated', 1, 'high', 'No regulated-domain exposure', '1: no fintech, health or otherwise governed work in 12 years.', [
        ev.inferred('Entire career in research labs.'),
      ]),
      s('c_leadership', 3, 'medium', 'Leads a research sub-team', '3 not 5: research direction rather than engineering leadership.', [
        ev.work('Research Scientist · DeepMind', 'Nov 2021 – present', 'Leads a sub-team of 4 researchers.'),
      ]),
      s('c_oss', 5, 'high', '14 papers, 3 first-author NeurIPS', undefined, [
        ev.pub('Sparse Routing for Low-Latency Inference', 'NeurIPS 2025 · 1st of 4 authors'),
        ev.repo('github.com/hnakamura/sparse-route', 'Python · 3.4k stars'),
      ]),
      s('c_risk', null, 'low', 'No evidence found', undefined, [
        ev.inferred('No risk or fraud modelling in the profile.'),
      ]),
    ],
  },

  {
    id: 'c_elena',
    name: 'Elena Vasquez',
    title: 'Staff Engineer, Risk Platform',
    company: 'Coinbase',
    companyTenure: '2y 1m',
    location: 'Remote — Denver, CO',
    timezone: 'MDT',
    yearsExperience: 10,
    source: 'public',
    profileUpdated: 'Feb 2026',
    profileAgeMonths: 1,
    email: 'elena@vasquez.dev',
    emailVerified: true,
    linkedin: 'in/elenavasquez',
    avatarTone: 'green',
    education: 'BS Computer Science, UC Berkeley',
    summary:
      'Staff on Coinbase\'s risk platform. Strong across the board with no standout weakness — the kind ' +
      'of profile that ranks well on a balanced scorecard and gets overlooked on a spiky one.',
    roles: [
      { title: 'Staff Engineer, Risk Platform', company: 'Coinbase', start: 'Feb 2024', end: null, bullet: 'Owns transaction monitoring inference — 22k req/s, serves 9 downstream teams.' },
      { title: 'Senior Engineer', company: 'Robinhood', start: 'Jan 2021', end: 'Jan 2024', bullet: 'Surveillance and market-abuse detection models under FINRA oversight.' },
      { title: 'Engineer', company: 'Splunk', start: 'Jun 2016', end: 'Dec 2020' },
    ],
    news: [],
    signals: [],
    scores: [
      s('c_serving', 4, 'high', 'Monitoring inference at 22k req/s', '4 not 5: strong scale, though the platform is inherited rather than built.', [
        ev.work('Staff Engineer · Coinbase', 'Feb 2024 – present', 'Owns transaction monitoring inference — 22k req/s, serves 9 downstream teams.'),
      ]),
      s('c_seniority', 4, 'high', 'Staff, 10 years', '4 not 5: staff title held for two years; scope is team rather than org.', [
        ev.work('Staff Engineer · Coinbase', 'Feb 2024 – present', ''),
      ]),
      s('c_regulated', 5, 'high', 'FINRA and crypto compliance', undefined, [
        ev.work('Senior Engineer · Robinhood', 'Jan 2021 – Jan 2024', 'Surveillance and market-abuse detection models under FINRA oversight.'),
      ]),
      s('c_leadership', 4, 'high', 'Leads 4, coordinates 9 teams', '4 not 5: leads a team of four; the bar is five or org-wide direction.', [
        ev.work('Staff Engineer · Coinbase', 'Feb 2024 – present', 'Leads a team of 4 and coordinates across 9 consuming teams.'),
      ]),
      s('c_oss', 2, 'medium', 'Occasional contributions only', '2 not 4: a handful of upstream PRs, nothing owned.', [
        ev.repo('Contributor to apache/flink', '6 merged PRs · 2023–2025'),
      ]),
      s('c_risk', 5, 'high', 'Risk and surveillance, 5 years', undefined, [
        ev.work('Senior Engineer · Robinhood', 'Jan 2021 – Jan 2024', 'Market-abuse detection.'),
      ]),
    ],
  },

  {
    id: 'c_daniel',
    name: 'Daniel Mbeki',
    title: 'Senior Staff ML Engineer',
    company: 'Northwind Financial',
    companyTenure: '5y 3m',
    location: 'San Francisco, CA',
    timezone: 'PDT',
    yearsExperience: 13,
    source: 'internal',
    profileUpdated: 'Mar 2026',
    profileAgeMonths: 0,
    email: 'daniel.mbeki@northwind.com',
    emailVerified: true,
    linkedin: 'in/danielmbeki',
    avatarTone: 'green',
    education: 'MS Statistics, Stanford',
    summary:
      'Already works here, on the Lending team. Surfaced from the ATS because he matches the scorecard ' +
      'better than most external candidates. This is an internal mobility conversation, not outreach.',
    roles: [
      { title: 'Senior Staff ML Engineer', company: 'Northwind Financial', start: 'Dec 2020', end: null, bullet: 'Owns lending model infrastructure — 18k req/s under internal model risk governance.' },
      { title: 'Staff Engineer', company: 'Wells Fargo', start: 'Apr 2016', end: 'Nov 2020' },
    ],
    news: [],
    signals: [
      { kind: 'current-employee', label: 'Current employee', detail: 'Lending team, reports to Anita Rao. Outreach is disabled — this is an internal mobility conversation.' },
    ],
    scores: [
      s('c_serving', 4, 'high', 'Lending inference at 18k req/s', '4 not 5: solid scale, single-region.', [
        ev.ats('Workday · internal profile', 'Updated Mar 2026', 'Owns lending model infrastructure — 18k req/s under internal model risk governance.'),
      ]),
      s('c_seniority', 5, 'high', 'Senior Staff, 13 years', undefined, [
        ev.ats('Workday · internal profile', 'Updated Mar 2026', 'Senior Staff, promoted Jan 2024.'),
      ]),
      s('c_regulated', 5, 'high', 'Entire career in regulated finance', undefined, [
        ev.ats('Workday · internal profile', 'Updated Mar 2026', 'Model risk governance owner for the Lending team.'),
      ]),
      s('c_leadership', 4, 'high', 'Leads 5 on lending infra', '4 not 5: leads five, without org-wide remit.', [
        ev.ats('Workday · internal profile', 'Updated Mar 2026', 'Leads a team of 5.'),
      ]),
      s('c_oss', 1, 'medium', 'No public work', '1: nothing public; unsurprising given a career in banking.', [
        ev.inferred('No public repositories or publications.'),
      ]),
      s('c_risk', 5, 'high', 'Credit risk, 13 years', undefined, [
        ev.ats('Workday · internal profile', 'Updated Mar 2026', 'Credit risk modelling across two institutions.'),
      ]),
    ],
  },

  {
    id: 'c_sofia',
    name: 'Sofia Almeida',
    title: 'Machine Learning Engineer',
    company: 'Nubank',
    companyTenure: '3y 2m',
    location: 'São Paulo, Brazil',
    timezone: 'BRT',
    yearsExperience: 7,
    source: 'public',
    profileUpdated: 'Nov 2025',
    profileAgeMonths: 4,
    email: 'sofia.almeida@hey.com',
    emailVerified: true,
    linkedin: 'in/sofiaalmeida',
    avatarTone: 'purple',
    education: 'BS Computer Engineering, Unicamp',
    summary:
      'Seven years, three at Nubank on fraud. Right at the experience floor and outside the stated ' +
      'location preference, which is a filter question rather than a quality one.',
    roles: [
      { title: 'ML Engineer', company: 'Nubank', start: 'Jan 2023', end: null, bullet: 'Real-time fraud scoring for 90M customers, 11k req/s.' },
      { title: 'Data Scientist', company: 'iFood', start: 'Feb 2019', end: 'Dec 2022' },
    ],
    news: [],
    signals: [],
    scores: [
      s('c_serving', 4, 'high', 'Fraud scoring at 11k req/s', '4 not 5: real scale, below the strongest in this pool.', [
        ev.work('ML Engineer · Nubank', 'Jan 2023 – present', 'Real-time fraud scoring for 90M customers, 11k req/s.'),
      ]),
      s('c_seniority', 3, 'high', '7 years, at the floor', '3 not 5: meets the seven-year minimum exactly, IC title.', [
        ev.work('ML Engineer · Nubank', 'Jan 2023 – present', ''),
      ]),
      s('c_regulated', 4, 'high', 'Digital banking, BCB regulated', '4 not 5: regulated banking, though under Brazilian rather than US rules.', [
        ev.work('ML Engineer · Nubank', 'Jan 2023 – present', 'Fraud models under Banco Central do Brasil supervision.'),
      ]),
      s('c_leadership', 2, 'medium', 'No leadership signals', '2 not 4: individual contributor throughout.', [
        ev.inferred('No team or lead responsibilities stated.'),
      ]),
      s('c_oss', 3, 'high', 'Active PyData speaker', '3 not 5: community visibility without a flagship project.', [
        ev.repo('github.com/salmeida/driftwatch', 'Python · 340 stars'),
      ]),
      s('c_risk', 5, 'high', 'Fraud modelling, 3 years', undefined, [
        ev.work('ML Engineer · Nubank', 'Jan 2023 – present', 'Real-time fraud scoring.'),
      ]),
    ],
  },

  {
    id: 'c_james',
    name: 'James Whitfield',
    title: 'Director of Engineering',
    company: 'Plaid',
    companyTenure: '1y 8m',
    location: 'San Francisco, CA',
    timezone: 'PDT',
    yearsExperience: 16,
    source: 'public',
    profileUpdated: 'Feb 2026',
    profileAgeMonths: 1,
    email: 'jwhitfield@icloud.com',
    emailVerified: true,
    linkedin: 'in/jameswhitfield',
    avatarTone: 'beige',
    education: 'BS Computer Science, University of Michigan',
    summary:
      'Moved into management four years ago and has not written production code since. Overqualified ' +
      'on paper, mismatched in practice — a good illustration of why years of experience alone is a ' +
      'poor ranking signal.',
    roles: [
      { title: 'Director of Engineering', company: 'Plaid', start: 'Jul 2024', end: null, bullet: 'Manages 4 teams, 31 engineers.' },
      { title: 'Engineering Manager', company: 'Plaid', start: 'Mar 2022', end: 'Jul 2024' },
      { title: 'Staff Engineer', company: 'Square', start: 'Jan 2018', end: 'Feb 2022', bullet: 'Payments ledger infrastructure.' },
    ],
    news: [],
    signals: [{ kind: 'gate-failed', label: 'Fails a required criterion' }],
    scores: [
      s('c_serving', 2, 'medium', 'Last hands-on serving work in 2022', '2 not 4: strong historically, four years out of date.', [
        ev.work('Staff Engineer · Square', 'Jan 2018 – Feb 2022', 'Payments ledger infrastructure.'),
        ev.inferred('Current and previous roles are managerial; no recent hands-on evidence.'),
      ]),
      s('c_seniority', 5, 'high', 'Director, 16 years', undefined, [
        ev.work('Director of Engineering · Plaid', 'Jul 2024 – present', 'Manages 4 teams, 31 engineers.'),
      ]),
      s('c_regulated', 5, 'high', 'Payments throughout', undefined, [
        ev.work('Staff Engineer · Square', 'Jan 2018 – Feb 2022', 'Payments ledger infrastructure.'),
      ]),
      s('c_leadership', 5, 'high', 'Manages 31 engineers', undefined, [
        ev.work('Director of Engineering · Plaid', 'Jul 2024 – present', 'Manages 4 teams, 31 engineers.'),
      ]),
      s('c_oss', null, 'low', 'No evidence found', undefined, [ev.inferred('No public work located.')]),
      s('c_risk', 3, 'medium', 'Adjacent via payments, not owned', '3 not 5: payments infrastructure rather than risk modelling.', [
        ev.inferred('Ledger and payments work is adjacent to risk; no model ownership stated.'),
      ]),
    ],
  },

  {
    id: 'c_yuki',
    name: 'Yuki Tanaka',
    title: 'Staff ML Engineer',
    company: 'Wise',
    companyTenure: '2y 6m',
    location: 'Remote — Seattle, WA',
    timezone: 'PDT',
    yearsExperience: 9,
    source: 'public',
    profileUpdated: 'Jan 2026',
    profileAgeMonths: 2,
    email: 'yuki.tanaka@fastmail.com',
    emailVerified: true,
    linkedin: 'in/yukitanaka',
    avatarTone: 'green',
    education: 'MS Computer Science, University of Washington',
    summary:
      'Staff at Wise on cross-border transfer risk. Also appears in Daniel\'s EMEA search, so contacting ' +
      'her needs a conversation first.',
    roles: [
      { title: 'Staff ML Engineer', company: 'Wise', start: 'Sep 2023', end: null, bullet: 'Transfer risk scoring across 40 corridors, 9k req/s.' },
      { title: 'Senior ML Engineer', company: 'Amazon', start: 'Jun 2019', end: 'Aug 2023' },
    ],
    news: [],
    signals: [
      { kind: 'duplicate', label: 'In another search', detail: 'Active in "Staff Backend — EMEA", owned by Daniel Okafor. Contacted 12 days ago.' },
    ],
    scores: [
      s('c_serving', 4, 'high', 'Transfer risk scoring at 9k req/s', '4 not 5: production scale, modest throughput.', [
        ev.work('Staff ML Engineer · Wise', 'Sep 2023 – present', 'Transfer risk scoring across 40 corridors, 9k req/s.'),
      ]),
      s('c_seniority', 4, 'high', 'Staff, 9 years', '4 not 5: staff scope, slightly under the experience of the top of this list.', [
        ev.work('Staff ML Engineer · Wise', 'Sep 2023 – present', ''),
      ]),
      s('c_regulated', 5, 'high', 'Cross-border payments, FCA', undefined, [
        ev.work('Staff ML Engineer · Wise', 'Sep 2023 – present', 'Operates under FCA and multi-jurisdiction transfer rules.'),
      ]),
      s('c_leadership', 3, 'medium', 'Mentors 3, no formal reports', '3 not 5: mentorship without team ownership.', [
        ev.inferred('Mentorship mentioned; no direct reports stated.'),
      ]),
      s('c_oss', 2, 'low', 'Sparse public activity', '2 not 4: a few small repos, none maintained.', [
        ev.repo('github.com/ytanaka', '4 repos · last commit Jan 2024'),
      ]),
      s('c_risk', 5, 'high', 'Transfer and AML risk', undefined, [
        ev.work('Staff ML Engineer · Wise', 'Sep 2023 – present', 'Transfer risk and AML scoring.'),
      ]),
    ],
  },

  {
    id: 'c_omar',
    name: 'Omar Haddad',
    title: 'Senior ML Engineer',
    company: 'Brex',
    companyTenure: '1y 11m',
    location: 'New York, NY',
    timezone: 'EDT',
    yearsExperience: 8,
    source: 'public',
    profileUpdated: 'Dec 2025',
    profileAgeMonths: 3,
    email: 'omar.haddad@hey.com',
    emailVerified: false,
    linkedin: 'in/omarhaddad',
    avatarTone: 'purple',
    education: 'BS Computer Science, NYU',
    summary:
      'Senior at Brex on spend controls. Solid but unremarkable against this scorecard; included to show ' +
      'the middle of the distribution.',
    roles: [
      { title: 'Senior ML Engineer', company: 'Brex', start: 'Apr 2024', end: null, bullet: 'Spend anomaly detection, 6k req/s.' },
      { title: 'ML Engineer', company: 'Datadog', start: 'Aug 2020', end: 'Mar 2024' },
    ],
    news: [],
    signals: [],
    scores: [
      s('c_serving', 3, 'high', 'Anomaly detection at 6k req/s', '3 not 5: production, an order of magnitude below the bar.', [
        ev.work('Senior ML Engineer · Brex', 'Apr 2024 – present', 'Spend anomaly detection, 6k req/s.'),
      ]),
      s('c_seniority', 3, 'high', 'Senior, 8 years', '3 not 5: below staff scope.', [
        ev.work('Senior ML Engineer · Brex', 'Apr 2024 – present', ''),
      ]),
      s('c_regulated', 4, 'high', 'Corporate cards, 2 years', '4 not 5: fintech, though only two years of it.', [
        ev.work('Senior ML Engineer · Brex', 'Apr 2024 – present', 'Spend controls for corporate cards.'),
      ]),
      s('c_leadership', 2, 'medium', 'No leadership signals', '2 not 4: individual contributor.', [ev.inferred('No leadership detail on the profile.')]),
      s('c_oss', 3, 'medium', 'Moderate repo activity', '3 not 5: consistent contributions, nothing widely adopted.', [
        ev.repo('github.com/ohaddad/anomkit', 'Python · 95 stars'),
      ]),
      s('c_risk', 4, 'high', 'Spend and abuse detection', '4 not 5: anomaly detection rather than credit or fraud loss modelling.', [
        ev.work('Senior ML Engineer · Brex', 'Apr 2024 – present', 'Spend anomaly detection.'),
      ]),
    ],
  },
];

/* ---------------------------------------------------------------------------
   Tail of the distribution. Deterministic so screenshots reproduce.
--------------------------------------------------------------------------- */

const FIRST = ['Ana', 'Ben', 'Chen', 'Dara', 'Eli', 'Farah', 'Gus', 'Hana', 'Ivan', 'Jules', 'Kai', 'Lena', 'Mateo', 'Nina', 'Oskar', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Uma', 'Viktor', 'Wren', 'Xavi', 'Yara', 'Zane'];
const LAST = ['Adeyemi', 'Bergström', 'Castellanos', 'Dubois', 'Ellison', 'Ferreira', 'Grigoryan', 'Hoffmann', 'Ibrahim', 'Jansen', 'Kowalski', 'Lombardi', 'Moreau', 'Novak', 'Oyelaran', 'Petrov', 'Quintero', 'Rasmussen', 'Silva', 'Thorne', 'Ueda', 'Volkov', 'Weaver', 'Xu', 'Yilmaz', 'Zhang'];
const COMPANIES = ['Marqeta', 'Checkout.com', 'Adyen', 'Revolut', 'Monzo', 'SoFi', 'Chime', 'Dave', 'Mercury', 'Modern Treasury', 'Unit', 'Lithic', 'Pagaya', 'Upstart', 'Zest AI', 'Feedzai', 'Sift', 'Forter', 'Riskified', 'Socure'];
const TITLES = ['Machine Learning Engineer', 'Senior ML Engineer', 'Staff ML Engineer', 'ML Platform Engineer', 'Senior Data Scientist', 'Applied Scientist'];
const CITIES = ['Austin, TX', 'Chicago, IL', 'Boston, MA', 'Seattle, WA', 'Denver, CO', 'Remote — US', 'New York, NY', 'Portland, OR', 'Atlanta, GA', 'Miami, FL'];

/** Mulberry32 — small deterministic PRNG so the tail is stable across reloads. */
function prng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CRIT_IDS = ['c_serving', 'c_seniority', 'c_regulated', 'c_leadership', 'c_oss', 'c_risk'];
const PHRASES: Record<string, string[]> = {
  c_serving: ['Production serving, modest scale', 'Batch scoring only', 'Owns one inference service', 'Serving scale not stated'],
  c_seniority: ['Senior title, right tenure', 'Below staff scope', 'Staff-level ownership', 'Title has not moved in 4 years'],
  c_regulated: ['Fintech throughout', 'Two years in lending', 'Adjacent, not regulated', 'Payments background'],
  c_leadership: ['Mentors juniors', 'No leadership signals', 'Tech lead on one project', 'Led a small team'],
  c_oss: ['Sparse public activity', 'One maintained repo', 'Conference talks only', 'No public work'],
  c_risk: ['Fraud models in production', 'Adjacent to risk', 'Credit decisioning', 'No risk modelling found'],
};

function makeTail(count: number): Candidate[] {
  const rand = prng(20260316);
  const out: Candidate[] = [];

  for (let i = 0; i < count; i++) {
    const first = FIRST[Math.floor(rand() * FIRST.length)];
    const last = LAST[Math.floor(rand() * LAST.length)];
    const company = COMPANIES[Math.floor(rand() * COMPANIES.length)];
    const title = TITLES[Math.floor(rand() * TITLES.length)];
    const ageMonths = Math.floor(rand() * 40);
    const years = 5 + Math.floor(rand() * 9);
    const hasEmail = rand() > 0.18;

    const scores: CriterionScore[] = CRIT_IDS.map((id) => {
      const roll = rand();
      // ~12% of criteria have no evidence at all — that is what coverage measures.
      const score = roll < 0.12 ? null : 1 + Math.floor(rand() * 4);
      const confidence = score === null ? 'low' : roll > 0.78 ? 'low' : roll > 0.55 ? 'medium' : 'high';
      const phrase = PHRASES[id][Math.floor(rand() * PHRASES[id].length)];
      return {
        criterionId: id,
        score,
        confidence: confidence as 'high' | 'medium' | 'low',
        summary: phrase,
        whyNotFive: score !== null && score < 5 ? `${score} not 5: ${phrase.toLowerCase()}.` : undefined,
        evidence: score === null
          ? [ev.inferred('No supporting evidence found in the profile.')]
          : confidence === 'low'
            ? [ev.inferred('Inferred from title and company only.')]
            : [ev.work(`${title} · ${company}`, `${2018 + Math.floor(rand() * 6)} – present`, phrase + '.')],
      };
    });

    const signals: Signal[] = [];
    if (ageMonths > 18) signals.push(STALE);
    if (!hasEmail) signals.push({ kind: 'no-email', label: 'No email on file', detail: 'No verified address found. LinkedIn is the only channel.' });
    const req = scores.filter((x) => x.criterionId === 'c_serving' || x.criterionId === 'c_seniority');
    if (req.some((x) => x.score !== null && x.score <= 2)) {
      signals.push({ kind: 'gate-failed', label: 'Fails a required criterion' });
    }

    const name = `${first} ${last}`;
    out.push({
      id: `c_gen_${i}`,
      name,
      title,
      company,
      companyTenure: `${1 + Math.floor(rand() * 5)}y ${Math.floor(rand() * 12)}m`,
      location: (() => { const c = CITIES[Math.floor(rand() * CITIES.length)]; return c; })(),
      timezone: 'PDT',
      yearsExperience: years,
      source: rand() > 0.88 ? 'internal' : 'public',
      profileUpdated: ageMonths < 3 ? 'Feb 2026' : ageMonths < 18 ? 'Jul 2025' : 'Mar 2023',
      profileAgeMonths: ageMonths,
      email: hasEmail ? `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@example.com` : null,
      emailVerified: hasEmail && rand() > 0.3,
      linkedin: `in/${first.toLowerCase()}${last.toLowerCase().replace(/[^a-z]/g, '')}`,
      avatarTone: (['green', 'purple', 'beige'] as const)[Math.floor(rand() * 3)],
      roles: [{ title, company, start: 'Jan 2022', end: null }],
      education: 'BS Computer Science',
      summary: `${years} years, currently ${title} at ${company}.`,
      news: [],
      scores,
      signals,
    });
  }
  return out;
}

export const ALL_CANDIDATES: Candidate[] = [...CANDIDATES, ...makeTail(100)];

/** Ids shortlisted in the seeded state, so the demo opens mid-workflow. */
export const SEEDED_SHORTLIST = [
  'c_kavya', 'c_marcus', 'c_amara', 'c_elena', 'c_priya', 'c_yuki', 'c_sofia', 'c_tobias', 'c_omar',
];
