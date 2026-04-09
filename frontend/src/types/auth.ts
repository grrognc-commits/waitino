export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: number | null;
  company?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface RegisterPayload {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
