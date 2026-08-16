import { FeedbackTableLoader } from "@/components/admin/feedback-table-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Scan feedback"
        description="Ratings and comments submitted after skin scans."
        badge="Admin"
      />
      <FeedbackTableLoader />
    </div>
  )
}
