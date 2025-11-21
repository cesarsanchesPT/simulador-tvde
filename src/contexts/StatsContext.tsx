
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExamResult, UserStats, GlobalStats } from '../types';
import { getExamHistory, saveExamResult } from '../services/examService';

interface StatsContextType {
  history: ExamResult[];
  stats: UserStats;
  globalStats: GlobalStats; // Dados "live" da comunidade
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
  
  const averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

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
    questionsAnswered: totalMaxScore,
    weakestTopic
  };
};

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [stats, setStats] = useState<UserStats>(calculateStats([]));
  
  // Simulação de Dados Globais (Fake Live Data)
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    activeUsers: 124,
    totalExams: 15420,
    passRate: 68
  });

  // Broadcast Channel para sincronização entre abas
  const [channel] = useState(() => new BroadcastChannel('tvde_sync_channel'));

  const refreshData = () => {
    const loadedHistory = getExamHistory();
    setHistory(loadedHistory);
    setStats(calculateStats(loadedHistory));
  };

  useEffect(() => {
    refreshData();

    // 1. Listener para Storage (fallback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tvde_exam_history_v2') {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 2. Listener para BroadcastChannel (Instantâneo)
    channel.onmessage = (event) => {
      if (event.data.type === 'UPDATE_HISTORY') {
        refreshData();
      }
    };

    // 3. Simulação de Atividade Global ("Live")
    const interval = setInterval(() => {
      setGlobalStats(prev => {
        // Aleatoriamente aumenta o número de exames ou muda utilizadores ativos
        const changeUsers = Math.random() > 0.5 ? Math.floor(Math.random() * 5) - 2 : 0;
        const newExams = Math.random() > 0.7 ? 1 : 0;
        
        return {
          ...prev,
          activeUsers: Math.max(50, prev.activeUsers + changeUsers),
          totalExams: prev.totalExams + newExams
        };
      });
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
      channel.close();
    };
  }, [channel]);

  const addResult = (result: ExamResult) => {
    saveExamResult(result);
    refreshData(); // Update local state
    // Notificar outras abas
    channel.postMessage({ type: 'UPDATE_HISTORY' });
  };

  return (
    <StatsContext.Provider value={{ history, stats, globalStats, addResult }}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) throw new Error('useStats must be used within StatsProvider');
  return context;
};
