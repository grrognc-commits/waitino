import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import api from "../services/api";
import type { User, WarehouseMapItem, ActiveCheckin, ApiResponse } from "../types";

interface CheckinHistoryItem {
  id: number;
  warehouseName: string;
  cargoType: string;
  enteredAt: string;
  exitedAt: string | null;
  waitMinutes: number | null;
  status: string;
}

interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerDriver: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    companyId?: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

interface MapSlice {
  warehouses: WarehouseMapItem[];
  activeCheckin: ActiveCheckin | null;
  recentCheckins: CheckinHistoryItem[];
  userLat: number | null;
  userLng: number | null;
  fetchWarehouses: () => Promise<void>;
  fetchMyStatus: () => Promise<void>;
  fetchRecentCheckins: () => Promise<void>;
  updateUserLocation: () => Promise<void>;
}

type AppStore = AuthSlice & MapSlice;

export type { CheckinHistoryItem };

export const useStore = create<AppStore>((set, get) => ({
  // ── Auth ──────────────────────────────
  user: null,
  isAuthenticated: false,
  isLoading: true,

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const userJson = await SecureStore.getItemAsync("user");
      if (token && userJson) {
        set({ user: JSON.parse(userJson) as User, isAuthenticated: true });
      }
    } catch {
      // corrupted
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post<ApiResponse<{ token: string; refreshToken: string; user: User }>>(
      "/auth/login",
      { email, password }
    );
    if (!data.success || !data.data) throw new Error(data.error ?? "Greška pri prijavi");
    await SecureStore.setItemAsync("token", data.data.token);
    await SecureStore.setItemAsync("refreshToken", data.data.refreshToken);
    await SecureStore.setItemAsync("user", JSON.stringify(data.data.user));
    set({ user: data.data.user, isAuthenticated: true });
  },

  registerDriver: async (payload) => {
    const { data } = await api.post<ApiResponse<{ token: string; refreshToken: string; user: User }>>(
      "/auth/register-driver",
      payload
    );
    if (!data.success || !data.data) throw new Error(data.error ?? "Greška pri registraciji");
    await SecureStore.setItemAsync("token", data.data.token);
    await SecureStore.setItemAsync("refreshToken", data.data.refreshToken);
    await SecureStore.setItemAsync("user", JSON.stringify(data.data.user));
    set({ user: data.data.user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("user");
    set({ user: null, isAuthenticated: false, warehouses: [], activeCheckin: null, recentCheckins: [] });
  },

  // ── Map / Data ────────────────────────
  warehouses: [],
  activeCheckin: null,
  recentCheckins: [],
  userLat: null,
  userLng: null,

  updateUserLocation: async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      set({ userLat: loc.coords.latitude, userLng: loc.coords.longitude });
    } catch {
      // no permission yet
    }
  },

  fetchWarehouses: async () => {
    try {
      const { data } = await api.get<ApiResponse<WarehouseMapItem[]>>("/warehouses/map");
      if (data.data) set({ warehouses: data.data });
    } catch {
      // silent — don't clear existing data
    }
  },

  fetchMyStatus: async () => {
    try {
      const { data } = await api.get<ApiResponse<ActiveCheckin[]>>("/checkins/active");
      if (data.data && data.data.length > 0) {
        set({ activeCheckin: data.data[0] });
      } else {
        set({ activeCheckin: null });
      }
    } catch {
      // don't clear on error — keep last known
    }
  },

  fetchRecentCheckins: async () => {
    try {
      const { data } = await api.get<ApiResponse<{ items: CheckinHistoryItem[] }>>(
        "/checkins/history",
        { params: { limit: 5 } }
      );
      if (data.data?.items) {
        set({ recentCheckins: data.data.items });
      }
    } catch {
      // silent
    }
  },
}));
