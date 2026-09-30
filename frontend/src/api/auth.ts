import { api, tokenStore } from '@/api/client'
import type { TokenResponse, User } from '@/types/api'

export interface RegisterPayload {
  full_name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>('/auth/register', payload)
    tokenStore.set(data.access_token, data.refresh_token)
    return data
  },

  async login(payload: LoginPayload): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>('/auth/login', payload)
    tokenStore.set(data.access_token, data.refresh_token)
    return data
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } finally {
      tokenStore.clear()
    }
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },

  async updateProfile(full_name: string): Promise<User> {
    const { data } = await api.patch<User>('/auth/me', { full_name })
    return data
  },

  async changePassword(current_password: string, new_password: string): Promise<void> {
    await api.post('/auth/change-password', { current_password, new_password })
  },
}
