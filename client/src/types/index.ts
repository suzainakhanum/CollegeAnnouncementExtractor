// Type definitions — fully defined in task 2.1

export interface DateEntry {
  date: string
  event: string
  status?: string
}

export interface StructuredResult {
  summary: string
  whatChanged: string[]
  whoIsAffected: string[]
  importantDates: DateEntry[]
  requiredActions: string[]
  exceptions: string[]
  documentsOrMaterials: string[]
  priority: 'Urgent' | 'Important' | 'Informational'
  missingInformation: string[]
}

export interface AppError {
  code: number
  message: string
}

export interface AnalyzeRequestBody {
  announcement: string
}

export interface AnalyzeSuccessResponse {
  result: StructuredResult
}

export interface AnalyzeErrorResponse {
  error: string
}
