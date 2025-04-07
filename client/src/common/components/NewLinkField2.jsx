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

const NewLinkField = ({
  label,
  newendpoint,
  endpointAll,
  endpoint,
  endpointLinked,
  calcEndPoint,
  linkedCalc,
  companyTraccarId,
  baseId,
  keyBase,
  keyLink,
  keyGetter = (item) => item.traccarId,
  titleGetter = (item) => item.name,
  flespiAddUrl,
  flespiRemoveUrl,
  componentType,
}) => {
  let { id } = useParams();
  const { traccarUser } = useAppContext();
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
    if (id) {
      if (label !== "Calculators") {
        try {
          setLoading(true);
          const childrenApiUrl = `${url}/${newendpoint}/user/${id}`;
          const apiUrl = `${url}/${newendpoint}`;

          const [
            childrenGroupsResponse,
            newGroupsResponse,
            permissionGroupsResponse,
          ] = await Promise.all([
            axios.get(childrenApiUrl),
            axios.get(apiUrl),
            fetch(endpoint),
          ]);

          if (
            childrenGroupsResponse.status === 200 &&
            newGroupsResponse.status === 200 &&
            permissionGroupsResponse.ok
          ) {
            const newGroups = newGroupsResponse.data.data;
            const permissionGroups = await permissionGroupsResponse.json();
            const matchedGroups = findMatchingGroups(
              newGroups,
              permissionGroups
            );
            const childrenGroups = childrenGroupsResponse.data.data;
            const combinedTransformedGroups = transformAndMergeData(
              matchedGroups,
              childrenGroups
            );

            const formattedTransformedGroups = combinedTransformedGroups
              ?.map((item) => {
                return {
                  ...item,
                  traccarId: item?.id,
                };
              })
              ?.filter((item) => item?.role !== "superAdmin");

            setItems(formattedTransformedGroups);
          } else {
            throw new Error("Failed to fetch data from one of the APIs");
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      } else {
        try {
          setLoading(true);
          const apiUrl = `${url}/${calcEndPoint}/${companyTraccarId}`;

          const response = await axios.get(apiUrl);
          if (response.status === 200) {
            const transformedData = response.data.message.map((item) => {
              return {
                ...item,
                traccarId: item.id,
              };
            });

            setItems(transformedData);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  function transformData(groups) {
    return groups.map((group) => {
      return {
        id: group.traccarId,
        name: group.name,
        role: group?.created_role,
      };
    });
  }

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
      fetchDataFromAPI();
    }
  }, [active, endpointAll]);

  const getLinkedCalcs = async () => {
    const { data } = await axios.get(`${url}/${linkedCalc}`);
    if (data.status === true) {
      const formattedResponse = data.message.map((item) => {
        return {
          ...item,
          traccarId: item.id,
        };
      });

      setLinked(formattedResponse);
    }
  };

  useEffectAsync(async () => {
    if (active) {
      if (label !== "Calculators") {
        const response = await fetch(endpointLinked);
        if (response.ok) {
          const data = await response.json();
          const formattedResponse = data?.map((item) => {
            return {
              ...item,
              traccarId: item.id,
            };
          });
          setLinked(formattedResponse);
        } else {
          throw Error(await response.text());
        }
      } else {
        getLinkedCalcs();
      }
    }
  }, [active, endpointLinked, linkedCalc]);

  const createBody = (linkId) => {
    const body = {};
    body[keyBase] = baseId;
    body[keyLink] = linkId;
    return body;
  };

  const bulkUpdatePermissions = async (addedItems, removedItems) => {
    // console.log(addedItems);
    // console.log(removedItems);

    const addedPromises = addedItems.map((added) => {
      return fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createBody(added)),
      });
    });

    if (addedItems.length > 0) {
      await axios.put(`${url}/${flespiAddUrl}`, {
        addedItems,
      });
    }

    if (removedItems.length > 0) {
      await axios.put(`${url}/${flespiRemoveUrl}`, {
        removedItems,
      });
    }

    const removedPromises = removedItems.map((removed) => {
      return fetch("/api/permissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createBody(removed)),
      });
    });

    await Promise.all([...addedPromises, ...removedPromises]);
  };

  const calcsUpdatePermissions = async (addedItems, removedItems) => {
    if (addedItems?.length > 0) {
      await axios.put(`${url}/${flespiAddUrl}`, {
        addedItems,
      });
    }

    if (removedItems?.length > 0) {
      await axios.put(`${url}/${flespiRemoveUrl}`, {
        removedItems,
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
        label === "Calculators"
          ? await calcsUpdatePermissions(addedItems, removedItems)
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
      {items && linked && (
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
            {/* <Button
              variant="outlined"
              color="primary"
              onClick={() => onChange([])}
              disabled={allItemsUnselected || disableUI}
              style={{ width: "48%" }}
            >
              Remove All
            </Button> */}
          </div>
        </>
      )}
      {componentType == 1 && (
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
      )}
      {componentType == 2 && (
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
      )}
    </>
  );
};

export default NewLinkField;
