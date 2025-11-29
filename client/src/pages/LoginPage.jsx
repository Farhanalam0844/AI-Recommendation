import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  InputAdornment
} from "@mui/material";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #4f46e5 0, #111827 55%, #000 100%)",
        p: 2
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 4,
          boxShadow:
            "0 20px 40px rgba(15, 23, 42, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.2)",
          backdropFilter: "blur(8px)"
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box>
              <Typography
                variant="h5"
                fontWeight="bold"
                gutterBottom
                sx={{ background: "linear-gradient(90deg,#4f46e5,#ec4899)", WebkitBackgroundClip: "text", color: "transparent" }}
              >
                Event Recommender
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Login or create an account to get personalised event
                recommendations.
              </Typography>
            </Box>

            <ToggleButtonGroup
              value={mode}
              exclusive
              fullWidth
              onChange={(_, value) => value && setMode(value)}
              size="small"
            >
              <ToggleButton value="login">Login</ToggleButton>
              <ToggleButton value="register">Register</ToggleButton>
            </ToggleButtonGroup>

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                {mode === "register" && (
                  <TextField
                    name="name"
                    label="Full Name"
                    value={form.name}
                    onChange={handleChange}
                    fullWidth
                    required
                    autoComplete="name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                  required
                  autoComplete="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
                <TextField
                  name="password"
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  fullWidth
                  required
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
                {error && (
                  <Typography color="error" variant="body2">
                    {error}
                  </Typography>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    textTransform: "none",
                    py: 1.2,
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, #4f46e5, #6366f1, #ec4899)"
                  }}
                >
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                    ? "Login"
                    : "Create account"}
                </Button>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
