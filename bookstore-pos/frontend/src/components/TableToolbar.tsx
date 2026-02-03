import React from "react";
import { Box, Paper, Typography } from "@mui/material";

type TableToolbarProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export const TableToolbar: React.FC<TableToolbarProps> = ({ title, subtitle, children }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
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
