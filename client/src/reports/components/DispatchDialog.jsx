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
  openAssignModal,
  setOpenAssignModal,
  assignedDevices,
  selectedRows,
  setSelectedRows,
  lat,
  lng,
  newAllDevices,
  etaMap,
  caseNumber,
}) => {
  const { traccarUser, url } = useAppContext();
  const [message, setMessage] = React.useState("");
  const [selectedImages, setSelectedImages] = React.useState([]);

  const handleAssignTasks = async () => {
    const deviceData = assignedDevices.map((device) => {
      const deviceInfo =
        newAllDevices.find((d) => d.id === device.id) || device;
      const distance =
        etaMap[device.id]?.distance ||
        (device.distance ? (device.distance / 1000).toFixed(2) : "N/A");
      const cost =
        distance !== "N/A" && deviceInfo.costByKm
          ? (parseFloat(distance) * deviceInfo.costByKm).toFixed(2)
          : "Not set";

      return {
        deviceId: device.id,
        cost: cost !== "Not set" ? cost : "Not set",
      };
    });

    const data = {
      deviceIds: assignedDevices.map((device) => device.id),
      caseName: caseNumber,
      caseAddress: value.description || "N/A",
      devices: deviceData,
      message: message,
      files: selectedImages,
    };

    console.log(data);

    // try {
    //   await axios.post(`${url}/api/cases`, data, {
    //     headers: { Authorization: `Bearer ${traccarUser.token}` },
    //   });
    //   toast.success("Tasks assigned successfully!");
    //   setOpenAssignModal(false);
    //   setSelectedRows([]);
    // } catch (error) {
    //   console.error("Failed to assign tasks:", error);
    //   toast.error("Failed to assign tasks.");
    // }
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
          <Button
            autoFocus
            onClick={handleAssignTasks}
            variant="outlined"
            style={{ maxWidth: "320px", color: "white", borderColor: "white" }}
          >
            Assign Tasks
          </Button>
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
                <TableCell>Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignedDevices.map((device) => {
                const deviceInfo =
                  newAllDevices.find((d) => d.id === device.id) || device;

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
            label="Address"
            value={value.description || "N/A"}
            fullWidth
            margin="normal"
            disabled
          />
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
          <Typography variant="body1" sx={{ mt: 1 }}>
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
      </Box>
    </Dialog>
  );
};

export default DispatchDialog;
