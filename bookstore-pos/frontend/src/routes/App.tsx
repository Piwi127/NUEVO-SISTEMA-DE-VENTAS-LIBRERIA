import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AppLayout } from "../components/AppLayout";
import Login from "../pages/auth/Login";
import POS from "../pages/pos/POS";
import Display from "../pages/pos/Display";
import Products from "../pages/catalog/Products";
import Inventory from "../pages/inventory/Inventory";
import Cash from "../pages/pos/Cash";
import Purchases from "../pages/inventory/Purchases";
import Customers from "../pages/catalog/Customers";
import Suppliers from "../pages/catalog/Suppliers";
import Users from "../pages/admin/Users";
import Reports from "../pages/reports/Reports";
import AdminPanel from "../pages/admin/AdminPanel";
import Promotions from "../pages/catalog/Promotions";
import PriceLists from "../pages/catalog/PriceLists";
import Returns from "../pages/pos/Returns";
import SalesHistory from "../pages/pos/SalesHistory";

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
