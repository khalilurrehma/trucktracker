import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  IconButton,
  Typography,
  Box,
  Paper,
  Toolbar,
  CircularProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Login as LoginIcon,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import SettingLoader from "./common/SettingLoader";
import { ToastContainer, toast } from "react-toastify";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import { allSubaccounts, allSubaccountsOfUser } from "../apis/api";
import { useAppContext } from "../AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useCatch } from "../reactHelper";
import { useTranslation } from "../common/components/LocalizationProvider";

const Subaccounts = () => {
  const [subaccounts, setSubaccounts] = useState([]);
  const [filteredSubaccounts, setFilteredSubaccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowLoading, setRowLoading] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const navigate = useNavigate();
  const { traccarUser } = useAppContext();
  const t = useTranslation();

  let url;

  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  useEffect(() => {
    fetchSubaccounts();
  }, [traccarUser]);

  const fetchSubaccounts = async () => {
    setLoading(true);
    try {
      const res = traccarUser?.superAdmin
        ? await allSubaccounts()
        : await allSubaccountsOfUser(traccarUser?.id);

      setFilteredSubaccounts(res);
      setLoading(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = subaccounts.filter(
      (subaccount) =>
        subaccount.name.toLowerCase().includes(query) ||
        subaccount.email.toLowerCase().includes(query)
    );
    setFilteredSubaccounts(filtered);
  };

  const handleSort = (key) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    const sortedData = [...filteredSubaccounts].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setSortConfig({ key, direction });
    setFilteredSubaccounts(sortedData);
  };

  const handleDelete = async (id) => {
    try {
      setRowLoading((prev) => ({ ...prev, [id]: true }));
      const response = await axios.delete(`${url}/subaccount/${id}`);
      if (response.status === 200) {
        toast.success(response.data.message);
        setFilteredSubaccounts((prevData) =>
          prevData.filter((item) => item.id !== id)
        );
      } else {
        console.error(
          `Failed to delete group with ID ${id}:`,
          response.data.error
        );
      }
    } catch (error) {
      console.error(`Error deleting group with ID ${id}:`, error);
    } finally {
      setRowLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleLogin = useCatch(async (userId) => {
    const response = await fetch(`/api/session/${userId}`);
    if (response.ok) {
      window.location.replace("/");
    } else {
      throw Error(await response.text());
    }
  });

  const handleConnectionNav = (userId, subaccountId) => {
    if (!userId) {
      toast.error("User Id not found.");
      return;
    } else {
      navigate(
        `/settings/user/${userId}/subaccount/${subaccountId}/connections`
      );
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "settingsUser"]}
    >
      <ToastContainer />
      <Toolbar>
        <TextField
          variant="outlined"
          size="small"
          label={t("sharedSearch")}
          value={searchQuery}
          onChange={handleSearch}
          sx={{ marginRight: 2 }}
        />
      </Toolbar>
      <TableContainer sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "name"}
                  direction={
                    sortConfig.key === "name" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("name")}
                >
                  {t("sharedName")}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "email"}
                  direction={
                    sortConfig.key === "email" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("email")}
                >
                  {t("userEmail")}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "devicesLimit"}
                  direction={
                    sortConfig.key === "devicesLimit"
                      ? sortConfig.direction
                      : "asc"
                  }
                  onClick={() => handleSort("devicesLimit")}
                >
                  {t("devicesLimit")}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === "created"}
                  direction={
                    sortConfig.key === "created" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSort("created")}
                >
                  {t("sharedCreated")}
                </TableSortLabel>
              </TableCell>
              <TableCell>{t("sharedAdmin")}</TableCell>
              <TableCell>{t("sharedDashboard")}</TableCell>
              <TableCell>{t("sharedAction")}</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableCell content="center">
                <SettingLoader />
              </TableCell>
            ) : (
              filteredSubaccounts.map((row, idx) => {
                console.log(row);

                return (
                  <TableRow key={idx}>
                    <TableCell
                      onClick={() => navigate(`/settings/new-token/${row.id}`)}
                      sx={{ cursor: "pointer" }}
                    >
                      {row.name}
                    </TableCell>
                    <TableCell
                      onClick={() => navigate(`/settings/new-token/${row.id}`)}
                      sx={{ cursor: "pointer" }}
                    >
                      {row.email}
                    </TableCell>
                    <TableCell>{row.deviceLimit}</TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell>
                      {row.administrator === true ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() =>
                          navigate(
                            `/settings/subaccount/${row.flespiId}/dashboard/${row.name}`
                          )
                        }
                      >
                        <DashboardIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <LoginIcon
                          fontSize="small"
                          onClick={() => handleLogin(row.traccarId)}
                        />
                      </IconButton>
                      <IconButton size="small">
                        <LinkIcon
                          fontSize="small"
                          onClick={() =>
                            handleConnectionNav(row.traccarId, row.flespiId)
                          }
                        />
                      </IconButton>
                      <IconButton>
                        <EditIcon
                          color="primary"
                          onClick={() =>
                            navigate(`/settings/subaccount/${row.id}`)
                          }
                        />
                      </IconButton>
                      {rowLoading[row.id] ? (
                        <CircularProgress
                          color="primary"
                          size="1.2rem"
                          variant="indeterminate"
                        />
                      ) : (
                        <IconButton>
                          <DeleteIcon
                            color="error"
                            onClick={() => handleDelete(row.id)}
                          />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <CollectionFab editPath="/settings/subaccount" />
    </PageLayout>
  );
};

export default Subaccounts;
