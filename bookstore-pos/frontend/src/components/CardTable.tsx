import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

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
            position: "relative",
            overflow: "hidden",
            p: { xs: 1.2, md: 1.35 },
            border: "1px solid rgba(16,58,95,0.08)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(243,248,255,0.95) 100%)",
            boxShadow: "0 14px 28px rgba(13,32,56,0.05)",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: 3,
              background: "linear-gradient(180deg, rgba(16,58,95,0.92) 0%, rgba(18,116,107,0.88) 100%)",
            },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
              alignItems: { sm: "start" },
              gap: 1,
              pl: 0.3,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, wordBreak: "break-word", lineHeight: 1.16 }}>{row.title}</Typography>
              {row.subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.32 }}>
                  {row.subtitle}
                </Typography>
              ) : null}
            </Box>
            {row.right ? <Box sx={{ justifySelf: { sm: "end" }, minWidth: 0 }}>{row.right}</Box> : null}
          </Box>

          {row.fields.length > 0 ? (
            <Box sx={{ mt: 1.15, display: "grid", gap: 0.9, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(150px, 1fr))" } }}>
              {row.fields.map((field, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1,
                    borderRadius: 2.5,
                    border: "1px solid rgba(16,58,95,0.08)",
                    bgcolor: alpha("#103a5f", 0.035),
                    minWidth: 0,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 800, letterSpacing: 0.42 }}>
                    {field.label}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.36, fontWeight: 800, wordBreak: "break-word" }}>
                    {field.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : null}
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
            borderRight: "2px solid rgba(16,58,95,0.28)",
            borderBottom: "2px solid rgba(16,58,95,0.28)",
            borderBottomRightRadius: 2,
            pointerEvents: "none",
            opacity: 0.74,
          }}
        />
      ) : null}
    </Box>
  );
};
