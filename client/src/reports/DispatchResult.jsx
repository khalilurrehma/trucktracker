import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
} from "@mui/material";
import LocationSearchingIcon from "@mui/icons-material/LocationSearching";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import DispatchResultHeader from "./components/DispatchResultHeader";
import GoogleMapComponent from "./components/GoogleMapComponent";
import useReportStyles from "./common/useReportStyles";
import { useTranslation } from "../common/components/LocalizationProvider";
import OperationsMenu from "../settings/components/OperationsMenu";

const initialColumns = [
  "location",
  "plateId",
  "status",
  "distance",
  "driver",
  "gpsStatus",
  "eta",
  "price",
  "lastConnection",
];
const DispatchResult = () => {
  const [initialAddress, setInitialAddress] = React.useState("");
  const [caseNumber, setCaseNumber] = React.useState("");
  const [serviceOption, setServicOption] = React.useState([
    "Accidente - Servicio de Grua",
    "Otro Servicio",
  ]);
  const t = useTranslation();
  // const { traccarUser, url } = useAppContext();
  const classes = useReportStyles();
  const [loading, setLoading] = React.useState(false);
  const [selectedColumns, setSelectedColumns] = React.useState(initialColumns);
  const [data, setData] = React.useState([]);
  const [driversData, setDriversData] = React.useState([]);
  const [devicesData, setDevicesData] = React.useState([]);
  const [groupsData, setGroupsData] = React.useState([]);

  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");
  const [radius, setRadius] = React.useState("");
  const [pagination, setPagination] = React.useState(25);

  const [currentPage, setCurrentPage] = React.useState(1);
  let printComponentRef = React.useRef();
  // const navigate = useNavigate();

  const [value, setValue] = React.useState(null);
  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState([]);
  const [error, setError] = React.useState(false);
  const loaded = React.useRef(false);

  const radiusOptions = [
    { label: "500m", value: 500 },
    { label: "1km", value: 1000 },
    { label: "2km", value: 2000 },
    { label: "3km", value: 3000 },
  ];

  const [selectedItem, setSelectedItem] = React.useState(null);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [openAssignModal, setOpenAssignModal] = React.useState(false);

  const columnLabels = {
    location: `${t("sharedLocation")}`,
    plateId: `Plate ID`,
    status: `${t("deviceStatus")}`,
    distance: `${t("sharedDistance")}`,
    driver: `${t("sharedDriver")}`,
    gpsStatus: `GPS Status`,
    eta: `ETA`,
    price: "Price",
    lastConnection: "Last Connection",
  };

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  const getStatusText = (timestamp) => {
    const deviceTime = new Date(timestamp * 1000).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = (currentTime - deviceTime) / (1000 * 60 * 60);

    if (timeDifference < 0.5) {
      return `ACTIVO`;
    } else if (timeDifference < 24) {
      return `INACTIVO`;
    } else {
      return `DESCONOCIDO`;
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    return haversine(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  function formatTimeDuration(timestamp) {
    const currentTime = new Date().getTime();
    const itemTime = new Date(timestamp * 1000).getTime();
    const diffMilliseconds = currentTime - itemTime;
    const diffMinutes = diffMilliseconds / (1000 * 60);
    const diffHours = diffMinutes / 60;
    const diffDays = diffHours / 24;
    const diffWeeks = diffDays / 7;
    const diffMonths = diffDays / 30;
    const diffYears = diffDays / 365;

    if (diffMinutes < 60) {
      return `${diffMinutes.toFixed(0)} min`;
    } else if (diffHours < 24) {
      return `${diffHours.toFixed(0)} hours`;
    } else if (diffDays < 7) {
      return `${diffDays.toFixed(0)} days`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks.toFixed(0)} weeks`;
    } else if (diffMonths < 12) {
      return `${diffMonths.toFixed(0)} months`;
    } else {
      return `${diffYears.toFixed(0)} years`;
    }
  }

  const startIndex = (currentPage - 1) * pagination;
  const endIndex = startIndex + pagination;

  const testData = [
    {
      id: 1,
      location: "Calle Jose Gonzalez 359, Miraflores, Lima, Peru",
      plateId: "AXG-11123",
      status: "En Route",
      distance: "12.5 km",
      driver: "Juan Perez",
      gpsStatus: "Active",
      eta: "15 min",
      price: "$25.50",
      lastConnection: "2024-06-25 14:30:00",
    },
    {
      id: 2,
      location: "Av. Larco 345, Miraflores, Lima, Peru",
      plateId: "BXP-56789",
      status: "Pending",
      distance: "8.3 km",
      driver: "Carlos Rivera",
      gpsStatus: "Inactive",
      eta: "N/A",
      price: "$18.00",
      lastConnection: "2024-06-25 13:55:00",
    },
    {
      id: 3,
      location: "Jr. Puno 678, Centro de Lima, Lima, Peru",
      plateId: "CQP-90876",
      status: "Delivered",
      distance: "0.0 km",
      driver: "Lucia Gomez",
      gpsStatus: "Active",
      eta: "Arrived",
      price: "$30.75",
      lastConnection: "2024-06-25 15:10:00",
    },
  ];

  const slicedFilteredData = testData.slice(startIndex, endIndex);

  const handleSelectRow = (event, id) => {
    const selectedIndex = selectedRows.indexOf(id);
    let newSelectedRows = [];

    if (selectedIndex === -1) {
      newSelectedRows = newSelectedRows.concat(selectedRows, id);
    } else if (selectedIndex === 0) {
      newSelectedRows = newSelectedRows.concat(selectedRows.slice(1));
    } else if (selectedIndex === selectedRows.length - 1) {
      newSelectedRows = newSelectedRows.concat(selectedRows.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelectedRows = newSelectedRows.concat(
        selectedRows.slice(0, selectedIndex),
        selectedRows.slice(selectedIndex + 1)
      );
    }

    setSelectedRows(newSelectedRows);
  };

  const isRowSelected = (id) => selectedRows.indexOf(id) !== -1;

  const isButtonDisabled = () => {
    return !slicedFilteredData.some((item) =>
      selectedRows.includes(item["device.id"])
    );
  };

  React.useEffect(() => {
    console.log(initialAddress, caseNumber);
  }, [initialAddress]);

  const [selectedRow, setSelectedRow] = React.useState(null);

  const handleRowSelect = (rowIndex) => {
    setSelectedRow(selectedRow === rowIndex ? null : rowIndex);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "En Route":
        return "primary";
      case "Pending":
        return "secondary";
      case "Delivered":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "reportDispatchResult"]}
    >
      <DispatchResultHeader
        caseNumber={caseNumber}
        setCaseNumber={setCaseNumber}
        initialAddress={initialAddress}
        setInitialAddress={setInitialAddress}
      />
      <div className={classes.containerMap}>
        <GoogleMapComponent initialAddress={initialAddress} />
      </div>
      <div className={classes.container}>
        <div className={classes.header} style={{ padding: "25px" }}>
          <div className="flex items-baseline justify-center  gap-20">
            <div className="mb-4 flex items-center gap-6">
              <label className="block text-black text-xl mb-1">
                Aceptacion de Rimac
              </label>
              <select className="w-[40%] bg-gray-50 border border-gray-300 p-2 rounded outline-none">
                {serviceOption.map((option, index) => (
                  <option key={index}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-space-between items-center gap-8">
              <button className="bg-gray-900 text-white px-8 py-4 rounded-3xl hover:bg-gray-700 w-full sm:w-auto">
                Archive
              </button>
              <button className="bg-blue-500 text-white px-8 py-4 rounded-3xl hover:bg-blue-700 w-full sm:w-auto">
                Assigned
              </button>
            </div>
          </div>

          <div>
            <Table ref={(el) => (printComponentRef = el)}>
              <TableHead>
                <TableRow>
                  {selectedColumns.map((column) => (
                    <TableCell key={column}>{columnLabels[column]}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {testData.map((item, index) => (
                  <TableRow
                    key={index}
                    selected={selectedRow === index}
                    onClick={() => handleRowSelect(index)}
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        selectedRow === index ? "#800000" : "inherit",
                    }}
                  >
                    <TableCell
                      style={{
                        color: selectedRow === index ? "white" : "inherit",
                      }}
                    >
                      {item.location}
                    </TableCell>
                    <TableCell
                      style={{
                        color: selectedRow === index ? "white" : "inherit",
                      }}
                    >
                      {item.plateId}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color={getStatusColor(item.status)}
                        size="small"
                      >
                        {item.status}
                      </Button>
                    </TableCell>
                    <TableCell>{item.distance}</TableCell>
                    <TableCell>{item.driver}</TableCell>
                    <TableCell>{item.gpsStatus}</TableCell>
                    <TableCell>{item.eta}</TableCell>
                    <TableCell>{item.price}</TableCell>
                    <TableCell>{item.lastConnection}</TableCell>
                    <TableCell>
                      <IconButton size="small">
                        {
                          selectedRow === index ? (
                            ""
                          ) : (
                            <LocationSearchingIcon fontSize="small" />
                          )
                          // <GpsFixedIcon fontSize="small" />
                        }
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default DispatchResult;
