import React, { useState } from "react";
import { Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable } from "../../../components/CardTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";
import { PageHeader } from "../../../components/PageHeader";
import { TableToolbar } from "../../../components/TableToolbar";
import { useToast } from "../../../components/ToastProvider";
import { listPriceLists, createCustomer, deleteCustomer, listCustomers, updateCustomer } from "../api";
import { Customer } from "../../shared/types";
import { useSettings } from "../../../store/useSettings";

const empty: Omit<Customer, "id"> = { name: "", phone: "", price_list_id: null } as any;

const Customers: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["customers"], queryFn: listCustomers, staleTime: 60_000 });
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
    right: <Typography sx={{ fontWeight: 700 }}>{c.price_list_id || "Sin lista"}</Typography>,
    fields: [],
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
    if (!window.confirm("Eliminar cliente?")) return;
    await deleteCustomer(id);
    showToast({ message: "Cliente eliminado", severity: "success" });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader title="Clientes" subtitle="Gestion de contactos y listas de precio." icon={<PeopleAltIcon color="primary" />} chips={[`Total: ${filtered.length}`]} loading={isLoading} />

      <TableToolbar title="Busqueda" subtitle="Filtra por nombre o telefono.">
        <TextField label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ minWidth: 280 }} />
      </TableToolbar>

      <Paper sx={{ p: 2 }}>
        {isLoading ? (
          <LoadingState title="Cargando clientes..." />
        ) : isError ? (
          <ErrorState title="No se pudieron cargar clientes" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin clientes" description="No hay clientes con ese filtro." icon={<PeopleAltIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Telefono</TableCell>
                <TableCell>Lista</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone || "-"}</TableCell>
                  <TableCell>{c.price_list_id || "Sin lista"}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => { setEditingId(c.id); setForm({ name: c.name, phone: c.phone || "", price_list_id: c.price_list_id || null }); }}>Editar</Button>
                    <Button size="small" color="error" onClick={() => handleDelete(c.id)}>Eliminar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{editingId ? "Editar cliente" : "Nuevo cliente"}</Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField label="Nombre" value={form.name} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} />
          <TextField label="Telefono" value={form.phone || ""} onChange={(e) => setForm((p: any) => ({ ...p, phone: e.target.value }))} />
          <TextField
            select
            label="Lista de precio"
            value={form.price_list_id || ""}
            onChange={(e) => setForm((p: any) => ({ ...p, price_list_id: e.target.value === "" ? null : Number(e.target.value) }))}
          >
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
