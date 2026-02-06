import React from "react";
import { Box, Paper, Typography } from "@mui/material";

type TableToolbarProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export const TableToolbar: React.FC<TableToolbarProps> = ({ title, subtitle, children }) => {
  return (
    <Paper
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        background:
          "linear-gradient(180deg, rgba(18,53,90,0.03) 0%, rgba(18,53,90,0.008) 100%)",
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.9 }}>
            Panel operativo
          </Typography>
          <Typography variant="h6">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>{children}</Box>
      </Box>
    </Paper>
  );
};
