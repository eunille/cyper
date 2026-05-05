/** Standard API response envelope — wrap all route responses in this shape. */
export interface ApiResponse<T = null> {
  data: T | null;
  error: string | null;
}

/** Paginated variant for list endpoints. */
export interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/** Helpers for building responses inside route handlers (server-only). */
export function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

export function err(message: string): ApiResponse<null> {
  return { data: null, error: message };
}
