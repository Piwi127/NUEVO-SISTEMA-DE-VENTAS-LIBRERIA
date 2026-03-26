import React, { useDeferredValue, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, ResizableTable, TableToolbar, useToast } from "@/app/components";
import { createCustomer, deleteCustomer, listCustomers, listPriceLists, updateCustomer } from "@/modules/catalog/api";
import { searchCustomers } from "@/modules/shared/search/presets";
import { Customer } from "@/modules/shared/types";
import { normalizeOptionalText, optionalPhoneSchema } from "@/app/utils";
import { useSettings } from "@/app/store";

const customerFormSchema = z.object({
  name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(120, "El nombre es demasiado largo."),
  phone: optionalPhoneSchema,
  tax_id: z.string().trim().max(30, "Maximo 30 caracteres.").optional().or(z.literal("")),
  address: z.string().trim().max(255, "Maximo 255 caracteres.").optional().or(z.literal("")),
  email: z.string().trim().email("Correo invalido.").optional().or(z.literal("")),
  price_list_id: z.number().int().positive().nullable(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

const defaultValues: CustomerFormValues = {
  name: "",
  phone: "",
  tax_id: "",
  address: "",
  email: "",
  price_list_id: null,
};

// Página de gestión de clientes
// Lista, crea, edita y elimina clientes
  const qc = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["customers"], queryFn: listCustomers, staleTime: 60_000 });
  const { data: lists } = useQuery({ queryKey: ["price-lists"], queryFn: listPriceLists });

  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [submitError, setSubmitError] = useState("");

  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const deferredQuery = useDeferredValue(query);

  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    mode: "onChange",
    defaultValues,
  });

  const priceListNameById = useMemo(() => {
    const map = new Map<number, string>();
    (lists || []).forEach((list) => {
      map.set(list.id, list.name);
    });
    return map;
  }, [lists]);

  const searchResult = useMemo(() => searchCustomers(data || [], deferredQuery), [data, deferredQuery]);
  const filtered = useMemo(() => (searchResult.canSearch ? searchResult.items.map((entry) => entry.item) : data || []), [searchResult, data]);
  const smartHint = useMemo(() => {
    if (!searchResult.canSearch || !searchResult.correctedQuery) return null;
    if (filtered.length > 0) return null;
    return searchResult.correctedQuery;
  }, [searchResult, filtered.length]);

  const startEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setSubmitError("");
    reset({
      name: customer.name,
      phone: customer.phone || "",
      tax_id: customer.tax_id || "",
      address: customer.address || "",
      email: customer.email || "",
      price_list_id: customer.price_list_id ?? null,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setSubmitError("");
    reset(defaultValues);
  };

  const onSubmit = async (values: CustomerFormValues) => {
    setSubmitError("");
    const payload: Omit<Customer, "id"> = {
      name: values.name.trim(),
      phone: normalizeOptionalText(values.phone),
      tax_id: normalizeOptionalText(values.tax_id || ""),
      address: normalizeOptionalText(values.address || ""),
      email: normalizeOptionalText(values.email || ""),
      price_list_id: values.price_list_id,
    };
    try {
      if (editingId) {
        await updateCustomer(editingId, payload);
        showToast({ message: "Cliente actualizado", severity: "success" });
      } else {
        await createCustomer(payload);
        showToast({ message: "Cliente creado", severity: "success" });
      }
      resetForm();
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (err: any) {
      const message = err?.response?.data?.detail || "No se pudo guardar el cliente.";
      setSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCustomer(deleteTarget.id);
    showToast({ message: "Cliente eliminado", severity: "success" });
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  const cardRows = filtered.map((customer) => ({
    key: customer.id,
    title: customer.name,
    subtitle: customer.phone || "-",
    right: (
      <Stack spacing={1} sx={{ alignItems: { xs: "stretch", sm: "flex-end" }, width: "100%", minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {customer.price_list_id ? priceListNameById.get(customer.price_list_id) || "Lista asignada" : "Sin lista"}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button size="small" onClick={() => startEdit(customer)}>
            Editar
          </Button>
          <Button size="small" color="error" onClick={() => setDeleteTarget(customer)}>
            Eliminar
          </Button>
        </Box>
      </Stack>
    ),
    fields: [
      {
        label: "Lista",
        value: customer.price_list_id ? priceListNameById.get(customer.price_list_id) || "Lista asignada" : "Sin lista",
      },
    ],
  }));

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <PageHeader title="Clientes" subtitle="Gestion de contactos y listas de precio." icon={<PeopleAltIcon color="primary" />} chips={[`Total: ${filtered.length}`]} loading={isLoading} />

      <TableToolbar title="Busqueda" subtitle="Filtra por nombre o telefono.">
        <TextField label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ width: "100%", maxWidth: { sm: 320 } }} />
      </TableToolbar>

      {searchResult.canSearch ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
          <Chip label={`${filtered.length} coincidencias`} color="primary" size="small" variant="outlined" />
          {searchResult.suggestions.slice(0, 3).map((term) => (
            <Chip key={term} label={term} size="small" onClick={() => setQuery((prev) => `${prev} ${term}`.trim())} sx={{ fontWeight: 600 }} />
          ))}
        </Box>
      ) : null}

      {smartHint ? (
        <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>
          No hubo coincidencias exactas. Prueba con{" "}
          <Button size="small" onClick={() => setQuery(smartHint)} sx={{ fontWeight: 800, textTransform: "none", minWidth: 0, p: 0 }}>
            {smartHint}
          </Button>
          .
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
        {isLoading ? (
          <LoadingState title="Cargando clientes..." />
        ) : isError ? (
          <ErrorState title="No se pudieron cargar clientes" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin clientes" description="No hay clientes con ese filtro." icon={<PeopleAltIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          <ResizableTable minHeight={250}><Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Telefono</TableCell>
                <TableCell>Lista</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.phone || "-"}</TableCell>
                  <TableCell>
                    {customer.price_list_id ? priceListNameById.get(customer.price_list_id) || "Lista asignada" : "Sin lista"}
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => startEdit(customer)}>
                      Editar
                    </Button>
                    <Button size="small" color="error" onClick={() => setDeleteTarget(customer)}>
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
          {editingId ? "Editar cliente" : "Nuevo cliente"}
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "grid", gap: 1.1, width: "100%", maxWidth: 460 }}>
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
            helperText={errors.name?.message || "Nombre visible para ventas y reportes."}
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
          <TextField
            label="RUC / Documento fiscal"
            error={!!errors.tax_id}
            helperText={errors.tax_id?.message || "Opcional. Requerido para factura."}
            {...register("tax_id", {
              onChange: () => setSubmitError(""),
            })}
          />
          <TextField
            label="Direccion"
            error={!!errors.address}
            helperText={errors.address?.message || "Opcional."}
            {...register("address", {
              onChange: () => setSubmitError(""),
            })}
          />
          <TextField
            label="Correo"
            error={!!errors.email}
            helperText={errors.email?.message || "Opcional."}
            {...register("email", {
              onChange: () => setSubmitError(""),
            })}
          />
          <Controller
            control={control}
            name="price_list_id"
            render={({ field }) => (
              <TextField
                select
                label="Lista de precio"
                value={field.value ?? ""}
                onChange={(event) => {
                  setSubmitError("");
                  field.onChange(event.target.value === "" ? null : Number(event.target.value));
                }}
                helperText="Opcional. Asigna una lista preferente al cliente."
              >
                <MenuItem value="">Sin lista</MenuItem>
                {(lists || []).map((list) => (
                  <MenuItem key={list.id} value={list.id}>
                    {list.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
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
        title="Eliminar cliente"
        description={deleteTarget ? `Se eliminara el cliente "${deleteTarget.name}".` : undefined}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmText="Eliminar"
        confirmColor="error"
      />
    </Box>
  );
};

export default Customers;


