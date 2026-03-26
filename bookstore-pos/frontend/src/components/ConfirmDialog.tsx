import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from "@mui/material";

type Props = {
  open: boolean;
  title: string;
  content?: React.ReactNode;
  description?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
  loading?: boolean;
  disableConfirm?: boolean;
  maxWidth?: "xs" | "sm" | "md" | "lg";
};

// Componente de diálogo de confirmación
// Muestra un mensaje de confirmación con botones de aceptar/cancelar
// Props: open - estado del diálogo, title - título, description - descripción, onConfirm - función al confirmar, onCancel - función al cancelar
  open,
  title,
  content,
  description,
  onCancel,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmColor = "primary",
  loading = false,
  disableConfirm = false,
  maxWidth = "sm",
}) => (
  <Dialog 
    open={open} 
    onClose={onCancel} 
    fullWidth 
    maxWidth={maxWidth}
    PaperProps={{
      sx: {
        borderRadius: 3,
        border: "1px solid #E2E8F0",
      }
    }}
  >
    <DialogTitle sx={{ pb: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: "#1E293B" }}>
        {title}
      </Typography>
    </DialogTitle>
    <DialogContent sx={{ display: "grid", gap: 2 }}>
      {description ? 
        <DialogContentText sx={{ color: "#64748B" }}>
          {description}
        </DialogContentText> 
        : null}
      {content}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button 
        onClick={onCancel} 
        disabled={loading} 
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        {cancelText}
      </Button>
      <Button 
        onClick={onConfirm} 
        variant="contained" 
        color={confirmColor} 
        disabled={loading || disableConfirm}
        sx={{ borderRadius: 2 }}
      >
        {loading ? "Procesando..." : confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);
