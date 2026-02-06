import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AppLayout, LoadingState } from "@/app/components";
import { appRoutes } from "@/modules/registry";

const App: React.FC = () => {
  const withSuspense = (node: React.ReactNode) => (
    <React.Suspense
      fallback={
        <Box sx={{ p: 2 }}>
          <LoadingState title="Cargando modulo..." rows={6} />
        </Box>
      }
    >
      {node}
    </React.Suspense>
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
              <Navigate to="/pos" replace />
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
