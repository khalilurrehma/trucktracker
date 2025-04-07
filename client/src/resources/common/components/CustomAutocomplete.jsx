import React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

const CustomAutocomplete = ({
  options,
  valueField,
  labelField,
  value,
  label,
  onChange,
  multiple,
  clearable,
}) => {
  return (
    <Autocomplete
      id="custom-autocomplete"
      options={options}
      getOptionLabel={(option) => option[labelField] || ""}
      getOptionValue={(option) => option[valueField] || ""}
      value={value}
      onChange={onChange}
      fullWidth
      multiple={multiple}
      disableClearable={clearable}
      renderInput={(params) => (
        <TextField {...params} label={label} variant="outlined" />
      )}
    />
  );
};

export default CustomAutocomplete;
