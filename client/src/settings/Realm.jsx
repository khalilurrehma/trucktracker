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
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { toast, ToastContainer } from "react-toastify";
import {
  allSubaccounts,
  allSubaccountsOfUser,
  getRealmById,
  getRealms,
  newRealm,
} from "../apis/api";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../AppContext";

const Realm = () => {
  const { traccarUser } = useAppContext();
  const [name, setName] = useState("");
  const [publicInfo, setPublicInfo] = useState(false);
  const [publicNameBox, setPublicNameBox] = useState(false);
  const [publicName, setPublicName] = useState("");
  const [publicDescriptionBox, setPublicDescriptionBox] = useState(false);
  const [publicDescription, setPublicDescription] = useState("");
  const [publicLogoBox, setPublicLogoBox] = useState(false);
  const [publicLogo, setPublicLogo] = useState("");
  const [tokenTTl, setTokenTTl] = useState(86400);
  const [tokenUnit, setTokenUnit] = useState("sec");
  const [subAccountId, setSubAccountId] = useState("");
  const [ownerIdBox, setOwnerIdBox] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [limitIdBox, setLimitIdBox] = useState(false);
  const [limitId, setLimitId] = useState("");
  const [usersHome, setUsersHome] = useState([
    { id: 0, name: "All users in the current account" },
    { id: 1, name: "All users in the selected subaccount" },
    { id: 2, name: "Automatically create subaccount for each user" },
  ]);
  const [accessOptions, setAccessOptions] = useState([
    { value: 0, label: "Standard" },
    { value: 1, label: "Master" },
  ]);
  const [selectedAccess, setSelectedAccess] = useState(null);
  const [selectedHome, setSelectedHome] = useState([]);
  const [allowedOriginsBox, setAllowedOriginsBox] = useState(false);
  const [ipsWhitelistBox, setIpsWhitelistBox] = useState(false);
  const [subaccounts, setSubaccounts] = useState([]);
  const [selectedSubaccount, setSelectedSubaccount] = useState(null);
  const [cidBox, setcidBox] = useState(false);
  const [selectedCid, setSelectedCid] = useState(null);
  const [loading, setLoading] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is a required field!");
      return;
    }

    if (selectedHome.id === null) {
      toast.error("Please select a valid 'Home Type'!");
      return;
    }

    const body = {
      name,
      cid: selectedCid?.flespiId,
      public_name: publicName,
      public_description: publicDescription,
      logo_url: publicLogo,
      home_type: selectedHome?.id,
      home_subaccount_id: selectedSubaccount?.flespiId,
      home_limit_id: limitId,
      token_params_ttl: tokenTTl,
      ttlUnit: tokenUnit,
      token_params_access_type: selectedAccess,
      userId: traccarUser.id,
    };

    try {
      const res = await newRealm(body);
      if (res.status === true) {
        toast.success(res.message);
        setName("");
        setPublicName("");
        setPublicDescription("");
        setPublicLogo("");
        setSelectedHome([]);
        setSubAccountId("");
        setOwnerId("");
        setLimitId("");
        setTokenTTl(86400);
        setTokenUnit("sec");
        setSelectedAccess(0);
        setAllowedOriginsBox(false);
        setIpsWhitelistBox(false);
        setTimeout(() => {
          navigate(-1);
        }, [2000]);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchRealmById(id);
  }, []);

  useEffect(() => {
    fetchSubaccounts();
  }, [traccarUser?.id]);

  const fetchRealmById = async (realmId) => {
    try {
      const response = await getRealmById(realmId);

      response.map((realm) => {
        const config = JSON.parse(realm.flespi_realm_config);

        if (config.name) setName(config.name);
        if (config.public_info) setPublicInfo(true);
        if (config.public_info.name) {
          setPublicNameBox(true);
          setPublicName(config.public_info.name);
        }
        if (config.public_info.description) {
          setPublicDescriptionBox(true);
          setPublicDescription(config.public_info.description);
        }
        if (config.public_info.logo_url) {
          setPublicLogoBox(true);
          setPublicLogo(config.public_info.logo_url);
        }
        if (config.home)
          setSelectedHome(usersHome.find((h) => h.id === config.home.type));
        if (config.home_subaccount_id)
          setSubAccountId(config.home_subaccount_id);
        if (config.home_limit_id) setLimitId(config.home_limit_id);
        if (config.token_params) setTokenTTl(config.token_params.ttl);
        if (config.ttlUnit) setTokenUnit(config.ttlUnit);
        if (config.token_params.access) {
          const matchedAccess = accessOptions.find(
            (a) => a.value === config.token_params.access.type
          );
          setSelectedAccess(matchedAccess ? matchedAccess.value : 0);
        }
        if (config.token_params.origins) setAllowedOriginsBox(true);
        if (config.ips_whitelist) setIpsWhitelistBox(true);
      });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSubaccounts = async () => {
    setLoading(true);
    try {
      const res = traccarUser?.superAdmin
        ? await allSubaccounts()
        : await allSubaccountsOfUser(traccarUser?.id);

      setSubaccounts(res);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "usageControlReport"]}
    >
      <ToastContainer />
      <Box sx={{ p: 4 }}>
        <Paper
          elevation={3}
          sx={{ p: 4, mt: 2, maxWidth: "60%", margin: "0 auto" }}
        >
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={cidBox}
                    onChange={(e) => {
                      setcidBox(e.target.checked);
                      // if (!e.target.checked) {
                      // }
                    }}
                    name="cid_info"
                  />
                }
                label="Create for Subaccount"
              />
              {cidBox && (
                <Autocomplete
                  sx={{ mt: 1 }}
                  fullWidth
                  options={subaccounts}
                  getOptionLabel={(option) =>
                    option.name || "Unnamed Subaccount"
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.id === value?.id
                  }
                  loading={loading}
                  value={selectedCid}
                  onChange={(event, newValue) => {
                    setSelectedCid(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Subaccounts"
                      placeholder="Search subaccounts..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={publicInfo}
                    onChange={(e) => {
                      setPublicInfo(e.target.checked);
                      if (!e.target.checked) {
                        setPublicName("");
                        setPublicDescription("");
                        setPublicLogo("");
                      }
                    }}
                    name="publicInfo"
                  />
                }
                label="Public Information"
              />
              {publicInfo && (
                <Box
                  sx={{
                    mt: 2,
                    display: "grid",
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Checkbox
                      checked={publicNameBox}
                      onChange={(e) => {
                        setPublicNameBox(e.target.checked);
                        if (!e.target.checked) {
                          setPublicName("");
                        }
                      }}
                      name="publicName"
                    />
                    {!publicNameBox && <Typography>Name</Typography>}
                    {publicNameBox && (
                      <TextField
                        fullWidth
                        label="Enter Name"
                        value={publicName || ""}
                        onChange={(e) => setPublicName(e.target.value)}
                        size="small"
                        sx={{ maxWidth: "400px" }}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Checkbox
                      checked={publicDescriptionBox}
                      onChange={(e) => {
                        setPublicDescriptionBox(e.target.checked);
                        if (!e.target.checked) {
                          setPublicDescription("");
                        }
                      }}
                      name="publicDescription"
                    />
                    {!publicDescriptionBox && (
                      <Typography>Description</Typography>
                    )}
                    {publicDescriptionBox && (
                      <TextField
                        fullWidth
                        label="Enter Description"
                        name="publicDescriptionValue"
                        value={publicDescription || ""}
                        onChange={(e) => setPublicDescription(e.target.value)}
                        size="small"
                        sx={{ maxWidth: "400px" }}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Checkbox
                      checked={publicLogoBox}
                      onChange={(e) => {
                        setPublicLogoBox(e.target.checked);
                        if (!e.target.checked) {
                          setPublicLogo("");
                        }
                      }}
                      name="publicLogo"
                    />
                    {!publicLogoBox && <Typography>Logo URL</Typography>}
                    {publicLogoBox && (
                      <TextField
                        fullWidth
                        label="Enter Logo URL"
                        name="publicLogoValue"
                        value={publicLogo || ""}
                        onChange={(e) => setPublicLogo(e.target.value)}
                        size="small"
                        sx={{ maxWidth: "400px" }}
                      />
                    )}
                  </Box>
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>User's Home</InputLabel>
                <Select
                  name="userHome"
                  value={selectedHome}
                  onChange={(e) => setSelectedHome(e.target.value)}
                >
                  {usersHome.map((home) => (
                    <MenuItem key={home.id} value={home}>
                      {home.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedHome.id === 1 ? (
                <Autocomplete
                  fullWidth
                  options={subaccounts}
                  getOptionLabel={(option) =>
                    option.name || "Unnamed Subaccount"
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.id === value?.id
                  }
                  loading={loading}
                  value={selectedSubaccount}
                  onChange={(event, newValue) => {
                    setSelectedSubaccount(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Subaccount"
                      placeholder="Search subaccounts..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              ) : selectedHome.id === 2 ? (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={ownerIdBox}
                        onChange={(e) => {
                          setOwnerIdBox(e.target.checked);
                          if (!e.target.checked) {
                            setSubAccountId("");
                          }
                        }}
                        name="subaccount_Id"
                      />
                    }
                    label="Subaccount_Id"
                  />
                  {ownerIdBox && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <TextField
                        fullWidth
                        label="Subaccount ID"
                        name="subaccountId"
                        type="number"
                        value={subAccountId}
                        onChange={(e) => setSubAccountId(e.target.value)}
                      />
                    </Box>
                  )}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={limitIdBox}
                        onChange={(e) => {
                          setLimitIdBox(e.target.checked);
                          if (!e.target.checked) {
                            setLimitId("");
                          }
                        }}
                        name="limitIdCheck"
                      />
                    }
                    label="Limit_Id"
                  />
                  {limitIdBox && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <TextField
                        fullWidth
                        label="Limit Id"
                        value={limitId}
                        onChange={(e) => setLimitId(e.target.value)}
                        size="small"
                        sx={{ maxWidth: "400px" }}
                      />
                    </Box>
                  )}
                </FormControl>
              ) : (
                ""
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography sx={{ mt: 4, mb: 2 }}>
                Default users' token parameters
              </Typography>
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
                sx={{ padding: 0 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1">Access</Typography>
              <ToggleButtonGroup
                value={selectedAccess}
                exclusive
                onChange={(e, newValue) => setSelectedAccess(newValue)}
              >
                {accessOptions.map((item, idx) => (
                  <ToggleButton value={item.value} key={idx}>
                    {item.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allowedOriginsBox}
                    onChange={(e) => setAllowedOriginsBox(e.target.checked)}
                    name="allowedOrigins"
                  />
                }
                label="Allowed Origins (*)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={ipsWhitelistBox}
                    onChange={(e) => setIpsWhitelistBox(e.target.checked)}
                    name="ipsWhitelist"
                  />
                }
                label="IPs Whitelist"
              />
            </Grid>
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
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              sx={{ padding: "20px 30px" }}
            >
              Submit
            </Button>
          </div>
        </Paper>
      </Box>
    </PageLayout>
  );
};

export default Realm;
