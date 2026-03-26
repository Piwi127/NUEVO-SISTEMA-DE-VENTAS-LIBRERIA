import React, { useEffect, useRef, useState } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type ResizeAxis = "none" | "x" | "y" | "both";

type PanelSize = {
  width: number | null;
  height: number | null;
};

type DragState = {
  startX: number;
  startY: number;
  width: number;
  height: number;
} | null;

type ResizablePanelProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  overline?: string;
  actions?: React.ReactNode;
  resize?: ResizeAxis;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  persistKey?: string;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getCursor = (resize: ResizeAxis) => {
  if (resize === "x") return "ew-resize";
  if (resize === "y") return "ns-resize";
  return "nwse-resize";
};

// Componente de panel redimensionable
// Panel con cabecera y contenido que puede redimensionarse
// Props: title - título, subtitle - descripción, actions - botones de acción, resize - ejes de redimensión
  children,
  title,
  subtitle,
  overline,
  actions,
  resize = "none",
  minWidth = 280,
  minHeight = 180,
  maxWidth,
  maxHeight,
  defaultWidth,
  defaultHeight,
  persistKey,
  sx,
  contentSx,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const allowX = resize === "x" || resize === "both";
  const allowY = resize === "y" || resize === "both";
  const [size, setSize] = useState<PanelSize>(() => {
    if (typeof window !== "undefined" && persistKey) {
      const raw = window.localStorage.getItem(`resizable-panel:${persistKey}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PanelSize;
          return {
            width: typeof parsed.width === "number" ? parsed.width : defaultWidth ?? null,
            height: typeof parsed.height === "number" ? parsed.height : defaultHeight ?? null,
          };
        } catch {
          return { width: defaultWidth ?? null, height: defaultHeight ?? null };
        }
      }
    }
    return { width: defaultWidth ?? null, height: defaultHeight ?? null };
  });

  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    window.localStorage.setItem(`resizable-panel:${persistKey}`, JSON.stringify(size));
  }, [persistKey, size]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current || !panelRef.current) return;

      const parentRect = panelRef.current.parentElement?.getBoundingClientRect();
      const maxWidthPx = parentRect ? parentRect.width : Number.POSITIVE_INFINITY;
      const nextWidth = allowX
        ? clamp(
            dragRef.current.width + (event.clientX - dragRef.current.startX),
            minWidth,
            Math.min(maxWidth ?? maxWidthPx, maxWidthPx)
          )
        : null;
      const nextHeight = allowY
        ? clamp(
            dragRef.current.height + (event.clientY - dragRef.current.startY),
            minHeight,
            maxHeight ?? Number.POSITIVE_INFINITY
          )
        : null;

      setSize((current) => ({
        width: nextWidth ?? current.width,
        height: nextHeight ?? current.height,
      }));
    };

    const stopDragging = () => {
      dragRef.current = null;
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [allowX, allowY, maxHeight, maxWidth, minHeight, minWidth]);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resize === "none" || !panelRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      width: panelRef.current.getBoundingClientRect().width,
      height: panelRef.current.getBoundingClientRect().height,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = getCursor(resize);
  };

  const hasHeader = Boolean(overline || title || subtitle || actions);
  const basePaperSx: SxProps<Theme> = {
    position: "relative",
    display: "grid",
    gridTemplateRows: hasHeader ? "auto minmax(0, 1fr)" : "minmax(0, 1fr)",
    width: size.width ?? "100%",
    height: size.height ?? "auto",
    minWidth,
    minHeight,
    maxWidth: maxWidth ?? "100%",
    maxHeight: maxHeight ?? "none",
    overflow: "hidden",
    background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,250,253,0.9) 100%)",
    border: "1px solid rgba(18,53,90,0.08)",
    boxShadow: "0 18px 34px rgba(12,31,51,0.06)",
  };
  const paperSx = (sx ? [basePaperSx, sx] : basePaperSx) as SxProps<Theme>;
  const baseBodySx: SxProps<Theme> = {
    p: hasHeader ? { xs: 1.2, md: 1.45 } : 0,
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
  };
  const bodySx = (contentSx ? [baseBodySx, contentSx] : baseBodySx) as SxProps<Theme>;

  return (
    <Paper ref={panelRef} sx={paperSx}>
      {hasHeader ? (
        <Box
          sx={{
            px: { xs: 1.2, md: 1.45 },
            pt: { xs: 1.1, md: 1.3 },
            pb: 0.9,
            borderBottom: "1px solid rgba(18,53,90,0.08)",
            background: "linear-gradient(180deg, rgba(18,53,90,0.045) 0%, rgba(18,53,90,0.015) 100%)",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: actions ? "minmax(0, 1fr) auto" : "1fr" },
              gap: 1,
              alignItems: "start",
            }}
          >
            <Stack spacing={0.35} sx={{ minWidth: 0 }}>
              {overline ? (
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                  {overline}
                </Typography>
              ) : null}
              {title ? (
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {title}
                </Typography>
              ) : null}
              {subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
            {actions ? <Box sx={{ minWidth: 0 }}>{actions}</Box> : null}
          </Box>
        </Box>
      ) : null}

      <Box sx={bodySx}>{children}</Box>

      {resize !== "none" ? (
        <Box
          onPointerDown={startResize}
          sx={{
            position: "absolute",
            right: 8,
            bottom: 8,
            width: 15,
            height: 15,
            borderRight: "2px solid rgba(18,53,90,0.34)",
            borderBottom: "2px solid rgba(18,53,90,0.34)",
            borderBottomRightRadius: 2,
            cursor: getCursor(resize),
            opacity: 0.72,
            zIndex: 2,
            transition: "opacity 120ms ease",
            "&:hover": {
              opacity: 1,
            },
          }}
        />
      ) : null}
    </Paper>
  );
};


