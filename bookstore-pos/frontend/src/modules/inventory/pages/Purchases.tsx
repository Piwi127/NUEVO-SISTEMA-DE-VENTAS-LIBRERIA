import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DownloadIcon from "@mui/icons-material/Download";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable, EmptyState, ErrorState, LoadingState, PageHeader, ResizableTable, TableToolbar, useToast } from "@/app/components";
import { listProducts, listSuppliers } from "@/modules/catalog/api";
import {
  createPurchaseOrder,
  exportPurchases,
  listPurchaseOrderItems,
  listPurchaseOrders,
  listPurchases,
  receivePurchaseOrderWithCosts,
  supplierPayment,
} from "@/modules/inventory/api";
import { useSettings } from "@/app/store";
import { formatMoney } from "@/app/utils";

type PurchaseOrder = {
  id: number;
  status: string;
};

type PurchaseOrderItem = {
  product_id: number;
  qty: number;
  unit_cost: number;
  received_qty: number;
};

type DraftOrderItem = {
  product_id: number;
  qty: number;
  unit_cost: number;
};

const positiveIntegerSchema = z.number().int("Ingresa un numero entero.").min(1, "Debe ser al menos 1.");
const positiveAmountSchema = z.number().positive("Debe ser mayor que 0.");
const requiredSelectSchema = z.number().int().positive("Selecciona una opcion.");
const decimalInputSchema = z
  .string()
  .trim()
  .min(1, "Ingresa un valor.")
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }, "Ingresa un monto valido.");

const orderFormSchema = z.object({
  supplier_id: requiredSelectSchema,
  product_id: requiredSelectSchema,
  qty: positiveIntegerSchema,
  unit_cost: positiveAmountSchema,
});

const receiveFormSchema = z.object({
  receive_order_id: requiredSelectSchema,
  receive_product_id: requiredSelectSchema,
  receive_qty: positiveIntegerSchema,
  receive_transport: decimalInputSchema,
  receive_pack: decimalInputSchema,
  receive_other: decimalInputSchema,
  receive_delivery: decimalInputSchema,
  lot_prefix: z.string().trim().min(2, "Usa al menos 2 caracteres.").max(12, "El prefijo es demasiado largo."),
});

const paymentFormSchema = z.object({
  pay_supplier_id: requiredSelectSchema,
  pay_amount: positiveAmountSchema,
  pay_method: z.string().trim().min(2, "Ingresa el metodo de pago.").max(30, "El metodo es demasiado largo."),
  pay_ref: z.string().trim().max(80, "La referencia es demasiado larga."),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;
type ReceiveFormValues = z.infer<typeof receiveFormSchema>;
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const defaultOrderValues: OrderFormValues = {
  supplier_id: 0,
  product_id: 0,
  qty: 1,
  unit_cost: 0,
};

const defaultReceiveValues: ReceiveFormValues = {
  receive_order_id: 0,
  receive_product_id: 0,
  receive_qty: 1,
  receive_transport: "0",
  receive_pack: "0",
  receive_other: "0",
  receive_delivery: "0",
  lot_prefix: "PO",
};

const defaultPaymentValues: PaymentFormValues = {
  pay_supplier_id: 0,
  pay_amount: 0,
  pay_method: "TRANSFER",
  pay_ref: "",
};

const Purchases: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);
  const [histFrom, setHistFrom] = useState("");
  const [histTo, setHistTo] = useState("");
  const [histSupplier, setHistSupplier] = useState<number | "">("");
  const [orderSubmitError, setOrderSubmitError] = useState("");
  const [receiveSubmitError, setReceiveSubmitError] = useState("");
  const [paymentSubmitError, setPaymentSubmitError] = useState("");

  const { data: products, isLoading: loadingProducts } = useQuery({ queryKey: ["products"], queryFn: () => listProducts(), staleTime: 60_000 });
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => listSuppliers(), staleTime: 60_000 });
  const { data: orders, isLoading: loadingOrders } = useQuery<PurchaseOrder[]>({ queryKey: ["purchase-orders"], queryFn: () => listPurchaseOrders(), staleTime: 30_000 });
  const { data: purchases, isLoading: loadingPurchases, isError: purchasesError, refetch: refetchPurchases } = useQuery({
    queryKey: ["purchases-history", histFrom, histTo, histSupplier],
    queryFn: () =>
      listPurchases({
        from_date: histFrom || undefined,
        to: histTo || undefined,
        supplier_id: histSupplier ? Number(histSupplier) : undefined,
      }),
  });

  const {
    control: orderControl,
    register: registerOrder,
    getValues: getOrderValues,
    setValue: setOrderValue,
    reset: resetOrder,
    trigger: triggerOrder,
    handleSubmit: handleOrderSubmit,
    formState: { errors: orderErrors, isDirty: isOrderDirty, isSubmitting: isOrderSubmitting, isValid: isOrderValid },
  } = useForm<OrderFormValues>({ resolver: zodResolver(orderFormSchema), mode: "onChange", defaultValues: defaultOrderValues });

  const {
    control: receiveControl,
    register: registerReceive,
    setValue: setReceiveValue,
    reset: resetReceive,
    handleSubmit: handleReceiveSubmit,
    formState: { errors: receiveErrors, isDirty: isReceiveDirty, isSubmitting: isReceiveSubmitting, isValid: isReceiveValid },
  } = useForm<ReceiveFormValues>({ resolver: zodResolver(receiveFormSchema), mode: "onChange", defaultValues: defaultReceiveValues });

  const {
    control: paymentControl,
    register: registerPayment,
    reset: resetPayment,
    handleSubmit: handlePaymentSubmit,
    formState: { errors: paymentErrors, isDirty: isPaymentDirty, isSubmitting: isPaymentSubmitting, isValid: isPaymentValid },
  } = useForm<PaymentFormValues>({ resolver: zodResolver(paymentFormSchema), mode: "onChange", defaultValues: defaultPaymentValues });

  const productNameById = useMemo(() => {
    const map = new Map<number, string>();
    (products || []).forEach((product) => map.set(product.id, product.name));
    return map;
  }, [products]);

  const supplierNameById = useMemo(() => {
    const map = new Map<number, string>();
    (suppliers || []).forEach((supplier) => map.set(supplier.id, supplier.name));
    return map;
  }, [suppliers]);

  const purchaseRows = (purchases || []).map((purchase) => ({
    key: purchase.id,
    title: `Compra #${purchase.id}`,
    subtitle: `Proveedor: ${supplierNameById.get(purchase.supplier_id) || purchase.supplier_id}`,
    right: <Typography sx={{ fontWeight: 700 }}>{formatMoney(purchase.total)}</Typography>,
    fields: [
      { label: "Subtotal", value: formatMoney(purchase.subtotal || 0) },
      { label: "Costos directos", value: formatMoney(purchase.direct_costs_total || 0) },
    ],
  }));

  const extractErrorDetail = (error: unknown, fallback: string): string => {
    const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    return fallback;
  };

  const addItem = async () => {
    setOrderSubmitError("");
    const valid = await triggerOrder(["product_id", "qty", "unit_cost"]);
    if (!valid) {
      showToast({ message: "Revisa el producto, cantidad y costo antes de agregar.", severity: "warning" });
      return;
    }

    const values = getOrderValues();
    setItems((prev) => [
      ...prev,
      {
        product_id: Number(values.product_id),
        qty: Number(values.qty),
        unit_cost: Number(values.unit_cost),
      },
    ]);
    setOrderValue("product_id", 0, { shouldDirty: false, shouldValidate: false });
    setOrderValue("qty", 1, { shouldDirty: false, shouldValidate: true });
    setOrderValue("unit_cost", 0, { shouldDirty: false, shouldValidate: true });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const onCreateOrder = async (values: OrderFormValues) => {
    setOrderSubmitError("");
    if (items.length === 0) {
      setOrderSubmitError("Agrega al menos un item antes de crear la orden.");
      showToast({ message: "Agrega al menos un item antes de crear la orden.", severity: "warning" });
      return;
    }
    try {
      await createPurchaseOrder({ supplier_id: Number(values.supplier_id), items });
      showToast({ message: "OC creada", severity: "success" });
      setItems([]);
      resetOrder(defaultOrderValues);
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "No se pudo crear la OC");
      setOrderSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const loadOrderItems = async (orderId: number) => {
    try {
      setLoadingOrderItems(true);
      const loadedItems = await listPurchaseOrderItems(orderId);
      setOrderItems(loadedItems);
    } catch (error: unknown) {
      setOrderItems([]);
      const message = extractErrorDetail(error, "No se pudieron cargar los items de la OC");
      setReceiveSubmitError(message);
      showToast({ message, severity: "error" });
    } finally {
      setLoadingOrderItems(false);
    }
  };

  const onReceive = async (values: ReceiveFormValues) => {
    setReceiveSubmitError("");
    const selectedItem = orderItems.find((item) => item.product_id === values.receive_product_id);
    const remainingQty = selectedItem ? selectedItem.qty - selectedItem.received_qty : 0;
    if (!selectedItem) {
      setReceiveSubmitError("Selecciona un producto valido dentro de la orden.");
      return;
    }
    if (values.receive_qty > remainingQty) {
      setReceiveSubmitError(`La cantidad excede lo pendiente. Disponible: ${remainingQty}.`);
      return;
    }

    try {
      const direct_costs_breakdown = {
        transport: Number(values.receive_transport || 0),
        pack: Number(values.receive_pack || 0),
        other: Number(values.receive_other || 0),
        delivery: Number(values.receive_delivery || 0),
      };
      const result = await receivePurchaseOrderWithCosts(Number(values.receive_order_id), {
        items: [{ product_id: Number(values.receive_product_id), qty: values.receive_qty }],
        direct_costs_breakdown,
        lot_prefix: values.lot_prefix.trim(),
      });
      showToast({
        message: `Recepcion registrada. Subtotal: ${formatMoney(result?.subtotal || 0)} | Total: ${formatMoney(result?.total || 0)}`,
        severity: "success",
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
        qc.invalidateQueries({ queryKey: ["purchases-history"] }),
      ]);
      await loadOrderItems(Number(values.receive_order_id));
      resetReceive({
        ...defaultReceiveValues,
        receive_order_id: values.receive_order_id,
        lot_prefix: values.lot_prefix.trim(),
      });
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "No se pudo registrar la recepcion");
      setReceiveSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const onPay = async (values: PaymentFormValues) => {
    setPaymentSubmitError("");
    try {
      await supplierPayment({
        supplier_id: Number(values.pay_supplier_id),
        amount: values.pay_amount,
        method: values.pay_method.trim(),
        reference: values.pay_ref.trim(),
      });
      showToast({ message: "Pago registrado", severity: "success" });
      resetPayment(defaultPaymentValues);
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "No se pudo registrar el pago");
      setPaymentSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportPurchases({
        from_date: histFrom || undefined,
        to: histTo || undefined,
        supplier_id: histSupplier ? Number(histSupplier) : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "compras.csv";
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      showToast({ message: extractErrorDetail(error, "No se pudo exportar el historial"), severity: "error" });
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <PageHeader
        title="Compras"
        subtitle="Ordenes, recepcion y pagos de proveedores."
        icon={<LocalShippingIcon color="primary" />}
        chips={[
          `OC abiertas: ${(orders || []).filter((order) => order.status === "OPEN").length}`,
          `Proveedores: ${suppliers?.length ?? 0}`,
        ]}
        loading={loadingProducts || loadingSuppliers || loadingOrders || loadingPurchases}
      />

      <Paper sx={{ p: { xs: 0.9, md: 1.05 } }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Orden de compra" />
          <Tab label="Recepcion" />
          <Tab label="Pagos" />
          <Tab label="Historial" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Orden de compra
          </Typography>
          <Box component="form" onSubmit={handleOrderSubmit(onCreateOrder)} sx={{ display: "grid", gap: 2 }}>
            {orderSubmitError ? <Alert severity="error">{orderSubmitError}</Alert> : null}
            {isOrderDirty || items.length > 0 ? (
              <Typography variant="caption" color="text.secondary">
                Hay cambios pendientes en la orden. {items.length > 0 ? `${items.length} item(s) listos para enviar.` : ""}
              </Typography>
            ) : null}
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <Controller
                control={orderControl}
                name="supplier_id"
                render={({ field }) => (
                  <TextField
                    select
                    label="Proveedor"
                    value={field.value || ""}
                    error={!!orderErrors.supplier_id}
                    helperText={orderErrors.supplier_id?.message || "Proveedor principal de la orden."}
                    onChange={(event) => {
                      setOrderSubmitError("");
                      field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                    }}
                  >
                    <MenuItem value="">Seleccionar proveedor</MenuItem>
                    {(suppliers || []).map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                control={orderControl}
                name="product_id"
                render={({ field }) => (
                  <TextField
                    select
                    label="Producto"
                    value={field.value || ""}
                    error={!!orderErrors.product_id}
                    helperText={orderErrors.product_id?.message || "Producto que deseas agregar a la OC."}
                    onChange={(event) => {
                      setOrderSubmitError("");
                      field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                    }}
                  >
                    <MenuItem value="">Seleccionar producto</MenuItem>
                    {(products || []).map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label="Cantidad"
                type="number"
                error={!!orderErrors.qty}
                helperText={orderErrors.qty?.message || "Cantidad solicitada."}
                inputProps={{ min: 1, step: 1 }}
                {...registerOrder("qty", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: () => setOrderSubmitError(""),
                })}
              />
              <TextField
                label="Costo"
                type="number"
                error={!!orderErrors.unit_cost}
                helperText={orderErrors.unit_cost?.message || "Costo unitario pactado."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerOrder("unit_cost", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: () => setOrderSubmitError(""),
                })}
              />
              <Button type="button" variant="outlined" onClick={addItem} fullWidth={isCompact} disabled={!isOrderValid || loadingProducts}>
                Agregar item
              </Button>
            </Box>

            {items.length > 0 ? (
              isCompact ? (
                <Box sx={{ display: "grid", gap: 1 }}>
                  {items.map((item, index) => (
                    <Paper key={`${item.product_id}-${index}`} variant="outlined" sx={{ p: 1.25, display: "grid", gap: 0.5 }}>
                      <Typography sx={{ fontWeight: 700 }}>{productNameById.get(item.product_id) || item.product_id}</Typography>
                      <Typography variant="body2">Cantidad: {item.qty}</Typography>
                      <Typography variant="body2">Costo: {formatMoney(item.unit_cost)}</Typography>
                      <Button type="button" size="small" color="error" onClick={() => removeItem(index)}>
                        Quitar
                      </Button>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <ResizableTable minHeight={240}><Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Costo</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={`${item.product_id}-${index}`}>
                        <TableCell>{productNameById.get(item.product_id) || item.product_id}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>{formatMoney(item.unit_cost)}</TableCell>
                        <TableCell>
                          <Button type="button" size="small" color="error" onClick={() => removeItem(index)}>
                            Quitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></ResizableTable>
              )
            ) : null}

            <Button type="submit" fullWidth={isCompact} variant="contained" disabled={isOrderSubmitting || items.length === 0}>
              {isOrderSubmitting ? "Creando..." : "Crear OC"}
            </Button>
          </Box>
        </Paper>
      ) : null}

      {tab === 1 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recepcion parcial
          </Typography>
          <Box component="form" onSubmit={handleReceiveSubmit(onReceive)} sx={{ display: "grid", gap: 2 }}>
            {receiveSubmitError ? <Alert severity="error">{receiveSubmitError}</Alert> : null}
            {isReceiveDirty ? (
              <Typography variant="caption" color="text.secondary">
                Hay cambios pendientes en la recepcion. Verifica cantidades y costos directos antes de registrar.
              </Typography>
            ) : null}
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Controller
                control={receiveControl}
                name="receive_order_id"
                render={({ field }) => (
                  <TextField
                    select
                    label="Orden de compra"
                    value={field.value || ""}
                    error={!!receiveErrors.receive_order_id}
                    helperText={receiveErrors.receive_order_id?.message || "Selecciona la orden que vas a recibir."}
                    onChange={async (event) => {
                      setReceiveSubmitError("");
                      const rawValue = event.target.value;
                      if (rawValue === "") {
                        field.onChange(0);
                        setOrderItems([]);
                        setReceiveValue("receive_product_id", 0, { shouldDirty: true, shouldValidate: true });
                        return;
                      }
                      const value = Number(rawValue);
                      field.onChange(value);
                      setReceiveValue("receive_product_id", 0, { shouldDirty: true, shouldValidate: true });
                      await loadOrderItems(value);
                    }}
                  >
                    <MenuItem value="">Seleccione</MenuItem>
                    {(orders || []).map((order) => (
                      <MenuItem key={order.id} value={order.id}>
                        OC #{order.id} - {order.status}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                control={receiveControl}
                name="receive_product_id"
                render={({ field }) => (
                  <TextField
                    select
                    label="Producto"
                    value={field.value || ""}
                    error={!!receiveErrors.receive_product_id}
                    helperText={receiveErrors.receive_product_id?.message || "Producto pendiente dentro de la orden."}
                    onChange={(event) => {
                      setReceiveSubmitError("");
                      field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                    }}
                  >
                    <MenuItem value="">Seleccionar producto</MenuItem>
                    {orderItems.map((item) => {
                      const remaining = item.qty - item.received_qty;
                      return (
                        <MenuItem key={item.product_id} value={item.product_id}>
                          {productNameById.get(item.product_id) || `Producto ${item.product_id}`} (pendiente {remaining})
                        </MenuItem>
                      );
                    })}
                  </TextField>
                )}
              />
              <TextField
                label="Cantidad"
                type="number"
                error={!!receiveErrors.receive_qty}
                helperText={receiveErrors.receive_qty?.message || "Cantidad efectivamente recibida."}
                inputProps={{ min: 1, step: 1 }}
                {...registerReceive("receive_qty", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: () => setReceiveSubmitError(""),
                })}
              />
              <TextField
                label="Transporte"
                type="number"
                error={!!receiveErrors.receive_transport}
                helperText={receiveErrors.receive_transport?.message || "Costo directo de transporte."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerReceive("receive_transport", { onChange: () => setReceiveSubmitError("") })}
              />
              <TextField
                label="Empaque"
                type="number"
                error={!!receiveErrors.receive_pack}
                helperText={receiveErrors.receive_pack?.message || "Costo directo de empaque."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerReceive("receive_pack", { onChange: () => setReceiveSubmitError("") })}
              />
              <TextField
                label="Otros"
                type="number"
                error={!!receiveErrors.receive_other}
                helperText={receiveErrors.receive_other?.message || "Otros costos directos asociados."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerReceive("receive_other", { onChange: () => setReceiveSubmitError("") })}
              />
              <TextField
                label="Delivery"
                type="number"
                error={!!receiveErrors.receive_delivery}
                helperText={receiveErrors.receive_delivery?.message || "Costo directo de entrega."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerReceive("receive_delivery", { onChange: () => setReceiveSubmitError("") })}
              />
              <TextField
                label="Prefijo lote"
                error={!!receiveErrors.lot_prefix}
                helperText={receiveErrors.lot_prefix?.message || "Prefijo usado para generar lotes de recepcion."}
                {...registerReceive("lot_prefix", { onChange: () => setReceiveSubmitError("") })}
              />
              <Button type="submit" variant="contained" fullWidth={isCompact} disabled={!isReceiveValid || isReceiveSubmitting || loadingOrderItems}>
                {isReceiveSubmitting ? "Registrando..." : "Registrar recepcion"}
              </Button>
            </Box>

            {loadingOrderItems ? (
              <LoadingState title="Cargando items de la OC..." />
            ) : orderItems.length > 0 ? (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Pendiente por recibir
                </Typography>
                <Box sx={{ display: "grid", gap: 0.75 }}>
                  {orderItems.map((item) => {
                    const remaining = item.qty - item.received_qty;
                    return (
                      <Typography key={item.product_id} variant="body2">
                        {productNameById.get(item.product_id) || `Producto ${item.product_id}`}: pendiente {remaining} de {item.qty}
                      </Typography>
                    );
                  })}
                </Box>
              </Paper>
            ) : null}
          </Box>
        </Paper>
      ) : null}

      {tab === 2 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Pago a proveedor
          </Typography>
          <Box component="form" onSubmit={handlePaymentSubmit(onPay)} sx={{ display: "grid", gap: 2 }}>
            {paymentSubmitError ? <Alert severity="error">{paymentSubmitError}</Alert> : null}
            {isPaymentDirty ? (
              <Typography variant="caption" color="text.secondary">
                Hay cambios pendientes en el pago. Verifica monto, metodo y referencia antes de registrar.
              </Typography>
            ) : null}
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Controller
                control={paymentControl}
                name="pay_supplier_id"
                render={({ field }) => (
                  <TextField
                    select
                    label="Proveedor"
                    value={field.value || ""}
                    error={!!paymentErrors.pay_supplier_id}
                    helperText={paymentErrors.pay_supplier_id?.message || "Proveedor al que se registra el pago."}
                    onChange={(event) => {
                      setPaymentSubmitError("");
                      field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                    }}
                  >
                    <MenuItem value="">Seleccionar proveedor</MenuItem>
                    {(suppliers || []).map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label="Monto"
                type="number"
                error={!!paymentErrors.pay_amount}
                helperText={paymentErrors.pay_amount?.message || "Monto total abonado al proveedor."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerPayment("pay_amount", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: () => setPaymentSubmitError(""),
                })}
              />
              <TextField
                label="Metodo"
                error={!!paymentErrors.pay_method}
                helperText={paymentErrors.pay_method?.message || "Ejemplo: TRANSFER, CASH, CARD."}
                {...registerPayment("pay_method", { onChange: () => setPaymentSubmitError("") })}
              />
              <TextField
                label="Referencia"
                error={!!paymentErrors.pay_ref}
                helperText={paymentErrors.pay_ref?.message || "Opcional. Numero de operacion o comprobante."}
                {...registerPayment("pay_ref", { onChange: () => setPaymentSubmitError("") })}
              />
              <Button type="submit" variant="contained" fullWidth={isCompact} disabled={!isPaymentValid || isPaymentSubmitting}>
                {isPaymentSubmitting ? "Registrando..." : "Registrar pago"}
              </Button>
            </Box>
          </Box>
        </Paper>
      ) : null}

      {tab === 3 ? (
        <>
          <TableToolbar title="Historial de compras" subtitle="Consulta y exportacion por fecha y proveedor.">
            <TextField type="date" label="Desde" value={histFrom} onChange={(event) => setHistFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="Hasta" value={histTo} onChange={(event) => setHistTo(event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField
              select
              label="Proveedor"
              value={histSupplier}
              onChange={(event) => setHistSupplier(event.target.value === "" ? "" : Number(event.target.value))}
              sx={{ width: "100%", maxWidth: { sm: 240 } }}
            >
              <MenuItem value="">Todos</MenuItem>
              {(suppliers || []).map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </TextField>
            <Button type="button" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
              Exportar CSV
            </Button>
          </TableToolbar>

          <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
            {loadingPurchases ? (
              <LoadingState title="Cargando historial..." />
            ) : purchasesError ? (
              <ErrorState title="No se pudo cargar historial" onRetry={() => refetchPurchases()} />
            ) : (purchases || []).length === 0 ? (
              <EmptyState title="Sin compras" description="No hay compras en el rango seleccionado." />
            ) : isCompact ? (
              <CardTable rows={purchaseRows} />
            ) : (
              <ResizableTable minHeight={240}><Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="right">Costos directos</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(purchases || []).map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{purchase.id}</TableCell>
                      <TableCell>{supplierNameById.get(purchase.supplier_id) || purchase.supplier_id}</TableCell>
                      <TableCell align="right">{formatMoney(purchase.subtotal || 0)}</TableCell>
                      <TableCell align="right">{formatMoney(purchase.direct_costs_total || 0)}</TableCell>
                      <TableCell align="right">{formatMoney(purchase.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></ResizableTable>
            )}
          </Paper>
        </>
      ) : null}
    </Box>
  );
};

export default Purchases;


