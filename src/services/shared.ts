// src/services/shared.ts
// Shared error handling utility for service modules

/**
 * Generic service response type
 */
export interface ServiceResponse<T> {
  data: T
  error: string | null
}

export function handleServiceError<T>(error: unknown, context: string, defaultData: T): ServiceResponse<T> {
  console.error(`[${context}]`, error);
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
    ? error 
    : 'Unknown error';
  
  return { data: defaultData, error: errorMessage };
}
