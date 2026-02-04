import React, { useState } from "react";
import { Box, Button, MenuItem, Paper, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody, useMediaQuery } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { CardTable } from "../components/CardTable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, listUsers, updateUser, updateUserPassword, updateUserStatus, unlockUser, setupUser2FA, confirmUser2FA, resetUser2FA } from "../api/users";
import { User } from "../types/dto";
import { useToast } from "../components/ToastProvider";
import { useSettings } from "../store/useSettings";

const empty: Omit<User, "id"> & { password?: string } = {
  username: "",
  role: "cashier",
  is_active: true,
  password: "",
};

const Users: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const cardRows = (data || []).map((u) => {
    const locked = u.locked_until && new Date(u.locked_until).getTime() > Date.now();
    return {
      key: u.id,
      title: u.username,
      subtitle: u.role,
      right: (
        <Box sx={{ display: "grid", gap: 0.5, textAlign: "right" }}>
          <Typography sx={{ fontWeight: 600 }}>{u.is_active ? "Activo" : "Inactivo"}</Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button size="small" onClick={() => { setEditingId(u.id); setForm({ username: u.username, role: u.role, is_active: u.is_active, password: "" }); }}>Editar</Button>
            <Button size="small" onClick={() => handleStatus(u.id, u.is_active)}>{u.is_active ? "Desactivar" : "Activar"}</Button>
          </Box>
        </Box>
      ),
      fields: [
        { label: "2FA", value: u.twofa_enabled ? "Activo" : "No" },
        { label: "Bloqueo", value: locked ? "Bloqueado" : "OK" },
      ],
    };
  });

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateUser(editingId, { username: form.username, role: form.role, is_active: form.is_active });
        if (form.password) {
          await updateUserPassword(editingId, form.password);
        }
        showToast({ message: "Usuario actualizado", severity: "success" });
      } else {
        await createUser({ username: form.username, password: form.password || "123456", role: form.role, is_active: form.is_active });
        showToast({ message: "Usuario creado", severity: "success" });
      }
      setForm(empty);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error", severity: "error" });
    }
  };

  const handleStatus = async (id: number, is_active: boolean) => {
    await updateUserStatus(id, !is_active);
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const handleUnlock = async (id: number) => {
    await unlockUser(id);
    qc.invalidateQueries({ queryKey: ["users"] });
    showToast({ message: "Usuario desbloqueado", severity: "success" });
  };

  const handleSetup2FA = async (id: number) => {
    const data = await setupUser2FA(id);
    showToast({ message: "2FA generado. Escanea el QR con tu app o guarda el secreto.", severity: "info" });
    const code = window.prompt("Ingrese el codigo OTP para confirmar 2FA:");
    if (!code) return;
    await confirmUser2FA(id, code);
    qc.invalidateQueries({ queryKey: ["users"] });
    showToast({ message: `2FA activado. Secreto: ${data.secret}`, severity: "success" });
  };

  const handleReset2FA = async (id: number) => {
    await resetUser2FA(id);
    qc.invalidateQueries({ queryKey: ["users"] });
    showToast({ message: "2FA desactivado", severity: "success" });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Usuarios"
        subtitle="Roles, estados y 2FA."
        icon={<GroupIcon color="primary" />}
        chips={[`Total: ${data?.length ?? 0}`]}
      />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Usuarios
        </Typography>
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Cargando usuarios...</Typography>
        ) : (data || []).length === 0 ? (
          <EmptyState title="Sin usuarios" description="No hay usuarios registrados." icon={<GroupIcon color="disabled" />} />
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
              {(data || []).map((u) => {
                const locked = u.locked_until && new Date(u.locked_until).getTime() > Date.now();
                return (
                  <TableRow key={u.id}>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.is_active ? "Activo" : "Inactivo"} {locked ? "· Bloqueado" : ""}</TableCell>
                    <TableCell>{u.twofa_enabled ? "Activo" : "No"}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => { setEditingId(u.id); setForm({ username: u.username, role: u.role, is_active: u.is_active, password: "" }); }}>Editar</Button>
                      <Button size="small" onClick={() => handleStatus(u.id, u.is_active)}>
                        {u.is_active ? "Desactivar" : "Activar"}
                      </Button>
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
        <Typography variant="h6" sx={{ mb: 2 }}>
          {editingId ? "Editar" : "Nuevo"}
        </Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField
            label="Usuario"
            placeholder="usuario@empresa"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            error={!form.username.trim() && form.username.length > 0}
            helperText={!form.username.trim() && form.username.length > 0 ? "Usuario requerido" : "Correo o usuario interno"}
          />
          <TextField select label="Rol" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
            <MenuItem value="admin">admin</MenuItem>
            <MenuItem value="cashier">cashier</MenuItem>
            <MenuItem value="stock">stock</MenuItem>
          </TextField>
          <TextField
            label="Password"
            type="password"
            placeholder="******"
            value={form.password || ""}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            helperText={editingId ? "Dejar en blanco para no cambiar" : "Minimo 6 caracteres"}
          />
          <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Users;
