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
  Autocomplete,
  Checkbox,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useTranslation } from "../common/components/LocalizationProvider";
import PageLayout from "../common/components/PageLayout";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSelector } from "react-redux";
// import ReportsMenu from "./components/ReportsMenu";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
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

const CreateReportPage = () => {
  const params = useParams();
  const { reports, traccarUser, allCalcs } = useAppContext();
  const classes = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [report, setReport] = useState(null);
  const [reportName, setReportName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [selectedFlespiCalcs, setSelectedFlespiCalcs] = useState(null);
  const [selectedIcon, setSelectedIcon] = useState("");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [flespiDevices, setFlespiDevices] = useState([]);

  // useEffect(() => {
  //   console.log("selected Devices : ", selectedDevices);
  // }, [selectedDevices]);

  console.log(allCalcs);

  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const handleCancelClick = () => {
    navigate("/settings/reports");
  };

  const handleIconClick = (icon) => {
    setSelectedIcon(icon);
  };

  const userId = useSelector((state) => state.session.user.id);

  useEffect(() => {
    fetchCategoriesData();
    if (params.reportId) {
      fetchReport(params.reportId);
    }
    // fetchCalcs();
    // fetchDevices();
  }, []);

  useEffect(() => {
    // console.log(report);
    setReportName(report?.name);
    setSelectedIcon(report?.icon);
    if (report && report.category_id) {
      setSelectedCategory(
        categoryOptions.find(
          (option) => option.id === parseInt(report?.category_id)
        ) || null
      );
    }
    if (report && report.calcs_ids) {
      const calc = JSON.parse(report.calcs);

      setSelectedFlespiCalcs(calc || null);
    }
  }, [report, categoryOptions, flespiDevices]);

  const fetchCategoriesData = async () => {
    try {
      const response = await axios.get(`${url}/categories`);
      if (response.status === 200) {
        setCategoryOptions(response.data);
      } else {
        throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await axios.get(`${url}/flespi-devices`);
      if (response.status === 200) {
        setFlespiDevices(response.data.data);
      } else {
        throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReport = async (reportId) => {
    try {
      const response = await axios.get(`${url}/report/${reportId}`);
      if (response.status === 200) {
        setReport(response.data.data);
      } else {
        throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectAllToggle = () => {
    setSelectAll((prevSelectAll) => !prevSelectAll);

    if (selectAll) {
      setSelectedDevices([]);
    } else {
      const allDeviceIDs = flespiDevices;
      setSelectedDevices(allDeviceIDs);
    }
  };

  const handleCreateClick = async (e) => {
    e.preventDefault();

    if (!selectedCategory || reportName.trim() === "") {
      toast.error("Please enter all required fields.");
      return;
    }
    const apiUrl = params.reportId
      ? `${url}/report/${params.reportId}`
      : `${url}/report`;

    // const devicesIds = selectedDevices.map((device) => device.id);

    const requestBody = {
      name: reportName,
      created_by: userId,
      category_id: selectedCategory.id,
      calcs: selectedFlespiCalcs,
      calcs_ids: selectedFlespiCalcs.calc_id,
      icon: selectedIcon,
    };

    const reportIdToExclude = params.reportId ? Number(params.reportId) : null;
    const filteredReprots = reportIdToExclude
      ? reports.filter((report) => report.id !== reportIdToExclude)
      : reports;

    const reportNameExists = filteredReprots.some(
      (report) => report.name === reportName
    );

    if (reportNameExists) {
      toast.error(`Report with name "${reportName}" already exists.`);
      return;
    }

    console.log("requestBody create or update report: ", requestBody);

    setLoading(true);

    try {
      const response = await axios[params.reportId ? "put" : "post"](
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
          navigate("/settings/reports");
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
      breadcrumbs2={["settingsTitle", "Admin Default Calculators"]}
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
                id="reportName"
                label="Report Name"
                variant="outlined"
                sx={{ width: "100%", mb: 2 }}
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
              <Autocomplete
                key={selectedCategory ? selectedCategory.id : "null"}
                id="category"
                options={categoryOptions}
                getOptionLabel={(option) => option.name}
                // getoptionselected={(option, value) => option.id === value.id}
                value={selectedCategory}
                onChange={(e, value) => setSelectedCategory(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Category"
                    variant="outlined"
                    sx={{ width: "100%", mb: 2 }}
                  />
                )}
              />

              <Autocomplete
                id="flespiCalcs"
                options={allCalcs}
                getOptionLabel={(option) => `${option.name} - ${option.type}`}
                value={selectedFlespiCalcs}
                onChange={(e, values) => setSelectedFlespiCalcs(values)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Calcs"
                    variant="outlined"
                    sx={{ width: "100%" }}
                  />
                )}
              />

              {/* <div>
                <label>
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAllToggle}
                  />
                  Select All Devices
                </label>
              </div>

              <Autocomplete
                multiple
                limitTags={1}
                disableCloseOnSelect
                id="flespiDevices"
                options={flespiDevices}
                getOptionLabel={(option) => `${option.name} (${option.id})`}
                value={selectedDevices}
                onChange={(e, values) => setSelectedDevices(values)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Devices"
                    variant="outlined"
                    sx={{ width: "100%", mb: 2 }}
                  />
                )}
              /> */}
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
              disabled={
                loading ||
                !selectedCategory ||
                !selectedFlespiCalcs ||
                !selectedIcon ||
                !reportName
              }
            >
              {loading ? <CircularProgress size={24} /> : "Create"}
            </Button>
          </div>
        </Container>
      </form>
    </PageLayout>
  );
};

export default CreateReportPage;
