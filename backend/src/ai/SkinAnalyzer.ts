import { GeminiAnalyzer } from './GeminiAnalyzer';
import { SkinType } from '../entities/SkinType';
import { SkinParameter } from '../entities/SkinParameter';
import { Recommendation } from '../entities/Recommendation';

export class SkinAnalyzer {
  private geminiAnalyzer: GeminiAnalyzer;

  constructor() {
    this.geminiAnalyzer = new GeminiAnalyzer();
  }

  async analyzeSkin(imageBase64: string) {
    console.log("🔍 Analyzing skin with Gemini...");
    
    // Get analysis from Gemini
    const result = await this.geminiAnalyzer.analyzeSkin(imageBase64);
    
    // Map to entities
    const skinType: SkinType = {
      id: `st_${Date.now()}`,
      name: result.skinType as any || "Normal",
      description: this.getSkinTypeDescription(result.skinType || "Normal"),
      characteristics: this.getSkinTypeCharacteristics(result.skinType || "Normal"),
      createdAt: new Date()
    };

    const parameters: SkinParameter[] = result.parameters.map((p: any, index: number) => ({
      id: `p_${Date.now()}_${index}`,
      reportId: `report_${Date.now()}`,
      name: p.name,
      value: p.value || 50,
      severity: p.severity || "mild",
      confidence: result.confidence || 0.8,
      createdAt: new Date()
    }));

    const recommendations: Recommendation[] = result.recommendations.map((r: any, index: number) => ({
      id: `r_${Date.now()}_${index}`,
      reportId: `report_${Date.now()}`,
      type: r.type || "product",
      title: r.title,
      description: r.description,
      priority: r.priority || index + 1,
      category: r.type || "skincare",
      createdAt: new Date()
    }));

    return {
      skinType,
      parameters,
      recommendations,
      overallScore: result.overallScore || 70,
      confidence: result.confidence || 0.8,
      summary: result.summary || "Skin analysis complete."
    };
  }

  private getSkinTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      "Dry": "Lacks moisture with rough, flaky texture",
      "Oily": "Excess sebum production with shiny appearance",
      "Combination": "Mixed skin type with oily T-zone and dry cheeks",
      "Normal": "Balanced skin with even tone and texture",
      "Sensitive": "Easily irritated with redness and reactivity"
    };
    return descriptions[type] || "Balanced skin type";
  }

  private getSkinTypeCharacteristics(type: string): string[] {
    const characteristics: Record<string, string[]> = {
      "Dry": ["Flaky", "Rough texture", "Tight feeling"],
      "Oily": ["Shiny", "Large pores", "Prone to breakouts"],
      "Combination": ["Oily T-zone", "Dry cheeks", "Enlarged pores"],
      "Normal": ["Even tone", "Small pores", "Smooth texture"],
      "Sensitive": ["Redness", "Reactive", "Prone to irritation"]
    };
    return characteristics[type] || ["Balanced", "Even tone"];
  }
}
