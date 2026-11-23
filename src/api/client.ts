/**
 * Example API Client Configuration
 * This file sets up a mock Axios instance (or native fetch wrapper)
 * for communicating with the backend.
 */

import { logger } from '@/utils'

export const apiClient = {
  // Mock GET request
  get: async <T>(url: string): Promise<{ data: T }> => {
    logger.info(`[API GET] ${url}`)
    return new Promise((resolve) => setTimeout(() => resolve({ data: {} as T }), 500))
  },
  // Mock POST request
  post: async <T>(url: string, payload: unknown): Promise<{ data: T }> => {
    logger.info(`[API POST] ${url}`, payload)
    return new Promise((resolve) => setTimeout(() => resolve({ data: {} as T }), 500))
  },
  // Mock PUT request
  put: async <T>(url: string, payload: unknown): Promise<{ data: T }> => {
    logger.info(`[API PUT] ${url}`, payload)
    return new Promise((resolve) => setTimeout(() => resolve({ data: {} as T }), 500))
  },
  // Mock DELETE request
  delete: async <T>(url: string): Promise<{ data: T }> => {
    logger.info(`[API DELETE] ${url}`)
    return new Promise((resolve) => setTimeout(() => resolve({ data: {} as T }), 500))
  }
}
