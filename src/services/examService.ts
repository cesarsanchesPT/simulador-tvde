
import { MOCK_QUESTIONS } from '../constants';
import { Question, ExamResult, EXAM_CONFIG } from '../types';

// Utility to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Configuração da Distribuição do Exame (Baseado no IMT)
// Total: 30 Perguntas
const CATEGORY_TARGETS = {
  'Código da Estrada': 10,           // NLC - Normas Legais de Condução
  'Lei TVDE': 6,                     // RA - Regulamentação da Atividade
  'Comunicação e Turismo': 5,        // CRI - Comunicação e Relação Interpessoal
  'Mecânica e Eco-condução': 5,      // TC - Técnicas de Condução
  'Segurança e Socorro': 4           // SEPS - Segurança e Primeiros Socorros
};

export const generateExam = (): Question[] => {
  // 1. Agrupar todas as questões por categoria normalizada
  const pool: Record<string, Question[]> = {
    'Código da Estrada': [],
    'Lei TVDE': [],
    'Comunicação e Turismo': [],
    'Mecânica e Eco-condução': [],
    'Segurança e Socorro': []
  };

  MOCK_QUESTIONS.forEach(q => {
    let cat = q.category || "Geral";
    
    if (cat === 'Segurança Rodoviária (PRP)') {
      cat = 'Código da Estrada';
    }
    
    if (cat === 'Inglês Técnico') {
       cat = 'Comunicação e Turismo';
    }

    if (!pool[cat]) {
       if (cat.includes('Lei') || cat.includes('Regulamento')) cat = 'Lei TVDE';
       else if (cat.includes('Mecânica') || cat.includes('Eco')) cat = 'Mecânica e Eco-condução';
       else if (cat.includes('Socorro') || cat.includes('Segurança')) cat = 'Segurança e Socorro';
       else if (cat.includes('Comunicação') || cat.includes('Turismo')) cat = 'Comunicação e Turismo';
       else cat = 'Código da Estrada';
    }

    pool[cat].push(q);
  });

  let selectedQuestions: Question[] = [];
  const usedIds = new Set<string>();

  // 2. Selecionar perguntas baseadas na distribuição oficial
  Object.entries(CATEGORY_TARGETS).forEach(([category, targetCount]) => {
    const questionsInCategory = pool[category] || [];
    const shuffled = shuffleArray(questionsInCategory);
    
    const toTake = Math.min(targetCount, shuffled.length);
    
    for(let i = 0; i < toTake; i++) {
      selectedQuestions.push(shuffled[i]);
      usedIds.add(shuffled[i].id);
    }
  });

  // 3. Se faltarem perguntas para chegar a 30, preencher aleatoriamente
  let currentCount = selectedQuestions.length;
  let remainingNeeded = EXAM_CONFIG.TOTAL_QUESTIONS - currentCount;
  
  if (remainingNeeded > 0) {
    const allRemaining = MOCK_QUESTIONS.filter(q => !usedIds.has(q.id));
    const shuffledRemaining = shuffleArray(allRemaining);
    selectedQuestions.push(...shuffledRemaining.slice(0, remainingNeeded));
  }

  // 4. Baralhar a ordem final
  return shuffleArray(selectedQuestions).map(q => ({
    ...q,
    options: shuffleArray([...q.options])
  }));
};

const STORAGE_KEY = 'tvde_exam_history_v2';

export const saveExamResult = (result: ExamResult): void => {
  const currentHistory = getExamHistory();
  const newHistory = [result, ...currentHistory];
  if (newHistory.length > 50) newHistory.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
};

export const getExamHistory = (): ExamResult[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};