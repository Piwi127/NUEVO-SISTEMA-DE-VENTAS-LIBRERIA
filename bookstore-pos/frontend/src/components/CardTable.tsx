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
    <Box sx={{ display: "grid", gap: 1.25 }}>
      {rows.map((row) => (
        <Paper
          key={row.key}
          sx={{
            p: 1.5,
            border: "1px solid",
            borderColor: "divider",
            background: "linear-gradient(180deg, rgba(18,53,90,0.025) 0%, rgba(18,53,90,0.005) 100%)",
          }}
        >
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
          <Box sx={{ mt: 1.25, display: "grid", gap: 0.7 }}>
            {row.fields.map((f, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "minmax(110px, 1fr) 1.3fr",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {f.label}
                </Typography>
                <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 600 }}>
                  {f.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};
