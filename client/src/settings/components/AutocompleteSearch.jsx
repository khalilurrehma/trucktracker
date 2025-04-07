import React from "react";
import { Autocomplete, TextField, CircularProgress, Box } from "@mui/material";

const AutocompleteSearch = ({
  drivers,
  filteredDrivers,
  handleDriverSearch,
  selectedDriver,
  setSelectedDriver,
  hasErrors,
}) => {
  return (
    <Box>
      <Autocomplete
        disablePortal
        options={filteredDrivers.length > 0 ? filteredDrivers : drivers}
        getOptionLabel={(option) => option.name || ""}
        value={selectedDriver}
        onChange={(event, value) => setSelectedDriver(value)}
        onInputChange={(event, value) => handleDriverSearch(value)}
        noOptionsText={hasErrors ? "Error fetching drivers" : "No options"}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Select Driver"
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {!drivers.length && <CircularProgress size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Box>
  );
};

export default AutocompleteSearch;
