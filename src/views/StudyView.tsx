import React, { useState } from 'react';
import { Question } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { ChevronLeftIcon, Squares2X2Icon, BookOpenIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, LightBulbIcon } from '../components/Icons';

interface StudyViewProps {
  onBack: () => void;
}

// Helper para converter Mock para Question
const getStudyQuestions = (category: string): Question[] => {
  const mapped: Question[] = MOCK_QUESTIONS.map(lq => {
    let correctIndex = lq.options.indexOf(lq.correct);
    if (correctIndex === -1) correctIndex = 0;
    return {
      id: lq.id,
      text: lq.question,
      options: lq.options,
      correctIndex,
      category: lq.category,
      explanation: 'Resposta baseada nos manuais oficiais.'
    };
  });

  if (category === 'Todos') return mapped.sort(() => Math.random() - 0.5);
  
  return mapped.filter(q => {
     let cat = q.category || "Geral";
     // Normalização de categorias
     if (cat.includes('Lei') || cat.includes('Regulamento')) cat = 'Lei TVDE';
     else if (cat.includes('Mecânica') || cat.includes('Eco')) cat = 'Mecânica e Eco-condução';
     else if (cat.includes('Socorro') || cat.includes('Segurança')) cat = 'Segurança e Socorro';
     else if (cat.includes('Comunicação') || cat.includes('Turismo') || cat.includes('Inglês')) cat = 'Comunicação e Turismo';
     else cat = 'Código da Estrada';
     
     return cat === category;
  }).sort(() => Math.random() - 0.5);
};

export const StudyView: React.FC<StudyViewProps> = ({ onBack }) => {
  const [category, setCategory] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);

  const categories = [
    'Todos', 'Lei TVDE', 'Código da Estrada', 
    'Comunicação e Turismo', 'Mecânica e Eco-condução', 'Segurança e Socorro'
  ];

  const startSession = (cat: string) => {
    const qs = getStudyQuestions(cat);
    if (qs.length === 0) {
      alert("Sem perguntas disponíveis para esta categoria.");
      return;
    }
    setQuestions(qs);
    setCategory(cat);
    setIndex(0);
    setAnswer(null);
  };

  // MENU MODE
  if (!category) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in pt-20 pb-10">
         <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            <ChevronLeftIcon className="w-5 h-5" /> Voltar ao Menu
         </button>
         <div className="text-center mb-10">
           <h2 className="text-3xl font-bold text-gray-900 mb-2">Modo de Estudo</h2>
           <p className="text-gray-500">Escolha um tema específico para praticar sem pressão de tempo.</p>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => startSession(cat)}
                className="bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 p-6 rounded-2xl text-left transition-all hover:shadow-md group"
              >
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                   {cat === 'Todos' ? <Squares2X2Icon className="w-6 h-6" /> : <BookOpenIcon className="w-6 h-6" />}
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700">{cat}</h3>
              </button>
            ))}
         </div>
      </div>
    );
  }

  // SESSION MODE
  const q = questions[index];
  const isAnswered = answer !== null;
  const isCorrect = answer === q.correctIndex;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pt-10 pb-20">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setCategory(null)} className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
           <ChevronLeftIcon className="w-4 h-4" /> Sair
        </button>
        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
           {category} • {index + 1}/{questions.length}
        </span>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden p-8 mb-6">
         <h3 className="text-xl font-bold text-gray-900 mb-6">{q.text}</h3>
         <div className="space-y-3">
           {q.options.map((opt, idx) => {
             const isSel = answer === idx;
             const isRight = idx === q.correctIndex;
             
             let style = 'border-gray-100 hover:bg-gray-50';
             let iconStyle = 'bg-gray-100 text-gray-500';
             
             if (isAnswered) {
               if (isRight) { style = 'border-green-200 bg-green-50'; iconStyle = 'bg-green-500 text-white'; }
               else if (isSel) { style = 'border-red-200 bg-red-50'; iconStyle = 'bg-red-500 text-white'; }
               else style = 'border-gray-100 opacity-50';
             }

             return (
               <button
                key={idx}
                disabled={isAnswered}
                onClick={() => setAnswer(idx)}
                className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${style}`}
               >
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${iconStyle}`}>
                   {String.fromCharCode(65 + idx)}
                 </div>
                 <span className={`flex-1 text-base ${isSel || (isAnswered && isRight) ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                   {opt}
                 </span>
                 {isAnswered && isRight && <CheckCircleIcon className="w-6 h-6 text-green-500" />}
                 {isAnswered && isSel && !isRight && <XCircleIcon className="w-6 h-6 text-red-500" />}
               </button>
             );
           })}
         </div>

         {isAnswered && (
           <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 animate-fade-in ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'}`}>
              {isCorrect ? <CheckCircleIcon className="w-5 h-5 mt-0.5" /> : <LightBulbIcon className="w-5 h-5 mt-0.5" />}
              <div>
                <p className="font-bold">{isCorrect ? 'Correto!' : 'Explicação:'}</p>
                <p className="text-sm mt-1">{q.explanation}</p>
              </div>
           </div>
         )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            if (index < questions.length - 1) {
              setIndex(prev => prev + 1);
              setAnswer(null);
            } else {
              alert("Sessão concluída!");
              setCategory(null);
            }
          }}
          disabled={!isAnswered}
          className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
            isAnswered ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {index < questions.length - 1 ? 'Próxima' : 'Concluir'} <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};