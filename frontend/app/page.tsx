import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">✨ Aura</div>
          <Link
            href="/scan"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Assessment
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-medium mb-6">
            ✨ AI-Powered Skin Intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Your Personal AI
            <span className="text-blue-600"> Skin Consultant</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload a selfie and get instant, personalized skin analysis.
          </p>
          <Link
            href="/scan"
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-lg transition-colors inline-block"
          >
            Start Free Assessment →
          </Link>
        </div>

        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-2">📸</div>
            <h3 className="text-lg font-semibold mb-2">Upload Your Photo</h3>
            <p className="text-gray-600">Take a clear selfie or upload a photo</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-2">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
            <p className="text-gray-600">Our AI analyzes your skin type and concerns</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-2">✨</div>
            <h3 className="text-lg font-semibold mb-2">Get Results</h3>
            <p className="text-gray-600">Receive personalized recommendations</p>
          </div>
        </section>
      </main>
    </div>
  )
}
