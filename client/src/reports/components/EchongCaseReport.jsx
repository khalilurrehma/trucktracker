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
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
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

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%", // wide modal
  maxHeight: "80vh",
  overflowY: "auto",
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

const normalizeCategory = (category) => category.replace(/\s+/g, " ").trim();

const isValidUrl = (url) => {
  try {
    // Basic check: starts with http or https
    return typeof url === "string" && /^https?:\/\//i.test(url.trim());
  } catch {
    return false;
  }
};

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

  const [ocrOpen, setOcrOpen] = useState(false);

  const handleOpenOcr = () => setOcrOpen(true);
  const handleCloseOcr = () => setOcrOpen(false);

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
                const categories = [
                  `${index} Client Vehicle`,
                  `${index} Client Document`,
                  `${index} Additional Information`,
                ];

                const typeOrder = {
                  Front: 1,
                  Back: 2,
                  Photo: 3,
                  SideRight: 3,
                  SideLeft: 4,
                  Other: 5,
                  Damage: 6,
                };

                const getTypeOrder = (type) => {
                  if (type.startsWith("Other")) return typeOrder.Other;
                  if (type === "Photo") return typeOrder.SideRight;
                  return typeOrder[type] || 99;
                };

                return (
                  <Paper key={vehicle.vehicle_id} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Vehicle {index + 1}: {vehicle.plate_number}
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Photos/Documents
                    </Typography>
                    {vehicle.photos && vehicle.photos.length > 0 ? (
                      <>
                        {categories.map((category) => {
                          const categoryPhotos = vehicle.photos
                            .filter(
                              (photo) =>
                                normalizeCategory(photo.category) ===
                                normalizeCategory(category)
                            )
                            .sort(
                              (a, b) =>
                                getTypeOrder(a.type) - getTypeOrder(b.type)
                            );

                          // console.log(categoryPhotos);
                          return categoryPhotos.length > 0 ? (
                            <Box key={category} sx={{ mb: 2 }}>
                              <Typography variant="subtitle1" gutterBottom>
                                <strong>
                                  {category.replace(/^\d+\s*/, "")}
                                </strong>
                              </Typography>
                              <Grid container spacing={2}>
                                {categoryPhotos.length > 0 ? (
                                  <Box key={category} sx={{ mb: 2 }}>
                                    <Typography
                                      variant="subtitle1"
                                      gutterBottom
                                    >
                                      <strong>
                                        {category.replace(/^\d+\s*/, "")}
                                      </strong>
                                    </Typography>

                                    {/* URL Photos as Cards in Grid */}
                                    <Grid container spacing={2}>
                                      {categoryPhotos
                                        .filter(
                                          (photo) =>
                                            typeof photo.url === "string" &&
                                            /^https?:\/\//i.test(
                                              photo.url.trim()
                                            )
                                        )
                                        .map((photo, photoIndex) => {
                                          const displayType =
                                            photo.type === "Photo"
                                              ? "SideRight"
                                              : photo.type;

                                          return (
                                            <Grid
                                              item
                                              xs={12}
                                              sm={6}
                                              md={4}
                                              key={photo.photo_id || photoIndex}
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
                                                  alt={displayType}
                                                  loading="lazy"
                                                  sx={{ objectFit: "cover" }}
                                                  onError={(e) => {
                                                    e.target.src =
                                                      "https://via.placeholder.com/140?text=Image+Not+Found";
                                                  }}
                                                />
                                                <CardContent>
                                                  <Typography variant="body2">
                                                    <strong>Type:</strong>{" "}
                                                    {displayType}
                                                  </Typography>
                                                  <Typography variant="body2">
                                                    <strong>Uploaded:</strong>{" "}
                                                    {photo.created_at
                                                      ? formatDate(
                                                          photo.created_at
                                                        )
                                                      : "N/A"}
                                                  </Typography>
                                                </CardContent>
                                              </Card>
                                            </Grid>
                                          );
                                        })}
                                    </Grid>

                                    {/* Non-URL entries as plain text below grid */}
                                    {categoryPhotos
                                      .filter(
                                        (photo) =>
                                          !photo.url ||
                                          !/^https?:\/\//i.test(
                                            photo.url.trim()
                                          )
                                      )
                                      .map((photo, i) => (
                                        <Box
                                          key={`text-${i}`}
                                          sx={{
                                            mt: 1,
                                            px: 1.5,
                                            py: 1,
                                            mx: 2,
                                            bgcolor: "#f7f7f7",
                                            borderRadius: 1,
                                            border: "1px solid #eee",
                                          }}
                                        >
                                          <Typography
                                            variant="body1"
                                            sx={{ color: "#333" }}
                                          >
                                            <strong>
                                              Additional Information:
                                            </strong>{" "}
                                            {photo.url}
                                          </Typography>
                                        </Box>
                                      ))}
                                  </Box>
                                ) : null}
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

            {report?.meta_data && report?.meta_data.length > 0 && (
              <>
                <Typography variant="h5" gutterBottom>
                  OCR Metadata
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOpenOcr}
                  sx={{ mb: 2 }}
                >
                  View OCR Data
                </Button>

                <Modal open={ocrOpen} onClose={handleCloseOcr}>
                  <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom>
                      OCR Metadata Table
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: "5%" }}>#</TableCell>
                            <TableCell sx={{ width: "10%" }}>
                              Plate Number
                            </TableCell>
                            <TableCell sx={{ width: "28%" }}>
                              Vehicle Card (Front Text)
                            </TableCell>
                            <TableCell sx={{ width: "28%" }}>
                              Driver License (Front Text)
                            </TableCell>
                            <TableCell sx={{ width: "29%" }}>
                              Driver License (Back Text)
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {report.meta_data.map((meta, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{meta.plateNumber || "N/A"}</TableCell>
                              <TableCell
                                style={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {meta.vehicle_card?.front_text || "N/A"}
                              </TableCell>
                              <TableCell
                                style={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {meta.driver_license?.front_text || "N/A"}
                              </TableCell>
                              <TableCell
                                style={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {meta.driver_license?.back_text || "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ textAlign: "right", mt: 2 }}>
                      <Button variant="contained" onClick={handleCloseOcr}>
                        Close
                      </Button>
                    </Box>
                  </Box>
                </Modal>
              </>
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
