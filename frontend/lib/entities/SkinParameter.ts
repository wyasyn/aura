export interface SkinParameter {
  id: string;
  reportId: string;
  name: string;
  value: number;
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  createdAt: Date;
}
