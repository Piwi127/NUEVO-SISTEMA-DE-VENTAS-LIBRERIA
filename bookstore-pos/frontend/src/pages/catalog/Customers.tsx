import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem, useMediaQuery } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import { PageHeader } from "../../components/PageHeader";
import { TableToolbar } from "../../components/TableToolbar";
import { EmptyState } from "../../components/EmptyState";
import { CardTable } from "../../components/CardTable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from "../../api/customers";
import { listPriceLists } from "../../api/priceLists";
import { Customer } from "../../types/dto";
import { useToast } from "../../components/ToastProvider";
import { useSettings } from "../../store/useSettings";

const empty: Omit<Customer, "id"> = { name: "", phone: "", price_list_id: null } as any;

const Customers: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["customers"], queryFn: listCustomers, staleTime: 60_000 });
  const { data: lists } = useQuery({ queryKey: ["price-lists"], queryFn: listPriceLists });
  const [form, setForm] = useState<any>(empty);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
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
        <Button size="small" onClick={() => { setEditingId(c.id); setForm({ name: c.name, phone: c.phone || "", price_list_id: c.price_list_id || null }); }}>Editar</Button>
        <Button size="small" color="error" onClick={() => handleDelete(c.id)}>Eliminar</Button>
      </Box>
    ),
    fields: [
      { label: "Lista", value: c.price_list_id || "Sin lista" },
    ],
  }));

  const handleSubmit = async () => {
    if (editingId) {
      await updateCustomer(editingId, form);
      showToast({ message: "Cliente actualizado", severity: "success" });
    } else {
      await createCustomer(form);
      showToast({ message: "Cliente creado", severity: "success" });
    }
    setForm(empty);
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  const handleDelete = async (id: number) => {
    await deleteCustomer(id);
    showToast({ message: "Cliente eliminado", severity: "success" });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Clientes"
        subtitle="Gestion de contactos y listas de precio."
        icon={<PeopleAltIcon color="primary" />}
        chips={[`Total: ${data?.length ?? 0}`]}
      />

      <TableToolbar title="Clientes" subtitle="Busqueda por nombre o telefono.">
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
            Cargando clientes...
          </Typography>
        )}
        {!isLoading && filtered.length === 0 ? (
          <EmptyState
            title="Sin clientes"
            description="No hay clientes con ese filtro."
            icon={<PeopleAltIcon color="disabled" />}
          />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          filtered.map((c) => (
            <Box key={c.id} sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
              <Typography sx={{ flex: 1 }}>{c.name} ({c.phone})</Typography>
              <Button size="small" onClick={() => { setEditingId(c.id); setForm({ name: c.name, phone: c.phone || "", price_list_id: c.price_list_id || null }); }}>Editar</Button>
              <Button size="small" color="error" onClick={() => handleDelete(c.id)}>Eliminar</Button>
            </Box>
          ))
        )}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{editingId ? "Editar" : "Nuevo"}</Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))}
            error={!form.name.trim() && form.name.length > 0}
            helperText={!form.name.trim() && form.name.length > 0 ? "Nombre requerido" : "Nombre completo"}
          />
          <TextField
            label="Telefono"
            value={form.phone || ""}
            onChange={(e) => setForm((p: any) => ({ ...p, phone: e.target.value }))}
            helperText="Opcional"
          />
          <TextField select label="Lista de precio" value={form.price_list_id || ""} onChange={(e) => setForm((p: any) => ({ ...p, price_list_id: Number(e.target.value) }))}>
            <MenuItem value="">Sin lista</MenuItem>
            {(lists || []).map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={handleSubmit} disabled={!form.name.trim()}>Guardar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Customers;
