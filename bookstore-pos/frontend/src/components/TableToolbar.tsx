import React from "react";
import { Box, Paper, Typography } from "@mui/material";

type TableToolbarProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export const TableToolbar: React.FC<TableToolbarProps> = ({ title, subtitle, children }) => {
  return (
    <Paper
      sx={{
        p: { xs: 1.25, md: 2 },
        border: "1px solid",
        borderColor: "divider",
        background: "linear-gradient(180deg, rgba(18,53,90,0.03) 0%, rgba(18,53,90,0.008) 100%)",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) auto" },
          alignItems: { xl: "center" },
          gap: { xs: 1.25, md: 2 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.9 }}>
            Panel operativo
          </Typography>
          <Typography variant="h6" sx={{ wordBreak: "break-word" }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            width: "100%",
            minWidth: 0,
            justifyContent: { xs: "stretch", xl: "flex-end" },
            "& > *": {
              flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 4px)", xl: "0 1 auto" },
              minWidth: 0,
              maxWidth: "100%",
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Paper>
  );
};
