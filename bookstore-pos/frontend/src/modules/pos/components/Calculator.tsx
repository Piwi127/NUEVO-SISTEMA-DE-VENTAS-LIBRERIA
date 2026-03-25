import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalculateIcon from "@mui/icons-material/Calculate";

interface CalculatorProps {
  open: boolean;
  onClose: () => void;
  initialValue?: string;
}

const buttonStyle = {
  minWidth: 64,
  minHeight: 56,
  fontSize: "1.25rem",
  fontWeight: 700,
  borderRadius: 2,
  transition: "all 0.15s ease",
  "&:hover": {
    transform: "scale(1.02)",
  },
  "&:active": {
    transform: "scale(0.98)",
  },
};

export const Calculator: React.FC<CalculatorProps> = ({ open, onClose, initialValue = "" }) => {
  const [display, setDisplay] = useState(initialValue);
  const [operator, setOperator] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialValue && open) {
      setDisplay(initialValue);
    }
  }, [initialValue, open]);

  useEffect(() => {
    if (open && displayRef.current) {
      displayRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [display]);

  const calculate = useCallback((a: number, b: number, op: string): string => {
    switch (op) {
      case "+":
        return String(a + b);
      case "-":
        return String(a - b);
      case "×":
        return String(a * b);
      case "÷":
        return b !== 0 ? String(a / b) : "Error";
      case "%":
        return String((a * b) / 100);
      default:
        return String(b);
    }
  }, []);

  const handleDigit = (digit: string) => {
    if (shouldResetDisplay) {
      setDisplay(digit);
      setShouldResetDisplay(false);
    } else {
      if (digit === "." && display.includes(".")) return;
      if (display === "0" && digit !== ".") {
        setDisplay(digit);
      } else {
        setDisplay(display + digit);
      }
    }
  };

  const handleOperator = (op: string) => {
    if (previousValue !== null && operator && !shouldResetDisplay) {
      const result = calculate(parseFloat(previousValue), parseFloat(display), operator);
      setDisplay(result);
      setHistory((prev) => [...prev, `${previousValue} ${operator} ${display} = ${result}`]);
    }
    setPreviousValue(display);
    setOperator(op);
    setShouldResetDisplay(true);
  };

  const handleEquals = () => {
    if (previousValue !== null && operator) {
      const result = calculate(parseFloat(previousValue), parseFloat(display), operator);
      setHistory((prev) => [...prev, `${previousValue} ${operator} ${display} = ${result}`]);
      setDisplay(result);
      setPreviousValue(null);
      setOperator(null);
      setShouldResetDisplay(true);
    }
  };

  const handlePercent = () => {
    const value = parseFloat(display);
    if (previousValue !== null && operator) {
      const result = calculate(parseFloat(previousValue), value, "%");
      setDisplay(result);
    } else {
      setDisplay(String(value / 100));
    }
  };

  const handleNegate = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setShouldResetDisplay(false);
  };

  const handleClearEntry = () => {
    setDisplay("0");
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const handleSquareRoot = () => {
    const value = parseFloat(display);
    if (value >= 0) {
      setDisplay(String(Math.sqrt(value)));
      setHistory((prev) => [...prev, `√${value} = ${Math.sqrt(value)}`]);
    } else {
      setDisplay("Error");
    }
  };

  const handleSquare = () => {
    const value = parseFloat(display);
    setDisplay(String(value * value));
    setHistory((prev) => [...prev, `${value}² = ${value * value}`]);
  };

  const handleReciprocal = () => {
    const value = parseFloat(display);
    if (value !== 0) {
      setDisplay(String(1 / value));
      setHistory((prev) => [...prev, `1/${value} = ${1 / value}`]);
    } else {
      setDisplay("Error");
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      const key = event.key;
      if (key >= "0" && key <= "9") handleDigit(key);
      else if (key === ".") handleDigit(".");
      else if (key === "+" || key === "-") handleOperator(key);
      else if (key === "*") handleOperator("×");
      else if (key === "/") handleOperator("÷");
      else if (key === "Enter" || key === "=") handleEquals();
      else if (key === "Escape") handleClear();
      else if (key === "Backspace") handleBackspace();
      else if (key === "%") handlePercent();
    },
    [open, display, previousValue, operator]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const renderDigitButtons = () => (
    <>
      <Button
        variant="outlined"
        sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)", color: "text.primary" }}
        onClick={handleClearEntry}
      >
        CE
      </Button>
      <Button
        variant="outlined"
        sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)", color: "text.primary" }}
        onClick={handleClear}
      >
        C
      </Button>
      <Button
        variant="outlined"
        sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)", color: "text.primary" }}
        onClick={handleBackspace}
      >
        ⌫
      </Button>
      <Button
        variant="contained"
        sx={{ ...buttonStyle, background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", color: "white" }}
        onClick={() => handleOperator("÷")}
      >
        ÷
      </Button>

      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("7")}>
        7
      </Button>
      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("8")}>
        8
      </Button>
      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("9")}>
        9
      </Button>
      <Button
        variant="contained"
        sx={{ ...buttonStyle, background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", color: "white" }}
        onClick={() => handleOperator("×")}
      >
        ×
      </Button>

      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("4")}>
        4
      </Button>
      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("5")}>
        5
      </Button>
      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("6")}>
        6
      </Button>
      <Button
        variant="contained"
        sx={{ ...buttonStyle, background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", color: "white" }}
        onClick={() => handleOperator("-")}
      >
        −
      </Button>

      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("1")}>
        1
      </Button>
      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("2")}>
        2
      </Button>
      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("3")}>
        3
      </Button>
      <Button
        variant="contained"
        sx={{ ...buttonStyle, background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", color: "white" }}
        onClick={() => handleOperator("+")}
      >
        +
      </Button>

      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={handleNegate}>
        +/−
      </Button>
      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit("0")}>
        0
      </Button>
      <Button variant="outlined" sx={{ ...buttonStyle, borderColor: "rgba(19,41,61,0.15)" }} onClick={() => handleDigit(".")}>
        .
      </Button>
      <Button
        variant="contained"
        sx={{ ...buttonStyle, background: "linear-gradient(135deg, #10B981 0%, #34D399 100%)", color: "white" }}
        onClick={handleEquals}
      >
        =
      </Button>
    </>
  );

  const renderScientificButtons = () => (
    <>
      <Button
        variant="outlined"
        size="small"
        sx={{ minWidth: 48, minHeight: 40, fontSize: "0.9rem" }}
        onClick={handleSquareRoot}
      >
        √
      </Button>
      <Button
        variant="outlined"
        size="small"
        sx={{ minWidth: 48, minHeight: 40, fontSize: "0.9rem" }}
        onClick={handleSquare}
      >
        x²
      </Button>
      <Button
        variant="outlined"
        size="small"
        sx={{ minWidth: 48, minHeight: 40, fontSize: "0.9rem" }}
        onClick={handleReciprocal}
      >
        1/x
      </Button>
      <Button
        variant="outlined"
        size="small"
        sx={{ minWidth: 48, minHeight: 40, fontSize: "0.9rem" }}
        onClick={handlePercent}
      >
        %
      </Button>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CalculateIcon />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Calculadora
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, bgcolor: "#f8fafc" }}>
        <Stack spacing={1.5}>
          <Box
            ref={displayRef}
            sx={{
              background: "white",
              borderRadius: 2,
              p: 2,
              textAlign: "right",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
              border: "1px solid rgba(19,41,61,0.1)",
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                fontFamily: "monospace",
                color: "#1e293b",
                wordBreak: "break-all",
                lineHeight: 1.2,
              }}
            >
              {display}
            </Typography>
            {previousValue && operator && (
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", mt: 0.5 }}>
                {previousValue} {operator}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>{renderScientificButtons()}</Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
            }}
          >
            {renderDigitButtons()}
          </Box>

          {history.length > 0 && (
            <Box
              sx={{
                mt: 1,
                maxHeight: 80,
                overflow: "auto",
                bgcolor: "white",
                borderRadius: 2,
                p: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Historial:
              </Typography>
              {history.slice(-3).map((item, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  sx={{ display: "block", fontFamily: "monospace", color: "text.secondary" }}
                >
                  {item}
                </Typography>
              ))}
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default Calculator;
