import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/app/components";
import {
    getProduct,
    listProductCategories,
    createProduct,
    updateProduct,
    previewProductPricing,
    applyProductPricing,
    type PricingPreviewPayload,
    type PricingPreviewResponse,
} from "@/modules/catalog/api";
import type { Product } from "@/modules/shared/types";

export type CategoryTab = "existing" | "new";

const nonNegativeNumberSchema = z.number().min(0, "Debe ser mayor o igual a 0.");
const nonNegativeIntegerSchema = z.number().int("Ingresa un numero entero.").min(0, "Debe ser mayor o igual a 0.");
const positiveIntegerSchema = z.number().int("Ingresa un numero entero.").min(1, "Debe ser al menos 1.");

const decimalInputSchema = z
    .string()
    .trim()
    .min(1, "Ingresa un valor.")
    .refine((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0;
    }, "Ingresa un monto valido.");

const marginPercentSchema = z
    .string()
    .trim()
    .min(1, "Ingresa el margen deseado.")
    .refine((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 && parsed < 100;
    }, "Usa un porcentaje entre 0 y 99.99.");

export const productFormSchema = z.object({
    sku: z.string().trim().min(1, "Ingresa el SKU.").max(60, "El SKU es demasiado largo."),
    name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(180, "El nombre es demasiado largo."),
    author: z.string().trim().max(160, "El autor es demasiado largo."),
    publisher: z.string().trim().max(160, "La editorial es demasiado larga."),
    isbn: z.string().trim().max(32, "El ISBN es demasiado largo."),
    barcode: z.string().trim().max(80, "El codigo de barras es demasiado largo."),
    shelf_location: z.string().trim().max(80, "La ubicacion es demasiado larga."),
    category: z.string().trim().max(80, "La categoria es demasiado larga."),
    tags: z.string().trim().max(200, "Las etiquetas son demasiado largas."),
    price: nonNegativeNumberSchema,
    cost: nonNegativeNumberSchema,
    sale_price: nonNegativeNumberSchema,
    cost_total: nonNegativeNumberSchema,
    cost_qty: positiveIntegerSchema,
    direct_costs_breakdown: z.string(),
    direct_costs_total: nonNegativeNumberSchema,
    desired_margin: z.number().min(0, "El margen no puede ser negativo.").max(0.9999, "El margen debe ser menor a 100%."),
    unit_cost: nonNegativeNumberSchema,
    stock: nonNegativeIntegerSchema,
    stock_min: nonNegativeIntegerSchema,
});

export const pricingFormSchema = z.object({
    qty: positiveIntegerSchema,
    cost_total: decimalInputSchema,
    transport: decimalInputSchema,
    pack: decimalInputSchema,
    other: decimalInputSchema,
    delivery: decimalInputSchema,
    desired_margin_percent: marginPercentSchema,
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type MarginInputs = z.infer<typeof pricingFormSchema>;
type PricingBackedProductFields = Pick<
    ProductFormValues,
    "price" | "sale_price" | "cost" | "unit_cost" | "cost_total" | "cost_qty" | "direct_costs_breakdown" | "direct_costs_total" | "desired_margin"
>;

const emptyForm: ProductFormValues = {
    sku: "",
    name: "",
    author: "",
    publisher: "",
    isbn: "",
    barcode: "",
    shelf_location: "",
    category: "",
    tags: "",
    price: 0,
    cost: 0,
    sale_price: 0,
    cost_total: 0,
    cost_qty: 1,
    direct_costs_breakdown: "{}",
    direct_costs_total: 0,
    desired_margin: 0,
    unit_cost: 0,
    stock: 0,
    stock_min: 0,
};

const emptyMarginInputs: MarginInputs = {
    qty: 1,
    cost_total: "0",
    transport: "0",
    pack: "0",
    other: "0",
    delivery: "0",
    desired_margin_percent: "35",
};

const pricingBackedFields = new Set<keyof ProductFormValues>([
    "price",
    "sale_price",
    "cost",
    "unit_cost",
    "cost_total",
    "cost_qty",
    "direct_costs_breakdown",
    "direct_costs_total",
    "desired_margin",
]);

const parseBreakdown = (raw: string): Record<string, number> => {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, Number(value || 0)]));
    } catch {
        return {};
    }
};

const toDecimalString = (value: string): string => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "0";
    return parsed.toString();
};

const errorMessage = (err: any, fallback: string) => err?.response?.data?.detail || fallback;

export interface UseProductFormProps {
    productId?: number | null;
    onComplete?: () => void;
}

export const useProductForm = (props?: UseProductFormProps) => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { showToast } = useToast();
    const { productId: routeId } = useParams();
    const onComplete = props?.onComplete;

    const resolvedId = props?.productId !== undefined ? props.productId : Number(routeId);
    const isEditing = Number.isFinite(resolvedId) && (resolvedId ?? 0) > 0;
    const finalId = resolvedId ?? 0;

    const [saving, setSaving] = useState(false);
    const [categoryTab, setCategoryTab] = useState<CategoryTab>("existing");
    const [newCategory, setNewCategory] = useState("");
    const [preview, setPreview] = useState<PricingPreviewResponse | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [applyLoading, setApplyLoading] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [pricingError, setPricingError] = useState("");

    const productQuery = useQuery({
        queryKey: ["product", finalId],
        queryFn: () => getProduct(finalId),
        enabled: isEditing,
        staleTime: 30_000,
    });

    const categoriesQuery = useQuery({
        queryKey: ["product-categories"],
        queryFn: listProductCategories,
        staleTime: 5 * 60_000,
    });

    const productForm = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema),
        mode: "onChange",
        defaultValues: emptyForm,
    });

    const pricingForm = useForm<MarginInputs>({
        resolver: zodResolver(pricingFormSchema),
        mode: "onChange",
        defaultValues: emptyMarginInputs,
    });

    // Sync loaded product data into forms
    useEffect(() => {
        if (!productQuery.data) return;
        const source = productQuery.data;
        const breakdown = parseBreakdown(source.direct_costs_breakdown || "{}");

        productForm.reset({
            sku: source.sku || "",
            name: source.name || "",
            author: source.author || "",
            publisher: source.publisher || "",
            isbn: source.isbn || "",
            barcode: source.barcode || "",
            shelf_location: source.shelf_location || "",
            category: source.category || "",
            tags: source.tags || "",
            price: Number(source.price || 0),
            cost: Number(source.cost || 0),
            sale_price: Number(source.sale_price ?? source.price ?? 0),
            cost_total: Number(source.cost_total || 0),
            cost_qty: Number(source.cost_qty || 1),
            direct_costs_breakdown: source.direct_costs_breakdown || "{}",
            direct_costs_total: Number(source.direct_costs_total || 0),
            desired_margin: Number(source.desired_margin || 0),
            unit_cost: Number(source.unit_cost || source.cost || 0),
            stock: Number(source.stock || 0),
            stock_min: Number(source.stock_min || 0),
        });

        pricingForm.reset({
            qty: Number(source.cost_qty || 1),
            cost_total: String(Number(source.cost_total || source.cost || 0)),
            transport: String(Number(breakdown.transport || 0)),
            pack: String(Number(breakdown.pack || 0)),
            other: String(Number(breakdown.other || 0)),
            delivery: String(Number(breakdown.delivery || 0)),
            desired_margin_percent: String((Number(source.desired_margin || 0) * 100).toFixed(2)),
        });

        setPreview(null);
        setSubmitError("");
        setPricingError("");
    }, [productQuery.data, pricingForm.reset, productForm.reset]);

    const selectedCategory = productForm.watch("category");
    const syncedValues = productForm.watch([
        "price",
        "cost",
        "cost_total",
        "cost_qty",
        "direct_costs_total",
        "desired_margin",
    ]);

    const categoryOptions = useMemo(() => {
        const values = new Set((categoriesQuery.data || []).map((item) => item.trim()).filter(Boolean));
        const selected = selectedCategory.trim();
        if (selected) values.add(selected);
        return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }, [categoriesQuery.data, selectedCategory]);

    const handleCreateCategory = () => {
        const value = newCategory.trim();
        if (!value) {
            showToast({ message: "Escribe un nombre de categoria", severity: "warning" });
            return;
        }
        setSubmitError("");
        productForm.setValue("category", value, { shouldDirty: true, shouldValidate: true });
        setNewCategory("");
        setCategoryTab("existing");
        showToast({ message: "Categoria agregada al producto", severity: "success" });
    };

    const closeTabOrGoBack = () => {
        if (onComplete) {
            onComplete();
            return;
        }

        // Try navigate first, fallback to window.location
        try {
            navigate("/products", { replace: true });
        } catch {
            window.location.href = "/products";
        }
    };

    const pricingPayload = (values: MarginInputs): PricingPreviewPayload => {
        const desiredMargin = Number(values.desired_margin_percent);
        return {
            qty: Number(values.qty || 0),
            cost_total: toDecimalString(values.cost_total),
            direct_costs_breakdown: {
                transport: toDecimalString(values.transport),
                pack: toDecimalString(values.pack),
                other: toDecimalString(values.other),
                delivery: toDecimalString(values.delivery),
            },
            desired_margin: (desiredMargin / 100).toString(),
        };
    };

    const buildProductPricingFields = (
        payload: PricingPreviewPayload,
        calculated: { unit_cost: number; sale_price: number; direct_costs_total: number }
    ): PricingBackedProductFields => ({
        price: calculated.sale_price,
        sale_price: calculated.sale_price,
        cost: calculated.unit_cost,
        unit_cost: calculated.unit_cost,
        cost_total: Number(payload.cost_total),
        cost_qty: payload.qty,
        direct_costs_breakdown: JSON.stringify(payload.direct_costs_breakdown),
        direct_costs_total: calculated.direct_costs_total,
        desired_margin: Number(payload.desired_margin),
    });

    const syncProductPricingFields = (fields: PricingBackedProductFields, shouldDirty = true) => {
        productForm.setValue("price", fields.price, { shouldDirty, shouldValidate: true });
        productForm.setValue("sale_price", fields.sale_price, { shouldDirty, shouldValidate: true });
        productForm.setValue("cost", fields.cost, { shouldDirty, shouldValidate: true });
        productForm.setValue("unit_cost", fields.unit_cost, { shouldDirty, shouldValidate: true });
        productForm.setValue("cost_total", fields.cost_total, { shouldDirty, shouldValidate: true });
        productForm.setValue("cost_qty", fields.cost_qty, { shouldDirty, shouldValidate: true });
        productForm.setValue("direct_costs_breakdown", fields.direct_costs_breakdown, { shouldDirty, shouldValidate: true });
        productForm.setValue("direct_costs_total", fields.direct_costs_total, { shouldDirty, shouldValidate: true });
        productForm.setValue("desired_margin", fields.desired_margin, { shouldDirty, shouldValidate: true });
    };

    const handlePreviewPricing = async () => {
        setPricingError("");
        const valid = await pricingForm.trigger();
        if (!valid) {
            showToast({ message: "Revisa los campos del pricing antes de calcular.", severity: "warning" });
            return;
        }
        try {
            setPreviewLoading(true);
            const pricingValues = pricingForm.getValues();
            const payload = pricingPayload(pricingValues);
            const response = await previewProductPricing(payload);

            syncProductPricingFields(
                buildProductPricingFields(payload, {
                    unit_cost: response.unit_cost,
                    sale_price: response.sale_price_unit,
                    direct_costs_total: response.direct_costs_total,
                })
            );

            setPreview(response);
            pricingForm.reset(pricingValues);
            showToast({ message: "Costo y precio actualizados en el formulario.", severity: "success" });
        } catch (err: any) {
            const message = errorMessage(err, "No se pudo calcular.");
            setPricingError(message);
            showToast({ message, severity: "error" });
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleApplyPricing = async () => {
        if (!isEditing) {
            showToast({ message: "Primero guarda el producto para aplicar pricing", severity: "warning" });
            return;
        }
        setPricingError("");
        const valid = await pricingForm.trigger();
        if (!valid) {
            showToast({ message: "Revisa los campos del pricing antes de aplicar.", severity: "warning" });
            return;
        }
        try {
            setApplyLoading(true);
            const pricingValues = pricingForm.getValues();
            const payload = pricingPayload(pricingValues);
            const result = await applyProductPricing(finalId, payload);

            const nextPricingFields = buildProductPricingFields(payload, {
                unit_cost: result.unit_cost,
                sale_price: result.sale_price,
                direct_costs_total: result.direct_costs_total,
            });

            const currentProduct = productForm.getValues();
            const nextProduct: ProductFormValues = {
                ...currentProduct,
                ...nextPricingFields,
            };

            const hasNonPricingDirtyFields = Object.keys(productForm.formState.dirtyFields).some(
                (field) => !pricingBackedFields.has(field as keyof ProductFormValues)
            );

            if (hasNonPricingDirtyFields) {
                syncProductPricingFields(nextPricingFields);
            } else {
                productForm.reset(nextProduct);
            }

            pricingForm.reset(pricingValues);
            setPreview({
                qty: payload.qty,
                desired_margin: Number(payload.desired_margin),
                direct_costs_total: result.direct_costs_total,
                cost_total_all: result.cost_total_all,
                unit_cost: result.unit_cost,
                sale_price_unit: result.sale_price,
                profit_unit: result.profit_unit,
            });

            await Promise.all([
                qc.invalidateQueries({ queryKey: ["product", finalId] }),
                qc.invalidateQueries({ queryKey: ["products"] }),
                qc.invalidateQueries({ queryKey: ["products-smart-search"] }),
                qc.invalidateQueries({ queryKey: ["products-smart-search-corrected"] }),
                qc.invalidateQueries({ queryKey: ["products-corrected-search"] }),
            ]);

            showToast({
                message: hasNonPricingDirtyFields ? "Pricing aplicado. Aun hay cambios pendientes en datos del producto." : "Pricing aplicado y sincronizado en el producto.",
                severity: "success",
            });
        } catch (err: any) {
            const message = errorMessage(err, "No se pudo aplicar pricing.");
            setPricingError(message);
            showToast({ message, severity: "error" });
        } finally {
            setApplyLoading(false);
        }
    };

    const handleSave = async (closeAfterSave: boolean) => {
        setSubmitError("");
        const valid = await productForm.trigger();
        if (!valid) {
            showToast({ message: "Revisa los campos del producto antes de guardar.", severity: "warning" });
            return;
        }

        setSaving(true);
        try {
            const values = productForm.getValues();
            const payload: Omit<Product, "id"> = {
                ...values,
                sku: values.sku.trim(),
                name: values.name.trim(),
                author: values.author.trim(),
                publisher: values.publisher.trim(),
                isbn: values.isbn.trim(),
                barcode: values.barcode.trim(),
                shelf_location: values.shelf_location.trim(),
                category: values.category.trim(),
                tags: values.tags.trim(),
                sale_price: Number(values.price || 0),
                price: Number(values.price || 0),
                unit_cost: Number(values.cost || 0),
                cost: Number(values.cost || 0),
                cost_qty: Number(values.cost_qty || 1),
                direct_costs_breakdown: values.direct_costs_breakdown || "{}",
            };

            if (isEditing) {
                await updateProduct(finalId, payload);
                showToast({ message: "Producto actualizado", severity: "success" });
                productForm.reset(payload);
            } else {
                await createProduct(payload);
                showToast({ message: "Producto creado", severity: "success" });
            }

            await Promise.all([
                qc.invalidateQueries({ queryKey: ["products"] }),
                qc.invalidateQueries({ queryKey: ["product-categories"] }),
                qc.invalidateQueries({ queryKey: ["products-smart-search"] }),
                qc.invalidateQueries({ queryKey: ["products-smart-search-corrected"] }),
                qc.invalidateQueries({ queryKey: ["products-corrected-search"] }),
            ]);

            if (closeAfterSave) {
                closeTabOrGoBack();
                return;
            }

            if (!isEditing) {
                productForm.reset(emptyForm);
                pricingForm.reset(emptyMarginInputs);
                setCategoryTab("existing");
                setNewCategory("");
                setPreview(null);
            }
        } catch (err: any) {
            const message = errorMessage(err, "No se pudo guardar.");
            setSubmitError(message);
            showToast({ message, severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    return {
        isEditing,
        parsedId: finalId,
        saving,
        categoryTab,
        setCategoryTab,
        newCategory,
        setNewCategory,
        preview,
        previewLoading,
        applyLoading,
        submitError,
        setSubmitError,
        pricingError,
        setPricingError,

        // queries
        productQuery,
        categoriesQuery,

        // forms
        productForm,
        pricingForm,

        // derived
        categoryOptions,
        syncedValues,

        // actions
        handleCreateCategory,
        closeTabOrGoBack,
        handlePreviewPricing,
        handleApplyPricing,
        handleSave,
    };
};
