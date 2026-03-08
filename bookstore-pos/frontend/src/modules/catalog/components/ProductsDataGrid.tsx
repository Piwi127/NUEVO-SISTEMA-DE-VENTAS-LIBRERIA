import React, { useEffect, useMemo, useState } from "react";
import { Box, IconButton } from "@mui/material";
import { DataGrid, GridColDef, GridColumnResizeParams, GridRenderCellParams, useGridApiRef } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Product } from "@/modules/shared/types";
import { useSettings } from "@/app/store";

const PRODUCTS_GRID_COLUMN_WIDTHS_KEY = "products-grid-column-widths";
const MIN_COLUMN_WIDTH = 70;

type GridColumnWidthModel = Record<string, number>;

const readStoredColumnWidths = (): GridColumnWidthModel => {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(PRODUCTS_GRID_COLUMN_WIDTHS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const widths: GridColumnWidthModel = {};
        Object.entries(parsed).forEach(([field, value]) => {
            if (typeof value === "number" && Number.isFinite(value) && value >= MIN_COLUMN_WIDTH) {
                widths[field] = value;
            }
        });
        return widths;
    } catch {
        return {};
    }
};

interface ProductsDataGridProps {
    rows: any[];
    isLoading: boolean;
    selectedIds: number[];
    onSelectionModelChange: (ids: number[]) => void;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    isDeleting: boolean;
}

export const ProductsDataGrid: React.FC<ProductsDataGridProps> = ({
    rows,
    isLoading,
    selectedIds,
    onSelectionModelChange,
    onEdit,
    onDelete,
    isDeleting,
}) => {
    const apiRef = useGridApiRef();
    const { compactMode } = useSettings();
    const [columnWidthModel, setColumnWidthModel] = useState<GridColumnWidthModel>(() => readStoredColumnWidths());

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (Object.keys(columnWidthModel).length === 0) {
            window.localStorage.removeItem(PRODUCTS_GRID_COLUMN_WIDTHS_KEY);
            return;
        }
        window.localStorage.setItem(PRODUCTS_GRID_COLUMN_WIDTHS_KEY, JSON.stringify(columnWidthModel));
    }, [columnWidthModel]);

    useEffect(() => {
        if (typeof apiRef.current.subscribeEvent !== "function") return;

        return apiRef.current.subscribeEvent("columnWidthChange", (params: GridColumnResizeParams) => {
            const nextWidth = Math.round(params.width);
            if (!Number.isFinite(nextWidth)) return;
            setColumnWidthModel((current) => {
                if (current[params.colDef.field] === nextWidth) return current;
                return { ...current, [params.colDef.field]: nextWidth };
            });
        });
    }, [apiRef, compactMode]);

    const columns: GridColDef[] = useMemo(
        () =>
            [
                { field: "id", headerName: "ID", width: 75, minWidth: 70 },
                { field: "sku", headerName: "SKU", width: 140, minWidth: 100 },
                { field: "name", headerName: "Nombre", width: 260, minWidth: 140 },
                { field: "author", headerName: "Autor", width: 180, minWidth: 120 },
                { field: "isbn", headerName: "ISBN", width: 160, minWidth: 120 },
                { field: "category", headerName: "Categoria", width: 160, minWidth: 110 },
                { field: "tags", headerName: "Tags", width: 220, minWidth: 130 },
                { field: "price", headerName: "Precio", width: 110, minWidth: 90 },
                { field: "cost", headerName: "Costo", width: 110, minWidth: 90 },
                { field: "stock", headerName: "Stock", width: 90, minWidth: 70 },
                { field: "stock_min", headerName: "Stock Min", width: 110, minWidth: 90 },
                {
                    field: "actions",
                    headerName: "Acciones",
                    width: 170,
                    minWidth: 120,
                    sortable: false,
                    filterable: false,
                    disableColumnMenu: true,
                    renderCell: (params: GridRenderCellParams<Product>) => (
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                            <IconButton
                                size="small"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onEdit(params.row.id as number);
                                }}
                                title="Editar"
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                color="error"
                                disabled={isDeleting}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDelete(params.row.id as number);
                                }}
                                title="Eliminar"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ),
                },
            ].map((column) => {
                const storedWidth = columnWidthModel[column.field];
                if (typeof storedWidth !== "number" || !Number.isFinite(storedWidth)) return column;

                return {
                    ...column,
                    width: Math.max(storedWidth, column.minWidth ?? MIN_COLUMN_WIDTH),
                };
            }),
        [columnWidthModel, isDeleting, onEdit, onDelete]
    );

    return (
        <Box sx={{ height: "100%", width: "100%", animation: "fadeIn var(--transition-smooth) forwards" }}>
            <DataGrid
                apiRef={apiRef}
                rows={rows}
                columns={columns}
                loading={isLoading}
                pageSizeOptions={[10, 25, 50, 100]}
                checkboxSelection
                density="compact"
                columnHeaderHeight={48}
                rowHeight={52}
                disableRowSelectionOnClick
                rowSelectionModel={selectedIds}
                onRowSelectionModelChange={(selection) =>
                    onSelectionModelChange(selection.map((value) => Number(value)).filter((value) => Number.isFinite(value)))
                }
                onRowDoubleClick={(params) => onEdit(params.row.id as number)}
                sx={{
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": {
                        bgcolor: "var(--bg-app)",
                        color: "var(--color-primary-light)",
                        borderBottom: "1px solid var(--border-subtle)",
                    },
                    "& .MuiDataGrid-columnSeparator": {
                        opacity: 1,
                        visibility: "visible",
                        color: "var(--border-subtle)",
                    },
                    "& .MuiDataGrid-columnSeparator--resizable": {
                        cursor: "col-resize",
                    },
                    "& .MuiDataGrid-cell": {
                        outline: "none",
                        borderBottom: "1px solid var(--border-subtle)",
                    },
                    "& .MuiDataGrid-row:hover": {
                        backgroundColor: "rgba(59, 130, 246, 0.04)"
                    }
                }}
            />
        </Box>
    );
};
