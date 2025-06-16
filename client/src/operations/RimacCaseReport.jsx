import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Divider,
  IconButton,
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
        let parsedReportData = JSON.parse(data.message.report_data);
        setReport(parsedReportData);
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

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs2={["Operations", "Rimac Cases Report"]}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ backgroundColor: "#F5F5F5", p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="h6">Details of the Rimac Case</Typography>
          <Typography variant="body1" sx={{ color: "#E57373" }}>
            C - {report.Caso || "N/A"}
          </Typography>
        </Box>

        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">General information</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Insured"
              value={
                `${report.NomTit || ""} ${report.ApPatTit || ""} ${
                  report.ApMatTit || ""
                }`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Product"
              value={report.CodProd || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Vehicle data</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Plate"
              value={report.NroPlaca || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Vehicle Type"
              value={report.TipVehic || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Make/Model"
              value={
                `${report.Marca || ""}/${report.Modelo || ""}`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Year"
              value={report.AnioVehic || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Color"
              value={report.Color || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Engine"
              value={report.Motor || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Accident data</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Assistance number"
              value={report.Caso || "N/A"}
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
              value={report.DescEnvio || "N/A"}
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
                `${report.FecOcurr || ""} ${report.HorOcurr || ""}`.trim() ||
                "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Date and time of assignment"
              value={
                `${report.FecLlamada || ""} ${
                  report.HorLlamada || ""
                }`.trim() || "N/A"
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

        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6">Driver</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Driver Name"
              value={
                `${report.NomCond || ""} ${report.ApPatCond || ""} ${
                  report.ApMatCond || ""
                }`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Telephones"
              value={report.TelfCont || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6">For event</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Type care"
              value={report.DescEnvio || "N/A"}
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

        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ color: "#E57373" }}>
              Origin address
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Province of origin"
              value={report.Prov || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="District of origin"
              value={report.Dist || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Department"
              value={report.Dpto || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Origin address"
              value={report.DirSin || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Reference source"
              value={report.RefSin || "N/A"}
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {`${
              report.FecOcurr || "N/A"
            } EVENTO Siniestros atendidos solo en red de talleres
            (clásico) 15% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida parcial, 20% del monto a indemnizar, mínimo US$ 150, excepto`}
          </Typography>
        </Box>

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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Select value="Disadvantages" sx={{ minWidth: "150px" }}>
              <MenuItem value="Disadvantages">Disadvantages</MenuItem>
            </Select>
          </Box>
        </Box>

        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Supplier</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Assigned Supplier"
              value={report.Proveedor || "N/A"}
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
                `${report.NomCont || ""} ${report.ApPatCont || ""} ${
                  report.ApMatCont || ""
                }`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Unit 1 assignment date"
              value={
                `${report.FecLlamada || ""} ${
                  report.HorLlamada || ""
                }`.trim() || "N/A"
              }
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="outlined"
            sx={{
              borderColor: "#E0E0E0",
              color: "#000",
              "&:hover": { borderColor: "#B0B0B0" },
            }}
          >
            SELECT UNIT
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: "#E0E0E0",
              color: "#000",
              "&:hover": { backgroundColor: "#B0B0B0" },
            }}
          >
            SAVE CHANGES
          </Button>
        </Box>
      </Box>
    </PageLayout>
  );
};

export default RimacCaseReport;
