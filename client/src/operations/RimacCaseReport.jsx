import React from "react";
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

const RimacCaseReport = () => {
  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs2={["Operations", "Rimac Cases Report"]}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ color: "#E57373" }}>
              RIMAC
            </Typography>
            <Typography variant="h6">SEV</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#E57373" }}>
            ORLANDO MEDINA ESPINOZA - CHONG STUDIO AND ASSOCIATES SAC
          </Typography>
        </Box>

        {/* Case Code */}
        <Box sx={{ backgroundColor: "#F5F5F5", p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="h6">Details of the Attorney's Case</Typography>
          <Typography variant="body1" sx={{ color: "#E57373" }}>
            C - 24685
          </Typography>
        </Box>

        {/* General Information Section */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">General information</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Insured"
              value="LUIS ENRIQUE GOMEZ LOPEZ"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Product"
              value="2101"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Vehicle Data Section */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Vehicle data</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Plate"
              value="AKN268"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Automovil"
              value="AUTOMOVIL"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Make/model"
              value="MAZDA/MAZDA3"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Year"
              value="2015"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Color"
              value=""
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Engine"
              value="PE4031052"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Accident Data Section */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Accident data</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Assistance number"
              value="0025400921"
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
              value="CHOQUE Y FUGA CIRCULANDO"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Subtopic"
              value="Pérdida Parcial"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Opening date and time"
              value="29/05/2025 10:35"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Date and time of assignment"
              value=""
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Programming date and time"
              value=""
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Mode"
              value="Subasta"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Driver Section */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6">Driver</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label=""
              value="LUIS ENRIQUE GOMEZ LOPEZ"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Telephones"
              value="984123168"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Simple Event Section */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6">For event</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Type care"
              value=""
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Procurator"
              value="ANR"
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
            indemnizar, mínimo US$ 300, excepto para pérdida total 15%. Por todo
            evento cada 30% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida total 15%. Por todo evento cada 30% del monto a indemnizar,
            mínimo US$ 300, excepto para pérdida total 15%. Por todo evento cada
            30% del monto a indemnizar, mínimo US$ 300, excepto para pérdida
            total 15%. Por todo evento cada 30% del monto a indemnizar, mínimo
            US$ 300, excepto para pérdida total 15%. Por todo evento cada 30%
            del monto a indemnizar, mínimo US$ 300, excepto para pérdida total
            15%. Por todo evento cada 30% del monto a indemnizar, mínimo US$
            300, excepto para pérdida total 15%. Por todo evento cada 30% del
            monto a indemnizar, mínimo US$ 300, excepto para pérdida total 15%.
            Por todo evento cada 30% del monto a indemnizar, mínimo US$ 300,
            excepto para pérdida total 15%. Por todo evento cada 30% del monto a
            indemnizar, mínimo US$ 300, excepto para pérdida total 15%. Por todo
            evento cada 30% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida total 15%. Por todo evento cada 30% del monto a indemnizar,
            mínimo US$ 300, excepto para pérdida total 15%. Por todo evento cada
            30% del monto a indemnizar, mínimo US$ 300, excepto para pérdida
            total 15%. Por todo evento cada 30% del monto a indemnizar, mínimo
            US$ 300, excepto para pérdida total 15%. Por todo evento cada 30%
            del monto a indemnizar, mínimo US$ 300, excepto para pérdida total
            15%. Por todo evento cada 30% del monto a indemnizar, mínimo US$
            300, excepto para pérdida total 15%. Por todo evento cada 30% del
            monto a indemnizar, mínimo US$ 300, excepto para pérdida total 15%.
            Por todo evento cada 30% del monto a indemnizar, mínimo US$ 300,
            excepto para pérdida total 15%. Por todo evento cada 30% del monto a
            indemnizar, mínimo US$ 300, excepto para pérdida total 15%. Por todo
            evento cada 30% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida total 15%. Por todo evento cada 30% del monto a indemnizar,
            mínimo US$ 300, excepto para pérdida total 15%. Por todo evento cada
            30% del monto a indemnizar, mínimo US$ 300, excepto para pérdida
            total 15%. Por todo evento cada 30% del monto a indemnizar, mínimo
            US$ 300, excepto para pérdida total 15%. Por todo evento cada 30%
            del monto a indemnizar, mínimo US$ 300, excepto para pérdida total
            15%. Por todo evento cada 30% del monto a indemnizar, mínimo US$
            300, excepto para pérdida total 15%. Por todo evento cada 30% del
            monto a indemnizar, mínimo US$ 300, excepto para pérdida total 15%.
            Por todo evento cada 30% del monto a indemnizar, mínimo US$ 300,
            excepto para pérdida total 15%. Por todo evento cada 30% del monto a
            indemnizar, mínimo US$ 300, excepto para pérdida total 15%. Por todo
            evento cada 30% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida total 15%. Por todo evento cada 30% del monto a indemnizar,
            mínimo US$ 300, excepto para pérdida total 15%. Por todo evento cada
            30% del monto a indemnizar, mínimo US$ 300, excepto para pérdida
            total 15%. Por todo evento cada 30% del monto a indemnizar, mínimo
            US$ 300, excepto para pérdida total 15%. Por todo evento cada 30%
            del monto a indemnizar, mínimo US$ 300, excepto para pérdida total
            15%. Por todo evento cada 30% del monto a indemnizar, mínimo US$
            300, excepto para pérdida total 15%. Por todo evento cada 30% del
            monto a indemnizar, mínimo US$ 300, excepto para pérdida total 15%.
            Por todo evento cada 30% del monto a indemnizar, mínimo US$ 300,
            excepto para pérdida total 15%. Por todo evento cada 30% del monto a
            indemnizar, mínimo US$ 300, excepto para pérdida total 15%. Por todo
            evento cada 30% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida total 15%. Por todo evento cada 30% del monto a indemnizar,
            mínimo US$ 300, excepto para pérdida total 15%. Por todo evento cada
            30% del monto a indemnizar, mínimo US$ 300, excepto para pérdida
            total 15%. Por todo evento cada 30% del monto a indemnizar, mínimo
            US$ 300, excepto para pérdida total 15%. Por todo evento cada 30%
            del monto a indemnizar, mínimo US$ 300, excepto para pérdida total
            15%. Por todo evento cada 30% del monto a indemnizar, mínimo US$
            300, excepto para pérdida total 15%. Por todo evento cada 30% del
            monto a indemnizar, mínimo US$ 300, excepto para pérdida total 15%.
            Por todo evento cada 30% del monto a indemnizar, mínimo US$ 300,
            excepto para pérdida total 15%. Por todo evento cada 30% del monto a
            indemnizar, mínimo US$ 300, excepto para pérdida total 15%. Por todo
            evento cada 30% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida total 15%. Por todo evento cada 30% del monto a indemnizar,
            mínimo US$ 300, excepto para pérdida total 15%. Por todo evento cada
            30% del monto a indemnizar, mínimo US$ 300, excepto para pérdida
            total 15%. Por todo evento cada 30% del monto a indemnizar, mínimo
            US$ 300, excepto para pérdida total 15%. Por todo evento cada 30%
            del monto a indemnizar, mínimo US$ 300, excepto para pérdida total
            15%. Por todo evento cada 30% del monto a indemnizar, mínimo US$
            300, excepto para pérdida total 15%. Por todo evento cada 30% del
            monto a indemnizar, mínimo US$ 300, excepto para pérdida total 15%.
            Por todo evento cada 30% del monto a indemnizar, mínimo US$ 300,
            excepto para pérdida total 15%. Por todo evento cada 30% del monto a
            indemnizar, mínimo US$ 300, excepto para pérdida total 15%. Por todo
            evento cada 30% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida total 15%. Por todo evento cada 30% del monto a indemnizar,
            mínimoős
          </Typography>
        </Box>

        {/* Origin Address Section */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ color: "#E57373" }}>
              Origin address
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Province of origin"
              value="LIMA"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="District of origin"
              value="LIMA"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label=""
              value="PUENTE PIEDRA"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Origin address"
              value="PANAMERICANA NORTE"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Reference source"
              value="ANTES DE LLEGAR A GAMBER - SENTIDO AL NORTE"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            10/06/2025 EVENTO Siniestros atendidos solo en red de talleres
            (clásico) 15% del monto a indemnizar, mínimo US$ 300, excepto para
            pérdida parcial, 20% del monto a indemnizar, mínimo US$ 150, excepto
          </Typography>
        </Box>

        {/* Comments Section */}
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

        {/* Supplier Section */}
        <Box sx={{ border: "1px solid #E57373", p: 2, borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#E57373" }} />
            <Typography variant="h6">Supplier</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Assigned Supplier"
              value="ESTUDIO CHONG Y ASOCIADOS S.A.C."
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="State"
              value="CULMINATION"
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
              value="EDGAR JUNIOR SANCHEZ PEREZ"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Unit 1 assignment date"
              value="29/05/2025 10:38"
              variant="outlined"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        {/* Footer Buttons */}
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

        {/* Footer */}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#757575" }}>
            © 2025 - Powered by IOTECNOVA
          </Typography>
        </Box>
      </Box>
    </PageLayout>
  );
};

export default RimacCaseReport;
