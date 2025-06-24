import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useParams } from "react-router-dom";
import { useAppContext } from "../AppContext";
import axios from "axios";

const RimacCaseReport = () => {
  const { id } = useParams();
  const { url } = useAppContext();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${url}/rimac/case/report/${id}`);
      if (data.status) {
        const parsedReportData = JSON.parse(data.message.rimac.report_data);
        setReport({
          ...parsedReportData,
          dispatch: data.message.dispatch,
        });
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReport();
    }
  }, [id]);

  if (loading) {
    return (
      <PageLayout
        menu={<OperationsMenu />}
        breadcrumbs2={["Operations", "Rimac Cases Report"]}
      >
        <Box sx={{ p: 3 }}>Loading...</Box>
      </PageLayout>
    );
  }

  if (!report) {
    return (
      <PageLayout
        menu={<OperationsMenu />}
        breadcrumbs2={["Operations", "Rimac Cases Report"]}
      >
        <Box sx={{ p: 3 }}>No report data found</Box>
      </PageLayout>
    );
  }

  // Helper function to safely convert values to string
  const toSafeString = (value) => {
    if (typeof value === "object" && value !== null) {
      return "N/A"; // Handle objects (like empty {}) by returning "N/A"
    }
    return value ? String(value).trim() : "N/A";
  };

  // Helper function to sort and filter photos in the specified order
  const getOrderedPhotos = (photos) => {
    if (!photos || !Array.isArray(photos)) return [];

    const photoOrder = [
      {
        type: "front",
        category: "Client Vehicle",
        label: "Front (Client Vehicle)",
      },
      {
        type: "back",
        category: "Client Vehicle",
        label: "Back (Client Vehicle)",
      },
      {
        type: "sideleft",
        category: "Client Vehicle",
        label: "Sideleft (Client Vehicle)",
      },
      {
        type: "damage",
        category: "Client Vehicle",
        label: "Damage (Client Vehicle)",
      },
      {
        type: "photo",
        category: "Client Vehicle",
        label: "Photo (Client Vehicle)",
      },
      {
        type: "other",
        category: "Client Vehicle",
        label: "Other (Client Vehicle)",
      },
      {
        type: "vehicle_card_front",
        category: "Client Document",
        label: "Vehicle Card Front (Client Document)",
      },
      {
        type: "driving_license_front",
        category: "Client Document",
        label: "Driving License Front (Client Document)",
      },
      {
        type: "driving_license_back",
        category: "Client Document",
        label: "Driving License Back (Client Document)",
      },
      {
        type: "other",
        category: "Client Document",
        label: "Other (Client Document)",
      },
      {
        type: "",
        category: "Additional Information",
        label: "Multiple Images (Additional Information)",
      },
    ];

    const orderedPhotos = [];
    photoOrder.forEach(({ type, category, label }) => {
      const matchingPhotos = photos.filter(
        (photo) =>
          photo.type.toLowerCase() === type.toLowerCase() &&
          photo.category.toLowerCase() === category.toLowerCase()
      );
      matchingPhotos.forEach((photo) => {
        orderedPhotos.push({ ...photo, label });
      });
    });

    // Add any remaining photos that don't match the specified types/categories
    const unmatchedPhotos = photos.filter(
      (photo) =>
        !photoOrder.some(
          (order) =>
            photo.type.toLowerCase() === order.type.toLowerCase() &&
            photo.category.toLowerCase() === order.category.toLowerCase()
        )
    );
    unmatchedPhotos.forEach((photo) => {
      orderedPhotos.push({
        ...photo,
        label: `${toSafeString(photo.type)} (${toSafeString(photo.category)})`,
      });
    });

    return orderedPhotos;
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs2={["Operations", "Rimac Cases Report"]}
    >
      <Box sx={{ p: 3, backgroundColor: "#F9FAFB", minHeight: "100vh" }}>
        {/* Rimac Case Header */}
        <Box sx={{ backgroundColor: "#F5F5F5", p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="h6">Details of the Rimac Case</Typography>
          <Typography variant="body1" sx={{ color: "#E57373" }}>
            C - {toSafeString(report.Caso)}
          </Typography>
        </Box>

        {/* General Information */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">General information</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Insured"
              value={
                `${toSafeString(report.NomTit)} ${toSafeString(
                  report.ApPatTit
                )} ${toSafeString(report.ApMatTit)}`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Product"
              value={toSafeString(report.CodProd)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Vehicle Data */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Vehicle data</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Plate"
              value={toSafeString(report.NroPlaca)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Vehicle Type"
              value={toSafeString(report.TipVehic)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Make/Model"
              value={
                `${toSafeString(report.Marca)}/${toSafeString(
                  report.Modelo
                )}`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Year"
              value={toSafeString(report.AnioVehic)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Color"
              value={toSafeString(report.Color)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Engine"
              value={toSafeString(report.Motor)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Accident Data */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Accident data</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Assistance number"
              value={toSafeString(report.Caso)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Category"
              value="Emergency vehicular"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Type care"
              value={toSafeString(report.DescEnvio)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Subtopic"
              value={report.DatosDeduc ? "Pérdida Parcial" : "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Opening date and time"
              value={
                `${toSafeString(report.FecOcurr)} ${toSafeString(
                  report.HorOcurr
                )}`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Date and time of assignment"
              value={
                `${toSafeString(report.FecLlamada)} ${toSafeString(
                  report.HorLlamada
                )}`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Programming date and time"
              value="N/A"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Mode"
              value={report.LMDM === "S" ? "Subasta" : "Standard"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Driver */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6">Driver</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Driver Name"
              value={
                `${toSafeString(report.NomCond)} ${toSafeString(
                  report.ApPatCond
                )} ${toSafeString(report.ApMatCond)}`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Telephones"
              value={toSafeString(report.TelfCont)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* For Event */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6">For event</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Type care"
              value={toSafeString(report.DescEnvio)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Procurator"
              value={report.Proveedor ? report.Proveedor.split(" ")[0] : "ANR"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Siniestros atendidos solo en red de talleres (clásico) 15% del monto
            a indemnizar, mínimo US$ 300. Siniestros atendidos en talleres de la
            red de talleres (clásico) 15% del monto a indemnizar, mínimo US$
            150, excepto para pérdida parcial, 20% del monto a indemnizar,
            mínimo US$ 150, excepto para pérdida parcial, 20% del monto a
          </Typography>
        </Box>

        {/* Origin Address */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ color: "#E57373" }}>
              Origin address
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Province of origin"
              value={toSafeString(report.Prov)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="District of origin"
              value={toSafeString(report.Dist)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Department"
              value={toSafeString(report.Dpto)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Origin address"
              value={toSafeString(report.DirSin)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Reference source"
              value={toSafeString(report.RefSin)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {`${toSafeString(
              report.FecOcurr
            )} EVENTO Siniestros atendidos solo en red de talleres
            (clásico) 15% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida parcial, 20% del monto a indemnizar, mínimo US$ 150, excepto`}
          </Typography>
        </Box>

        {/* Comments to Send */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <ChatBubbleOutlineIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Comments to send</Typography>
          </Box>
          <TextField
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            placeholder="Comments..."
          />
        </Box>

        {/* Supplier */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Supplier</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Assigned Supplier"
              value={toSafeString(report.Proveedor)}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="State"
              value={
                report.EstadoPoliza === "VIGENTE" ||
                report.EstadoPoliza === "ACTIVA"
                  ? "CULMINATION"
                  : "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{
                readOnly: true,
                sx: {
                  backgroundColor: "#E8F5E9",
                  color: "#388E3C",
                  borderRadius: "12px",
                },
              }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Unit 1"
              value={
                `${toSafeString(report.NomCont)} ${toSafeString(
                  report.ApPatCont
                )} ${toSafeString(report.ApMatCont)}`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Unit 1 assignment date"
              value={
                `${toSafeString(report.FecLlamada)} ${toSafeString(
                  report.HorLlamada
                )}`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Chong & Asociados Dispatch Section (Conditional) */}
        {report.dispatch && (
          <Box
            sx={{
              border: "1px solid #1976D2",
              p: 2,
              borderRadius: 1,
              mb: 2,
              backgroundColor: "#E3F2FD",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <WarningAmberIcon sx={{ color: "#1976D2" }} />
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "#1976D2" }}
              >
                Chong & Asociados - Dispatch Details
              </Typography>
            </Box>

            {/* Damage Description */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
                Damage Description
              </Typography>
              <TextField
                label="Damage"
                value={toSafeString(report.dispatch.damage)}
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                InputProps={{ readOnly: true }}
              />
            </Box>

            {/* Additional Information */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
                Additional Information
              </Typography>
              <TextField
                label="Additional Information"
                value={toSafeString(report.dispatch.additional_information)}
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                InputProps={{ readOnly: true }}
              />
            </Box>

            {/* Photos */}
            <Box>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
                Photos
              </Typography>
              <Grid container spacing={2}>
                {getOrderedPhotos(report.dispatch.vehicles?.[0]?.photos).map(
                  (photo, index) => (
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={4}
                      key={`${photo.photo_id}-${index}`}
                    >
                      <Box
                        component="img"
                        src={toSafeString(photo.url)}
                        alt={photo.label}
                        sx={{
                          width: "100%",
                          height: "auto",
                          borderRadius: 1,
                          border: "1px solid #E0E0E0",
                          objectFit: "contain",
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ mt: 1, display: "block" }}
                      >
                        {photo.label}
                      </Typography>
                    </Grid>
                  )
                )}
                {(!report.dispatch.vehicles?.[0]?.photos ||
                  report.dispatch.vehicles[0].photos.length === 0) && (
                  <Typography variant="body2">No photos available.</Typography>
                )}
              </Grid>
            </Box>
          </Box>
        )}

        {/* Footer Actions */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="contained"
            sx={{
              backgroundColor: "#E0E0E0",
              color: "#000",
              "&:hover": { backgroundColor: "#B0B0B0" },
            }}
          >
            Send to Rimac
          </Button>
        </Box>
      </Box>
    </PageLayout>
  );
};

export default RimacCaseReport;
