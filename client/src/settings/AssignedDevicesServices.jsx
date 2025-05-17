import React, { useState, useEffect } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TextField,
  Button,
  Chip,
  Box,
} from "@mui/material";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { useTranslation } from "../common/components/LocalizationProvider";
import CollectionFab from "./components/CollectionFab";
import TableShimmer from "../common/components/TableShimmer";
import { useSelector } from "react-redux";

const AssignedDevicesServices = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const [devicesWithServices, setDevicesWithServices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const t = useTranslation();
  const userId = useSelector((state) => state.session.user.id);

  const fetchDevicesWithServices = async () => {
    setLoading(true);
    try {
      const { data } =
        userId === 1
          ? await axios.get(`${url}/devices/with-services`)
          : await axios.get(`${url}/devices/with-services?userId=${userId}`);
      if (data.status) {
        setDevicesWithServices(data.message);
      }
    } catch (error) {
      console.error("Error fetching devices with services:", error);
      toast.error("Failed to load devices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevicesWithServices();
  }, []);

  const filteredDevices = devicesWithServices.filter((device) => {
    const matchesDeviceName = device.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesServiceName = device.services.some((service) =>
      service.name.toLowerCase().includes(search.toLowerCase())
    );
    return matchesDeviceName || matchesServiceName;
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <ToastContainer />
      <div style={{ padding: "20px" }}>
        <TextField
          label={t("sharedSearch")}
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "20px", width: "40%" }}
        />

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Device Name</TableCell>
              <TableCell>Assigned Services</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableShimmer columns={2} />
            ) : (
              filteredDevices
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>
                      {device.services.map((service, index) => (
                        <Chip
                          key={index}
                          label={service.name}
                          style={{ marginRight: "8px", marginBottom: "8px" }}
                        />
                      ))}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={filteredDevices.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </div>

      <CollectionFab editPath={"/settings/devices/assign/services"} />
    </Box>
  );
};

export default AssignedDevicesServices;
