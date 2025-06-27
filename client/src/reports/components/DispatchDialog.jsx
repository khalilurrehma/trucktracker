import * as React from "react";
import {
  AppBar,
  Button,
  Dialog,
  IconButton,
  TextField,
  Toolbar,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Slide,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useAppContext } from "../../AppContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useDropzone } from "react-dropzone";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const DispatchDialog = ({
  value,
  rimacCase,
  rimacReportId,
  openAssignModal,
  setOpenAssignModal,
  assignedDevices,
  newAllDevices,
  etaMap,
  caseNumber,
  selectedRowData,
  markerPosition,
  resetStates,
  searchId,
}) => {
  const { traccarUser, url } = useAppContext();
  const [message, setMessage] = React.useState("");
  const [selectedImages, setSelectedImages] = React.useState([]);
  const [loader, setLoader] = React.useState(false);

  const handleAssignTasks = async () => {
    const formData = new FormData();

    const mergedDeviceData = assignedDevices.map((assignedDevice) => {
      const rowData = selectedRowData.find(
        (row) => row.id === assignedDevice.id
      );
      return {
        ...assignedDevice,
        ...rowData,
        // eta: etaMap[assignedDevice.id]?.eta || null,
        // distance: etaMap[assignedDevice.id]?.distance || null,
      };
    });

    formData.append(
      "assignedDeviceIds",
      JSON.stringify(assignedDevices.map((device) => device.id))
    );
    formData.append("caseName", caseNumber);
    formData.append("userId", traccarUser?.id);
    formData.append("searchId", searchId);
    formData.append("caseAddress", value.description || "N/A");
    formData.append("lat", markerPosition.lat || "N/A");
    formData.append("lng", markerPosition.lng || "N/A");
    formData.append("message", message);
    formData.append("devicesMeta", JSON.stringify(mergedDeviceData));

    selectedImages.forEach((file) => {
      formData.append("files", file);
    });

    if (rimacCase) {
      formData.append("metadata", JSON.stringify({ rimacCase }));
      formData.append("rimac_report_id", rimacReportId);
    }

    try {
      setLoader(true);
      const { data } = await axios.post(`${url}/dispatch/case`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (data.status) {
        setLoader(false);
        toast.success(data.message);
        setTimeout(() => {
          resetStates();
          setOpenAssignModal(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to assign tasks:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to assign tasks.";
      toast.error(message);
      setLoader(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => setSelectedImages(acceptedFiles),
    multiple: true,
  });

  return (
    <Dialog
      open={openAssignModal}
      onClose={() => setOpenAssignModal(false)}
      TransitionComponent={Transition}
      fullScreen
      aria-describedby="alert-dialog-slide-description"
    >
      <ToastContainer />
      <AppBar sx={{ position: "relative" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setOpenAssignModal(false)}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Confirmation
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Devices
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>License Plate</TableCell>
                <TableCell>Incident Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignedDevices.map((device) => {
                const deviceInfo =
                  newAllDevices.find((d) => d.id === device.id) || device;
                // console.log(selectedRowData);

                return (
                  <TableRow key={device.id}>
                    <TableCell>{deviceInfo.name || "N/A"}</TableCell>
                    <TableCell>{value.description || "N/A"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>

        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Case Details
          </Typography>
          <TextField
            label="Case Number"
            value={caseNumber || "N/A"}
            fullWidth
            margin="normal"
            disabled
          />
          <TextField
            label="Incident Address"
            value={value.description || "N/A"}
            fullWidth
            margin="normal"
            disabled
          />
          {value.destinationDescription && (
            <TextField
              label="Destination Address"
              value={value.destinationDescription || "N/A"}
              fullWidth
              margin="normal"
              disabled
            />
          )}
        </Paper>

        <TextField
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          rows={4}
        />

        <Paper
          {...getRootProps()}
          elevation={3}
          sx={{
            p: 4,
            textAlign: "center",
            border: "2px dashed",
            borderColor: isDragActive ? "primary.main" : "grey.400",
            backgroundColor: isDragActive ? "grey.100" : "inherit",
            cursor: "pointer",
            mt: 2,
          }}
        >
          <input {...getInputProps()} />
          <UploadFileIcon fontSize="large" color="action" />
          <Typography variant="body1" sx={{ mt: 1, mb: 6 }}>
            {isDragActive
              ? "Drop the files here ..."
              : "Drag & drop files here, or click to select files"}
          </Typography>
          {selectedImages.length > 0 && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {selectedImages.length} file(s) selected
            </Typography>
          )}
        </Paper>

        <Box>
          <Button
            autoFocus
            onClick={handleAssignTasks}
            variant="contained"
            style={{ width: "100%", top: "15px" }}
          >
            {loader ? "Loading..." : "Assign Task"}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default DispatchDialog;
