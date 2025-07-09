import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Divider,
  Button,
  Paper,
  Modal,
  CircularProgress,
  useTheme,
} from "@mui/material";
import ForwardIcon from "@mui/icons-material/Forward";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import { useAppContext } from "../AppContext";
import { useLocation, useParams } from "react-router-dom";
import axios from "axios";
import DispatchReportViewer from "./components/DispatchReportViewer";
import { toast, ToastContainer } from "react-toastify";
import html2pdf from "html2pdf.js";

const RimacFinalReportView = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const reportRef = useRef();
  const { id, caseId } = useParams();
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const { url } = useAppContext();
  const [report, setReport] = useState(null);
  const [detailedReport, setDetailedReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendLoader, setSendLoader] = useState(false);
  const [hideButton, setHideButton] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [originalReport, setOriginalReport] = useState(null);

  let disableEdit = query.get("disable_edit") === "true";

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${url}/rimac/case/report/${id}`);
      if (data.status) {
        const parsedReportData = JSON.parse(data.message.rimac.report_data);
        const reportData = {
          ...parsedReportData,
          dispatch: data.message.dispatch || {},
        };
        setReport(reportData);
        setOriginalReport(reportData);
        setDetailedReport(data.message);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && caseId) {
      fetchReport();
    }
  }, [id, caseId]);

  const handleFieldChange = (key, value) => {
    setReport((prev) => {
      const updated = { ...prev, [key]: value };
      setIsModified(JSON.stringify(updated) !== JSON.stringify(originalReport));
      return updated;
    });
  };

  const handleSaveChanges = async () => {
    try {
      const response = await axios.put(`${url}/rimac/case/report/${id}`, {
        report_data: JSON.stringify(report),
      });
      if (response.data.status) {
        toast.success("Changes saved successfully!");
        setOriginalReport(report);
        setIsModified(false);
        await fetchReport(); // Refresh the report to ensure consistency
      } else {
        toast.error("Failed to save changes.");
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Error saving changes.");
    }
  };

  const getValue = (key) => {
    const val = report && report[key];
    if (
      !val ||
      (typeof val === "object" &&
        !Array.isArray(val) &&
        Object.keys(val).length === 0) ||
      (Array.isArray(val) && val.length === 0)
    ) {
      return "";
    }
    if (typeof val === "object" || Array.isArray(val)) {
      return "";
    }
    return val;
  };

  if (loading) {
    return (
      <PageLayout
        menu={<OperationsMenu />}
        breadcrumbs2={["Operations", "Report View"]}
      >
        <Box sx={{ p: 3 }}>Loading...</Box>
      </PageLayout>
    );
  }

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

  const generatePdfBlob = async (element, filename) => {
    await waitForImagesToLoad(element);

    const opt = {
      margin: 0.3,
      filename: filename || `rimac-case-report-${Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    return html2pdf().set(opt).from(element).outputPdf("blob");
  };

  const handleClickSend = async () => {
    if (!detailedReport) {
      toast.error("No report loaded!");
      return;
    }
    setSendLoader(true);

    let pdfUrl = "";
    try {
      if (!reportRef.current) {
        toast.error("Report element not found for PDF generation.");
        return;
      }
      const element = reportRef.current;
      const filename = `rimac-case-report-${Date.now()}.pdf`;

      await waitForImagesToLoad(element);

      const pdfBlob = await generatePdfBlob(element, filename);

      const formData = new FormData();
      formData.append("image", pdfBlob, filename);

      const { data: uploadRes } = await axios.post(
        `${url}/upload/photo`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (uploadRes.status && uploadRes.url) {
        toast.success("PDF uploaded successfully!");
        pdfUrl = uploadRes.url;
      } else {
        toast.error("PDF upload failed");
        return;
      }
    } catch (err) {
      console.error("PDF generation/upload failed:", err);
      toast.error("PDF generation/upload failed!");
      return;
    }

    try {
      const { data } = await axios.post(
        `${url}/dispatch/send/report-to-rimac?rimac_report_caseId=${caseId}`,
        {
          report: {
            ...detailedReport.dispatch,
            pdfUrl,
          },
          rimacReport: detailedReport.rimac,
        }
      );

      const rimac = data.rimac || data;

      if (rimac.successful) {
        setHideButton(true);
        toast.success(rimac.mensaje || "Report sent successfully to Rimac!");
        if (rimac.errores && rimac.errores.length > 0) {
          toast.warn("Some warnings: " + rimac.errores.join(", "));
        }
      } else {
        toast.error(
          rimac.mensaje || "Report sent, but Rimac API did not confirm success."
        );
        if (rimac.errores && rimac.errores.length > 0) {
          toast.error("Errors: " + rimac.errores.join(", "));
        }
      }
    } catch (error) {
      let errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Unexpected error submitting report.";
      if (error?.response?.data?.error) {
        errorMsg += ` (${JSON.stringify(error.response.data.error)})`;
      }
      toast.error(errorMsg);
    } finally {
      setSendLoader(false);
    }
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Report View"]}
    >
      <ToastContainer />
      <Box p={2} ref={reportRef}>
        <Box
          bgcolor="error.main"
          color="white"
          p={1}
          mb={2}
          sx={{ display: "flex", justifyContent: "space-between" }}
        >
          <Typography variant="h6">
            INFORME - SERVICIO SPEED AMPLIADO
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {isModified && (
              <Button
                variant="contained"
                sx={{
                  bgcolor: "success.main",
                  color: "white",
                  "&:hover": { bgcolor: "success.dark" },
                }}
                // endIcon={<SaveIcon />}
                onClick={handleSaveChanges}
              >
                Save Changes
              </Button>
            )}
            {detailedReport?.rimac?.status !== "sent_to_rimac" &&
              !hideButton && (
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "error.main",
                    color: "white",
                    "&:hover": { bgcolor: "error.dark" },
                  }}
                  endIcon={<ForwardIcon />}
                  onClick={handleClickSend}
                  disabled={isModified}
                >
                  Send to Rimac
                </Button>
              )}
          </Box>
        </Box>

        <Box>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <TextField
                label="Fecha Servicio"
                value={getValue("FecOcurr")}
                onChange={(e) => handleFieldChange("FecOcurr", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Hora de llegada"
                value={getValue("HorOcurr")}
                onChange={(e) => handleFieldChange("HorOcurr", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Hora de salida"
                value={getValue("HorEnvio")}
                onChange={(e) => handleFieldChange("HorEnvio", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Lugar del Accidente"
                value={getValue("DirSin")}
                onChange={(e) => handleFieldChange("DirSin", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Departamento"
                value={getValue("Dpto")}
                onChange={(e) => handleFieldChange("Dpto", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Provincia"
                value={getValue("Prov")}
                onChange={(e) => handleFieldChange("Prov", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Distrito"
                value={getValue("Dist")}
                onChange={(e) => handleFieldChange("Dist", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Señal Telefónica"
                value={getValue("TelfCont")}
                onChange={(e) => handleFieldChange("TelfCont", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            DATOS DE CONTACTO
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <TextField
                label="Fecha"
                value={getValue("FecEnvio")}
                onChange={(e) => handleFieldChange("FecEnvio", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Tipo de Servicio"
                value={getValue("CodProd")}
                onChange={(e) => handleFieldChange("CodProd", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Hora de solicitud"
                value={getValue("HorLlamada")}
                onChange={(e) =>
                  handleFieldChange("HorLlamada", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Hora de atención"
                value={getValue("HorEnvio")}
                onChange={(e) => handleFieldChange("HorEnvio", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Domicilio"
                value={getValue("DirSin")}
                onChange={(e) => handleFieldChange("DirSin", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Documento Nro"
                value={getValue("ContactoNroDoc")}
                onChange={(e) =>
                  handleFieldChange("ContactoNroDoc", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Tipo Documento"
                value={getValue("ContactoTipoDoc")}
                onChange={(e) =>
                  handleFieldChange("ContactoTipoDoc", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Asegurado"
                value={getValue("NomTit")}
                onChange={(e) => handleFieldChange("NomTit", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Nombre del Asegurado"
                value={getValue("NomTit")}
                onChange={(e) => handleFieldChange("NomTit", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Teléfono"
                value={getValue("TelfCont")}
                onChange={(e) => handleFieldChange("TelfCont", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Nombre de Contacto"
                value={getValue("NomCont")}
                onChange={(e) => handleFieldChange("NomCont", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Teléfono Contacto"
                value={getValue("TelfCont")}
                onChange={(e) => handleFieldChange("TelfCont", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Referencia"
                value={getValue("RefSin")}
                onChange={(e) => handleFieldChange("RefSin", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Departamento"
                value={getValue("Dpto")}
                onChange={(e) => handleFieldChange("Dpto", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Provincia"
                value={getValue("Prov")}
                onChange={(e) => handleFieldChange("Prov", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Distrito"
                value={getValue("Dist")}
                onChange={(e) => handleFieldChange("Dist", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="TIPO DE ASESORÍA"
                value={getValue("NomProd")}
                onChange={(e) => handleFieldChange("NomProd", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="TIPO DE SINIESTRO"
                value={getValue("DescEnvio")}
                onChange={(e) => handleFieldChange("DescEnvio", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="CRITICIDAD DEL SNTRO"
                value={getValue("ConfiandoPalabra")}
                onChange={(e) =>
                  handleFieldChange("ConfiandoPalabra", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            CASOS DE DENUNCIA POLICIAL
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="DEPENDENCIA POLICIAL"
                value={getValue("DependenciaPolicial")}
                onChange={(e) =>
                  handleFieldChange("DependenciaPolicial", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="DENUNCIA POLICIAL/LIBRO DE OCURRENCIA"
                value={getValue("DenunciaPolicial")}
                onChange={(e) =>
                  handleFieldChange("DenunciaPolicial", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="VEHICULO RETENIDO"
                value={getValue("VehiculoRetenido")}
                onChange={(e) =>
                  handleFieldChange("VehiculoRetenido", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="CONDUCTOR RETENIDO"
                value={getValue("ConductorRetenido")}
                onChange={(e) =>
                  handleFieldChange("ConductorRetenido", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            DATOS DEL VEHÍCULO Y CONDUCTOR ASIGNADO
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={1.4}>
              <TextField
                label="Tipo de vehículo"
                value={getValue("TipVehic")}
                onChange={(e) => handleFieldChange("TipVehic", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="Marca"
                value={getValue("Marca")}
                onChange={(e) => handleFieldChange("Marca", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="Modelo"
                value={getValue("Modelo")}
                onChange={(e) => handleFieldChange("Modelo", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="Color"
                value={getValue("Color")}
                onChange={(e) => handleFieldChange("Color", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="PLACA"
                value={getValue("NroPlaca")}
                onChange={(e) => handleFieldChange("NroPlaca", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="AÑO"
                value={getValue("AnioVehic")}
                onChange={(e) => handleFieldChange("AnioVehic", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="USO VEH"
                value={getValue("UsoVeh")}
                onChange={(e) => handleFieldChange("UsoVeh", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1.6}>
              <TextField
                label="SIST.GAS"
                value={getValue("SistGas")}
                onChange={(e) => handleFieldChange("SistGas", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="NOMBRE DEL CONDUCTOR"
                value={getValue("NomCond")}
                onChange={(e) => handleFieldChange("NomCond", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="APELLIDOS"
                value={getValue("ApPatCond")}
                onChange={(e) => handleFieldChange("ApPatCond", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="DOCUMENTO"
                value={getValue("ConductorTipoDoc")}
                onChange={(e) =>
                  handleFieldChange("ConductorTipoDoc", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="NRO"
                value={getValue("ConductorNroDoc")}
                onChange={(e) =>
                  handleFieldChange("ConductorNroDoc", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                label="EDAD"
                value={getValue("EdadConductor")}
                onChange={(e) =>
                  handleFieldChange("EdadConductor", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1.5}>
              <TextField
                label="NRO CELULAR"
                value={getValue("TelfConductor")}
                onChange={(e) =>
                  handleFieldChange("TelfConductor", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={1}>
              <TextField
                label="PARENTESCO"
                value={getValue("Parentesco")}
                onChange={(e) =>
                  handleFieldChange("Parentesco", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                label="Especificar"
                value={getValue("ParentescoEspecificar")}
                onChange={(e) =>
                  handleFieldChange("ParentescoEspecificar", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={2.5}>
              <TextField
                label="APRECIACION ETILICA"
                value={getValue("ApreciacionEtilica")}
                onChange={(e) =>
                  handleFieldChange("ApreciacionEtilica", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2.5}>
              <TextField
                label="LESIONADOS"
                value={getValue("Lesionados")}
                onChange={(e) =>
                  handleFieldChange("Lesionados", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2.5}>
              <TextField
                label="CANTIDAD"
                value={getValue("CantidadLesionados")}
                onChange={(e) =>
                  handleFieldChange("CantidadLesionados", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={2.2}>
              <TextField
                label="CÍA SEG - SOAT"
                value={getValue("CiaSegSoat")}
                onChange={(e) =>
                  handleFieldChange("CiaSegSoat", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={2}>
              <TextField
                label="TIPO DE LICENCIA"
                value={getValue("TipoLicencia")}
                onChange={(e) =>
                  handleFieldChange("TipoLicencia", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="NRO LICENCIA"
                value={getValue("NroLicencia")}
                onChange={(e) =>
                  handleFieldChange("NroLicencia", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="CATEGORIA"
                value={getValue("CategoriaLicencia")}
                onChange={(e) =>
                  handleFieldChange("CategoriaLicencia", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="VIGENTE"
                value={getValue("LicenciaVigente")}
                onChange={(e) =>
                  handleFieldChange("LicenciaVigente", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="FECHA REVALIDACION"
                value={getValue("FechaRevalidacion")}
                onChange={(e) =>
                  handleFieldChange("FechaRevalidacion", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="RESTRICCIONES"
                value={getValue("RestriccionesLicencia")}
                onChange={(e) =>
                  handleFieldChange("RestriccionesLicencia", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="VEHÍCULO OPERATIVO"
                value={getValue("VehiculoOperativo")}
                onChange={(e) =>
                  handleFieldChange("VehiculoOperativo", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="PROVEEDOR GRÚA"
                value={getValue("ProveedorGrua")}
                onChange={(e) =>
                  handleFieldChange("ProveedorGrua", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="ESPECIFICAR"
                value={getValue("EspecificarGrua")}
                onChange={(e) =>
                  handleFieldChange("EspecificarGrua", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={3.5}>
              <TextField
                label="PLACA"
                value={getValue("PlacaGrua")}
                onChange={(e) => handleFieldChange("PlacaGrua", e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={5}>
              <TextField
                label="CONDUCTOR"
                value={getValue("ConductorGrua")}
                onChange={(e) =>
                  handleFieldChange("ConductorGrua", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3.5}>
              <TextField
                label="TELEFONO"
                value={getValue("TelefonoGrua")}
                onChange={(e) =>
                  handleFieldChange("TelefonoGrua", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            DAÑOS DEL VEHÍCULO ASEGURADO
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Daños"
                value={getValue("DaniosVehiculoAsegurado")}
                onChange={(e) =>
                  handleFieldChange("DaniosVehiculoAsegurado", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            DAÑOS ADICIONALES A EVALUAR POR EL TÉCNICO RIMAC
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <TextField
                label="PREEXISTENCIAS"
                value={getValue("Preexistencias")}
                onChange={(e) =>
                  handleFieldChange("Preexistencias", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="ASUME RESPONSABILIDAD"
                value={getValue("AsumeResponsabilidad")}
                onChange={(e) =>
                  handleFieldChange("AsumeResponsabilidad", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="TALLER ELEGIDO"
                value={getValue("TallerElegido")}
                onChange={(e) =>
                  handleFieldChange("TallerElegido", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Especificar"
                value={getValue("EspecificarTaller")}
                onChange={(e) =>
                  handleFieldChange("EspecificarTaller", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            INSPECCIÓN OCULAR 1
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                label="Tipo de vehículo"
                value={getValue("TipoVehiculoInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("TipoVehiculoInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Marca"
                value={getValue("MarcaInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("MarcaInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Modelo"
                value={getValue("ModeloInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("ModeloInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Color"
                value={getValue("ColorInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("ColorInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={8}>
              <TextField
                label="PLACA"
                value={getValue("PlacaInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("PlacaInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="AÑO"
                value={getValue("AnioInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("AnioInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="USO VEH"
                value={getValue("UsoVehInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("UsoVehInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="SIST.GAS"
                value={getValue("SistGasInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("SistGasInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="NOMBRE DEL CONDUCTOR"
                value={getValue("NomConductorInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("NomConductorInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="APELLIDOS"
                value={getValue("ApConductorInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("ApConductorInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="DOCUMENTO"
                value={getValue("DocumentoConductorInspeccion1")}
                onChange={(e) =>
                  handleFieldChange(
                    "DocumentoConductorInspeccion1",
                    e.target.value
                  )
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="NRO"
                value={getValue("NroDocConductorInspeccion1")}
                onChange={(e) =>
                  handleFieldChange(
                    "NroDocConductorInspeccion1",
                    e.target.value
                  )
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="EDAD"
                value={getValue("EdadConductorInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("EdadConductorInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="NRO CELULAR"
                value={getValue("TelfConductorInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("TelfConductorInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="PARENTESCO"
                value={getValue("ParentescoInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("ParentescoInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Especificar"
                value={getValue("EspecificarInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("EspecificarInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="APRECIACION ETILICA"
                value={getValue("ApreciacionEtilicaInspeccion1")}
                onChange={(e) =>
                  handleFieldChange(
                    "ApreciacionEtilicaInspeccion1",
                    e.target.value
                  )
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="LESIONADOS"
                value={getValue("LesionadosInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("LesionadosInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="CANTIDAD"
                value={getValue("CantidadInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("CantidadInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="CÍA SEG - SOAT"
                value={getValue("CiaSegSoatInspeccion1")}
                onChange={(e) =>
                  handleFieldChange("CiaSegSoatInspeccion1", e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ readOnly: disableEdit }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            DETALLES DE LA OBSERVACIÓN
          </Typography>
          <TextField
            label="Observaciones"
            multiline
            rows={8}
            value={getValue("Observaciones")}
            onChange={(e) => handleFieldChange("Observaciones", e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{ readOnly: disableEdit }}
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            APRECIACIÓN DEL PROCURADOR
          </Typography>
          <TextField
            label="Observaciones"
            multiline
            rows={4}
            value={getValue("ObservacionesProcurador")}
            onChange={(e) =>
              handleFieldChange("ObservacionesProcurador", e.target.value)
            }
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{ readOnly: disableEdit }}
          />

          {report && report.dispatch && (
            <DispatchReportViewer dispatchData={report.dispatch} />
          )}
        </Box>
      </Box>

      <Modal
        open={sendLoader}
        onClose={() => {}}
        aria-labelledby="pdf-loader-modal-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(3px)",
        }}
      >
        <Box
          sx={{
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#fff" : "#000",
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
          <Typography id="pdf-loader-modal-title" variant="body1">
            Sending PDF, please wait...
          </Typography>
        </Box>
      </Modal>
    </PageLayout>
  );
};

export default RimacFinalReportView;
