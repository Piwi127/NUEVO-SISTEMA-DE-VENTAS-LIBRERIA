import React from "react";
import { Box, Paper, Typography } from "@mui/material";

type Props = {
  label: string;
  value: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
};

export const KpiCard: React.FC<Props> = ({ label, value, accent, icon }) => {
  const tone = accent || "#1E40AF";

  return (
    <Paper
      className="card-interactive"
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.5, sm: 2 },
        minHeight: 120,
        display: "grid",
        alignContent: "space-between",
        gap: 1,
        borderRadius: 3,
        border: "1px solid #E2E8F0",
        background: "#FFFFFF",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", minWidth: 0 }}>
        <Typography
          variant="overline"
          sx={{
            color: "#64748B",
            letterSpacing: 1,
            lineHeight: 1.2,
            fontWeight: 600,
            wordBreak: "break-word",
            fontSize: "0.6875rem",
          }}
        >
          {label}
        </Typography>

        {icon ? (
          <Box
            sx={{
              color: tone,
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: `${tone}15`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        ) : null}
      </Box>

      <Typography
        variant="h3"
        sx={{
          fontWeight: 700,
          color: "#0F172A",
          fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
};
