import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type Props = {
  label: string;
  value: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
};

export const KpiCard: React.FC<Props> = ({ label, value, accent, icon }) => {
  const tone = accent || "#13293D";

  return (
    <Paper
      className="glass-panel hover-lift"
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.35, sm: 1.6 },
        minHeight: 132,
        display: "grid",
        alignContent: "space-between",
        gap: 1,
        borderRadius: 3,
        border: `1px solid ${alpha(tone, 0.2)}`,
        background: `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, ${alpha(tone, 0.08)} 100%)`,
        boxShadow: `0 12px 26px ${alpha(tone, 0.12)}`,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "0 0 auto 0",
          height: 4,
          background: `linear-gradient(90deg, ${tone} 0%, ${alpha(tone, 0.45)} 100%)`,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: -22,
          right: -22,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(tone, 0.14)} 0%, transparent 70%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", minWidth: 0, position: "relative", zIndex: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: alpha("#13293D", 0.74),
            letterSpacing: 1.15,
            lineHeight: 1.2,
            fontWeight: 800,
            wordBreak: "break-word",
          }}
        >
          {label}
        </Typography>

        {icon ? (
          <Box
            sx={{
              color: tone,
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(tone, 0.12),
              border: `1px solid ${alpha(tone, 0.2)}`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        ) : null}
      </Box>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          color: tone,
          fontSize: "clamp(1.45rem, 1.2vw + 1rem, 2.1rem)",
          lineHeight: 1.08,
          wordBreak: "break-word",
          position: "relative",
          zIndex: 1,
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
};
