import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, useMediaQuery } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { PageHeader } from "../../components/PageHeader";
import { TableToolbar } from "../../components/TableToolbar";
import { EmptyState } from "../../components/EmptyState";
import { CardTable } from "../../components/CardTable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from "../../api/suppliers";
import { Supplier } from "../../types/dto";
import { useToast } from "../../components/ToastProvider";
import { useSettings } from "../../store/useSettings";

const empty: Omit<Supplier, "id"> = { name: "", phone: "" };

const Suppliers: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });
  const [form, setForm] = useState<Omit<Supplier, "id">>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const [query, setQuery] = useState("");
  const filtered = (data || []).filter((c) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return `${c.name} ${c.phone || ""}`.toLowerCase().includes(term);
  });
  const cardRows = filtered.map((c) => ({
    key: c.id,
    title: c.name,
    subtitle: c.phone || "-",
    right: (
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button size="small" onClick={() => { setEditingId(c.id); setForm({ name: c.name, phone: c.phone || "" }); }}>Editar</Button>
        <Button size="small" color="error" onClick={() => handleDelete(c.id)}>Eliminar</Button>
      </Box>
    ),
    fields: [
      { label: "Telefono", value: c.phone || "-" },
    ],
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
    await deleteSupplier(id);
    showToast({ message: "Proveedor eliminado", severity: "success" });
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Proveedores"
        subtitle="Directorio y contacto comercial."
        icon={<LocalShippingIcon color="primary" />}
        chips={[`Total: ${data?.length ?? 0}`]}
      />

      <TableToolbar title="Proveedores" subtitle="Busqueda por nombre o telefono.">
        <TextField
          label="Buscar"
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ maxWidth: 320 }}
          placeholder="Nombre o telefono"
        />
      </TableToolbar>

      <Paper sx={{ p: 2 }}>
        {isLoading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Cargando proveedores...
          </Typography>
        )}
        {!isLoading && filtered.length === 0 ? (
          <EmptyState
            title="Sin proveedores"
            description="No hay proveedores con ese filtro."
            icon={<LocalShippingIcon color="disabled" />}
          />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          filtered.map((c) => (
            <Box key={c.id} sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
              <Typography sx={{ flex: 1 }}>{c.name} ({c.phone})</Typography>
              <Button size="small" onClick={() => { setEditingId(c.id); setForm({ name: c.name, phone: c.phone || "" }); }}>Editar</Button>
              <Button size="small" color="error" onClick={() => handleDelete(c.id)}>Eliminar</Button>
            </Box>
          ))
        )}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {editingId ? "Editar" : "Nuevo"}
        </Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            error={!form.name.trim() && form.name.length > 0}
            helperText={!form.name.trim() && form.name.length > 0 ? "Nombre requerido" : "Razon social"}
          />
          <TextField
            label="Telefono"
            value={form.phone || ""}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            helperText="Opcional"
          />
          <Button variant="contained" onClick={handleSubmit} disabled={!form.name.trim()}>Guardar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Suppliers;
