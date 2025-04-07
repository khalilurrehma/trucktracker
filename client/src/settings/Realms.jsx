import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Login,
  FolderShared,
  PersonAdd,
  ContentCopy,
  Star,
  StarOutline,
  Timelapse,
  Edit,
  Group,
} from "@mui/icons-material";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import { getRealms, getRealmsByUserId } from "../apis/api";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../AppContext";

const Realms = () => {
  const [realms, setRealms] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const { traccarUser } = useAppContext();

  const navigate = useNavigate();

  useEffect(() => {
    fetchAllRealms();
  }, [traccarUser]);

  const fetchAllRealms = async () => {
    try {
      const response = traccarUser?.superAdmin
        ? await getRealms()
        : await getRealmsByUserId(traccarUser?.id);

      const formattedResponse = response.map((realm) => {
        const { flespi_realm_config, created_at, ...realmItem } = realm;
        return {
          ...realmItem,
          realmConfig: JSON.parse(realm.flespi_realm_config),
          created_at: new Date(realm.created_at),
        };
      });

      setRealms(formattedResponse);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyRealmId = (id) => {
    navigator.clipboard.writeText(id);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "usageControlReport"]}
    >
      <Box
        sx={{
          padding: 2,
          backgroundColor: "#f5f5f5",
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <Grid container spacing={2}>
          {realms.map((realm, index) => {
            const config = realm.realmConfig;
            const access = config.token_params.access.type;

            return (
              <Grid item xs={12} key={realm.id}>
                <Card
                  sx={{
                    backgroundColor: access === 1 ? "#D6DBFF" : "#FFF4E0",
                    display: "flex",
                    alignItems: "center",
                    padding: 2,
                    borderRadius: 2,
                    cursor: "pointer",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <FolderShared
                      sx={{ fontSize: 36, marginRight: 2, color: "gray" }}
                    />
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {realm.flespi_realm_name}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          color: "gray",
                        }}
                      >
                        <Tooltip title="Copy ID">
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleCopyRealmId(realm.flespi_realm_public_id)
                            }
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Typography variant="body2" sx={{ marginRight: 1 }}>
                          {realm.flespi_realm_public_id}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                    }}
                  >
                    {access === 1 && (
                      <Star sx={{ color: "gray", marginRight: 1 }} />
                    )}
                    {access === 0 && (
                      <StarOutline sx={{ color: "gray", marginRight: 1 }} />
                    )}
                    <Typography variant="body2" color="textSecondary">
                      {access === 1 ? "Master" : "Standard"}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        marginLeft: 3,
                      }}
                    >
                      <Timelapse sx={{ fontSize: 18, marginRight: 1 }} />
                      <Typography variant="body2" color="textSecondary">
                        TTL in a day
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      //   flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <Button
                      variant="text"
                      startIcon={<Edit sx={{ fontSize: 42, color: "gray" }} />}
                      onClick={() =>
                        navigate(`/settings/realm/${realm.flespi_realm_id}`)
                      }
                      sx={{ fontSize: 18, color: "gray" }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="text"
                      startIcon={<Group sx={{ fontSize: 42, color: "gray" }} />}
                      onClick={() =>
                        navigate(
                          `/settings/realm/${realm.flespi_realm_id}/users`
                        )
                      }
                      sx={{ fontSize: 18, color: "gray" }}
                    >
                      Users
                    </Button>
                    <Button
                      variant="text"
                      startIcon={<Login sx={{ fontSize: 42, color: "gray" }} />}
                      onClick={() => console.log(`Login to realm ${realm.id}`)}
                      sx={{ fontSize: 18, color: "gray" }}
                    >
                      Login
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity="success"
            sx={{ width: "100%" }}
          >
            ID copied to clipboard!
          </Alert>
        </Snackbar>
      </Box>
      <CollectionFab editPath={"/settings/realm"} />
    </PageLayout>
  );
};

export default Realms;
