import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppView, Question, ExamResult, AnswerRecord, EXAM_CONFIG, InfoModule, FAQ } from './types';
import { MOCK_QUESTIONS, INFO_MODULES, TVDE_FAQS } from './constants';
import { generateExam, saveExamResult, getExamHistory } from './services/examService';
import QuizTimer from './components/QuizTimer';
import Confetti from './components/Confetti';
import { 
  ClockIcon, CheckCircleIcon, XCircleIcon, HistoryIcon, PlayIcon, ChevronRightIcon, 
  UserIcon, EyeIcon, BookOpenIcon, InfoIcon, ChevronLeftIcon, LightBulbIcon,
  ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon,
  ArrowUpIcon, EnvelopeIcon, Squares2X2Icon, ChartBarIcon, SpeakerWaveIcon,
  PaperAirplaneIcon, HeartIcon, GiftIcon, CreditCardIcon, 
  ShareIcon, Bars3Icon, XMarkIcon
} from './components/Icons';

// Declaração para o TypeScript reconhecer process.env
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};

// Custom Lock Icon for the disabled state
const LockClosedIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const StatCard = ({ label, value, subtext, color = "indigo", live = false }: { label: string, value: string, subtext: string, color?: string, live?: boolean }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col items-center justify-center text-center transform transition hover:scale-105 duration-200 relative overflow-hidden`}>
    {live && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5" title="Em tempo real">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
    )}
    <span className={`text-3xl font-bold mb-1 text-${color}-600`}>{value}</span>
    <span className="text-sm font-semibold text-gray-900">{label}</span>
    <span className="text-xs text-gray-500 mt-1">{subtext}</span>
  </div>
);

// Level System Logic
const LEVELS = [
  { name: 'Motorista Novato', minXP: 0, color: 'gray' },
  { name: 'Aspirante', minXP: 100, color: 'blue' }, // ~4 exams passed
  { name: 'Profissional', minXP: 500, color: 'indigo' },
  { name: 'Especialista', minXP: 1500, color: 'purple' },
  { name: 'Elite TVDE', minXP: 3000, color: 'yellow' },
  { name: 'Lenda da Estrada', minXP: 5000, color: 'emerald' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [questions, setQuestions] = useState<Question[]>([]);
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
  const [studyQuestions, setStudyQuestions] = useState<Question[]>([]);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [studyAnswer, setStudyAnswer] = useState<string | null>(null);

  // States for Info Mode
  const [selectedInfoModule, setSelectedInfoModule] = useState<InfoModule | null>(null);

  // States for FAQ Mode and AI
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [dynamicFAQs, setDynamicFAQs] = useState<FAQ[]>([]);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // Connectivity State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Support Modal State
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Gamification State
  const [userXP, setUserXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(LEVELS[0]);
  const [nextLevel, setNextLevel] = useState(LEVELS[1]);

  // Community Stats (Calculated dynamically)
  const [communityStats, setCommunityStats] = useState({
    totalExams: 0,
    activeUsers: 0
  });

  useEffect(() => {


      // Sincronização em Tempo Real entre Separadores
    const handleStorageChange = (event: StorageEvent) => {

      // 1. Se outra aba atualizou as estatísticas globais (contagem de testes)
      if (event.key === 'tvde_global_stats' && event.newValue) {
        setGlobalStats(JSON.parse(event.newValue));
      }

      // 2. Se outra aba guardou um novo histórico de exame
      if (event.key === 'tvde_exam_history_v2') {
         const newHistory = getExamHistory();
         setHistory(newHistory);
         calculateAnalytics(newHistory);
      }
    };

    // Adicionar os ouvintes de eventos do navegador
    window.addEventListener('storage', handleStorageChange);

    // (Opcional) Detetar se a internet caiu ou voltou
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Limpeza: remover ouvintes quando a app fecha para não dar erro
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };

// Atualizar estatísticas locais e "avisar" as outras abas via localStorage
    setGlobalStats(prev => {
      const newStats = {
        totalExams: prev.totalExams + 1,
        passed: result.passed ? prev.passed + 1 : prev.passed,
        failed: !result.passed ? prev.failed + 1 : prev.failed
      };

      // ESTA LINHA é que faz a magia acontecer nas outras abas:
      localStorage.setItem('tvde_global_stats', JSON.stringify(newStats));

      return newStats;
    });


    // 1. Load Local History
    const loadHistory = getExamHistory();
    setHistory(loadHistory);
    calculateGamification(loadHistory);
    
    const storedFAQs = localStorage.getItem('tvde_dynamic_faqs');
    if (storedFAQs) {
      setDynamicFAQs(JSON.parse(storedFAQs));
    }

    const storedName = localStorage.getItem('tvde_username');
    if (storedName) setUserName(storedName);

    // 2. Lógica de Estatísticas da Comunidade "Live"
    const calculateBaseStats = () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60)); 
      
      // Base consistente entre dispositivos (depende da hora do ano)
      const baseTotal = 2500 + (diffHours * 12);
      
      // Base de utilizadores depende da hora do dia
      const currentHour = now.getHours();
      const isDayTime = currentHour >= 8 && currentHour <= 23;
      const baseUsers = isDayTime ? 340 : 115;

      return { total: baseTotal, users: baseUsers };
    };

    const base = calculateBaseStats();
    setCommunityStats({
      totalExams: base.total,
      activeUsers: base.users
    });

    // Intervalo "Heartbeat" para simular atividade em tempo real
    const heartbeat = setInterval(() => {
       setCommunityStats(prev => {
         // 40% de chance de adicionar um novo exame a cada 3 segundos
         const newExam = Math.random() > 0.6 ? 1 : 0;
         
         // Pequena flutuação nos usuários online (-2 a +3)
         const userFlux = Math.floor(Math.random() * 6) - 2;
         
         return {
           totalExams: prev.totalExams + newExam,
           activeUsers: Math.max(50, prev.activeUsers + userFlux)
         };
       });
    }, 3000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(heartbeat);
    };
  }, []);

  const calculateGamification = (hist: ExamResult[]) => {
    // XP Logic: 1 point per correct answer (approx). 
    // Bonus: 50 XP for passing an exam.
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

  // --- EXAM MODE LOGIC (OFICIAL) ---
  const startExam = () => {
    if (!userName.trim()) {
      alert("Por favor, introduza o seu nome para iniciar o teste.");
      return;
    }
    localStorage.setItem('tvde_username', userName);
    const newQuestions = generateExam();
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(EXAM_CONFIG.DURATION_MINUTES * 60);
    setCurrentView(AppView.EXAM);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswerSelect = (option: string) => {
    // No modo exame, permitimos mudar a resposta enquanto estiver na pergunta
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
    const total = questions.length;
    const remaining = total - answeredCount;

    if (remaining > 0) {
      if (window.confirm(`ATENÇÃO: Ainda tem ${remaining} pergunta(s) por responder.\n\nSe finalizar agora, estas contarão como ERRADAS.\n\nDeseja mesmo entregar a prova?`)) {
        finishExam(false);
      }
    } else {
      if (window.confirm("Tem a certeza que pretende entregar a prova e ver o resultado?")) {
        finishExam(false);
      }
    }
  };

  const finishExam = useCallback((isTimeout: boolean) => {
    try {
      let score = 0;
      const mistakes: AnswerRecord[] = [];

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

      const safeId = `exam-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const passed = score >= EXAM_CONFIG.PASS_SCORE && !isTimeout;

      const result: ExamResult = {
        id: safeId,
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
      calculateGamification(updatedHistory); // Update XP

      // Não precisamos atualizar stats globais no localStorage pois agora usamos o sistema determinístico
      
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

  // --- STUDY MODE LOGIC (TREINO) ---
  
  const startGeneralStudy = () => {
     const newQuestions = generateExam();
     setStudyCategory("Simulado Geral");
     setStudyQuestions(newQuestions);
     setCurrentStudyIndex(0);
     setStudyAnswer(null);
     setCurrentView(AppView.STUDY_SESSION);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    if (studyAnswer) return; // Impede mudar a resposta no modo estudo (feedback imediato)
    setStudyAnswer(option);
  };

  const nextStudyQuestion = () => {
    if (currentStudyIndex < studyQuestions.length - 1) {
      setCurrentStudyIndex(prev => prev + 1);
      setStudyAnswer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if(window.confirm("Terminou todas as perguntas deste treino! Voltar ao menu?")) {
          setCurrentView(AppView.STUDY_MENU);
      }
    }
  };

  const handleNavigation = (targetView: AppView) => {
    setIsMobileMenuOpen(false);

    if (currentView === AppView.EXAM) {
      if (window.confirm("Atenção: Ao sair do exame, o seu progresso será perdido. Deseja continuar?")) {
        setCurrentView(targetView);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    } 
    
    if (currentView === AppView.STUDY_SESSION) {
      if (currentStudyIndex === 0 && !studyAnswer) {
         setCurrentView(targetView);
         window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
         if (window.confirm("Deseja encerrar a sessão de estudo atual?")) {
            setCurrentView(targetView);
            window.scrollTo({ top: 0, behavior: 'smooth' });
         }
      }
      return;
    }

    setCurrentView(targetView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuitSession = (force: boolean = false) => {
    if (force || (currentStudyIndex === 0 && !studyAnswer)) {
        setCurrentView(AppView.STUDY_MENU);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    if (window.confirm("Deseja sair do modo de estudo? O progresso desta sessão será perdido.")) {
      setCurrentView(AppView.STUDY_MENU);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAskAI = async () => {
    if (!isOnline) {
      alert("Esta funcionalidade requer ligação à Internet.");
      return;
    }

    if (!process.env.API_KEY) {
       alert("A chave de API (API_KEY) não está configurada. Por favor configure-a nas definições do projeto na Vercel.");
       return;
    }
    
    if (!faqSearch.trim()) return;
    setIsAskingAI(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
      Atue EXCLUSIVAMENTE como um formador profissional e especialista em TVDE (Transporte Individual e Remunerado de Passageiros) em Portugal.
      O seu objetivo é esclarecer dúvidas de motoristas ou formandos.
      O seu âmbito de resposta limita-se estritamente a:
      1. Legislação TVDE (Lei 45/2018) e regulamentação do IMT.
      2. Código da Estrada Português e Segurança Rodoviária.
      3. Mecânica automóvel básica.
      4. Primeiros Socorros (PAS, SBV).
      5. Atendimento ao cliente e boas práticas.
      6. Inglês técnico para motoristas.
      7. Geografia de Portugal e turismo.

      INSTRUÇÃO DE SEGURANÇA:
      Se a pergunta NÃO for sobre estes temas, RECUSE responder e diga apenas:
      "Como assistente virtual do Simulador TVDE, apenas posso responder a questões relacionadas com a atividade de motorista, legislação e segurança rodoviária."

      Pergunta do utilizador: "${faqSearch}"`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const answer = response.text || "Não foi possível obter uma resposta neste momento.";
      
      const newFAQ: FAQ = {
        id: `ai-${Date.now()}`,
        category: 'Geral', 
        question: faqSearch,
        answer: answer
      };
      
      const updatedFAQs = [newFAQ, ...dynamicFAQs];
      setDynamicFAQs(updatedFAQs);
      localStorage.setItem('tvde_dynamic_faqs', JSON.stringify(updatedFAQs));
      
      setFaqSearch('');
      setExpandedFAQ(newFAQ.id);
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o Assistente IA. Verifique a sua chave de API ou a sua internet.");
    } finally {
      setIsAskingAI(false);
    }
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
            { id: AppView.STUDY_MENU, label: 'Modo Estudo', icon: BookOpenIcon },
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
              { id: AppView.STUDY_MENU, label: 'Modo Estudo', icon: BookOpenIcon },
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
              v1.1.0 • Nelberto Gonçalves
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

  const renderHome = () => {
    const xpProgress = Math.min(100, ((userXP - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100);

    return (
      <div className="space-y-8 animate-fade-in pb-10">
        <div className="text-center max-w-4xl mx-auto pt-4 px-4">
          
          {/* GAMIFICATION HEADER */}
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-indigo-50 mb-8 transform transition hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`bg-${currentLevel.color}-100 text-${currentLevel.color}-600 p-3 rounded-2xl`}>
                  <SparklesIcon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">O seu Nível (Local)</div>
                  <div className="text-xl font-bold text-gray-900">{currentLevel.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-indigo-600">{userXP} <span className="text-sm text-gray-400 font-medium">XP</span></div>
              </div>
            </div>
            
            <div className="relative pt-2">
              <div className="flex mb-2 items-center justify-between">
                <div className="text-xs font-semibold text-gray-500 py-1 px-2 bg-gray-100 rounded-lg">Nível Atual</div>
                <div className="text-xs font-semibold text-gray-500 py-1 px-2 bg-gray-100 rounded-lg">Próximo: {nextLevel.name}</div>
              </div>
              <div className="overflow-hidden h-3 mb-1 text-xs flex rounded-full bg-gray-100">
                <div style={{ width: `${xpProgress}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-${currentLevel.color}-400 to-${currentLevel.color}-600 transition-all duration-1000`}></div>
              </div>
              <div className="text-xs text-center text-gray-400 mt-1">
                Faltam {nextLevel.minXP - userXP} XP para subir de nível
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4 animate-slide-up">
            <SparklesIcon className="w-4 h-4" />
            <span>Atualizado para 2025 • Lei 45/2018</span>
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4 sm:text-5xl">
            Prepare-se para o <span className="text-indigo-600">Exame TVDE</span>
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Escolha o seu modo de preparação. Treine com feedback imediato ou simule o exame oficial.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            <StatCard 
              label="Exames Totais" 
              value={communityStats.totalExams.toLocaleString()} 
              subtext="Atualizado em tempo real" 
              color="blue"
              live={true}
            />
            <StatCard 
              label="Usuários Online" 
              value={communityStats.activeUsers.toLocaleString()} 
              subtext="Agora mesmo" 
              color="green"
              live={true}
            />
            <StatCard 
              label="Questões Ativas" 
              value="300+" 
              subtext="Banco oficial IMT" 
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* MODO EXAME CARD */}
              <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-indigo-100 hover:border-indigo-500 transition-all group flex flex-col">
                  <div className="flex items-center justify-center mb-6">
                     <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <PlayIcon className="w-8 h-8" />
                     </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Modo Exame (Oficial)</h3>
                  <ul className="text-left text-sm text-gray-600 space-y-2 mb-6 bg-gray-50 p-4 rounded-xl">
                     <li className="flex items-center gap-2"><ClockIcon className="w-4 h-4" /> Cronómetro (60 min)</li>
                     <li className="flex items-center gap-2"><Squares2X2Icon className="w-4 h-4" /> 30 Perguntas Reais</li>
                     <li className="flex items-center gap-2"><EyeIcon className="w-4 h-4" /> Sem ajudas (Resultado no fim)</li>
                  </ul>
                  <div className="mt-auto space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-left ml-1">Nome do Candidato</label>
                      <input
                          type="text"
                          className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Insira o seu nome"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                        />
                    </div>
                    <button
                      onClick={startExam}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                      Iniciar Exame <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
              </div>

              {/* MODO ESTUDO CARD */}
              <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-teal-100 hover:border-teal-500 transition-all group flex flex-col">
                  <div className="flex items-center justify-center mb-6">
                     <div className="bg-teal-100 text-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BookOpenIcon className="w-8 h-8" />
                     </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Modo Estudo / Testes</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Ideal para aprender. Veja a resposta correta imediatamente e entenda os erros.
                  </p>
                  <ul className="text-left text-sm text-gray-600 space-y-2 mb-6 bg-gray-50 p-4 rounded-xl">
                     <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-green-500" /> Feedback Imediato (Certo/Errado)</li>
                     <li className="flex items-center gap-2"><LightBulbIcon className="w-4 h-4 text-yellow-500" /> Explicação das respostas</li>
                     <li className="flex items-center gap-2"><ArrowUpIcon className="w-4 h-4" /> Sem pressão de tempo</li>
                  </ul>
                  <div className="mt-auto">
                    <button
                      onClick={() => handleNavigation(AppView.STUDY_MENU)}
                      className="w-full bg-white border-2 border-teal-500 text-teal-700 hover:bg-teal-50 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      Ir para Modo Estudo <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
              </div>
          </div>

          <div className="flex justify-center mt-8">
              <button 
                onClick={() => handleNavigation(AppView.HISTORY)}
                className="text-gray-500 hover:text-indigo-600 font-medium flex items-center gap-2 transition-colors"
              >
                <HistoryIcon className="w-5 h-5" />
                Ver meu histórico de exames (Local)
              </button>
          </div>
        </div>
      </div>
    );
  };

  const renderExam = () => {
    if (questions.length === 0) return <div>A carregar exame...</div>;
    
    const q = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const isAnswered = !!answers[currentQuestionIndex];

    return (
      <div className="max-w-3xl mx-auto pb-24 animate-fade-in">
        {/* Header Card with Timer and Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center justify-between sticky top-20 z-30">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                {currentQuestionIndex + 1}
             </div>
             <div className="text-sm text-gray-500">de {questions.length}</div>
          </div>

          <div className="px-3 py-1.5 bg-gray-100 rounded-xl border border-gray-200 text-xs font-bold uppercase text-gray-600 flex items-center gap-2">
              <Squares2X2Icon className="w-4 h-4" />
              Modo Exame
          </div>

          <QuizTimer secondsLeft={timeLeft} setSecondsLeft={setTimeLeft} onTimeUp={() => finishExam(true)} />
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-10">
              {/* Category & Audio */}
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

              {/* Question Image Support */}
              {q.imageUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex justify-center">
                   <img src={q.imageUrl} alt="Imagem da questão" className="max-h-64 object-contain" />
                </div>
              )}

              {/* Question */}
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-relaxed mb-8">
                {q.question}
              </h3>
            
            {/* Options */}
            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const selectedAnswer = answers[currentQuestionIndex];
                const isSelected = selectedAnswer === opt;
                
                let btnClass = 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer hover:shadow-sm';
                let iconClass = 'bg-white border-gray-300 text-gray-500';
                let textClass = 'text-gray-700';

                if (isSelected) {
                    btnClass = 'border-indigo-600 bg-indigo-50 shadow-md';
                    iconClass = 'bg-indigo-600 border-indigo-600 text-white';
                    textClass = 'text-indigo-900 font-bold';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(opt)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 group ${btnClass}`}
                  >
                    <div className={`w-6 h-6 mt-0.5 rounded-full flex items-center justify-center text-xs font-bold border transition-colors shrink-0 ${iconClass}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={`text-base ${textClass}`}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Action Bar - Navegação Profissional */}
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
                className="px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white hover:-translate-y-0.5 shadow-green-200"
              >
                Finalizar Prova <CheckCircleIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                disabled={!isAnswered} // Bloqueio visual para garantir resposta
                className={`px-6 py-3 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 ${
                   !isAnswered 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg'
                }`}
              >
                {!isAnswered && <LockClosedIcon className="w-4 h-4" />}
                Próxima <ChevronRightIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {!isLastQuestion && (
             <div className="mt-8 text-center">
                <button 
                  onClick={handleFinishExamClick}
                  className="text-red-400 hover:text-red-600 text-sm font-medium underline"
                >
                  Entregar prova agora
                </button>
             </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!lastResult) return null;
    const percentage = Math.round((lastResult.score / lastResult.total) * 100);
    const earnedXP = lastResult.score + (lastResult.passed ? 50 : 0);
    
    return (
      <div className="max-w-3xl mx-auto text-center animate-slide-up pb-10 relative">
        {showConfetti && <Confetti />}
        
        <div className={`inline-block p-4 rounded-full mb-6 ${lastResult.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
           {lastResult.passed ? <CheckCircleIcon className="w-16 h-16" /> : <XCircleIcon className="w-16 h-16" />}
        </div>
        
        <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
          {lastResult.passed ? 'APROVADO!' : 'REPROVADO'}
        </h2>
        <p className="text-gray-500 mb-8">
          {lastResult.passed 
            ? `Parabéns, ${lastResult.userName}! Dominou o conteúdo.` 
            : `Não desanime, ${lastResult.userName}. Reveja os erros e tente novamente.`}
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
             
             {/* XP REWARD BADGE */}
             <div className="mb-8 inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-6 py-2 rounded-full border border-yellow-200 animate-pulse-slow">
                <SparklesIcon className="w-5 h-5 text-yellow-500" />
                <span className="font-bold">+{earnedXP} XP Ganhos!</span>
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
      </div>
    );
  };

  const renderStudyMenu = () => {
    const categories: string[] = Array.from(new Set(MOCK_QUESTIONS.map(q => q.category || 'Geral')));

    return (
      <div className="max-w-4xl mx-auto animate-fade-in pb-10">
         <button 
            onClick={() => handleNavigation(AppView.HOME)} 
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
         >
            <ChevronLeftIcon className="w-5 h-5" /> Voltar ao Início
         </button>

         <div className="text-center mb-10">
           <h2 className="text-3xl font-bold text-gray-900 mb-2">Modo de Estudo</h2>
           <p className="text-gray-500">Treine com feedback imediato. Escolha uma opção:</p>
         </div>
        
         {/* Botão Especial para Teste Geral em Modo Estudo */}
         <button
            onClick={startGeneralStudy}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white p-6 rounded-2xl text-left shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 mb-8 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="bg-white/20 p-3 rounded-xl">
                    <Squares2X2Icon className="w-8 h-8 text-white" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold">Simulado Geral (Modo Treino)</h3>
                    <p className="text-teal-100 text-sm">30 perguntas aleatórias com correção imediata.</p>
                 </div>
              </div>
              <ChevronRightIcon className="w-6 h-6 text-white/70 group-hover:text-white" />
            </div>
         </button>

         <h3 className="text-lg font-bold text-gray-900 mb-4">Ou estude por categoria:</h3>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => startStudySession(cat)}
                className="bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 p-6 rounded-2xl text-left transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                     <BookOpenIcon className="w-6 h-6" />
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                    {MOCK_QUESTIONS.filter(q => q.category === cat).length} Q
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
      <div className="max-w-3xl mx-auto animate-fade-in pb-24">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => handleQuitSession(false)} 
            className="text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
             <ChevronLeftIcon className="w-5 h-5" /> Voltar ao Menu
          </button>
          
          <span className="hidden sm:block bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
             {studyCategory} • {currentStudyIndex + 1}/{studyQuestions.length}
          </span>

          <button 
            onClick={() => handleQuitSession(true)} 
            className="text-gray-400 hover:text-red-600 flex items-center gap-1 font-medium px-3 py-2 hover:bg-red-50 rounded-lg transition-colors" 
            title="Sair Imediatamente"
          >
             <span className="text-sm hidden sm:inline">Sair</span> <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="sm:hidden text-center mb-4">
           <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
             {studyCategory} • {currentStudyIndex + 1}/{studyQuestions.length}
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden p-8 mb-6 relative">
           {/* Indicador de Estudo */}
           <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
              MODO TREINO
           </div>

           {/* Image Support */}
           {q.imageUrl && (
              <div className="mb-6 mt-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex justify-center">
                 <img src={q.imageUrl} alt="Imagem da questão" className="max-h-64 object-contain" />
              </div>
           )}

           <h3 className="text-xl font-bold text-gray-900 mb-6 mt-2">{q.question}</h3>
           
           <div className="space-y-3">
             {q.options.map((opt, idx) => {
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
               ? 'bg-teal-600 text-white shadow-lg hover:bg-teal-700' 
               : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {currentStudyIndex < studyQuestions.length - 1 ? 'Próxima Pergunta' : 'Concluir Treino'} <ChevronRightIcon className="w-5 h-5" />
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
              <li><button onClick={() => setIsSupportOpen(true)} className="hover:text-pink-400 transition-colors flex items-center gap-2"><HeartIcon className="w-4 h-4" /> Apoiar Projeto</button></li>
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
      {renderHeader()}
      {renderSupportModal()}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === AppView.HOME && renderHome()}
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
                 <p className="text-gray-500">Ainda não realizou nenhum exame neste dispositivo.</p>
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

                         {mistake.question.imageUrl && (
                            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
                              <img src={mistake.question.imageUrl} alt="Contexto visual" className="max-h-40 object-contain mx-auto" />
                            </div>
                         )}
                         
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
          <div className="max-w-3xl mx-auto animate-fade-in">
             <h2 className="text-3xl font-bold mb-2">Perguntas Frequentes</h2>
             <p className="text-gray-500 mb-8">Respostas rápidas sobre a atividade TVDE em Portugal.</p>

             {/* AI Search Box */}
             <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1 rounded-2xl mb-8 shadow-xl">
               <div className="bg-white rounded-xl p-2 flex items-center gap-2">
                  <SparklesIcon className="w-6 h-6 text-purple-500 ml-2 animate-pulse" />
                  <input 
                    type="text" 
                    placeholder="Pergunte à IA (Ex: Posso trabalhar sem empresa?)" 
                    className="flex-1 p-2 outline-none text-gray-700"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  />
                  <button 
                    onClick={handleAskAI}
                    disabled={isAskingAI}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    {isAskingAI ? '...' : <PaperAirplaneIcon className="w-4 h-4" />}
                  </button>
               </div>
             </div>

             <div className="space-y-3">
                {[...dynamicFAQs, ...TVDE_FAQS].map((faq) => (
                   <div key={faq.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all hover:shadow-md">
                      <button 
                        onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                        className="w-full p-4 text-left flex justify-between items-center gap-4 bg-white hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                           <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                             faq.category === 'Legal' ? 'bg-red-100 text-red-700' :
                             faq.category === 'Financeiro' ? 'bg-green-100 text-green-700' :
                             faq.category === 'Operacional' ? 'bg-orange-100 text-orange-700' :
                             'bg-blue-100 text-blue-700'
                           }`}>
                             {faq.category}
                           </span>
                           <span className="font-bold text-gray-900">{faq.question}</span>
                        </div>
                        {expandedFAQ === faq.id ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
                      </button>
                      
                      {expandedFAQ === faq.id && (
                        <div className="p-4 pt-0 text-gray-600 bg-gray-50 border-t border-gray-100 leading-relaxed">
                           <div className="py-2">{faq.answer}</div>
                        </div>
                      )}
                   </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {renderFooter()}
    </div>
  );
};

export default App;