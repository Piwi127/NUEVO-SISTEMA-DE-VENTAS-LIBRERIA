import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { useAuth } from "@/auth/AuthProvider";
import { getLandingRoute } from "@/auth/navigation";
import { AppLayout, ErrorState, LoadingState } from "@/app/components";
import { recoverFromModuleLoadError } from "@/app/utils/moduleLoadRecovery";
import { appRoutes } from "@/modules/registry";

class RouteErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (recoverFromModuleLoadError(error)) {
      return;
    }
    console.error("Route render error", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2 }}>
          <ErrorState title="No se pudo cargar la vista" onRetry={this.handleReload} />
        </Box>
      );
    }
    return this.props.children;
  }
}

const RoleHomeRedirect: React.FC = () => {
  const { role } = useAuth();
  return <Navigate to={getLandingRoute(role)} replace />;
};

// Componente principal de rutas
// Define las rutas públicas y protegidas de la aplicación
  const withSuspense = (node: React.ReactNode) => (
    <RouteErrorBoundary>
      <React.Suspense
        fallback={
          <Box sx={{ p: 2 }}>
            <LoadingState title="Cargando modulo..." rows={6} />
          </Box>
        }
      >
        {node}
      </React.Suspense>
    </RouteErrorBoundary>
  );

  return (
    <Routes>
      {appRoutes
        .filter((r) => r.public)
        .map((r) => (
          <Route key={r.path} path={r.path} element={withSuspense(<r.component />)} />
        ))}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleHomeRedirect />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {appRoutes
        .filter((r) => !r.public)
        .map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={
              <ProtectedRoute roles={r.roles}>
                {r.layout ? (
                  <AppLayout>
                    {withSuspense(<r.component />)}
                  </AppLayout>
                ) : (
                  withSuspense(<r.component />)
                )}
              </ProtectedRoute>
            }
          />
        ))}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
