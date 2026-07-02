import React, { useMemo, useState } from 'react';
import type { SummaryResponse, StudyData, ChatMessage } from '../types';
import { askDocument, fetchStudy } from '../api/client';
import './SummaryCard.css';

interface SummaryCardProps {
  summary: SummaryResponse;
  onReset: () => void;
}

type TabKey = 'summary' | 'insights' | 'actions' | 'evidence' | 'risk' | 'ask' | 'study';
type TabIconKey = 'summary' | 'insights' | 'actions' | 'evidence' | 'risk' | 'ask' | 'study';
type InsightIconKey = 'takeaways' | 'numbers' | 'risk' | 'opportunity' | 'entities';
type StudyIconKey = 'beginner' | 'flashcards' | 'quiz' | 'terms';

const TABS: { key: TabKey; label: string; icon: TabIconKey }[] = [
  { key: 'summary', label: 'Summary', icon: 'summary' },
  { key: 'insights', label: 'Key Insights', icon: 'insights' },
  { key: 'actions', label: 'Action Items', icon: 'actions' },
  { key: 'evidence', label: 'Evidence Map', icon: 'evidence' },
  { key: 'risk', label: 'Risk Report', icon: 'risk' },
  { key: 'ask', label: 'Ask Document', icon: 'ask' },
  { key: 'study', label: 'Study Mode', icon: 'study' },
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

const emptyRiskReport = {
  risks: [] as string[],
  opportunities: [] as string[],
  assumptions: [] as string[],
  missing_information: [] as string[],
  follow_up_questions: [] as string[],
  red_flags: [] as { issue: string; why_it_matters: string; suggested_follow_up: string }[],
};

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
  const evidenceMap = insights?.evidence_map || [];
  const riskReport = {
    ...emptyRiskReport,
    risks: insights?.risks || [],
    opportunities: insights?.opportunities || [],
    ...(insights?.risk_report || {}),
  };

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

  const documentType = useMemo(() => {
    if (summary.file_type) return summary.file_type.toUpperCase();
    if (summary.filename && summary.filename.includes('.')) {
      return summary.filename.split('.').pop()?.toUpperCase() || 'Document';
    }
    return summary.filename ? 'Document' : 'Text';
  }, [summary.file_type, summary.filename]);

  const contextSnippets = useMemo(() => {
    const snippets = [
      ...(summary.source_snippets || []),
      ...evidenceMap.map(item => item.evidence_snippet),
      summary.document_preview || '',
    ]
      .map(s => s.trim())
      .filter(Boolean);
    return Array.from(new Set(snippets)).slice(0, 3);
  }, [summary.source_snippets, summary.document_preview, evidenceMap]);

  const flash = (key: string) => { setCopied(key); setTimeout(() => setCopied(null), 1800); };

  // ---- Export helpers ----
  const buildMarkdown = () => {
    const title = summary.filename || 'Text Input';
    let md = `# DocSumm Report: ${title}\n\n_Generated ${fmtDate(summary.created_at)} - ${summary.method.toUpperCase()}_\n\n## Summary\n\n${summary.summary || ''}\n`;
    if (insights) {
      md += `\n## Key Insights\n\n**Main topic:** ${insights.main_topic || 'N/A'}\n\n`;
      if (insights.key_takeaways.length) md += `**Key takeaways:**\n${insights.key_takeaways.map(t => `- ${t}`).join('\n')}\n\n`;
      if (insights.entities.length) md += `**Entities:** ${insights.entities.join(', ')}\n\n`;
      if (insights.numbers.length) md += `**Important numbers:**\n${insights.numbers.map(t => `- ${t}`).join('\n')}\n\n`;
      if (insights.risks.length) md += `**Risks:**\n${insights.risks.map(t => `- ${t}`).join('\n')}\n\n`;
      if (insights.opportunities.length) md += `**Opportunities:**\n${insights.opportunities.map(t => `- ${t}`).join('\n')}\n\n`;
    }
    if (actionItems.length) md += `## Action Items\n\n${actionItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`;
    if (evidenceMap.length) {
      md += `\n## Evidence Map\n\n${evidenceMap.map((item, i) => (
        `${i + 1}. **Claim:** ${item.claim || 'N/A'}\n   - Evidence: ${item.evidence_snippet || 'N/A'}\n   - Source: ${item.source || 'Document content'}\n   - Confidence: ${item.confidence || 'Medium'}`
      )).join('\n\n')}\n`;
    }
    if (hasRiskReport(riskReport)) {
      md += `\n## Risk Report\n\n${buildRiskText()}\n`;
    }
    return md;
  };

  const handleCopyMarkdown = async () => { await navigator.clipboard.writeText(buildMarkdown()); flash('md'); };

  const buildInsightsText = () => {
    if (!insights) return 'No insights available for this document.';
    const sections = [
      `Main topic: ${insights.main_topic || 'N/A'}`,
      insights.key_takeaways.length ? `Key takeaways:\n${insights.key_takeaways.map(t => `- ${t}`).join('\n')}` : '',
      insights.entities.length ? `Entities: ${insights.entities.join(', ')}` : '',
      insights.numbers.length ? `Important numbers:\n${insights.numbers.map(t => `- ${t}`).join('\n')}` : '',
      insights.risks.length ? `Risks:\n${insights.risks.map(t => `- ${t}`).join('\n')}` : '',
      insights.opportunities.length ? `Opportunities:\n${insights.opportunities.map(t => `- ${t}`).join('\n')}` : '',
    ];
    return sections.filter(Boolean).join('\n\n');
  };

  const buildActionItemsText = () =>
    actionItems.length
      ? actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n')
      : 'No action items were found in this document.';

  const buildEvidenceText = () =>
    evidenceMap.length
      ? evidenceMap.map((item, i) => [
          `${i + 1}. Claim: ${item.claim || 'N/A'}`,
          `Evidence: ${item.evidence_snippet || 'N/A'}`,
          `Source: ${item.source || 'Document content'}`,
          `Confidence: ${item.confidence || 'Medium'}`,
        ].join('\n')).join('\n\n')
      : 'No evidence map is available for this document.';

  const buildRiskText = () => {
    const parts = [
      riskReport.risks.length ? `Risks:\n${riskReport.risks.map(t => `- ${t}`).join('\n')}` : '',
      riskReport.opportunities.length ? `Opportunities:\n${riskReport.opportunities.map(t => `- ${t}`).join('\n')}` : '',
      riskReport.assumptions.length ? `Assumptions:\n${riskReport.assumptions.map(t => `- ${t}`).join('\n')}` : '',
      riskReport.missing_information.length ? `Missing information:\n${riskReport.missing_information.map(t => `- ${t}`).join('\n')}` : '',
      riskReport.follow_up_questions.length ? `Follow-up questions:\n${riskReport.follow_up_questions.map(t => `- ${t}`).join('\n')}` : '',
      riskReport.red_flags.length ? `Red flags:\n${riskReport.red_flags.map(flag => `- Issue: ${flag.issue || 'N/A'}\n  Why it matters: ${flag.why_it_matters || 'N/A'}\n  Suggested follow-up: ${flag.suggested_follow_up || 'N/A'}`).join('\n')}` : '',
    ].filter(Boolean);
    return parts.length ? parts.join('\n\n') : 'No risk report is available for this document.';
  };

  const buildCurrentText = () => {
    if (tab === 'insights') return buildInsightsText();
    if (tab === 'actions') return buildActionItemsText();
    if (tab === 'evidence') return buildEvidenceText();
    if (tab === 'risk') return buildRiskText();
    return summary.summary || 'No summary available.';
  };

  const handleCopyCurrent = async () => {
    await navigator.clipboard.writeText(buildCurrentText());
    flash(`copy-${tab}`);
  };

  const handleDownload = () => {
    const blob = new Blob([buildCurrentText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}_${summary.filename?.replace(/\.[^.]+$/, '') || 'text'}.txt`;
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
      <div class="brand">DocSumm <span>Document Intelligence Report</span></div>
      <h1>${esc(title)}</h1>
      <div class="meta">Generated ${esc(fmtDate(summary.created_at))} &middot; ${esc(summary.method.toUpperCase())}
        ${summary.length ? ' &middot; ' + esc(summary.length) : ''}${summary.tone ? ' &middot; ' + esc(summary.tone) : ''}</div>
      <div class="stats">
        <span><b>${metrics.reduction}%</b> reduced</span>
        <span><b>${metrics.minutesSaved} min</b> saved</span>
        <span><b>${metrics.actionCount}</b> action items</span>
        <span><b>${metrics.insightCount}</b> insights</span>
      </div>
      <h2>Summary</h2><p>${esc(summary.summary || '')}</p>`;
    if (insights) {
      body += `<h2>Key Insights</h2><p><b>Main topic:</b> ${esc(insights.main_topic || 'N/A')}</p>`;
      if (insights.key_takeaways.length) body += `<h3>Key takeaways</h3>${ul(insights.key_takeaways)}`;
      if (insights.entities.length) body += `<h3>Entities</h3><p>${esc(insights.entities.join(', '))}</p>`;
      if (insights.numbers.length) body += `<h3>Important numbers</h3>${ul(insights.numbers)}`;
      if (insights.risks.length) body += `<h3>Risks & concerns</h3>${ul(insights.risks)}`;
      if (insights.opportunities.length) body += `<h3>Opportunities & recommendations</h3>${ul(insights.opportunities)}`;
    }
    if (actionItems.length) body += `<h2>Action Items</h2>${ul(actionItems)}`;
    if (evidenceMap.length) {
      body += `<h2>Evidence Map</h2>`;
      evidenceMap.forEach(item => {
        body += `<div class="evidence"><h3>${esc(item.claim || 'Claim')}</h3><p>${esc(item.evidence_snippet || 'No evidence snippet available.')}</p><div class="meta">Source: ${esc(item.source || 'Document content')} &middot; Confidence: ${esc(item.confidence || 'Medium')}</div></div>`;
      });
    }
    if (hasRiskReport(riskReport)) {
      body += `<h2>Risk Report</h2>`;
      if (riskReport.risks.length) body += `<h3>Risks</h3>${ul(riskReport.risks)}`;
      if (riskReport.opportunities.length) body += `<h3>Opportunities</h3>${ul(riskReport.opportunities)}`;
      if (riskReport.assumptions.length) body += `<h3>Assumptions</h3>${ul(riskReport.assumptions)}`;
      if (riskReport.missing_information.length) body += `<h3>Missing Information</h3>${ul(riskReport.missing_information)}`;
      if (riskReport.follow_up_questions.length) body += `<h3>Follow-up Questions</h3>${ul(riskReport.follow_up_questions)}`;
      if (riskReport.red_flags.length) body += `<h3>Red Flags</h3>${ul(riskReport.red_flags.map(flag => `${flag.issue}: ${flag.why_it_matters} Suggested follow-up: ${flag.suggested_follow_up}`))}`;
    }
    if (study) {
      if (study.key_terms.length) body += `<h2>Study Notes - Key Terms</h2>${ul(study.key_terms.map(t => `${t.term}: ${t.definition}`))}`;
      if (study.eli5) body += `<h3>Explain like I'm a beginner</h3><p>${esc(study.eli5)}</p>`;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>DocSumm Report - ${esc(title)}</title><style>
      body{font-family:system-ui,-apple-system,sans-serif;padding:48px;max-width:820px;margin:0 auto;color:#1f2937;line-height:1.7}
      .brand{font-size:1.1rem;font-weight:800;color:#6366f1;margin-bottom:18px}
      .brand span{font-weight:500;color:#94a3b8;font-size:0.85rem;margin-left:6px}
      h1{font-size:1.5rem;margin-bottom:4px;color:#0f172a}
      h2{font-size:1.15rem;margin:28px 0 8px;color:#4338ca;border-bottom:2px solid #eef2ff;padding-bottom:4px}
      h3{font-size:1rem;margin:16px 0 6px;color:#334155}
      .meta{font-size:0.82rem;color:#64748b;margin-bottom:16px}
      .stats{display:flex;gap:18px;flex-wrap:wrap;background:#f8fafc;border:1px solid #eef2f7;border-radius:10px;padding:12px 16px;margin-bottom:8px;font-size:0.85rem}
      .stats b{color:#6366f1}
      .evidence{border:1px solid #eef2f7;border-radius:10px;padding:12px 14px;margin:10px 0;background:#fbfdff}
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
          <span className="rd-badge"><CheckMiniIcon /> Done</span>
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

      <div className="rd-workspace">
        <aside className="rd-context-panel" aria-label="Document context">
          <div className="rd-context-header">
            <span className="rd-context-kicker">Document Context</span>
            <h3 title={summary.filename || 'Text Input'}>{summary.filename || 'Text Input'}</h3>
          </div>
          <div className="rd-context-stats">
            <ContextStat label="Type" value={documentType} />
            <ContextStat label="Original length" value={`${metrics.orig.toLocaleString()} chars`} />
            <ContextStat label="Summary length" value={`${metrics.sum.toLocaleString()} chars`} />
            <ContextStat label="Reduction" value={`${metrics.reduction}%`} accent />
          </div>
          <div className="rd-context-section">
            <h4>Extracted Preview</h4>
            <p>{summary.document_preview || 'No extracted preview is available for this document.'}</p>
          </div>
          {contextSnippets.length > 0 && (
            <div className="rd-context-section">
              <h4>Source Snippets</h4>
              <div className="rd-context-snippets">
                {contextSnippets.map((snippet, i) => (
                  <blockquote key={i}>{snippet}</blockquote>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="rd-main-workspace">
          {/* Tabs */}
          <div className="rd-tabs" role="tablist">
            {TABS.map(t => (
              <button
                key={t.key}
                role="tab"
                className={`rd-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => goTab(t.key)}
              >
                <span className="rd-tab-icon"><TabIcon name={t.icon} /></span>{t.label}
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
                <p>{insights.main_topic || 'N/A'}</p>
              </div>
              <InsightList title="Key takeaways" items={insights.key_takeaways} icon="takeaways" />
              <InsightChips title="Important entities" items={insights.entities} />
              <InsightList title="Important numbers & stats" items={insights.numbers} icon="numbers" />
              <InsightList title="Risks & concerns" items={insights.risks} icon="risk" tone="risk" />
              <InsightList title="Opportunities & recommendations" items={insights.opportunities} icon="opportunity" tone="opp" />
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

        {tab === 'evidence' && (
          evidenceMap.length ? (
            <div className="rd-evidence-map">
              {evidenceMap.map((item, i) => (
                <article key={i} className="rd-evidence-item">
                  <div className="rd-evidence-head">
                    <span className="rd-evidence-index">{i + 1}</span>
                    <div>
                      <span className="rd-evidence-label">Claim</span>
                      <h4>{item.claim || 'N/A'}</h4>
                    </div>
                    <span className={`rd-confidence rd-confidence-${confidenceTone(item.confidence)}`}>
                      {item.confidence || 'Medium'}
                    </span>
                  </div>
                  <blockquote>{item.evidence_snippet || 'No evidence snippet available.'}</blockquote>
                  <div className="rd-evidence-source">
                    <FileTextIcon /> {item.source || 'Document content'}
                  </div>
                </article>
              ))}
            </div>
          ) : <Empty text="No evidence map is available for this document." />
        )}

        {tab === 'risk' && (
          hasRiskReport(riskReport) ? (
            <div className="rd-risk-report">
              <div className="rd-risk-grid">
                <RiskList title="Risks" items={riskReport.risks} tone="risk" />
                <RiskList title="Opportunities" items={riskReport.opportunities} tone="opp" />
                <RiskList title="Assumptions" items={riskReport.assumptions} />
                <RiskList title="Missing information" items={riskReport.missing_information} />
                <RiskList title="Follow-up questions" items={riskReport.follow_up_questions} />
              </div>
              {riskReport.red_flags.length > 0 && (
                <section className="rd-red-flags">
                  <h3><AlertIcon /> Red Flags</h3>
                  <div className="rd-red-flag-list">
                    {riskReport.red_flags.map((flag, i) => (
                      <article key={i} className="rd-red-flag">
                        <h4>{flag.issue || 'N/A'}</h4>
                        <div>
                          <span>Why it matters</span>
                          <p>{flag.why_it_matters || 'N/A'}</p>
                        </div>
                        <div>
                          <span>Suggested follow-up</span>
                          <p>{flag.suggested_follow_up || 'N/A'}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : <Empty text="No risk report is available for this document." />
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
            {studyLoading && <div className="rd-loading"><div className="spinner" /> Generating study material...</div>}
            {studyError && <Empty text={studyError} />}
            {study && (
              <>
                {study.eli5 && (
                  <section className="rd-study-section">
                    <SectionTitle icon="beginner">Explain like I'm a beginner</SectionTitle>
                    <p className="rd-eli5">{study.eli5}</p>
                  </section>
                )}
                {study.flashcards.length > 0 && (
                  <section className="rd-study-section">
                    <SectionTitle icon="flashcards">Flashcards <small>(click to flip)</small></SectionTitle>
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
                    <SectionTitle icon="quiz">Quiz</SectionTitle>
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
                    <SectionTitle icon="terms">Key terms</SectionTitle>
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

        {(tab === 'summary' || tab === 'insights' || tab === 'actions' || tab === 'evidence' || tab === 'risk') && (
          <ExportActionBar
            copied={copied === `copy-${tab}`}
            markdownCopied={copied === 'md'}
            onCopy={handleCopyCurrent}
            onDownload={handleDownload}
            onCopyMarkdown={handleCopyMarkdown}
            onExportPDF={handleExportPDF}
          />
        )}
          </div>
        </section>
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

const ContextStat: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`rd-context-stat ${accent ? 'rd-context-stat-accent' : ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const RiskList: React.FC<{ title: string; items: string[]; tone?: 'risk' | 'opp' }> = ({ title, items, tone }) =>
  items.length ? (
    <section className={`rd-risk-card ${tone ? 'rd-risk-card-' + tone : ''}`}>
      <h4>{title}</h4>
      <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </section>
  ) : null;

const hasRiskReport = (report: typeof emptyRiskReport) =>
  report.risks.length > 0 ||
  report.opportunities.length > 0 ||
  report.assumptions.length > 0 ||
  report.missing_information.length > 0 ||
  report.follow_up_questions.length > 0 ||
  report.red_flags.length > 0;

const confidenceTone = (confidence: string) => {
  const normalized = (confidence || '').toLowerCase();
  if (normalized.includes('high')) return 'high';
  if (normalized.includes('low')) return 'low';
  return 'medium';
};

const ExportActionBar: React.FC<{
  copied: boolean;
  markdownCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onCopyMarkdown: () => void;
  onExportPDF: () => void;
}> = ({ copied, markdownCopied, onCopy, onDownload, onCopyMarkdown, onExportPDF }) => (
  <div className="rd-export-action-bar">
    <button className="btn btn-ghost" onClick={onCopy}>{copied ? 'Copied!' : 'Copy'}</button>
    <button className="btn btn-ghost" onClick={onDownload}>Download .txt</button>
    <button className="btn btn-ghost" onClick={onCopyMarkdown}>{markdownCopied ? 'Copied!' : 'Copy Markdown'}</button>
    <button className="btn btn-primary" onClick={onExportPDF}>Export PDF Report</button>
  </div>
);

const InsightList: React.FC<{ title: string; items: string[]; icon: InsightIconKey; tone?: string }> = ({ title, items, icon, tone }) =>
  items && items.length ? (
    <div className={`rd-insight-block ${tone ? 'rd-insight-' + tone : ''}`}>
      <h4><InsightIcon name={icon} /> {title}</h4>
      <ul>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  ) : null;

const InsightChips: React.FC<{ title: string; items: string[] }> = ({ title, items }) =>
  items && items.length ? (
    <div className="rd-insight-block">
      <h4><InsightIcon name="entities" /> {title}</h4>
      <div className="rd-chips">{items.map((it, i) => <span key={i} className="rd-chip">{it}</span>)}</div>
    </div>
  ) : null;

const SectionTitle: React.FC<{ icon: StudyIconKey; children: React.ReactNode }> = ({ icon, children }) => (
  <h3><StudyIcon name={icon} /> {children}</h3>
);

const TabIcon: React.FC<{ name: TabIconKey }> = ({ name }) => {
  switch (name) {
    case 'summary':
      return <FileTextIcon />;
    case 'insights':
      return <SparkIcon />;
    case 'actions':
      return <CheckCircleIcon />;
    case 'evidence':
      return <EvidenceIcon />;
    case 'risk':
      return <AlertIcon />;
    case 'ask':
      return <MessageIcon />;
    case 'study':
      return <AcademicIcon />;
  }
};

const InsightIcon: React.FC<{ name: InsightIconKey }> = ({ name }) => {
  switch (name) {
    case 'takeaways':
      return <SparkIcon />;
    case 'numbers':
      return <HashIcon />;
    case 'risk':
      return <AlertIcon />;
    case 'opportunity':
      return <TrendingIcon />;
    case 'entities':
      return <TagIcon />;
  }
};

const StudyIcon: React.FC<{ name: StudyIconKey }> = ({ name }) => {
  switch (name) {
    case 'beginner':
      return <BookOpenIcon />;
    case 'flashcards':
      return <CardsIcon />;
    case 'quiz':
      return <QuestionIcon />;
    case 'terms':
      return <ListIcon />;
  }
};

const IconBase: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    className="rd-inline-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const FileTextIcon = () => (
  <IconBase>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </IconBase>
);

const SparkIcon = () => (
  <IconBase>
    <path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3z" />
    <path d="M5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16z" />
  </IconBase>
);

const CheckCircleIcon = () => (
  <IconBase>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l2.4 2.4L16 9" />
  </IconBase>
);

const EvidenceIcon = () => (
  <IconBase>
    <path d="M9 11l2 2 4-5" />
    <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8" />
    <path d="M14 3h6v6" />
  </IconBase>
);

const CheckMiniIcon = () => (
  <IconBase>
    <path d="M20 6 9 17l-5-5" />
  </IconBase>
);

const MessageIcon = () => (
  <IconBase>
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </IconBase>
);

const AcademicIcon = () => (
  <IconBase>
    <path d="M22 10L12 5 2 10l10 5 10-5z" />
    <path d="M6 12v5c3.5 2 8.5 2 12 0v-5" />
  </IconBase>
);

const HashIcon = () => (
  <IconBase>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </IconBase>
);

const AlertIcon = () => (
  <IconBase>
    <path d="M10.3 4.3L2.8 17.5A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.5L13.7 4.3a2 2 0 0 0-3.4 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </IconBase>
);

const TrendingIcon = () => (
  <IconBase>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </IconBase>
);

const TagIcon = () => (
  <IconBase>
    <path d="M20 13l-7 7L4 11V4h7l9 9z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </IconBase>
);

const BookOpenIcon = () => (
  <IconBase>
    <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v17H5.5A2.5 2.5 0 0 1 3 17.5z" />
    <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v17h5.5a2.5 2.5 0 0 0 2.5-2.5z" />
  </IconBase>
);

const CardsIcon = () => (
  <IconBase>
    <rect x="4" y="6" width="13" height="13" rx="2" />
    <path d="M8 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1" />
  </IconBase>
);

const QuestionIcon = () => (
  <IconBase>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.7 2.7 0 0 1 5 1.4c0 2.1-2.5 2.3-2.5 4" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </IconBase>
);

const ListIcon = () => (
  <IconBase>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </IconBase>
);

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="rd-empty">{text}</div>;

export default SummaryCard;
