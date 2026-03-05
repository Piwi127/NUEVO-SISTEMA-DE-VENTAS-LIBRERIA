import React, { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { login } from "@/modules/auth/api";
import { useAuth } from "@/auth/AuthProvider";
import { getLandingRoute } from "@/auth/navigation";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/app/components";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Ingresa tu usuario."),
  password: z.string().min(1, "Ingresa tu contrasena."),
  otp: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login: doLogin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [requireOtp, setRequireOtp] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    setFocus,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
      otp: "",
    },
  });

  const otpValue = watch("otp");
  const otpMissing = requireOtp && !otpValue?.trim();

  const onSubmit = async (data: LoginFormData) => {
    setSubmitError("");
    if (requireOtp && !data.otp?.trim()) {
      setSubmitError("Ingresa el codigo 2FA para continuar.");
      setFocus("otp");
      return;
    }
    try {
      const res = await login(data.username.trim(), data.password, data.otp?.trim() || undefined);
      doLogin(res.username, res.role, res.csrf_token || null);
      navigate(getLandingRoute(res.role));
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail === "2FA_REQUIRED") {
        setRequireOtp(true);
        setSubmitError("Ingresa el codigo 2FA para completar el acceso.");
        showToast({ message: "Ingrese codigo 2FA", severity: "info" });
        window.setTimeout(() => setFocus("otp"), 0);
      } else {
        const message = detail || "Error de login";
        setSubmitError(message);
        showToast({ message, severity: "error" });
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
          "linear-gradient(140deg, rgba(12,42,74,0.22), rgba(18,53,90,0.08)), radial-gradient(800px 360px at 12% 15%, rgba(154,123,47,0.22), transparent), radial-gradient(900px 420px at 88% 78%, rgba(18,53,90,0.16), transparent)",
        p: 2,
      }}
    >
      <Paper sx={{ width: "100%", maxWidth: 980, overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" } }}>
          <Box
            sx={{
              p: { xs: 3, md: 5 },
              color: "white",
              background: "linear-gradient(165deg, #0b2b4d 0%, #12355a 58%, #1d4e7f 100%)",
            }}
          >
            <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.1 }}>
              Plataforma Comercial
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, mb: 1 }}>
              Bookstore POS
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 420, opacity: 0.92 }}>
              Control centralizado de ventas, caja, inventario y administracion en una sola experiencia operativa.
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 3, md: 5 }, display: "grid", alignContent: "center", gap: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.2,
                  bgcolor: "rgba(18,53,90,0.1)",
                  color: "primary.main",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <LockOutlinedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h5">Acceso seguro</Typography>
                <Typography variant="body2" color="text.secondary">
                  Inicia sesion para continuar
                </Typography>
              </Box>
            </Stack>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "grid", gap: 2 }}>
              {submitError ? <Alert severity={requireOtp ? "info" : "error"}>{submitError}</Alert> : null}

              <TextField
                label="Usuario"
                autoComplete="username"
                error={!!errors.username}
                helperText={errors.username?.message || "Ingresa tu usuario de acceso."}
                {...register("username", {
                  onChange: () => setSubmitError(""),
                })}
              />

              <TextField
                label="Contrasena"
                type="password"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message || "Ingresa tu contrasena."}
                {...register("password", {
                  onChange: () => setSubmitError(""),
                })}
              />

              {requireOtp ? (
                <TextField
                  label="Codigo 2FA"
                  autoComplete="one-time-code"
                  error={otpMissing}
                  helperText={otpMissing ? "Ingresa el codigo OTP para continuar." : "Codigo temporal generado por tu app autenticadora."}
                  {...register("otp", {
                    onChange: () => setSubmitError(""),
                  })}
                />
              ) : null}

              <Button variant="contained" size="large" type="submit" disabled={!isValid || isSubmitting || otpMissing}>
                {isSubmitting ? "Validando..." : "Entrar"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
