import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const tokens = localStorage.getItem('auth_tokens');
          if (tokens) {
            const { accessToken } = JSON.parse(tokens);
            if (accessToken) {
              config.headers.Authorization = `Bearer ${accessToken}`;
            }
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            if (typeof window !== 'undefined') {
              const storedTokens = localStorage.getItem('auth_tokens');
              if (storedTokens) {
                const { refreshToken } = JSON.parse(storedTokens);
                const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                const tokens = response.data?.data || response.data;
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = tokens;

                localStorage.setItem('auth_tokens', JSON.stringify({
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken,
                }));

                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_tokens');
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        // Handle 403 Forbidden - user doesn't have permission
        if (error.response?.status === 403) {
          if (typeof window !== 'undefined') {
            // Show error message or redirect to unauthorized page
            console.error('Access forbidden: You do not have permission to access this resource');
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();

// Helper function to get tenant ID from auth context
export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  const tokens = localStorage.getItem('auth_tokens');
  if (!tokens) return null;
  try {
    const payload = JSON.parse(atob(JSON.parse(tokens).accessToken.split('.')[1]));
    return payload.tenantId || null;
  } catch {
    return null;
  }
}
