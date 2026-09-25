import React, { useState } from 'react'
import Header from './components/Header'
import AnnouncementInput from './components/AnnouncementInput'
import ResultsDashboard from './components/ResultsDashboard'
import { analyzeAnnouncement } from './services/apiService'
import type { StructuredResult, AppError } from './types'

const App: React.FC = () => {
  const [result, setResult] = useState<StructuredResult | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleSubmit = async (text: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await analyzeAnnouncement({ announcement: text })
      setResult(response.result)
    } catch (err) {
      setError(err as AppError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = (): void => {
    // Req 1.5 — reset all dashboard state fields so the results area returns
    // to its empty placeholder state.
    setResult(null)
    setError(null)
    setIsLoading(false)
  }

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <AnnouncementInput
          onSubmit={handleSubmit}
          onClear={handleClear}
          isLoading={isLoading}
        />
        <ResultsDashboard
          result={result}
          error={error}
          isLoading={isLoading}
        />
      </main>
    </div>
  )
}

export default App
