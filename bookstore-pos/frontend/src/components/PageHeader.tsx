import React from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  chips?: Array<string>;
  right?: React.ReactNode;
};

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, chips, right }) => {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {icon}
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
          {(chips || []).map((c, i) => (
            <Chip key={i} label={c} size="small" />
          ))}
          {right}
        </Stack>
      </Stack>
    </Paper>
  );
};
