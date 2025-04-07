import React, { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

const DynamicForm = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("t");
  const navigate = useNavigate();
  const { id } = useParams();
  const [jsonInput, setJsonInput] = useState("");
  const [formData, setFormData] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modeOptions, setModeOptions] = useState([
    { id: 0, type: "default" },
    { id: 1, type: "custom" },
    { id: 2, type: "notification" },
  ]);
  const [selectedMode, setSelectedMode] = useState(null);

  useEffect(() => {
    if (id) {
      fetchFromApi();
    }
  }, [id]);

  const fetchFromApi = async () => {
    try {
      const { data } = await axios.get(`${url}/calcs/${id}`);
      setData(data.message.calcs_body);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  const handleJsonChange = (event) => {
    setJsonInput(event.target.value);
  };

  const handleGenerateForm = () => {
    try {
      const parsedJson = JSON.parse(jsonInput);
      setFormData(parsedJson);
    } catch (error) {
      alert("Invalid JSON format");
    }
  };

  const handleChange = (key, value) => {
    if (id) {
      const updatedData = { ...data, [key]: value };
      console.log(updatedData[key]);
      setData(updatedData);
    } else {
      setFormData((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handleModeChange = (event) => {
    setSelectedMode(event.target.value);
  };

  const handleSubmit = async () => {
    let selectedMode = modeOptions.filter(
      (mode_type) => mode_type.type === mode
    );

    let body = { formData, mode: selectedMode[0] };
    let updateBody = data;

    try {
      setLoading(true);
      const { data } = id
        ? await axios.put(`${url}/calcs/${id}`, updateBody)
        : await axios.post(`${url}/calcs`, body);
      if (id && data.status) {
        toast.success(data.message);
        setTimeout(() => {
          navigate(-1);
        }, 1500);
      } else {
        toast.success(data.message);
        setJsonInput("");
        setFormData(null);
        setSelectedMode(null);
        setTimeout(() => {
          navigate(-1);
        }, 1500);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "settingsCalcs"]}
    >
      <ToastContainer />
      {!id && (
        <Box p={3}>
          <TextField
            label="Enter JSON"
            multiline
            variant="outlined"
            value={jsonInput}
            onChange={handleJsonChange}
            sx={{ width: "100%" }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateForm}
            sx={{ mt: 2 }}
          >
            Apply JSON
          </Button>

          {formData && (
            <>
              <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
                <Grid container spacing={2}>
                  {"name" in formData && (
                    <Grid item xs={12}>
                      <TextField
                        label="Name"
                        fullWidth
                        variant="outlined"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                      />
                    </Grid>
                  )}

                  {/* <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Mode</InputLabel>
                      <Select
                        value={selectedMode?.type}
                        onChange={(e) => handleModeChange(e)}
                      >
                        {modeOptions.map((option) => (
                          <MenuItem key={option.id} value={option}>
                            {option.type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid> */}
                </Grid>
              </Paper>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    navigate(-1);
                  }}
                  sx={{ mt: 2, width: "15%" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  sx={{ mt: 2, width: "15%" }}
                  isLoading={loading}
                  disabled={!formData || loading}
                >
                  {loading ? "Loading..." : "Submit"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}
      {id && data && (
        <Box sx={{ p: 3, mt: 3 }}>
          <Grid spacing={2}>
            {Object.entries(data).map(([key, value]) => (
              <Grid item xs={12} sm={6} key={key}>
                {Array.isArray(value) ? (
                  value.map((item, index) => (
                    <Paper
                      key={index}
                      sx={{ p: 2, mt: 1, backgroundColor: "#f5f5f5" }}
                    >
                      <Typography variant="subtitle1">
                        {key} - {index + 1}
                      </Typography>
                      {typeof item === "object" ? (
                        Object.entries(item).map(([subKey, subValue]) => (
                          <TextField
                            key={subKey}
                            label={subKey}
                            fullWidth
                            variant="outlined"
                            sx={{ mt: 1 }}
                            value={subValue}
                            type={
                              typeof subValue === "number"
                                ? "number"
                                : typeof subValue === "boolean"
                                ? "text"
                                : "text"
                            }
                            onChange={(e) => {
                              const newArray = [...value];
                              let newValue = e.target.value;

                              if (typeof subValue === "number") {
                                newValue = Number(newValue);
                              } else if (typeof subValue === "boolean") {
                                newValue = newValue.toLowerCase() === "true";
                              }

                              newArray[index][subKey] = newValue;
                              handleChange(key, newArray);
                            }}
                          />
                        ))
                      ) : (
                        <TextField
                          label={`${key} [${index}]`}
                          fullWidth
                          variant="outlined"
                          sx={{ mt: 1 }}
                          value={item}
                          type={
                            typeof item === "number"
                              ? "number"
                              : typeof item === "boolean"
                              ? "text"
                              : "text"
                          }
                          onChange={(e) => {
                            const newArray = [...value];
                            let newValue = e.target.value;

                            if (typeof item === "number") {
                              newValue = Number(newValue);
                            } else if (typeof item === "boolean") {
                              newValue = newValue.toLowerCase() === "true";
                            }

                            newArray[index] = newValue;
                            handleChange(key, newArray);
                          }}
                        />
                      )}
                    </Paper>
                  ))
                ) : typeof value === "object" ? (
                  Object.entries(value).map(([subKey, subValue]) => (
                    <TextField
                      key={subKey}
                      label={subKey}
                      fullWidth
                      variant="outlined"
                      sx={{ mt: 1 }}
                      value={subValue}
                      type={
                        typeof subValue === "number"
                          ? "number"
                          : typeof subValue === "boolean"
                          ? "text"
                          : "text"
                      }
                      onChange={(e) => {
                        let newValue = e.target.value;

                        if (typeof subValue === "number") {
                          newValue = Number(newValue);
                        } else if (typeof subValue === "boolean") {
                          newValue = newValue.toLowerCase() === "true";
                        }

                        handleChange(key, { ...value, [subKey]: newValue });
                      }}
                    />
                  ))
                ) : (
                  <TextField
                    label={key}
                    fullWidth
                    variant="outlined"
                    sx={{ mt: 1 }}
                    value={value}
                    type={
                      typeof value === "number"
                        ? "number"
                        : typeof value === "boolean"
                        ? "text"
                        : "text"
                    }
                    onChange={(e) => {
                      let newValue = e.target.value;

                      if (typeof value === "number") {
                        newValue = Number(newValue);
                      } else if (typeof value === "boolean") {
                        newValue = newValue.toLowerCase() === "true";
                      }

                      handleChange(key, newValue);
                    }}
                  />
                )}
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                navigate(-1);
              }}
              sx={{ mt: 2, width: "15%" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              sx={{ mt: 2, width: "15%" }}
              isLoading={loading}
              disabled={!data || loading}
            >
              {loading ? "Loading..." : "Submit"}
            </Button>
          </Box>
        </Box>
      )}
    </PageLayout>
  );
};

export default DynamicForm;
