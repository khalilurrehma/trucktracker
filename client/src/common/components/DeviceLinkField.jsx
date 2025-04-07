import {
  Autocomplete,
  Button,
  Checkbox,
  FormControlLabel,
  ListItemText,
  MenuItem,
  MenuList,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useEffectAsync } from "../../reactHelper";
import { useAppContext } from "../../AppContext";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const DeviceLinkField = ({
  label,
  newendpoint,
  endpointAll,
  endpoint,
  endpointLinked,
  baseId,
  keyBase,
  keyLink,
  keyGetter = (item) => item.traccarId,
  titleGetter = (item) => item.name,
  flespiAddUrl,
  flespiRemoveUrl,
  flespiAdminAddUrl,
  flespiAdminRemoveUrl,
  auth,
}) => {
  let { deviceId, id } = useParams();

  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState();
  const [linked, setLinked] = useState();
  const [disableUI, setDisableUI] = useState(false);

  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const fetchDataFromAPI = async () => {
    try {
      setLoading(true);
      const apiUrl = `${url}/${newendpoint}`;
      console.log(apiUrl);

      const response = await axios.get(apiUrl);
      if (response.status === 200) {
        const transformedGroups = transformData(response.data.message);
        console.log(transformedGroups);

        setItems(transformedGroups);
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  // const fetchDataFromAPI = async () => {
  //   if (id) {
  //     try {
  //       setLoading(true);
  //       const childrenApiUrl = `${url}/${newendpoint}/user/${id}`;
  //       const apiUrl = `${url}/${newendpoint}`;

  //       const [
  //         childrenGroupsResponse,
  //         newGroupsResponse,
  //         permissionGroupsResponse,
  //       ] = await Promise.all([
  //         axios.get(childrenApiUrl),
  //         axios.get(apiUrl),
  //         fetch(endpoint),
  //       ]);

  //       if (
  //         childrenGroupsResponse.status === 200 &&
  //         newGroupsResponse.status === 200 &&
  //         permissionGroupsResponse.ok
  //       ) {
  //         const newGroups = newGroupsResponse.data.data;
  //         const permissionGroups = await permissionGroupsResponse.json();
  //         const matchedGroups = findMatchingGroups(newGroups, permissionGroups);
  //         const childrenGroups = childrenGroupsResponse.data.data;
  //         const combinedTransformedGroups = transformAndMergeData(
  //           matchedGroups,
  //           childrenGroups
  //         );

  //         const formattedTransformedGroups = combinedTransformedGroups
  //           ?.map((item) => ({
  //             ...item,
  //             traccarId: item?.id,
  //           }))
  //           ?.filter(
  //             (item) => item?.role !== "superAdmin" && item?.role !== undefined
  //           );

  //         console.log(formattedTransformedGroups);

  //         setItems(formattedTransformedGroups);
  //       } else {
  //         throw new Error("Failed to fetch data from one of the APIs");
  //       }
  //     } catch (error) {
  //       console.error(error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  // };

  const fetchFromApiForAdmin = async () => {
    try {
      setLoading(true);
      const apiUrl = `${url}/${newendpoint}`;
      const response = await axios.get(apiUrl);
      if (response.status === 200) {
        const transformedGroups = transformData(response.data.message);

        const formattedTransformedGroups = transformedGroups?.filter(
          (item) => item?.type === "custom"
        );

        setItems(formattedTransformedGroups);
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  function transformData(calcs) {
    return calcs.map((calc) => {
      let parsedType = calc.calc_type ? JSON.parse(calc.calc_type) : {};

      return {
        traccarId: !calc?.calc_id ? calc.id : calc?.calc_id,
        name: calc.name,
        type: parsedType.type,
      };
    });
  }

  // function transformData(groups) {
  //   return groups.map((group) => {
  //     return {
  //       id: group.traccarId,
  //       name: group.name,
  //       role: group?.created_role,
  //     };
  //   });
  // }

  function transformAndMergeData(groups1, groups2) {
    groups1 = groups1 || [];
    groups2 = groups2 || [];

    const transformedGroups1 = transformData(groups1);
    const transformedGroups2 = transformData(groups2);

    return [...transformedGroups1, ...transformedGroups2];
  }

  const findMatchingGroups = (newGroups, permissionGroups) => {
    return newGroups.filter((newGroup) => {
      return permissionGroups?.some(
        (permissionGroup) => permissionGroup.id === newGroup.traccarId
      );
    });
  };

  useEffectAsync(async () => {
    if (active) {
      if (auth === "superAdmin") {
        fetchFromApiForAdmin();
      } else {
        fetchDataFromAPI();
      }
    }
  }, [active, endpointAll]);

  const fetchLinkedItems = async () => {
    if (auth === "superAdmin") {
      try {
        const { data } = await axios.get(`${url}/${endpointLinked}`);

        if (data.status) {
          const formattedResponse = data.message
            ?.filter((item) => item.metadata && item.metadata.type === "custom")

            .map((item) => ({
              ...item,
              traccarId: item.id,
            }));

          setLinked(formattedResponse);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      try {
        const { data } = await axios.get(`${url}/${endpointLinked}`);

        if (data.status) {
          const formattedResponse = data.message
            ?.filter(
              (item) => item.metadata && item.metadata.calc_type === "custom"
            )

            .map((item) => ({
              ...item,
              traccarId: item.id,
            }));

          setLinked(formattedResponse);
        }
      } catch (error) {}
    }
  };

  useEffectAsync(async () => {
    if (active) {
      fetchLinkedItems();
    }
  }, [active, endpointLinked]);

  const createBody = (linkId) => {
    const body = {};
    body[keyBase] = baseId;
    body[keyLink] = linkId;
    return body;
  };

  const bulkUpdatePermissions = async (addedItems, removedItems) => {
    let data;

    if (addedItems?.length > 0) {
      data = {
        addedItems,
        deviceId: parseInt(deviceId),
      };

      await axios.post(`${url}/${flespiAddUrl}`, {
        data,
      });
    }

    if (removedItems?.length > 0) {
      data = {
        removedItems,
        deviceId: parseInt(deviceId),
      };

      await axios.post(`${url}/${flespiRemoveUrl}`, {
        data,
      });
    }
  };

  const bulkPermissionForSuperAdmin = async (addedItems, removedItems) => {
    let data;
    if (addedItems?.length > 0) {
      data = {
        addedItems,
        deviceId: parseInt(deviceId),
      };

      await axios.post(`${url}/${flespiAdminAddUrl}`, {
        data,
      });
    }

    if (removedItems?.length > 0) {
      data = {
        removedItems,
        deviceId: parseInt(deviceId),
      };

      await axios.post(`${url}/${flespiAdminRemoveUrl}`, {
        data,
      });
    }
  };

  const onChange = async (value) => {
    const oldValue = linked?.map((it) => it.traccarId);
    const newValue = value?.map((it) => it.traccarId);

    if (!newValue.find((it) => it < 0)) {
      const addedItems = newValue?.filter((it) => !oldValue?.includes(it));
      const removedItems = oldValue?.filter((it) => !newValue?.includes(it));

      setDisableUI(true);

      try {
        auth === "superAdmin"
          ? await bulkPermissionForSuperAdmin(addedItems, removedItems)
          : await bulkUpdatePermissions(addedItems, removedItems);
        setLinked(value);
      } catch (error) {
        console.error("Error updating permissions:", error);
      } finally {
        setDisableUI(false);
      }
    }
  };

  const allItemsSelected = linked?.length === items?.length;
  const allItemsUnselected = linked?.length === 0;

  return (
    <>
      <ToastContainer />
      {/* {items && linked && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "start",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  color="primary"
                  checked={allItemsSelected} // Check state
                  onChange={() => onChange(items)} // Call function when toggled
                  disabled={allItemsSelected || disableUI} // Disable if needed
                />
              }
              label={
                <Typography
                  variant="outlined"
                  color="primary"
                  style={{
                    fontSize: "14px",
                    cursor: "pointer",
                    // marginBottom: "-10px",
                  }}
                >
                  Add All
                </Typography>
              }
            />
          </div>
        </>
      )} */}

      <Autocomplete
        loading={loading}
        isOptionEqualToValue={(i1, i2) => keyGetter(i1) === keyGetter(i2)}
        options={items || []}
        getOptionLabel={(item) => titleGetter(item)}
        renderOption={(props, item) => (
          <li {...props}>
            <Checkbox
              checked={linked?.some(
                (linkedItem) => linkedItem.traccarId === item.traccarId
              )}
            />
            <ListItemText primary={titleGetter(item)} />
          </li>
        )}
        renderInput={(params) => <TextField {...params} label={label} />}
        value={(items && linked) || []}
        onChange={(_, value) => onChange(value)}
        open={open}
        onOpen={() => {
          setOpen(true);
          setActive(true);
        }}
        onClose={() => {
          setOpen(false);
        }}
        multiple
        disableCloseOnSelect
        limitTags={2}
        disabled={disableUI}
      />
    </>
  );
};

export default DeviceLinkField;
