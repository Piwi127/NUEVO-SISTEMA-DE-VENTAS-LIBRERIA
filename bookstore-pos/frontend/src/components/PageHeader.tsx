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
              height: 26,
              bgcolor: alpha("#13293D", 0.08),
              color: "text.primary",
              border: "1px solid rgba(19,41,61,0.14)",
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
          bgcolor: alpha("#0F766E", 0.1),
          color: "text.primary",
          border: "1px solid rgba(15,118,110,0.18)",
        }}
      />
    ))),
  ];

  const metaBand = statusChips.length > 0 ? (
    <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minWidth: 0 }}>
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
        gap: 1,
        p: metaBand && rightNode ? 1 : 0,
        borderRadius: 3,
        bgcolor: metaBand && rightNode ? "rgba(248,243,234,0.9)" : "transparent",
        border: metaBand && rightNode ? "1px solid rgba(19,41,61,0.1)" : "none",
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
        p: { xs: 1.15, sm: 1.3, md: 1.5 },
        background: "linear-gradient(130deg, rgba(255,255,255,0.98) 0%, rgba(250,245,236,0.96) 56%, rgba(239,248,246,0.94) 100%)",
        border: "1px solid rgba(19,41,61,0.1)",
        boxShadow: "0 16px 34px rgba(19,41,61,0.1)",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, #13293D 0%, #254B67 46%, #0F766E 100%)",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          right: -38,
          top: -52,
          width: 170,
          height: 170,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(19,41,61,0.08) 0%, rgba(19,41,61,0) 72%)",
          pointerEvents: "none",
        },
      }}
    >
      <Stack spacing={1.05} sx={{ minWidth: 0, position: "relative", zIndex: 1 }}>
        {rightPlacement === "beforeTitle" ? accessoryBand : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ minWidth: 0 }}>
          {icon ? (
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: 3,
                color: "primary.main",
                background: "linear-gradient(135deg, rgba(19,41,61,0.14) 0%, rgba(15,118,110,0.14) 100%)",
                border: "1px solid rgba(19,41,61,0.12)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                boxShadow: "0 12px 24px rgba(19,41,61,0.08)",
                "& .MuiSvgIcon-root": { fontSize: 24 },
              }}
            >
              {icon}
            </Box>
          ) : null}

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ letterSpacing: 1.2, color: alpha("#13293D", 0.7), lineHeight: 1 }}>
              Vista principal
            </Typography>
            <Typography
              variant="h5"
              sx={{
                mt: 0.28,
                fontWeight: 800,
                fontSize: "clamp(1.2rem, 1.02rem + 0.72vw, 1.82rem)",
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
                wordBreak: "break-word",
                color: "text.primary",
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45, maxWidth: "min(760px, 100%)" }}>
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
