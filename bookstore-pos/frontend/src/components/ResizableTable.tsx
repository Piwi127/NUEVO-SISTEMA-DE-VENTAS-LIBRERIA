import React from "react";
import { Box, type SxProps, type Theme } from "@mui/material";

type ResizableTableProps = {
  children: React.ReactNode;
  minHeight?: number;
  maxHeight?: number | string;
  sx?: SxProps<Theme>;
};

export const ResizableTable: React.FC<ResizableTableProps> = ({
  children,
  minHeight = 220,
  maxHeight = "64vh",
  sx,
}) => {
  return (
    <Box
      sx={[
        {
          overflow: "auto",
          resize: "vertical",
          minHeight,
          maxHeight,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(18,53,90,0.08)",
          "& table": {
            minWidth: "100%",
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
};
