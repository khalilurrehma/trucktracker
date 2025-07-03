import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";

const QueueSkipBackward = ({ player, skipBackward }) => {
  return (
    <Tooltip title="Prev Message" placement="top">
      <span>
        <IconButton
          onClick={skipBackward}
          disabled={player.value === player.min}
        >
          <SkipPreviousIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default QueueSkipBackward;
