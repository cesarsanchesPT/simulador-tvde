
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExamResult, UserStats } from '../types';
import { getExamHistory, saveExamResult } from '../services/examService';

interface StatsContextType {
  history: ExamResult[];
  stats: UserStats;
  addResult: (result: ExamResult) => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

const calculateStats = (history: ExamResult[]): UserStats => {
  const totalExams = history.length;
  if (totalExams === 0) {
    return {
      totalExams: 0,
      averageScore: 0,
      examsPassed: 0,
      questionsAnswered: 0,
      weakestTopic: 'N/A'
    };
  }

  const examsPassed = history.filter(r => r.passed).length;
  const totalScore = history.reduce((acc, r) => acc + r.score, 0);
  const totalMaxScore = history.reduce((acc, r) => acc + r.total, 0);
  
  // Calculate average percentage
  const averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  // Calculate weakest topic based on mistakes
  const mistakesByTopic: Record<string, number> = {};
  history.forEach(exam => {
    exam.mistakes.forEach(mistake => {
      const topic = mistake.question.category || 'Geral';
      mistakesByTopic[topic] = (mistakesByTopic[topic] || 0) + 1;
    });
  });

  let weakestTopic = 'N/A';
  let maxMistakes = 0;
  Object.entries(mistakesByTopic).forEach(([topic, count]) => {
    if (count > maxMistakes) {
      maxMistakes = count;
      weakestTopic = topic;
    }
  });

  return {
    totalExams,
    examsPassed,
    averageScore,
    questionsAnswered: totalMaxScore, // Or track actual questions answered if needed
    weakestTopic
  };
};

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [stats, setStats] = useState<UserStats>(calculateStats([]));

  const refreshData = () => {
    const loadedHistory = getExamHistory();
    setHistory(loadedHistory);
    setStats(calculateStats(loadedHistory));
  };

  useEffect(() => {
    refreshData();

    // Listen for storage events to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tvde_exam_history_v2') {
        refreshData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addResult = (result: ExamResult) => {
    saveExamResult(result);
    refreshData(); // Immediate update for current tab
  };

  return (
    <StatsContext.Provider value={{ history, stats, addResult }}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) throw new Error('useStats must be used within StatsProvider');
  return context;
};
