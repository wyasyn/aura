'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Webcam from 'react-webcam'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function ScanPage() {
  const router = useRouter()
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
      setError(null)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const captureImage = () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot()
      if (screenshot) {
        setImage(screenshot)
        fetch(screenshot)
          .then(res => res.blob())
          .then(blob => {
            setFile(new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' }))
          })
        setShowCamera(false)
        setError(null)
      }
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${API_URL}/api/assess`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Assessment failed')
      }

      const data = await response.json()
      localStorage.setItem('lastAssessment', JSON.stringify(data))
      router.push(`/results?id=${data.report?.id || 'scan'}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Assessment failed')
    } finally {
      setLoading(false)
    }
  }

  const resetImage = () => {
    setImage(null)
    setFile(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">✨ Skin Assessment</h1>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {image ? (
            <div className="space-y-4">
              <div className="relative">
                <Image
                  src={image}
                  alt="Skin"
                  width={400}
                  height={400}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
                <button
                  onClick={resetImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg"
              >
                {loading ? '🔍 Analyzing...' : '🔍 Assess My Skin'}
              </button>
            </div>
          ) : showCamera ? (
            <div className="space-y-4">
              <div className="bg-black rounded-lg overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full"
                  videoConstraints={{
                    width: 400,
                    height: 300,
                    facingMode: 'user',
                  }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCamera(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={captureImage}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Take Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📸</div>
                <p className="text-gray-600 mb-4">Upload a photo or use your camera</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setShowCamera(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    📷 Use Camera
                  </button>
                  <button
                    onClick={triggerFileUpload}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    📁 Choose File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          Supported formats: JPG, PNG, JPEG • Max 10MB
        </p>
      </div>
    </div>
  )
}
