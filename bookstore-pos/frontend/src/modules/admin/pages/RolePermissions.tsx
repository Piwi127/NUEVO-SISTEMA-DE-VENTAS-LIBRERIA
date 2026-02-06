import React, { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import { PageHeader } from "../../../components/PageHeader";
import { useToast } from "../../../components/ToastProvider";
import { getRolePermissions, updateRolePermissions } from "../api";

const PERMISSION_GROUPS: {
  title: string;
  items: { key: string; label: string; description: string }[];
}[] = [
  {
    title: "Ventas / POS",
    items: [
      { key: "sales.read", label: "Ver ventas", description: "Acceso a historial y detalle de ventas." },
      { key: "sales.create", label: "Registrar ventas", description: "Permite crear ventas y cobrar." },
      { key: "returns.create", label: "Devoluciones", description: "Permite anular/retornar ventas." },
    ],
  },
  {
    title: "Caja",
    items: [
      { key: "cash.open", label: "Abrir caja", description: "Permite abrir caja y ver estado actual." },
      { key: "cash.close", label: "Cerrar caja", description: "Permite cierre y arqueo de caja." },
      { key: "cash.movement", label: "Movimientos", description: "Permite ingresos/egresos manuales." },
    ],
  },
  {
    title: "Clientes / Productos",
    items: [
      { key: "customers.read", label: "Ver clientes", description: "Acceso al listado de clientes." },
      { key: "customers.write", label: "Editar clientes", description: "Crear/editar/eliminar clientes." },
      { key: "products.read", label: "Ver productos", description: "Acceso al catalogo de productos." },
      { key: "products.write", label: "Editar productos", description: "Crear/editar/eliminar productos." },
    ],
  },
  {
    title: "Inventario / Compras",
    items: [
      { key: "inventory.read", label: "Ver inventario", description: "Acceso a stock y kardex." },
      { key: "inventory.write", label: "Operar inventario", description: "Movimientos, ajustes y conteos." },
      { key: "purchases.read", label: "Ver compras", description: "Acceso a OC e historial de compras." },
      { key: "purchases.create", label: "Registrar compras", description: "Crear OC, recepciones y pagos." },
    ],
  },
  {
    title: "Proveedores",
    items: [
      { key: "suppliers.read", label: "Ver proveedores", description: "Acceso al listado de proveedores." },
      { key: "suppliers.write", label: "Editar proveedores", description: "Crear/editar/eliminar proveedores." },
    ],
  },
  {
    title: "Reportes",
    items: [{ key: "reports.read", label: "Ver reportes", description: "Acceso a reportes y exportaciones." }],
  },
  {
    title: "Administracion",
    items: [
      { key: "settings.read", label: "Ver configuracion", description: "Acceso a parametros del sistema." },
      { key: "settings.write", label: "Editar configuracion", description: "Modificar parametros y ajustes." },
      { key: "users.read", label: "Ver usuarios", description: "Acceso al listado de usuarios." },
      { key: "users.write", label: "Administrar usuarios", description: "Crear, editar, bloquear y resetear." },
      { key: "permissions.read", label: "Ver permisos", description: "Consultar permisos por rol." },
      { key: "permissions.write", label: "Editar permisos", description: "Modificar permisos por rol." },
      { key: "audit.read", label: "Ver auditoria", description: "Acceso a logs de auditoria." },
      { key: "admin.backup", label: "Backup", description: "Descargar respaldo de la base." },
    ],
  },
];

const RolePermissions: React.FC = () => {
  const { showToast } = useToast();
  const [role, setRole] = useState("cashier");
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const loadPerms = async () => {
      setLoading(true);
      try {
        const res = await getRolePermissions(role);
        setRolePerms(res.permissions);
      } catch {
        setRolePerms([]);
      } finally {
        setLoading(false);
      }
    };
    loadPerms();
  }, [role]);

  const togglePerm = (perm: string) => {
    setRolePerms((prev) => (prev.includes(perm) ? prev.filter((x) => x !== perm) : [...prev, perm]));
  };

  const handleSavePerms = async () => {
    await updateRolePermissions(role, rolePerms);
    showToast({ message: "Permisos actualizados", severity: "success" });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Permisos por rol"
        subtitle="Configura permisos operativos por perfil de usuario."
        icon={<SecurityIcon color="primary" />}
        loading={loading}
      />

      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
          <TextField select label="Rol" value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="cashier">cashier</MenuItem>
            <MenuItem value="stock">stock</MenuItem>
          </TextField>
          <Button variant="contained" onClick={handleSavePerms}>Guardar permisos</Button>
        </Stack>

        <Grid container spacing={2}>
          {PERMISSION_GROUPS.map((group) => (
            <Grid item xs={12} md={6} key={group.title}>
              <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                  {group.title}
                </Typography>
                <Grid container spacing={1}>
                  {group.items.map((item) => (
                    <Grid item xs={12} sm={6} key={item.key}>
                      <FormControlLabel
                        control={<Checkbox checked={rolePerms.includes(item.key)} onChange={() => togglePerm(item.key)} />}
                        label={item.label}
                      />
                      <Typography variant="caption" sx={{ display: "block", ml: 4, color: "text.secondary" }}>
                        {item.description}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default RolePermissions;
