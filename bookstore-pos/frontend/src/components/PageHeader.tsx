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
              height: 24,
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
          height: 24,
          bgcolor: alpha("#12355a", 0.05),
          color: "text.primary",
          border: "1px solid rgba(18,53,90,0.06)",
        }}
      />
    ))),
  ];

  const meta = metaChips.length > 0 ? (
    <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minWidth: 0 }}>
      {metaChips}
    </Stack>
  ) : null;

  const actionBand = meta || right ? (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", xl: meta && right ? "minmax(0, 1fr) minmax(260px, auto)" : "1fr" },
        gap: 0.85,
        alignItems: "center",
        p: meta && right ? 0.75 : 0,
        borderRadius: 2,
        bgcolor: meta && right ? "rgba(18,53,90,0.035)" : "transparent",
        border: meta && right ? "1px solid rgba(18,53,90,0.05)" : "none",
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
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ minWidth: 0 }}>
      {icon ? (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            color: "primary.main",
            bgcolor: "rgba(18,53,90,0.06)",
            border: "1px solid rgba(18,53,90,0.08)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            "& .MuiSvgIcon-root": { fontSize: 22 },
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
            fontSize: "clamp(1.18rem, 1.02rem + 0.68vw, 1.7rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            wordBreak: "break-word",
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, maxWidth: "min(720px, 100%)" }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );

  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 1.1, md: 1.2 },
        background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,253,0.9) 100%)",
        border: "1px solid rgba(18,53,90,0.08)",
        boxShadow: "0 12px 28px rgba(12,31,51,0.05)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <Stack spacing={0.9} sx={{ minWidth: 0 }}>
        {rightPlacement === "beforeTitle" ? actionBand : null}
        {heading}
        {rightPlacement === "afterTitle" ? actionBand : null}
      </Stack>
    </Paper>
  );
};
