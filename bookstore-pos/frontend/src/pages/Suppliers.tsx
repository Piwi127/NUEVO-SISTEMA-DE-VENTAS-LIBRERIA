import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, useMediaQuery, Stack, Chip } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from "../api/suppliers";
import { Supplier } from "../types/dto";
import { useToast } from "../components/ToastProvider";

const empty: Omit<Supplier, "id"> = { name: "", phone: "" };

const Suppliers: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });
  const [form, setForm] = useState<Omit<Supplier, "id">>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const compact = useMediaQuery("(max-width:900px)");
  const [query, setQuery] = useState("");

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
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LocalShippingIcon color="primary" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Proveedores
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Directorio y contacto comercial.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
            <Chip label={`Total: ${data?.length ?? 0}`} size="small" />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Proveedores
        </Typography>
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
                  <Button size="small" onClick={() => { setEditingId(c.id); setForm({ name: c.name, phone: c.phone || "" }); }}>Editar</Button>
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
          <TextField label="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <TextField label="Telefono" value={form.phone || ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Suppliers;
