import React from "react";
import { Box, Paper, Typography } from "@mui/material";

type TableToolbarProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export const TableToolbar: React.FC<TableToolbarProps> = ({ title, subtitle, children }) => {
  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.5, md: 1.5 },
        border: "1px solid #E2E8F0",
        background: "#FFFFFF",
        boxShadow: "var(--shadow-sm)",
        borderRadius: 2.5,
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 280px) minmax(0, 1fr)" },
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#1E293B", fontSize: "1rem" }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ mt: 0.5, color: "#64748B" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            width: "100%",
            minWidth: 0,
            justifyContent: { xs: "stretch", lg: "flex-end" },
            alignItems: "center",
          }}
        >
          {children}
        </Box>
      </Box>
    </Paper>
  );
};
