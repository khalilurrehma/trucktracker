import React from "react";
import { TextField, Grid } from "@mui/material";

const CircleInputs = ({ circle, setCircle }) => {
  const handleChange = (field, value) => {
    setCircle((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {/* Latitude */}
      <Grid item xs={12} md={4}>
        <TextField
          label="Latitude"
          fullWidth
          type="number"
          value={circle.lat}
          onChange={(e) => handleChange("lat", e.target.value)}
        />
      </Grid>

      {/* Longitude */}
      <Grid item xs={12} md={4}>
        <TextField
          label="Longitude"
          fullWidth
          type="number"
          value={circle.lng}
          onChange={(e) => handleChange("lng", e.target.value)}
        />
      </Grid>

      {/* Radius */}
      <Grid item xs={12} md={4}>
        <TextField
          label="Radius (meters)"
          fullWidth
          type="number"
          value={circle.radius}
          onChange={(e) => handleChange("radius", e.target.value)}
        />
      </Grid>
    </Grid>
  );
};

export default CircleInputs;
