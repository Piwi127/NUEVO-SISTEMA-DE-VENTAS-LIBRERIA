import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem } from "@mui/material";
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
  const [editingId, setEditingId] = useState<number | null>(null);

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
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Clientes</Typography>
        {(data || []).map((c) => (
          <Box key={c.id} sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
            <Typography sx={{ flex: 1 }}>{c.name} ({c.phone})</Typography>
            <Button size="small" onClick={() => { setEditingId(c.id); setForm({ name: c.name, phone: c.phone || "", price_list_id: c.price_list_id || null }); }}>Editar</Button>
            <Button size="small" color="error" onClick={() => handleDelete(c.id)}>Eliminar</Button>
          </Box>
        ))}
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
