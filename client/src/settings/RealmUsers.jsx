import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  Button,
  Box,
} from "@mui/material";
import { Delete, Edit, Login, Link, Key } from "@mui/icons-material";
import { allRealmUsers, deleteRealmUser } from "../apis/api";
import { convertISODate } from "./common/New.Helper";
import { toast, ToastContainer } from "react-toastify";
import { useCatch } from "../reactHelper";
import axios from "axios";

const RealmUsers = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const { id } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    fetchUsers(id);
  }, []);

  const fetchUsers = async (realmId) => {
    try {
      const response = await allRealmUsers(realmId);

      const formattedResponse = await Promise.all(
        response
          ?.filter((_, index) => index !== 0)
          .map(async (user) => {
            const parsedTraccarBody = JSON.parse(user.traccar_user_body);

            const traccarToken = await axios
              .get(`${url}/traccar-token/${parsedTraccarBody.id}`)
              .then((res) => res.data.data[0]?.token)
              .catch((error) => {
                console.error("Error fetching token:", error);
              });

            return {
              ...user,
              traccarToken,
            };
          })
      );

      setUsers(formattedResponse);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (realmId, userId, flespiId) => {
    try {
      const deleted = await deleteRealmUser(realmId, userId, flespiId);
      if (deleted.status === true) {
        toast.success(deleted.message);
        fetchUsers(realmId);
      }
    } catch (error) {
      toast.error(error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleLogin = useCatch(async (userId) => {
    const response = await fetch(`/api/session/${userId}`);
    if (response.ok) {
      window.location.replace("/");
    } else {
      throw Error(await response.text());
    }
  });

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "usageControlReport"]}
    >
      <ToastContainer />
      {users.length > 0 ? (
        <Grid container spacing={2} sx={{ padding: 2 }}>
          {users.map((user) => {
            const userBody = JSON.parse(user.realm_user_body);
            const traccar_body = JSON.parse(user.traccar_user_body);
            const created_at = convertISODate(user.created_at);

            return (
              <Grid item xs={12} sm={6} md={4} key={user.id}>
                <Card variant="outlined" sx={{ padding: 1 }}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{ fontWeight: "bold" }}
                    >
                      {userBody.name}
                    </Typography>
                    <Divider sx={{ marginY: 1 }} />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ marginBottom: 1 }}
                    >
                      <strong>Created At:</strong> {created_at}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ marginBottom: 1 }}
                    >
                      <strong>ID:</strong> {user.flespi_user_id}
                    </Typography>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "1px",
                      }}
                    >
                      <IconButton color="default" size="small">
                        <Login
                          onClick={() => {
                            handleLogin(traccar_body?.id);
                          }}
                        />
                      </IconButton>
                      <IconButton color="default" size="small">
                        <Link
                          onClick={() => {
                            navigate(
                              `/settings/realm/${user?.realm_id}/${user?.flespi_user_id}/user/${traccar_body?.id}/connections`
                            );
                          }}
                        />
                      </IconButton>
                      <IconButton color="default" size="small">
                        <Edit
                          onClick={() => {
                            navigate(
                              `/settings/realm/${id}/user/${user.id}?traccarId=${traccar_body?.id}&action=edit`
                            );
                          }}
                        />
                      </IconButton>
                      <IconButton color="default" size="small">
                        <Delete
                          onClick={() =>
                            handleDelete(id, user.id, user.flespi_user_id)
                          }
                        />
                      </IconButton>
                    </div>
                    {user.token && (
                      <>
                        <Divider sx={{ marginY: 1 }} />
                        <Tooltip title="Click to copy" arrow>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              marginBottom: 1,
                              display: "flex",
                              alignItems: "center",
                              cursor: "pointer",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              transition: "all 0.3s",
                              "&:hover": {
                                overflow: "visible",
                                whiteSpace: "normal",
                                background: "#f5f5f5",
                                // padding: "4px",
                                borderRadius: "4px",
                              },
                            }}
                            onClick={() => copyToClipboard(user.token)}
                          >
                            <strong>Token:</strong>{" "}
                            <span
                              style={{
                                filter: "blur(3px)",
                                marginLeft: "8px",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.filter = "none")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.filter = "blur(3px)")
                              }
                            >
                              {user.token?.substring(0, 20)}...
                              {user.token?.slice(-8)}
                            </span>
                          </Typography>
                        </Tooltip>
                        <Divider sx={{ marginY: 1 }} />
                        {user?.traccarToken ? (
                          <Box>
                            <Tooltip title="Click to copy" arrow>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  marginBottom: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  cursor: "pointer",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  transition: "all 0.3s",
                                  "&:hover": {
                                    overflow: "visible",
                                    whiteSpace: "normal",
                                    background: "#f5f5f5",
                                    borderRadius: "4px",
                                  },
                                }}
                                onClick={() =>
                                  copyToClipboard(user.traccarToken)
                                }
                              >
                                <strong>T-Token:</strong>{" "}
                                <span
                                  style={{
                                    filter: "blur(3px)",
                                    marginLeft: "8px",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.filter = "none")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.filter = "blur(3px)")
                                  }
                                >
                                  {user.traccarToken?.substring(0, 20)}...
                                  {user.traccarToken?.slice(-8)}
                                </span>
                              </Typography>
                            </Tooltip>
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<Key />}
                              onClick={() =>
                                navigate(
                                  `/settings/realm/${id}/new-token/user/${user?.id}`
                                )
                              }
                            >
                              New T-Token
                            </Button>
                          </Box>
                        ) : (
                          <Button
                            variant="text"
                            startIcon={<Key />}
                            onClick={() =>
                              navigate(
                                `/settings/realm/${id}/new-token/user/${user?.id}`
                              )
                            }
                          >
                            Add T-Token
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Typography variant="h6" sx={{ marginY: 2 }}>
          No users found in this realm.
        </Typography>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="info"
          sx={{ width: "100%" }}
        >
          ID copied to clipboard!
        </Alert>
      </Snackbar>
      <CollectionFab editPath={`/settings/realm/${id}/user`} />
    </PageLayout>
  );
};

export default RealmUsers;
