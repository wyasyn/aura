"use client"

import { useEffect, useState } from "react"

import { ReportProductList } from "@/components/reports/report-product-list"
import type { RecommendationFeedbackState } from "@/lib/recommendation/feedback-queries"
import { loadRecommendationFeedback } from "@/lib/recommendation/feedback"
import type { RecommendationVerdictValue } from "@/lib/recommendation/feedback-vocabulary"
import type { ProductRecommendation } from "@/lib/scan/types"

/**
 * The product list, with feedback controls attached once they are known.
 *
 * The report tree is client-rendered end to end, so the stored recommendation
 * rows are fetched here rather than threaded down through several layers that
 * have no other use for them. One request per report, not one per product.
 *
 * The list renders immediately without controls and gains them when the state
 * arrives. A scan that predates the engine, or one the viewer does not own,
 * simply never gets them — which is the correct outcome in both cases and needs
 * no special handling here.
 */

type ReportProductsWithFeedbackProps = {
  products: ProductRecommendation[]
  scanId: string
  clinicName?: string | null
}

export function ReportProductsWithFeedback({
  products,
  scanId,
  clinicName,
}: ReportProductsWithFeedbackProps) {
  const [feedback, setFeedback] = useState<Map<
    string,
    RecommendationFeedbackState
  > | null>(null)

  useEffect(() => {
    let active = true

    loadRecommendationFeedback(scanId)
      .then((state) => {
        if (!active) return
        setFeedback(
          new Map(
            Object.entries(state).map(([slug, entry]) => [
              slug,
              {
                recommendationId: entry.recommendationId,
                verdict: (entry.verdict as RecommendationVerdictValue | null) ?? null,
              },
            ]),
          ),
        )
      })
      .catch(() => {
        // The report is the point; the controls are an addition to it. A failed
        // load leaves the list exactly as it renders for an older scan.
        if (active) setFeedback(null)
      })

    return () => {
      active = false
    }
  }, [scanId])

  return (
    <ReportProductList
      products={products}
      clinicName={clinicName}
      feedback={feedback}
    />
  )
}
