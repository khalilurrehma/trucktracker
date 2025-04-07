import * as XLSX from "xlsx";

export const handleDownloadExcel = (data, filename = "shifts_data.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    console.error("No data available to export.");
    return;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shifts");

    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error("Error exporting data to Excel:", error);
  }
};
