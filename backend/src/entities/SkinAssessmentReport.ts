export interface SkinAssessmentReport {
  id: string;
  userId: string;
  skinTypeId: string;
  imageId: string;
  overallScore: number;
  confidence: number;
  summary: string;
  assessmentDate: Date;
  createdAt: Date;
}
