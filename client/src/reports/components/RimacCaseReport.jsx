import React, { useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Grid,
  Paper,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Modal,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import html2pdf from "html2pdf.js";
import chongLogo from "../../resources/images/chong_logo1.png";
import { useAppContext } from "../../AppContext";
import { useTheme } from "@mui/material";
import dayjs from "dayjs";
import {
  fullWidthFields,
  rimacFormSections,
  textAreaFields,
} from "../../common/util/rimacValidFields";

const RimacCaseReport = ({
  setOpenAssignModal,
  caseDetails,
  report,
  setReport,
}) => {
  const parsedReport = JSON.parse(report.rimacReport.report_data);

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const reportRef = useRef();
  const { url } = useAppContext();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [PDFLoader, setPDFLoader] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [authorizeLoader, setAuthorizeLoader] = useState(false);

  const waitForImagesToLoad = (element) => {
    const images = element.querySelectorAll("img");
    const promises = [];

    images.forEach((img) => {
      if (!img.complete || img.naturalHeight === 0) {
        promises.push(
          new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
        );
      }
    });

    return Promise.all(promises);
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    setPDFLoader(true);

    try {
      const element = reportRef.current;
      await waitForImagesToLoad(element);

      const opt = {
        margin: 0.3,
        filename: `rimac-case-report-${parsedReport.Informe}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPDFLoader(false);
    }
  };

  const toSafeString = (value) => {
    if (typeof value === "object" && value !== null) {
      return "-";
    }
    return value ? String(value).trim() : "-";
  };

  const toSafeDate = (value, format = "YYYY-MM-DD") => {
    if (!value || typeof value !== "string") {
      return "Invalid Date";
    }

    const date = dayjs(value, "YYYYMMDD", true);

    return date.isValid() ? date.format(format) : "Invalid Date";
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
    <>
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
            Report for Case: {caseDetails?.name} (ID: {caseDetails?.id})
          </Typography>
          {report && (
            <Button color="inherit" onClick={handleDownloadPDF}>
              Descargar PDF
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
      <Box
        ref={reportRef}
        sx={{ p: 3, backgroundColor: isDark ? "#2e2e2e" : "#F5F5F5" }}
      >
        <Box sx={{ p: 4, maxWidth: 1000, mx: "auto" }}>
          {/* Header */}
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <img src={chongLogo} alt="Chong Logo" style={{ height: 100 }} />
            </Grid>
            <Grid item>
              {/* <Typography variant="body2">
                Fecha y Hora: 20/06/2025 10:26:01
              </Typography> */}
            </Grid>
          </Grid>

          <Typography
            variant="h6"
            align="center"
            gutterBottom
            sx={{ mt: 2, fontWeight: "bold" }}
          >
            REGISTRO DE SERVICIO SPEED AMPLIADO
          </Typography>

          {/* Case Info */}
          <Paper
            sx={{ p: 2, my: 2, backgroundColor: isDark && "#3b3b3b" }}
            variant="outlined"
          >
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>
                  <strong>Nro. de Informe:</strong>{" "}
                  {toSafeString(parsedReport.Informe)}
                </Typography>
                <Typography>
                  <strong>Fecha Siniestro:</strong>{" "}
                  {toSafeDate(parsedReport.FecOcurr)}
                </Typography>
                <Typography>
                  <strong>Fecha Solicitud:</strong>{" "}
                  {parsedReport.FechaCobertura}
                </Typography>
                <Typography>
                  <strong>Fecha Atención:</strong>{" "}
                  {toSafeDate(parsedReport.FecEnvio)}
                </Typography>
                <Typography>
                  <strong>Tipo Siniestro:</strong>{" "}
                  {toSafeString(parsedReport.Ejecutivo)}
                </Typography>
                <Typography>
                  <strong>Placa:</strong> {parsedReport.NroPlaca}
                </Typography>
                <Typography>
                  <strong>Ejecutivo:</strong>{" "}
                  {toSafeString(parsedReport.Ejecutivo)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>Nro. de Siniestro:</strong>{" "}
                  {toSafeString(parsedReport.Ejecutivo)}
                </Typography>
                <Typography>
                  <strong>Hora Siniestro:</strong> {parsedReport.HorOcurr}
                </Typography>
                <Typography>
                  <strong>Hora Solicitud:</strong> {parsedReport.HorEnvio}
                </Typography>
                <Typography>
                  <strong>Departamento:</strong> {parsedReport.Dpto}
                </Typography>
                <Typography>
                  <strong>Asegurado:</strong>{" "}
                  {`${toSafeString(parsedReport.NomCond)} ${toSafeString(
                    parsedReport.ApPatTit
                  )} ${toSafeString(parsedReport.ApMatTit)}`.trim() || "N/A"}
                </Typography>
                <Typography>
                  <strong>Comisaria:</strong>{" "}
                  {toSafeString(parsedReport.Ejecutivo)}
                </Typography>
                <Typography>
                  <strong>Analista:</strong>{" "}
                  {toSafeString(parsedReport.Ejecutivo)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Vehículos Involucrados */}
          <Typography variant="h6" gutterBottom>
            VEHICULOS INVOLUCRADOS
          </Typography>
          <Table
            size="small"
            sx={{ mb: 3 }}
            aria-label="vehiculos involucrados"
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Vehículo</strong>
                </TableCell>
                <TableCell>
                  <strong>Marca modelo</strong>
                </TableCell>
                <TableCell>
                  <strong>Color</strong>
                </TableCell>
                <TableCell>
                  <strong>Placa</strong>
                </TableCell>
                <TableCell>
                  <strong>Año</strong>
                </TableCell>
                <TableCell>
                  <strong>Cía. Seguros</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{toSafeString(parsedReport.Marca)}</TableCell>
                <TableCell>
                  {`${toSafeString(parsedReport.Marca)} / ${toSafeString(
                    parsedReport.Modelo
                  )}`.trim() || "N/A"}
                </TableCell>
                <TableCell>{toSafeString(parsedReport.Color)}</TableCell>
                <TableCell>{toSafeString(parsedReport.NroPlaca)}</TableCell>
                <TableCell>{toSafeString(parsedReport.AnioVehic)}</TableCell>
                <TableCell>{toSafeString(parsedReport.Motor)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Apreciación Etílica */}
          <Typography variant="h6" gutterBottom>
            APRECIACIÓN ETÍLICA
          </Typography>
          <Table size="small" sx={{ mb: 3 }} aria-label="apreciacion etilica">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Apellidos y Nombres</strong>
                </TableCell>
                <TableCell>
                  <strong>Vehículo/Tercero</strong>
                </TableCell>
                <TableCell>
                  <strong>Edad</strong>
                </TableCell>
                <TableCell>
                  <strong>Resultado</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  {`${toSafeString(parsedReport.NomCond)} ${toSafeString(
                    parsedReport.ApPatTit
                  )} ${toSafeString(parsedReport.ApMatTit)}`.trim() || "N/A"}
                </TableCell>
                <TableCell>{toSafeString(parsedReport.Marca)}</TableCell>
                <TableCell>{toSafeString(parsedReport.Ejecutivo)}</TableCell>
                <TableCell>{toSafeString(parsedReport.Ejecutivo)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Licencia de Conducir */}
          <Typography variant="h6" gutterBottom>
            LICENCIA DE CONDUCIR
          </Typography>
          <Table size="small" sx={{ mb: 3 }} aria-label="licencia conducir">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Conductor</strong>
                </TableCell>
                <TableCell>
                  <strong>Nro. de Licencia</strong>
                </TableCell>
                <TableCell>
                  <strong>Categoria</strong>
                </TableCell>
                <TableCell>
                  <strong>Fecha Exp.</strong>
                </TableCell>
                <TableCell>
                  <strong>Fecha Reval.</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{toSafeString(parsedReport.Ejecutivo)}</TableCell>
                <TableCell>{toSafeString(parsedReport.Ejecutivo)}</TableCell>
                <TableCell>{toSafeString(parsedReport.Ejecutivo)}</TableCell>
                <TableCell>{toSafeString(parsedReport.Ejecutivo)}</TableCell>
                <TableCell>{toSafeString(parsedReport.Ejecutivo)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Daños */}
          <Typography variant="h6" gutterBottom>
            DAÑOS VEHÍCULO
          </Typography>
          <Paper
            sx={{ p: 2, mb: 3, backgroundColor: isDark && "#3b3b3b" }}
            variant="outlined"
          >
            <Typography>{toSafeString(report?.damage)}</Typography>
          </Paper>

          <Box sx={{ pageBreakBefore: "always" }} />

          {/* NO INSPECCIÓN + RESUMEN */}
          <Typography variant="h6" gutterBottom>
            INSPECCIÓN OCULAR
          </Typography>
          <Paper
            sx={{ p: 2, mb: 3, backgroundColor: isDark && "#3b3b3b" }}
            variant="outlined"
          >
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography>
                  <strong>Nombre:</strong> AV. ENCALADA ALTURA CON AV EL POLO -
                  SANTIAGO DE SURCO
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Tipo Vía:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Calzada:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Cond. Calzada:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Carriles:</strong> —
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Sep. Central:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Orientación:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>F. Vehicular:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Int. Circulación:</strong> —
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Iluminación:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Medio Ambiente:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Visibilidad:</strong> —
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Restricción:</strong> —
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography>
                  <strong>S. Reguladoras:</strong> —
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* S. Transito + others */}
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>S. Transito:</strong> N
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>S. Cámaras:</strong> N
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>S. Testigos:</strong> N
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>N. Testigos:</strong> —
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Bomberos:</strong> N
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Serenazgo:</strong> N
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Ambulancia:</strong> N
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography>
                  <strong>Configuración:</strong> —
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Análisis Integral */}
          <Typography variant="h6" gutterBottom>
            ANÁLISIS INTEGRAL DE LOS HECHOS
          </Typography>
          <Paper
            sx={{ p: 2, backgroundColor: isDark && "#3b3b3b" }}
            variant="outlined"
          >
            <Typography paragraph>
              {report?.additional_information || "—"}
            </Typography>
          </Paper>
          <Box sx={{ pageBreakBefore: "always", mt: 3 }} />

          {report?.rimac_form_data && (
            <Box>
              <Typography variant="h4" gutterBottom>
                Formularios Asesor Express
              </Typography>

              <Paper
                sx={{ mb: 3, backgroundColor: isDark && "#3b3b3b" }}
                variant="outlined"
              >
                {rimacFormSections.map((section) => (
                  <Box key={section.sectionKey} sx={{ p: 2 }}>
                    <Box bgcolor="error.main" color="white" p={1} mb={2}>
                      <Typography variant="h6" gutterBottom>
                        {section.title}
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      {section.fields.map((field) => {
                        let isFullWidth = fullWidthFields.includes(field.name);
                        let isTextArea = textAreaFields.includes(field.name);

                        return (
                          <Grid
                            item
                            xs={12}
                            sm={isFullWidth || isTextArea ? 12 : 6}
                            key={field}
                          >
                            <TextField
                              label={field.placeholder}
                              value={report.rimac_form_data?.[field.name] ?? ""}
                              fullWidth
                              size="small"
                              multiline={isTextArea}
                              minRows={isTextArea ? 5 : undefined}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                ))}
              </Paper>
            </Box>
          )}

          <Typography variant="h6" gutterBottom>
            DETALLES ADICIONALES DEL INFORME
          </Typography>
          <Paper
            sx={{ p: 2, mb: 3, backgroundColor: isDark && "#3b3b3b" }}
            variant="outlined"
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography>
                  <strong>Suggested Services:</strong>{" "}
                  {report?.suggested_services || "—"}
                </Typography>
                <Typography>
                  <strong>Subservices:</strong> {report?.subservices || "—"}
                </Typography>
                <Typography>
                  <strong>Created At:</strong>{" "}
                  {new Date(report?.report_created_at).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>
                  <strong>Additional Info:</strong>{" "}
                  {report?.additional_information || "—"}
                </Typography>
                <Typography>
                  <strong>Damage:</strong> {report?.damage || "—"}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="h6" gutterBottom>
            FOTOGRAFÍAS DEL VEHÍCULO
          </Typography>

          {report?.vehicles &&
            Array.isArray(report.vehicles) &&
            report.vehicles.length > 0 &&
            report.vehicles.map((vehicle, vIndex) => {
              const photos = Array.isArray(vehicle.photos)
                ? vehicle.photos
                : [];

              const renderCategoryPhotos = (categoryTitle, categoryName) => {
                const filtered = photos.filter(
                  (p) => p.category === categoryName
                );
                if (filtered.length === 0) return null;

                return (
                  <Box key={categoryName} sx={{ mb: 3, breakInside: "avoid" }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      <strong>{categoryTitle}</strong>
                    </Typography>

                    <Grid container spacing={2}>
                      {filtered.map((photo) => (
                        <Grid item xs={12} sm={6} md={4} key={photo.photo_id}>
                          <Paper variant="outlined" sx={{ p: 1 }}>
                            <img
                              src={photo.url}
                              alt={photo.type}
                              style={{
                                width: "100%",
                                height: 240,
                                objectFit: "contain",
                                borderRadius: 6,
                                backgroundColor: "#f5f5f5",
                              }}
                              crossOrigin="anonymous"
                              onClick={() => {
                                setSelectedImage(photo);
                                setZoomOpen(true);
                              }}
                              onError={(e) => {
                                e.target.src =
                                  "https://via.placeholder.com/140?text=No+Image";
                              }}
                            />
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>{photo.type}</strong>
                              <br />
                              {new Date(photo.created_at).toLocaleString()}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>

                    {categoryName === "Client Document" && (
                      <Box sx={{ pageBreakBefore: "always" }} />
                    )}
                  </Box>
                );
              };

              return (
                <Box key={vehicle.vehicle_id}>
                  <Typography variant="h6" gutterBottom>
                    Vehículo #{vIndex + 1}
                  </Typography>
                  {renderCategoryPhotos(
                    "Documentos del Cliente",
                    "Client Document"
                  )}
                  {renderCategoryPhotos("Fotos del Vehículo", "Client Vehicle")}
                  {renderCategoryPhotos(
                    "Información Adicional",
                    "Additional Information"
                  )}
                </Box>
              );
            })}
        </Box>
        <Modal
          open={zoomOpen}
          onClose={() => {
            setZoomOpen(false);
            setSelectedImage(null);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              backgroundColor: "#fff",
              p: 2,
              borderRadius: 2,
              boxShadow: 24,
              textAlign: "center",
            }}
          >
            {selectedImage && (
              <>
                <img
                  src={selectedImage.url}
                  alt={selectedImage.type}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "75vh",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/800x600?text=Image+Not+Found";
                  }}
                />
                <Typography
                  variant="subtitle1"
                  sx={{ mt: 1, color: isDark && "black" }}
                >
                  {selectedImage.type} ({selectedImage.category})
                </Typography>
                <Typography variant="body2" sx={{ color: isDark && "black" }}>
                  Uploaded:{" "}
                  {new Date(selectedImage.created_at).toLocaleString()}
                </Typography>
              </>
            )}
          </Box>
        </Modal>
        <Modal
          open={PDFLoader}
          onClose={() => {}}
          aria-labelledby="pdf-loader-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(3px)",
          }}
        >
          <Box
            sx={{
              backgroundColor: "#fff",
              p: 4,
              borderRadius: 2,
              boxShadow: 24,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography id="pdf-loader-title" variant="body1">
              Generating PDF, please wait...
            </Typography>
          </Box>
        </Modal>
      </Box>
    </>
  );
};

export default RimacCaseReport;
