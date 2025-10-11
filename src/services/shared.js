// src/services/shared.js
// Shared error handling utility for service modules

export function handleServiceError(error, context) {
  console.error(`[${context}]`, error);
  return { data: [], error: error?.message || 'Unknown error' };
}
