export const filterData = (
  data,
  searchQuery,
  sortColumn,
  sortDirection,
  selectedColumns,
  defaultSortByTimestamp = true
) => {
  // Filter the data based on searchQuery
  const filteredData = data?.filter((item) => {
    if (!searchQuery) return true;
    const lowerSearchQuery = searchQuery.toLowerCase();

    const getColumnValue = (item, column) =>
      item[column] ? item[column].toString().toLowerCase() : "";

    const searchInColumn = (column, value) => {
      return value.includes(lowerSearchQuery);
    };

    return selectedColumns.some((column) => {
      const value = getColumnValue(item, column);
      return searchInColumn(column, value);
    });
  });

  // Sort the filtered data
  filteredData?.sort((a, b) => {
    if (sortColumn && sortDirection) {
      let columnA = a[sortColumn.value];
      let columnB = b[sortColumn.value];

      if (sortDirection === "asc") {
        if (columnA < columnB) return -1;
        if (columnA > columnB) return 1;
        return 0;
      } else {
        if (columnA > columnB) return -1;
        if (columnA < columnB) return 1;
        return 0;
      }
    } else if (defaultSortByTimestamp) {
      // Default sorting by timestamp (descending) if no other sortColumn is provided
      return b.timestamp - a.timestamp;
    }

    return 0; // No sorting if defaultSortByTimestamp is false
  });

  return filteredData;
};
