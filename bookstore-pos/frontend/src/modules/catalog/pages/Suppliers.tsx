import React, { useState } from "react";
import { Box, Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, ResizableTable, TableToolbar, useToast } from "@/app/components";
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from "@/modules/catalog/api";
import { Supplier } from "@/modules/shared/types";
import { normalizeOptionalText, optionalPhoneSchema } from "@/app/utils";
import { useSettings } from "@/app/store";

const supplierFormSchema = z.object({
  name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(120, "El nombre es demasiado largo."),
  phone: optionalPhoneSchema,
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

const defaultValues: SupplierFormValues = {
  name: "",
  phone: "",
};

const Suppliers: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [submitError, setSubmitError] = useState("");

  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    mode: "onChange",
    defaultValues,
  });

  const filtered = (data || []).filter((supplier) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return `${supplier.name} ${supplier.phone || ""}`.toLowerCase().includes(term);
  });

  const startEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setSubmitError("");
    reset({
      name: supplier.name,
      phone: supplier.phone || "",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setSubmitError("");
    reset(defaultValues);
  };

  const onSubmit = async (values: SupplierFormValues) => {
    setSubmitError("");
    const payload: Omit<Supplier, "id"> = {
      name: values.name.trim(),
      phone: normalizeOptionalText(values.phone),
    };
    try {
      if (editingId) {
        await updateSupplier(editingId, payload);
        showToast({ message: "Proveedor actualizado", severity: "success" });
      } else {
        await createSupplier(payload);
        showToast({ message: "Proveedor creado", severity: "success" });
      }
      resetForm();
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (err: any) {
      const message = err?.response?.data?.detail || "No se pudo guardar el proveedor.";
      setSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSupplier(deleteTarget.id);
      showToast({ message: "Proveedor eliminado", severity: "success" });
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (err: any) {
      const message = err?.response?.data?.detail || "No se pudo eliminar el proveedor.";
      showToast({ message, severity: "error" });
    }
  };

  const cardRows = filtered.map((supplier) => ({
    key: supplier.id,
    title: supplier.name,
    subtitle: supplier.phone || "-",
    right: (
      <Stack spacing={1} sx={{ alignItems: "flex-end", minWidth: 140 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {supplier.phone || "Sin telefono"}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button size="small" onClick={() => startEdit(supplier)}>
            Editar
          </Button>
          <Button size="small" color="error" onClick={() => setDeleteTarget(supplier)}>
            Eliminar
          </Button>
        </Box>
      </Stack>
    ),
    fields: [],
  }));

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <PageHeader title="Proveedores" subtitle="Directorio y contacto comercial." icon={<LocalShippingIcon color="primary" />} chips={[`Total: ${filtered.length}`]} loading={isLoading} />

      <TableToolbar title="Busqueda" subtitle="Filtra por nombre o telefono.">
        <TextField label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ minWidth: 280 }} />
      </TableToolbar>

      <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
        {isLoading ? (
          <LoadingState title="Cargando proveedores..." />
        ) : isError ? (
          <ErrorState title="No se pudieron cargar proveedores" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin proveedores" description="No hay proveedores con ese filtro." icon={<LocalShippingIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          <ResizableTable minHeight={250}><Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Telefono</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.phone || "-"}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => startEdit(supplier)}>
                      Editar
                    </Button>
                    <Button size="small" color="error" onClick={() => setDeleteTarget(supplier)}>
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></ResizableTable>
        )}
      </Paper>

      <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
        <Typography variant="h6" sx={{ mb: 1.1 }}>
          {editingId ? "Editar proveedor" : "Nuevo proveedor"}
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "grid", gap: 1.1, maxWidth: 460 }}>
          {submitError ? (
            <Typography variant="body2" color="error">
              {submitError}
            </Typography>
          ) : null}
          {isDirty ? (
            <Typography variant="caption" color="text.secondary">
              Hay cambios pendientes por guardar.
            </Typography>
          ) : null}
          <TextField
            label="Nombre"
            error={!!errors.name}
            helperText={errors.name?.message || "Nombre visible para compras y directorio."}
            {...register("name", {
              onChange: () => setSubmitError(""),
            })}
          />
          <TextField
            label="Telefono"
            error={!!errors.phone}
            helperText={errors.phone?.message || "Opcional. Usa numeros y signos comunes."}
            {...register("phone", {
              onChange: () => setSubmitError(""),
            })}
          />
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button type="submit" variant="contained" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outlined" onClick={resetForm} disabled={isSubmitting}>
                Cancelar edicion
              </Button>
            ) : null}
          </Stack>
        </Box>
      </Paper>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar proveedor"
        description={deleteTarget ? `Se eliminara el proveedor "${deleteTarget.name}".` : undefined}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmText="Eliminar"
        confirmColor="error"
      />
    </Box>
  );
};

export default Suppliers;

