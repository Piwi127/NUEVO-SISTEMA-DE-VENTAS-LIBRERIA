import React from "react";
import { Paper, Typography, Box } from "@mui/material";

type Props = {
  label: string;
  value: string;
  accent?: string;
};

export const KpiCard: React.FC<Props> = ({ label, value, accent }) => {
  const tone = accent || "#9a7b2f";
  return (
    <Paper
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        background: `linear-gradient(160deg, rgba(255,255,255,1) 0%, ${tone}14 100%)`,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};
