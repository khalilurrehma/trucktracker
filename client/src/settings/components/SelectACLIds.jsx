import React, { useEffect, useState } from "react";
import { dropDownAllInfo } from "../../apis/api";
import { Autocomplete, TextField } from "@mui/material";

const SelectACLIds = ({ selectedItem, idx, onSelectionChange }) => {
  const [idsData, setIdsData] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  useEffect(() => {
    getIdsDropdown();
    console.log(selectedItem);
  }, [selectedItem]);

  useEffect(() => {}, []);

  const getIdsDropdown = async () => {
    const strLastpart = selectedItem.label.split("/").pop();
    try {
      const response = await dropDownAllInfo(strLastpart);

      setIdsData(response);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectionChange = (event, value) => {
    const idsOnly = value.map((item) => item.id);

    setSelectedIds(value);
    onSelectionChange(idx, idsOnly);
  };

  return (
    <Autocomplete
      fullWidth
      limitTags={1}
      multiple
      disablePortal
      options={idsData}
      key={(option) => option.id}
      getOptionLabel={(option) => option.name}
      onChange={handleSelectionChange}
      value={selectedIds}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Select"
          sx={{ maxHeight: 300, overflowY: "auto" }}
        />
      )}
      sx={{
        width: "100%",
        marginTop: "12px",
        mb: 2,
      }}
    />
  );
};

export default SelectACLIds;
