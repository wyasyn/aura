import { 
  SkinAssessmentReport,
  SkinType,
  SkinParameter,
  Recommendation,
  AssessmentImage
} from './entities';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface AssessmentResponse {
  report: SkinAssessmentReport;
  skinType: SkinType;
  parameters: SkinParameter[];
  recommendations: Recommendation[];
  image: AssessmentImage;
}

export const api = {
  assessSkin: async (image: File): Promise<AssessmentResponse> => {
    const formData = new FormData();
    formData.append('image', image);

    const response = await fetch(`${API_URL}/api/assess`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Assessment failed');
    }

    return response.json();
  },

  uploadImage: async (image: File): Promise<AssessmentResponse> => {
    const formData = new FormData();
    formData.append('image', image);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  health: async () => {
    const response = await fetch(`${API_URL}/health`);
    return response.json();
  }
};
