'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AssessmentResult {
  report: {
    id: string
    overallScore: number
    confidence: number
    summary: string
  }
  skinType: {
    name: string
    description: string
  }
  parameters: Array<{
    id: string
    name: string
    value: number
    severity: string
  }>
  recommendations: Array<{
    id: string
    title: string
    description: string
    type: string
    priority: number
  }>
}

export default function ResultsPage() {
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('lastAssessment')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setResult(data)
      } catch (error) {
        console.error('Error parsing result:', error)
      }
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <p className="text-xl">Loading results...</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No assessment found</p>
          <Link href="/scan">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Start New Assessment
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const { report, skinType, parameters, recommendations } = result

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    return 'Needs Attention'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">✨ Skin Assessment Report</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* Score */}
          <div className="text-center">
            <div className={`text-5xl font-bold ${getScoreColor(report.overallScore)}`}>
              {report.overallScore}/100
            </div>
            <div className="text-lg font-semibold mt-1">{getScoreLabel(report.overallScore)}</div>
            <div className="text-sm text-gray-500 mt-1">
              Confidence: {Math.round(report.confidence * 100)}%
            </div>
          </div>

          <hr />

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-gray-700">{report.summary}</p>
          </div>

          {/* Skin Type */}
          <div>
            <h3 className="text-sm font-medium text-gray-500">Skin Type</h3>
            <p className="text-xl font-semibold capitalize">{skinType.name}</p>
            <p className="text-sm text-gray-500">{skinType.description}</p>
          </div>

          {/* Parameters */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Parameters</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {parameters.map((param) => (
                <div key={param.id} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-gray-600">{param.name}</p>
                  <p className="text-lg font-semibold">{param.value}%</p>
                  <span className="text-xs text-gray-400">{param.severity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-700 mb-3">💡 Recommendations</h3>
            <ul className="space-y-3">
              {recommendations.map((rec) => (
                <li key={rec.id} className="border-b border-blue-100 last:border-0 pb-2 last:pb-0">
                  <p className="font-medium text-gray-800">{rec.title}</p>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <hr />

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/scan" className="flex-1">
              <button className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                New Assessment
              </button>
            </Link>
            <button
              onClick={() => window.print()}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              Print Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
