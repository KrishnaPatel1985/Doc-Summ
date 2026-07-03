import React, { useState } from 'react';
import type { CompareResult } from '../types';
import './CompareWorkspace.css';

interface CompareWorkspaceProps {
  result: CompareResult;
  onReset: () => void;
}

type TabKey = 'overview' | 'similarities' | 'differences' | 'contradictions' | 'unique' | 'conclusion';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '🧭' },
  { key: 'similarities', label: 'Similarities', icon: '🔗' },
  { key: 'differences', label: 'Differences', icon: '⚖️' },
  { key: 'contradictions', label: 'Contradictions', icon: '⚡' },
  { key: 'unique', label: 'Unique Points', icon: '✨' },
  { key: 'conclusion', label: 'Conclusion', icon: '🏁' },
];

const List: React.FC<{ items: string[]; tone?: string; empty: string }> = ({ items, tone, empty }) =>
  items.length ? (
    <ul className={`cw-list ${tone ? 'cw-list-' + tone : ''}`}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  ) : <p className="cw-empty">{empty}</p>;

const CompareWorkspace: React.FC<CompareWorkspaceProps> = ({ result, onReset }) => {
  const [tab, setTab] = useState<TabKey>('overview');
  const [copied, setCopied] = useState(false);

  const buildReport = () => {
    const s = (title: string, items: string[]) => items.length ? `## ${title}\n${items.map(i => `- ${i}`).join('\n')}\n\n` : '';
    return (
      `# DocSumm — Document Comparison\n\n**A:** ${result.doc_a_name}  \n**B:** ${result.doc_b_name}\n\n` +
      `## Overview\n${result.overview}\n\n` +
      s('Similarities', result.similarities) +
      s('Differences', result.differences) +
      s('Contradictions', result.contradictions) +
      s(`Unique to ${result.doc_a_name}`, result.unique_a) +
      s(`Unique to ${result.doc_b_name}`, result.unique_b) +
      `## Conclusion\n${result.conclusion}\n` +
      (result.recommendation ? `\n## Recommendation\n${result.recommendation}\n` : '')
    );
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(buildReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const counts: Record<TabKey, number | null> = {
    overview: null,
    similarities: result.similarities.length,
    differences: result.differences.length,
    contradictions: result.contradictions.length,
    unique: result.unique_a.length + result.unique_b.length,
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
              <span className="cw-doc-a" title={result.doc_a_name}>{result.doc_a_name}</span>
              <span className="cw-vs">vs</span>
              <span className="cw-doc-b" title={result.doc_b_name}>{result.doc_b_name}</span>
            </p>
          </div>
        </div>
        <div className="cw-header-right">
          <button className="btn btn-ghost" onClick={copyReport}>{copied ? 'Copied!' : 'Copy report'}</button>
          <button className="btn btn-primary" onClick={onReset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>
            New comparison
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="cw-tabs" role="tablist">
        {TABS.map(t => (
          <button key={t.key} role="tab" className={`cw-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <span className="cw-tab-icon">{t.icon}</span>{t.label}
            {counts[t.key] !== null && <span className="cw-tab-count">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="cw-panel">
        {tab === 'overview' && (
          <p className="cw-overview">{result.overview || 'No overview available.'}</p>
        )}
        {tab === 'similarities' && <List items={result.similarities} tone="pos" empty="No shared points found." />}
        {tab === 'differences' && <List items={result.differences} empty="No differences found." />}
        {tab === 'contradictions' && <List items={result.contradictions} tone="neg" empty="No direct contradictions found." />}
        {tab === 'unique' && (
          <div className="cw-unique-grid">
            <div className="cw-unique-col">
              <h4 className="cw-unique-head cw-unique-a">Only in {result.doc_a_name}</h4>
              <List items={result.unique_a} empty="Nothing unique found." />
            </div>
            <div className="cw-unique-col">
              <h4 className="cw-unique-head cw-unique-b">Only in {result.doc_b_name}</h4>
              <List items={result.unique_b} empty="Nothing unique found." />
            </div>
          </div>
        )}
        {tab === 'conclusion' && (
          <div className="cw-conclusion">
            <p>{result.conclusion || 'No conclusion available.'}</p>
            {result.recommendation && (
              <div className="cw-recommendation">
                <span className="cw-reco-label">💡 Recommendation</span>
                <p>{result.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompareWorkspace;
