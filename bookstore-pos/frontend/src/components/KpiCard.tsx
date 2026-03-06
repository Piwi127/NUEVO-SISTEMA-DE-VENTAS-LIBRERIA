import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type Props = {
  label: string;
  value: string;
  accent?: string;
};

export const KpiCard: React.FC<Props> = ({ label, value, accent }) => {
  const tone = accent || "#103a5f";

  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.35, sm: 1.6, md: 1.9 },
        minHeight: "100%",
        border: `1px solid ${alpha(tone, 0.14)}`,
        background: `linear-gradient(160deg, rgba(255,255,255,0.99) 0%, ${alpha(tone, 0.06)} 100%)`,
        boxShadow: `0 16px 32px ${alpha(tone, 0.1)}`,
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${tone} 0%, ${alpha(tone, 0.35)} 100%)`,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: -40,
          right: -28,
          width: 124,
          height: 124,
          borderRadius: "50%",
          background: alpha(tone, 0.08),
        },
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: alpha("#13263a", 0.68),
          letterSpacing: 1.08,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap", mt: 0.75, position: "relative", zIndex: 1 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: tone,
            fontSize: "clamp(1.42rem, 1.18rem + 0.78vw, 2.02rem)",
            lineHeight: 1.02,
            wordBreak: "break-word",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};
