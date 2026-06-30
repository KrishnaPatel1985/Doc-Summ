import React, { useMemo, useState } from 'react';
import type { SummaryResponse, StudyData, ChatMessage } from '../types';
import { askDocument, fetchStudy } from '../api/client';
import './SummaryCard.css';

interface SummaryCardProps {
  summary: SummaryResponse;
  onReset: () => void;
}

type TabKey = 'summary' | 'insights' | 'actions' | 'ask' | 'study' | 'export';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'summary', label: 'Summary', icon: '📄' },
  { key: 'insights', label: 'Key Insights', icon: '💡' },
  { key: 'actions', label: 'Action Items', icon: '✅' },
  { key: 'ask', label: 'Ask Document', icon: '💬' },
  { key: 'study', label: 'Study Mode', icon: '🎓' },
  { key: 'export', label: 'Export', icon: '⬇️' },
];

const SUGGESTED_QUESTIONS = [
  'What is the main argument?',
  'What are the key risks?',
  'What are the important numbers?',
  'What should I do next?',
  'Explain this like I am a beginner.',
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

const SummaryCard: React.FC<SummaryCardProps> = ({ summary, onReset }) => {
  const [tab, setTab] = useState<TabKey>('summary');
  const [copied, setCopied] = useState<string | null>(null);

  // Ask Document state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  // Study Mode state
  const [study, setStudy] = useState<StudyData | null>(null);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [picked, setPicked] = useState<Record<number, string>>({});

  const insights = summary.key_insights;
  const actionItems = summary.action_items || [];

  // ---- Metrics ----
  const metrics = useMemo(() => {
    const orig = summary.char_count_original || 0;
    const sum = summary.char_count_summary || 0;
    const reduction = orig && sum ? Math.max(0, Math.round((1 - sum / orig) * 100)) : 0;
    const wordsOrig = Math.round(orig / 5);
    const wordsSum = Math.round(sum / 5);
    const minutesSaved = Math.max(0, Math.round((wordsOrig - wordsSum) / 200));
    return {
      orig, sum, reduction, minutesSaved,
      actionCount: actionItems.length,
      insightCount: insights?.key_takeaways?.length || 0,
    };
  }, [summary, actionItems.length, insights]);

  const flash = (key: string) => { setCopied(key); setTimeout(() => setCopied(null), 1800); };

  // ---- Export helpers ----
  const buildMarkdown = () => {
    const title = summary.filename || 'Text Input';
    let md = `# DocSumm Report: ${title}\n\n_Generated ${fmtDate(summary.created_at)} · ${summary.method.toUpperCase()}_\n\n## Summary\n\n${summary.summary || ''}\n`;
    if (insights) {
      md += `\n## Key Insights\n\n**Main topic:** ${insights.main_topic || '—'}\n\n`;
      if (insights.key_takeaways.length) md += `**Key takeaways:**\n${insights.key_takeaways.map(t => `- ${t}`).join('\n')}\n\n`;
      if (insights.entities.length) md += `**Entities:** ${insights.entities.join(', ')}\n\n`;
      if (insights.numbers.length) md += `**Important numbers:**\n${insights.numbers.map(t => `- ${t}`).join('\n')}\n\n`;
      if (insights.risks.length) md += `**Risks:**\n${insights.risks.map(t => `- ${t}`).join('\n')}\n\n`;
      if (insights.opportunities.length) md += `**Opportunities:**\n${insights.opportunities.map(t => `- ${t}`).join('\n')}\n\n`;
    }
    if (actionItems.length) md += `## Action Items\n\n${actionItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`;
    return md;
  };

  const handleCopySummary = async () => { if (summary.summary) { await navigator.clipboard.writeText(summary.summary); flash('summary'); } };
  const handleCopyMarkdown = async () => { await navigator.clipboard.writeText(buildMarkdown()); flash('md'); };

  const handleDownload = () => {
    const blob = new Blob([summary.summary || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary_${summary.filename?.replace(/\.[^.]+$/, '') || 'text'}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ul = (items: string[]) => `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;

  const handleExportPDF = () => {
    const title = summary.filename || 'Text Input';
    const win = window.open('', '_blank');
    if (!win) return;
    let body = `
      <div class="brand">📄 DocSumm <span>Document Intelligence Report</span></div>
      <h1>${esc(title)}</h1>
      <div class="meta">Generated ${esc(fmtDate(summary.created_at))} · ${esc(summary.method.toUpperCase())}
        ${summary.length ? ' · ' + esc(summary.length) : ''}${summary.tone ? ' · ' + esc(summary.tone) : ''}</div>
      <div class="stats">
        <span><b>${metrics.reduction}%</b> reduced</span>
        <span><b>${metrics.minutesSaved} min</b> saved</span>
        <span><b>${metrics.actionCount}</b> action items</span>
        <span><b>${metrics.insightCount}</b> insights</span>
      </div>
      <h2>Summary</h2><p>${esc(summary.summary || '')}</p>`;
    if (insights) {
      body += `<h2>Key Insights</h2><p><b>Main topic:</b> ${esc(insights.main_topic || '—')}</p>`;
      if (insights.key_takeaways.length) body += `<h3>Key takeaways</h3>${ul(insights.key_takeaways)}`;
      if (insights.entities.length) body += `<h3>Entities</h3><p>${esc(insights.entities.join(', '))}</p>`;
      if (insights.numbers.length) body += `<h3>Important numbers</h3>${ul(insights.numbers)}`;
      if (insights.risks.length) body += `<h3>Risks & concerns</h3>${ul(insights.risks)}`;
      if (insights.opportunities.length) body += `<h3>Opportunities & recommendations</h3>${ul(insights.opportunities)}`;
    }
    if (actionItems.length) body += `<h2>Action Items</h2>${ul(actionItems)}`;
    if (study) {
      if (study.key_terms.length) body += `<h2>Study Notes — Key Terms</h2>${ul(study.key_terms.map(t => `${t.term}: ${t.definition}`))}`;
      if (study.eli5) body += `<h3>Explain like I'm a beginner</h3><p>${esc(study.eli5)}</p>`;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>DocSumm Report — ${esc(title)}</title><style>
      body{font-family:system-ui,-apple-system,sans-serif;padding:48px;max-width:820px;margin:0 auto;color:#1f2937;line-height:1.7}
      .brand{font-size:1.1rem;font-weight:800;color:#6366f1;margin-bottom:18px}
      .brand span{font-weight:500;color:#94a3b8;font-size:0.85rem;margin-left:6px}
      h1{font-size:1.5rem;margin-bottom:4px;color:#0f172a}
      h2{font-size:1.15rem;margin:28px 0 8px;color:#4338ca;border-bottom:2px solid #eef2ff;padding-bottom:4px}
      h3{font-size:1rem;margin:16px 0 6px;color:#334155}
      .meta{font-size:0.82rem;color:#64748b;margin-bottom:16px}
      .stats{display:flex;gap:18px;flex-wrap:wrap;background:#f8fafc;border:1px solid #eef2f7;border-radius:10px;padding:12px 16px;margin-bottom:8px;font-size:0.85rem}
      .stats b{color:#6366f1}
      p{white-space:pre-wrap}
      ul{margin:6px 0 6px 22px}
      li{margin-bottom:5px}
      @media print{body{padding:24px}}
    </style></head><body>${body}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  // ---- Ask Document ----
  const submitQuestion = async (q: string) => {
    const query = q.trim();
    if (!query || asking) return;
    setAskError(null);
    setMessages(m => [...m, { role: 'user', content: query }]);
    setQuestion('');
    setAsking(true);
    try {
      const answer = await askDocument(summary.job_id, query);
      setMessages(m => [...m, { role: 'assistant', content: answer }]);
    } catch (e) {
      setAskError((e as Error).message);
    } finally {
      setAsking(false);
    }
  };

  // ---- Study Mode (lazy) ----
  const loadStudy = async () => {
    if (study || studyLoading) return;
    setStudyLoading(true);
    setStudyError(null);
    try {
      setStudy(await fetchStudy(summary.job_id));
    } catch (e) {
      setStudyError((e as Error).message);
    } finally {
      setStudyLoading(false);
    }
  };

  const goTab = (k: TabKey) => {
    setTab(k);
    if (k === 'study') loadStudy();
  };

  return (
    <div className="result-dashboard animate-in">
      {/* Header */}
      <div className="rd-header">
        <div className="rd-title-row">
          <div className="rd-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <h2 className="rd-heading">Document Intelligence</h2>
            <p className="rd-filename" title={summary.filename || 'Text Input'}>{summary.filename || 'Text Input'}</p>
          </div>
        </div>
        <div className="rd-header-right">
          <span className="rd-badge">✓ Done</span>
          <button className="btn btn-primary" onClick={onReset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>
            Summarize Another
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="rd-metrics">
        <MetricCard label="Original" value={`${(metrics.orig / 1000).toFixed(1)}k`} sub="characters" />
        <MetricCard label="Summary" value={`${metrics.sum.toLocaleString()}`} sub="characters" />
        <MetricCard label="Reduced" value={`${metrics.reduction}%`} sub="shorter" accent />
        <MetricCard label="Time saved" value={`${metrics.minutesSaved}`} sub="min reading" accent />
        <MetricCard label="Action items" value={`${metrics.actionCount}`} sub="extracted" />
        <MetricCard label="Insights" value={`${metrics.insightCount}`} sub="takeaways" />
      </div>

      {/* Tabs */}
      <div className="rd-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            className={`rd-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => goTab(t.key)}
          >
            <span className="rd-tab-icon">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="rd-panel">
        {tab === 'summary' && (
          <div className="rd-summary-text">{summary.summary || 'No summary available.'}</div>
        )}

        {tab === 'insights' && (
          insights ? (
            <div className="rd-insights">
              <div className="rd-topic">
                <span className="rd-topic-label">Main topic</span>
                <p>{insights.main_topic || '—'}</p>
              </div>
              <InsightList title="Key takeaways" items={insights.key_takeaways} icon="💡" />
              <InsightChips title="Important entities" items={insights.entities} />
              <InsightList title="Important numbers & stats" items={insights.numbers} icon="🔢" />
              <InsightList title="Risks & concerns" items={insights.risks} icon="⚠️" tone="risk" />
              <InsightList title="Opportunities & recommendations" items={insights.opportunities} icon="🚀" tone="opp" />
            </div>
          ) : <Empty text="No insights available for this document." />
        )}

        {tab === 'actions' && (
          actionItems.length ? (
            <ol className="rd-action-list">
              {actionItems.map((a, i) => (
                <li key={i}><span className="rd-action-num">{i + 1}</span><span>{a}</span></li>
              ))}
            </ol>
          ) : <Empty text="No action items were found in this document." />
        )}

        {tab === 'ask' && (
          <div className="rd-ask">
            <div className="rd-chat">
              {messages.length === 0 && (
                <div className="rd-ask-intro">
                  <p>Ask anything about this document. The answer is grounded in its content.</p>
                  <div className="rd-suggested">
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button key={q} className="rd-suggest-btn" onClick={() => submitQuestion(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`rd-msg rd-msg-${m.role}`}>
                  <div className="rd-msg-bubble">{m.content}</div>
                </div>
              ))}
              {asking && <div className="rd-msg rd-msg-assistant"><div className="rd-msg-bubble rd-typing"><span/><span/><span/></div></div>}
              {askError && <div className="rd-inline-error">{askError}</div>}
            </div>
            <form
              className="rd-ask-form"
              onSubmit={e => { e.preventDefault(); submitQuestion(question); }}
            >
              <input
                className="rd-ask-input"
                placeholder="Ask a question about this document..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={asking || !question.trim()}>Ask</button>
            </form>
          </div>
        )}

        {tab === 'study' && (
          <div className="rd-study">
            {studyLoading && <div className="rd-loading"><div className="spinner" /> Generating study material…</div>}
            {studyError && <Empty text={studyError} />}
            {study && (
              <>
                {study.eli5 && (
                  <section className="rd-study-section">
                    <h3>🧒 Explain like I'm a beginner</h3>
                    <p className="rd-eli5">{study.eli5}</p>
                  </section>
                )}
                {study.flashcards.length > 0 && (
                  <section className="rd-study-section">
                    <h3>🃏 Flashcards <small>(click to flip)</small></h3>
                    <div className="rd-flashcards">
                      {study.flashcards.map((c, i) => (
                        <button key={i} className={`rd-flashcard ${flipped[i] ? 'flipped' : ''}`} onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}>
                          <span className="rd-flashcard-label">{flipped[i] ? 'Answer' : 'Question'}</span>
                          <span className="rd-flashcard-text">{flipped[i] ? c.back : c.front}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {study.quiz.length > 0 && (
                  <section className="rd-study-section">
                    <h3>❓ Quiz</h3>
                    <div className="rd-quiz">
                      {study.quiz.map((q, qi) => (
                        <div key={qi} className="rd-quiz-q">
                          <p className="rd-quiz-question">{qi + 1}. {q.question}</p>
                          <div className="rd-quiz-options">
                            {q.options.map((opt, oi) => {
                              const chosen = picked[qi];
                              const isCorrect = opt === q.answer;
                              const state = !chosen ? '' : opt === chosen ? (isCorrect ? 'correct' : 'wrong') : (isCorrect ? 'correct' : '');
                              return (
                                <button
                                  key={oi}
                                  className={`rd-quiz-opt ${state}`}
                                  disabled={!!chosen}
                                  onClick={() => setPicked(p => ({ ...p, [qi]: opt }))}
                                >{opt}</button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {study.key_terms.length > 0 && (
                  <section className="rd-study-section">
                    <h3>📚 Key terms</h3>
                    <dl className="rd-terms">
                      {study.key_terms.map((t, i) => (
                        <div key={i} className="rd-term">
                          <dt>{t.term}</dt><dd>{t.definition}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'export' && (
          <div className="rd-export">
            <p className="rd-export-note">Export your report or copy it elsewhere. The PDF and Markdown include the summary, key insights, and action items.</p>
            <div className="rd-export-grid">
              <button className="btn btn-ghost" onClick={handleCopySummary}>{copied === 'summary' ? '✓ Copied!' : 'Copy Summary'}</button>
              <button className="btn btn-ghost" onClick={handleDownload}>Download .txt</button>
              <button className="btn btn-ghost" onClick={handleCopyMarkdown}>{copied === 'md' ? '✓ Copied!' : 'Copy Markdown'}</button>
              <button className="btn btn-primary" onClick={handleExportPDF}>Export PDF Report</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; sub: string; accent?: boolean }> = ({ label, value, sub, accent }) => (
  <div className={`rd-metric ${accent ? 'rd-metric-accent' : ''}`}>
    <span className="rd-metric-label">{label}</span>
    <span className="rd-metric-value">{value}</span>
    <span className="rd-metric-sub">{sub}</span>
  </div>
);

const InsightList: React.FC<{ title: string; items: string[]; icon: string; tone?: string }> = ({ title, items, icon, tone }) =>
  items && items.length ? (
    <div className={`rd-insight-block ${tone ? 'rd-insight-' + tone : ''}`}>
      <h4>{icon} {title}</h4>
      <ul>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  ) : null;

const InsightChips: React.FC<{ title: string; items: string[] }> = ({ title, items }) =>
  items && items.length ? (
    <div className="rd-insight-block">
      <h4>🏷️ {title}</h4>
      <div className="rd-chips">{items.map((it, i) => <span key={i} className="rd-chip">{it}</span>)}</div>
    </div>
  ) : null;

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="rd-empty">{text}</div>;

export default SummaryCard;
