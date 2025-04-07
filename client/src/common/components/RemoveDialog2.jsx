import React from "react";
import Button from "@mui/material/Button";
import { Snackbar } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useTranslation } from "./LocalizationProvider";
import { snackBarDurationLongMs } from "../util/duration";
import axios from "axios";

const useStyles = makeStyles((theme) => ({
  root: {
    [theme.breakpoints.down("md")]: {
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(
        1
      )})`,
    },
  },
  button: {
    height: "auto",
    marginTop: 0,
    marginBottom: 0,
    color: theme.palette.error.main,
  },
}));

let url;
if (import.meta.env.DEV) {
  url = `${import.meta.env.VITE_DEV_BACKEND_URL}`;
} else {
  url = `${import.meta.env.VITE_PROD_BACKEND_URL}`;
}

const RemoveDialog = ({ open, endpoint, itemId, onResult }) => {
  const classes = useStyles();
  const t = useTranslation();

  const handleRemove = async () => {
    try {
      const response = await axios.delete(`${url}/${endpoint}/${itemId}`);
      if (response.status === 200) {
        onResult(true);
      } else {
        console.error(response);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      onResult(true);
    }
  };

  return (
    <Snackbar
      className={classes.root}
      open={open}
      autoHideDuration={snackBarDurationLongMs}
      onClose={() => onResult(false)}
      message={t("sharedRemoveConfirm")}
      action={
        <Button size="small" className={classes.button} onClick={handleRemove}>
          {t("sharedRemove")}
        </Button>
      }
    />
  );
};

export default RemoveDialog;
