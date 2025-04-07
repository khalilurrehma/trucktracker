import React, { useState, useEffect } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import axios from "axios";
import { use } from "react";

const CustomAutoComplete = ({
  endpoint,
  label = "Select an option",
  setDefaultAlarmEvent,
  filterConfiguredItems = [],
}) => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${url}/${endpoint}`);

      const configuredIds = new Set(
        filterConfiguredItems.map((item) => item.alarm_event_id)
      );

      const filteredOptions = data?.message?.filter(
        (option) => !configuredIds.has(option.Id)
      );

      setOptions(filteredOptions);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [inputValue, endpoint]);

  useEffect(() => {
    if (selectedValue) {
      setDefaultAlarmEvent(selectedValue);
    }
  }, [selectedValue]);

  return (
    <Autocomplete
      options={options}
      loading={loading}
      getOptionLabel={(option) => option.name || ""}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={selectedValue}
      onChange={(event, newValue) => setSelectedValue(newValue)}
      onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default CustomAutoComplete;
