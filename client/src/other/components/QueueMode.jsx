import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import SocialDistanceIcon from "@mui/icons-material/SocialDistance";

const QueueMode = ({ player, togglePlayerMode }) => {
  return (
    <Tooltip title="Change mode (Time/Data)" placement="top">
      <IconButton onClick={togglePlayerMode} disabled={player.play === true}>
        {player.mode === "time" ? (
          // <svg
          //   fill={player.play ? "gray" : "white"}
          //   height="24"
          //   viewBox="0 0 24 24"
          //   width="24"
          //   xmlns="http://www.w3.org/2000/svg"
          // >
          //   <path d="m15 12h1.5v4.25l2.86 1.69-.75 1.22-3.61-2.16zm1-3c.69 0 1.37.1 2 .29v-4.59l-3 1.16v3.21c.33-.07.66-.07 1-.07m7 7a7 7 0 0 1 -7 7c-3 0-5.6-1.92-6.58-4.6l-1.42-.5-5.34 2.07-.16.03a.5.5 0 0 1 -.5-.5v-15.12c0-.23.15-.41.36-.48l5.64-1.9 6 2.1 5.34-2.07.16-.03a.5.5 0 0 1 .5.5v7.75c1.81 1.25 3 3.37 3 5.75m-14 0c0-2.79 1.63-5.2 4-6.33v-3.8l-4-1.4v11.66c0-.04 0-.09 0-.13m7-5a5 5 0 0 0 -5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0 -5-5m-12-5.54v11.85l3-1.16v-11.7z" />
          // </svg>
          <MapIcon />
        ) : (
          // <svg
          //   fill={player.play ? "gray" : "white"}
          //   height="24"
          //   viewBox="0 0 24 24"
          //   width="24"
          //   xmlns="http://www.w3.org/2000/svg"
          // >
          //   <path d="m6.5 8.11c-.89 0-1.61-.72-1.61-1.61a1.61 1.61 0 0 1 1.61-1.61c.89 0 1.61.72 1.61 1.61a1.61 1.61 0 0 1 -1.61 1.61m0-6.11c-2.5 0-4.5 2-4.5 4.5 0 3.37 4.5 8.36 4.5 8.36s4.5-4.99 4.5-8.36c0-2.5-2-4.5-4.5-4.5m11 6.11a1.61 1.61 0 0 1 -1.61-1.61c0-.89.72-1.61 1.61-1.61s1.61.72 1.61 1.61a1.61 1.61 0 0 1 -1.61 1.61m0-6.11c-2.5 0-4.5 2-4.5 4.5 0 3.37 4.5 8.36 4.5 8.36s4.5-4.99 4.5-8.36c0-2.5-2-4.5-4.5-4.5m0 14c-1.27 0-2.4.8-2.82 2h-5.36c-.55-1.56-2.27-2.38-3.82-1.83-1.57.55-2.39 2.27-1.84 3.83.56 1.56 2.27 2.38 3.84 1.83.85-.3 1.5-.98 1.82-1.83h5.37c.55 1.56 2.27 2.38 3.81 1.83 1.58-.55 2.4-2.27 1.85-3.83-.43-1.2-1.57-2-2.85-2zm0 4.5a1.5 1.5 0 0 1 -1.5-1.5 1.5 1.5 0 0 1 1.5-1.5 1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1 -1.5 1.5z" />
          // </svg>
          <SocialDistanceIcon />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default QueueMode;
