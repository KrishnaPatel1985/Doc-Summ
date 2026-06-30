import type { SummaryResponse, HistoryItem, StudyData } from '../types';

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

export async function askDocument(jobId: string, question: string): Promise<string> {
  const res = await apiFetch<{ answer: string }>('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, question }),
  });
  return res.answer;
}

export async function fetchStudy(jobId: string): Promise<StudyData> {
  return apiFetch<StudyData>(`/study/${jobId}`, { method: 'POST' });
}
