import api from "./api";
import type { ApiResponse, LoginResponse, RegisterPayload } from "../types/auth";

export async function loginApi(email: string, password: string) {
  const { data } = await api.post<ApiResponse<LoginResponse>>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function registerApi(payload: RegisterPayload) {
  const { data } = await api.post<ApiResponse<LoginResponse>>(
    "/auth/register",
    payload
  );
  return data;
}

export async function refreshTokenApi(refreshToken: string) {
  const { data } = await api.post<
    ApiResponse<{ token: string; refreshToken: string }>
  >("/auth/refresh", { refreshToken });
  return data;
}
