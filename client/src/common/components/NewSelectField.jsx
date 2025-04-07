import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Autocomplete,
  TextField,
} from "@mui/material";
import axios from "axios";
import { useEffectAsync } from "../../reactHelper";

const NewSelectField = ({
  label,
  fullWidth,
  multiple,
  value = null,
  emptyValue = null,
  emptyTitle = "",
  onChange,
  endpoint,
  data,
}) => {
  const [items, setItems] = useState();

  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  useEffect(() => setItems(data), [data]);

  useEffectAsync(async () => {
    if (endpoint === "/notifications") {
      const { data } = await axios.get(`${url}${endpoint}`);

      if (data.status) {
        const filteredMessage = data.message?.filter(
          (item) => item.is_subscribed !== 1
        );
        setItems(filteredMessage);
      }
    }
  }, []);

  if (items) {
    return (
      <FormControl fullWidth={fullWidth}>
        {multiple ? (
          <>
            <InputLabel>{label}</InputLabel>
            <Select label={label} multiple value={value} onChange={onChange}>
              {items.map((item) => (
                <MenuItem key={keyGetter(item)} value={keyGetter(item)}>
                  {titleGetter(item)}
                </MenuItem>
              ))}
            </Select>
          </>
        ) : (
          <Autocomplete
            size="small"
            options={items}
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <MenuItem {...props} key={option.id} value={option}>
                {option.name}
              </MenuItem>
            )}
            value={value}
            onChange={(_, value) =>
              onChange({
                target: { value: value ? value : emptyValue },
              })
            }
            renderInput={(params) => <TextField {...params} label={label} />}
          />
        )}
      </FormControl>
    );
  }
  return null;
};

export default NewSelectField;
