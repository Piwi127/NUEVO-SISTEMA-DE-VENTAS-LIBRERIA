import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionLabel, onAction, icon }) => {
  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 2.2, md: 2.8 },
        textAlign: "center",
        border: "1px dashed rgba(16,58,95,0.18)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(244,249,255,0.95) 100%)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "0 auto auto 0",
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: "rgba(16,58,95,0.06)",
          transform: "translate(-36%, -36%)",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: 66,
          height: 66,
          mx: "auto",
          mb: 1.35,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: "primary.main",
          bgcolor: "rgba(16,58,95,0.08)",
          border: "1px solid rgba(16,58,95,0.1)",
          boxShadow: "0 10px 24px rgba(13,32,56,0.08)",
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ mb: 0.55, fontWeight: 800, position: "relative", zIndex: 1 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.1, maxWidth: 520, mx: "auto", position: "relative", zIndex: 1 }}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction} sx={{ position: "relative", zIndex: 1, boxShadow: `0 14px 28px ${alpha("#103a5f", 0.16)}` }}>
          {actionLabel}
        </Button>
      ) : null}
    </Paper>
  );
};
