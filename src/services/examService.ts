import { MOCK_QUESTIONS, EXAM_CONFIG } from '../constants';
import { Question, LegacyQuestion, ExamResult } from '../types';

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
const CATEGORY_TARGETS = {
  'Código da Estrada': 10,
  'Lei TVDE': 6,
  'Comunicação e Turismo': 5,
  'Mecânica e Eco-condução': 5,
  'Segurança e Socorro': 4
};

// Adapter: Converte pergunta antiga para o novo formato
const convertToNewFormat = (lq: LegacyQuestion): Question => {
  // Encontra o índice da resposta correta
  let correctIndex = lq.options.indexOf(lq.correct);
  
  // Fallback de segurança se a string não bater certo (não deve acontecer com dados válidos)
  if (correctIndex === -1) correctIndex = 0;

  return {
    id: lq.id,
    text: lq.question, // Mapeia 'question' para 'text'
    options: lq.options,
    correctIndex: correctIndex,
    category: lq.category,
    imageUrl: lq.imageUrl,
    explanation: "A resposta correta baseia-se na legislação e manuais de formação TVDE em vigor."
  };
};

export const generateExam = (): Question[] => {
  // 1. Agrupar e normalizar categorias
  const pool: Record<string, LegacyQuestion[]> = {
    'Código da Estrada': [],
    'Lei TVDE': [],
    'Comunicação e Turismo': [],
    'Mecânica e Eco-condução': [],
    'Segurança e Socorro': []
  };

  MOCK_QUESTIONS.forEach(q => {
    let cat = q.category || "Geral";
    
    if (cat === 'Segurança Rodoviária (PRP)') cat = 'Código da Estrada';
    if (cat === 'Inglês Técnico') cat = 'Comunicação e Turismo';

    if (!pool[cat]) {
       if (cat.includes('Lei') || cat.includes('Regulamento')) cat = 'Lei TVDE';
       else if (cat.includes('Mecânica') || cat.includes('Eco')) cat = 'Mecânica e Eco-condução';
       else if (cat.includes('Socorro') || cat.includes('Segurança')) cat = 'Segurança e Socorro';
       else if (cat.includes('Comunicação') || cat.includes('Turismo')) cat = 'Comunicação e Turismo';
       else cat = 'Código da Estrada';
    }
    pool[cat].push(q);
  });

  let selectedLegacyQuestions: LegacyQuestion[] = [];
  const usedIds = new Set<string>();

  // 2. Selecionar perguntas balanceadas
  Object.entries(CATEGORY_TARGETS).forEach(([category, targetCount]) => {
    const questionsInCategory = pool[category] || [];
    const shuffled = shuffleArray(questionsInCategory);
    const toTake = Math.min(targetCount, shuffled.length);
    
    for(let i = 0; i < toTake; i++) {
      selectedLegacyQuestions.push(shuffled[i]);
      usedIds.add(shuffled[i].id);
    }
  });

  // 3. Preencher o resto
  let currentCount = selectedLegacyQuestions.length;
  let remainingNeeded = EXAM_CONFIG.TOTAL_QUESTIONS - currentCount;
  
  if (remainingNeeded > 0) {
    const allRemaining = MOCK_QUESTIONS.filter(q => !usedIds.has(q.id));
    const shuffledRemaining = shuffleArray(allRemaining);
    selectedLegacyQuestions.push(...shuffledRemaining.slice(0, remainingNeeded));
  }

  // 4. Baralhar opções, converter para novo formato e retornar
  return shuffleArray(selectedLegacyQuestions).map(lq => {
    // Baralhar opções antes de converter para garantir que o índice muda
    const shuffledOptions = shuffleArray([...lq.options]);
    
    // Criar objeto temporário com opções baralhadas para conversão
    const tempQ = { ...lq, options: shuffledOptions };
    
    return convertToNewFormat(tempQ);
  });
};

const STORAGE_KEY = 'tvde_exam_history_v2';

export const saveExamResult = (result: ExamResult): void => {
  try {
    const currentHistory = getExamHistory();
    const newHistory = [result, ...currentHistory];
    if (newHistory.length > 50) newHistory.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.warn("Falha ao guardar histórico.", error);
  }
};

export const getExamHistory = (): ExamResult[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};