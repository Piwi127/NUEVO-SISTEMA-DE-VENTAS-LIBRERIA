import React from "react";
import { Box, Paper, Typography } from "@mui/material";

type Field = {
  label: string;
  value: React.ReactNode;
};

type CardTableProps = {
  rows: Array<{
    key: string | number;
    title: string;
    subtitle?: string;
    fields: Field[];
    right?: React.ReactNode;
  }>;
};

export const CardTable: React.FC<CardTableProps> = ({ rows }) => {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {rows.map((row) => (
        <Paper key={row.key} sx={{ p: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{row.title}</Typography>
              {row.subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {row.subtitle}
                </Typography>
              ) : null}
            </Box>
            {row.right}
          </Box>
          <Box sx={{ mt: 1, display: "grid", gap: 0.5 }}>
            {row.fields.map((f, idx) => (
              <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {f.label}
                </Typography>
                <Typography variant="body2">{f.value}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};
