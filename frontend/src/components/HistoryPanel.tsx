import React, { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHistory, clearHistory, deleteHistoryItem } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { HistoryItem } from '../types';
import './HistoryPanel.css';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJob: (jobId: string) => void;
}

const LIMIT = 10;

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, onSelectJob }) => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { user, authReady } = useAuth();
  const historyScope = user ? user.id : 'guest';
  const historyScopeLabel = user ? 'Personal history' : 'Guest history';
  const historyScopeText = user
    ? 'Showing analyses saved to your account.'
    : 'Showing guest and older local analyses on this device.';

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['history', historyScope],
      queryFn: ({ pageParam = 0 }) => fetchHistory(pageParam as number, LIMIT),
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < LIMIT ? undefined : allPages.length * LIMIT,
      initialPageParam: 0,
      enabled: isOpen && authReady,
    });

  const refreshHistory = () => queryClient.invalidateQueries({ queryKey: ['history'] });

  const clearMut = useMutation({ mutationFn: clearHistory, onSuccess: refreshHistory });
  const deleteMut = useMutation({ mutationFn: deleteHistoryItem, onSuccess: refreshHistory });

  const allItems: HistoryItem[] = data?.pages.flat() ?? [];

  const handleClearAll = () => {
    if (!allItems.length || clearMut.isPending) return;
    if (!window.confirm(`Delete all summaries from ${historyScopeLabel.toLowerCase()}? This cannot be undone.`)) return;
    clearMut.mutate();
  };

  const handleDeleteItem = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (deleteMut.isPending) return;
    if (!window.confirm('Delete this summary from history? This cannot be undone.')) return;
    deleteMut.mutate(jobId);
  };
  const filtered = allItems.filter(item =>
    (item.filename || 'Text Input').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className={`history-backdrop ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`history-panel ${isOpen ? 'open' : ''}`}>
        <div className="history-header">
          <div className="history-title-group">
            <h2>Summary History</h2>
            <span className={`history-scope ${user ? 'history-scope-user' : 'history-scope-guest'}`}>
              {historyScopeLabel}
            </span>
          </div>
          <div className="history-header-actions">
            <button
              className="history-clear-btn"
              onClick={handleClearAll}
              disabled={!allItems.length || clearMut.isPending}
              title="Delete all summaries"
            >
              {clearMut.isPending ? 'Clearing…' : 'Clear all'}
            </button>
            <button className="close-btn" onClick={onClose} aria-label="Close panel">&times;</button>
          </div>
        </div>
        {clearMut.isError && (
          <div className="history-error">{(clearMut.error as Error).message}</div>
        )}

        <div className="history-scope-note">{historyScopeText}</div>

        <div className="history-search-container">
          <input
            type="text"
            placeholder="Search by file name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="history-search-input"
          />
        </div>

        <div className="history-content">
          {error && <div className="history-error">{(error as Error).message}</div>}

          {!authReady && (
            <div className="history-loading">
              <div className="spinner" />
              <span>Checking account...</span>
            </div>
          )}

          {authReady && filtered.length === 0 && !isLoading && (
            <div className="history-empty">
              {search ? 'No matching summaries found.' : 'No history yet.'}
            </div>
          )}

          <div className="history-list">
            {filtered.map(item => (
              <div key={item.job_id} className="history-item" onClick={() => onSelectJob(item.job_id)}>
                <div className="history-item-header">
                  <span className="history-item-title" title={item.filename || 'Text Input'}>
                    {item.filename || 'Text Input'}
                  </span>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                  <button
                    className="history-item-delete"
                    onClick={e => handleDeleteItem(e, item.job_id)}
                    disabled={deleteMut.isPending}
                    aria-label="Delete this summary"
                    title="Delete"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
                <div className="history-item-date">{formatDate(item.created_at)}</div>
                {item.summary_snippet && (
                  <p className="history-item-snippet">{item.summary_snippet}</p>
                )}
              </div>
            ))}
          </div>

          {authReady && (isLoading || isFetchingNextPage) && (
            <div className="history-loading">
              <div className="spinner" />
              <span>Loading...</span>
            </div>
          )}

          {!isLoading && !isFetchingNextPage && hasNextPage && (
            <button className="load-more-btn" onClick={() => fetchNextPage()}>Load More</button>
          )}
        </div>
      </aside>
    </>
  );
};

export default HistoryPanel;
