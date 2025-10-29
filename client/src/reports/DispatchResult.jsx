import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
  InfoWindow,
} from "@react-google-maps/api";
import carPng from "../images/car-4-48.png";
import { useSelector } from "react-redux";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import axios from "axios";
import {
  generateCaseNumber,
  getDistanceFromLatLonInMeters,
} from "../settings/common/New.Helper";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DispatchResultTable from "./components/DispatchResultTable";
import DispatchDialog from "./components/DispatchDialog";
import dayjs from "dayjs";
import { useTranslation } from "../common/components/LocalizationProvider";
import { useLocation } from "react-router-dom";
import { useTheme } from "@mui/material";


const DispatchResult = () => {

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "reportDispatchResult"]}
    >
    
    </PageLayout>
  );
};

export default DispatchResult;
