import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { login } from "../api/auth";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";

type FormData = { username: string; password: string; otp?: string };

const Login: React.FC = () => {
  const { register, handleSubmit } = useForm<FormData>();
  const { login: doLogin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [requireOtp, setRequireOtp] = useState(false);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await login(data.username, data.password, data.otp);
      doLogin(res.access_token, res.username, res.role);
      navigate("/pos");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail === "2FA_REQUIRED") {
        setRequireOtp(true);
        showToast({ message: "Ingrese codigo 2FA", severity: "info" });
      } else {
        showToast({ message: detail || "Error de login", severity: "error" });
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
        backgroundImage:
          "linear-gradient(135deg, rgba(29,78,216,0.15), rgba(15,118,110,0.1)), radial-gradient(900px 400px at 10% 10%, rgba(15,118,110,0.18), transparent)",
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: { xs: "100%", sm: 420 } }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Bienvenido a Bookstore POS
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Inicia sesion para continuar
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "grid", gap: 2 }}>
          <TextField label="Usuario" {...register("username", { required: true })} />
          <TextField label="Contrasena" type="password" {...register("password", { required: true })} />
          {requireOtp && <TextField label="Codigo 2FA" {...register("otp")} />}
          <Button variant="contained" size="large" type="submit">
            Entrar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
