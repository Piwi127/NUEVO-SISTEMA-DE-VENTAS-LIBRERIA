import React, { useState } from "react";
import { Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable } from "../../../components/CardTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";
import { PageHeader } from "../../../components/PageHeader";
import { TableToolbar } from "../../../components/TableToolbar";
import { useToast } from "../../../components/ToastProvider";
import { createUser, updateUser, updateUserPassword, updateUserStatus, unlockUser, setupUser2FA, confirmUser2FA, resetUser2FA, listUsers } from "../api";
import { User } from "../../shared/types";
import { useSettings } from "../../../store/useSettings";

const empty: Omit<User, "id"> & { password?: string } = {
  username: "",
  role: "cashier",
  is_active: true,
  password: "",
};

const Users: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const filtered = (data || []).filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return `${u.username} ${u.role}`.toLowerCase().includes(term);
  });

  const errorMessage = (err: any) => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d?.msg || d?.message || JSON.stringify(d)).join(", ");
    }
    if (detail && typeof detail === "object") {
      try {
        return JSON.stringify(detail);
      } catch {
        return "Error";
      }
    }
    return detail || "Error";
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateUser(editingId, { username: form.username, role: form.role, is_active: form.is_active });
        if (form.password) {
          await updateUserPassword(editingId, form.password);
        }
        showToast({ message: "Usuario actualizado", severity: "success" });
      } else {
        if (!form.password || !form.password.trim()) {
          showToast({ message: "Password requerido (min 10, mayuscula, minuscula y numero).", severity: "warning" });
          return;
        }
        await createUser({ username: form.username, password: form.password, role: form.role, is_active: form.is_active });
        showToast({ message: "Usuario creado", severity: "success" });
      }
      setForm(empty);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      showToast({ message: errorMessage(err), severity: "error" });
    }
  };

  const handleStatus = async (id: number, isActive: boolean) => {
    if (!window.confirm(isActive ? "Desactivar usuario?" : "Activar usuario?")) return;
    await updateUserStatus(id, !isActive);
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const handleUnlock = async (id: number) => {
    await unlockUser(id);
    qc.invalidateQueries({ queryKey: ["users"] });
    showToast({ message: "Usuario desbloqueado", severity: "success" });
  };

  const handleSetup2FA = async (id: number) => {
    const setup = await setupUser2FA(id);
    showToast({ message: "2FA generado. Confirma con codigo OTP.", severity: "info" });
    const code = window.prompt("Ingrese el codigo OTP para confirmar 2FA:");
    if (!code) return;
    await confirmUser2FA(id, code);
    qc.invalidateQueries({ queryKey: ["users"] });
    showToast({ message: `2FA activado. Secreto: ${setup.secret}`, severity: "success" });
  };

  const handleReset2FA = async (id: number) => {
    await resetUser2FA(id);
    qc.invalidateQueries({ queryKey: ["users"] });
    showToast({ message: "2FA desactivado", severity: "success" });
  };

  const cardRows = filtered.map((u) => {
    const locked = u.locked_until && new Date(u.locked_until).getTime() > Date.now();
    return {
      key: u.id,
      title: u.username,
      subtitle: u.role,
      right: (
        <Box sx={{ display: "grid", gap: 0.5, textAlign: "right" }}>
          <Typography sx={{ fontWeight: 700 }}>{u.is_active ? "Activo" : "Inactivo"}</Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button size="small" onClick={() => { setEditingId(u.id); setForm({ username: u.username, role: u.role, is_active: u.is_active, password: "" }); }}>Editar</Button>
            <Button size="small" onClick={() => handleStatus(u.id, u.is_active)}>{u.is_active ? "Desactivar" : "Activar"}</Button>
          </Box>
          <Typography variant="caption" color="text.secondary">2FA: {u.twofa_enabled ? "Activo" : "No"} | Bloqueo: {locked ? "Si" : "No"}</Typography>
        </Box>
      ),
      fields: [],
    };
  });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Usuarios"
        subtitle="Roles, estado, bloqueo y doble factor."
        icon={<GroupIcon color="primary" />}
        chips={[`Total: ${filtered.length}`]}
        loading={isLoading}
      />

      <TableToolbar title="Filtro de usuarios" subtitle="Busqueda rapida por usuario o rol.">
        <TextField label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ minWidth: 220 }} />
        <TextField select label="Rol" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="admin">admin</MenuItem>
          <MenuItem value="cashier">cashier</MenuItem>
          <MenuItem value="stock">stock</MenuItem>
        </TextField>
      </TableToolbar>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Usuarios</Typography>
        {isLoading ? (
          <LoadingState title="Cargando usuarios..." />
        ) : isError ? (
          <ErrorState title="No se pudieron cargar usuarios" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin usuarios" description="No hay usuarios con el filtro actual." icon={<GroupIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>2FA</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((u) => {
                const locked = u.locked_until && new Date(u.locked_until).getTime() > Date.now();
                return (
                  <TableRow key={u.id}>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.is_active ? "Activo" : "Inactivo"}{locked ? " | Bloqueado" : ""}</TableCell>
                    <TableCell>{u.twofa_enabled ? "Activo" : "No"}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => { setEditingId(u.id); setForm({ username: u.username, role: u.role, is_active: u.is_active, password: "" }); }}>Editar</Button>
                      <Button size="small" onClick={() => handleStatus(u.id, u.is_active)}>{u.is_active ? "Desactivar" : "Activar"}</Button>
                      <Button size="small" onClick={() => handleUnlock(u.id)} disabled={!locked}>Desbloquear</Button>
                      <Button size="small" onClick={() => handleSetup2FA(u.id)}>Config 2FA</Button>
                      <Button size="small" onClick={() => handleReset2FA(u.id)}>Reset 2FA</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{editingId ? "Editar usuario" : "Nuevo usuario"}</Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField label="Usuario" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
          <TextField select label="Rol" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
            <MenuItem value="admin">admin</MenuItem>
            <MenuItem value="cashier">cashier</MenuItem>
            <MenuItem value="stock">stock</MenuItem>
          </TextField>
          <TextField
            label="Password"
            type="password"
            value={form.password || ""}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            helperText={editingId ? "Dejar en blanco para no cambiar" : "Min 10, mayuscula, minuscula y numero"}
          />
          <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Users;
