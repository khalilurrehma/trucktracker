import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  TextField,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useTranslation } from "../common/components/LocalizationProvider";
import PageLayout from "../common/components/PageLayout";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
// import ReportsMenu from "./components/ReportsMenu";
import { useAppContext } from "../AppContext";
import IconGrid from "../reports/common/IconGrid";
import SettingsMenu from "../settings/components/SettingsMenu";

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
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
}));

const NewCategory = () => {
  const params = useParams();
  const classes = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const { categories } = useAppContext();
  const [category, setCategory] = useState({});
  const [categoryName, setCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [loading, setLoading] = useState(false);

  const url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const userId = useSelector((state) => state.session.user.id);

  const handleCancelClick = () => {
    navigate("/settings/categories");
  };

  useEffect(() => {
    if (params.categoryId) {
      fetchCategory(params.categoryId);
    }
  }, []);

  useEffect(() => {
    if (category) {
      setCategoryName(category.name);
      setSelectedIcon(category.icon);
    }
  }, [category]);

  const fetchCategory = async (categoryId) => {
    try {
      const response = await axios.get(`${url}/category/${categoryId}`);

      if (response.status === 200) {
        setCategory(response.data[0]);
      } else {
        throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleIconClick = (icon) => {
    setSelectedIcon(icon);
  };

  const handleCreateClick = async (e) => {
    e.preventDefault();

    const apiUrl = params.categoryId
      ? `${url}/category/${params.categoryId}`
      : `${url}/category`;

    const requestBody = {
      name: categoryName,
      created_by: userId,
      icon: selectedIcon,
    };

    const categoryIdToExclude = params.categoryId
      ? Number(params.categoryId)
      : null;
    const filteredCategories = categoryIdToExclude
      ? categories?.filter((category) => category.id !== categoryIdToExclude)
      : categories;

    const nameExists = filteredCategories?.some(
      (category) => category.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (nameExists) {
      toast.error(`Category with name "${categoryName}" already exists.`);
      return;
    }

    setLoading(true);

    try {
      const response = await axios[params.categoryId ? "put" : "post"](
        apiUrl,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        toast.success(response.data.message);
        setTimeout(() => {
          navigate("/settings/categories");
        }, 1500);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error);
      }
      console.error("API Request Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Categories"]}
    >
      <ToastContainer />
      <form onSubmit={handleCreateClick}>
        <Container maxWidth="xs" className={classes.container}>
          <Accordion defaultExpanded={true}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t("sharedRequired")}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                id="categoryName"
                label="Category Name"
                variant="outlined"
                sx={{ width: "100%", mb: 2 }}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
              <IconGrid
                selectedIcon={selectedIcon}
                onIconClick={handleIconClick}
              />
            </AccordionDetails>
          </Accordion>

          <div className={classes.buttons}>
            <Button variant="outlined" onClick={handleCancelClick}>
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={loading || !categoryName || !selectedIcon}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : params.categoryId ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </Container>
      </form>
    </PageLayout>
  );
};

export default NewCategory;
