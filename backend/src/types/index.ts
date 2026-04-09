export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  companyId: number | null;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: number | null;
}
