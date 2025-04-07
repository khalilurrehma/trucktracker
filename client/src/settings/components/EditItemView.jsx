import React, { useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
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
import { useSelector } from "react-redux";
import { useTranslation } from "../../common/components/LocalizationProvider";
import PageLayout from "../../common/components/PageLayout";
import useSettingsStyles from "../common/useSettingsStyles";
import { parseGeoJSON } from "../../common/util/common";
import { useAppContext } from "../../AppContext";
import SettingLoader from "../common/SettingLoader";
import { Oval } from "react-loader-spinner";

const EditItemView = ({
  children,
  endpoint,
  item,
  setItem,
  defaultItem,
  validate,
  onItemSaved,
  menu,
  breadcrumbs,
}) => {
  const navigate = useNavigate();
  const classes = useSettingsStyles();
  const t = useTranslation();
  const { traccarUser } = useAppContext();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const userId = useSelector((state) => state.session.user.id);

  // let url = "http://localhost:3002/api/subaccount";
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
      // console.log("Item : ", item)
      if (id) {
        // console.log("useEffect URL : ", url)
        const response = await axios.get(`${url}`);

        // console.log("API RESPONSE : ", response)
        if (response.status === 200) {
          const data = response.data?.message
            ? response.data?.message
            : response.data?.data;

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

  const handleSave = async () => {
    if (!id && item.password?.length < 16) {
      toast.error("Password must be at least 17 characters long");
      return;
    }
    try {
      setIsLoading(true);
      const response = await axios({
        method: id ? "PUT" : "POST",
        url,
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify(parseGeoJSON(item)),
      });
      if (response.status === 200) {
        toast.success(response.data.message || "Saved successfully!");
        if (onItemSaved) {
          onItemSaved(response.data);
        }
        navigate(-1);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errors.forEach((err) => {
          toast.error(err.reason);
        });
      } else if (error.response?.data?.errorMessage) {
        toast.error(error.response.data.errorMessage);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("An unexpected error occurred.");
      }
      console.error("Error making API request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout menu={menu} breadcrumbs={breadcrumbs}>
      <ToastContainer />
      <Container maxWidth="xs" className={classes.container}>
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
          {isLoading ? (
            <Oval
              visible={true}
              height="30"
              width="50"
              color="#1a237e"
              ariaLabel="oval-loading"
              wrapperStyle={{}}
              wrapperClass=""
            />
          ) : (
            <Button
              type="button"
              color="primary"
              variant="contained"
              onClick={handleSave}
              disabled={!item || !validate()}
            >
              {t("sharedSave")}
            </Button>
          )}
        </div>
      </Container>
    </PageLayout>
  );
};

export default EditItemView;
