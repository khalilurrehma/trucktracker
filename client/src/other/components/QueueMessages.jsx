import { IconButton, Tooltip } from "@mui/material";
import React from "react";
import DvrIcon from "@mui/icons-material/Dvr";

const QueueMessages = ({ toggleMessages }) => {
  return (
    <Tooltip title="Messages" placement="top">
      <span>
        <IconButton onClick={toggleMessages}>
          <DvrIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default QueueMessages;
