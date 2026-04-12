import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, userAuthApi } from "@/lib/user-api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: User) => void;
  register: (data: { email: string; name: string; phone: string; password: string; consent_pd: boolean; consent_photo?: string | null }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("user_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await userAuthApi.check(token);
      setUser(data.user);
    } catch {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_data");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await userAuthApi.login({ email, password });
    if (data.requires_2fa) {
      const err = new Error("2FA_REQUIRED");
      (err as Error & { pending_token: string }).pending_token = data.pending_token;
      throw err;
    }
    localStorage.setItem("user_token", data.token);
    localStorage.setItem("user_data", JSON.stringify(data.user));
    setUser(data.user);
  };

  const loginWithToken = (token: string, userData: User) => {
    localStorage.setItem("user_token", token);
    localStorage.setItem("user_data", JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (regData: { email: string; name: string; phone: string; password: string; consent_pd: boolean; consent_photo?: string | null }) => {
    const data = await userAuthApi.register(regData);
    localStorage.setItem("user_token", data.token);
    localStorage.setItem("user_data", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    const token = localStorage.getItem("user_token");
    if (token) {
      try { await userAuthApi.logout(token); } catch { /* ignore */ }
    }
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_data");
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("user_data", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export default AuthContext;