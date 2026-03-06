import React from "react";
import { Box, Paper, Typography } from "@mui/material";

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
        p: { xs: 1.25, sm: 1.5, md: 2 },
        minHeight: "100%",
        border: "1px solid",
        borderColor: "divider",
        background: `linear-gradient(160deg, rgba(255,255,255,1) 0%, ${tone}14 100%)`,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: "primary.main",
            fontSize: "clamp(1.35rem, 1.15rem + 0.7vw, 1.95rem)",
            lineHeight: 1.05,
            wordBreak: "break-word",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};
