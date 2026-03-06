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
  const metaChips = [
    ...(loading
      ? [
          <Chip
            key="loading"
            label="Cargando"
            size="small"
            sx={{
              height: 26,
              bgcolor: alpha("#103a5f", 0.08),
              color: "text.primary",
              border: "1px solid rgba(16,58,95,0.08)",
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
          bgcolor: alpha("#12746b", 0.08),
          color: "text.primary",
          border: "1px solid rgba(18,116,107,0.12)",
        }}
      />
    ))),
  ];

  const meta = metaChips.length > 0 ? (
    <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minWidth: 0 }}>
      {metaChips}
    </Stack>
  ) : null;

  const actionBand = meta || right ? (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", xl: meta && right ? "minmax(0, 1fr) minmax(300px, auto)" : "1fr" },
        gap: 0.9,
        alignItems: "center",
        p: meta && right ? 0.9 : 0,
        borderRadius: 3,
        bgcolor: meta && right ? "rgba(240,246,253,0.82)" : "transparent",
        border: meta && right ? "1px solid rgba(16,58,95,0.08)" : "none",
        backdropFilter: meta && right ? "blur(10px)" : "none",
        minWidth: 0,
      }}
    >
      {meta ? <Box sx={{ minWidth: 0 }}>{meta}</Box> : null}
      {right ? (
        <Box
          sx={{
            minWidth: 0,
            width: "100%",
            display: "flex",
            justifyContent: { xs: "stretch", xl: rightAlign === "right" ? "flex-end" : "flex-start" },
            "& > *": {
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
            },
          }}
        >
          {right}
        </Box>
      ) : null}
    </Box>
  ) : null;

  const heading = (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.15} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ minWidth: 0 }}>
      {icon ? (
        <Box
          sx={{
            width: 50,
            height: 50,
            borderRadius: 3,
            color: "primary.main",
            background: "linear-gradient(135deg, rgba(16,58,95,0.14) 0%, rgba(18,116,107,0.14) 100%)",
            border: "1px solid rgba(16,58,95,0.1)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 12px 24px rgba(13,32,56,0.08)",
            "& .MuiSvgIcon-root": { fontSize: 24 },
          }}
        >
          {icon}
        </Box>
      ) : null}

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" sx={{ letterSpacing: 1.2, color: alpha("#103a5f", 0.74), lineHeight: 1 }}>
          Panel de gestion
        </Typography>
        <Typography
          variant="h5"
          sx={{
            mt: 0.28,
            fontWeight: 800,
            fontSize: "clamp(1.2rem, 1.02rem + 0.72vw, 1.82rem)",
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            wordBreak: "break-word",
            color: "text.primary",
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.42, maxWidth: "min(760px, 100%)" }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );

  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.1, sm: 1.2, md: 1.35 },
        background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(244,249,255,0.97) 58%, rgba(236,246,244,0.94) 100%)",
        border: "1px solid rgba(16,58,95,0.08)",
        boxShadow: "0 18px 36px rgba(13,32,56,0.07)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, #103a5f 0%, #2b6cb0 55%, #12746b 100%)",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          right: -42,
          top: -56,
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: "rgba(16,58,95,0.06)",
        },
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0, position: "relative", zIndex: 1 }}>
        {rightPlacement === "beforeTitle" ? actionBand : null}
        {heading}
        {rightPlacement === "afterTitle" ? actionBand : null}
      </Stack>
    </Paper>
  );
};
