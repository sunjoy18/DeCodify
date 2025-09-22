import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Home as HomeIcon,
  Upload as UploadIcon,
  FolderOpen as ProjectsIcon,
  Menu as MenuIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { label: "Home", path: "/", icon: <HomeIcon /> },
    { label: "Projects", path: "/projects", icon: <ProjectsIcon /> },
    { label: "Upload", path: "/upload", icon: <UploadIcon /> },
  ];

  return (
    <AppBar
      position="static"
      elevation={1}
      sx={{
        background: "rgba(17, 25, 40, 0.6)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(8px) saturate(130%)",
        WebkitBackdropFilter: "blur(8px) saturate(130%)",
      }}
    >
      <Toolbar
        sx={{
          p: 0,
          height: "50px",
          minHeight: "auto !important",
        }}
      >
        {/* Logo */}
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: "bold",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          DeCodify Agent
        </Typography>

        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
          {menuItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                bgcolor: isActive(item.path)
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              {item.label}
            </Button>
          ))}

          <Button
            color="inherit"
            startIcon={<GitHubIcon />}
            href="https://github.com"
            target="_blank"
            sx={{
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            GitHub
          </Button>
        </Box>

        {/* Mobile Navigation */}
        <Box sx={{ display: { xs: "flex", md: "none" } }}>
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <MenuIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            sx={{ display: { xs: "block", md: "none" } }}
          >
            {menuItems.map((item) => (
              <MenuItem
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  handleMenuClose();
                }}
                selected={isActive(item.path)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {item.icon}
                  {item.label}
                </Box>
              </MenuItem>
            ))}
            <MenuItem
              onClick={() => {
                window.open("https://github.com", "_blank");
                handleMenuClose();
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <GitHubIcon />
                GitHub
              </Box>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
