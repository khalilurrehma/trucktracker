import * as React from "react";
import {
  AppBar,
  Button,
  Dialog,
  IconButton,
  Typography,
  Toolbar,
  Paper,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Divider,
  Modal,
  Fab,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../../AppContext";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const EchongCaseReport = ({
  setOpenAssignModal,
  caseDetails,
  report,
  setReport,
}) => {
  const { url } = useAppContext();
  const reportRef = useRef(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [authorizeLoader, setAuthorizeLoader] = useState(false);

  const handleDownloadPDF = async () => {
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`case_report_${caseDetails.id}.pdf`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleImageClick = (photo, photos, index) => {
    setSelectedImage(photo);
    setSelectedPhotos(photos);
    setCurrentIndex(index);
    setZoomOpen(true);
  };

  const handleZoomClose = () => {
    setZoomOpen(false);
    setSelectedImage(null);
    setSelectedPhotos([]);
    setCurrentIndex(0);
  };

  const handlePrevImage = () => {
    const newIndex =
      currentIndex > 0 ? currentIndex - 1 : selectedPhotos.length - 1;
    setCurrentIndex(newIndex);
    setSelectedImage(selectedPhotos[newIndex]);
  };

  const handleNextImage = () => {
    const newIndex =
      currentIndex < selectedPhotos.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    setSelectedImage(selectedPhotos[newIndex]);
  };

  const handleAuthorizeReport = async (report) => {
    setAuthorizeLoader(true);
    try {
      const { data } = await axios.post(
        `${url}/dispatch/case/report/authorize/${report.report_id}/${report.driver_id}`
      );
      if (data.status) {
        setAuthorizeLoader(false);
        toast.success(data.message || "Report authorized successfully");
        setReport((prev) => ({ ...prev, authorized_status: 1 }));
      } else {
        toast.error(data.message || "Failed to authorize report");
      }
    } catch (error) {
      toast.error("Error authorizing report: " + error.message);
    }
  };

  return (
    <Box>
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
            Report for Case: {caseDetails.name} (ID: {caseDetails.id})
          </Typography>
          {report && (
            <Button color="inherit" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
          )}
          {report && report.authorized_status == 0 && (
            <Button
              color="info"
              variant="contained"
              onClick={() => handleAuthorizeReport(report)}
              sx={{ ml: 2 }}
            >
              {authorizeLoader ? "Authorizing..." : "Authorize Report"}
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }} ref={reportRef}>
        {report === null ? (
          <Typography>Loading report...</Typography>
        ) : report === "empty" ? (
          <Typography color="text.secondary">
            🚫 Case report has not been received yet.
          </Typography>
        ) : (
          <>
            <Typography variant="h5" gutterBottom>
              Case Report Details
            </Typography>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">
                    <strong>Case ID:</strong> {report.case_id}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Driver ID:</strong> {report.driver_id}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Suggested Services:</strong>{" "}
                    {report.suggested_services || "N/A"}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Subservices:</strong> {report.subservices || "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">
                    <strong>Additional Information:</strong>{" "}
                    {report.additional_information || "N/A"}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Created:</strong>{" "}
                    {formatDate(report.report_created_at)}
                  </Typography>
                </Grid>
                {report.damage && report.meta_information && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2, borderBottomWidth: 2 }} />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle1">
                    <strong>Damage:</strong> {report.damage || "Not specified"}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Meta Information: </strong>
                    {report.meta_information || "Not specified"}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Typography variant="h5" gutterBottom>
              Involved Vehicles
            </Typography>
            {report.vehicles && report.vehicles.length > 0 ? (
              report.vehicles.map((vehicle, index) => {
                // console.log(vehicle);

                return (
                  <Paper key={vehicle.vehicle_id} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Vehicle {index + 1}: {vehicle.plate_number}
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>Vehicle ID:</strong> {vehicle.vehicle_id}
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>Created:</strong> {formatDate(vehicle.created_at)}
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Photos/Documents
                    </Typography>
                    {vehicle.photos && vehicle.photos.length > 0 ? (
                      <>
                        {[
                          "Client Vehicle",
                          "Client Document",
                          "Additional Information",
                        ].map((category) => {
                          const categoryPhotos = vehicle.photos.filter(
                            (photo) => photo.category === category
                          );
                          return categoryPhotos.length > 0 ? (
                            <Box key={category} sx={{ mb: 2 }}>
                              <Typography variant="subtitle1" gutterBottom>
                                <strong>{category}</strong>
                              </Typography>
                              <Grid container spacing={2}>
                                {categoryPhotos.map((photo, photoIndex) => {
                                  // console.log(photo);

                                  return (
                                    <Grid
                                      item
                                      xs={12}
                                      sm={6}
                                      md={4}
                                      key={photo.photo_id}
                                    >
                                      <Card
                                        sx={{ cursor: "pointer" }}
                                        onClick={() =>
                                          handleImageClick(
                                            photo,
                                            categoryPhotos,
                                            photoIndex
                                          )
                                        }
                                      >
                                        <CardMedia
                                          component="img"
                                          height="140"
                                          image={photo.url}
                                          alt={photo.type}
                                          loading="lazy"
                                          sx={{ objectFit: "cover" }}
                                          onError={(e) => {
                                            e.target.src =
                                              "https://via.placeholder.com/140?text=Image+Not+Found";
                                          }}
                                        />
                                        <CardContent>
                                          <Typography variant="body2">
                                            <strong>Type:</strong> {photo.type}
                                          </Typography>
                                          <Typography variant="body2">
                                            <strong>Uploaded:</strong>{" "}
                                            {formatDate(photo.created_at)}
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </Box>
                          ) : null;
                        })}
                      </>
                    ) : (
                      <Typography>
                        No photos available for this vehicle.
                      </Typography>
                    )}
                  </Paper>
                );
              })
            ) : (
              <Typography>No vehicles associated with this report.</Typography>
            )}
          </>
        )}
      </Box>

      <Modal
        open={zoomOpen}
        onClose={handleZoomClose}
        aria-labelledby="image-zoom-modal"
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Box
          sx={{
            position: "relative",
            maxWidth: "90vw",
            maxHeight: "90vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {selectedImage && (
            <>
              <img
                src={selectedImage.url}
                alt={selectedImage.type}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/800x600?text=Image+Not+Found";
                }}
              />
              <Typography variant="subtitle1" sx={{ mt: 1 }}>
                {selectedImage.type} ({selectedImage.category})
              </Typography>
              <Typography variant="body2">
                Uploaded: {formatDate(selectedImage.created_at)}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                <Fab
                  color="primary"
                  onClick={handlePrevImage}
                  disabled={selectedPhotos.length <= 1}
                >
                  <ArrowBackIcon />
                </Fab>
                <Fab
                  color="primary"
                  onClick={handleNextImage}
                  disabled={selectedPhotos.length <= 1}
                >
                  <ArrowForwardIcon />
                </Fab>
                <Fab color="secondary" onClick={handleZoomClose}>
                  <CloseIcon />
                </Fab>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default EchongCaseReport;
