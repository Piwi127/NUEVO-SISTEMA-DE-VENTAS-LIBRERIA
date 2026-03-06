import React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

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

export const ConfirmDialog: React.FC<Props> = ({
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
  <Dialog open={open} onClose={onCancel} fullWidth maxWidth={maxWidth}>
    <DialogTitle sx={{ pb: 0 }}>
      <Box
        sx={{
          p: 1.2,
          borderRadius: 3,
          background: "linear-gradient(135deg, rgba(16,58,95,0.1) 0%, rgba(18,116,107,0.08) 100%)",
          border: `1px solid ${alpha("#103a5f", 0.08)}`,
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: 1.08, color: "text.secondary", lineHeight: 1 }}>
          Confirmacion segura
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 800, lineHeight: 1.08 }}>
          {title}
        </Typography>
      </Box>
    </DialogTitle>
    <DialogContent sx={{ display: "grid", gap: 1.6 }}>
      {description ? <DialogContentText sx={{ color: "text.secondary" }}>{description}</DialogContentText> : null}
      {content}
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={loading} variant="outlined">
        {cancelText}
      </Button>
      <Button onClick={onConfirm} variant="contained" color={confirmColor} disabled={loading || disableConfirm}>
        {loading ? "Procesando..." : confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);
