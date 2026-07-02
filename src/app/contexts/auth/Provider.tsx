// Import Dependencies
import { useEffect, useReducer, ReactNode } from "react";

// Local Imports
import axios from "@/utils/axios";
import { isTokenValid, setSession } from "@/utils/jwt";
import { AuthProvider as AuthContext, AuthContextType } from "./context";
import { User } from "@/@types/user";

// ----------------------------------------------------------------------

const LOCAL_AUTH_ACCOUNTS = [
  {
    id: "local-admin",
    role: "admin",
    username: atob("Q3Jpc0FkbWlu"),
    password: atob("aGVycmVyYTUwNDU="),
  },
  {
    id: "call-center",
    role: "call-center",
    username: atob("Q2FsbENlbnRlcg=="),
    password: atob("Q2FsbDEyMzQ="),
  },
];
const LOCAL_AUTH_TOKEN_PREFIX = "orders-dashboard-local-auth";

interface AuthAction {
  type:
    | "INITIALIZE"
    | "LOGIN_REQUEST"
    | "LOGIN_SUCCESS"
    | "LOGIN_ERROR"
    | "LOGOUT";
  payload?: Partial<AuthContextType>;
}

// Initial state
const initialState: AuthContextType = {
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  errorMessage: null,
  user: null,
  login: async () => {},
  logout: async () => {},
};

// Reducer handlers
const reducerHandlers: Record<
  AuthAction["type"],
  (state: AuthContextType, action: AuthAction) => AuthContextType
> = {
  INITIALIZE: (state, action) => ({
    ...state,
    isAuthenticated: action.payload?.isAuthenticated ?? false,
    isInitialized: true,
    user: action.payload?.user ?? null,
  }),

  LOGIN_REQUEST: (state) => ({
    ...state,
    isLoading: true,
  }),

  LOGIN_SUCCESS: (state, action) => ({
    ...state,
    isAuthenticated: true,
    isLoading: false,
    user: action.payload?.user ?? null,
  }),

  LOGIN_ERROR: (state, action) => ({
    ...state,
    errorMessage: action.payload?.errorMessage ?? "An error occurred",
    isLoading: false,
  }),

  LOGOUT: (state) => ({
    ...state,
    isAuthenticated: false,
    user: null,
  }),
};

// Reducer function
const reducer = (
  state: AuthContextType,
  action: AuthAction,
): AuthContextType => {
  const handler = reducerHandlers[action.type];
  return handler ? handler(state, action) : state;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const init = async () => {
      try {
        const authToken = window.localStorage.getItem("authToken");
        const localAccount =
          authToken === LOCAL_AUTH_TOKEN_PREFIX
            ? LOCAL_AUTH_ACCOUNTS[0]
            : LOCAL_AUTH_ACCOUNTS.find(
                (account) => authToken === `${LOCAL_AUTH_TOKEN_PREFIX}:${account.id}`,
              );

        if (localAccount) {
          dispatch({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: true,
              user: {
                id: localAccount.id,
                name: localAccount.username,
                role: localAccount.role,
              },
            },
          });
          return;
        }

        if (authToken && isTokenValid(authToken)) {
          setSession(authToken);

          const response = await axios.get<{ user: User }>("/user/profile");
          const { user } = response.data;

          dispatch({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: true,
              user,
            },
          });
        } else {
          dispatch({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: false,
              user: null,
            },
          });
        }
      } catch (err) {
        console.error(err);
        dispatch({
          type: "INITIALIZE",
          payload: {
            isAuthenticated: false,
            user: null,
          },
        });
      }
    };

    init();
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    dispatch({ type: "LOGIN_REQUEST" });

    const account = LOCAL_AUTH_ACCOUNTS.find(
      (item) =>
        item.username === credentials.username.trim() &&
        item.password === credentials.password,
    );

    if (!account) {
      dispatch({
        type: "LOGIN_ERROR",
        payload: { errorMessage: "Usuario o contrasena incorrectos" },
      });
      return;
    }

    const user: User = {
      id: account.id,
      name: account.username,
      role: account.role,
    };

    window.localStorage.setItem("authToken", `${LOCAL_AUTH_TOKEN_PREFIX}:${account.id}`);
    dispatch({
      type: "LOGIN_SUCCESS",
      payload: { user },
    });
  /*   try {
      const response = await axios.post<{ authToken: string; user: User }>(
        "/login",
        {
          userNameOrEmail: credentials.username,
          password: credentials.password,
        }
      );
      const { authToken, user } = response.data;

      if (
        typeof authToken !== "string" ||
        typeof user !== "object" ||
        user === null
      ) {
        throw new Error("Response is not valid");
      }

      setSession(authToken);

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user },
      });
    } catch (err) {
      dispatch({
        type: "LOGIN_ERROR",
        payload: {
          errorMessage: err instanceof Error ? err.message : "Login failed",
        },
      });
    } */
  };

  const logout = async () => {
    setSession(null);
    dispatch({ type: "LOGOUT" });
  };

  if (!children) {
    return null;
  }

  return (
    <AuthContext
      value={{
        ...state,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}
