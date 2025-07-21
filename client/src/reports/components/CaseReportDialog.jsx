import * as React from "react";
import {
  AppBar,
  Button,
  Dialog,
  IconButton,
  Typography,
  Toolbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Slide,
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
import EchongCaseReport from "./EchongCaseReport";
import RimacCaseReport from "./RimacCaseReport";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="right" ref={ref} {...props} />;
});

const CaseReportDialog = ({
  openAssignModal,
  setOpenAssignModal,
  caseDetails,
}) => {
  const { url } = useAppContext();
  const [report, setReport] = useState(null);
  const [rimacReportCase, setRimacReportCase] = useState(false);

  const fetchReport = async () => {
    try {
      const { data } = await axios(
        `${url}/dispatch/case/report/${caseDetails.id}`
      );
      if (data.status) {
        if (!data.message || Object.keys(data.message).length === 0) {
          setReport("empty");
        } else {
          if (data.message?.rimacReport[0] !== undefined) {
            setRimacReportCase(true);
          } else {
            setRimacReportCase(false);
          }
          const reportData = {
            ...data.message,
            vehicles:
              typeof data.message.vehicles === "string"
                ? JSON.parse(data.message.vehicles)
                : data.message.vehicles,
            meta_data:
              typeof data.message.meta_data === "string"
                ? JSON.parse(data.message.meta_data)
                : data.message.vehicles,
            rimacReport: data.message?.rimacReport[0] || [],
          };

          setReport(reportData);
        }
      } else {
        toast.error("Failed to fetch report");
      }
    } catch (error) {
      toast.error("Error fetching report: " + error.message);
    }
  };

  useEffect(() => {
    if (openAssignModal && caseDetails.id) {
      fetchReport();
    }
  }, [openAssignModal, caseDetails.id]);

  return (
    <Dialog
      open={openAssignModal}
      onClose={() => setOpenAssignModal(false)}
      TransitionComponent={Transition}
      fullScreen
      aria-describedby="alert-dialog-slide-description"
    >
      {!rimacReportCase && (
        <EchongCaseReport
          setOpenAssignModal={setOpenAssignModal}
          caseDetails={caseDetails}
          report={report}
          setReport={setReport}
        />
      )}
      {rimacReportCase && (
        <RimacCaseReport
          setOpenAssignModal={setOpenAssignModal}
          caseDetails={caseDetails}
          report={report}
          setReport={setReport}
        />
      )}
    </Dialog>
  );
};

export default CaseReportDialog;
