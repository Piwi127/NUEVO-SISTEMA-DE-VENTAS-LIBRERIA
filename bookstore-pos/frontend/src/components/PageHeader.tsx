import React from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

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

export const PageHeader: React.FC<PageHeaderProps> = ({
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
              height: 28,
              bgcolor: alpha("#2563EB", 0.08),
              color: "#2563EB",
              fontWeight: 500,
              border: `1px solid ${alpha("#2563EB", 0.15)}`,
              "& .MuiChip-label": { px: 1.5 },
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
          height: 28,
          bgcolor: alpha("#0D9488", 0.08),
          color: "#0D9488",
          fontWeight: 500,
          border: `1px solid ${alpha("#0D9488", 0.15)}`,
          "& .MuiChip-label": { px: 1.5 },
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
        borderRadius: 3,
        bgcolor: metaBand && rightNode ? alpha("#2563EB", 0.02) : "transparent",
        border: metaBand && rightNode ? `1px solid ${alpha("#2563EB", 0.08)}` : "none",
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
        p: { xs: 2, sm: 2.5, md: 3 },
        background: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)",
        border: "1px solid",
        borderColor: alpha("#000", 0.06),
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)",
        borderRadius: 4,
      }}
    >
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        {rightPlacement === "beforeTitle" ? accessoryBand : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ minWidth: 0 }}>
          {icon ? (
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                background: "linear-gradient(135deg, #2563EB 0%, #0D9488 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "scale(1.02)",
                  boxShadow: "0 6px 16px rgba(37, 99, 235, 0.3)",
                },
                "& .MuiSvgIcon-root": { fontSize: 26, color: "#FFFFFF" },
              }}
            >
              {icon}
            </Box>
          ) : null}

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography 
              variant="h4" 
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.375rem", sm: "1.625rem", md: "1.875rem" },
                lineHeight: 1.15,
                letterSpacing: "-0.025em",
                wordBreak: "break-word",
                color: "#0F172A",
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography 
                variant="body1" 
                sx={{ 
                  mt: 0.75, 
                  maxWidth: "min(760px, 100%)", 
                  color: "text.secondary",
                  fontWeight: 400,
                  lineHeight: 1.5,
                }}
              >
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
