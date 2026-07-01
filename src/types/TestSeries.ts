import { TQuestion } from './Question';

export type TTestSeries = {
  id: string;
  name: string;
  description: string | null;
  testType: 'daily' | 'weekly' | 'full';
  timeLimit: number;
  totalMarks: number | null;
  isActive: boolean;
  sequence: number;
  questionCount?: number;
  Questions?: TQuestion[];
  createdAt: string;
  updatedAt: string;
};
