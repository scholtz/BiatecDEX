import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { getAuthToken } from '../service/authService'

// A shared axios instance used by the generated client.
// You can customize headers, interceptors, or baseURL here.
const instance: AxiosInstance = axios.create({
  baseURL: (import.meta as any)?.env?.VITE_API_BASE_URL || 'https://algorand-trades.de-4.biatec.io'
})

// Attach ARC-0014 Authorization automatically
instance.interceptors.request.use(async (cfg) => {
  try {
    const token = await getAuthToken()
    cfg.headers = cfg.headers ?? {}
    // Don't override if caller explicitly set Authorization
    if (!('Authorization' in cfg.headers)) {
      ;(cfg.headers as any)['Authorization'] = token
    }
  } catch {
    // ignore token failures; request proceeds unauthenticated
  }
  return cfg
})

export const axiosInstance = <R = unknown>(config: AxiosRequestConfig) => {
  return instance.request<R>(config as AxiosRequestConfig)
}
