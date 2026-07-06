import { SkinAnalyzer } from '../ai/SkinAnalyzer';
import { SkinAssessmentReport } from '../entities/SkinAssessmentReport';
import { AssessmentImage } from '../entities/AssessmentImage';
import { UserProfile } from '../entities/UserProfile';

export class AssessmentService {
  private skinAnalyzer: SkinAnalyzer;

  constructor() {
    this.skinAnalyzer = new SkinAnalyzer();
  }

  async performAssessment(imageBase64: string, userId: string = 'guest_user') {
    console.log("📊 Starting skin assessment...");

    // Analyze image with AI
    const analysis = await this.skinAnalyzer.analyzeSkin(imageBase64);

    // Create image entity
    const imageId = `img_${Date.now()}`;
    const image: AssessmentImage = {
      id: imageId,
      reportId: `report_${Date.now()}`,
      imageUrl: 'processed_image.jpg',
      thumbnailUrl: 'thumbnail.jpg',
      uploadDate: new Date(),
      quality: 0.85
    };

    // Create report entity
    const reportId = `report_${Date.now()}`;
    const report: SkinAssessmentReport = {
      id: reportId,
      userId: userId,
      skinTypeId: analysis.skinType.id,
      imageId: image.id,
      overallScore: analysis.overallScore,
      confidence: analysis.confidence,
      summary: analysis.summary,
      assessmentDate: new Date(),
      createdAt: new Date()
    };

    // Update image with reportId
    image.reportId = reportId;

    console.log("✅ Assessment complete!");
    console.log(`📋 Report ID: ${report.id}`);
    console.log(`📊 Score: ${report.overallScore}/100`);

    return {
      report,
      skinType: analysis.skinType,
      parameters: analysis.parameters,
      recommendations: analysis.recommendations,
      image
    };
  }
}
