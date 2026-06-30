import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchHistory } from '../api/client';
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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['history'],
      queryFn: ({ pageParam = 0 }) => fetchHistory(pageParam as number, LIMIT),
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < LIMIT ? undefined : allPages.length * LIMIT,
      initialPageParam: 0,
      enabled: isOpen,
    });

  const allItems: HistoryItem[] = data?.pages.flat() ?? [];
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
          <h2>Summary History</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close panel">&times;</button>
        </div>

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

          {filtered.length === 0 && !isLoading && (
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
                </div>
                <div className="history-item-date">{formatDate(item.created_at)}</div>
                {item.summary_snippet && (
                  <p className="history-item-snippet">{item.summary_snippet}</p>
                )}
              </div>
            ))}
          </div>

          {(isLoading || isFetchingNextPage) && (
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
