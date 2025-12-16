import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import makeStyles from "@mui/styles/makeStyles";
import {
  Container,
  Button,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Skeleton,
  Typography,
  TextField,
} from "@mui/material";
import { useCatch, useEffectAsync } from "../../reactHelper";
import { useTranslation } from "../../common/components/LocalizationProvider";
import PageLayout from "../../common/components/PageLayout";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../../AppContext";
import { parseGeoJSON } from "../../common/util/common";

const useStyles = makeStyles((theme) => ({
  container: {
    marginTop: theme.spacing(2),
  },
  buttons: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: "flex",
    justifyContent: "space-evenly",
    "& > *": {
      flexBasis: "33%",
    },
  },
  details: {
    display: "flex",
    flexDirection: "column",
  },
}));

const EditItemView = ({
  children,
  endpoint,
  item,
  setItem,
  defaultItem,
  validate,
  //   onItemSaved,
  menu,
  breadcrumbs,
}) => {
  const { traccarUser, flespiToken, setServerMessage } = useAppContext();
  const navigate = useNavigate();
  const classes = useStyles();
  const t = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const { id } = useParams();

  const userId = useSelector((state) => state.session.user.id);

  let url;
  if (import.meta.env.DEV) {
    url = `${import.meta.env.VITE_DEV_BACKEND_URL}/${endpoint}`;
  } else {
    url = `${import.meta.env.VITE_PROD_BACKEND_URL}/${endpoint}`;
  }
  if (id) {
    url += `/${id}`;
  }

  useEffectAsync(async () => {
    if (!item) {
      if (id) {
        const response = await axios.get(`${url}`);
        if (response.status === 200) {
          const data = response.data.data;
          let stableData;
          if (url.includes("group")) {
            stableData = {
              dataId: data.id,
              id: data.traccarId,
              name: data.name,
              groupId: data.groupId,
              attributes: data.attributes,
            };
          } else {
            stableData = data;
          }

          if (data?.flespi_metadata) {
            try {
              const metadata = JSON.parse(data.flespi_metadata);
              // Fill optional fields (e.g., vehicle metrics) from flespi metadata when not already present
              Object.entries(metadata).forEach(([key, value]) => {
                if (
                  stableData[key] === undefined ||
                  stableData[key] === null ||
                  stableData[key] === ""
                ) {
                  stableData[key] = value;
                }
              });
            } catch (error) {
              console.error("Failed to parse flespi_metadata", error);
            }
          }

          setItem(stableData);
        } else {
          throw Error(await response.data.message);
        }
      } else {
        const newItem = { ...defaultItem, userId };
        setItem(newItem);
      }
    }
  }, [id, item, defaultItem, setItem, userId]);

  const handleSave = useCatch(async () => {
    if (
      !id &&
      (endpoint === "new-devices" || endpoint === "new-users") &&
      !traccarUser.superAdmin &&
      !flespiToken.token
    ) {
      toast.error("Your token is not set.");
      return;
    }
    if (endpoint === "new-devices") {
      // if (!id) url += `/${userId}`;
      if (
        !item.hasOwnProperty("messages_ttl") ||
        item.messages_ttl === 0 ||
        item.messages_ttl === ""
      ) {
        item.messages_ttl = 3;
      }
      if (
        !item.hasOwnProperty("media_ttl") ||
        item.media_ttl === 0 ||
        item.media_ttl === ""
      ) {
        item.media_ttl = 3;
        item.userame;
      }
    }
    if (endpoint === "new-calculators") {
      for (let key in item) {
        if (item[key] === null || item[key] === undefined) {
          delete item[key];
        }
      }
      if (item.hasOwnProperty("messages_source")) {
        if (item.messages_source === 1) {
          item.messages_source = {
            source: "device",
          };
        } else if (item.messages_source === 2) {
          item.messages_source = {
            source: "calc",
            calc_id: item.calc_id || 1,
          };
        }
      }
    }

    if (endpoint === "subscribe/protocol/notification") {
      const formData = new FormData();
      formData.append("audioFile", item.audioFile);
      formData.append("configured_items", item.configured_items.id);
      formData.append("device_type_id", item.device_type_id);
      formData.append("userId", item.userId);

      try {
        setIsLoading(true);
        const response = await axios({
          method: id ? "PUT" : "POST",
          url,
          headers: { "Content-Type": "multipart/form-data" },
          data: formData,
        });
        if (response.data.status) {
          toast.success(response.data.message);
          navigate(-1);
        }
        N;
      } catch (error) {
        if (error.response.data.errors) {
          const errors = error.response.data.errors;
          errors.forEach((err) => {
            toast.error(err.reason);
          });
        } else if (error.response.data.errorMessage) {
          toast.error(error.response.data.errorMessage);
        } else if (error.response.data.error) {
          toast.error(error.response.data.error);
        }
        console.error("Error making API request:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (endpoint === "subscribe/notification") {
      const formData = new FormData();
      formData.append("audioFile", item.audioFile);
      formData.append("notificators", item.notificators);
      formData.append("type", item.type.id);

      try {
        setIsLoading(true);
        const response = await axios({
          method: id ? "PUT" : "POST",
          url,
          headers: { "Content-Type": "multipart/form-data" },
          data: formData,
        });
        if (response.data.status) {
          setServerMessage({
            action: "subscribe",
            topic: item.type.mqtt_topic,
          });
          toast.success(response.data.message);
          navigate(-1);
        }
      } catch (error) {
        if (error.response.data.errors) {
          const errors = error.response.data.errors;
          errors.forEach((err) => {
            toast.error(err.reason);
          });
        } else if (error.response.data.errorMessage) {
          toast.error(error.response.data.errorMessage);
        } else if (error.response.data.error) {
          toast.error(error.response.data.error);
        }
        console.error("Error making API request:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        setIsLoading(true);
        const response = await axios({
          method: id ? "PUT" : "POST",
          url,
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify(parseGeoJSON(item)),
        });
        if (response.status === 200) {
          toast.success(response.data.message);
          setTimeout(() => {
            navigate(-1);
          }, 1000);
        }
      } catch (error) {
        if (error.response.data.errors) {
          const errors = error.response.data.errors;
          errors.forEach((err) => {
            toast.error(err.reason);
          });
        } else if (error.response.data.errorMessage) {
          toast.error(error.response.data.errorMessage);
        } else if (error.response.data.error) {
          toast.error(error.response.data.error);
        }
        console.error("Error making API request:", error);
      } finally {
        setIsLoading(false);
      }
    }
  });

  return (
    <PageLayout menu={menu} breadcrumbs={breadcrumbs}>
      <Container
        maxWidth={endpoint === "new-calculators" ? "md" : "xs"}
        className={classes.container}
      >
        <ToastContainer />
        {item ? (
          children
        ) : (
          <Accordion defaultExpanded>
            <AccordionSummary>
              <Typography variant="subtitle1">
                <Skeleton width="10em" />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={-i} width="100%">
                  <TextField />
                </Skeleton>
              ))}
            </AccordionDetails>
          </Accordion>
        )}
        <div className={classes.buttons}>
          <Button
            type="button"
            color="primary"
            variant="outlined"
            onClick={() => navigate(-1)}
            disabled={!item}
          >
            {t("sharedCancel")}
          </Button>
          <Button
            type="button"
            color="primary"
            variant="contained"
            onClick={handleSave}
            disabled={
              !item ||
              (typeof validate === "function" && !validate()) ||
              isLoading
            }
          >
            {isLoading ? "Loading" : t("sharedSave")}
          </Button>
        </div>
      </Container>
    </PageLayout>
  );
};

export default EditItemView;
