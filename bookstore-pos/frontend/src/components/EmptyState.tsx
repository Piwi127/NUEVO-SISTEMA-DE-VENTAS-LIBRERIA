import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";

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
        p: 3,
        textAlign: "center",
        border: "1px dashed",
        borderColor: "divider",
        background:
          "linear-gradient(180deg, rgba(18,53,90,0.03) 0%, rgba(18,53,90,0.007) 100%)",
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          mx: "auto",
          mb: 1.25,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "rgba(18,53,90,0.08)",
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 800 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outlined" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Paper>
  );
};
