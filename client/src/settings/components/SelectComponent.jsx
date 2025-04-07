import React, { useEffect, useState } from "react";
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { dropDownAllInfo } from "../../apis/api";

const SelectComponent = ({
  label,
  selectedValue,
  options,
  onChange,
  placeholder,
  apiEndpoint,
}) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (apiEndpoint) {
      //   getAllFlespiDevices();
    }
    // eslint-disable-next-line
  });

  const getAllFlespiDevices = async () => {
    try {
      const devices = await dropDownAllInfo(apiEndpoint);
      setData(devices);
    } catch (error) {
      console.error("Error fetching Flespi devices:", error);
    }
  };
  return (
    <FormControl fullWidth sx={{ marginTop: "12px" }}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={selectedValue}
        onChange={onChange}
        displayEmpty
        label={label}
      >
        <MenuItem disabled value="">
          <em>{placeholder}</em>
        </MenuItem>
        {options?.map((option) => (
          <MenuItem key={option.id} value={option.label}>
            {`${option.label} (${option.type})`}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SelectComponent;
