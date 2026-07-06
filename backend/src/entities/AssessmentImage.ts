export interface AssessmentImage {
  id: string;
  reportId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  uploadDate: Date;
  quality: number;
}
