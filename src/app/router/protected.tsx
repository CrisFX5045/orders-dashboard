import { Navigate, RouteObject } from "react-router";

import AuthGuard from "@/middleware/AuthGuard";

const protectedRoutes: RouteObject = {
  id: "protected",
  Component: AuthGuard,
  children: [
    {
      index: true,
      lazy: async () => ({
        Component: (await import("@/app/pages/orders-dashboard")).default,
      }),
    },
    {
      path: "orders-dashboard",
      element: <Navigate to="/" replace />,
    },
  ],
};

export { protectedRoutes };
