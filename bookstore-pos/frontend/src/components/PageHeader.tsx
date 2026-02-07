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
      sx={{
        ml: { md: rightAlign === "right" ? "auto" : 0 },
        width: { xs: "100%", md: rightPlacement === "afterTitle" ? "auto" : "100%" },
        flex: { md: rightPlacement === "afterTitle" && rightAlign === "right" ? 1 : "initial" },
        justifyContent: { xs: "flex-start", md: rightAlign === "right" ? "flex-end" : "flex-start" },
      }}
    >
      {loading ? <Chip label="Cargando" size="small" color="default" sx={{ bgcolor: "rgba(18,53,90,0.08)" }} /> : null}
      {(chips || []).map((c, i) => (
        <Chip key={i} label={c} size="small" sx={{ bgcolor: "rgba(18,53,90,0.08)" }} />
      ))}
      {right}
    </Stack>
  );

  return (
    <Paper
      sx={{
        p: { xs: 2, md: 3 },
        background:
          "linear-gradient(160deg, rgba(18,53,90,0.045) 0%, rgba(18,53,90,0.018) 55%, rgba(154,123,47,0.08) 100%)",
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
        {rightPlacement === "beforeTitle" ? meta : null}
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 1.5,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(18,53,90,0.1)",
              color: "primary.main",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
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
