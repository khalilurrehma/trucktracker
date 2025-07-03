import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import SkipNextIcon from "@mui/icons-material/SkipNext";

const QueueSkipFarword = ({ player, skipForward }) => {
  return (
    <Tooltip title="Next message" placement="top">
      <span>
        <IconButton
          onClick={skipForward}
          disabled={player.value === player.max}
        >
          <SkipNextIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default QueueSkipFarword;
