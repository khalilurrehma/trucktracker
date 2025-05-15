import * as React from "react";
import {
  AppBar,
  Button,
  Dialog,
  IconButton,
  Input,
  Slide,
  TextField,
  Toolbar,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DevicesIcon from "@mui/icons-material/Devices";
import LocationOnIcon from "@mui/icons-material/LocationOn";
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
}) => {
  const { traccarUser, url } = useAppContext();
  const [message, setMessage] = React.useState("");
  const [selectedImages, setSelectedImages] = React.useState([]);

  const handleAssignTasks = async () => {
    const selectedItems = slicedFilteredData.filter((item) =>
      selectedRows.includes(item["device.id"])
    );

    const tasks = selectedItems.map((item) => ({
      user_id: traccarUser.id,
      device_id: item["device.id"],
      device_name: item["device.name"],
      address: value.description,
      place_id: value.place_id,
      message: message,
      pictures: selectedImages,
      lat: lat,
      lng: lng,
    }));

    try {
      const formDataArray = tasks.map((task) => {
        const formData = new FormData();
        formData.append("user_id", task.user_id);
        formData.append("device_id", task.device_id);
        formData.append("address", task.address);
        formData.append("place_id", task.place_id);
        formData.append("lat", task.lat);
        formData.append("lng", task.lng);
        formData.append("message", task.message);
        Array.from(task.pictures).forEach((file, index) => {
          formData.append("pictures", file);
        });
        return { formData, device_name: task.device_name };
      });

      const responses = await Promise.all(
        formDataArray.map(({ formData, device_name }) =>
          axios
            .post(`${url}/dispatch/tasks`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            })
            .then((response) => {
              if (response.data.status) {
                toast.success(
                  `Task created successfully for device: ${device_name}`
                );
              } else {
                toast.error(`Error creating task for device: ${device_name}`);
              }
            })
            .catch((error) => {
              console.error("An error occurred while creating tasks:", error);
              toast.error(
                `An error occurred while creating task for device: ${device_name}`
              );
            })
        )
      );

      setOpenAssignModal(false);
      setSelectedRows([]);
    } catch (error) {
      console.error("An error occurred while creating tasks:", error);
      toast.error("An error occurred while creating tasks.");
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
          <Button
            autoFocus
            onClick={handleAssignTasks}
            variant="outlined"
            fullWidth
            style={{ maxWidth: "320px", color: "white", borderColor: "white" }}
          >
            Assign Tasks
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Devices
          </Typography>
          <List>
            {assignedDevices
              .filter((item) => selectedRows.includes(item["deviceId"]))
              .map((item) => (
                <ListItem key={item["deviceId"]}>
                  <ListItemIcon>
                    <DevicesIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      item.attributes?.["device.name"] ?? item["deviceId"]
                    }
                  />
                </ListItem>
              ))}
          </List>
        </Paper>

        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Address
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocationOnIcon color="primary" />
            <Typography variant="body1">{value?.description}</Typography>
          </Box>
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
