import React from "react";
import { Box, Paper, Skeleton, Typography } from "@mui/material";

type LoadingStateProps = {
  title?: string;
  rows?: number;
};

// Componente de estado de carga
// Muestra un indicador de carga con esqueletos
// Props: title - título, rows - número de filas de esqueletos
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid #E2E8F0",
        background: "#FFFFFF",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
        {title}
      </Typography>
      <Box sx={{ display: "grid", gap: 1.5 }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton 
            key={idx} 
            variant="rectangular" 
            height={44} 
            sx={{ borderRadius: 2 }} 
          />
        ))}
      </Box>
    </Paper>
  );
};
