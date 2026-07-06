import type { SummaryResponse, HistoryItem, StudyData, StudyOptions, PreparedDoc, DocInput, CompareResult, ChatMessage, QuizAttempt } from '../types';

const BASE = '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function submitSummarizeJob(
  files: File[],
  text: string | null,
  sentences: number,
  style: string,
  customInstructions: string,
  length: string = 'medium',
  tone: string = 'professional',
): Promise<SummaryResponse> {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  if (text) form.append('text', text);
  form.append('sentences', String(sentences));
  form.append('style', style);
  form.append('length', length);
  form.append('tone', tone);
  if (customInstructions.trim()) form.append('custom_instructions', customInstructions.trim());
  return apiFetch<SummaryResponse>('/summarize', { method: 'POST', body: form });
}

export async function fetchSummary(jobId: string): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>(`/summary/${jobId}`);
}

export async function fetchHistory(skip = 0, limit = 10): Promise<HistoryItem[]> {
  return apiFetch<HistoryItem[]>(`/history?skip=${skip}&limit=${limit}`);
}

export async function fetchHistoryItem(jobId: string): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>(`/history/${jobId}`);
}

export async function clearHistory(): Promise<{ deleted: number }> {
  return apiFetch<{ deleted: number }>('/history', { method: 'DELETE' });
}

export async function deleteHistoryItem(jobId: string): Promise<{ deleted: number }> {
  return apiFetch<{ deleted: number }>(`/history/${jobId}`, { method: 'DELETE' });
}

export async function askDocument(jobId: string, question: string): Promise<string> {
  const res = await apiFetch<{ answer: string }>('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, question }),
  });
  return res.answer;
}

export async function fetchStudy(jobId: string, options?: StudyOptions): Promise<StudyData> {
  return apiFetch<StudyData>(`/study/${jobId}`, {
    method: 'POST',
    headers: options ? { 'Content-Type': 'application/json' } : undefined,
    body: options ? JSON.stringify(options) : undefined,
  });
}

export async function prepareDocument(files: File[], text: string | null): Promise<PreparedDoc> {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  if (text) form.append('text', text);
  return apiFetch<PreparedDoc>('/prepare', { method: 'POST', body: form });
}

export async function compareDocuments(a: DocInput, b: DocInput, focus?: string): Promise<CompareResult> {
  const form = new FormData();
  if (a.file) form.append('file_a', a.file);
  else if (a.text.trim()) form.append('text_a', a.text.trim());
  if (b.file) form.append('file_b', b.file);
  else if (b.text.trim()) form.append('text_b', b.text.trim());
  if (focus && focus.trim()) form.append('focus', focus.trim());
  return apiFetch<CompareResult>('/compare', { method: 'POST', body: form });
}

// ----- Phase 5: persisted records -----
export async function saveQuizResult(jobId: string, score: number, total: number, answers?: unknown): Promise<void> {
  await apiFetch('/quiz-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, score, total, answers: answers ?? null }),
  });
}

export async function fetchQuizResults(jobId: string): Promise<QuizAttempt[]> {
  const rows = await apiFetch<{ score: number; total: number; created_at: string }[]>(`/quiz-results/${jobId}`);
  return rows.map(r => ({ score: r.score, total: r.total, at: Date.parse(r.created_at) || 0 }));
}

export async function fetchChat(jobId: string): Promise<ChatMessage[]> {
  const rows = await apiFetch<{ role: 'user' | 'assistant'; message: string }[]>(`/chat/${jobId}`);
  return rows.map(r => ({ role: r.role, content: r.message }));
}
