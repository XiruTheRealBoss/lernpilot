import type { NormalizedAnnouncement, NormalizedTask } from '../types';
import { getDaysRemaining, getUrgencyLevel } from '../utils/dateUtils';

function daysFromNow(days: number, hours = 23, minutes = 59): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function buildTask(partial: Omit<NormalizedTask, 'urgency' | 'daysRemaining'>): NormalizedTask {
  return {
    ...partial,
    urgency: getUrgencyLevel(partial.dueDate),
    daysRemaining: getDaysRemaining(partial.dueDate),
  };
}

/** Tarefas mockadas para desenvolvimento da interface sem depender da Classroom API. */
export const mockTasks: NormalizedTask[] = [
  buildTask({
    id: 'mock-1',
    type: 'tarefa',
    title: 'Lista de exercícios - Equações de 2º grau',
    description: 'Resolver os exercícios 1 a 10 da apostila, capítulo 4. Mostrar todo o desenvolvimento dos cálculos.',
    courseId: 'mock-course-1',
    courseName: 'Matemática',
    teacherName: 'Profa. Ana Paula',
    dueDate: daysFromNow(-2),
    alternateLink: 'https://classroom.google.com',
    materials: [{ title: 'Apostila - Capítulo 4', url: 'https://classroom.google.com' }],
    status: 'atrasado',
    creationTime: daysFromNow(-10),
  }),
  buildTask({
    id: 'mock-2',
    type: 'tarefa',
    title: 'Redação dissertativa-argumentativa',
    description: 'Tema: "Os desafios da educação digital no Brasil". Mínimo de 25 linhas, entregar em PDF.',
    courseId: 'mock-course-2',
    courseName: 'Português',
    teacherName: 'Prof. Marcelo Souza',
    dueDate: daysFromNow(0, 23, 59),
    alternateLink: 'https://classroom.google.com',
    materials: [],
    status: 'pendente',
    creationTime: daysFromNow(-5),
  }),
  buildTask({
    id: 'mock-3',
    type: 'tarefa',
    title: 'Relatório de experimento - Reações químicas',
    description: 'Descrever as observações do experimento realizado em laboratório e responder ao questionário anexo.',
    courseId: 'mock-course-3',
    courseName: 'Química',
    teacherName: 'Profa. Renata Lima',
    dueDate: daysFromNow(2, 23, 59),
    alternateLink: 'https://classroom.google.com',
    materials: [{ title: 'Questionário do experimento', url: 'https://classroom.google.com' }],
    status: 'pendente',
    creationTime: daysFromNow(-3),
  }),
  buildTask({
    id: 'mock-4',
    type: 'tarefa',
    title: 'Apresentação sobre Revolução Industrial',
    description: 'Preparar slides em grupo (até 4 pessoas) sobre as causas e consequências da Revolução Industrial.',
    courseId: 'mock-course-4',
    courseName: 'História',
    teacherName: 'Prof. João Pedro',
    dueDate: daysFromNow(5, 23, 59),
    alternateLink: 'https://classroom.google.com',
    materials: [],
    status: 'pendente',
    creationTime: daysFromNow(-1),
  }),
  buildTask({
    id: 'mock-5',
    type: 'tarefa',
    title: 'Exercícios de verbos irregulares',
    description: 'Completar a lista de verbos irregulares no Workbook, unidade 7, páginas 32-34.',
    courseId: 'mock-course-5',
    courseName: 'Inglês',
    teacherName: 'Profa. Carol Mendes',
    dueDate: daysFromNow(-6, 23, 59),
    alternateLink: 'https://classroom.google.com',
    materials: [],
    status: 'entregue',
    creationTime: daysFromNow(-12),
  }),
  buildTask({
    id: 'mock-6',
    type: 'tarefa',
    title: 'Projeto de Física - Movimento Uniforme',
    description: 'Sem data de entrega definida ainda. Aguardar instruções da professora na próxima aula.',
    courseId: 'mock-course-6',
    courseName: 'Física',
    teacherName: 'Prof. Eduardo Castro',
    dueDate: null,
    alternateLink: 'https://classroom.google.com',
    materials: [],
    status: 'sem_data',
    creationTime: daysFromNow(-2),
  }),
];

/** Anúncios mockados para desenvolvimento da interface sem depender da Classroom API. */
export const mockAnnouncements: NormalizedAnnouncement[] = [
  {
    id: 'mock-anuncio-1',
    type: 'anuncio',
    text: 'Atenção, turma! A prova de Matemática foi remarcada para a próxima sexta-feira. Revisem o conteúdo dos capítulos 3 e 4.',
    courseId: 'mock-course-1',
    courseName: 'Matemática',
    teacherName: 'Profa. Ana Paula',
    creationTime: daysFromNow(-1),
    alternateLink: 'https://classroom.google.com',
    materials: [],
    highlighted: true,
  },
  {
    id: 'mock-anuncio-2',
    type: 'anuncio',
    text: 'Pessoal, lição de casa para amanhã: resolver os exercícios 5 a 15 da página 78 do livro. Quem não entregar perde nota!',
    courseId: 'mock-course-3',
    courseName: 'Química',
    teacherName: 'Profa. Renata Lima',
    creationTime: daysFromNow(-1),
    alternateLink: 'https://classroom.google.com',
    materials: [],
    highlighted: true,
  },
  {
    id: 'mock-anuncio-3',
    type: 'anuncio',
    text: 'Galera, não esqueçam: trabalho de História em grupo deve ser entregue na quinta-feira. Mínimo de 5 páginas sobre a Revolução Francesa.',
    courseId: 'mock-course-4',
    courseName: 'História',
    teacherName: 'Prof. João Pedro',
    creationTime: daysFromNow(-2),
    alternateLink: 'https://classroom.google.com',
    materials: [],
    highlighted: true,
  },
  {
    id: 'mock-anuncio-4',
    type: 'anuncio',
    text: 'Bom feriado a todos! Voltamos com as aulas normalmente na semana que vem.',
    courseId: 'mock-course-5',
    courseName: 'Inglês',
    teacherName: 'Profa. Carol Mendes',
    creationTime: daysFromNow(-3),
    alternateLink: 'https://classroom.google.com',
    materials: [],
    highlighted: false,
  },
];
