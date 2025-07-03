import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";

const QueuePlay = ({ player, togglePlayerPlay }) => {
  return (
    <Tooltip title="Play/Pause" placement="top">
      <span>
        <IconButton onClick={togglePlayerPlay}>
          {player.play ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default QueuePlay;
