import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Rnd } from "react-rnd";
import { PageHeader, ResizableTable, useToast } from "@/app/components";
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  duplicateDocumentTemplate,
  listDocumentTemplates,
  previewDocumentTemplate,
  restoreDefaultDocumentTemplate,
  setDefaultDocumentTemplate,
  updateDocumentTemplate,
  type PrintTemplate,
} from "@/modules/admin/api";

const MM_SCALE = 4;

type TemplateElement = {
  id: string;
  type: string;
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number | null;
  visible: boolean;
  content?: string;
  style?: Record<string, unknown>;
  config?: Record<string, unknown>;
};

type TemplateSchema = {
  schema_version: number;
  paper: {
    code: string;
    width_mm: number;
    height_mm: number | null;
    margins_mm: { top: number; right: number; bottom: number; left: number };
  };
  styles: {
    base_font_family: string;
    base_font_size: number;
  };
  elements: TemplateElement[];
};

const defaultSchemaByDocType = (docType: string): TemplateSchema => ({
  schema_version: 1,
  paper: {
    code: docType === "TICKET" ? "THERMAL_80" : "A4",
    width_mm: docType === "TICKET" ? 80 : 210,
    height_mm: docType === "TICKET" ? null : 297,
    margins_mm: { top: 2, right: 2, bottom: 2, left: 2 },
  },
  styles: {
    base_font_family: "Arial",
    base_font_size: 9,
  },
  elements: [
    {
      id: "company_name",
      type: "text",
      x_mm: 5,
      y_mm: 6,
      w_mm: 70,
      h_mm: 6,
      visible: true,
      content: "{{company_name}}",
      style: { align: "center", font_size: 11, bold: true },
    },
    {
      id: "items",
      type: "items_table",
      x_mm: 3,
      y_mm: 20,
      w_mm: 74,
      h_mm: 40,
      visible: true,
      config: { show_header: true, columns: ["name", "qty", "unit_price", "line_total"] },
    },
    {
      id: "totals",
      type: "totals_block",
      x_mm: 3,
      y_mm: 64,
      w_mm: 74,
      h_mm: 20,
      visible: true,
    },
  ],
});

const parseSchema = (raw: string | undefined, docType: string): TemplateSchema => {
  if (!raw) return defaultSchemaByDocType(docType);
  try {
    const parsed = JSON.parse(raw) as TemplateSchema;
    if (!Array.isArray(parsed.elements)) return defaultSchemaByDocType(docType);
    return parsed;
  } catch {
    return defaultSchemaByDocType(docType);
  }
};

const nextElementId = (elements: TemplateElement[], prefix: string) => {
  let n = 1;
  while (elements.some((element) => element.id === `${prefix}_${n}`)) n += 1;
  return `${prefix}_${n}`;
};

const elementLabel = (element: TemplateElement) => `${element.id} (${element.type})`;

const DocumentTemplates: React.FC = () => {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [documentType, setDocumentType] = useState<"TICKET" | "BOLETA" | "FACTURA">("TICKET");
  const [openEditor, setOpenEditor] = useState(false);
  const [editing, setEditing] = useState<PrintTemplate | null>(null);
  const [name, setName] = useState("");
  const [paperCode, setPaperCode] = useState("THERMAL_80");
  const [paperWidthMm, setPaperWidthMm] = useState(80);
  const [paperHeightMm, setPaperHeightMm] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [schema, setSchema] = useState<TemplateSchema>(defaultSchemaByDocType("TICKET"));
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["document-templates", documentType],
    queryFn: () => listDocumentTemplates(documentType),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        document_type: documentType,
        paper_code: paperCode,
        paper_width_mm: Number(paperWidthMm),
        paper_height_mm: paperHeightMm,
        margin_top_mm: schema.paper.margins_mm.top,
        margin_right_mm: schema.paper.margins_mm.right,
        margin_bottom_mm: schema.paper.margins_mm.bottom,
        margin_left_mm: schema.paper.margins_mm.left,
        scope_type: "GLOBAL",
        scope_ref_id: null,
        is_active: isActive,
        is_default: isDefault,
        schema_json: JSON.stringify(schema),
      };
      if (editing) {
        return updateDocumentTemplate(editing.id, {
          name: payload.name,
          paper_code: payload.paper_code,
          paper_width_mm: payload.paper_width_mm,
          paper_height_mm: payload.paper_height_mm,
          margin_top_mm: payload.margin_top_mm,
          margin_right_mm: payload.margin_right_mm,
          margin_bottom_mm: payload.margin_bottom_mm,
          margin_left_mm: payload.margin_left_mm,
          scope_type: payload.scope_type,
          scope_ref_id: payload.scope_ref_id,
          is_active: payload.is_active,
          is_default: payload.is_default,
          schema_json: payload.schema_json,
        });
      }
      return createDocumentTemplate(payload);
    },
    onSuccess: () => {
      showToast({ message: "Plantilla guardada", severity: "success" });
      setOpenEditor(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["document-templates"] });
    },
    onError: (err: any) => {
      showToast({ message: err?.response?.data?.detail || "No se pudo guardar plantilla", severity: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDocumentTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      showToast({ message: "Plantilla desactivada", severity: "success" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => setDefaultDocumentTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      showToast({ message: "Plantilla predeterminada actualizada", severity: "success" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, newName }: { id: number; newName: string }) => duplicateDocumentTemplate(id, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      showToast({ message: "Plantilla duplicada", severity: "success" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreDefaultDocumentTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      showToast({ message: "Plantilla restaurada", severity: "success" });
    },
  });

  const selectedElement = useMemo(
    () => schema.elements.find((element) => element.id === selectedElementId) || null,
    [schema.elements, selectedElementId]
  );

  const openNew = () => {
    setEditing(null);
    setName(`${documentType} Base`);
    const base = defaultSchemaByDocType(documentType);
    setSchema(base);
    setPaperCode(base.paper.code);
    setPaperWidthMm(base.paper.width_mm);
    setPaperHeightMm(base.paper.height_mm);
    setIsActive(true);
    setIsDefault(false);
    setSelectedElementId(base.elements[0]?.id || null);
    setPreviewHtml("");
    setPreviewWarnings([]);
    setOpenEditor(true);
  };

  const openExisting = (template: PrintTemplate) => {
    setEditing(template);
    setName(template.name);
    setPaperCode(template.paper_code);
    setPaperWidthMm(template.paper_width_mm);
    setPaperHeightMm(template.paper_height_mm ?? null);
    setIsActive(template.is_active);
    setIsDefault(template.is_default);
    const parsed = parseSchema(template.latest_version?.schema_json, template.document_type);
    setSchema(parsed);
    setSelectedElementId(parsed.elements[0]?.id || null);
    setPreviewHtml("");
    setPreviewWarnings([]);
    setOpenEditor(true);
  };

  const updateElement = (id: string, updater: (element: TemplateElement) => TemplateElement) => {
    setSchema((prev) => ({
      ...prev,
      elements: prev.elements.map((element) => (element.id === id ? updater(element) : element)),
    }));
  };

  const addElement = (type: string) => {
    setSchema((prev) => {
      const id = nextElementId(prev.elements, type);
      const newElement: TemplateElement = {
        id,
        type,
        x_mm: 5,
        y_mm: 5 + prev.elements.length * 8,
        w_mm: Math.min(70, prev.paper.width_mm - 10),
        h_mm: type === "line" ? 1 : 8,
        visible: true,
        content: type === "text" ? "{{company_name}}" : type === "qr" ? "{{document_number}}" : "",
      };
      return { ...prev, elements: [...prev.elements, newElement] };
    });
  };

  const removeSelectedElement = () => {
    if (!selectedElementId) return;
    setSchema((prev) => ({
      ...prev,
      elements: prev.elements.filter((element) => element.id !== selectedElementId),
    }));
    setSelectedElementId(null);
  };

  const runPreview = async () => {
    try {
      const response = await previewDocumentTemplate({
        document_type: documentType,
        schema_json: JSON.stringify(schema),
      });
      setPreviewHtml(response.html);
      setPreviewWarnings(response.warnings || []);
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error al generar preview", severity: "error" });
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <PageHeader
        title="Plantillas de comprobantes"
        subtitle="Constructor visual para Ticket, Boleta y Factura."
        icon={<DesignServicesIcon color="primary" />}
        loading={isLoading}
        right={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              select
              size="small"
              label="Tipo"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as "TICKET" | "BOLETA" | "FACTURA")}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="TICKET">Ticket</MenuItem>
              <MenuItem value="BOLETA">Boleta</MenuItem>
              <MenuItem value="FACTURA">Factura</MenuItem>
            </TextField>
            <Button variant="contained" onClick={openNew}>
              Nueva plantilla
            </Button>
          </Stack>
        }
      />

      <Paper sx={{ p: 1.2 }}>
        <ResizableTable minHeight={220}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Papel</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Default</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(templates || []).map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.name}</TableCell>
                  <TableCell>{template.document_type}</TableCell>
                  <TableCell>{template.paper_code}</TableCell>
                  <TableCell>{template.is_active ? "Activa" : "Inactiva"}</TableCell>
                  <TableCell>{template.is_default ? "Si" : "No"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button size="small" variant="outlined" onClick={() => openExisting(template)}>
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => duplicateMutation.mutate({ id: template.id, newName: `${template.name} copia` })}
                      >
                        Duplicar
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => setDefaultMutation.mutate(template.id)}>
                        Default
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => restoreMutation.mutate(template.id)}>
                        Restaurar
                      </Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => deleteMutation.mutate(template.id)}>
                        Desactivar
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResizableTable>
      </Paper>

      <Dialog open={openEditor} onClose={() => setOpenEditor(false)} maxWidth="xl" fullWidth>
        <DialogTitle>{editing ? `Editar: ${editing.name}` : "Nueva plantilla"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
                <TextField
                  select
                  label="Papel"
                  value={paperCode}
                  onChange={(event) => {
                    const next = event.target.value;
                    setPaperCode(next);
                    setSchema((prev) => ({ ...prev, paper: { ...prev.paper, code: next } }));
                  }}
                >
                  <MenuItem value="THERMAL_80">THERMAL_80</MenuItem>
                  <MenuItem value="THERMAL_58">THERMAL_58</MenuItem>
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="HALF_PAGE">HALF_PAGE</MenuItem>
                  <MenuItem value="CUSTOM">CUSTOM</MenuItem>
                </TextField>
                <TextField
                  label="Ancho mm"
                  type="number"
                  value={paperWidthMm}
                  onChange={(event) => {
                    const next = Number(event.target.value || 80);
                    setPaperWidthMm(next);
                    setSchema((prev) => ({ ...prev, paper: { ...prev.paper, width_mm: next } }));
                  }}
                />
                <TextField
                  label="Alto mm"
                  type="number"
                  value={paperHeightMm ?? ""}
                  onChange={(event) => {
                    const next = event.target.value === "" ? null : Number(event.target.value);
                    setPaperHeightMm(next);
                    setSchema((prev) => ({ ...prev, paper: { ...prev.paper, height_mm: next } }));
                  }}
                />
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant={isActive ? "contained" : "outlined"} onClick={() => setIsActive((prev) => !prev)}>
                    {isActive ? "Activa" : "Inactiva"}
                  </Button>
                  <Button size="small" variant={isDefault ? "contained" : "outlined"} onClick={() => setIsDefault((prev) => !prev)}>
                    {isDefault ? "Default" : "No default"}
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button size="small" onClick={() => addElement("text")}>
                    + Texto
                  </Button>
                  <Button size="small" onClick={() => addElement("line")}>
                    + Linea
                  </Button>
                  <Button size="small" onClick={() => addElement("items_table")}>
                    + Tabla
                  </Button>
                  <Button size="small" onClick={() => addElement("qr")}>
                    + QR
                  </Button>
                </Stack>
                <Button size="small" color="error" variant="outlined" disabled={!selectedElement} onClick={removeSelectedElement}>
                  Eliminar elemento
                </Button>
                {selectedElement ? (
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                      Elemento seleccionado
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      label="ID"
                      value={selectedElement.id}
                      onChange={(event) => {
                        const newId = event.target.value;
                        updateElement(selectedElement.id, (element) => ({ ...element, id: newId }));
                        setSelectedElementId(newId);
                      }}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Contenido"
                      value={selectedElement.content || ""}
                      onChange={(event) => updateElement(selectedElement.id, (element) => ({ ...element, content: event.target.value }))}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="X (mm)"
                      type="number"
                      value={selectedElement.x_mm}
                      onChange={(event) =>
                        updateElement(selectedElement.id, (element) => ({ ...element, x_mm: Number(event.target.value || 0) }))
                      }
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Y (mm)"
                      type="number"
                      value={selectedElement.y_mm}
                      onChange={(event) =>
                        updateElement(selectedElement.id, (element) => ({ ...element, y_mm: Number(event.target.value || 0) }))
                      }
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Ancho (mm)"
                      type="number"
                      value={selectedElement.w_mm}
                      onChange={(event) =>
                        updateElement(selectedElement.id, (element) => ({ ...element, w_mm: Number(event.target.value || 0) }))
                      }
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Alto (mm)"
                      type="number"
                      value={selectedElement.h_mm ?? ""}
                      onChange={(event) =>
                        updateElement(selectedElement.id, (element) => ({
                          ...element,
                          h_mm: event.target.value === "" ? null : Number(event.target.value),
                        }))
                      }
                    />
                  </Paper>
                ) : null}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{
                  position: "relative",
                  width: `${schema.paper.width_mm * MM_SCALE}px`,
                  height: `${(schema.paper.height_mm ?? 220) * MM_SCALE}px`,
                  maxWidth: "100%",
                  overflow: "auto",
                  bgcolor: "#fff",
                  borderStyle: "dashed",
                }}
              >
                {schema.elements.map((element) => {
                  if (!element.visible) return null;
                  const widthPx = Math.max(24, element.w_mm * MM_SCALE);
                  const heightPx = Math.max(16, (element.h_mm ?? 8) * MM_SCALE);
                  return (
                    <Rnd
                      key={element.id}
                      size={{ width: widthPx, height: heightPx }}
                      position={{ x: element.x_mm * MM_SCALE, y: element.y_mm * MM_SCALE }}
                      bounds="parent"
                      onDragStop={(_: any, data: any) => {
                        updateElement(element.id, (current) => ({
                          ...current,
                          x_mm: Number((data.x / MM_SCALE).toFixed(2)),
                          y_mm: Number((data.y / MM_SCALE).toFixed(2)),
                        }));
                      }}
                      onResizeStop={(_: any, __: any, ref: any, ___: any, position: any) => {
                        updateElement(element.id, (current) => ({
                          ...current,
                          x_mm: Number((position.x / MM_SCALE).toFixed(2)),
                          y_mm: Number((position.y / MM_SCALE).toFixed(2)),
                          w_mm: Number((ref.offsetWidth / MM_SCALE).toFixed(2)),
                          h_mm: Number((ref.offsetHeight / MM_SCALE).toFixed(2)),
                        }));
                      }}
                      style={{
                        border: selectedElementId === element.id ? "2px solid #1976d2" : "1px solid #9ca3af",
                        background: element.type === "items_table" ? "rgba(25, 118, 210, 0.08)" : "rgba(17, 24, 39, 0.04)",
                        fontSize: 11,
                        padding: 4,
                        cursor: "move",
                      }}
                      onClick={() => setSelectedElementId(element.id)}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                        {elementLabel(element)}
                      </Typography>
                      {element.content ? (
                        <Typography variant="caption" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {element.content}
                        </Typography>
                      ) : null}
                    </Rnd>
                  );
                })}
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <Button variant="outlined" onClick={runPreview}>
                  Generar preview backend
                </Button>
                <Typography variant="caption">Advertencias</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {previewWarnings.length ? previewWarnings.map((warning) => <Chip key={warning} size="small" label={warning} color="warning" />) : <Chip size="small" label="Sin advertencias" color="success" />}
                </Stack>
                <Paper variant="outlined" sx={{ p: 1, minHeight: 300, overflow: "auto", bgcolor: "#fff" }}>
                  {previewHtml ? <Box sx={{ "& table": { width: "100%" }, "& th, & td": { fontSize: 12 } }} dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <Typography variant="body2" color="text.secondary">Ejecuta preview para ver render canónico.</Typography>}
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditor(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Guardando..." : "Guardar plantilla"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentTemplates;
