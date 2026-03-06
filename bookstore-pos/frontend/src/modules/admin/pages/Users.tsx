import React, { useState } from "react";
import { Box, Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, ResizableTable, TableToolbar, useToast } from "@/app/components";
import { confirmUser2FA, createUser, listUsers, resetUser2FA, setupUser2FA, unlockUser, updateUser, updateUserPassword, updateUserStatus } from "@/modules/admin/api";
import { User } from "@/modules/shared/types";
import { getPasswordStrengthLabel, getPasswordStrengthScore, hasRequiredPasswordStrength } from "@/app/utils";
import { useSettings } from "@/app/store";

const roleOptions = ["admin", "cashier", "stock"] as const;

const userFormSchema = z.object({
  username: z.string().trim().min(3, "Ingresa al menos 3 caracteres.").max(50, "El usuario es demasiado largo."),
  role: z.enum(roleOptions),
  password: z.string(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type UserActionTarget = {
  id: number;
  username: string;
  is_active: boolean;
  twofa_enabled: boolean;
};

type Setup2FAState = {
  user: UserActionTarget;
  secret: string;
};

const defaultValues: UserFormValues = {
  username: "",
  role: "cashier",
  password: "",
};

const Users: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingIsActive, setEditingIsActive] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusTarget, setStatusTarget] = useState<UserActionTarget | null>(null);
  const [reset2FATarget, setReset2FATarget] = useState<UserActionTarget | null>(null);
  const [setup2FAState, setSetup2FAState] = useState<Setup2FAState | null>(null);
  const [setup2FAOtp, setSetup2FAOtp] = useState("");
  const [setup2FALoading, setSetup2FALoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [reset2FALoading, setReset2FALoading] = useState(false);
  const [unlockingUserId, setUnlockingUserId] = useState<number | null>(null);
  const [setupRequestUserId, setSetupRequestUserId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");

  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const {
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    mode: "onChange",
    defaultValues,
  });

  const filtered = (data || []).filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return `${user.username} ${user.role}`.toLowerCase().includes(term);
  });

  const passwordValue = watch("password");
  const passwordScore = getPasswordStrengthScore(passwordValue);
  const passwordLabel = passwordValue ? getPasswordStrengthLabel(passwordValue) : editingId ? "Sin cambios" : "Pendiente";
  const passwordColor = passwordValue ? (passwordScore >= 4 ? "success.main" : "warning.main") : "text.secondary";
  const passwordMissingOnCreate = !editingId && !passwordValue;

  const errorMessage = (err: any) => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join(", ");
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

  const generateStrongPassword = () => {
    const base = `BsP${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}!a`;
    setSubmitError("");
    setValue("password", base, { shouldDirty: true, shouldValidate: true });
    showToast({ message: "Password sugerida generada.", severity: "info" });
  };

  const startEdit = (user: User) => {
    const normalizedRole = roleOptions.includes(user.role as (typeof roleOptions)[number]) ? (user.role as UserFormValues["role"]) : "cashier";
    setEditingId(user.id);
    setEditingIsActive(user.is_active);
    setSubmitError("");
    reset({
      username: user.username,
      role: normalizedRole,
      password: "",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingIsActive(true);
    setSubmitError("");
    reset(defaultValues);
  };

  const onSubmit = async (values: UserFormValues) => {
    setSubmitError("");
    try {
      if (editingId) {
        await updateUser(editingId, { username: values.username.trim(), role: values.role, is_active: editingIsActive });
        if (values.password) {
          await updateUserPassword(editingId, values.password);
        }
        showToast({ message: "Usuario actualizado", severity: "success" });
      } else {
        await createUser({ username: values.username.trim(), password: values.password, role: values.role, is_active: true });
        showToast({ message: "Usuario creado", severity: "success" });
      }
      resetForm();
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      const message = errorMessage(err);
      setSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const handleConfirmStatus = async () => {
    if (!statusTarget) return;
    try {
      setStatusLoading(true);
      await updateUserStatus(statusTarget.id, !statusTarget.is_active);
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: statusTarget.is_active ? "Usuario desactivado" : "Usuario activado", severity: "success" });
      if (editingId === statusTarget.id) {
        setEditingIsActive(!statusTarget.is_active);
      }
      setStatusTarget(null);
    } catch (err: any) {
      showToast({ message: errorMessage(err), severity: "error" });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleUnlock = async (id: number) => {
    try {
      setUnlockingUserId(id);
      await unlockUser(id);
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: "Usuario desbloqueado", severity: "success" });
    } catch (err: any) {
      showToast({ message: errorMessage(err), severity: "error" });
    } finally {
      setUnlockingUserId(null);
    }
  };

  const handleSetup2FA = async (user: UserActionTarget) => {
    try {
      setSetupRequestUserId(user.id);
      const setup = await setupUser2FA(user.id);
      setSetup2FAState({ user, secret: setup.secret });
      setSetup2FAOtp("");
      showToast({ message: "2FA generado. Ingresa el codigo OTP para confirmarlo.", severity: "info" });
    } catch (err: any) {
      showToast({ message: errorMessage(err), severity: "error" });
    } finally {
      setSetupRequestUserId(null);
    }
  };

  const handleConfirmSetup2FA = async () => {
    if (!setup2FAState || !setup2FAOtp.trim()) return;
    try {
      setSetup2FALoading(true);
      await confirmUser2FA(setup2FAState.user.id, setup2FAOtp.trim());
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: `2FA activado para ${setup2FAState.user.username}`, severity: "success" });
      setSetup2FAState(null);
      setSetup2FAOtp("");
    } catch (err: any) {
      showToast({ message: errorMessage(err), severity: "error" });
    } finally {
      setSetup2FALoading(false);
    }
  };

  const handleReset2FA = async () => {
    if (!reset2FATarget) return;
    try {
      setReset2FALoading(true);
      await resetUser2FA(reset2FATarget.id);
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: "2FA desactivado", severity: "success" });
      setReset2FATarget(null);
    } catch (err: any) {
      showToast({ message: errorMessage(err), severity: "error" });
    } finally {
      setReset2FALoading(false);
    }
  };

  const cardRows = filtered.map((user) => {
    const locked = user.locked_until && new Date(user.locked_until).getTime() > Date.now();
    const actionTarget: UserActionTarget = {
      id: user.id,
      username: user.username,
      is_active: user.is_active,
      twofa_enabled: !!user.twofa_enabled,
    };
    return {
      key: user.id,
      title: user.username,
      subtitle: user.role,
      right: (
        <Stack spacing={1} sx={{ alignItems: "flex-end", minWidth: 220 }}>
          <Typography sx={{ fontWeight: 700 }}>{user.is_active ? "Activo" : "Inactivo"}</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Button size="small" onClick={() => startEdit(user)}>
              Editar
            </Button>
            <Button size="small" onClick={() => setStatusTarget(actionTarget)}>
              {user.is_active ? "Desactivar" : "Activar"}
            </Button>
            <Button size="small" onClick={() => handleUnlock(user.id)} disabled={!locked || unlockingUserId === user.id}>
              {unlockingUserId === user.id ? "Desbloqueando..." : "Desbloquear"}
            </Button>
            <Button size="small" onClick={() => handleSetup2FA(actionTarget)} disabled={setupRequestUserId === user.id}>
              {setupRequestUserId === user.id ? "Preparando..." : "Config 2FA"}
            </Button>
            <Button size="small" color="warning" onClick={() => setReset2FATarget(actionTarget)} disabled={!user.twofa_enabled}>
              Reset 2FA
            </Button>
          </Box>
        </Stack>
      ),
      fields: [
        { label: "2FA", value: user.twofa_enabled ? "Activo" : "No" },
        { label: "Bloqueo", value: locked ? "Si" : "No" },
      ],
    };
  });

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
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
          {roleOptions.map((role) => (
            <MenuItem key={role} value={role}>
              {role}
            </MenuItem>
          ))}
        </TextField>
      </TableToolbar>

      <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
        <Typography variant="h6" sx={{ mb: 1.1 }}>
          Usuarios
        </Typography>
        {isLoading ? (
          <LoadingState title="Cargando usuarios..." />
        ) : isError ? (
          <ErrorState title="No se pudieron cargar usuarios" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin usuarios" description="No hay usuarios con el filtro actual." icon={<GroupIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          <ResizableTable minHeight={250}><Table size="small" stickyHeader>
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
              {filtered.map((user) => {
                const locked = user.locked_until && new Date(user.locked_until).getTime() > Date.now();
                const actionTarget: UserActionTarget = {
                  id: user.id,
                  username: user.username,
                  is_active: user.is_active,
                  twofa_enabled: !!user.twofa_enabled,
                };
                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      {user.is_active ? "Activo" : "Inactivo"}
                      {locked ? " | Bloqueado" : ""}
                    </TableCell>
                    <TableCell>{user.twofa_enabled ? "Activo" : "No"}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => startEdit(user)}>
                        Editar
                      </Button>
                      <Button size="small" onClick={() => setStatusTarget(actionTarget)}>
                        {user.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button size="small" onClick={() => handleUnlock(user.id)} disabled={!locked || unlockingUserId === user.id}>
                        {unlockingUserId === user.id ? "Desbloqueando..." : "Desbloquear"}
                      </Button>
                      <Button size="small" onClick={() => handleSetup2FA(actionTarget)} disabled={setupRequestUserId === user.id}>
                        {setupRequestUserId === user.id ? "Preparando..." : "Config 2FA"}
                      </Button>
                      <Button size="small" color="warning" onClick={() => setReset2FATarget(actionTarget)} disabled={!user.twofa_enabled}>
                        Reset 2FA
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></ResizableTable>
        )}
      </Paper>

      <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
        <Typography variant="h6" sx={{ mb: 1.1 }}>
          {editingId ? "Editar usuario" : "Nuevo usuario"}
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "grid", gap: 1.1, maxWidth: 460 }}>
          {submitError ? (
            <Typography variant="body2" color="error">
              {submitError}
            </Typography>
          ) : null}
          {isDirty ? (
            <Typography variant="caption" color="text.secondary">
              Hay cambios pendientes por guardar.
            </Typography>
          ) : null}
          <TextField
            label="Usuario"
            error={!!errors.username}
            helperText={errors.username?.message || "Nombre de acceso visible en auditoria y reportes."}
            {...register("username", {
              onChange: () => setSubmitError(""),
            })}
          />
          <TextField
            select
            label="Rol"
            error={!!errors.role}
            helperText={errors.role?.message || "Define el permiso principal del usuario."}
            {...register("role", {
              onChange: () => setSubmitError(""),
            })}
          >
            {roleOptions.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Password"
            type="password"
            error={!!errors.password}
            helperText={
              errors.password?.message ||
              (editingId
                ? "Dejalo vacio si no quieres cambiar la clave."
                : "Minimo 10 caracteres, con mayuscula, minuscula y numero.")
            }
            {...register("password", {
              onChange: () => setSubmitError(""),
              validate: (value) => {
                if (!editingId && !value) {
                  return "Ingresa un password seguro para crear el usuario.";
                }
                if (value && !hasRequiredPasswordStrength(value)) {
                  return "Usa al menos 10 caracteres, una mayuscula, una minuscula y un numero.";
                }
                return true;
              },
            })}
          />
          <Typography variant="caption" color={passwordColor}>
            Seguridad de password: {passwordLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {editingId ? `Estado actual: ${editingIsActive ? "Activo" : "Inactivo"}.` : "Los usuarios nuevos se crean activos por defecto."} Los cambios de estado se gestionan desde las acciones rapidas.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button type="button" variant="outlined" onClick={generateStrongPassword} disabled={isSubmitting}>
              Generar password segura
            </Button>
            <Button type="submit" variant="contained" disabled={!isValid || isSubmitting || passwordMissingOnCreate}>
              {isSubmitting ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outlined" onClick={resetForm} disabled={isSubmitting}>
                Cancelar edicion
              </Button>
            ) : null}
          </Stack>
        </Box>
      </Paper>

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.is_active ? "Desactivar usuario" : "Activar usuario"}
        description={
          statusTarget
            ? `${statusTarget.is_active ? "Se desactivara" : "Se activara"} el usuario "${statusTarget.username}".`
            : undefined
        }
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleConfirmStatus}
        confirmText={statusTarget?.is_active ? "Desactivar" : "Activar"}
        confirmColor={statusTarget?.is_active ? "warning" : "primary"}
        loading={statusLoading}
      />

      <ConfirmDialog
        open={!!reset2FATarget}
        title="Resetear 2FA"
        description={reset2FATarget ? `Se eliminara la configuracion 2FA de "${reset2FATarget.username}".` : undefined}
        onCancel={() => setReset2FATarget(null)}
        onConfirm={handleReset2FA}
        confirmText="Resetear 2FA"
        confirmColor="warning"
        loading={reset2FALoading}
      />

      <ConfirmDialog
        open={!!setup2FAState}
        title={setup2FAState ? `Confirmar 2FA para ${setup2FAState.user.username}` : "Confirmar 2FA"}
        description="Se genero un secreto para este usuario. Ingresa el codigo OTP para terminar la activacion."
        content={
          setup2FAState ? (
            <Box sx={{ display: "grid", gap: 1.5 }}>
              <TextField label="Secreto generado" value={setup2FAState.secret} InputProps={{ readOnly: true }} />
              <TextField
                autoFocus
                label="Codigo OTP"
                value={setup2FAOtp}
                onChange={(e) => setSetup2FAOtp(e.target.value)}
                inputProps={{ inputMode: "numeric" }}
              />
            </Box>
          ) : undefined
        }
        onCancel={() => {
          setSetup2FAState(null);
          setSetup2FAOtp("");
        }}
        onConfirm={handleConfirmSetup2FA}
        confirmText="Activar 2FA"
        disableConfirm={!setup2FAOtp.trim()}
        loading={setup2FALoading}
      />
    </Box>
  );
};

export default Users;

