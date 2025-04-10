import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Select,
  Button,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Grid,
  OutlinedInput,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  Paper,
  Box,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  IconButton,
} from "@mui/material";
import { ClipLoader } from "react-spinners";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { ToastContainer, toast } from "react-toastify";
import { Form, useNavigate } from "react-router-dom";
import {
  fetchDevicesByDeviceType,
  fetchDeviceShifts,
  fetchFlespiDeviceTypes,
  fetchUserUsageActions,
  getDeviceShiftByDeviceId,
  getFlespiDevices,
  saveUsageActions,
  saveUsageReport,
  sendFlespiDeviceCommands,
  sendFlespiDeviceInstantCommands,
} from "../apis/api";
import { convertToTime } from "./common/New.Helper";

const ModelForm = ({ bringDeviceIds, bringRequiredFields, deviceShifts }) => {
  const [selectedId, setSelectedId] = useState("");
  const [protocolId, setProtocolId] = useState("");
  const [modelName, setModelName] = useState("");
  const [flespiDevices, setFlespiDevices] = useState([]);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getDeviceTypeDropDown();
  }, []);

  useEffect(() => {
    const filtered =
      data.filter((option) =>
        option.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) || [];

    const uniqueData = Array.from(
      new Map(filteredData.map((item) => [item.id, item])).values()
    );
    setFilteredData(uniqueData);
  }, [searchQuery, data]);

  const handleDeviceTypeChange = (event, newValue) => {
    if (newValue) {
      setSelectedId(newValue.id);
      setProtocolId(newValue.protocol_name || "");
      setModelName(newValue.name || "");
    } else {
      setSelectedId("");
      setProtocolId("");
      setModelName("");
      setFlespiDevices([]);
    }
  };

  useEffect(() => {
    if (flespiDevices) {
      bringRequiredFields({
        device_type_info: {
          id: selectedId,
          name: modelName,
          protocol: protocolId,
        },
      });
      bringDeviceIds(flespiDevices);
    }
  }, [flespiDevices, selectedId, protocolId, modelName]);

  useEffect(() => {
    if (selectedId) {
      deviceByTypeId();
    }
  }, [selectedId]);

  const getDeviceTypeDropDown = async () => {
    try {
      const response = await fetchFlespiDeviceTypes();
      setData(response);
      setFilteredData(response);
    } catch (error) {
      console.error(error);
    }
  };

  // const getAllDevices = async () => {
  //   try {
  //     const devices = await getFlespiDevices();
  //     const simplifiedDevices = devices.map(({ id, name }) => ({ id, name }));
  //     setFlespiDevices(simplifiedDevices);
  //   } catch (error) {
  //     console.error("Error fetching Flespi devices:", error);
  //   }
  // };

  const deviceByTypeId = async () => {
    try {
      const res = await fetchDevicesByDeviceType(selectedId);
      const formattedDevice = res.map(({ id, name }) => ({ id, name }));

      setFlespiDevices(formattedDevice);
    } catch (error) {
      console.error(error);
    }
  };

  // const handleSelectChange = (event) => {
  //   const selectedValue = event.target.value;
  //   const selectedOption = data?.find((option) => option.id === selectedValue);

  //   setSelectedId(selectedValue);
  //   setProtocolId(selectedOption ? selectedOption.protocol_name : "");
  //   setModelName(selectedOption ? selectedOption.name : "");
  // };

  // const handleDeviceChange = (event, value) => {
  //   setSelectedDevices(value);
  //   setSelectAll(value.length === flespiDevices.length);
  //   setSelectedDeviceId(value.map((device) => device));
  //   bringDeviceIds(value);
  // };

  // const handleSelectAll = (event) => {
  //   const isChecked = event.target.checked;
  //   setSelectAll(isChecked);
  //   setSelectedDevices(flespiTestDevice);
  // };

  // const matchedDevices = selectedDevices.map((device) => {
  //   const shiftInfo = deviceShifts.find(
  //     (shift) => shift.device.id === device.id
  //   );
  //   return {
  //     id: device.id,
  //     name: device.name,
  //     shiftName: shiftInfo?.shift?.shift_name || null,
  //     queue: shiftInfo?.queue || false,
  //     queueTime: shiftInfo?.queue_time || null,
  //   };
  // });

  return (
    <FormControl fullWidth>
      <Autocomplete
        fullWidth
        options={filteredData}
        getOptionLabel={(option) => `${option.name} (${option.protocol_name})`}
        value={filteredData.find((option) => option.id === selectedId) || null}
        onChange={handleDeviceTypeChange}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Model"
            placeholder="Type to search..."
          />
        )}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionSelected={(option, value) => option.id === value.id}
        key={(option, index) => `${option.name}-${index}`}
      />

      <TextField
        label="Protocol Name"
        sx={{ marginTop: "18px", font: "bold" }}
        placeholder="Protocol Id"
        value={protocolId}
        disabled
      />

      {/* <Box sx={{ display: "flex", alignItems: "center", marginTop: "12px" }}>
        <Checkbox checked={selectAll} onChange={handleSelectAll} />
        <label>Select All Devices</label>
      </Box> */}

      <Autocomplete
        fullWidth
        limitTags={1}
        multiple
        disablePortal
        options={flespiDevices}
        key={(option) => option.id}
        getOptionLabel={(option) => option.name}
        value={flespiDevices}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Devices"
            sx={{ maxHeight: 300, overflowY: "auto" }}
          />
        )}
        sx={{
          width: "100%",
          marginTop: "12px",
          mb: 2,
        }}
      />

      {/* {selectedDevices.length > 0 && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell>Queue</TableCell>
                <TableCell>TTL</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matchedDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>
                    {device.shiftName ? device.shiftName : "Not Assigned"}
                  </TableCell>
                  <TableCell>{device.queue ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    {device.queueTime ? device.queueTime : "Not Assigned"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )} */}
    </FormControl>
  );
};

const AddDialog = ({ user, onSelectedRowsChange, setSelectedRowData }) => {
  const [inputValues, setInputValues] = useState({});
  const [gridValue, setGridValue] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [addValue, setAddValue] = useState([]);

  const fetchActions = async () => {
    try {
      const response = await fetchUserUsageActions(user.id);

      const actionOptions = response.filter(
        (action) => action.id === 3 || action.id === 4
      );

      setGridValue(actionOptions);
    } catch (error) {
      console.error("Error fetching actions:", error);
    }
  };

  const handleInputChange = (e, id) => {
    const value = e.target.value;

    setInputValues((prevValues) => ({
      ...prevValues,
      [id]: value,
    }));

    if (selectedRow === id) {
      setSelectedRowData({
        actionId: id,
        actionName: gridValue.find((row) => row.id === id)?.name || "",
        command: value,
      });
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleCheckboxChange = (e, index, value) => {
    const updatedGridValue = [...gridValue];

    updatedGridValue.forEach((row) => {
      row.selected = false;
    });

    updatedGridValue[index].selected = e.target.checked;
    setGridValue(updatedGridValue);

    if (e.target.checked) {
      setSelectedRow(value.id);
      setSelectedRowData({
        actionId: value.id,
        actionName: value.name,
        command: inputValues[value.id] || "",
      });
    } else {
      setSelectedRow(null);
      setSelectedRowData(null);
    }

    const selectedRows = updatedGridValue.filter((row) => row.selected);
    onSelectedRowsChange(selectedRows);
  };

  return (
    <>
      {gridValue.length > 0 && (
        <TableContainer component={Paper} sx={{ marginTop: "16px" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Select</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Command</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gridValue.map((value, index) => (
                <TableRow key={value.id}>
                  <TableCell>
                    <Checkbox
                      checked={value.selected || false}
                      onChange={(e) => handleCheckboxChange(e, index, value)}
                    />
                  </TableCell>
                  <TableCell>{value.name}</TableCell>
                  <TableCell>
                    <TextField
                      sx={{ width: "50%" }}
                      label="Comma-separated numbers"
                      value={
                        selectedRow === value.id
                          ? inputValues[value.id] || ""
                          : ""
                      }
                      variant="filled"
                      onChange={(e) => handleInputChange(e, value.id)}
                      disabled={selectedRow !== value.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

const NewUsageControl = () => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [isloading, setIsLoading] = useState(false);
  const [deviceIds, setDeviceIds] = useState([]);
  const [deviceShift, setDeviceShift] = useState([]);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [report, setReport] = useState([]);
  const user = useSelector((state) => state.session.user);
  const navigate = useNavigate();

  const handleSelectedRowsChange = (rows) => {
    setSelectedRows(rows);
  };

  const isValidCommandFormat = (command) => {
    const regex = /^\d{3},\d{1},\d{1}$/;
    return regex.test(command);
  };

  const handleSaveClick = async () => {
    if (!selectedRowData) {
      toast.error("No action or input selected");
      return;
    }
    if (
      !selectedRowData.command ||
      !isValidCommandFormat(selectedRowData.command)
    ) {
      toast.error("Invalid command format");
      return;
    }

    const filterDeviceIds = deviceIds.map((device) => device.id);

    // const flespiDeviceId =
    //   filterDeviceIds.length === 1
    //     ? filterDeviceIds[0]
    //     : filterDeviceIds.join(",");

    let reportBody = {
      device_type_info: report.device_type_info,
      device_id: filterDeviceIds,
      usage_actions_id: selectedRowData.actionId,
      actionName: selectedRowData.actionName,
      actionCommand: selectedRowData.command,
      userId: user.id,
    };

    try {
      setIsLoading(true);
      const newReport = await saveUsageReport(reportBody);
      if (newReport.status === true) {
        toast.success(newReport.message);
        setTimeout(() => {
          navigate(-1);
        }, 1000);
      }
    } catch (error) {
      toast.error("Error saving report or sending command");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const bringDeviceIds = (device) => {
    setDeviceIds(device);
  };

  const bringRequiredFields = (fields) => {
    setReport({ ...fields, user: user.id });
  };

  const DevicesShifts = async () => {
    try {
      const res = await fetchDeviceShifts();
      setDeviceShift(res);
    } catch (error) {
      console.error("Error fetching device shifts:", error);
    }
  };

  useEffect(() => {
    DevicesShifts();
  }, []);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "usageControlReport"]}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            width: "50%",
            maxWidth: "600px",
            marginBottom: "20px",
          }}
        >
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Required</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ModelForm
                bringDeviceIds={bringDeviceIds}
                bringRequiredFields={bringRequiredFields}
                deviceShifts={deviceShift}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Select Action</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <AddDialog
                user={user}
                onSelectedRowsChange={handleSelectedRowsChange}
                setSelectedRowData={setSelectedRowData}
              />
            </AccordionDetails>
          </Accordion>
        </div>
        <ToastContainer />
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", gap: "20px" }}>
            <Button
              type="button"
              color="primary"
              variant="outlined"
              sx={{ padding: "10px 30px" }}
              onClick={() => {
                navigate(-1);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              color="primary"
              variant="contained"
              sx={{ padding: "10px 30px" }}
              onClick={handleSaveClick}
            >
              {isloading ? <ClipLoader color="#fff7f7" size={25} /> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default NewUsageControl;
