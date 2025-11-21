
import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppView, LegacyQuestion, ExamResult, InfoModule, FAQ } from './types';
import { MOCK_QUESTIONS, INFO_MODULES, TVDE_FAQS, EXAM_CONFIG } from './constants';
import { generateExam, saveExamResult, getExamHistory } from './services/examService';
import QuizTimer from './components/QuizTimer';
import Confetti from './components/Confetti';
import { generateUUID } from './utils';
import { 
  CheckCircleIcon, XCircleIcon, HistoryIcon, PlayIcon, ChevronRightIcon, 
  UserIcon, EyeIcon, BookOpenIcon, InfoIcon, ChevronLeftIcon, LightBulbIcon,
  ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon,
  ArrowUpIcon, EnvelopeIcon, Squares2X2Icon, ChartBarIcon, SpeakerWaveIcon,
  PaperAirplaneIcon, HeartIcon, GiftIcon, CreditCardIcon, 
  ShareIcon, Bars3Icon, XMarkIcon
} from './components/Icons';
import { HomeView } from './views/HomeView';
import { FAQView } from './views/FAQView';
import { ExamCategory } from './types';

const LEVELS = [
  { name: 'Iniciado', minXP: 0, color: 'gray' },
  { name: 'Bronze', minXP: 500, color: 'orange' },
  { name: 'Prata', minXP: 1500, color: 'slate' },
  { name: 'Ouro', minXP: 3000, color: 'yellow' },
  { name: 'Platina', minXP: 5000, color: 'indigo' },
  { name: 'Diamante', minXP: 10000, color: 'cyan' }
];

const StatCard = ({ label, value, subtext, color = "indigo" }: { label: string, value: string, subtext: string, color?: string }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col items-center justify-center text-center transform transition hover:scale-105 duration-200`}>
    <span className={`text-3xl font-bold mb-1 text-${color}-600`}>{value}</span>
    <span className="text-sm font-semibold text-gray-900">{label}</span>
    <span className="text-xs text-gray-500 mt-1">{subtext}</span>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [questions, setQuestions] = useState<LegacyQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_CONFIG.DURATION_MINUTES * 60);
  
  const [userName, setUserName] = useState('');
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [history, setHistory] = useState<ExamResult[]>([]);
  
  const [reviewData, setReviewData] = useState<ExamResult | null>(null);
  const [returnView, setReturnView] = useState<AppView>(AppView.RESULTS);

  // States for Study Mode
  const [studyCategory, setStudyCategory] = useState<string>('Todos');
  const [studyQuestions, setStudyQuestions] = useState<LegacyQuestion[]>([]);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [studyAnswer, setStudyAnswer] = useState<string | null>(null);

  // States for Info Mode
  const [selectedInfoModule, setSelectedInfoModule] = useState<InfoModule | null>(null);

  // Innovation Features State
  const [smartRecommendation, setSmartRecommendation] = useState<string | null>(null);
  
  // Connectivity State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Support Modal State
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Gamification
  const [userXP, setUserXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(LEVELS[0]);
  const [nextLevel, setNextLevel] = useState(LEVELS[1]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Persistence Effect
  useEffect(() => {
    const savedState = localStorage.getItem('tvde_ui_prefs');
    if (savedState) {
      try {
        const { view, category } = JSON.parse(savedState);
        if (view && view !== AppView.EXAM && view !== AppView.STUDY_SESSION && view !== AppView.RESULTS) {
           setCurrentView(view);
        }
        if (category) {
          setStudyCategory(category);
        }
      } catch (e) {
        console.error("Failed to load preferences", e);
      }
    }
  }, []);

  // Save State Effect
  useEffect(() => {
    if (currentView !== AppView.EXAM && currentView !== AppView.STUDY_SESSION) {
      localStorage.setItem('tvde_ui_prefs', JSON.stringify({
        view: currentView,
        category: studyCategory
      }));
    }
  }, [currentView, studyCategory]);

  const calculateAnalytics = (hist: ExamResult[]) => {
    if (hist.length === 0) return;

    const stats: Record<string, { total: number, correct: number }> = {};

    hist.forEach(exam => {
      exam.mistakes.forEach(m => {
        const cat = m.question.category;
        if (!stats[cat]) stats[cat] = { total: 0, correct: 0 };
        stats[cat].total += 1; // Counting errors
      });
    });

    let maxErrors = 0;
    let worstCategory = '';
    
    Object.entries(stats).forEach(([cat, data]) => {
      if (data.total > maxErrors) {
        maxErrors = data.total;
        worstCategory = cat;
      }
    });

    if (worstCategory) {
      setSmartRecommendation(worstCategory);
    }
  };

  const calculateGamification = (hist: ExamResult[]) => {
    let totalXP = 0;
    hist.forEach(exam => {
       totalXP += exam.score; // 1 XP per question
       if (exam.passed) totalXP += 50; // Bonus
    });
    
    setUserXP(totalXP);

    let level = LEVELS[0];
    let next = LEVELS[1];

    for (let i = 0; i < LEVELS.length; i++) {
       if (totalXP >= LEVELS[i].minXP) {
          level = LEVELS[i];
          next = LEVELS[i + 1] || { name: 'Nível Máximo', minXP: 100000, color: 'black' };
       }
    }
    setCurrentLevel(level);
    setNextLevel(next);
  };

  useEffect(() => {
    // 1. Load Local History & Gamification
    const loadHistory = getExamHistory();
    setHistory(loadHistory);
    calculateAnalytics(loadHistory);
    calculateGamification(loadHistory);
    
    const storedName = localStorage.getItem('tvde_username');
    if (storedName) setUserName(storedName);

    // Sincronização em Tempo Real entre Separadores
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'tvde_exam_history_v2') {
         const newHistory = getExamHistory();
         setHistory(newHistory);
         calculateAnalytics(newHistory);
         calculateGamification(newHistory);
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const speakQuestion = (text: string, options: string[]) => {
    if (!('speechSynthesis' in window)) {
      alert("O seu navegador não suporta leitura de voz.");
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = `${text}. Opções: ${options.map((o, i) => `Opção ${String.fromCharCode(65+i)}: ${o}`).join('. ')}`;
    utterance.lang = 'pt-PT';
    utterance.rate = 1.1;
    
    window.speechSynthesis.speak(utterance);
  };

  const shareResultByEmail = () => {
    if (!lastResult) return;

    const subject = `Resultado Exame TVDE: ${lastResult.passed ? 'APROVADO' : 'REPROVADO'}`;
    const body = `
Olá,

Aqui está o resultado do meu exame simulado TVDE:

Nome: ${lastResult.userName}
Data: ${new Date(lastResult.date).toLocaleString()}
Resultado Final: ${lastResult.passed ? 'APROVADO' : 'REPROVADO'}
Pontuação: ${lastResult.score} de ${lastResult.total} (${Math.round((lastResult.score / lastResult.total) * 100)}%)
XP Ganho Estimado: ${lastResult.score + (lastResult.passed ? 50 : 0)}

Este teste foi realizado através do Simulador TVDE Pro.
    `;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // --- EXAM LOGIC ---
  const startExam = () => {
    const currentName = localStorage.getItem('tvde_username') || 'Utilizador';
    setUserName(currentName);
    
    const newQuestions = generateExam();
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(EXAM_CONFIG.DURATION_MINUTES * 60);
    setCurrentView(AppView.EXAM);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswerSelect = (option: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: option
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinishExamClick = () => {
    const answeredCount = Object.keys(answers).length;
    const remaining = questions.length - answeredCount;

    let message = `Tem a certeza que pretende entregar a prova?`;
    if (remaining > 0) {
      message = `ATENÇÃO: Ainda tem ${remaining} pergunta(s) por responder.\n\nSe finalizar agora, estas contarão como ERRADAS.\n\nDeseja mesmo entregar a prova?`;
    }

    if (window.confirm(message)) {
      finishExam(false);
    }
  };

  const finishExam = useCallback((isTimeout: boolean) => {
    try {
      let score = 0;
      const mistakes: ExamResult['mistakes'] = [];

      questions.forEach((q, index) => {
        const selected = answers[index];
        const isCorrect = selected === q.correct;
        if (isCorrect) {
          score++;
        } else {
          mistakes.push({
            question: q,
            selectedAnswer: selected || 'Não respondida',
            isCorrect: false
          });
        }
      });

      const passed = score >= EXAM_CONFIG.PASS_SCORE && !isTimeout;
      
      const result: ExamResult = {
        id: generateUUID(),
        userName: userName.trim(),
        date: new Date().toISOString(),
        score,
        total: questions.length,
        passed,
        isTimeout,
        mistakes
      };

      saveExamResult(result);
      setLastResult(result);
      setReviewData(result);
      
      const updatedHistory = getExamHistory();
      setHistory(updatedHistory);
      calculateAnalytics(updatedHistory);
      calculateGamification(updatedHistory);

      // Update Global Stats
      const storedStats = localStorage.getItem('tvde_global_stats');
      if (storedStats) {
        const stats = JSON.parse(storedStats);
        const newStats = {
          ...stats,
          totalExams: stats.totalExams + 1,
          passed: passed ? stats.passed + 1 : stats.passed
        };
        localStorage.setItem('tvde_global_stats', JSON.stringify(newStats));
      }

      if (passed) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
      
      setCurrentView(AppView.RESULTS);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Erro ao finalizar exame:", error);
      alert("Ocorreu um erro ao processar o resultado. Por favor tente novamente.");
    }
  }, [questions, answers, userName]);

  const openReview = (result: ExamResult, fromView: AppView) => {
    setReviewData(result);
    setReturnView(fromView);
    setCurrentView(AppView.REVIEW);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- STUDY MODE LOGIC ---
  const startStudySession = (category: string) => {
    const filtered = category === 'Todos' 
      ? [...MOCK_QUESTIONS] 
      : MOCK_QUESTIONS.filter(q => q.category === category);
    
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    
    setStudyCategory(category);
    setStudyQuestions(shuffled);
    setCurrentStudyIndex(0);
    setStudyAnswer(null);
    setCurrentView(AppView.STUDY_SESSION);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStudyAnswer = (option: string) => {
    if (studyAnswer) return; 
    setStudyAnswer(option);
  };

  const nextStudyQuestion = () => {
    if (currentStudyIndex < studyQuestions.length - 1) {
      setCurrentStudyIndex(prev => prev + 1);
      setStudyAnswer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert("Sessão de estudo concluída!");
      setCurrentView(AppView.STUDY_MENU);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigation = (targetView: AppView) => {
    setIsMobileMenuOpen(false);

    if (currentView === AppView.EXAM) {
      if (window.confirm("Atenção: Ao sair do exame, o seu progresso será perdido. Deseja continuar?")) {
        setCurrentView(targetView);
      }
    } else if (currentView === AppView.STUDY_SESSION) {
      if (window.confirm("Deseja sair da sessão de estudo atual?")) {
        setCurrentView(targetView);
      }
    } else {
      setCurrentView(targetView);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- RENDERERS ---

  const renderHeader = () => (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigation(AppView.HOME)}>
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm">
            <Squares2X2Icon className="w-5 h-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Simulador TVDE Pro</h1>
        </div>

        <nav className="hidden md:flex gap-1">
          {[
            { id: AppView.HOME, label: 'Início', icon: Squares2X2Icon },
            { id: AppView.STUDY_MENU, label: 'Estudar', icon: BookOpenIcon },
            { id: AppView.HISTORY, label: 'Histórico', icon: ChartBarIcon },
            { id: AppView.INFO_MENU, label: 'Informações', icon: InfoIcon },
            { id: AppView.FAQ_MENU, label: 'Perguntas', icon: ChatBubbleLeftRightIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                currentView === item.id 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
           <button 
            onClick={() => setIsSupportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-full text-sm font-medium transition-colors"
          >
            <HeartIcon className="w-4 h-4" />
            Apoiar
          </button>
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="md:hidden flex items-center gap-3">
          <button 
            onClick={() => setIsSupportOpen(true)}
            className="p-2 text-pink-600 bg-pink-50 rounded-full hover:bg-pink-100 transition-colors"
            aria-label="Apoiar"
          >
            <HeartIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
      </div>
      
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-16 right-4 z-50 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-2 flex flex-col gap-1 animate-slide-up origin-top-right transform transition-all duration-200">
            {[
              { id: AppView.HOME, label: 'Início', icon: Squares2X2Icon },
              { id: AppView.STUDY_MENU, label: 'Estudar', icon: BookOpenIcon },
              { id: AppView.HISTORY, label: 'Histórico', icon: ChartBarIcon },
              { id: AppView.INFO_MENU, label: 'Informações', icon: InfoIcon },
              { id: AppView.FAQ_MENU, label: 'Perguntas', icon: ChatBubbleLeftRightIcon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full px-4 py-3 text-left rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                  currentView === item.id 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${currentView === item.id ? 'bg-indigo-200/50' : 'bg-gray-100'}`}>
                   <item.icon className="w-4 h-4" />
                </div>
                {item.label}
              </button>
            ))}
            <div className="h-px bg-gray-100 my-1"></div>
            <div className="px-4 py-2 text-xs text-gray-400 text-center">
              v2.3.1 • Nelberto Gonçalves
            </div>
          </div>
        </>
      )}
    </header>
  );

  const renderSupportModal = () => {
    if (!isSupportOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative animate-slide-up">
          <button 
            onClick={() => setIsSupportOpen(false)}
            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-8 text-center text-white">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <HeartIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Apoie este Projeto</h2>
            <p className="text-pink-100 text-sm leading-relaxed">
              Este simulador é desenvolvido e mantido com dedicação para ajudar a comunidade TVDE. O seu apoio ajuda a cobrir os custos de servidor e desenvolvimento.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-100 rounded-2xl transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                  <GiftIcon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">Doar via MB WAY</div>
                  <div className="text-xs text-gray-500">Rápido e seguro</div>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 rounded-2xl transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                  <CreditCardIcon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">PayPal / Cartão</div>
                  <div className="text-xs text-gray-500">Internacional</div>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-blue-400" />
            </button>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-white text-xs text-gray-500 uppercase">Ou ajude divulgando</span>
                </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 p-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
               <ShareIcon className="w-5 h-5" />
               Partilhar com amigos
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderExam = () => {
    if (questions.length === 0) return <div>A carregar exame...</div>;
    
    const q = questions[currentQuestionIndex];
    const isAnswered = !!answers[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    // Real-time stats calculation for the header
    const totalAnswered = Object.keys(answers).length;
    const correctCount = Object.keys(answers).reduce((acc, idx) => {
        const qIndex = parseInt(idx);
        return answers[qIndex] === questions[qIndex].correct ? acc + 1 : acc;
    }, 0);
    const wrongCount = totalAnswered - correctCount;

    return (
      <div className="max-w-3xl mx-auto pb-24 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center justify-between sticky top-20 z-30">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                {currentQuestionIndex + 1}
             </div>
             <div className="text-sm text-gray-500">de {questions.length}</div>
          </div>

          {/* Real-time Stats Badge */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-1.5 text-green-600 font-bold" title="Respostas Corretas">
                 <CheckCircleIcon className="w-5 h-5" />
                 <span>{correctCount}</span>
              </div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div className="flex items-center gap-1.5 text-red-600 font-bold" title="Respostas Incorretas">
                 <XCircleIcon className="w-5 h-5" />
                 <span>{wrongCount}</span>
              </div>
          </div>

          <QuizTimer secondsLeft={timeLeft} setSecondsLeft={setTimeLeft} onTimeUp={() => finishExam(true)} />
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-10">
              <div className="flex items-center justify-between mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide">
                  {q.category}
                </span>
                <button 
                  onClick={() => speakQuestion(q.question, q.options)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <SpeakerWaveIcon className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-relaxed mb-8">
                {q.question}
              </h3>
            
            <div className="space-y-3">
              {q.options.map((opt: string, idx: number) => {
                const selectedAnswer = answers[currentQuestionIndex];
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === q.correct;
                
                let btnClass = 'border-gray-100 hover:bg-gray-50';
                let iconClass = 'bg-white border-gray-300 text-gray-500';
                let textClass = 'text-gray-700';

                if (isAnswered) {
                  if (isCorrect) {
                    // Correct answer always green
                    btnClass = 'border-green-500 bg-green-50';
                    iconClass = 'bg-green-500 border-green-500 text-white';
                    textClass = 'text-green-800 font-semibold';
                  } else if (isSelected && !isCorrect) {
                    // Selected wrong answer red
                    btnClass = 'border-red-500 bg-red-50';
                    iconClass = 'bg-red-500 border-red-500 text-white';
                    textClass = 'text-red-800 font-semibold';
                  } else {
                    btnClass = 'border-gray-100 opacity-50';
                  }
                } else {
                  btnClass = 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(opt)}
                    disabled={isAnswered}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 group ${btnClass}`}
                  >
                    <div className={`w-6 h-6 mt-0.5 rounded-full flex items-center justify-center text-xs font-bold border transition-colors shrink-0 ${iconClass}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={`text-base ${textClass}`}>
                      {opt}
                    </span>
                    {isAnswered && isCorrect && <CheckCircleIcon className="w-6 h-6 text-green-600 ml-auto" />}
                    {isAnswered && isSelected && !isCorrect && <XCircleIcon className="w-6 h-6 text-red-600 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-6 border-t border-gray-100 flex justify-between items-center">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentQuestionIndex === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <ChevronLeftIcon className="w-4 h-4" /> Anterior
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleFinishExamClick}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                Finalizar Prova <CheckCircleIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={nextQuestion}
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

  const renderResults = () => {
    if (!lastResult) return null;
    const percentage = Math.round((lastResult.score / lastResult.total) * 100);
    
    return (
      <div className="max-w-3xl mx-auto text-center animate-slide-up pb-10">
        <div className={`inline-block p-4 rounded-full mb-6 ${lastResult.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
           {lastResult.passed ? <CheckCircleIcon className="w-16 h-16" /> : <XCircleIcon className="w-16 h-16" />}
        </div>
        
        <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
          {lastResult.passed ? 'Parabéns! Aprovado' : 'Não foi desta vez'}
        </h2>
        <p className="text-gray-500 mb-8">
          {lastResult.passed 
            ? `Excelente desempenho, ${lastResult.userName}! Você dominou o conteúdo.` 
            : `Continue a estudar, ${lastResult.userName}. A prática leva à perfeição.`}
        </p>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="p-8">
             <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 mb-8">
                <div className="text-center">
                  <div className="text-5xl font-black text-gray-900 mb-1">{lastResult.score}<span className="text-2xl text-gray-400">/{lastResult.total}</span></div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pontuação</div>
                </div>
                <div className="w-px h-16 bg-gray-200 hidden sm:block"></div>
                <div className="text-center">
                  <div className={`text-5xl font-black mb-1 ${lastResult.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {percentage}%
                  </div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Percentagem</div>
                </div>
             </div>
             
             <div className="flex flex-col gap-3">
                <button
                  onClick={() => openReview(lastResult, AppView.RESULTS)}
                  className="w-full bg-white border-2 border-indigo-100 hover:border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <EyeIcon className="w-5 h-5" />
                  Rever Respostas Erradas
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                   <button
                    onClick={shareResultByEmail}
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <EnvelopeIcon className="w-5 h-5" />
                    Enviar Email
                  </button>
                  <button
                    onClick={() => handleNavigation(AppView.HISTORY)}
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <HistoryIcon className="w-5 h-5" />
                    Histórico
                  </button>
                </div>
             </div>
          </div>
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
             <button
                onClick={() => handleNavigation(AppView.HOME)}
                className="text-gray-500 hover:text-gray-900 font-medium text-sm"
             >
               Voltar ao Menu Principal
             </button>
          </div>
        </div>
        
        <button
          onClick={startExam}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
        >
          <PlayIcon className="w-6 h-6" />
          Realizar Novo Teste
        </button>
      </div>
    );
  };

  const renderStudyMenu = () => {
    const categories: string[] = Array.from(new Set(MOCK_QUESTIONS.map(q => q.category || 'Geral')));
    categories.unshift('Todos');

    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
         <div className="text-center mb-10">
           <h2 className="text-3xl font-bold text-gray-900 mb-2">Modo de Estudo</h2>
           <p className="text-gray-500">Escolha um tema específico para praticar sem pressão de tempo.</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => startStudySession(cat)}
                className="bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 p-6 rounded-2xl text-left transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                     {cat === 'Todos' ? <Squares2X2Icon className="w-6 h-6" /> : <BookOpenIcon className="w-6 h-6" />}
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                    {cat === 'Todos' ? MOCK_QUESTIONS.length : MOCK_QUESTIONS.filter(q => q.category === cat).length} Q
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700">{cat}</h3>
              </button>
            ))}
         </div>
      </div>
    );
  };

  const renderStudySession = () => {
    if (studyQuestions.length === 0) return null;
    const q = studyQuestions[currentStudyIndex];
    const isAnswered = studyAnswer !== null;
    const isCorrect = studyAnswer === q.correct;

    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => handleNavigation(AppView.STUDY_MENU)} className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
             <ChevronLeftIcon className="w-4 h-4" /> Voltar
          </button>
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
             {studyCategory} • {currentStudyIndex + 1}/{studyQuestions.length}
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden p-8 mb-6">
           <h3 className="text-xl font-bold text-gray-900 mb-6">{q.question}</h3>
           
           <div className="space-y-3">
             {q.options.map((opt: string, idx: number) => {
               const isSelected = studyAnswer === opt;
               const isRight = opt === q.correct;
               
               let btnClass = 'border-gray-100 hover:bg-gray-50';
               let iconClass = 'bg-gray-100 text-gray-500';
               
               if (isAnswered) {
                 if (isRight) {
                   btnClass = 'border-green-200 bg-green-50';
                   iconClass = 'bg-green-500 text-white';
                 } else if (isSelected) {
                   btnClass = 'border-red-200 bg-red-50';
                   iconClass = 'bg-red-500 text-white';
                 } else {
                    btnClass = 'border-gray-100 opacity-50';
                 }
               }

               return (
                 <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleStudyAnswer(opt)}
                  className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${btnClass}`}
                 >
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${iconClass}`}>
                     {String.fromCharCode(65 + idx)}
                   </div>
                   <div className="flex-1">
                      <span className={`text-base ${isSelected || (isAnswered && isRight) ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {opt}
                      </span>
                   </div>
                   {isAnswered && isRight && <CheckCircleIcon className="w-6 h-6 text-green-500" />}
                   {isAnswered && isSelected && !isRight && <XCircleIcon className="w-6 h-6 text-red-500" />}
                 </button>
               );
             })}
           </div>

           {isAnswered && (
             <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 animate-fade-in ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {isCorrect ? <CheckCircleIcon className="w-5 h-5 mt-0.5" /> : <LightBulbIcon className="w-5 h-5 mt-0.5" />}
                <div>
                  <p className="font-bold">{isCorrect ? 'Correto!' : 'Incorreto'}</p>
                  <p className="text-sm mt-1">A resposta correta é: <span className="font-bold">{q.correct}</span></p>
                </div>
             </div>
           )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={nextStudyQuestion}
            disabled={!isAnswered}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              isAnswered 
               ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700' 
               : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {currentStudyIndex < studyQuestions.length - 1 ? 'Próxima' : 'Concluir'} <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
               <div className="bg-indigo-600 p-1.5 rounded-lg">
                 <Squares2X2Icon className="w-5 h-5 text-white" />
               </div>
               <span className="text-xl font-bold text-white">Simulador TVDE Pro</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              A ferramenta mais completa para a preparação de motoristas TVDE em Portugal. Baseado na Lei 45/2018 e atualizado para 2025.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => handleNavigation(AppView.HOME)} className="hover:text-white transition-colors">Início</button></li>
              <li><button onClick={() => handleNavigation(AppView.STUDY_MENU)} className="hover:text-white transition-colors">Estudar</button></li>
              <li><button onClick={() => handleNavigation(AppView.FAQ_MENU)} className="hover:text-white transition-colors">Perguntas Frequentes</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => setIsSupportOpen(true)} className="hover:text-pink-400 transition-colors flex items-center gap-2">
                  <HeartIcon className="w-4 h-4" /> Apoiar Projeto
                </button>
              </li>
              <li>
                <a href="mailto:suporte@tvdepro.pt" className="hover:text-white transition-colors flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4" /> suporte@tvdepro.pt
                </a>
              </li>
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Política de Privacidade</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-xs text-slate-500">© 2025 Simulador TVDE Pro. Todos os direitos reservados.</p>
            <p className="text-xs text-indigo-400 mt-1 font-medium">Designer by Nelberto Gonçalves</p>
          </div>
          
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-sm transition-colors"
          >
            <ArrowUpIcon className="w-4 h-4" />
            Voltar ao topo
          </button>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      {showConfetti && <Confetti />}
      {renderHeader()}
      {renderSupportModal()}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === AppView.HOME && (
          <HomeView 
             onSelectCategory={(cat) => startExam()} // Simplified for legacy compatibility
             onOpenSupport={() => setIsSupportOpen(true)}
          />
        )}
        {currentView === AppView.EXAM && renderExam()}
        {currentView === AppView.RESULTS && renderResults()}
        {currentView === AppView.STUDY_MENU && renderStudyMenu()}
        {currentView === AppView.STUDY_SESSION && renderStudySession()}
        {currentView === AppView.HISTORY && (
          <div className="max-w-4xl mx-auto animate-fade-in">
             <h2 className="text-3xl font-bold mb-8">Histórico de Exames</h2>
             {history.length === 0 ? (
               <div className="text-center py-12 bg-white rounded-3xl border border-gray-200">
                 <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                   <HistoryIcon className="w-8 h-8 text-gray-400" />
                 </div>
                 <p className="text-gray-500">Ainda não realizou nenhum exame.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {history.map((result) => (
                   <div key={result.id} onClick={() => openReview(result, AppView.HISTORY)} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-center gap-4 group">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`p-3 rounded-full ${result.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {result.passed ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{new Date(result.date).toLocaleDateString()} <span className="text-xs font-normal text-gray-400">{new Date(result.date).toLocaleTimeString()}</span></div>
                          <div className="text-sm text-gray-500">{result.userName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{result.score}<span className="text-sm text-gray-400">/{result.total}</span></div>
                          <div className={`text-xs font-bold uppercase ${result.passed ? 'text-green-600' : 'text-red-600'}`}>{result.passed ? 'Aprovado' : 'Reprovado'}</div>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-600" />
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
        {currentView === AppView.REVIEW && reviewData && (
          <div className="max-w-3xl mx-auto animate-fade-in">
             <button onClick={() => setCurrentView(returnView)} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
               <ChevronLeftIcon className="w-5 h-5" /> Voltar
             </button>
             <h2 className="text-2xl font-bold mb-6">Revisão de Erros</h2>
             
             {reviewData.mistakes.length === 0 ? (
               <div className="bg-green-50 p-8 rounded-2xl text-center text-green-800 border border-green-100">
                 <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
                 <h3 className="text-xl font-bold mb-2">Perfeito!</h3>
                 <p>Não errou nenhuma pergunta neste exame.</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {reviewData.mistakes.map((mistake, idx) => (
                   <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                      <div className="ml-2">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">{mistake.question.category}</span>
                         <h3 className="font-bold text-lg text-gray-900 mb-4">{mistake.question.question}</h3>
                         
                         <div className="space-y-2">
                           <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                             <span className="text-xs text-red-500 font-bold block mb-1">A sua resposta (Incorreta):</span>
                             <div className="flex items-center gap-2 text-red-900">
                               <XCircleIcon className="w-5 h-5 shrink-0" />
                               {mistake.selectedAnswer}
                             </div>
                           </div>
                           
                           <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                             <span className="text-xs text-green-600 font-bold block mb-1">Resposta Correta:</span>
                             <div className="flex items-center gap-2 text-green-900">
                               <CheckCircleIcon className="w-5 h-5 shrink-0" />
                               {mistake.question.correct}
                             </div>
                           </div>
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
        {currentView === AppView.INFO_MENU && (
           <div className="max-w-4xl mx-auto animate-fade-in">
             <h2 className="text-3xl font-bold mb-8">Módulos Informativos</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {INFO_MODULES.map(module => (
                   <div 
                     key={module.id}
                     onClick={() => {
                       setSelectedInfoModule(module);
                       setCurrentView(AppView.INFO_DETAIL);
                     }}
                     className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg cursor-pointer transition-all group"
                   >
                     <div className="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        {module.icon === 'BookOpenIcon' && <BookOpenIcon className="w-6 h-6" />}
                        {module.icon === 'UserIcon' && <UserIcon className="w-6 h-6" />}
                        {module.icon === 'InfoIcon' && <InfoIcon className="w-6 h-6" />}
                        {module.icon === 'LightBulbIcon' && <LightBulbIcon className="w-6 h-6" />}
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-700">{module.title}</h3>
                     <p className="text-gray-500 text-sm">{module.description}</p>
                   </div>
                ))}
             </div>
           </div>
        )}
        {currentView === AppView.INFO_DETAIL && selectedInfoModule && (
          <div className="max-w-3xl mx-auto animate-fade-in">
             <button onClick={() => setCurrentView(AppView.INFO_MENU)} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900">
               <ChevronLeftIcon className="w-5 h-5" /> Voltar aos Módulos
             </button>
             
             <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-indigo-600 p-8 text-white">
                  <h2 className="text-3xl font-bold">{selectedInfoModule.title}</h2>
                  <p className="text-indigo-100 mt-2">{selectedInfoModule.description}</p>
                </div>
                <div className="p-8 space-y-8">
                   {selectedInfoModule.content.map((section, idx) => (
                     <div key={idx} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          {section.title}
                        </h3>
                        <ul className="space-y-3">
                          {section.text.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-700">
                               <CheckCircleIcon className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                               <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}
        {currentView === AppView.FAQ_MENU && (
          <FAQView onBack={() => setCurrentView(AppView.HOME)} />
        )}
      </main>

      {renderFooter()}
    </div>
  );
};

export default App;
