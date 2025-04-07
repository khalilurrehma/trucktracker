import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import TextField from "@mui/material/TextField";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditItemView from "./components/EditItemView3";
import EditAttributesAccordion from "./components/EditAttributesAccordion";
import SelectField from "../common/components/SelectField";
import { useTranslation } from "../common/components/LocalizationProvider";
import SettingsMenu from "./components/SettingsMenu";
import useCommonDeviceAttributes from "../common/attributes/useCommonDeviceAttributes";
import useGroupAttributes from "../common/attributes/useGroupAttributes";
import { useCatch } from "../reactHelper";
import { groupsActions } from "../store";
import { useAppContext } from "../AppContext";
import { useAdministrator } from "../common/util/permissions";
import axios from "axios";

const useStyles = makeStyles((theme) => ({
  details: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
}));

const NewGroupPage = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();
  const { traccarUser, subaccount } = useAppContext();
  const admin = useAdministrator();
  const userName = useSelector((state) => state.session.user.name);

  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const groupAttributes = useGroupAttributes(t);

  const [item, setItem] = useState();

  useEffect(() => {
    setItem({
      ...item,
      userId: traccarUser?.id,
      subaccount_cid: subaccount,
      isSuperAdmin: traccarUser?.superAdmin || false,
      administrator:
        traccarUser?.superAdmin === true ||
        traccarUser?.attributes?.non_admin === true
          ? false
          : true,
      superVisor: traccarUser?.attributes?.non_admin,
      userName,
    });

    console.log(subaccount);
  }, [traccarUser, subaccount]);

  const validate = () => item && item.name;

  return (
    <EditItemView
      endpoint="new-groups"
      item={item}
      setItem={setItem}
      validate={validate}
      // onItemSaved={onItemSaved}
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "groupDialog"]}
    >
      {item && (
        <>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t("sharedRequired")}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.name || ""}
                onChange={(event) =>
                  setItem({ ...item, name: event.target.value })
                }
                label={t("sharedName")}
              />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t("sharedExtra")}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <SelectField
                value={item.groupId || 0}
                onChange={(event) =>
                  setItem({ ...item, groupId: Number(event.target.value) })
                }
                endpoint="/api/groups"
                label={t("groupParent")}
              />
            </AccordionDetails>
          </Accordion>
          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={{ ...commonDeviceAttributes, ...groupAttributes }}
          />
        </>
      )}
    </EditItemView>
  );
};

export default NewGroupPage;
