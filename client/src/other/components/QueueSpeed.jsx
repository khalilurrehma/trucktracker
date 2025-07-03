import { MenuItem, Select, Tooltip } from "@mui/material";
import React from "react";

const QueueSpeed = ({ player, handleSpeedChange }) => {
  return (
    <Tooltip title="Current speed" placement="top">
      <Select
        value={player.speed}
        onChange={handleSpeedChange}
        displayEmpty
        inputProps={{ "aria-label": "Without label" }}
        sx={{
          boxShadow: "none",
          ".MuiOutlinedInput-notchedOutline": { border: 0 },
          "&.MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
            border: 0,
          },
          "&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
            {
              border: 0,
            },
        }}
      >
        <MenuItem value={1}>x1</MenuItem>
        <MenuItem value={10}>x10</MenuItem>
        <MenuItem value={30}>x30</MenuItem>
        <MenuItem value={50}>x50</MenuItem>
        <MenuItem value={70}>x70</MenuItem>
        <MenuItem value={100}>x100</MenuItem>
      </Select>
    </Tooltip>
  );
};

export default QueueSpeed;
