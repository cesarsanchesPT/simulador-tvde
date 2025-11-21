
export type ExamMode = 'EXAM' | 'STUDY' | 'REVIEW';

export interface ExamCategory {
  id: string;
  title: string;
  description: string;
  icon: string; // Icon name
  totalQuestions: number; // Pool size
  examDurationMinutes: number;
  passScore: number;
  questionsPerExam: number;
  isPremium: boolean; // If true, requires premium account
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number; // Changed from string comparison to index for robustness
  explanation?: string;
  category: string; // Internal topic (e.g., "Mecânica", "Legislação")
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

export interface AnswerRecord {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  timestamp: number;
  // Legacy support
  question?: LegacyQuestion;
  selectedAnswer?: string;
}

export interface ExamSession {
  id: string;
  categoryId: string;
  mode: ExamMode;
  startTime: number;
  endTime?: number;
  answers: Record<string, AnswerRecord>; // Map questionId -> Answer
  questions: Question[]; // The specific subset for this session
  score: number;
  passed: boolean;
}

export interface ExamResult {
  id: string;
  userName: string;
  date: string;
  score: number;
  total: number;
  passed: boolean;
  isTimeout: boolean;
  mistakes: {
    question: LegacyQuestion;
    selectedAnswer: string;
    isCorrect: boolean;
  }[];
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
  institutionCode?: string; // For driving schools
}
