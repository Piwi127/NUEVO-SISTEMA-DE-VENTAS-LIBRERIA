import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/app/components";
import { listProducts, listProductCategories, deleteProduct, applyBulkProductPricing } from "@/modules/catalog/api";

const MAX_PRODUCTS = 500;

export const useProductsList = () => {
    const qc = useQueryClient();
    const { showToast } = useToast();

    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkTarget, setBulkTarget] = useState<"selected" | "category" | "all">("selected");
    const [bulkCategory, setBulkCategory] = useState("");
    const [bulkMarginPercent, setBulkMarginPercent] = useState("35");

    const [deleteTargetIds, setDeleteTargetIds] = useState<number[]>([]);

    const normalizedQuery = query.trim();

    // Queries
    const productsQuery = useQuery({
        queryKey: ["products", normalizedQuery, category],
        queryFn: () => listProducts(normalizedQuery || undefined, MAX_PRODUCTS, 0, category || undefined, undefined, false),
        staleTime: 30_000,
        placeholderData: (previous) => previous,
    });

    const categoriesQuery = useQuery({
        queryKey: ["product-categories"],
        queryFn: listProductCategories,
        staleTime: 5 * 60_000,
    });

    const rows = productsQuery.data || [];
    const displayRows = useMemo(() => rows.map((row) => ({ ...row, price: row.sale_price ?? row.price })), [rows]);
    const categories = categoriesQuery.data || [];

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    // Keep selection synced if rows change
    useEffect(() => {
        const rowIds = new Set(rows.map((row) => row.id));
        setSelectedIds((prev) => prev.filter((id) => rowIds.has(id)));
    }, [rows]);

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            await Promise.all(ids.map((id) => deleteProduct(id)));
            return ids;
        },
        onSuccess: async (deletedIds) => {
            setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
            setDeleteTargetIds([]);
            await Promise.all([
                qc.invalidateQueries({ queryKey: ["products"] }),
                qc.invalidateQueries({ queryKey: ["product-categories"] }),
                qc.invalidateQueries({ queryKey: ["products-smart-search"] }),
                qc.invalidateQueries({ queryKey: ["products-smart-search-corrected"] }),
            ]);
            showToast({
                message: deletedIds.length === 1 ? "Producto eliminado" : `${deletedIds.length} productos eliminados`,
                severity: "success",
            });
        },
        onError: (error: any) => {
            showToast({ message: error?.response?.data?.detail || "No se pudo eliminar", severity: "error" });
        },
    });

    const bulkPricingMutation = useMutation({
        mutationFn: async () => {
            const parsedMargin = Number(bulkMarginPercent);
            if (!Number.isFinite(parsedMargin) || parsedMargin < 0 || parsedMargin >= 100) {
                throw new Error("Margen invalido. Debe estar entre 0 y 99.99");
            }
            const payload: { desired_margin: string; product_ids?: number[]; category?: string } = {
                desired_margin: (parsedMargin / 100).toString(),
            };
            if (bulkTarget === "selected") {
                if (!selectedIds.length) throw new Error("No hay productos seleccionados");
                payload.product_ids = selectedIds;
            } else if (bulkTarget === "category") {
                if (!bulkCategory) throw new Error("Selecciona una categoria");
                payload.category = bulkCategory;
            }
            return applyBulkProductPricing(payload);
        },
        onSuccess: async (result) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: ["products"] }),
                qc.invalidateQueries({ queryKey: ["products-smart-search"] }),
                qc.invalidateQueries({ queryKey: ["products-smart-search-corrected"] }),
            ]);
            showToast({
                message: `Ajuste masivo aplicado: ${result.updated_count} productos actualizados`,
                severity: "success",
            });
            setBulkOpen(false);
        },
        onError: (error: any) => {
            const detail = error?.response?.data?.detail || error?.message || "No se pudo aplicar el ajuste masivo";
            showToast({ message: detail, severity: "error" });
        },
    });

    const requestDeleteIds = (ids: number[]) => {
        if (!ids.length || deleteMutation.isPending) return;
        setDeleteTargetIds(ids);
    };

    const handleConfirmDelete = () => {
        if (!deleteTargetIds.length || deleteMutation.isPending) return;
        deleteMutation.mutate(deleteTargetIds);
    };

    const handleDeleteOne = (id: number) => requestDeleteIds([id]);
    const handleDeleteSelected = () => requestDeleteIds(selectedIds);

    const handleBulkApply = () => {
        if (bulkPricingMutation.isPending) return;
        bulkPricingMutation.mutate();
    };

    return {
        // State
        query,
        setQuery,
        normalizedQuery,
        category,
        setCategory,
        selectedIds,
        setSelectedIds,
        selectedSet,
        bulkOpen,
        setBulkOpen,
        bulkTarget,
        setBulkTarget,
        bulkCategory,
        setBulkCategory,
        bulkMarginPercent,
        setBulkMarginPercent,
        deleteTargetIds,
        setDeleteTargetIds,

        // Data
        rows,
        displayRows,
        categories,
        isLoading: productsQuery.isLoading,
        isError: productsQuery.isError,

        // Actions & Flags
        productsQuery,
        deleteMutation,
        bulkPricingMutation,
        requestDeleteIds,
        handleConfirmDelete,
        handleDeleteOne,
        handleDeleteSelected,
        handleBulkApply,
        MAX_PRODUCTS,
    };
};
