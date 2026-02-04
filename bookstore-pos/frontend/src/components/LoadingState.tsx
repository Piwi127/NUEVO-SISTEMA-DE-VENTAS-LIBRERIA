import React from "react";
import { Box, Skeleton, Typography } from "@mui/material";

type LoadingStateProps = {
  title?: string;
  rows?: number;
};

export const LoadingState: React.FC<LoadingStateProps> = ({ title = "Cargando...", rows = 4 }) => {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
      ))}
    </Box>
  );
};
