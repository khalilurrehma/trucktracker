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
import { useParams } from "react-router-dom";
import axios from "axios";
import DispatchReportViewer from "./components/DispatchReportViewer";
import { toast, ToastContainer } from "react-toastify";
import html2pdf from "html2pdf.js";

const RimacFinalReportView = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const reportRef = useRef();
  const { id, caseId } = useParams();
  const { url } = useAppContext();
  const [report, setReport] = useState(null);
  const [detailedReport, setDetailedReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendLoader, setSendLoader] = useState(false);
  const [hideButton, setHideButton] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${url}/rimac/case/report/${id}`);
      if (data.status) {
        const parsedReportData = JSON.parse(data.message.rimac.report_data);
        setReport({
          ...parsedReportData,
          dispatch: data.message.dispatch || {},
        });
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

  const getValue = (key) => {
    const val = report && report[key];
    if (
      !val ||
      (typeof val === "object" &&
        !Array.isArray(val) &&
        Object.keys(val).length === 0) ||
      (Array.isArray(val) && val.length === 0)
    ) {
      return "-";
    }
    // If it's any non-empty object or array, still show "-" (to avoid [object Object] or joined array)
    if (typeof val === "object" || Array.isArray(val)) {
      return "-";
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

          {detailedReport?.rimac?.status !== "sent_to_rimac" && !hideButton && (
            <Button
              variant="contained"
              sx={{
                bgcolor: "error.main",
                color: "white",
                "&:hover": { bgcolor: "error.dark" },
              }}
              endIcon={<ForwardIcon />}
              onClick={handleClickSend}
            >
              Send to Rimac
            </Button>
          )}
        </Box>

        <Box>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <TextField
                label="Fecha Servicio"
                value={getValue("FecOcurr")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Hora de llegada"
                value={getValue("HorOcurr")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Hora de salida"
                value={getValue("HorEnvio")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Lugar del Accidente"
                value={getValue("DirSin")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Departamento"
                value={getValue("Dpto")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Provincia"
                value={getValue("Prov")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Distrito"
                value={getValue("Dist")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Señal Telefónica"
                value={getValue("TelfCont")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
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
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Tipo de Servicio"
                value={getValue("CodProd")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Hora de solicitud"
                value={getValue("HorLlamada")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Hora de atención"
                value={getValue("HorEnvio")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Domicilio"
                value={getValue("DirSin")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Documento Nro"
                value={getValue("ContactoNroDoc")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Tipo Documento"
                value={getValue("ContactoTipoDoc")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Asegurado"
                value={getValue("NomTit")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Nombre del Asegurado"
                value={getValue("NomTit")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Teléfono"
                value={getValue("TelfCont")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Nombre de Contacto"
                value={getValue("NomCont")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Teléfono Contacto"
                value={getValue("TelfCont")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Referencia"
                value={getValue("RefSin")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Departamento"
                value={getValue("Dpto")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Provincia"
                value={getValue("Prov")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Distrito"
                value={getValue("Dist")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="TIPO DE ASESORÍA"
                value={getValue("NomProd")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="TIPO DE SINIESTRO"
                value={getValue("DescEnvio")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="CRITICIDAD DEL SNTRO"
                value={getValue("ConfiandoPalabra")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
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
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="DENUNCIA POLICIAL/LIBRO DE OCURRENCIA"
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="VEHICULO RETENIDO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="CONDUCTOR RETENIDO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
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
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="Marca"
                value={getValue("Marca")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="Modelo"
                value={getValue("Modelo")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="Color"
                value={getValue("Color")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="PLACA"
                value={getValue("NroPlaca")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="AÑO"
                value={getValue("AnioVehic")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1.4}>
              <TextField
                label="USO VEH"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1.6}>
              <TextField
                label="SIST.GAS"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="NOMBRE DEL CONDUCTOR"
                value={getValue("NomCond")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="APELLIDOS"
                value={getValue("ApPatCond")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="DOCUMENTO"
                value={getValue("ConductorTipoDoc")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="NRO"
                value={getValue("ConductorNroDoc")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                label="EDAD"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1.5}>
              <TextField
                label="NRO CELULAR"
                value={getValue("TelfCont")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={1}>
              <TextField
                label="PARESTESCO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                label="Especificar"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={2.5}>
              <TextField
                label="APRECIACION ETILICA"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2.5}>
              <TextField
                label="LESIONADOS"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2.5}>
              <TextField
                label="CANTIDAD"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={2.2}>
              <TextField
                label="CÍA SEG - SOAT"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={2}>
              <TextField
                label="TIPO DE LICENCIA"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="NRO LICENCIA"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="CATEGORIA"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="VIGENTE"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="FECHA REVALIDACION"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="RESTRICCIONES"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="VEHÍCULO OPERATIVO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="PROVEEDOR GRÚA"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="ESPECIFICAR"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={3.5}>
              <TextField
                label="PLACA"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={5}>
              <TextField
                label="CONDUCTOR"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3.5}>
              <TextField
                label="TELEFONO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
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
                label="TELEFONO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
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
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="ASUME RESPONSABILIDAD"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="TALLER ELEGIDO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Especificar"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
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
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Marca"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Modelo"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Color"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={8}>
              <TextField
                label="PLACA"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="AÑO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="USO VEH"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="SIST.GAS"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="NOMBRE DEL CONDUCTOR"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="APELLIDOS"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="DOCUMENTO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="NRO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="EDAD"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="NRO CELULAR"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="PARESTESCO"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Especificar"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="APRECIACION ETILICA"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="LESIONADOS"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="CANTIDAD"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="CÍA SEG - SOAT"
                value={getValue("SeñalTelefónica")}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
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
            fullWidth
            variant="outlined"
            size="small"
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold">
            APRECIACIÓN DEL PROCURADOR
          </Typography>
          <TextField
            label="Observaciones"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            size="small"
          />

          {report && report.dispatch && (
            <DispatchReportViewer dispatchData={report.dispatch} />
          )}
        </Box>
      </Box>

      <Modal
        open={sendLoader}
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
          <Typography id="pdf-loader-title" variant="body1">
            Sending, please wait...
          </Typography>
        </Box>
      </Modal>
    </PageLayout>
  );
};

export default RimacFinalReportView;
