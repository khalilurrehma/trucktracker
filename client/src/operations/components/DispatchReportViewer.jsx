import React, { useState } from "react";
import {
  Grid,
  Box,
  Typography,
  TextField,
  Divider,
  Paper,
  Modal,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function prettyLabel(label) {
  return label.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function groupPhotos(vehicles) {
  const grouped = {};
  vehicles.forEach((vehicle) => {
    (vehicle.photos || []).forEach((photo) => {
      const category = photo.category || "Other";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(photo);
    });
  });
  return grouped;
}

export default function DispatchReportViewer({ dispatchData }) {
  const [open, setOpen] = useState(false);
  const [modalImg, setModalImg] = useState(null);

  if (!dispatchData) return null;

  let vehicles = [];
  if (dispatchData.vehicles) {
    if (typeof dispatchData.vehicles === "string") {
      try {
        vehicles = JSON.parse(dispatchData.vehicles);
      } catch (e) {
        vehicles = [];
      }
    } else if (Array.isArray(dispatchData.vehicles)) {
      vehicles = dispatchData.vehicles;
    }
  }

  const photoGroups = vehicles.length > 0 ? groupPhotos(vehicles) : {};

  const dispatchFields = Object.entries(dispatchData).filter(
    ([key]) => key !== "vehicles"
  );

  const handleOpen = (imgObj) => {
    setModalImg(imgObj);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Dispatch Report Data
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        {dispatchFields.map(([key, value]) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <TextField
              label={prettyLabel(key)}
              value={value == null ? "" : value}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
            />
          </Grid>
        ))}
      </Grid>

      {vehicles.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Vehicles &amp; Photos
          </Typography>
          {Object.entries(photoGroups).map(([category, photos]) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="bold" gutterBottom>
                {category}
              </Typography>
              <Grid container spacing={2}>
                {photos.map((photo) => (
                  <Grid item xs={12} key={photo.photo_id}>
                    <Box
                      sx={{
                        border: "1px solid #eee",
                        borderRadius: 2,
                        p: 2,
                        bgcolor: "#fff",
                        boxShadow: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        cursor: "pointer",
                        transition: "box-shadow 0.2s",
                        "&:hover": { boxShadow: 5 },
                      }}
                      onClick={() => handleOpen(photo)}
                    >
                      <Box
                        component="img"
                        src={photo.url}
                        alt={photo.type}
                        sx={{
                          width: "100%",
                          maxWidth: 600,
                          height: 350,
                          objectFit: "cover",
                          borderRadius: 2,
                          mb: 1.5,
                          boxShadow: 3,
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        gutterBottom
                      >
                        {photo.type}
                      </Typography>
                      <Typography variant="caption" display="block">
                        ID: {photo.photo_id}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {photo.created_at
                          ? new Date(photo.created_at).toLocaleString()
                          : ""}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </>
      )}

      <Modal open={open} onClose={handleClose} closeAfterTransition>
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            bgcolor: "rgba(0,0,0,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 24,
              right: 24,
              color: "#fff",
              zIndex: 10000,
              background: "rgba(0,0,0,0.4)",
              "&:hover": { background: "rgba(0,0,0,0.7)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 32 }} />
          </IconButton>
          {modalImg && (
            <Box
              sx={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                outline: "none",
              }}
            >
              <Box
                component="img"
                src={modalImg.url}
                alt={modalImg.type}
                sx={{
                  width: "auto",
                  maxWidth: "90vw",
                  maxHeight: "75vh",
                  borderRadius: 2,
                  boxShadow: 5,
                  mb: 2,
                  background: "#fff",
                }}
              />
              <Typography
                variant="body1"
                fontWeight="bold"
                color="#fff"
                gutterBottom
              >
                {modalImg.type}
              </Typography>
              <Typography variant="caption" color="#fff" display="block">
                ID: {modalImg.photo_id}
              </Typography>
              <Typography variant="caption" color="#fff" display="block">
                {modalImg.created_at
                  ? new Date(modalImg.created_at).toLocaleString()
                  : ""}
              </Typography>
            </Box>
          )}
        </Box>
      </Modal>
    </Paper>
  );
}
