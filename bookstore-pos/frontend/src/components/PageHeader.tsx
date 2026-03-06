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
    ...(loading ? [
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
    ] : []),
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
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
      {metaChips}
    </Stack>
  ) : null;

  const aside = meta || right ? (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1}
      useFlexGap
      alignItems={{ xs: "flex-start", md: "center" }}
      justifyContent={{ xs: "flex-start", md: rightAlign === "right" ? "flex-end" : "flex-start" }}
      sx={{
        width: { xs: "100%", lg: "auto" },
        ml: { lg: rightAlign === "right" ? "auto" : 0 },
        minWidth: 0,
      }}
    >
      {meta}
      {right ? (
        <Box
          sx={{
            width: { xs: "100%", md: "auto" },
            display: "flex",
            justifyContent: { xs: "stretch", md: rightAlign === "right" ? "flex-end" : "flex-start" },
            "& > *": { width: { xs: "100%", md: "auto" } },
          }}
        >
          {right}
        </Box>
      ) : null}
    </Stack>
  ) : null;

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 1.75 },
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(18,53,90,0.08)",
        boxShadow: "0 10px 24px rgba(12,31,51,0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", lg: "center" }}>
        {rightPlacement === "beforeTitle" ? aside : null}

        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          {icon ? (
            <Box
              sx={{
                width: { xs: 42, md: 46 },
                height: { xs: 42, md: 46 },
                borderRadius: 2.5,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                bgcolor: alpha("#12355a", 0.05),
                color: "primary.main",
                border: "1px solid rgba(18,53,90,0.08)",
              }}
            >
              {icon}
            </Box>
          ) : null}

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "text.secondary",
                letterSpacing: 1.15,
                textTransform: "uppercase",
                mb: 0.5,
              }}
            >
              Vista actual
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.35rem", md: "1.65rem" },
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65, maxWidth: 780 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        {rightPlacement === "afterTitle" ? aside : null}
      </Stack>
    </Paper>
  );
};
