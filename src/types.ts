
export type ExamMode = 'EXAM' | 'STUDY' | 'REVIEW';

export enum AppView {
  HOME = 'HOME',
  EXAM = 'EXAM',
  RESULTS = 'RESULTS',
  HISTORY = 'HISTORY',
  REVIEW = 'REVIEW',
  STUDY_MENU = 'STUDY_MENU',
  STUDY_SESSION = 'STUDY_SESSION',
  INFO_MENU = 'INFO_MENU',
  INFO_DETAIL = 'INFO_DETAIL',
  FAQ_MENU = 'FAQ_MENU'
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  category: string;
  imageUrl?: string;
}

// Legacy Question type for backward compatibility with constants.ts
export interface LegacyQuestion {
  id: string;
  question: string;
  options: string[];
  correct: string;
  category: string;
  imageUrl?: string;
}

// Renamed from AnswerRecord to LegacyAnswerRecord to support the legacy App.tsx logic
export interface LegacyAnswerRecord {
  question: LegacyQuestion;
  selectedAnswer: string;
  isCorrect: boolean;
}

// New AnswerRecord for the Exam Engine (Index based)
export interface AnswerRecord {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  timestamp: number;
}

export interface ExamResult {
  id: string;
  userName: string;
  date: string;
  score: number;
  total: number;
  passed: boolean;
  isTimeout: boolean;
  mistakes: LegacyAnswerRecord[]; // Updated to use LegacyAnswerRecord
}

export interface InfoModule {
  id: string;
  title: string;
  icon: string;
  description: string;
  content: {
    title: string;
    text: string[];
  }[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'Geral' | 'Financeiro' | 'Legal' | 'Operacional';
}

export interface UserStats {
  totalExams: number;
  averageScore: number;
  examsPassed: number;
  questionsAnswered: number;
  weakestTopic: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  isPremium: boolean;
  institutionCode?: string; 
}

export interface ExamCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  totalQuestions: number;
  examDurationMinutes: number;
  passScore: number;
  questionsPerExam: number;
  isPremium: boolean;
}

export interface ExamSession {
  id: string;
  categoryId: string;
  mode: ExamMode;
  startTime: number;
  endTime: number;
  answers: Record<string, AnswerRecord>;
  questions: Question[];
  score: number;
  passed: boolean;
}
