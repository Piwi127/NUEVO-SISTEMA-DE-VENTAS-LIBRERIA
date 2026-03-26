import React from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  chips?: Array<string>;
  right?: React.ReactNode;
  rightAlign?: "left" | "right";
  rightPlacement?: "beforeTitle" | "afterTitle";
  loading?: boolean;
};

// Componente de encabezado de página
// Muestra título, subtítulo, icono, chips y contenido adicional
// Props: title - título principal, subtitle - descripción, icon - icono, chips - etiquetas, right - contenido adicional
  title,
  subtitle,
  icon,
  chips,
  right,
  rightAlign = "right",
  rightPlacement = "afterTitle",
  loading,
}) => {
  const statusChips = [
    ...(loading
      ? [
          <Chip
            key="loading"
            label="Cargando"
            size="small"
            sx={{
              height: 26,
              bgcolor: "#F1F5F9",
              color: "#475569",
              fontWeight: 500,
              border: "1px solid #E2E8F0",
            }}
          />,
        ]
      : []),
    ...((chips || []).map((chip) => (
      <Chip
        key={chip}
        label={chip}
        size="small"
        sx={{
          height: 26,
          bgcolor: "#DBEAFE",
          color: "#1D4ED8",
          fontWeight: 500,
          border: "1px solid #BFDBFE",
        }}
      />
    ))),
  ];

  const metaBand = statusChips.length > 0 ? (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minWidth: 0 }}>
      {statusChips}
    </Stack>
  ) : null;

  const rightNode = right ? (
    <Box
      sx={{
        minWidth: 0,
        width: "100%",
        display: "flex",
        justifyContent: { xs: "stretch", lg: rightAlign === "right" ? "flex-end" : "flex-start" },
        "& > *": {
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        },
      }}
    >
      {right}
    </Box>
  ) : null;

  const accessoryBand = metaBand || rightNode ? (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: metaBand && rightNode ? "minmax(0, 1fr) minmax(320px, auto)" : "1fr" },
        alignItems: "center",
        gap: 1.5,
        p: metaBand && rightNode ? 1.5 : 0,
        borderRadius: 2,
        bgcolor: metaBand && rightNode ? "#F8FAFC" : "transparent",
        border: metaBand && rightNode ? "1px solid #E2E8F0" : "none",
      }}
    >
      {metaBand ? <Box sx={{ minWidth: 0 }}>{metaBand}</Box> : null}
      {rightNode}
    </Box>
  ) : null;

  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.5, sm: 2, md: 2.5 },
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        boxShadow: "var(--shadow-sm)",
        borderRadius: 3,
      }}
    >
      <Stack spacing={2} sx={{ minWidth: 0 }}>
        {rightPlacement === "beforeTitle" ? accessoryBand : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ minWidth: 0 }}>
          {icon ? (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: "linear-gradient(135deg, #1E40AF 0%, #059669 100%)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                boxShadow: "var(--shadow-md)",
                "& .MuiSvgIcon-root": { fontSize: 24, color: "#FFFFFF" },
              }}
            >
              {icon}
            </Box>
          ) : null}

          <Box sx={{ minWidth: 0 }}>
            <Typography 
              variant="h4" 
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                wordBreak: "break-word",
                color: "#0F172A",
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body1" sx={{ mt: 0.5, maxWidth: "min(760px, 100%)", color: "#475569" }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        {rightPlacement === "afterTitle" ? accessoryBand : null}
      </Stack>
    </Paper>
  );
};
