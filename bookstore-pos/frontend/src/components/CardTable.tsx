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
  resizable?: boolean;
  minHeight?: number;
  maxHeight?: number | string;
};

export const CardTable: React.FC<CardTableProps> = ({ rows, resizable = true, minHeight = 240, maxHeight = "68vh" }) => {
  const canResize = resizable && rows.length > 3;

  return (
    <Box
      sx={{
        position: "relative",
        display: "grid",
        gap: { xs: 1, md: 1.1 },
        minHeight: canResize ? minHeight : undefined,
        maxHeight: canResize ? maxHeight : undefined,
        overflowY: canResize ? "auto" : "visible",
        overflowX: "hidden",
        resize: canResize ? "vertical" : "none",
        pr: canResize ? 0.4 : 0,
        pb: canResize ? 0.4 : 0,
      }}
    >
      {rows.map((row) => (
        <Paper
          key={row.key}
          sx={{
            p: { xs: 1.15, md: 1.3 },
            border: "1px solid rgba(18,53,90,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,250,253,0.88) 100%)",
            boxShadow: "0 10px 22px rgba(12,31,51,0.04)",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
              alignItems: { sm: "start" },
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, wordBreak: "break-word", lineHeight: 1.2 }}>{row.title}</Typography>
              {row.subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                  {row.subtitle}
                </Typography>
              ) : null}
            </Box>
            {row.right ? <Box sx={{ justifySelf: { sm: "end" } }}>{row.right}</Box> : null}
          </Box>

          <Box sx={{ mt: 1.1, display: "grid", gap: 0.85, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(150px, 1fr))" } }}>
            {row.fields.map((field, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  border: "1px solid rgba(18,53,90,0.08)",
                  bgcolor: "rgba(18,53,90,0.035)",
                  minWidth: 0,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700, letterSpacing: 0.35 }}>
                  {field.label}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 700, wordBreak: "break-word" }}>
                  {field.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ))}

      {canResize ? (
        <Box
          sx={{
            position: "absolute",
            right: 4,
            bottom: 4,
            width: 14,
            height: 14,
            borderRight: "2px solid rgba(18,53,90,0.32)",
            borderBottom: "2px solid rgba(18,53,90,0.32)",
            borderBottomRightRadius: 2,
            pointerEvents: "none",
            opacity: 0.72,
          }}
        />
      ) : null}
    </Box>
  );
};
