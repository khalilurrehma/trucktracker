import React from "react";
import { Box, Card, CardContent } from "@mui/material";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const DynamicCalcBody = ({ calculator }) => {
  console.log(calculator);

  if (!calculator) return <Typography>No calculator data</Typography>;

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" pb={2} gutterBottom>
        Calculator: {calculator.name}
      </Typography>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Metadata</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth
            label="Timezone"
            value={calculator.timezone || "N/A"}
            variant="outlined"
            margin="dense"
            disabled
          />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Selectors</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Expression</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calculator.selectors?.map((selector, index) => (
                  <TableRow key={index}>
                    <TableCell>{selector.name || "N/A"}</TableCell>
                    <TableCell>{selector.type}</TableCell>
                    <TableCell>{selector.expression || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Counters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Method/Expression</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calculator.counters?.map((counter, index) => (
                  <TableRow key={index}>
                    <TableCell>{counter.name}</TableCell>
                    <TableCell>{counter.type}</TableCell>
                    <TableCell>
                      {counter.expression || counter.method || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default DynamicCalcBody;
