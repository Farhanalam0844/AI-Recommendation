// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import LoginPage from "./pages/LoginPage";
import PreferencesPage from "./pages/PreferencesPage";
import EventsPage from "./pages/EventsPage";
// import FeedbackPage from "./pages/FeedbackPage";
// import ImportPage from "./pages/ImportPage";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1", // indigo
    },
    secondary: {
      main: "#ec4899", // pink
    },
    background: {
      default: "#020617", // slate-950
      paper: "#0b1120",   // slate-900
    },
    text: {
      primary: "#e5e7eb",
      secondary: "#9ca3af",
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h6: {
      fontWeight: 600,
    },
    body2: {
      color: "#9ca3af",
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
          border: "1px solid rgba(148,163,184,0.25)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="preferences" element={<PreferencesPage />} />
          {/* <Route path="feedback" element={<FeedbackPage />} /> */}
          {/* <Route path="import" element={<ImportPage />} /> */}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
