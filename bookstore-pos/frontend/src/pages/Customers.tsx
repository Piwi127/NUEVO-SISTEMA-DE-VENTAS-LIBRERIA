import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem, useMediaQuery, Stack, Chip } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from "../api/customers";
import { listPriceLists } from "../api/priceLists";
import { Customer } from "../types/dto";
import { useToast } from "../components/ToastProvider";

const empty: Omit<Customer, "id"> = { name: "", phone: "", price_list_id: null } as any;

const Customers: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const { data: lists } = useQuery({ queryKey: ["price-lists"], queryFn: listPriceLists });
  const [form, setForm] = useState<any>(empty);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const compact = useMediaQuery("(max-width:900px)");

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
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PeopleAltIcon color="primary" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Clientes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestion de contactos y listas de precio.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
            <Chip label={`Total: ${data?.length ?? 0}`} size="small" />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Clientes</Typography>
        <TextField
          label="Buscar"
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 2, maxWidth: 320 }}
        />
        {compact ? (
          <Box sx={{ display: "grid", gap: 1 }}>
            {(data || [])
              .filter((c) => {
                const term = query.trim().toLowerCase();
                if (!term) return true;
                return `${c.name} ${c.phone || ""}`.toLowerCase().includes(term);
              })
              .map((c) => (
              <Paper key={c.id} sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
                <Typography variant="body2" color="text.secondary">{c.phone || "-"}</Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button size="small" onClick={() => { setEditingId(c.id); setForm({ name: c.name, phone: c.phone || "", price_list_id: c.price_list_id || null }); }}>Editar</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(c.id)}>Eliminar</Button>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          (data || [])
            .filter((c) => {
              const term = query.trim().toLowerCase();
              if (!term) return true;
              return `${c.name} ${c.phone || ""}`.toLowerCase().includes(term);
            })
            .map((c) => (
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
          <TextField label="Nombre" value={form.name} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} />
          <TextField label="Telefono" value={form.phone || ""} onChange={(e) => setForm((p: any) => ({ ...p, phone: e.target.value }))} />
          <TextField select label="Lista de precio" value={form.price_list_id || ""} onChange={(e) => setForm((p: any) => ({ ...p, price_list_id: Number(e.target.value) }))}>
            <MenuItem value="">Sin lista</MenuItem>
            {(lists || []).map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Customers;
