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
        p: { xs: 0.95, md: 1.1 },
        border: "1px solid rgba(18,53,90,0.08)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(247,250,253,0.88) 100%)",
        boxShadow: "0 10px 24px rgba(12,31,51,0.045)",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 240px) minmax(0, 1fr)" },
          alignItems: "start",
          gap: { xs: 0.9, md: 1.1 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
            Panel operativo
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.85,
            width: "100%",
            minWidth: 0,
            justifyContent: { xs: "stretch", xl: "flex-end" },
            alignItems: "flex-start",
            "& > *": {
              flex: { xs: "1 1 100%", sm: "1 1 200px", xl: "0 1 auto" },
              minWidth: 0,
              maxWidth: "100%",
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Paper>
  );
};
