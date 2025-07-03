import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import StopIcon from "@mui/icons-material/Stop";

const QueueStop = ({ player, stopPlayer }) => {
  return (
    <Tooltip title="Stop" placement="top">
      <span>
        <IconButton onClick={stopPlayer} disabled={player.value === player.min}>
          <StopIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default QueueStop;
