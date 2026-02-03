import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem, Checkbox, FormControlLabel } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listPromotions, createPromotion } from "../api/promotions";
import { useToast } from "../components/ToastProvider";

const Promotions: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ["promotions"], queryFn: listPromotions });
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
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Promociones</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
            <MenuItem value="PERCENT">% Descuento</MenuItem>
            <MenuItem value="AMOUNT">Monto fijo</MenuItem>
          </TextField>
          <TextField label="Valor" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          <FormControlLabel control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Activa" />
          <Button variant="contained" onClick={handleCreate}>Crear</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Listado</Typography>
        {(data || []).map((p) => (
          <Typography key={p.id}>
            {p.name} - {p.type} {p.type === "PERCENT" ? `${p.value}%` : p.value} - {p.is_active ? "Activa" : "Inactiva"}
          </Typography>
        ))}
      </Paper>
    </Box>
  );
};

export default Promotions;
