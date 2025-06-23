import React from "react";
import { Fab } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import RemoveIcon from "@mui/icons-material/Remove";
import { useNavigate } from "react-router-dom";
import { useRestriction } from "../../common/util/permissions";

const useStyles = makeStyles((theme) => ({
  fab: {
    position: "fixed",
    bottom: theme.spacing(2),
    right: theme.spacing(10),
    [theme.breakpoints.down("md")]: {
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(
        10
      )})`,
    },
  },
}));

const RemoveFav = ({ editPath, disabled }) => {
  const classes = useStyles();
  const navigate = useNavigate();

  const readonly = useRestriction("readonly");

  if (!readonly && !disabled) {
    return (
      <Fab
        size="medium"
        color="error"
        className={classes.fab}
        onClick={() => navigate(editPath)}
      >
        <RemoveIcon />
      </Fab>
    );
  }
  return "";
};

export default RemoveFav;
