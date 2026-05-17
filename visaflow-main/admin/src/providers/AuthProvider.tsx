import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { client, handleResponse, type InferResponse, type InferSuccessResponse } from "~/lib/api";

// Types inferred from backend
type LoginResponse = InferSuccessResponse<
  InferResponse<Awaited<ReturnType<typeof client.api.auth.login.$post>>>
>;
type RefreshResponse = InferSuccessResponse<
  InferResponse<Awaited<ReturnType<typeof client.api.auth.refresh.$post>>>
>;

interface User {
  id: string;
  email: string;
  role: "super_admin" | "org_admin";
  organizationId: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialLoad: boolean;
}

type AuthAction =
  | { type: "INIT_START" }
  | {
      type: "INIT_SUCCESS";
      payload: { user: User | null; session: Session | null };
    }
  | { type: "LOGIN_SUCCESS"; payload: { user: User; session: Session } }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean };

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialLoad: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "INIT_START":
      return { ...state, isLoading: true };
    case "INIT_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        isAuthenticated: !!action.payload.user,
        isLoading: false,
        isInitialLoad: false,
      };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        isAuthenticated: true,
        isLoading: false,
      };
    case "LOGOUT":
      return { ...initialState, isLoading: false, isInitialLoad: false };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      dispatch({ type: "INIT_START" });

      try {
        const storedSession = localStorage.getItem("session");
        const storedUser = localStorage.getItem("user");

        if (storedSession && storedUser) {
          const session = JSON.parse(storedSession) as Session;
          const user = JSON.parse(storedUser) as User;

          // Admin panel only allows super_admin users
          if (user.role !== "super_admin") {
            localStorage.removeItem("session");
            localStorage.removeItem("user");
            dispatch({
              type: "INIT_SUCCESS",
              payload: { user: null, session: null },
            });
            return;
          }

          // Check if token is expired
          if (session.expiresAt * 1000 > Date.now()) {
            dispatch({
              type: "INIT_SUCCESS",
              payload: { user, session },
            });
            return;
          }

          // Try to refresh the token
          try {
            const response = await client.api.auth.refresh.$post({
              json: { refreshToken: session.refreshToken },
            });
            const data = await handleResponse<RefreshResponse>(response);

            const newSession: Session = {
              accessToken: data.data.accessToken!,
              refreshToken: data.data.refreshToken!,
              expiresAt: data.data.expiresAt!,
            };

            localStorage.setItem("session", JSON.stringify(newSession));
            dispatch({
              type: "INIT_SUCCESS",
              payload: { user, session: newSession },
            });
            return;
          } catch {
            // Refresh failed, clear storage
            localStorage.removeItem("session");
            localStorage.removeItem("user");
          }
        }

        dispatch({
          type: "INIT_SUCCESS",
          payload: { user: null, session: null },
        });
      } catch {
        dispatch({
          type: "INIT_SUCCESS",
          payload: { user: null, session: null },
        });
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await client.api.auth.login.$post({
        json: { email, password },
      });
      const data = await handleResponse<LoginResponse>(response);

      const user: User = {
        id: data.data.user.id,
        email: data.data.user.email,
        role: data.data.user.role as "super_admin" | "org_admin",
        organizationId: data.data.user.organizationId,
        firstName: data.data.user.firstName,
        lastName: data.data.user.lastName,
      };

      // Admin panel only allows super_admin users
      if (user.role !== "super_admin") {
        dispatch({ type: "SET_LOADING", payload: false });
        throw new Error("Access denied");
      }

      const session: Session = {
        accessToken: data.data.session.accessToken,
        refreshToken: data.data.session.refreshToken,
        expiresAt: data.data.session.expiresAt!,
      };

      localStorage.setItem("session", JSON.stringify(session));
      localStorage.setItem("user", JSON.stringify(user));

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user, session },
      });
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const response = await client.api.auth.logout.$post();
      await handleResponse<{ success: boolean }>(response);
    } catch {
      // Ignore errors during logout
    }

    localStorage.removeItem("session");
    localStorage.removeItem("user");
    dispatch({ type: "LOGOUT" });
  }, []);

  const refreshSession = useCallback(async () => {
    if (!state.session) return;

    try {
      const response = await client.api.auth.refresh.$post({
        json: { refreshToken: state.session.refreshToken },
      });
      const data = await handleResponse<RefreshResponse>(response);

      const newSession: Session = {
        accessToken: data.data.accessToken!,
        refreshToken: data.data.refreshToken!,
        expiresAt: data.data.expiresAt!,
      };

      localStorage.setItem("session", JSON.stringify(newSession));
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: state.user!, session: newSession },
      });
    } catch {
      await logout();
    }
  }, [state.session, state.user, logout]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
