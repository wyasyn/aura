export interface Recommendation {
  id: string;
  reportId: string;
  type: 'product' | 'lifestyle' | 'routine' | 'ingredient';
  title: string;
  description: string;
  priority: number;
  category: string;
  createdAt: Date;
}
