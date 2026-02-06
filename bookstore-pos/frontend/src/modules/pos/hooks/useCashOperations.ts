import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCashAudit,
  createCashMovement,
  downloadCashSessionReport,
  forceCloseCash,
  getCashSessionReport,
  getCashSummary,
  getCurrentCash,
  listCashAudits,
  openCash,
} from "@/modules/pos/api";
import { useToast } from "@/app/components";
import { formatDateTimeRegional } from "@/app/utils";
import type { CashSessionReport } from "@/modules/shared/types";

export const useCashOperations = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const currentCashQuery = useQuery({ queryKey: ["cash-current"], queryFn: getCurrentCash });
  const summaryQuery = useQuery({
    queryKey: ["cash-summary"],
    queryFn: getCashSummary,
    enabled: !!currentCashQuery.data?.is_open,
  });
  const auditsQuery = useQuery({ queryKey: ["cash-audits"], queryFn: listCashAudits });

  const [opening, setOpening] = useState(0);
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementReason, setMovementReason] = useState("");
  const [movementType, setMovementType] = useState("IN");
  const [auditType, setAuditType] = useState("X");
  const [counted, setCounted] = useState(0);
  const [tab, setTab] = useState(0);

  const canOperate = !!currentCashQuery.data?.is_open;

  const handleOpen = async () => {
    try {
      await openCash(opening);
      showToast({ message: "Caja abierta", severity: "success" });
      qc.invalidateQueries({ queryKey: ["cash-current"] });
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast({ message: error?.response?.data?.detail || "Error abriendo caja", severity: "error" });
    }
  };

  const handlePrepareCloseZ = () => {
    setAuditType("Z");
    setCounted(summaryQuery.data?.expected_amount || 0);
    showToast({ message: "Preparado cierre Z. Confirma el monto contado y registra el arqueo.", severity: "info" });
  };

  const handleForceClose = async () => {
    try {
      await forceCloseCash();
      showToast({ message: "Caja forzada a cerrar", severity: "success" });
      qc.invalidateQueries({ queryKey: ["cash-current"] });
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast({ message: error?.response?.data?.detail || "Error forzando cierre", severity: "error" });
    }
  };

  const handleMovement = async () => {
    try {
      await createCashMovement({ type: movementType, amount: movementAmount, reason: movementReason });
      showToast({ message: "Movimiento registrado", severity: "success" });
      setMovementAmount(0);
      setMovementReason("");
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast({ message: error?.response?.data?.detail || "Error registrando movimiento", severity: "error" });
    }
  };

  const handleAudit = async () => {
    try {
      await createCashAudit({ type: auditType, counted_amount: counted });
      showToast({ message: "Arqueo registrado", severity: "success" });
      qc.invalidateQueries({ queryKey: ["cash-audits"] });
      qc.invalidateQueries({ queryKey: ["cash-current"] });
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast({ message: error?.response?.data?.detail || "Error en arqueo", severity: "error" });
    }
  };

  const openReportWindow = (report: CashSessionReport) => {
    const popup = window.open("", "_blank", "width=900,height=780");
    if (!popup) {
      showToast({ message: "Permite ventanas emergentes para ver el reporte", severity: "warning" });
      return;
    }

    const movementsRows = report.movements.length
      ? report.movements
          .map(
            (m) => `<tr>
              <td>${formatDateTimeRegional(m.created_at)}</td>
              <td>${m.type}</td>
              <td style="text-align:right">${m.amount.toFixed(2)}</td>
              <td>${m.reason}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="4">Sin movimientos</td></tr>`;

    const auditsRows = report.audits.length
      ? report.audits
          .map(
            (a) => `<tr>
              <td>${formatDateTimeRegional(a.created_at)}</td>
              <td>${a.type}</td>
              <td style="text-align:right">${a.expected_amount.toFixed(2)}</td>
              <td style="text-align:right">${a.counted_amount.toFixed(2)}</td>
              <td style="text-align:right">${a.difference.toFixed(2)}</td>
              <td>${a.validated ? "OK" : "DIF"}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="6">Sin arqueos</td></tr>`;

    const notes = report.validation.notes.length
      ? `<ul>${report.validation.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`
      : "<div>Sin observaciones.</div>";

    popup.document.write(`
      <html>
      <head>
        <title>Reporte Caja #${report.session.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
          h2, h3 { margin: 0 0 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px; font-size: 13px; }
          th { background: #f4f6f8; text-align: left; }
          .grid { display: grid; gap: 4px; margin-bottom: 10px; }
          .strong { font-weight: 700; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h2>Reporte de Caja - Sesion #${report.session.id}</h2>
        <div class="grid">
          <div>Usuario: ${report.session.user_id}</div>
          <div>Apertura: ${formatDateTimeRegional(report.period_start)}</div>
          <div>Cierre: ${formatDateTimeRegional(report.period_end)}</div>
          <div>Estado: ${report.session.is_open ? "ABIERTA" : "CERRADA"}</div>
        </div>
        <h3>Resumen</h3>
        <table>
          <tr><th>Apertura</th><td>${report.summary.opening_amount.toFixed(2)}</td></tr>
          <tr><th>Movimientos IN</th><td>${report.summary.movements_in.toFixed(2)}</td></tr>
          <tr><th>Movimientos OUT</th><td>${report.summary.movements_out.toFixed(2)}</td></tr>
          <tr><th>Ventas efectivo</th><td>${report.summary.sales_cash.toFixed(2)}</td></tr>
          <tr><th>Esperado final</th><td class="strong">${report.summary.expected_amount.toFixed(2)}</td></tr>
        </table>
        <h3>Movimientos</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Motivo</th></tr></thead>
          <tbody>${movementsRows}</tbody>
        </table>
        <h3>Arqueos</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Esperado</th><th>Contado</th><th>Diferencia</th><th>Estado</th></tr></thead>
          <tbody>${auditsRows}</tbody>
        </table>
        <h3>Validacion</h3>
        <div>Movimientos contabilizados: ${report.validation.movement_count}</div>
        <div>Arqueos registrados: ${report.validation.audit_count}</div>
        <div>Balance final validado: <strong>${report.validation.is_balanced ? "SI" : "NO"}</strong></div>
        ${notes}
        <button onclick="window.print()">Imprimir</button>
      </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
  };

  const handleOpenSessionReport = async (cashSessionId: number) => {
    try {
      const report = await getCashSessionReport(cashSessionId);
      openReportWindow(report);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast({ message: error?.response?.data?.detail || "No se pudo abrir el reporte", severity: "error" });
    }
  };

  const handleDownloadSessionReport = async (cashSessionId: number) => {
    try {
      const blob = await downloadCashSessionReport(cashSessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cash_session_${cashSessionId}_report.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast({ message: error?.response?.data?.detail || "No se pudo descargar el reporte", severity: "error" });
    }
  };

  return {
    currentCashQuery,
    summaryQuery,
    auditsQuery,
    opening,
    setOpening,
    movementAmount,
    setMovementAmount,
    movementReason,
    setMovementReason,
    movementType,
    setMovementType,
    auditType,
    setAuditType,
    counted,
    setCounted,
    tab,
    setTab,
    canOperate,
    handleOpen,
    handlePrepareCloseZ,
    handleForceClose,
    handleMovement,
    handleAudit,
    handleOpenSessionReport,
    handleDownloadSessionReport,
  };
};
