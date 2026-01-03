// Authentication utilities and token management

const TOKEN_KEY = 'auth_token'

export interface LoginCredentials {
  email?: string
  username?: string
  password: string
}

export interface LoginResponse {
  token?: string
  access_token?: string
  message?: string
}

/**
 * Store authentication token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

/**
 * Get authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY)
  }
  return null
}

/**
 * Remove authentication token
 */
export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

/**
 * Login function - calls backend auth endpoint
 */
export async function login(credentials: LoginCredentials): Promise<string> {
  const BASE_URL = 'https://finance-backend-ou68.onrender.com/api/v1'
  
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: credentials.username || credentials.email, // Use username if provided, otherwise use email
      password: credentials.password,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    // Handle validation errors (422)
    if (response.status === 422 && errorData.detail) {
      const detail = Array.isArray(errorData.detail) ? errorData.detail[0] : errorData.detail
      const errorMsg = detail?.msg || detail?.message || 'Validation error'
      throw new Error(errorMsg)
    }
    throw new Error(errorData.message || errorData.error || errorData.detail || 'Login failed')
  }

  const data: LoginResponse = await response.json()
  const token = data.token || data.access_token

  if (!token) {
    throw new Error('No token received from server')
  }

  setAuthToken(token)
  return token
}

/**
 * Logout function
 */
export function logout(): void {
  removeAuthToken()
}

