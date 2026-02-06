import React from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  chips?: Array<string>;
  right?: React.ReactNode;
  loading?: boolean;
};

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, chips, right, loading }) => {
  return (
    <Paper
      sx={{
        p: { xs: 2, md: 3 },
        background:
          "linear-gradient(160deg, rgba(18,53,90,0.045) 0%, rgba(18,53,90,0.018) 55%, rgba(154,123,47,0.08) 100%)",
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
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
        <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
          {loading ? <Chip label="Cargando" size="small" color="default" sx={{ bgcolor: "rgba(18,53,90,0.08)" }} /> : null}
          {(chips || []).map((c, i) => (
            <Chip key={i} label={c} size="small" sx={{ bgcolor: "rgba(18,53,90,0.08)" }} />
          ))}
          {right}
        </Stack>
      </Stack>
    </Paper>
  );
};
