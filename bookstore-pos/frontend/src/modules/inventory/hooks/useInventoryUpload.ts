import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/app/components";
import { uploadInventory } from "@/modules/inventory/api";

export const REQUIRED_COLUMNS = ["sku", "name", "category", "price", "cost", "stock", "stock_min"];
export const PREVIEW_LIMIT = 15;

export type PreviewRow = Record<string, string | number>;

const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') {
            if (inQuotes && line[index + 1] === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }

    values.push(current.trim());
    return values;
};

export const useInventoryUpload = () => {
    const qc = useQueryClient();
    const { showToast } = useToast();

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewRow[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    const extractErrorDetail = (error: unknown, fallback: string) => {
        const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        return typeof detail === "string" && detail.trim() ? detail : fallback;
    };

    const validateColumns = (header: string[]) => {
        const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
        if (missing.length > 0) {
            const message = `Faltan columnas obligatorias: ${missing.join(", ")}`;
            setUploadError(message);
            showToast({ message, severity: "error" });
            return false;
        }
        return true;
    };

    const buildPreview = (rows: PreviewRow[]) => {
        setTotalRows(rows.length);
        setPreview(rows.slice(0, PREVIEW_LIMIT));
    };

    const parseCsv = async (selectedFile: File) => {
        const text = await selectedFile.text();
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
        if (lines.length === 0) {
            setUploadError("El archivo CSV esta vacio.");
            return false;
        }
        const header = parseCsvLine(lines[0]).map((value) => value.trim());
        if (!validateColumns(header)) return false;

        const rows = lines.slice(1).map((line) => {
            const values = parseCsvLine(line);
            const row: PreviewRow = {};
            header.forEach((column, index) => {
                row[column] = values[index] ?? "";
            });
            return row;
        });

        buildPreview(rows);
        return true;
    };

    const parseXlsx = async (selectedFile: File) => {
        try {
            const XLSX = await import("xlsx");
            const buffer = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

            const header = (rows[0] || []).map((value) => String(value).trim());
            if (!validateColumns(header)) return false;

            const dataRows = rows.slice(1).map((rawRow) => {
                const row: PreviewRow = {};
                header.forEach((column, index) => {
                    row[column] = rawRow[index] ?? "";
                });
                return row;
            });

            buildPreview(dataRows);
            return true;
        } catch {
            setUploadError("Error al analizar archivo XLSX.");
            return false;
        }
    };

    const handleFileChange = async (selectedFile: File | null) => {
        setUploadError("");
        setPreview([]);
        setTotalRows(0);
        setFile(selectedFile);

        if (!selectedFile) return;

        const fileName = selectedFile.name.toLowerCase();
        const isValid = fileName.endsWith(".csv")
            ? await parseCsv(selectedFile)
            : fileName.endsWith(".xlsx")
                ? await parseXlsx(selectedFile)
                : false;

        if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
            const message = "Formato no soportado. Usa CSV o XLSX.";
            setUploadError(message);
            showToast({ message, severity: "error" });
        }

        if (!isValid) {
            setFile(null);
            setPreview([]);
            setTotalRows(0);
        }
    };

    const handleUpload = () => {
        if (!file || totalRows === 0) {
            setUploadError("Selecciona un archivo valido antes de importar.");
            return;
        }
        setConfirmOpen(true);
    };

    const confirmUpload = async () => {
        if (!file) return;
        setConfirmOpen(false);
        setUploadLoading(true);
        try {
            const result = await uploadInventory(file);
            showToast({ message: `Carga masiva completa. Se procesaron ${result.count} items.`, severity: "success" });
            await qc.invalidateQueries({ queryKey: ["products"] });
            setFile(null);
            setPreview([]);
            setTotalRows(0);
            setUploadError("");
        } catch (error: unknown) {
            const message = extractErrorDetail(error, "Hubo un error en la carga masiva.");
            setUploadError(message);
            showToast({ message, severity: "error" });
        } finally {
            setUploadLoading(false);
        }
    };

    return {
        file,
        preview,
        totalRows,
        confirmOpen,
        setConfirmOpen,
        uploadLoading,
        uploadError,
        handleFileChange,
        handleUpload,
        confirmUpload,
    };
};
