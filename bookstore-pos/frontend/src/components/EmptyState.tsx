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
    <Paper sx={{ p: 3, textAlign: "center" }}>
      <Box sx={{ mb: 1 }}>{icon}</Box>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
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
