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
              bgcolor: alpha("#12355a", 0.08),
              color: "text.primary",
              border: "1px solid rgba(18,53,90,0.08)",
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
          bgcolor: alpha("#12355a", 0.05),
          color: "text.primary",
          border: "1px solid rgba(18,53,90,0.06)",
        }}
      />
    ))),
  ];

  const meta = metaChips.length > 0 ? (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minWidth: 0 }}>
      {metaChips}
    </Stack>
  ) : null;

  const actionBand = meta || right ? (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: meta && right ? "minmax(0, 1fr) minmax(320px, auto)" : "1fr" },
        gap: 1,
        alignItems: { lg: "center" },
        pt: 0.25,
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
      ) : null}
    </Box>
  ) : null;

  const heading = (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ minWidth: 0 }}>
      {icon ? (
        <Box
          sx={{
            color: "primary.main",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            "& .MuiSvgIcon-root": { fontSize: { xs: 22, sm: 24 } },
          }}
        >
          {icon}
        </Box>
      ) : null}

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            fontSize: "clamp(1.25rem, 1.05rem + 0.8vw, 1.8rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            wordBreak: "break-word",
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45, maxWidth: "min(780px, 100%)" }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );

  return (
    <Paper
      sx={{
        p: { xs: 1.25, sm: 1.35, md: 1.6 },
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(18,53,90,0.08)",
        boxShadow: "0 10px 24px rgba(12,31,51,0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <Stack spacing={1.15} sx={{ minWidth: 0 }}>
        {rightPlacement === "beforeTitle" ? actionBand : null}
        {heading}
        {rightPlacement === "afterTitle" ? actionBand : null}
      </Stack>
    </Paper>
  );
};
