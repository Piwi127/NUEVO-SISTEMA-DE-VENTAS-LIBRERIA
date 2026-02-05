import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AppLayout } from "../components/AppLayout";
import { appRoutes } from "../modules/registry";

const App: React.FC = () => {
  return (
    <Routes>
      {appRoutes
        .filter((r) => r.public)
        .map((r) => (
          <Route key={r.path} path={r.path} element={<r.component />} />
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
                    <r.component />
                  </AppLayout>
                ) : (
                  <r.component />
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
