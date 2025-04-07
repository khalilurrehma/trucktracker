import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Button,
  Paper,
  Grid,
  IconButton,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  MenuList,
  List,
  ListItem,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextareaAutosize,
  Chip,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import AddIcon from "@mui/icons-material/Add";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import { createRealmUser, modifyRealmUser, RealmUserById } from "../apis/api";
import { useAppContext } from "../AppContext";
import SelectACLIds from "./components/SelectACLIds";
import { Oval } from "react-loader-spinner";
import NewLinkField from "../common/components/NewLinkField";
import { useTranslation } from "../common/components/LocalizationProvider";
import ConnectionUI from "./components/ConnectionUI";
import { useAdministrator } from "../common/util/permissions";
import { useSelector } from "react-redux";

const RealmUser = () => {
  const { traccarUser } = useAppContext();
  const [searchParams] = useSearchParams();
  const { id, realmUserId } = useParams();
  const action = searchParams.get("action");
  const traccarId = searchParams.get("traccarId");
  const navigate = useNavigate();
  const sessionUserId = useSelector((state) => state.session.user.id);
  const admin = useAdministrator();
  const t = useTranslation();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [deviceLimit, setDeviceLimit] = useState(-1);
  const [userLimit, setUserLimit] = useState(-1);
  const [email, setEmail] = useState("");
  const [tokenHomeBox, setTokenHomeBox] = useState(false);
  const [tokenParamsBox, setTokenParamsBox] = useState(false);
  const [tokenParamOptions, setTokenParamOptions] = useState([
    { id: null, label: "Default" },
    { id: 0, label: "Custom" },
  ]);

  const [selectedTokenParam, setSelectedTokenParam] = useState(
    tokenParamOptions[0]
  );

  const [accessOptions, setAccessOptions] = useState([
    { id: 0, label: "Non-Admin" },
    { id: 2, label: "Supervisor Admin" },
  ]);
  const [tokenTTl, setTokenTTl] = useState(86400);
  const [tokenUnit, setTokenUnit] = useState("sec");
  const [selectedAccess, setSelectedAccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [deviceReadOnly, setDeviceReadOnly] = useState(false);
  const [changeEmail, setChangeEmail] = useState(false);
  const [afterResponseBody, setAfterResponseBody] = useState(null);
  const [showConnectionUI, setShowConnectionUI] = useState(false);

  const handleSubmit = async (realmId, userId) => {
    if (!name || !email) {
      toast.error("Name and Email are required");
      return;
    }

    if (!action && password.length <= 16) {
      toast.error("Password must be at least 17 characters long");
      return;
    }

    const body = {
      name,
      email,
      password,
      deviceLimit,
      userLimit,
      userId: sessionUserId,
      token_params: selectedTokenParam?.id,
      token_params_access_type: selectedAccess?.id,
      token_params_ttl: tokenTTl,
      tokenUnit,
      readOnly,
      deviceReadOnly,
      changeEmail,
      attributes: {
        non_admin: sessionUserId !== 1 && admin ? true : false,
      },
    };
    try {
      setIsLoading(true);
      const response = userId
        ? await modifyRealmUser(realmId, userId, body)
        : await createRealmUser(sessionUserId, realmId, body);

      if (response.status === true) {
        toast.success(response.message);
        setAfterResponseBody(response.data);
        setShowConnectionUI(true);
        // navigate(-1);
      }
    } catch (error) {
      console.error(error);
      userId
        ? toast.error("Failed to modify realm user")
        : toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealmUser(id, realmUserId);
  }, [id, realmUserId]);

  const fetchRealmUser = async (realmId, userId) => {
    try {
      const response = await RealmUserById(realmId, userId);
      response.map((user) => {
        const parsedUserBody = JSON.parse(user.realm_user_body);
        const parsedTraccarBody = JSON.parse(user.traccar_user_body);

        setName(parsedUserBody?.name);
        setEmail(parsedTraccarBody.email);
        setTokenHomeBox(parsedUserBody?.home);
        setTokenParamsBox(parsedUserBody?.token_params);
        setSelectedTokenParam(
          parsedUserBody?.token_params ? { id: 0, label: "Custom" } : null
        );
        setTokenTTl(parsedUserBody?.token_params?.ttl);
        setSelectedAccess(
          accessOptions.find(
            (option) => option.id === parsedUserBody?.token_params?.access?.type
          )
        );
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "usageControlReport"]}
    >
      <ToastContainer />
      {showConnectionUI ? (
        <ConnectionUI
          wherePath={`/settings/realm/${afterResponseBody?.realm_id}/${afterResponseBody?.flespi_user_id}/user/${afterResponseBody?.traccar_user_body.id}/connections`}
        />
      ) : (
        <Box sx={{ p: 4 }}>
          <Paper
            elevation={3}
            sx={{ p: 4, mt: 2, maxWidth: "40%", margin: "0 auto" }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Name"
                  fullWidth
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  fullWidth
                  name="Email"
                  required
                  value={email}
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Grid>
              {action !== "edit" && (
                <Grid item xs={12}>
                  <TextField
                    label="Password"
                    fullWidth
                    name="Password"
                    required
                    value={password}
                    type="password"
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Grid>
              )}
              {traccarUser?.superAdmin && (
                <Grid item xs={12} display="flex" gap={4}>
                  <TextField
                    label="Device Limit"
                    fullWidth
                    name="Device Limit"
                    required
                    value={deviceLimit}
                    type="number"
                    onChange={(e) => setDeviceLimit(e.target.value)}
                  />
                  <TextField
                    label="User Limit"
                    fullWidth
                    name="User Limit"
                    required
                    value={userLimit}
                    type="number"
                    onChange={(e) => setUserLimit(e.target.value)}
                  />
                </Grid>
              )}
              <>
                <Grid item xs={12} sx={{ mt: 1 }}>
                  {action !== "edit" && (
                    <TextField
                      fullWidth
                      label="Token TTL (seconds)"
                      name="tokenTTL"
                      type="number"
                      value={tokenTTl}
                      onChange={(e) => setTokenTTl(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Select
                              value={tokenUnit || "sec"}
                              onChange={(e) => setTokenUnit(e.target.value)}
                              displayEmpty
                              sx={{ minWidth: 120, height: 40, ml: "12%" }}
                            >
                              <MenuItem value="sec">sec</MenuItem>
                              <MenuItem value="min">min</MenuItem>
                              <MenuItem value="hours">hours</MenuItem>
                              <MenuItem value="days">days</MenuItem>
                              <MenuItem value="week">week</MenuItem>
                              <MenuItem value="month">month</MenuItem>
                              <MenuItem value="year">year</MenuItem>
                            </Select>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ padding: 0, mt: 1 }}
                    />
                  )}
                </Grid>

                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Typography variant="subtitle1">Access</Typography>
                  <ToggleButtonGroup
                    value={selectedAccess}
                    exclusive
                    onChange={(e, newValue) => setSelectedAccess(newValue)}
                  >
                    {accessOptions.map((item, idx) => (
                      <ToggleButton value={item} key={idx}>
                        {item.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Grid>

                <Grid item xs={12} mt={1} display="flex" flexDirection="column">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={readOnly}
                        onChange={(e) => {
                          setReadOnly(e.target.checked);
                        }}
                        name="readonly"
                      />
                    }
                    label="Readonly"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={deviceReadOnly}
                        onChange={(e) => {
                          setDeviceReadOnly(e.target.checked);
                        }}
                        name="device_readonly"
                      />
                    }
                    label="Device Readonly"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={changeEmail}
                        onChange={(e) => {
                          setChangeEmail(e.target.checked);
                        }}
                        name="no_email_change"
                      />
                    }
                    label="No Email Change"
                  />
                </Grid>
              </>
            </Grid>

            <div className="flex justify-center gap-12 mt-8">
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate(-1)}
                sx={{ padding: "20px 30px" }}
              >
                Cancel
              </Button>
              {isLoading ? (
                <Oval
                  visible={true}
                  height="30"
                  width="50"
                  color="#1a237e"
                  ariaLabel="oval-loading"
                  wrapperStyle={{}}
                  wrapperClass=""
                />
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleSubmit(id, realmUserId)}
                  sx={{ padding: "20px 30px" }}
                >
                  Submit
                </Button>
              )}
            </div>
          </Paper>
        </Box>
      )}
    </PageLayout>
  );
};

export default RealmUser;
