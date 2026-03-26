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

  if (rows.length === 0) {
    return (
      <Paper
        sx={{
          p: 5,
          border: "1px dashed",
          borderColor: alpha("#000", 0.08),
          background: "linear-gradient(135deg, #FAFBFC 0%, #F1F5F9 100%)",
          textAlign: "center",
          borderRadius: 4,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.secondary" }}>
          Sin registros para mostrar
        </Typography>
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        display: "grid",
        gap: 1.5,
        minHeight: canResize ? minHeight : undefined,
        maxHeight: canResize ? maxHeight : undefined,
        overflowY: canResize ? "auto" : "visible",
        overflowX: "hidden",
        resize: canResize ? "vertical" : "none",
        pr: canResize ? 0.5 : 0,
        pb: canResize ? 0.5 : 0,
      }}
    >
      {rows.map((row) => (
        <Paper
          key={row.key}
          className="card-interactive"
          sx={{
            position: "relative",
            overflow: "hidden",
            p: 2,
            border: "1px solid",
            borderColor: alpha("#000", 0.05),
            background: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03), 0 2px 8px rgba(0, 0, 0, 0.02)",
            borderRadius: 3,
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "pointer",
            "&:hover": {
              borderColor: alpha("#2563EB", 0.25),
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.08), 0 0 0 1px rgba(37, 99, 235, 0.05)",
              transform: "translateY(-1px)",
            },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
              alignItems: { sm: "start" },
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, wordBreak: "break-word", lineHeight: 1.3, color: "#1E293B", fontSize: "0.9375rem" }}>
                {row.title}
              </Typography>
              {row.subtitle ? (
                <Typography variant="body2" sx={{ mt: 0.5, color: "#64748B" }}>
                  {row.subtitle}
                </Typography>
              ) : null}
            </Box>
            {row.right ? <Box sx={{ justifySelf: { sm: "end" }, minWidth: 0 }}>{row.right}</Box> : null}
          </Box>

          {row.fields.length > 0 ? (
            <Box sx={{ mt: 1.5, display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(180px, 1fr))" } }}>
              {row.fields.map((field, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    border: "1px solid #F1F5F9",
                    bgcolor: "#F8FAFC",
                    minWidth: 0,
                  }}
                >
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 500, color: "#64748B", letterSpacing: 0.3 }}>
                    {field.label}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 600, wordBreak: "break-word", color: "#1E293B" }}>
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
            right: 6,
            bottom: 6,
            width: 12,
            height: 12,
            borderRight: "2px solid #CBD5E1",
            borderBottom: "2px solid #CBD5E1",
            borderBottomRightRadius: 3,
            pointerEvents: "none",
            opacity: 0.6,
          }}
        />
      ) : null}
    </Box>
  );
};
