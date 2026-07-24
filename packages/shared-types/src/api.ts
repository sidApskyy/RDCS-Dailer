export interface ApiResponse<T = unknown> {
  data: T | null;
  meta?: Record<string, unknown> | null;
  error?: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}
