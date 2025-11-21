import React, { useState, useEffect, useCallback } from 'react';
import { Question, ExamResult, MistakeRecord } from '../types';
import { generateExam } from '../services/examService';
import { EXAM_CONFIG } from '../constants';
import { generateUUID } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import { SpeakerWaveIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';
import QuizTimer from '../components/QuizTimer';

interface ExamViewProps {
  onFinish: (result: ExamResult) => void;
  onExit: () => void;
}

export const ExamView: React.FC<ExamViewProps> = ({ onFinish, onExit }) => {
  const { user } = useAuth();
  const { addResult } = useStats();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_CONFIG.DURATION_MINUTES * 60);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Iniciar novo exame ao montar componente
    const newQuestions = generateExam();
    setQuestions(newQuestions);
    setIsLoading(false);
  }, []);

  const handleFinish = useCallback((isTimeout: boolean) => {
    const score = questions.reduce((acc, q, idx) => {
      return answers[idx] === q.correctIndex ? acc + 1 : acc;
    }, 0);

    const mistakes: MistakeRecord[] = questions.reduce((acc, q, idx) => {
      if (answers[idx] !== q.correctIndex) {
        acc.push({
          question: q,
          selectedAnswer: answers[idx] !== undefined ? q.options[answers[idx]] : 'Não respondida',
          isCorrect: false
        });
      }
      return acc;
    }, [] as MistakeRecord[]);

    const result: ExamResult = {
      id: generateUUID(),
      userName: user?.name || 'Anónimo',
      date: new Date().toISOString(),
      score,
      total: questions.length,
      passed: score >= EXAM_CONFIG.PASS_SCORE && !isTimeout,
      isTimeout,
      mistakes
    };

    addResult(result);
    onFinish(result);
  }, [questions, answers, user, addResult, onFinish]);

  const handleExitConfirm = () => {
    if (window.confirm("Tem a certeza que deseja sair? O progresso será perdido.")) {
      onExit();
    }
  };

  const handleAnswerSelect = (idx: number) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: idx }));
  };

  const speakQuestion = (text: string, options: string[]) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`${text}. Opções: ${options.map((o, i) => `Opção ${String.fromCharCode(65+i)}: ${o}`).join('. ')}`);
      u.lang = 'pt-PT';
      window.speechSynthesis.speak(u);
    }
  };

  if (isLoading || questions.length === 0) return <div className="p-10 text-center">A preparar exame...</div>;

  const q = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-fade-in pt-4">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center justify-between sticky top-20 z-30">
        <div className="flex items-center gap-3">
          <button onClick={handleExitConfirm} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center font-bold">
            {currentIndex + 1}
          </div>
          <div className="text-sm text-gray-500">de {questions.length}</div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
          <span className="font-bold text-indigo-600">{answeredCount}</span> respondidas
        </div>

        <QuizTimer secondsLeft={timeLeft} setSecondsLeft={setTimeLeft} onTimeUp={() => handleFinish(true)} />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-between mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide">
              {q.category}
            </span>
            <button
              onClick={() => speakQuestion(q.text, q.options)}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            >
              <SpeakerWaveIcon className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-relaxed mb-8">
            {q.text}
          </h3>

          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              const isSelected = answers[currentIndex] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 group ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <div className={`w-6 h-6 mt-0.5 rounded-full flex items-center justify-center text-xs font-bold border transition-colors shrink-0 ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className={`text-base ${isSelected ? 'text-indigo-900 font-bold' : 'text-gray-700'}`}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="bg-gray-50 px-6 py-6 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ChevronLeftIcon className="w-4 h-4" /> Anterior
          </button>

          {isLast ? (
            <button
              onClick={() => {
                if (window.confirm(`Tem ${questions.length - answeredCount} perguntas por responder. Deseja finalizar?`)) {
                  handleFinish(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              Finalizar Prova <CheckCircleIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              Próxima <ChevronRightIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};