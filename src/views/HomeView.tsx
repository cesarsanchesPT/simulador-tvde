
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import { AVAILABLE_EXAMS } from '../data/examRegistry';
import { ExamCategory } from '../types';
import { GiftIcon, Squares2X2Icon, BookOpenIcon, SpeakerWaveIcon, ChartBarIcon, HeartIcon, ChevronRightIcon } from '../components/Icons';

// Simple Icon Mapper
const IconMap: Record<string, any> = {
  Car: Squares2X2Icon,
  Book: BookOpenIcon,
  Truck: SpeakerWaveIcon, 
  Fire: SpeakerWaveIcon 
};

interface HomeViewProps {
  onSelectCategory: (category: ExamCategory) => void;
  onOpenSupport?: () => void; // Optional prop for support
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectCategory, onOpenSupport }) => {
  const { user, login, upgradeToPremium } = useAuth();
  const { stats } = useStats();
  const [inputName, setInputName] = React.useState('');

  // TELA DE LOGIN SIMPLIFICADA
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 text-center animate-fade-in">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-200 rotate-3">
            <Squares2X2Icon className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Simulador TVDE</h2>
          <p className="text-gray-500 mb-8 text-lg">A plataforma profissional de preparação para exames em Portugal.</p>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Como se chama?" 
              className="w-full p-4 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center text-lg font-medium"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && inputName && login(inputName)}
            />
            <button 
              onClick={() => { if(inputName) login(inputName) }}
              disabled={!inputName}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              Começar Agora
            </button>
          </div>
          <p className="mt-6 text-xs text-gray-400">v2.0 • Lei 45/2018</p>
        </div>
      </div>
    );
  }

  // Calculate dynamic stats based on user history
  const passRate = stats.totalExams > 0 
    ? Math.round((stats.examsPassed / stats.totalExams) * 100) 
    : 0;

  return (
    <div className="space-y-10 pb-12 animate-slide-up">
      {/* Hero / Welcome Section */}
      <div className="relative overflow-hidden bg-gray-900 text-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl">
         {/* Abstract Background Shapes */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30 -mr-16 -mt-16"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-[80px] opacity-20 -ml-10 -mb-10"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-medium text-indigo-200 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Sistema Online
             </div>
             <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
               Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">{user.name}</span>
             </h1>
             <p className="text-gray-400 text-lg max-w-md leading-relaxed">
               {stats.totalExams === 0 
                  ? "Hoje é um ótimo dia para começar. Escolha uma categoria abaixo para iniciar o seu treino."
                  : `Já realizou ${stats.totalExams} exames com uma média de ${stats.averageScore}%. Continue assim!`
               }
             </p>
           </div>

           <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 min-w-[240px]">
              <div className="flex items-center gap-3 mb-4">
                 <div className={`bg-opacity-20 p-2 rounded-lg ${passRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}>
                    <ChartBarIcon className={`w-5 h-5 ${passRate >= 50 ? 'text-green-400' : 'text-red-400'}`} />
                 </div>
                 <span className="text-sm font-bold text-gray-300 uppercase">Taxa Aprovação</span>
              </div>
              <div className="text-4xl font-black text-white mb-1">{passRate}%</div>
              <div className="text-xs text-gray-400">
                {stats.totalExams} testes realizados
              </div>
           </div>
         </div>

         {/* Premium Banner inline */}
         {!user.isPremium && (
           <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="bg-amber-400 p-2 rounded-lg text-amber-900">
                   <GiftIcon className="w-5 h-5" />
                 </div>
                 <div className="text-sm">
                    <span className="font-bold text-white block">Desbloqueie o Premium</span>
                    <span className="text-gray-400">Acesso a explicações detalhadas e mais exames.</span>
                 </div>
              </div>
              <button 
                onClick={upgradeToPremium}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-amber-900 px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-900/20"
              >
                Fazer Upgrade
              </button>
           </div>
         )}
      </div>

      {/* Grid de Exames */}
      <div>
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Squares2X2Icon className="w-6 h-6 text-indigo-600" />
            Categorias de Exame
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_EXAMS.map(cat => {
             const Icon = IconMap[cat.icon] || BookOpenIcon;
             const isLocked = cat.isPremium && !user.isPremium;

             return (
               <button
                 key={cat.id}
                 onClick={() => !isLocked && onSelectCategory(cat)}
                 className={`relative text-left group bg-white p-8 rounded-[2rem] border-2 transition-all duration-300 flex flex-col h-full ${
                   isLocked 
                    ? 'border-gray-100 opacity-60 cursor-not-allowed grayscale' 
                    : 'border-gray-100 hover:border-indigo-500 hover:shadow-2xl hover:-translate-y-1'
                 }`}
               >
                 <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${isLocked ? 'bg-gray-100' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    {isLocked ? (
                      <span className="bg-gray-100 text-gray-400 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">Locked</span>
                    ) : (
                      <div className="bg-green-100 text-green-600 p-1.5 rounded-full">
                         <ChevronRightIcon className="w-4 h-4" />
                      </div>
                    )}
                 </div>
                 
                 <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight">
                   {cat.title}
                 </h3>
                 <p className="text-sm text-gray-500 mb-6 leading-relaxed flex-grow font-medium">
                   {cat.description}
                 </p>

                 <div className="flex items-center gap-3 text-xs font-bold text-gray-400 bg-gray-50 p-3 rounded-xl">
                    <span className="flex items-center gap-1">
                      <BookOpenIcon className="w-3 h-3" />
                      {cat.totalQuestions} Questões
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>{cat.examDurationMinutes} min</span>
                 </div>
               </button>
             );
          })}
          
          {/* Support Card as part of Grid */}
          <button
             onClick={onOpenSupport}
             className="text-left group bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-[2rem] border-2 border-pink-100 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
           >
              <div className="p-4 rounded-2xl bg-white text-pink-500 shadow-sm w-fit mb-6 group-hover:scale-110 transition-transform">
                 <HeartIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3">
                 Apoiar Projeto
              </h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed flex-grow font-medium">
                 Gosta da plataforma? Ajude-nos a manter o servidor online e a criar mais conteúdo.
              </p>
              <div className="text-pink-600 font-bold text-sm flex items-center gap-2">
                 Ver opções <ChevronRightIcon className="w-4 h-4" />
              </div>
           </button>
        </div>
      </div>
    </div>
  );
};