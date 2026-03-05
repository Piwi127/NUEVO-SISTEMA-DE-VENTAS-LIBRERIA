import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

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
    <DialogTitle>{title}</DialogTitle>
    <DialogContent sx={{ display: "grid", gap: 1.5 }}>
      {description ? <DialogContentText>{description}</DialogContentText> : null}
      {content}
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={loading}>
        {cancelText}
      </Button>
      <Button onClick={onConfirm} variant="contained" color={confirmColor} disabled={loading || disableConfirm}>
        {loading ? "Procesando..." : confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);
