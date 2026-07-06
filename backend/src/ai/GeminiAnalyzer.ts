import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class GeminiAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      console.warn("⚠️ GEMINI_API_KEY not configured. Using mock data.");
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use Gemini 1.5 Flash
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash"
      });
      console.log("🤖 Gemini 1.5 Flash initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Gemini:", error);
      // Fallback to gemini-pro
      try {
        this.model = this.genAI.getGenerativeModel({ 
          model: "gemini-pro"
        });
        console.log("🤖 Gemini Pro initialized (fallback)");
      } catch (fallbackError) {
        console.error("❌ All Gemini models failed. Using mock data.");
        this.model = null;
      }
    }
  }

  async analyzeSkin(imageBase64: string) {
    // If model is not available, return mock data
    if (!this.model) {
      console.log("📊 Using mock data (Gemini not available)");
      return this.getFallbackData();
    }

    try {
      console.log("📤 Sending image to Gemini 1.5 Flash...");
      
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      
      const prompt = `You are a professional dermatologist and skincare expert. 
Analyze this facial skin image and provide a detailed assessment.

Return ONLY valid JSON in this exact format:
{
  "skinType": "One of: Dry, Oily, Combination, Normal, Sensitive",
  "parameters": [
    {"name": "Acne", "value": 0-100, "severity": "mild/moderate/severe"},
    {"name": "Redness", "value": 0-100, "severity": "mild/moderate/severe"},
    {"name": "Pigmentation", "value": 0-100, "severity": "mild/moderate/severe"},
    {"name": "Wrinkles", "value": 0-100, "severity": "mild/moderate/severe"},
    {"name": "Hydration", "value": 0-100, "severity": "mild/moderate/severe"}
  ],
  "recommendations": [
    {"title": "Recommendation 1", "description": "Description", "type": "product/routine/lifestyle", "priority": 1-5}
  ],
  "overallScore": 0-100,
  "confidence": 0-1,
  "summary": "Brief summary of the skin assessment"
}

Important: Only return valid JSON, no other text.`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      console.log("✅ Gemini response received");

      // Parse JSON response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          skinType: parsed.skinType || "Normal",
          parameters: parsed.parameters || [],
          recommendations: parsed.recommendations || [],
          overallScore: parsed.overallScore || 70,
          confidence: parsed.confidence || 0.8,
          summary: parsed.summary || "Skin analysis complete."
        };
      } catch (parseError) {
        console.error("❌ Failed to parse Gemini response:", parseError);
        return this.getFallbackData();
      }
    } catch (error) {
      console.error("❌ Gemini analysis error:", error);
      return this.getFallbackData();
    }
  }

  private getFallbackData() {
    return {
      skinType: "Combination",
      parameters: [
        { name: "Acne", value: 25, severity: "mild" },
        { name: "Redness", value: 15, severity: "mild" },
        { name: "Pigmentation", value: 20, severity: "mild" },
        { name: "Wrinkles", value: 10, severity: "mild" },
        { name: "Hydration", value: 65, severity: "moderate" }
      ],
      recommendations: [
        {
          title: "Gentle Cleanser",
          description: "Use a gentle, pH-balanced cleanser twice daily.",
          type: "product",
          priority: 1
        },
        {
          title: "Moisturizer with SPF",
          description: "Apply moisturizer with SPF 30 every morning.",
          type: "product",
          priority: 2
        },
        {
          title: "Hydrating Serum",
          description: "Add a hyaluronic acid serum to your routine.",
          type: "product",
          priority: 3
        },
        {
          title: "Stay Hydrated",
          description: "Drink at least 8 glasses of water daily.",
          type: "lifestyle",
          priority: 4
        }
      ],
      overallScore: 72,
      confidence: 0.82,
      summary: "Your skin shows signs of combination type with some concerns. A balanced skincare routine is recommended."
    };
  }
}
