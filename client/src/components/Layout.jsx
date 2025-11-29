// src/components/Layout.jsx
import React, { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import EventIcon from "@mui/icons-material/Event";
import TuneIcon from "@mui/icons-material/Tune";
// import FeedbackIcon from "@mui/icons-material/Feedback";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../contexts/AuthContext";

const drawerWidth = 240;

const navItems = [
  { label: "Events", path: "/events", icon: <EventIcon /> },
  { label: "Preferences", path: "/preferences", icon: <TuneIcon /> },
  // { label: "Feedback", path: "/feedback", icon: <FeedbackIcon /> },
  // { label: "Import Data", path: "/import", icon: <CloudUploadIcon /> },
];

export default function Layout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            letterSpacing: "-0.04em",
            background: "linear-gradient(90deg,#6366f1,#ec4899)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Event Recommender
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Discover events tailored to you.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(148,163,184,0.35)" }} />

      <List sx={{ flexGrow: 1, py: 1 }}>
        {navItems.map((item) => {
          const selected = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => handleNavClick(item.path)}
              sx={{
                mx: 1.5,
                mb: 0.5,
                borderRadius: 999,
                "&.Mui-selected": {
                  bgcolor: "rgba(99,102,241,0.18)",
                },
                "&.Mui-selected:hover": {
                  bgcolor: "rgba(99,102,241,0.24)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: selected ? "primary.main" : "text.secondary" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: selected ? 600 : 500,
                  fontSize: 14,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "rgba(148,163,184,0.35)" }} />

      <Box sx={{ p: 2.5, pt: 2 }}>
        {user && (
          <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary" }}>
            Signed in as <span style={{ color: "#e5e7eb" }}>{user.name || user.email}</span>
          </Typography>
        )}
        <ListItemButton
          onClick={logout}
          sx={{
            borderRadius: 999,
            px: 2,
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 14 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Sidebar */}
      {isDesktop ? (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid rgba(15,23,42,0.9)",
              bgcolor: "background.paper",
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              bgcolor: "background.paper",
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Main area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "transparent",
            borderBottom: "1px solid rgba(15,23,42,0.9)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
            {!isDesktop && (
              <IconButton
                edge="start"
                color="inherit"
                sx={{ mr: 1.5 }}
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
              {location.pathname.startsWith("/preferences")
                ? "Preferences"
                : location.pathname.startsWith("/feedback")
                ? "Feedback"
                : location.pathname.startsWith("/import")
                ? "Import Data"
                : "Recommended Events"}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box
          sx={{
            flexGrow: 1,
            px: { xs: 2, md: 4 },
            py: 3,
            background:
              "radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 55%), radial-gradient(circle at 20% 80%, rgba(236,72,153,0.12), transparent 55%)",
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
