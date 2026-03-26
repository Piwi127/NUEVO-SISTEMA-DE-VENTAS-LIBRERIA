import React, { useEffect, useMemo, useRef } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import { useLocation } from "react-router-dom";

type ResizableTableProps = {
  children: React.ReactNode;
  minHeight?: number;
  maxHeight?: number | string;
  persistKey?: string;
  sx?: SxProps<Theme>;
};

const MIN_COLUMN_WIDTH = 72;
const STORAGE_KEY_PREFIX = "bookstore-table-widths";
const RESIZER_CLASSNAME = "bookstore-table-column-resizer";

type ColumnWidthModel = Record<string, number>;

const readStoredWidths = (storageKey: string): ColumnWidthModel => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const widths: ColumnWidthModel = {};
    Object.entries(parsed).forEach(([index, value]) => {
      if (typeof value === "number" && Number.isFinite(value) && value >= MIN_COLUMN_WIDTH) {
        widths[index] = value;
      }
    });
    return widths;
  } catch {
    return {};
  }
};

const writeStoredWidths = (storageKey: string, widths: ColumnWidthModel) => {
  if (typeof window === "undefined") return;

  if (Object.keys(widths).length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(widths));
};

export const ResizableTable: React.FC<ResizableTableProps> = ({
  children,
  minHeight = 220,
  maxHeight = "64vh",
  persistKey,
  sx,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const routeKey = useMemo(() => {
    const normalizedPath = location.pathname.replace(/\/+?/g, "_").replace(/^_+|_+$/g, "");
    return normalizedPath || "root";
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const container = containerRef.current;
    if (!container) return;

    const table = container.querySelector("table");
    if (!(table instanceof HTMLTableElement)) return;

    const headRow = table.querySelector("thead tr");
    if (!(headRow instanceof HTMLTableRowElement)) return;

    const headerCells = Array.from(headRow.children).filter((cell): cell is HTMLElement => cell instanceof HTMLElement);
    if (!headerCells.length) return;

    const headerKey = headerCells
      .map((cell, index) => cell.innerText.trim() || `column-${index + 1}`)
      .join("|");
    const storageKey = `${STORAGE_KEY_PREFIX}:${persistKey || `${routeKey}:${headerKey}`}`;

    const applyColumnWidth = (index: number, width: number) => {
      const normalizedWidth = Math.max(MIN_COLUMN_WIDTH, Math.round(width));
      const columnCells = table.querySelectorAll<HTMLElement>(`tr > *:nth-child(${index + 1})`);
      columnCells.forEach((cell) => {
        cell.style.width = `${normalizedWidth}px`;
        cell.style.minWidth = `${normalizedWidth}px`;
      });
    };

    const syncTableWidth = () => {
      const totalWidth = headerCells.reduce((sum, cell) => sum + Math.ceil(cell.getBoundingClientRect().width), 0);
      const nextWidth = Math.max(totalWidth, container.clientWidth - 2);
      table.style.width = `${nextWidth}px`;
      table.style.minWidth = `${nextWidth}px`;
    };

    const storedWidths = readStoredWidths(storageKey);
    Object.entries(storedWidths).forEach(([index, width]) => {
      const columnIndex = Number(index);
      if (Number.isInteger(columnIndex) && columnIndex >= 0 && columnIndex < headerCells.length) {
        applyColumnWidth(columnIndex, width);
      }
    });

    if (Object.keys(storedWidths).length > 0) {
      syncTableWidth();
    }

    const cleanups: Array<() => void> = [];

    headerCells.forEach((cell, index) => {
      cell.style.position = "relative";
      cell.style.whiteSpace = "nowrap";

      const existingHandle = cell.querySelector(`.${RESIZER_CLASSNAME}`);
      if (existingHandle) {
        existingHandle.remove();
      }

      const handle = document.createElement("div");
      handle.className = RESIZER_CLASSNAME;
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.title = "Arrastra para ajustar la columna";
      Object.assign(handle.style, {
        position: "absolute",
        top: "0",
        right: "-6px",
        width: "12px",
        height: "100%",
        cursor: "col-resize",
        zIndex: "4",
        touchAction: "none",
        background: "linear-gradient(90deg, transparent 0 40%, rgba(16,58,95,0.3) 40% 60%, transparent 60% 100%)",
      });

      const handleMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startWidth = Math.max(MIN_COLUMN_WIDTH, Math.ceil(cell.getBoundingClientRect().width));
        let nextWidth = startWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
          nextWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + (moveEvent.clientX - startX));
          applyColumnWidth(index, nextWidth);
          syncTableWidth();
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        };

        const handleMouseUp = () => {
          document.body.style.cursor = "";
          document.body.style.userSelect = "";

          const updatedWidths = {
            ...readStoredWidths(storageKey),
            [index]: Math.round(nextWidth),
          };
          writeStoredWidths(storageKey, updatedWidths);

          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      };

      handle.addEventListener("mousedown", handleMouseDown);
      cell.appendChild(handle);

      cleanups.push(() => {
        handle.removeEventListener("mousedown", handleMouseDown);
        handle.remove();
      });
    });

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [children, persistKey, routeKey]);

  return (
    <Box
      ref={containerRef}
      sx={[
        {
          position: "relative",
          overflow: "auto",
          resize: "vertical",
          minHeight,
          maxHeight,
          borderRadius: 3,
          background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(252,248,241,0.88) 100%)",
          border: "1px solid rgba(21,58,93,0.1)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
          pr: 0.35,
          pb: 0.35,
          "& table": {
            width: "max-content",
            minWidth: "100%",
          },
          "& .MuiTableCell-head": {
            position: "relative",
            backgroundClip: "padding-box",
            borderRight: "1px solid rgba(16,58,95,0.12)",
          },
          "& .MuiTableCell-head:last-of-type": {
            borderRight: "none",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            right: 6,
            bottom: 6,
            width: 15,
            height: 15,
            borderRight: "2px solid rgba(21,58,93,0.24)",
            borderBottom: "2px solid rgba(21,58,93,0.24)",
            borderBottomRightRadius: 3,
            pointerEvents: "none",
            opacity: 0.8,
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
};
