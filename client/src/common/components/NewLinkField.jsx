import {
  Autocomplete,
  Button,
  Checkbox,
  ListItemText,
  MenuItem,
  MenuList,
  TextField,
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
  baseId,
  keyBase,
  keyLink,
  keyGetter = (item) => item.id,
  titleGetter = (item) => item.name,
  component,
  calcEndpointAll,
  calcAssignEndpoint,
  calcUnassignEndpoint,
  assignedCalcsEndpoint,
  traccarId,
  flespiId,
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
      if (component == 1) {
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
            const formattedItems = newGroups.map((item) => ({
              id: item.traccarId,
              name: item.name,
            }));
            setItems(formattedItems);
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
          const apiUrl = `${url}/${calcEndpointAll}`;
          const response = await axios.get(apiUrl);

          if (response.status === 200) {
            const transformedData = response.data.message.map((item) => {
              return {
                ...item,
                traccarId: item?.id,
                name: item?.name,
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
    return groups.map((group) => ({
      id: group.traccarId,
      name: group.name,
    }));
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
      // testfetchDataFromAPI();
    }
  }, [active, endpointAll]);

  const fetchAssignedCalcs = async () => {
    try {
      const response = await axios.get(`${url}/${assignedCalcsEndpoint}`);

      if (response.status === 200) {
        const transformedData = response.data?.message?.map((item) => {
          return {
            id: item?.id,
            name: item?.name,
            traccarId: item?.id,
          };
        });
        setLinked(transformedData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffectAsync(async () => {
    if (active) {
      if (component == 1) {
        const response = await fetch(endpointLinked);
        if (response.ok) {
          const data = await response.json();
          setLinked(data);
        } else {
          throw Error(await response.text());
        }
      } else {
        fetchAssignedCalcs();
      }
      // setLinked([])
    }
  }, [active, endpointLinked, assignedCalcsEndpoint]);
  

  const createBody = (linkId) => {
    const body = {};
    body[keyBase] = baseId;
    body[keyLink] = linkId;
    return body;
  };

  const bulkUpdatePermissions = async (addedItems, removedItems) => {
    const addedPromises = addedItems.map((added) => {
      return fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createBody(added)),
      });
    });

    // if (addedItems.length > 0) {
    //   await axios.put(
    //     `http://localhost:3002/api/${flespiUpdatePermissionUrl}`,
    //     {
    //       addedItems,
    //     }
    //   );
    // }

    // if (removedItems.length > 0) {
    //   await axios.put(
    //     `http://localhost:3002/api/${flespiRemovePermissionUrl}`,
    //     {
    //       removedItems,
    //     }
    //   );
    // }

    const removedPromises = removedItems.map((removed) => {
      return fetch("/api/permissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createBody(removed)),
      });
    });

    await Promise.all([...addedPromises, ...removedPromises]);
  };

  const calculatorPermission = async (addedItems, removedItems) => {
    if (addedItems?.length > 0) {
      await axios.post(`${url}/${calcAssignEndpoint}`, addedItems);
    }

    if (removedItems?.length > 0) {
      await axios.post(`${url}/${calcUnassignEndpoint}`, removedItems);
    }
  };

  const onChange = async (value) => {
    const oldValue = linked?.map((it) => keyGetter(it));
    const newValue = value?.map((it) => keyGetter(it));

    if (!newValue.find((it) => it < 0)) {
      const addedItems = newValue?.filter((it) => !oldValue?.includes(it));
      const removedItems = oldValue?.filter((it) => !newValue?.includes(it));

      setDisableUI(true);

      try {
        component == 0
          ? await calculatorPermission(addedItems, removedItems)
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
      {component == 1 && (
        <Autocomplete
          loading={loading}
          isOptionEqualToValue={(i1, i2) => keyGetter(i1) === keyGetter(i2)}
          options={items || []}
          getOptionLabel={(item) => titleGetter(item)}
          renderOption={(props, item) => (
            <li {...props}>
              <Checkbox
                checked={linked?.some(
                  (linkedItem) => keyGetter(linkedItem) === keyGetter(item)
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
      {component == 0 && (
        <Autocomplete
          loading={loading}
          isOptionEqualToValue={(i1, i2) => keyGetter(i1) === keyGetter(i2)}
          options={items || []}
          getOptionLabel={(item) => titleGetter(item)}
          renderOption={(props, item) => (
            <li {...props}>
              <Checkbox
                checked={linked?.some(
                  (linkedItem) => keyGetter(linkedItem) === keyGetter(item)
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
