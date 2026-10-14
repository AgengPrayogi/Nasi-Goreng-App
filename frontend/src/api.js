import axios from 'axios'

// Set VITE_API_BASE_URL when the API is hosted on another origin.
const configuredBaseURL = import.meta.env.VITE_API_BASE_URL
const defaultBaseURL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api'
export const API_BASE_URL = (configuredBaseURL || defaultBaseURL).replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const getStoredAuthToken = () => localStorage.getItem('jwt') || localStorage.getItem('adminToken') || ''

// Attach JWT token from localStorage to every request if present
api.interceptors.request.use((config) => {
  const token = getStoredAuthToken()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers)['Authorization'] = `Bearer ${token}`
  }
  return config
})

export { getStoredAuthToken }

export default api
