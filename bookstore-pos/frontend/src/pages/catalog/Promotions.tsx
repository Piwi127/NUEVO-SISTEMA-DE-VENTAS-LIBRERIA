import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem, Checkbox, FormControlLabel, Table, TableHead, TableRow, TableCell, TableBody, useMediaQuery } from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { CardTable } from "../../components/CardTable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listPromotions, createPromotion } from "../../api/promotions";
import { useToast } from "../../components/ToastProvider";
import { useSettings } from "../../store/useSettings";

const Promotions: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["promotions"], queryFn: listPromotions, staleTime: 60_000 });
  const [name, setName] = useState("");
  const [value, setValue] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState("PERCENT");
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const cardRows = (data || []).map((p) => ({
    key: p.id,
    title: p.name,
    subtitle: p.type === "PERCENT" ? `${p.value}%` : `${p.value}`,
    right: <Typography sx={{ fontWeight: 600 }}>{p.is_active ? "Activa" : "Inactiva"}</Typography>,
    fields: [
      { label: "Tipo", value: p.type },
    ],
  }));

  const handleCreate = async () => {
    await createPromotion({ id: 0, name, type, value, is_active: isActive });
    showToast({ message: "Promo creada", severity: "success" });
    setName("");
    setValue(0);
    qc.invalidateQueries({ queryKey: ["promotions"] });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Promociones"
        subtitle="Descuentos porcentuales y montos fijos."
        icon={<CampaignIcon color="primary" />}
        chips={[`Promos: ${data?.length ?? 0}`]}
      />

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
        ) : (data || []).length === 0 ? (
          <EmptyState title="Sin promociones" description="No hay promociones creadas." icon={<CampaignIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
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
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default Promotions;
