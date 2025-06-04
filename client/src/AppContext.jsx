import axios from "axios";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";

const AppContext = createContext();

const AppContextProvider = ({ children }) => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const [traccarUser, setTraccarUser] = useState(null);
  const [subaccount, setSubaccount] = useState(null);
  const [flespiToken, setFlespiToken] = useState([]);
  const [traccarToken, setTraccarToken] = useState({});
  const [assignDrivers, setAssignDrivers] = useState([]);
  const [assignedDevices, setAssignedDevices] = useState({});
  const [companyRealmId, setCompanyRealmId] = useState({});
  const [uniqueIds, setUniqueIds] = useState([]);
  const [deviceIdsArray, setDeviceIdsArray] = useState([]);
  const prevDeviceIdsArrayRef = useRef();
  const [categories, setCategories] = useState([]);
  const [categoriesMenus, setCategoriesMenus] = useState([]);
  const [reports, setReports] = useState([]);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [newAllDevices, setNewAllDevices] = useState([]);
  const [traccarDevices, setTraccarDevices] = useState([]);
  const [newDevices, setNewDevices] = useState([]);
  const [allCalcs, setAllCalcs] = useState([]);
  const [realmUserCalcs, setRealmUserCalcs] = useState([]);
  const [companyValidCalcs, setCompanyValidCalcs] = useState([]);
  const [serverMessage, setServerMessage] = useState(null);

  const [mqttMessages, setMqttMessages] = useState([]);
  const [mqttReportsEvents, setMqttReportsEvents] = useState([]);
  const [mqttDriverBehaivor, setMqttDriverBehaivor] = useState([]);
  const [mqttDeviceLiveLocation, setDeviceLiveLocation] = useState([]);
  const [mqttDeviceIgnitionStatus, setDeviceIgnitionStatus] = useState([]);
  const [mqttDeviceConnected, setDeviceConnected] = useState([]);
  const [mqttDeviceDin, setDeviceDin] = useState([]);
  const [updateCronLogs, setUpdateCronLogs] = useState([]);
  const [subproccessEvents, setSubproccessEvents] = useState([]);

  const user = useSelector((state) => state.session.user);

  const updateMqttMessage = (newMessage, stateType) => {
    if (stateType === "Events") {
      setMqttReportsEvents((prev) => [...prev, newMessage]);
    } else if (stateType === "Alarms") {
      setMqttMessages((prev) => [...prev, newMessage]);
    } else if (stateType === "driverBehaivor") {
      setMqttDriverBehaivor((prev) => [...prev, newMessage]);
    } else if (stateType === "deviceLiveLocation") {
      setDeviceLiveLocation((prev) => [...prev, newMessage]);
    } else if (stateType === "deviceDin") {
      setDeviceDin((prev) => {
        const updatedDevices = [...prev];

        const { deviceId, din } = newMessage;

        const index = updatedDevices.findIndex(
          (device) => device.deviceId === deviceId
        );

        if (index !== -1) {
          updatedDevices[index] = {
            ...updatedDevices[index],
            devicesIgnitionStatus: din ?? 0,
          };
        } else if ([0, 1, 4, 5].includes(din)) {
          updatedDevices.push({
            deviceId,
            devicesIgnitionStatus: din ?? 0,
          });
        }

        return updatedDevices;
      });
    } else if (stateType === "engineIgnitionStatus") {
      setDeviceIgnitionStatus((prev) => [...prev, newMessage]);
    } else if (stateType === "connected") {
      setDeviceConnected((prev) => [...prev, newMessage]);
    } else if (stateType === "cronLogs") {
      setUpdateCronLogs((prev) => [...prev, newMessage]);
    } else if (stateType === "subprocessEvent") {
      setSubproccessEvents((prev) => [...prev, newMessage]);
    }
  };

  useEffect(() => {
    if (
      traccarUser?.email === "pieromeza@gmail.com" ||
      traccarUser?.email === "Pieromeza@gmail.com" ||
      traccarUser?.email === "admin@nextop.vip" ||
      traccarUser?.email === "mohammadsabihka68@gmail.com" ||
      traccarUser?.email === "admin@gmail.com"
    ) {
      setTraccarUser((prevUser) => ({
        ...prevUser,
        superAdmin: true,
        attribute: {
          non_admin: true,
        },
      }));
    } else if (traccarUser?.email === "dev@admin.com") {
      setTraccarUser((prevUser) => ({
        ...prevUser,
        id: 177,
        superAdmin: false,
        attribute: {
          non_admin: true,
        },
      }));
    }
  }, [traccarUser?.email]);

  useEffect(() => {
    const fetchNewAllDevices = async () => {
      try {
        const apiUrl = `${url}/new-devices`;
        const res = await axios.get(apiUrl);

        if (res.status === 200) {
          const formattedDevice = res.data.data.map((device) => {
            return {
              id: device.traccarId,
              name: device.name,
              uniqueId: device.uniqueId,
              category: device.category,
              contact: device.contact,
              disabled: device.disabled,
              phone: device.phone,
              expirationTime: device.expirationTime,
              groupId: device.groupId,
              lastUpdate: device.lastUpdate,
              model: device.model,
              status: device.traccar_status,
              attributes: device.attributes,
              services: device.services,
            };
          });
          setNewAllDevices(formattedDevice);
        } else {
          throw new Error("Failed to fetch data from one of the APIs");
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchNewAllDevices();
  }, []);

  useEffect(() => {
    const fetchNewDevices = async () => {
      try {
        const apiUrl = `${url}/new-devices/${traccarUser?.id}`;
        const res = await axios.get(apiUrl);

        if (res.status === 200) {
          // console.log(res);
          setNewDevices(res.data.data);
        } else {
          // throw new Error("Failed to fetch data from one of the APIs");
        }
      } catch (error) {
        // console.error(error);
      }
    };
    if (traccarUser?.userId) {
      fetchNewDevices();
    }
  }, [traccarUser?.id]);

  useEffect(() => {
    if (traccarUser) {
      fetchReportsData(traccarUser?.id);
      fetchValidCalcRealmUser(traccarUser?.id);
      fetchCategoriesData(traccarUser.id);
      fetchSubaccount(traccarUser?.id);
      fetchFlespiToken(traccarUser?.id);
      fetchTraccarToken(traccarUser?.id);
      fetchCategoriesMenu();
      fetchTraccarDeviceList();
    }
  }, [traccarUser]);

  useEffect(() => {
    if (traccarUser?.superAdmin) {
      fetchAllCalcs();
    }
    if (!traccarUser?.superAdmin) {
      fetchCompanyValidCustomCalc(traccarUser?.id);
    }
  }, [traccarUser]);

  const fetchReportsData = async (userId) => {
    try {
      const response = await axios.get(`${url}/reports`);
      if (response.status === 200) {
        const reports = response.data.data;
        setReports(reports);
      } else {
        // throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      // console.error(error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const fetchValidCalcRealmUser = async (userId) => {
    try {
      const response = await axios.get(
        `${url}/session/realm-user/calcs/${userId}`
      );
      if (response.status === 200) {
        const formattedRes = response.data.data?.map((calc) => {
          return {
            id: calc.actualId,
          };
        });

        setRealmUserCalcs(response.data.data ? formattedRes : []);
      }
    } catch (error) {}
  };

  const fetchCompanyValidCustomCalc = async (userId) => {
    try {
      const response = await axios.get(
        `${url}/session/company/custom/calc/${userId}`
      );

      if (response.status === 200) {
        setCompanyValidCalcs(response.data.message);
      }
    } catch (error) {}
  };

  const fetchCategoriesData = async (userId) => {
    try {
      const response = await axios.get(`${url}/categories`);
      if (response.status === 200) {
        setCategories(response.data);
      } else {
        // throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      // console.error(error);
    }
  };

  const fetchCategoriesMenu = async () => {
    try {
      const response = await axios.get(`${url}/categories/menu`);
      if (response.status === 200) {
        setCategoriesMenus(response.data);
      } else {
        // throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      // console.error(error);
    }
  };

  const fetchAllCalcs = async () => {
    try {
      const response = await axios.get(`${url}/calcs`);
      if (response.status === 200) {
        const formattedBody = response.data.message?.map((calc) => {
          let calc_body = JSON.parse(calc.calc_type);
          return {
            id: calc.id,
            calc_id: calc.calc_id,
            name: calc.name,
            type: calc_body.type,
          };
        });

        setAllCalcs(formattedBody);
      } else {
        // throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      // console.error(error);
    }
  };

  const fetchSubaccount = async (traccarId) => {
    try {
      const { data } = await axios.get(
        `${url}/subaccount/traccar/${traccarId}`
      );

      if (data.status === true) {
        const id = data?.message?.flespiId;

        setSubaccount(id);
      }
    } catch (error) {}
  };

  const fetchFlespiToken = async (userId) => {
    try {
      const response = await axios.get(`${url}/uft/${userId}`);
      if (response.status === 200) {
        setFlespiToken(response.data.data);
      }
    } catch (error) {}
  };

  const fetchTraccarToken = async (userId) => {
    try {
      const response = await axios.get(`${url}/traccar-token/${userId}`);
      if (response.status === 200) {
        setTraccarToken(response.data.data[0]);
      }
    } catch (error) {}
  };

  const fetchTraccarDeviceList = async () => {
    try {
      const response = await axios.get(`${url}/traccar/all/devices`);

      if (response.status === 200) {
        // console.log(response.data.message);
        setTraccarDevices(response.data.message);
      }
    } catch (error) {}
  };

  const extractIMEIs = async (uniqueIds) => {
    // console.log(uniqueIds);
    // try {
    //   const response = await axios.post(`${url}/devices-by-imeis`, uniqueIds);
    //   // console.log('API Response devices-by-imeis :', response);
    //   if (response.status === 200) {
    //     const result = response.data.devices;
    //     setDeviceIdsArray(result);
    //   } else {
    //     setDeviceIdsArray([]);
    //   }
    // } catch (error) {
    //   console.error("Extract Devices by uniqueIds:", error);
    //   setDeviceIdsArray([]);
    // }
  };

  function getAllUniqueIds(data) {
    const uniqueIdsArray = Object.values(data).map((item) => item.uniqueId);
    return uniqueIdsArray;
  }

  useEffect(() => {
    setUniqueIds(getAllUniqueIds(assignedDevices));
  }, [assignedDevices]);

  useEffect(() => {
    if (uniqueIds) {
      extractIMEIs(uniqueIds);
    }
  }, [uniqueIds]);

  useEffect(() => {
    if (
      prevDeviceIdsArrayRef.current &&
      !arraysAreEqual(prevDeviceIdsArrayRef.current, deviceIdsArray)
    ) {
      fetchassignedDrivers();
    } else {
    }
    prevDeviceIdsArrayRef.current = deviceIdsArray;
    return () => {};
  }, [deviceIdsArray]);

  const arraysAreEqual = (arr1, arr2) => {
    return JSON.stringify(arr1) === JSON.stringify(arr2);
  };

  const fetchassignedDrivers = async () => {
    try {
      const response = await axios.get(`${url}/all-drivers`);
      if (response.status === 200) {
        const assignedDevices = response.data.data.assignedDevices;
        // console.log("context assigned drivers fetched successfully");
        setAssignDrivers(assignedDevices);
      } else {
        // throw new Error("Failed to fetch assigned drivers");
      }
    } catch (error) {
      // console.error(error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        traccarUser,
        subaccount,
        flespiToken,
        traccarToken,
        setTraccarUser,
        reports,
        isReportLoading,
        fetchReportsData,
        categories,
        fetchCategoriesData,
        assignDrivers,
        setAssignedDevices,
        assignedDevices,
        mqttMessages,
        deviceIdsArray,
        newAllDevices,
        newDevices,
        url,
        companyRealmId,
        allCalcs,
        realmUserCalcs,
        categoriesMenus,
        companyValidCalcs,
        updateMqttMessage,
        setServerMessage,
        serverMessage,
        mqttReportsEvents,
        mqttDriverBehaivor,
        traccarDevices,
        mqttDeviceLiveLocation,
        mqttDeviceDin,
        mqttDeviceIgnitionStatus,
        mqttDeviceConnected,
        updateCronLogs,
        subproccessEvents,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => {
  return useContext(AppContext);
};

export { AppContextProvider, useAppContext };
