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
            minWidth: "100%",
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
