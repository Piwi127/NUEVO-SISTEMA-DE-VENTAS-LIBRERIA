import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/app/components";
import {
  createInventoryImportJob,
  downloadInventoryImportJobErrors,
  getInventoryImportJob,
  getInventoryImportJobErrors,
} from "@/modules/inventory/api";
import type { InventoryImportJob, InventoryImportJobErrorList } from "@/modules/shared/types";

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

const isJobRunning = (job: InventoryImportJob | null) => {
  if (!job) return false;
  return job.status === "pending" || job.status === "running";
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
  const [job, setJob] = useState<InventoryImportJob | null>(null);
  const [jobErrors, setJobErrors] = useState<InventoryImportJobErrorList | null>(null);

  const jobActive = useMemo(() => isJobRunning(job), [job]);

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
    setJobErrors(null);
    try {
      const newJob = await createInventoryImportJob(file);
      setJob(newJob);
      setFile(null);
      setPreview([]);
      setTotalRows(0);
      setUploadError("");
      showToast({ message: `Job #${newJob.id} creado. Procesando importación en segundo plano.`, severity: "info" });
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "Hubo un error creando el job de importación.");
      setUploadError(message);
      setUploadLoading(false);
      showToast({ message, severity: "error" });
    }
  };

  useEffect(() => {
    if (!job || !isJobRunning(job)) {
      if (job && uploadLoading) {
        setUploadLoading(false);
      }
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const current = await getInventoryImportJob(job.id);
        if (cancelled) return;
        setJob(current);
        if (isJobRunning(current)) return;

        setUploadLoading(false);
        await qc.invalidateQueries({ queryKey: ["products"] });
        await qc.invalidateQueries({ queryKey: ["kardex"] });

        if (current.error_rows > 0) {
          const errors = await getInventoryImportJobErrors(current.id, { limit: 100 });
          if (!cancelled) {
            setJobErrors(errors);
          }
        }

        if (current.status === "success") {
          showToast({ message: `Importación completada. ${current.success_rows} filas procesadas.`, severity: "success" });
        } else if (current.status === "partial") {
          showToast(
            {
              message: `Importación parcial. OK: ${current.success_rows}, errores: ${current.error_rows}.`,
              severity: "warning",
            }
          );
        } else {
          showToast({ message: current.error_message || "La importación falló.", severity: "error" });
        }
      } catch {
        if (!cancelled) {
          setUploadLoading(false);
        }
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [job?.id, job?.status]);

  const downloadErrors = async () => {
    if (!job || job.error_rows <= 0) return;
    const blob = await downloadInventoryImportJobErrors(job.id);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `import_job_${job.id}_errors.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  return {
    file,
    preview,
    totalRows,
    confirmOpen,
    setConfirmOpen,
    uploadLoading,
    uploadError,
    job,
    jobActive,
    jobErrors,
    handleFileChange,
    handleUpload,
    confirmUpload,
    downloadErrors,
  };
};
