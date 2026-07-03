export type JobStatus = 'idle' | 'done' | 'error';

// Task-based workspace (Phase 1)
export type TaskKey =
  | 'summarize'
  | 'study'
  | 'ask'
  | 'compare'
  | 'risk'
  | 'action'
  | 'evidence';

export interface KeyInsights {
  main_topic: string;
  key_takeaways: string[];
  entities: string[];
  numbers: string[];
  risks: string[];
  opportunities: string[];
  action_items: string[];
  evidence_map?: EvidenceMapItem[];
  risk_report?: RiskReport;
}

export interface EvidenceMapItem {
  claim: string;
  evidence_snippet: string;
  source: string;
  confidence: string;
}

export interface RedFlag {
  issue: string;
  why_it_matters: string;
  suggested_follow_up: string;
}

export interface RiskReport {
  risks: string[];
  opportunities: string[];
  assumptions: string[];
  missing_information: string[];
  follow_up_questions: string[];
  red_flags: RedFlag[];
}

export interface SummaryResponse {
  job_id: string;
  filename: string | null;
  file_type?: string | null;
  summary: string | null;
  method: string;
  status: string;
  char_count_original: number | null;
  char_count_summary: number | null;
  document_preview?: string | null;
  source_snippets?: string[];
  sentences_requested: number;
  length: string | null;
  tone: string | null;
  style: string | null;
  key_insights: KeyInsights | null;
  action_items: string[];
  created_at: string;
  completed_at: string | null;
}

export interface HistoryItem {
  job_id: string;
  filename: string | null;
  summary_snippet: string | null;
  status: string;
  created_at: string;
}

export interface Flashcard {
  front: string;
  back: string;
  topic?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface StudyOptions {
  flashcard_count: number;
  quiz_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  quiz_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'mixed';
}

export interface PreparedDoc {
  job_id: string;
  filename: string | null;
  file_type: string | null;
  char_count_original: number | null;
  document_preview: string | null;
  status: string;
}

export interface DocInput {
  file: File | null;
  text: string;
}

export interface CompareResult {
  doc_a_name: string;
  doc_b_name: string;
  overview: string;
  similarities: string[];
  differences: string[];
  contradictions: string[];
  unique_a: string[];
  unique_b: string[];
  conclusion: string;
  recommendation: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface StudyData {
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  key_terms: KeyTerm[];
  eli5: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface QuizAttempt {
  score: number;
  total: number;
  at: number;
}
