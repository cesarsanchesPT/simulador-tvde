
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StatsProvider, useStats } from './contexts/StatsContext';
import { HomeView } from './views/HomeView';
import { FAQView } from './views/FAQView';
import { AVAILABLE_EXAMS, loadQuestionsForCategory } from './data/examRegistry';
import { ExamCategory, Question, ExamMode, ExamSession, ExamResult, LegacyQuestion } from './types';
import { useExamEngine } from './hooks/useExamEngine';
import QuestionCard from './components/QuestionCard';
import { 
  ChevronLeftIcon, Squares2X2Icon, ChartBarIcon, 
  BookOpenIcon, CheckCircleIcon, XCircleIcon, 
  HeartIcon, GiftIcon, CreditCardIcon, ShareIcon,
  XMarkIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, EyeIcon
} from './components/Icons';

// ---- COMPONENTE DE SUPORTE (Modal) ----
const SupportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative animate-slide-up">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
        >
          <XMarkIcon className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-center text-white">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-inner">
            <HeartIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Suporte Técnico</h2>
          <p className="text-indigo-100 text-sm leading-relaxed opacity-90">
            Precisa de ajuda com a plataforma ou encontrou um erro numa pergunta? Estamos aqui para ajudar.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <a 
            href="mailto:suporte@tvdepro.pt?subject=Suporte%20Técnico%20TVDE%20Pro"
            className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-indigo-200 p-2 rounded-lg text-indigo-700 group-hover:scale-110 transition-transform">
                <EnvelopeIcon className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900">Enviar Email</div>
                <div className="text-xs text-gray-500">suporte@tvdepro.pt</div>
              </div>
            </div>
          </a>

          <div className="relative my-4">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-white text-xs text-gray-500 uppercase">Ou apoie o projeto</span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors">
               <GiftIcon className="w-6 h-6 text-pink-500 mb-1" />
               <span className="text-xs font-bold text-gray-700">MB WAY</span>
            </button>
            <button className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors">
               <ShareIcon className="w-6 h-6 text-blue-500 mb-1" />
               <span className="text-xs font-bold text-gray-700">Partilhar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- VISTA DE EXAME ATIVO ----

const ActiveExamView: React.FC<{ 
  category: ExamCategory; 
  mode: ExamMode; 
  onExit: () => void;
}> = ({ category, mode, onExit }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionResult, setSessionResult] = useState<ExamSession | null>(null);
  const [isReviewing, setIsReviewing] = useState(false); // State for Review Mode
  const [filterWrong, setFilterWrong] = useState(false); // Filter for Review Mode
  const { addResult } = useStats();
  const { user } = useAuth();

  // Load Questions
  React.useEffect(() => {
    const load = async () => {
      const allQuestions = await loadQuestionsForCategory(category.id);
      const shuffled = allQuestions.sort(() => 0.5 - Math.random()).slice(0, category.questionsPerExam);
      setQuestions(shuffled);
      setLoading(false);
    };
    load();
  }, [category]);

  const handleComplete = (session: ExamSession) => {
    const passed = session.score >= category.passScore;
    setSessionResult({ ...session, passed });

    // Save Result to History
    if (mode === 'EXAM') {
        const mistakes = session.questions
            .filter(q => !session.answers[q.id]?.isCorrect)
            .map(q => {
                // Convert to LegacyQuestion format for storage compatibility
                const legacyQ: LegacyQuestion = {
                    id: q.id,
                    question: q.text,
                    options: q.options,
                    correct: q.options[q.correctIndex],
                    category: q.category,
                    imageUrl: q.imageUrl
                };
                return {
                    question: legacyQ,
                    selectedAnswer: q.options[session.answers[q.id]?.selectedOptionIndex] || 'Não respondida',
                    isCorrect: false
                };
            });

        const result: ExamResult = {
            id: session.id,
            userName: user?.name || 'Anónimo',
            date: new Date().toISOString(),
            score: session.score,
            total: session.questions.length,
            passed,
            isTimeout: false, // Assuming engine handles this, but simple boolean here
            mistakes
        };
        
        addResult(result);
    }
  };

  const engine = useExamEngine({
    questions,
    mode,
    categoryId: category.id,
    durationMinutes: category.examDurationMinutes,
    onComplete: handleComplete
  });

  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      <p className="text-gray-500 font-medium animate-pulse">A preparar exame...</p>
    </div>
  );

  if (questions.length === 0) return <div className="p-10 text-center">Erro: Sem perguntas disponíveis. <button onClick={onExit} className="text-indigo-600 font-bold underline ml-2">Voltar</button></div>;

  // TELA DE RESULTADOS
  if (sessionResult) {
    // MODO REVISÃO
    if (isReviewing) {
      const questionsToDisplay = filterWrong 
        ? sessionResult.questions.filter(q => !sessionResult.answers[q.id]?.isCorrect)
        : sessionResult.questions;

      return (
        <div className="max-w-3xl mx-auto p-4 animate-fade-in pt-20 pb-20">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsReviewing(false)} 
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Revisão da Prova</h2>
                  <p className="text-gray-500 text-sm">Analise as respostas detalhadas.</p>
                </div>
             </div>
             
             <button 
               onClick={() => setFilterWrong(!filterWrong)}
               className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center gap-2 ${
                 filterWrong 
                   ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' 
                   : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
               }`}
             >
               {filterWrong ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
               {filterWrong ? 'Mostrar Todas' : 'Filtrar Apenas Erradas'}
             </button>
          </div>

          <div className="space-y-8">
            {questionsToDisplay.length === 0 ? (
               <div className="p-10 text-center bg-green-50 rounded-3xl border border-green-100 text-green-700 animate-fade-in">
                  <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-bold text-xl">Excelente!</p>
                  <p className="opacity-80">Não existem respostas erradas para rever.</p>
                  <button 
                    onClick={() => setFilterWrong(false)}
                    className="mt-4 text-sm font-bold underline hover:text-green-900"
                  >
                    Ver todas as perguntas
                  </button>
               </div>
            ) : (
               questionsToDisplay.map((q, idx) => (
                 <div key={q.id} className="relative">
                   <div className="absolute -left-3 top-8 text-xs font-bold text-gray-300 hidden sm:block">
                     {filterWrong ? '!' : `#${idx + 1}`}
                   </div>
                   <QuestionCard 
                      question={q}
                      mode={mode}
                      answer={sessionResult.answers[q.id]}
                      onSelectOption={() => {}}
                      isReviewing={true}
                   />
                 </div>
               ))
            )}
          </div>
          
          <div className="mt-12 text-center">
             <button 
              onClick={onExit} 
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl hover:-translate-y-1"
            >
              Voltar ao Menu Principal
            </button>
          </div>
        </div>
      );
    }

    // RESUMO FINAL
    return (
      <div className="max-w-2xl mx-auto p-6 text-center animate-slide-up pt-20">
         <div className={`inline-block p-6 rounded-full mb-6 shadow-xl ${sessionResult.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {sessionResult.passed ? <CheckCircleIcon className="w-24 h-24" /> : <XCircleIcon className="w-24 h-24" />}
         </div>
         
         <h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">{sessionResult.passed ? 'APROVADO!' : 'REPROVADO'}</h2>
         <p className="text-gray-500 mb-10 text-lg">
           {sessionResult.passed ? 'Excelente desempenho! Você domina esta matéria.' : 'Não desanime. A prática leva à perfeição.'}
         </p>

         <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 mb-8 flex justify-center gap-12">
            <div className="text-center">
              <div className="text-5xl font-black text-indigo-600">{sessionResult.score}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Certos</div>
            </div>
            <div className="w-px bg-gray-200"></div>
            <div className="text-center">
               <div className="text-5xl font-black text-gray-900">{sessionResult.questions.length}</div>
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Total</div>
            </div>
         </div>
         
         <div className="space-y-3">
           <button 
            onClick={() => {
              setIsReviewing(true);
              setFilterWrong(true); // Default to showing mistakes first
            }}
            className="w-full bg-white border-2 border-indigo-100 hover:border-indigo-600 text-indigo-700 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-indigo-50 group"
           >
            <EyeIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Rever Respostas
           </button>

           <button 
            onClick={onExit} 
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 hover:scale-[1.02] transition-all shadow-xl"
          >
            Voltar ao Dashboard
          </button>
         </div>
      </div>
    );
  }

  // INTERFACE DO EXAME
  return (
    <div className="max-w-4xl mx-auto pb-32 p-4 animate-fade-in">
      {/* Header Flutuante */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 sticky top-4 z-20">
         <div className="flex items-center gap-4">
            <button onClick={onExit} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <div>
              <h2 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{category.title}</h2>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${mode === 'EXAM' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">{mode === 'EXAM' ? 'Exame' : 'Estudo'}</p>
              </div>
            </div>
         </div>
         
         <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-gray-400 font-bold uppercase">Progresso</span>
              <span className="text-sm font-bold text-gray-900">{engine.currentIndex + 1} <span className="text-gray-400">/ {engine.totalQuestions}</span></span>
            </div>
            
            {mode === 'EXAM' && (
              <div className={`px-4 py-2 rounded-xl font-mono font-bold text-lg shadow-inner ${engine.timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                 {Math.floor(engine.timeLeft / 60)}:{String(engine.timeLeft % 60).padStart(2, '0')}
              </div>
            )}
         </div>
      </div>

      <QuestionCard 
        question={engine.currentQuestion} 
        mode={mode}
        answer={engine.answers[engine.currentQuestion.id]}
        onSelectOption={engine.selectAnswer}
      />

      {/* Navegação Inferior Fixa */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
           <button 
             onClick={engine.prevQuestion} 
             disabled={engine.currentIndex === 0}
             className="px-6 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           >
             Anterior
           </button>

           <div className="text-xs font-bold text-gray-300 sm:hidden">
              {engine.currentIndex + 1} / {engine.totalQuestions}
           </div>

           {engine.currentIndex === engine.totalQuestions - 1 ? (
             <button 
               onClick={() => {
                  if(window.confirm("Tem a certeza que pretende finalizar a prova?")) {
                    engine.finishExam();
                  }
               }} 
               className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200 transition-transform hover:-translate-y-0.5"
             >
               Finalizar Prova
             </button>
           ) : (
             <button 
               onClick={engine.nextQuestion}
               className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform hover:-translate-y-0.5"
             >
               Próxima
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

// ---- COMPONENTE PRINCIPAL (ORQUESTRADOR) ----

const AppContent: React.FC = () => {
  const { user, logout, upgradeToPremium } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory | null>(null);
  const [selectedMode, setSelectedMode] = useState<ExamMode | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'HOME' | 'FAQ'>('HOME');

  // Reset Navigation
  const reset = () => {
    setSelectedCategory(null);
    setSelectedMode(null);
    setCurrentView('HOME');
  };

  // RENDER: EXAME ATIVO
  if (selectedCategory && selectedMode) {
    return (
      <ActiveExamView 
        category={selectedCategory} 
        mode={selectedMode} 
        onExit={reset} 
      />
    );
  }

  // RENDER: FAQ
  if (currentView === 'FAQ') {
    return <FAQView onBack={() => setCurrentView('HOME')} />;
  }

  // RENDER: SELEÇÃO DE MODO
  if (selectedCategory) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in pt-20">
        <button onClick={() => setSelectedCategory(null)} className="mb-8 flex items-center gap-2 text-gray-500 font-bold hover:text-indigo-600 transition-colors">
          <ChevronLeftIcon className="w-5 h-5" /> Escolher outra categoria
        </button>
        
        <div className="text-center mb-12">
           <div className="inline-block p-4 bg-indigo-100 rounded-2xl text-indigo-600 mb-4 shadow-sm">
              <Squares2X2Icon className="w-8 h-8" />
           </div>
           <h2 className="text-3xl font-black text-gray-900 mb-2">{selectedCategory.title}</h2>
           <p className="text-gray-500">Selecione como pretende realizar este teste.</p>
        </div>

        <div className="grid gap-6">
           <button 
             onClick={() => setSelectedMode('EXAM')}
             className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-gray-100 hover:border-indigo-600 hover:shadow-2xl transition-all text-left group relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 bg-indigo-600 w-24 h-24 rounded-bl-full -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
                   <ChartBarIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Modo Exame</h3>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">Recomendado</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm pl-[4.5rem] leading-relaxed">
                Simulação real com tempo limitado ({selectedCategory.examDurationMinutes} min). 
                Resultados apenas no final. Ideal para testar conhecimentos.
              </p>
           </button>

           <button 
             onClick={() => setSelectedMode('STUDY')}
             className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-gray-100 hover:border-green-500 hover:shadow-2xl transition-all text-left group relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 bg-green-500 w-24 h-24 rounded-bl-full -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>

              <div className="flex items-center gap-4 mb-3">
                <div className="bg-green-100 p-3 rounded-2xl text-green-600 group-hover:scale-110 transition-transform shadow-sm">
                   <BookOpenIcon className="w-8 h-8" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-gray-900">Modo Estudo</h3>
                   <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">Aprendizagem</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm pl-[4.5rem] leading-relaxed">
                Sem limite de tempo. Explicações imediatas após cada resposta. 
                Ideal para treinar e aprender com os erros.
              </p>
           </button>
        </div>
      </div>
    );
  }

  // RENDER: DASHBOARD PRINCIPAL
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2.5">
             <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                <Squares2X2Icon className="w-5 h-5 text-white"/>
             </div>
             <span className="font-extrabold text-gray-900 text-lg tracking-tight hidden sm:block">Simulador<span className="text-indigo-600">Pro</span></span>
           </div>
           
           <div className="flex items-center gap-3">
             {user && !user.isPremium && (
               <button 
                  onClick={upgradeToPremium}
                  className="hidden sm:flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-colors"
               >
                 <GiftIcon className="w-4 h-4" />
                 Premium
               </button>
             )}
             <button 
                onClick={() => setCurrentView('FAQ')}
                className="text-gray-400 hover:text-indigo-600 transition-colors p-2"
                title="Perguntas Frequentes"
             >
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
             </button>
             <button 
                onClick={() => setIsSupportOpen(true)}
                className="text-gray-400 hover:text-indigo-600 transition-colors p-2"
                title="Suporte"
             >
                <HeartIcon className="w-6 h-6" />
             </button>
             {user && (
               <div className="w-px h-4 bg-gray-200 mx-1"></div>
             )}
             {user && (
               <button onClick={logout} className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">
                 Sair
               </button>
             )}
           </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HomeView onSelectCategory={setSelectedCategory} onOpenSupport={() => setIsSupportOpen(true)} />
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
           <p className="text-sm text-gray-400 font-medium">
             © 2025 Simulador TVDE Pro • Desenvolvido com <HeartIcon className="w-3 h-3 inline text-red-400 mx-0.5" /> em Portugal
           </p>
           <div className="flex justify-center items-center gap-4 mt-4 text-xs text-gray-400 flex-wrap">
              <button onClick={() => setIsSupportOpen(true)} className="hover:text-indigo-500">Suporte</button>
              <span className="hidden sm:inline">•</span>
              <a href="mailto:suporte@tvdepro.pt" className="hover:text-indigo-500 font-medium text-indigo-600">suporte@tvdepro.pt</a>
              <span className="hidden sm:inline">•</span>
              <a href="#" className="hover:text-indigo-500">Termos</a>
              <span className="hidden sm:inline">•</span>
              <a href="#" className="hover:text-indigo-500">Privacidade</a>
           </div>
        </div>
      </footer>

      {/* Global Modals */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <StatsProvider>
        <AppContent />
      </StatsProvider>
    </AuthProvider>
  );
};

export default App;
