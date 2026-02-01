import React from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from "@mui/material";

type Props = {
  open: boolean;
  title: string;
  content: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ConfirmDialog: React.FC<Props> = ({ open, title, content, onCancel, onConfirm }) => (
  <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>{content}</DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancelar</Button>
      <Button onClick={onConfirm} variant="contained">
        Confirmar
      </Button>
    </DialogActions>
  </Dialog>
);
