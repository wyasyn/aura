import { Request, Response } from 'express';
import { AssessmentService } from '../services/AssessmentService';

const assessmentService = new AssessmentService();

export const assessSkin = async (req: Request, res: Response) => {
  try {
    console.log("📸 Image received for assessment");

    let imageBase64: string;

    // Handle file upload
    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      console.log(`✅ File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
    } 
    // Handle base64 image
    else if (req.body.image) {
      imageBase64 = req.body.image;
      console.log("✅ Base64 image received");
    } 
    else {
      return res.status(400).json({ 
        error: 'No image provided. Please upload an image file or base64 data.' 
      });
    }

    console.log("🧠 Running AI skin assessment...");
    
    // Perform assessment
    const result = await assessmentService.performAssessment(imageBase64);

    console.log("✅ Assessment complete!");
    console.log(`📊 Score: ${result.report.overallScore}/100`);
    console.log(`🧴 Skin Type: ${result.skinType.name}`);

    return res.status(201).json(result);
  } catch (error) {
    console.error("❌ Assessment error:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Assessment failed' 
    });
  }
};
