// Authentication utilities and token management

const TOKEN_KEY = 'auth_token'
const ROLE_KEY = 'user_role'

export interface LoginCredentials {
  email?: string
  username?: string
  password: string
}

export interface LoginResponse {
  token?: string
  access_token?: string
  message?: string
  role?: string
  user_role?: string
  userRole?: string
  user?: {
    role?: string
    user_role?: string
    userRole?: string
  }
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
 * Store user role in localStorage
 */
export function setUserRole(role: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ROLE_KEY, role)
  }
}

/**
 * Get user role from localStorage
 */
export function getUserRole(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ROLE_KEY)
  }
  return null
}

/**
 * Check if user has admin role
 */
export function isAdmin(): boolean {
  const role = getUserRole()?.toLowerCase()?.trim()
  const result = role === 'admin' || role === 'administrator'
  console.log('isAdmin check: role=', role, 'result=', result)
  return result
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
 * Remove authentication token and role
 */
export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
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

  // Extract role from response (try multiple field names)
  let role = data.role || data.user_role || data.userRole || data.user?.role || data.user?.user_role

  // If role not found in response, try to extract from JWT token
  if (!role && token) {
    try {
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = token.split('.')
      if (parts.length >= 2) {
        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        role = payload.role || payload.user_role || payload.userRole || payload.roles?.[0]
      }
    } catch (e) {
      console.warn('Failed to extract role from JWT token:', e)
    }
  }

  setAuthToken(token)
  if (role) {
    setUserRole(role)
    console.log('Role stored after login:', role, 'isAdmin:', isAdmin())
  } else {
    console.warn('No role found in login response or JWT token. Full response:', data)
  }
  
  // Debug: Log stored role
  console.log('Stored role after login:', getUserRole(), 'isAdmin:', isAdmin())
  
  return token
}

/**
 * Logout function
 */
export function logout(): void {
  removeAuthToken()
}

