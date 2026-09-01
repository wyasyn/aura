import { RecommendationEngineDashboard } from "@/components/admin/recommendation-engine-dashboard"
import { DashboardPageHeader } from "@/components/dashboard/page-header"

export default function AdminRecommendationsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Recommendation engine"
        description="How often Aurora's engine answers on its own, and what people made of what it chose."
        badge="Admin"
      />
      <RecommendationEngineDashboard />
    </div>
  )
}
