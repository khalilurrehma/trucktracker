import React from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Divider,
  FormControlLabel,
  Checkbox,
  Button,
} from "@mui/material";
import ForwardIcon from "@mui/icons-material/Forward";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";

const RimacFinalReportView = () => {
  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Report View"]}
    >
      <Box p={2}>
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

          <Button
            variant="contained"
            sx={{
              bgcolor: "error.main",
              color: "white",
              "&:hover": { bgcolor: "error.dark" },
            }}
            endIcon={<ForwardIcon />}
          >
            Send to Rimac
          </Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={3}>
            <TextField label="Fecha Servicio" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Hora de llegada" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Hora de salida" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Lugar del Accidente" fullWidth size="small" />
          </Grid>

          <Grid item xs={3}>
            <TextField label="Departamento" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Provincia" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Distrito" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Señal Telefónica" fullWidth size="small" />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          DATOS DE CONTACTO
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <TextField label="Fecha" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Tipo de Servicio" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Hora de solicitud" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Hora de atención" fullWidth size="small" />
          </Grid>

          <Grid item xs={3}>
            <TextField label="Domicilio" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Documento Nro" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Tipo Documento" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Asegurado" fullWidth size="small" />
          </Grid>

          <Grid item xs={3}>
            <TextField label="Nombre del Asegurado" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Teléfono" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Nombre de Contacto" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Teléfono Contacto" fullWidth size="small" />
          </Grid>

          <Grid item xs={3}>
            <TextField label="Referencia" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Departamento" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Provincia" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Distrito" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="TIPO DE ASESORÍA" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="TIPO DE SINIESTRO" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="CRITICIDAD DEL SNTRO" fullWidth size="small" />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          CASOS DE DENUNCIA POLICIAL
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField label="DEPENDENCIA POLICIAL" fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="DENUNCIA POLICIAL/LIBRO DE OCURRENCIA"
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={3}>
            <TextField label="VEHICULO RETENIDO" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="CONDUCTOR RETENIDO" fullWidth size="small" />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          DATOS DEL VEHÍCULO Y CONDUCTOR ASIGNADO
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={1.4}>
            <TextField label="Tipo de vehículo" fullWidth size="small" />
          </Grid>
          <Grid item xs={1.4}>
            <TextField label="Marca" fullWidth size="small" />
          </Grid>
          <Grid item xs={1.4}>
            <TextField label="Modelo" fullWidth size="small" />
          </Grid>
          <Grid item xs={1.4}>
            <TextField label="Color" fullWidth size="small" />
          </Grid>
          <Grid item xs={1.4}>
            <TextField label="PLACA" fullWidth size="small" />
          </Grid>
          <Grid item xs={1.4}>
            <TextField label="AÑO" fullWidth size="small" />
          </Grid>
          <Grid item xs={1.4}>
            <TextField label="USO VEH" fullWidth size="small" />
          </Grid>
          <Grid item xs={1.6}>
            <TextField label="SIST.GAS" fullWidth size="small" />
          </Grid>

          <Grid item xs={3}>
            <TextField label="NOMBRE DEL CONDUCTOR" fullWidth size="small" />
          </Grid>
          <Grid item xs={2}>
            <TextField label="APELLIDOS" fullWidth size="small" />
          </Grid>
          <Grid item xs={2}>
            <TextField label="DOCUMENTO" fullWidth size="small" />
          </Grid>
          <Grid item xs={2}>
            <TextField label="NRO" fullWidth size="small" />
          </Grid>
          <Grid item xs={1}>
            <TextField label="EDAD" fullWidth size="small" />
          </Grid>
          <Grid item xs={1.5}>
            <TextField label="NRO CELULAR" fullWidth size="small" />
          </Grid>

          <Grid item xs={1}>
            <TextField label="PARESTESCO" fullWidth size="small" />
          </Grid>
          <Grid item xs={1}>
            <TextField label="Especificar" fullWidth size="small" />
          </Grid>

          <Grid item xs={2.5}>
            <TextField label="APRECIACION ETILICA" fullWidth size="small" />
          </Grid>
          <Grid item xs={2.5}>
            <TextField label="LESIONADOS" fullWidth size="small" />
          </Grid>
          <Grid item xs={2.5}>
            <TextField label="CANTIDAD" fullWidth size="small" />
          </Grid>

          <Grid item xs={2.2}>
            <TextField label="CÍA SEG - SOAT" fullWidth size="small" />
          </Grid>

          <Grid item xs={2}>
            <TextField label="TIPO DE LICENCIA" fullWidth size="small" />
          </Grid>
          <Grid item xs={2}>
            <TextField label="NRO LICENCIA" fullWidth size="small" />
          </Grid>
          <Grid item xs={2}>
            <TextField label="CATEGORIA" fullWidth size="small" />
          </Grid>
          <Grid item xs={2}>
            <TextField label="VIGENTE" fullWidth size="small" />
          </Grid>
          <Grid item xs={2}>
            <TextField label="FECHA REVALIDACION" fullWidth size="small" />
          </Grid>
          <Grid item xs={2}>
            <TextField label="RESTRICCIONES" fullWidth size="small" />
          </Grid>

          <Grid item xs={4}>
            <TextField label="VEHÍCULO OPERATIVO" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="PROVEEDOR GRÚA" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="ESPECIFICAR" fullWidth size="small" />
          </Grid>

          <Grid item xs={3.5}>
            <TextField label="PLACA" fullWidth size="small" />
          </Grid>
          <Grid item xs={5}>
            <TextField label="CONDUCTOR" fullWidth size="small" />
          </Grid>
          <Grid item xs={3.5}>
            <TextField label="TELEFONO" fullWidth size="small" />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          DAÑOS DEL VEHÍCULO ASEGURADO
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="TELEFONO" fullWidth size="small" />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          DAÑOS ADICIONALES A EVALUAR POR EL TÉCNICO RIMAC
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <TextField label="PREEXISTENCIAS" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="ASUME RESPONSABILIDAD" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="TALLER ELEGIDO" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="Especificar" fullWidth size="small" />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          INSPECCIÓN OCULAR 1
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField label="Tipo de vehículo" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Marca" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Modelo" fullWidth size="small" />
          </Grid>

          <Grid item xs={3}>
            <TextField label="Color" fullWidth size="small" />
          </Grid>
          <Grid item xs={8}>
            <TextField label="PLACA" fullWidth size="small" />
          </Grid>

          <Grid item xs={4}>
            <TextField label="AÑO" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="USO VEH" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="SIST.GAS" fullWidth size="small" />
          </Grid>

          <Grid item xs={4}>
            <TextField label="NOMBRE DEL CONDUCTOR" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="APELLIDOS" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="DOCUMENTO" fullWidth size="small" />
          </Grid>

          <Grid item xs={4}>
            <TextField label="NRO" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="EDAD" fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="NRO CELULAR" fullWidth size="small" />
          </Grid>

          <Grid item xs={12}>
            <TextField label="PARESTESCO" fullWidth size="small" />
          </Grid>

          <Grid item xs={3}>
            <TextField label="Especificar" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="APRECIACION ETILICA" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="LESIONADOS" fullWidth size="small" />
          </Grid>
          <Grid item xs={3}>
            <TextField label="CANTIDAD" fullWidth size="small" />
          </Grid>

          <Grid item xs={12}>
            <TextField label="CÍA SEG - SOAT" fullWidth size="small" />
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
      </Box>
    </PageLayout>
  );
};

export default RimacFinalReportView;
