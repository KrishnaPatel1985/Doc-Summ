export type JobStatus = 'idle' | 'done' | 'error';

export interface KeyInsights {
  main_topic: string;
  key_takeaways: string[];
  entities: string[];
  numbers: string[];
  risks: string[];
  opportunities: string[];
  action_items: string[];
}

export interface SummaryResponse {
  job_id: string;
  filename: string | null;
  summary: string | null;
  method: string;
  status: string;
  char_count_original: number | null;
  char_count_summary: number | null;
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
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
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
