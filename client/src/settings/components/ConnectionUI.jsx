import React from "react";
import { Button, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ConnectionUI = ({ wherePath }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!wherePath) {
      toast.error("Please select a connection type", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        onClose: () => {
          navigate(-1);
        },
      });
      return;
    }
    navigate(wherePath);
  };

  return (
    <Box
      sx={{
        height: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <Typography variant="h3" gutterBottom>
        Add connections to users
      </Typography>

      <Box sx={{ mt: 2, display: "flex", gap: 2, justifyContent: "center" }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => navigate(-1)}
          sx={{
            padding: 3,
            borderRadius: 1,
            maxWidth: 400,
            margin: "auto",
          }}
        >
          Discard
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleClick}
          sx={{
            padding: 3,
            borderRadius: 1,
            maxWidth: 400,
            margin: "auto",
          }}
        >
          Add
        </Button>
      </Box>
    </Box>
  );
};

export default ConnectionUI;
