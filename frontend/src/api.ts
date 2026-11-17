/**
 * API client to communicate with the local Python FastAPI sidecar.
 * The backend should be running on localhost:8000.
 */
const BASE_URL = "http://127.0.0.1:8000/api";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

async function request<T>(endpoint: string, method: HttpMethod = "GET", body?: any, bypassCache: boolean = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("smartar_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
    ...(bypassCache && { cache: "no-store" }),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401 && endpoint !== "/auth/login") {
            // Clear invalid token if unauthorized
            localStorage.removeItem("smartar_token");
        }
        throw new Error(data.detail || data.message || "An error occurred");
    }

    return data as T;
  } catch (error: any) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const API = {
  auth: {
    login: async (data: any) => {
      const res: any = await request("/auth/login", "POST", data);
      if (res?.token || res?.access_token) {
         localStorage.setItem("smartar_token", res.token || res.access_token);
      }
      return res;
    },
    register: async (data: any) => {
      const res: any = await request("/auth/register", "POST", data);
      if (res?.token || res?.access_token) {
         localStorage.setItem("smartar_token", res.token || res.access_token);
      }
      return res;
    },
    checkEmail: (data: { email: string }) => request("/auth/check-email", "POST", data),
    verifyAccount: async (data: { otp: string }) => {
      const res: any = await request("/auth/verify-account", "POST", data);
      if (res?.token || res?.access_token) {
         localStorage.setItem("smartar_token", res.token || res.access_token);
      }
      return res;
    },
    resendOtp: () => request("/auth/resend-otp", "POST"),
    getMe: () => request("/auth/me"),
    logout: () => {
      localStorage.removeItem("smartar_token");
    },
    forgotPasswordRequest: (email: string) => request("/auth/forgot-password/request", "POST", { email }),
    forgotPasswordVerify: (data: any) => request("/auth/forgot-password/verify", "POST", data),
    resetPassword: (data: any) => request("/auth/reset-password", "POST", data),
  },
  user: {
    getMe: () => request("/user/me", "GET", undefined, true),
    getProfile: (traineeId: number) => request(`/user/${traineeId}`, "GET", undefined, true),
  },
  workouts: {
    getPlan: (planId: number) => request(`/workouts/plan/${planId}`, "GET", undefined, true),
    getAll: () => request(`/workouts/all`, "GET", undefined, true),
    getById: (workoutId: number | string) => request(`/workouts/${workoutId}`),
  },
  analytics: {
    getAnalytics: (traineeId: number, timeframe: string = "this_week") =>
       request(`/analytics/${traineeId}?timeframe=${timeframe}`, "GET", undefined, true),
    getCalendar: (traineeId: number) => request(`/calendar/${traineeId}`, "GET", undefined, true),
  },
  unity: {
    startSession: (hwnd: number, workoutName: string, userGender: string, targetWidth: number, targetHeight: number, x: number, y: number) =>
        request("/unity/start", "POST", { hwnd, workout_name: workoutName, user_gender: userGender, targetWidth, targetHeight, x, y }),
    stopSession: () => request("/unity/stop", "POST"),
  },
  session: {
     create: (traineeId: number) => request("/session/new", "POST", { trainee_id: traineeId }),
     save: () => request("/session/save", "POST"),
  }
};
