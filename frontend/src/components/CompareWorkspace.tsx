import React, { useState } from 'react';
import type { CompareResult } from '../types';
import './CompareWorkspace.css';

interface CompareWorkspaceProps {
  result: CompareResult;
  onReset: () => void;
}

type TabKey = 'overview' | 'similarities' | 'differences' | 'contradictions' | 'unique_a' | 'unique_b' | 'conclusion';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '🧭' },
  { key: 'similarities', label: 'Similarities', icon: '🔗' },
  { key: 'differences', label: 'Differences', icon: '⚖️' },
  { key: 'contradictions', label: 'Contradictions', icon: '⚡' },
  { key: 'unique_a', label: 'Document A Unique', icon: '🅰️' },
  { key: 'unique_b', label: 'Document B Unique', icon: '🅱️' },
  { key: 'conclusion', label: 'Final Conclusion', icon: '🏁' },
];

const List: React.FC<{ items: string[]; tone?: string; empty: string }> = ({ items, tone, empty }) =>
  items.length ? (
    <ul className={`cw-list ${tone ? 'cw-list-' + tone : ''}`}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  ) : <p className="cw-empty">{empty}</p>;

const fmtChars = (n?: number) => (n ? `${n.toLocaleString()} chars` : '—');

const ContextCard: React.FC<{ tag: string; name: string; type?: string; chars?: number; preview?: string; accent: 'a' | 'b' }> =
  ({ tag, name, type, chars, preview, accent }) => (
    <div className={`cw-ctx-doc cw-ctx-${accent}`}>
      <span className="cw-ctx-tag">{tag}</span>
      <h4 className="cw-ctx-name" title={name}>{name}</h4>
      <div className="cw-ctx-meta">{type ? type.toUpperCase() : 'TEXT'} · {fmtChars(chars)}</div>
      {preview && <blockquote className="cw-ctx-preview">{preview}</blockquote>}
    </div>
  );

const CompareWorkspace: React.FC<CompareWorkspaceProps> = ({ result, onReset }) => {
  const [tab, setTab] = useState<TabKey>('overview');
  const [copied, setCopied] = useState<string | null>(null);
  const flash = (k: string) => { setCopied(k); setTimeout(() => setCopied(null), 1800); };

  const a = result.doc_a_name;
  const b = result.doc_b_name;

  const buildMarkdown = () => {
    const s = (title: string, items: string[]) => items.length ? `## ${title}\n${items.map(i => `- ${i}`).join('\n')}\n\n` : '';
    return (
      `# DocSumm — Document Comparison\n\n**A:** ${a}  \n**B:** ${b}\n\n` +
      `## Overview\n${result.overview}\n\n` +
      s('Similarities', result.similarities) +
      s('Differences', result.differences) +
      s('Contradictions', result.contradictions) +
      s(`Unique to ${a}`, result.unique_a) +
      s(`Unique to ${b}`, result.unique_b) +
      `## Final Conclusion\n${result.conclusion}\n` +
      (result.recommendation ? `\n## Recommended Next Steps\n${result.recommendation}\n` : '')
    );
  };

  const buildPlainText = () =>
    buildMarkdown().replace(/^#+\s*/gm, '').replace(/\*\*/g, '').replace(/^- /gm, '• ');

  const handleCopy = async () => { await navigator.clipboard.writeText(buildPlainText()); flash('copy'); };
  const handleCopyMarkdown = async () => { await navigator.clipboard.writeText(buildMarkdown()); flash('md'); };
  const handleDownload = () => {
    const blob = new Blob([buildPlainText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = 'document_comparison.txt';
    document.body.appendChild(el); el.click(); document.body.removeChild(el);
    URL.revokeObjectURL(url);
  };

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ul = (items: string[]) => `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const handleExportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    let body = `
      <div class="brand">DocSumm <span>Document Comparison</span></div>
      <div class="docs"><b>A:</b> ${esc(a)} &nbsp; <b>B:</b> ${esc(b)}</div>
      <h2>Overview</h2><p>${esc(result.overview || '')}</p>`;
    if (result.similarities.length) body += `<h2>Similarities</h2>${ul(result.similarities)}`;
    if (result.differences.length) body += `<h2>Differences</h2>${ul(result.differences)}`;
    if (result.contradictions.length) body += `<h2>Contradictions</h2>${ul(result.contradictions)}`;
    if (result.unique_a.length) body += `<h2>Unique to ${esc(a)}</h2>${ul(result.unique_a)}`;
    if (result.unique_b.length) body += `<h2>Unique to ${esc(b)}</h2>${ul(result.unique_b)}`;
    if (result.conclusion) body += `<h2>Final Conclusion</h2><p>${esc(result.conclusion)}</p>`;
    if (result.recommendation) body += `<h2>Recommended Next Steps</h2><p>${esc(result.recommendation)}</p>`;
    win.document.write(`<!DOCTYPE html><html><head><title>DocSumm Comparison</title><style>
      body{font-family:system-ui,-apple-system,sans-serif;padding:48px;max-width:820px;margin:0 auto;color:#1f2937;line-height:1.7}
      .brand{font-size:1.1rem;font-weight:800;color:#6258f5;margin-bottom:8px}
      .brand span{font-weight:500;color:#94a3b8;font-size:0.85rem;margin-left:6px}
      .docs{font-size:0.85rem;color:#475569;margin-bottom:16px}
      h2{font-size:1.12rem;margin:26px 0 8px;color:#4338ca;border-bottom:2px solid #eef2ff;padding-bottom:4px}
      p{white-space:pre-wrap} ul{margin:6px 0 6px 22px} li{margin-bottom:5px}
      @media print{body{padding:24px}}
    </style></head><body>${body}</body></html>`);
    win.document.close(); win.focus(); win.print();
  };

  const counts: Record<TabKey, number | null> = {
    overview: null,
    similarities: result.similarities.length,
    differences: result.differences.length,
    contradictions: result.contradictions.length,
    unique_a: result.unique_a.length,
    unique_b: result.unique_b.length,
    conclusion: null,
  };

  return (
    <div className="compare-workspace animate-in">
      {/* Header */}
      <div className="cw-header">
        <div className="cw-title-row">
          <div className="cw-icon">⚖️</div>
          <div>
            <h2 className="cw-heading">Document Comparison</h2>
            <p className="cw-docs">
              <span className="cw-doc-a" title={a}>{a}</span>
              <span className="cw-vs">vs</span>
              <span className="cw-doc-b" title={b}>{b}</span>
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onReset}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>
          New comparison
        </button>
      </div>

      <div className="cw-workspace">
        {/* Document Context panel */}
        <aside className="cw-context" aria-label="Documents compared">
          <span className="cw-context-kicker">Documents Compared</span>
          <ContextCard tag="Document A" name={a} type={result.doc_a?.file_type} chars={result.doc_a?.char_count} preview={result.doc_a?.preview} accent="a" />
          <ContextCard tag="Document B" name={b} type={result.doc_b?.file_type} chars={result.doc_b?.char_count} preview={result.doc_b?.preview} accent="b" />
        </aside>

        {/* Main */}
        <section className="cw-main">
          <div className="cw-tabs" role="tablist">
            {TABS.map(t => (
              <button key={t.key} role="tab" className={`cw-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                <span className="cw-tab-icon">{t.icon}</span>{t.label}
                {counts[t.key] !== null && <span className="cw-tab-count">{counts[t.key]}</span>}
              </button>
            ))}
          </div>

          <div className="cw-panel">
            {tab === 'overview' && <p className="cw-overview">{result.overview || 'No overview available.'}</p>}
            {tab === 'similarities' && <List items={result.similarities} tone="pos" empty="No shared points found." />}
            {tab === 'differences' && <List items={result.differences} empty="No differences found." />}
            {tab === 'contradictions' && <List items={result.contradictions} tone="neg" empty="No direct contradictions found." />}
            {tab === 'unique_a' && (
              <>
                <h4 className="cw-unique-head cw-unique-a">Only in {a}</h4>
                <List items={result.unique_a} empty="Nothing unique found in Document A." />
              </>
            )}
            {tab === 'unique_b' && (
              <>
                <h4 className="cw-unique-head cw-unique-b">Only in {b}</h4>
                <List items={result.unique_b} empty="Nothing unique found in Document B." />
              </>
            )}
            {tab === 'conclusion' && (
              <div className="cw-conclusion">
                <p>{result.conclusion || 'No conclusion available.'}</p>
                {result.recommendation && (
                  <div className="cw-recommendation">
                    <span className="cw-reco-label">💡 Recommended Next Steps</span>
                    <p>{result.recommendation}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export bar */}
          <div className="cw-export-bar">
            <button className="btn btn-ghost" onClick={handleCopy}>{copied === 'copy' ? 'Copied!' : 'Copy'}</button>
            <button className="btn btn-ghost" onClick={handleDownload}>Download .txt</button>
            <button className="btn btn-ghost" onClick={handleCopyMarkdown}>{copied === 'md' ? 'Copied!' : 'Copy Markdown'}</button>
            <button className="btn btn-primary" onClick={handleExportPDF}>Export PDF</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CompareWorkspace;
