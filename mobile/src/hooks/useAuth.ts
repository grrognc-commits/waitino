import { useEffect } from "react";
import { useStore } from "../store";

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    registerDriver,
    logout,
    loadSession,
  } = useStore();

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return { user, isAuthenticated, isLoading, login, registerDriver, logout };
}
