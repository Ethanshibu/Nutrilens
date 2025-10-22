
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1a1a1a", // Dark background for primary elements
    },
    secondary: {
      main: "#00aaff", // A subtle accent color
    },
    background: {
      default: "#000000", // Pure black background
      paper: "#1a1a1a", // Slightly lighter black for cards/surfaces
    },
    text: {
      primary: "#ffffff", // White text
      secondary: "#b0b0b0", // Light grey for secondary text
    },
  },
  typography: {
    fontFamily: "Roboto, sans-serif", // Modern, clean font
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
    },
    h5: {
      fontSize: "1.2rem",
      fontWeight: 500,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#000000", // Black app bar
          boxShadow: "none", // No shadow for minimalistic look
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Slightly rounded buttons
          textTransform: "none", // Keep original casing
        },
        containedPrimary: {
          backgroundColor: "#00aaff",
          "&:hover": {
            backgroundColor: "#0088cc",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#1a1a1a", // Dark card background
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)", // Subtle shadow
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#b0b0b0", // Light grey border
            },
            "&:hover fieldset": {
              borderColor: "#ffffff", // White border on hover
            },
            "&.Mui-focused fieldset": {
              borderColor: "#00aaff", // Accent color on focus
            },
          },
          "& .MuiInputLabel-root": {
            color: "#b0b0b0", // Light grey label
          },
          "& .MuiInputBase-input": {
            color: "#ffffff", // White input text
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: "#00aaff", // Accent color for links
        },
      },
    },
  },
});

export default theme;
