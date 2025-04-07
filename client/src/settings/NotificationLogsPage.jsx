import { useState, useEffect } from "react";
import axios from "axios";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TableSortLabel,
  TextField,
  Button,
} from "@mui/material";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import TableShimmer from "../common/components/TableShimmer";

const NotificationLogsPage = () => {
  const url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${url}/devices/notifications`);
      if (data.status) {
        setItems(data.message);
        setFilteredItems(data.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const filteredData = items.filter(
      (item) =>
        item.device_id.toString().includes(deviceId) &&
        item.device_name.toLowerCase().includes(deviceName.toLowerCase())
    );
    setFilteredItems(filteredData);
  }, [deviceId, deviceName, items]);

  const parseDate = (dateStr) => {
    const [day, month, year, time] = dateStr.split(/[\s,/]+/);
    return new Date(`${year}-${month}-${day}T${time}`);
  };

  const handleSort = () => {
    const sortedData = [...filteredItems].sort((a, b) => {
      return sortOrder === "asc"
        ? parseDate(a.time) - parseDate(b.time)
        : parseDate(b.time) - parseDate(a.time);
    });
    setFilteredItems(sortedData);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "sharedNotifications"]}
    >
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <TextField
            label="Device ID"
            variant="outlined"
            size="small"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          />
          <TextField
            label="Device Name"
            variant="outlined"
            size="small"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
          />
          <Button
            variant="outlined"
            color="primary"
            onClick={fetchNotifications}
          >
            {loading ? "Fetching..." : "Fetch Data"}
          </Button>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Device ID</TableCell>
              <TableCell>Device Name</TableCell>
              <TableCell>Topic</TableCell>
              {/* <TableCell>Notification Body</TableCell> */}
              <TableCell>
                <TableSortLabel
                  active
                  direction={sortOrder}
                  onClick={handleSort}
                >
                  Created At
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading ? (
              filteredItems
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.device_id}</TableCell>
                    <TableCell>{item.device_name}</TableCell>
                    <TableCell>{item.topic}</TableCell>
                    {/* <TableCell>
                    {JSON.stringify(item.notification_body)}
                  </TableCell> */}
                    <TableCell>{item.time}</TableCell>
                  </TableRow>
                ))
            ) : (
              <TableShimmer columns={5} />
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={filteredItems.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) =>
            setRowsPerPage(parseInt(e.target.value, 10))
          }
        />
      </div>
    </PageLayout>
  );
};

export default NotificationLogsPage;
