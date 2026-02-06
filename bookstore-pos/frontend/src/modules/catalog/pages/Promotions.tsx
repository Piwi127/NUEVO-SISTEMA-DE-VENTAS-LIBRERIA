import React, { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable } from "@/app/components";
import { EmptyState } from "@/app/components";
import { PageHeader } from "@/app/components";
import { TableToolbar } from "@/app/components";
import { useToast } from "@/app/components";
import { createPromotion, listPromotions } from "@/modules/catalog/api";
import { useSettings } from "@/app/store";

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
    right: <Typography sx={{ fontWeight: 700 }}>{p.is_active ? "Activa" : "Inactiva"}</Typography>,
    fields: [{ label: "Tipo", value: p.type }],
  }));

  const handleCreate = async () => {
    await createPromotion({ id: 0, name, type, value, is_active: isActive });
    showToast({ message: "Promocion creada", severity: "success" });
    setName("");
    setValue(0);
    qc.invalidateQueries({ queryKey: ["promotions"] });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader title="Promociones" subtitle="Descuentos porcentuales o monto fijo." icon={<CampaignIcon color="primary" />} chips={[`Promos: ${data?.length ?? 0}`]} loading={isLoading} />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Nueva promocion</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
            <MenuItem value="PERCENT">% Descuento</MenuItem>
            <MenuItem value="AMOUNT">Monto fijo</MenuItem>
          </TextField>
          <TextField label="Valor" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          <FormControlLabel control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Activa" />
          <Button variant="contained" onClick={handleCreate} disabled={!name.trim()}>Crear</Button>
        </Box>
      </Paper>

      <TableToolbar title="Listado" subtitle="Estado de promociones configuradas." />

      <Paper sx={{ p: 2 }}>
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
