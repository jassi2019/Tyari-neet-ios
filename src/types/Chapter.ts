export type TChapter = {
  id: string;
  name: string;
  number: number;
  description: string;
  subjectId: string;
  classId: string;
  serviceType?: 'FREE' | 'PREMIUM';
  createdAt: string;
  updatedAt: string;
};
