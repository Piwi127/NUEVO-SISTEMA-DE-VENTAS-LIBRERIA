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
  const meta = (
    <Stack
      direction="row"
      spacing={1}
      flexWrap="wrap"
      useFlexGap
      sx={{
        ml: { md: rightAlign === "right" ? "auto" : 0 },
        width: { xs: "100%", md: rightPlacement === "afterTitle" ? "auto" : "100%" },
        flex: { md: rightPlacement === "afterTitle" && rightAlign === "right" ? 1 : "initial" },
        justifyContent: { xs: "flex-start", md: rightAlign === "right" ? "flex-end" : "flex-start" },
        alignItems: "center",
      }}
    >
      {loading ? (
        <Chip
          label="Cargando"
          size="small"
          sx={{
            bgcolor: alpha("#12355a", 0.08),
            color: "text.primary",
            border: "1px solid rgba(18,53,90,0.08)",
          }}
        />
      ) : null}
      {(chips || []).map((c, i) => (
        <Chip
          key={i}
          label={c}
          size="small"
          sx={{
            bgcolor: alpha("#12355a", 0.07),
            color: "text.primary",
            border: "1px solid rgba(18,53,90,0.06)",
          }}
        />
      ))}
      {right}
    </Stack>
  );

  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 2, md: 2.75 },
        background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.9) 100%)",
        border: "1px solid rgba(18,53,90,0.08)",
        boxShadow: "0 18px 34px rgba(12, 31, 51, 0.08)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top left, rgba(18,53,90,0.08) 0%, rgba(18,53,90,0) 28%), radial-gradient(circle at top right, rgba(154,123,47,0.1) 0%, rgba(154,123,47,0) 24%)",
          pointerEvents: "none",
        },
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        sx={{ position: "relative", zIndex: 1 }}
      >
        {rightPlacement === "beforeTitle" ? meta : null}

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              bgcolor: alpha("#12355a", 0.08),
              color: "primary.main",
              border: "1px solid rgba(18,53,90,0.08)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
            }}
          >
            {icon}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "text.secondary",
                letterSpacing: 1.1,
                textTransform: "uppercase",
                mb: 0.6,
              }}
            >
              Espacio de trabajo
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.45rem", md: "1.8rem" },
                lineHeight: 1.05,
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7, maxWidth: 720 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        {rightPlacement === "afterTitle" ? meta : null}
      </Stack>
    </Paper>
  );
};
