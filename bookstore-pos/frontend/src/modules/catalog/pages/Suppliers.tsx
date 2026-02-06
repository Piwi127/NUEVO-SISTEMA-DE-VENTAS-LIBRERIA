import React, { useState } from "react";
import { Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable } from "../../../components/CardTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";
import { PageHeader } from "../../../components/PageHeader";
import { TableToolbar } from "../../../components/TableToolbar";
import { useToast } from "../../../components/ToastProvider";
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from "../api";
import { Supplier } from "../../shared/types";
import { useSettings } from "../../../store/useSettings";

const empty: Omit<Supplier, "id"> = { name: "", phone: "" };

const Suppliers: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });

  const [form, setForm] = useState<Omit<Supplier, "id">>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const filtered = (data || []).filter((s) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return `${s.name} ${s.phone || ""}`.toLowerCase().includes(term);
  });

  const cardRows = filtered.map((s) => ({
    key: s.id,
    title: s.name,
    subtitle: s.phone || "-",
    right: <Typography sx={{ fontWeight: 700 }}>{s.phone || "-"}</Typography>,
    fields: [],
  }));

  const handleSubmit = async () => {
    if (editingId) {
      await updateSupplier(editingId, form);
      showToast({ message: "Proveedor actualizado", severity: "success" });
    } else {
      await createSupplier(form);
      showToast({ message: "Proveedor creado", severity: "success" });
    }
    setForm(empty);
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Eliminar proveedor?")) return;
    await deleteSupplier(id);
    showToast({ message: "Proveedor eliminado", severity: "success" });
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader title="Proveedores" subtitle="Directorio y contacto comercial." icon={<LocalShippingIcon color="primary" />} chips={[`Total: ${filtered.length}`]} loading={isLoading} />

      <TableToolbar title="Busqueda" subtitle="Filtra por nombre o telefono.">
        <TextField label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ minWidth: 280 }} />
      </TableToolbar>

      <Paper sx={{ p: 2 }}>
        {isLoading ? (
          <LoadingState title="Cargando proveedores..." />
        ) : isError ? (
          <ErrorState title="No se pudieron cargar proveedores" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin proveedores" description="No hay proveedores con ese filtro." icon={<LocalShippingIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Telefono</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.phone || "-"}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => { setEditingId(s.id); setForm({ name: s.name, phone: s.phone || "" }); }}>Editar</Button>
                    <Button size="small" color="error" onClick={() => handleDelete(s.id)}>Eliminar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{editingId ? "Editar proveedor" : "Nuevo proveedor"}</Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField label="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <TextField label="Telefono" value={form.phone || ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <Button variant="contained" onClick={handleSubmit} disabled={!form.name.trim()}>Guardar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Suppliers;
