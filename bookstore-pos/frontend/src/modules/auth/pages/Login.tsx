import React, { useState } from "react";
import { Alert, Box, Button, Divider, Paper, Stack, TextField, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
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

const steps = [
  {
    title: "1. Escribe tu usuario",
    description: "Usa el mismo usuario con el que trabajas todos los dias.",
    icon: <TaskAltRoundedIcon fontSize="small" />,
  },
  {
    title: "2. Escribe tu clave",
    description: "La clave se valida de forma segura antes de entrar.",
    icon: <KeyRoundedIcon fontSize="small" />,
  },
  {
    title: "3. Entra al sistema",
    description: "Si tu cuenta usa verificacion extra, aqui tambien podras ingresar ese codigo.",
    icon: <LockOutlinedIcon fontSize="small" />,
  },
];

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 56,
    borderRadius: 4,
    bgcolor: "rgba(255,255,255,0.96)",
  },
};

// Página de login
// Formulario de autenticación con usuario y contraseña
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
      const response = await login(data.username.trim(), data.password, data.otp?.trim() || undefined);
      doLogin(response.username, response.role, response.csrf_token || null);
      navigate(getLandingRoute(response.role));
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail === "2FA_REQUIRED") {
        setRequireOtp(true);
        setSubmitError("Ingresa el codigo 2FA para completar el acceso.");
        showToast({ message: "Ingresa el codigo 2FA", severity: "info" });
        window.setTimeout(() => setFocus("otp"), 0);
        return;
      }

      const message = detail || "No se pudo iniciar sesion.";
      setSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: { xs: 1.25, md: 2 },
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at 14% 16%, rgba(180,83,9,0.12) 0%, rgba(180,83,9,0) 28%), radial-gradient(circle at 84% 20%, rgba(15,118,110,0.12) 0%, rgba(15,118,110,0) 30%), linear-gradient(180deg, #FBF8F2 0%, #F4F0E8 58%, #EDE4D4 100%)",
      }}
    >
      <Paper sx={{ width: "100%", maxWidth: 1080, overflow: "hidden", borderRadius: { xs: 4, md: 5 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" } }}>
          <Box
            sx={{
              p: { xs: 3, md: 4.5 },
              background:
                "linear-gradient(180deg, rgba(255,250,243,0.98) 0%, rgba(248,239,225,0.98) 100%)",
              borderRight: { md: "1px solid rgba(19,41,61,0.08)" },
              borderBottom: { xs: "1px solid rgba(19,41,61,0.08)", md: 0 },
            }}
          >
            <Stack spacing={2.25}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 4,
                  display: "grid",
                  placeItems: "center",
                  color: "primary.main",
                  bgcolor: "rgba(19,41,61,0.08)",
                  border: "1px solid rgba(19,41,61,0.1)",
                }}
              >
                <LockOutlinedIcon />
              </Box>

              <Box>
                <Typography variant="overline" sx={{ letterSpacing: 1.15, color: "text.secondary" }}>
                  Acceso sencillo
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.7, mb: 1 }}>
                  Ingreso rapido al sistema
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 470 }}>
                  La pantalla fue pensada para que el personal encuentre el acceso sin distracciones y con pasos faciles de seguir.
                </Typography>
              </Box>

              <Stack spacing={1.1}>
                {steps.map((step) => (
                  <Paper
                    key={step.title}
                    elevation={0}
                    sx={{
                      p: 1.4,
                      borderRadius: 3.5,
                      bgcolor: "rgba(255,255,255,0.74)",
                      border: "1px solid rgba(19,41,61,0.08)",
                    }}
                  >
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 2.5,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          color: "secondary.main",
                          bgcolor: "rgba(15,118,110,0.1)",
                        }}
                      >
                        {step.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>{step.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {step.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              <Alert severity="info" sx={{ alignItems: "flex-start" }}>
                Si tu cuenta usa verificacion en dos pasos, el sistema te pedira el codigo despues de validar tu usuario y clave.
              </Alert>
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 3, md: 4.5 }, display: "grid", alignContent: "center" }}>
            <Stack spacing={2.25}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Entrar al sistema
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>
                  Completa solo los campos necesarios para comenzar a trabajar.
                </Typography>
              </Box>

              <Divider />

              <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "grid", gap: 2 }}>
                {submitError ? <Alert severity={requireOtp ? "info" : "error"}>{submitError}</Alert> : null}

                <TextField
                  label="Usuario"
                  autoComplete="username"
                  autoFocus
                  error={!!errors.username}
                  helperText={errors.username?.message || "Ejemplo: caja01 o administrador"}
                  sx={fieldSx}
                  {...register("username", {
                    onChange: () => setSubmitError(""),
                  })}
                />

                <TextField
                  label="Contrasena"
                  type="password"
                  autoComplete="current-password"
                  error={!!errors.password}
                  helperText={errors.password?.message || "Ingresa tu clave de acceso."}
                  sx={fieldSx}
                  {...register("password", {
                    onChange: () => setSubmitError(""),
                  })}
                />

                {requireOtp ? (
                  <TextField
                    label="Codigo 2FA"
                    autoComplete="one-time-code"
                    error={otpMissing}
                    helperText={otpMissing ? "Ingresa el codigo temporal." : "Codigo generado por tu app autenticadora."}
                    sx={fieldSx}
                    {...register("otp", {
                      onChange: () => setSubmitError(""),
                    })}
                  />
                ) : null}

                <Button variant="contained" type="submit" disabled={!isValid || isSubmitting || otpMissing} sx={{ minHeight: 56 }}>
                  {isSubmitting ? "Validando acceso..." : "Entrar"}
                </Button>

                <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                  Si olvidas tu acceso, solicita ayuda al administrador del sistema.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
