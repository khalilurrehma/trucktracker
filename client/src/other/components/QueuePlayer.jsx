import { Slider } from "@mui/material";
import React from "react";

const QueuePlayer = ({ player, handleSliderChange }) => {
  const handleChange = (event, newValue) => {
    handleSliderChange(event, newValue);
  };

  return (
    <div style={{ width: "100%", padding: "7px 15px 0 15px" }}>
      <Slider
        value={typeof player.value === "number" ? player.value : 0}
        onChange={handleChange}
        aria-labelledby="input-slider"
        min={player.min}
        max={player.max}
        step={player.max / 100}
      />
    </div>
  );
};

export default QueuePlayer;
