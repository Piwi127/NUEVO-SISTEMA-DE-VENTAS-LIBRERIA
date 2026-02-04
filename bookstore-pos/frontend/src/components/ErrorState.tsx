import React from "react";
import { Box, Button, Typography } from "@mui/material";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "No se pudo cargar",
  description = "Intenta nuevamente.",
  onRetry,
}) => {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {onRetry ? (
        <Box>
          <Button size="small" variant="outlined" onClick={onRetry}>
            Reintentar
          </Button>
        </Box>
      ) : null}
    </Box>
  );
};
