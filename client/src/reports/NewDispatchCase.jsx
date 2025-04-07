import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import NewCaseHeader from "./components/NewCaseHeader";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { addNewCase, getAllDispatchServices } from "../apis/api";
import { useNavigate } from "react-router-dom";
import OperationsMenu from "../settings/components/OperationsMenu";

const Form = () => {
  const [caseIdentifier, setCaseIdentifier] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceOptions, setServiceOptions] = useState([]);
  const [isTowCar, setIsTowCar] = useState(false);
  const [isMotorcycle, setIsMotorcycle] = useState(false);
  const [initialAddress, setInitialAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [predeterminePrice, setPredeterminePrice] = useState(true);
  const [fixedPrice, setFixedPrice] = useState(false);
  const [price, setPrice] = useState("");
  const navigate = useNavigate();

  const handleFixedPriceChange = () => {
    setFixedPrice(!fixedPrice);
    setPredeterminePrice(fixedPrice);
    setPrice("");
  };

  const handlePredeterminePriceChange = () => {
    setPredeterminePrice(!predeterminePrice);
    setFixedPrice(predeterminePrice);
  };

  const resetForm = () => {
    setCaseIdentifier("");
    setServiceType("");
    setIsTowCar(false);
    setIsMotorcycle(false);
    setInitialAddress("");
    setDeliveryAddress("");
    setPredeterminePrice(true);
    setFixedPrice(false);
    setPrice("");
  };
  const handleQuoteClick = async () => {
    let errors = [];

    if (!caseIdentifier) {
      errors.push("Case Identifier is required");
    }
    if (!serviceType) {
      errors.push("Service Type is required");
    }
    if (!isTowCar && !isMotorcycle) {
      errors.push("Tow Car or Motorcycle is required");
    }
    if (!initialAddress) {
      errors.push("Initial Address is required");
    }
    if (!deliveryAddress) {
      errors.push("Delivery Address is required");
    }
    if (!predeterminePrice && !fixedPrice) {
      errors.push("Price is required");
    }
    if (errors.length > 0) {
      toast.error(errors.join("\n"));
      return;
    }

    const newCaseData = {
      caseIdentifier,
      serviceType,
      vehicleMotorcycle: isMotorcycle,
      vehicleTow: isTowCar,
      initialAddress,
      deliveryAddress,
      pricePredetermine: predeterminePrice,
      fixedPrice,
      price,
    };

    const response = await addNewCase(newCaseData);
    console.log(response);
    if (response.success) {
      toast.success("Quote added successfully");
      resetForm();
      navigate("/operations/cases");
    } else {
      toast.error("Failed to add quote");
    }
  };

  useEffect(() => {
    async function fetchServices() {
      try {
        const { data } = await getAllDispatchServices();
        setServiceOptions(data);
      } catch (error) {
        nsole.error("Error fetching dispatch services:", error);
      }
    }
    fetchServices();
  }, []);

  return (
    <div className="min-h-full flex items-center justify-center  p-4 sm:p-8">
      <div
        className="bg-white shadow-lg rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-md md:max-w-lg lg:max-w-2xl
                 mx-auto sm:mt-6 lg:mt-10
                  mobile-l:mt-[20px] mobile-m:mt-[20px] mobile-s:mt-[20px]"
      >
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl text-center font-semibold mb-6 text-gray-800">
          New Case
        </h2>

        {/* Case Identifier */}
        <div className="mb-4">
          <label className="block text-gray-600 text-sm mb-1">
            Case Identifier
          </label>
          <input
            type="text"
            value={caseIdentifier}
            className="w-full bg-gray-200 text-gray-800 p-2 rounded outline-none"
            onChange={(e) => setCaseIdentifier(e.target.value)}
          />
        </div>

        {/* Type of Service */}
        <div className="mb-4">
          <label className="block text-gray-600 text-sm mb-1">
            Type of Service
          </label>
          <select
            className="w-full bg-gray-50 border border-gray-300 p-2 rounded outline-none"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          >
            <option value="">Select Type</option>
            {serviceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.service_name}
              </option>
            ))}
          </select>
        </div>

        {/* Radio Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <span className="mr-2 text-gray-700">Motorcycle</span>
            <button
              onClick={() => setIsMotorcycle(!isMotorcycle)}
              className={`w-8 h-4 rounded-full border border-gray-300 relative`}
            >
              <span
                className={`block w-4 h-4 rounded-full shadow-md absolute top-0 transition-all ${
                  isMotorcycle ? "bg-green-500" : "bg-red-500"
                } ${isMotorcycle ? "right-0" : "left-0"}`}
              ></span>
            </button>
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-gray-700">Tow car</span>
            <button
              onClick={() => setIsTowCar(!isTowCar)}
              className={`w-8 h-4 rounded-full border border-gray-300 relative`}
            >
              <span
                className={`block w-4 h-4 rounded-full shadow-md absolute top-0 transition-all ${
                  isTowCar ? "bg-green-500" : "bg-red-500"
                } ${isTowCar ? "right-0" : "left-0"}`}
              ></span>
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="my-4 border-t-2 border-gray-300"></div>

        {/* Addresses */}
        <div className="mb-4">
          <label className="block text-gray-600 text-sm mb-1">
            Initial Address
          </label>
          <input
            type="text"
            value={initialAddress}
            onChange={(e) => setInitialAddress(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 p-2 rounded outline-none"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-600 text-sm mb-1">
            Delivery Address
          </label>
          <input
            type="text"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 p-2 rounded outline-none"
          />
        </div>

        {/* Separator */}
        <div className="my-4 border-t-2 border-gray-300"></div>

        <div className="flex flex-col sm:flex-row items-center mb-4 gap-2">
          <label className="flex items-center mr-auto">
            <input
              type="checkbox"
              checked={predeterminePrice}
              onChange={handlePredeterminePriceChange}
              className="mr-2"
              disabled={fixedPrice}
            />
            <span className="text-gray-700">Price per Km (Predetermine)</span>
          </label>
          <span className="font-semibold text-gray-800">S/. 30.00</span>
        </div>
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={fixedPrice}
            onChange={handleFixedPriceChange}
            className="mr-2"
          />
          <span className="text-gray-700 mr-2">Enter Fixed Price</span>
          <input
            type="number"
            disabled={!fixedPrice}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-28 bg-gray-50 border border-gray-300 p-1 rounded outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-8 mt-10">
          <button
            className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-700 w-full sm:w-auto"
            onClick={() => navigate("/operations/cases")}
          >
            Cancel
          </button>
          <button
            onClick={handleQuoteClick}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-700 w-full sm:w-auto"
          >
            Quote
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

const NewDispatchCase = () => {
  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "reportNewCase"]}
    >
      <NewCaseHeader />
      <Form />
    </PageLayout>
  );
};

export default NewDispatchCase;
