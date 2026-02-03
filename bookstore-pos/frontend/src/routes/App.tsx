import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AppLayout } from "../components/AppLayout";
import Login from "../pages/Login";
import POS from "../pages/POS";
import Display from "../pages/Display";
import Products from "../pages/Products";
import Inventory from "../pages/Inventory";
import Cash from "../pages/Cash";
import Purchases from "../pages/Purchases";
import Customers from "../pages/Customers";
import Suppliers from "../pages/Suppliers";
import Users from "../pages/Users";
import Reports from "../pages/Reports";
import AdminPanel from "../pages/AdminPanel";
import Promotions from "../pages/Promotions";
import PriceLists from "../pages/PriceLists";
import Returns from "../pages/Returns";
import SalesHistory from "../pages/SalesHistory";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/display/:sessionId" element={<Display />} />
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
      <Route
        path="/pos"
        element={
          <ProtectedRoute roles={["admin", "cashier"]}>
            <AppLayout>
              <POS />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/returns"
        element={
          <ProtectedRoute roles={["admin", "cashier"]}>
            <AppLayout>
              <Returns />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute roles={["admin", "stock"]}>
            <AppLayout>
              <Products />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute roles={["admin", "stock"]}>
            <AppLayout>
              <Inventory />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cash"
        element={
          <ProtectedRoute roles={["admin", "cashier"]}>
            <AppLayout>
              <Cash />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute roles={["admin", "stock"]}>
            <AppLayout>
              <Purchases />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute roles={["admin", "cashier"]}>
            <AppLayout>
              <Customers />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute roles={["admin", "stock"]}>
            <AppLayout>
              <Suppliers />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout>
              <Users />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout>
              <AdminPanel />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/promotions"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout>
              <Promotions />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/price-lists"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout>
              <PriceLists />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-history"
        element={
          <ProtectedRoute roles={["admin", "cashier"]}>
            <AppLayout>
              <SalesHistory />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
