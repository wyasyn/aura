export interface SkinType {
  id: string;
  name: 'Normal' | 'Dry' | 'Oily' | 'Combination' | 'Sensitive';
  description: string;
  characteristics: string[];
  createdAt: Date;
}
