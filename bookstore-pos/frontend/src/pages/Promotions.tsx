import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem, Checkbox, FormControlLabel, Stack, Chip, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listPromotions, createPromotion } from "../api/promotions";
import { useToast } from "../components/ToastProvider";

const Promotions: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["promotions"], queryFn: listPromotions });
  const [name, setName] = useState("");
  const [value, setValue] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState("PERCENT");

  const handleCreate = async () => {
    await createPromotion({ id: 0, name, type, value, is_active: isActive });
    showToast({ message: "Promo creada", severity: "success" });
    setName("");
    setValue(0);
    qc.invalidateQueries({ queryKey: ["promotions"] });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CampaignIcon color="primary" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Promociones
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Descuentos porcentuales y montos fijos.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
            <Chip label={`Promos: ${data?.length ?? 0}`} size="small" />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Nueva promocion</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            label="Nombre"
            placeholder="Promo temporada"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!name.trim() && name.length > 0}
            helperText={!name.trim() && name.length > 0 ? "El nombre es requerido" : "Ej: Black Friday"}
          />
          <TextField select label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
            <MenuItem value="PERCENT">% Descuento</MenuItem>
            <MenuItem value="AMOUNT">Monto fijo</MenuItem>
          </TextField>
          <TextField
            label="Valor"
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            helperText={type === "PERCENT" ? "Porcentaje de descuento" : "Monto fijo de descuento"}
          />
          <FormControlLabel control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Activa" />
          <Button variant="contained" onClick={handleCreate} disabled={!name.trim()}>Crear</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Listado</Typography>
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Cargando promociones...</Typography>
        ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data || []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell>{p.type === "PERCENT" ? `${p.value}%` : p.value}</TableCell>
                <TableCell>{p.is_active ? "Activa" : "Inactiva"}</TableCell>
              </TableRow>
            ))}
            {(data || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No hay promociones creadas.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </Paper>
    </Box>
  );
};

export default Promotions;
