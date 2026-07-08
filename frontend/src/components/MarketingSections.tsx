import React from 'react';
import './MarketingSections.css';

const svg = (children: React.ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const STEPS = [
  { n: '01', title: 'Choose a workflow', desc: 'Pick a mission — summarize, study, ask, compare, review risk, plan actions, or map evidence.' },
  { n: '02', title: 'Upload or paste your document', desc: 'PDF, DOCX, and TXT files are supported, or paste raw text directly into the composer.' },
  { n: '03', title: 'AI agents analyze the content', desc: 'Specialized agents extract, cross-reference, and structure your document’s content.' },
  { n: '04', title: 'Review, study, ask, compare, or export', desc: 'Work inside a focused workspace built for your mission, then export the results.' },
];

const FEATURES = [
  { title: 'AI Summary', desc: 'Executive summaries with key insights and clear takeaways.', icon: svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>) },
  { title: 'Study Pack', desc: 'Flashcards, quizzes, key terms, and beginner explanations.', icon: svg(<><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/></>) },
  { title: 'Ask Document', desc: 'Source-aware answers grounded in your document’s text.', icon: svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>) },
  { title: 'Compare Documents', desc: 'Similarities, differences, contradictions, and unique points.', icon: svg(<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>) },
  { title: 'Risk Report', desc: 'Red flags, assumptions, and missing information surfaced.', icon: svg(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>) },
  { title: 'Action Plan', desc: 'Concrete tasks, decisions, and next steps extracted for you.', icon: svg(<><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>) },
  { title: 'Evidence Map', desc: 'Every claim connected to its source with a confidence level.', icon: svg(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>) },
  { title: 'Export Reports', desc: 'Copy, download .txt, copy Markdown, or export a PDF report.', icon: svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>) },
];

const PERSONAS = [
  { title: 'Consultants & Analysts', desc: 'Compress long reports into decision-ready briefs and risk registers.', icon: svg(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>) },
  { title: 'Students & Researchers', desc: 'Turn dense readings into flashcards, quizzes, and plain-language explanations.', icon: svg(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>) },
  { title: 'Legal & Compliance', desc: 'Compare contract versions and surface contradictions with cited evidence.', icon: svg(<><path d="M12 3v18M5 21h14M3 7l4-4 4 4M21 7l-4-4-4 4"/></>) },
  { title: 'Healthcare Teams', desc: 'Extract action items and assumptions from clinical guidelines and studies.', icon: svg(<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>) },
  { title: 'Finance & Operations', desc: 'Review filings and plans for unhedged risks and missing information.', icon: svg(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>) },
];

const FAQS = [
  { q: 'What file types does DocSumm support?', a: 'PDF, DOCX, and TXT files — or you can paste raw text directly into the composer.' },
  { q: 'Can I use DocSumm for studying?', a: 'Yes. The Study workflow generates flashcards, quizzes, key terms, and beginner explanations, with an interactive quiz you can take, retry, and regenerate.' },
  { q: 'Can DocSumm compare two documents?', a: 'Yes. The Compare workflow analyzes two documents for similarities, differences, contradictions, and unique points, with an optional comparison focus.' },
  { q: 'Does DocSumm show evidence?', a: 'Yes. The Evidence Map connects key claims to supporting snippets with a confidence level, using honest source labels — it never invents page numbers.' },
  { q: 'Can I export reports?', a: 'Report tabs include Copy, Download .txt, Copy Markdown, and Export PDF, so you can take structured outputs with you.' },
  { q: 'Is DocSumm only a summarizer?', a: 'No. DocSumm is a document command center with seven workflows: summarize, study, ask, compare, risk review, action plan, and evidence map.' },
];

const MarketingSections: React.FC = () => (
  <div className="mk">
    {/* How it works */}
    <section className="mk-section" id="how-it-works">
      <div className="mk-head">
        <h2 className="mk-title">How DocSumm Works</h2>
        <p className="mk-subtitle">From raw document to a focused workspace in four steps.</p>
      </div>
      <div className="mk-steps">
        {STEPS.map(s => (
          <div key={s.n} className="mk-step">
            <span className="mk-step-n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* More than a summarizer */}
    <section className="mk-section" id="workflows">
      <div className="mk-head">
        <h2 className="mk-title">More than a Summarizer</h2>
        <p className="mk-subtitle">Seven specialized workflows plus export, all working from the same document.</p>
      </div>
      <div className="mk-features">
        {FEATURES.map(f => (
          <div key={f.title} className="mk-feature">
            <span className="mk-feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Evidence-backed */}
    <section className="mk-section mk-evidence">
      <div className="mk-evidence-text">
        <h2 className="mk-title mk-left">Evidence-Backed AI Outputs</h2>
        <p className="mk-evidence-copy">
          Every insight DocSumm produces is anchored to your document. Claims in the Evidence Map link to
          supporting snippets, each rated with a confidence level — so you can verify what the AI says instead
          of trusting a black box. Source labels stay honest; no page numbers are invented.
        </p>
      </div>
      <div className="mk-evidence-card" aria-hidden="true">
        <span className="mk-evidence-tag">Illustrative example</span>
        <div className="mk-evidence-claim">
          <span>A key claim from the document</span>
          <span className="mk-evidence-conf">High confidence</span>
        </div>
        <blockquote>“Supporting sentence pulled directly from the source text, shown so the claim can be verified.”</blockquote>
        <span className="mk-evidence-src">Source: Document content</span>
      </div>
    </section>

    {/* Who it helps */}
    <section className="mk-section">
      <div className="mk-head">
        <h2 className="mk-title">Who It Helps</h2>
        <p className="mk-subtitle">Anyone who works with documents longer than they have time to read.</p>
      </div>
      <div className="mk-personas">
        {PERSONAS.map(p => (
          <div key={p.title} className="mk-persona">
            <span className="mk-persona-icon">{p.icon}</span>
            <div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* FAQ */}
    <section className="mk-section">
      <div className="mk-head">
        <h2 className="mk-title">Frequently Asked Questions</h2>
      </div>
      <div className="mk-faq">
        {FAQS.map(f => (
          <details key={f.q} className="mk-faq-item">
            <summary>
              {f.q}
              <svg className="mk-faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  </div>
);

export default MarketingSections;
