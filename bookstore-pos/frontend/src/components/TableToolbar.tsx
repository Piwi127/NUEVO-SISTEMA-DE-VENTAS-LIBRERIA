import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

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
        p: { xs: 1, md: 1.15 },
        border: "1px solid rgba(16,58,95,0.08)",
        background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(243,248,255,0.95) 100%)",
        boxShadow: "0 14px 28px rgba(13,32,56,0.05)",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: "linear-gradient(180deg, #103a5f 0%, #12746b 100%)",
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 260px) minmax(0, 1fr)" },
          alignItems: "start",
          gap: { xs: 1, md: 1.15 },
          pl: 0.35,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: alpha("#103a5f", 0.72), letterSpacing: 1.08 }}>
            Filtro financiero
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.12 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.28 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.9,
            width: "100%",
            minWidth: 0,
            justifyContent: { xs: "stretch", xl: "flex-end" },
            alignItems: "flex-start",
            p: { xs: 0, xl: 0.8 },
            borderRadius: 3,
            backgroundColor: { xs: "transparent", xl: "rgba(240,246,253,0.82)" },
            border: { xs: "none", xl: "1px solid rgba(16,58,95,0.07)" },
            "& > *": {
              flex: { xs: "1 1 100%", sm: "1 1 210px", xl: "0 1 auto" },
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
