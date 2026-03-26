import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
};

// Componente para mostrar cuando no hay datos
// Muestra un mensaje con icono, título y opcionalmente un botón de acción
// Props: title - título, description - descripción, actionLabel - texto del botón, onAction - función del botón
  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 4, md: 5 },
        textAlign: "center",
        border: "1px dashed #E2E8F0",
        background: "#FFFFFF",
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          mx: "auto",
          mb: 2,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: "#1E3A5F",
          bgcolor: "#EFF6FF",
          border: "1px solid #DBEAFE",
        }}
      >
        {icon}
      </Box>
      <Typography 
        variant="h6" 
        sx={{ 
          mb: 1, 
          fontWeight: 600, 
          color: "#1E293B" 
        }}
      >
        {title}
      </Typography>
      {description ? (
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 3, 
            maxWidth: 480, 
            mx: "auto", 
            color: "#64748B" 
          }}
        >
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="contained" color="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Paper>
  );
};
