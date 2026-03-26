import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type Props = {
  label: string;
  value: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
};

export const KpiCard: React.FC<Props> = ({ label, value, accent, icon, trend }) => {
  const tone = accent || "#2563EB";

  return (
    <Paper
      className="card-interactive"
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 2, sm: 2.5 },
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 1.5,
        borderRadius: 4,
        border: "1px solid",
        borderColor: alpha(tone, 0.1),
        background: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "default",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 24px ${alpha(tone, 0.12)}`,
          borderColor: alpha(tone, 0.2),
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${tone} 0%, ${alpha(tone, 0.4)} 100%)`,
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", minWidth: 0, mt: 0.5 }}>
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            letterSpacing: 1.2,
            lineHeight: 1.4,
            fontWeight: 600,
            wordBreak: "break-word",
            fontSize: "0.6875rem",
            textTransform: "uppercase",
          }}
        >
          {label}
        </Typography>

        {icon ? (
          <Box
            sx={{
              color: tone,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(tone, 0.12)} 0%, ${alpha(tone, 0.06)} 100%)`,
              flexShrink: 0,
              transition: "transform 0.2s ease",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          >
            {icon}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            background: `linear-gradient(135deg, #0F172A 0%, ${tone} 100%)`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "1.75rem", sm: "2rem", md: "2.25rem" },
            lineHeight: 1.1,
            wordBreak: "break-word",
          }}
        >
          {value}
        </Typography>

        {trend && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              bgcolor: trend.isPositive 
                ? alpha("#22C55E", 0.1) 
                : alpha("#EF4444", 0.1),
              color: trend.isPositive ? "#16A34A" : "#DC2626",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: "1rem",
                lineHeight: 1,
              }}
            >
              {trend.isPositive ? "↑" : "↓"}
            </Box>
            {Math.abs(trend.value)}%
          </Box>
        )}
      </Box>
    </Paper>
  );
};
