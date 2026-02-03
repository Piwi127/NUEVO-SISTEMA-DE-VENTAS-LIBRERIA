import React from "react";
import { Paper, Typography, Box } from "@mui/material";

type Props = {
  label: string;
  value: string;
  accent?: string;
};

export const KpiCard: React.FC<Props> = ({ label, value, accent }) => {
  return (
    <Paper sx={{ p: 2, borderLeft: `4px solid ${accent || "#c9a227"}` }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};
