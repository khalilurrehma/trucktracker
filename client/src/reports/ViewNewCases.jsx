import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import NewCaseHeader from "./components/NewCaseHeader";
import { getAllNewCases } from "../apis/api";
import OperationsMenu from "../settings/components/OperationsMenu";

const NewCasesTable = () => {
  const dummyData = [
    {
      caseIdentifier: "AXS-12132",
      serviceType: "Accident",
      vehicleMotorcycle: true,
      vehicleTow: false,
      initialAddress: "XYSZSA-123",
      deliveryAddress: "2113-ASBGUD",
      pricePredetermine: true,
      fixedPrice: false,
      price: null,
    },
    {
      caseIdentifier: "BXS-98231",
      serviceType: "Tow Service",
      vehicleMotorcycle: false,
      vehicleTow: true,
      initialAddress: "YTS-202",
      deliveryAddress: "456-MNTG",
      pricePredetermine: false,
      fixedPrice: true,
      price: 120.5,
    },
    {
      caseIdentifier: "CAS-00912",
      serviceType: "Fuel Refilling",
      vehicleMotorcycle: false,
      vehicleTow: false,
      initialAddress: "POI-302",
      deliveryAddress: "789-KLPQ",
      pricePredetermine: true,
      fixedPrice: true,
      price: 50.0,
    },
  ];

  const [tableContant, setTableContent] = useState([]);

  useEffect(() => {
    async function fetchServices() {
      try {
        const { data } = await getAllNewCases();
        setTableContent(data);
      } catch (error) {
        nsole.error("Error fetching dispatch services:", error);
      }
    }
    fetchServices();
  }, []);

  return (
    <TableContainer component={Paper} sx={{ marginTop: "20px", width: "100%" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Case Identifier</TableCell>
            <TableCell>Service Type</TableCell>
            <TableCell>Motorcycle</TableCell>
            <TableCell>Tow</TableCell>
            <TableCell>Initial Address</TableCell>
            <TableCell>Delivery Address</TableCell>
            <TableCell>Predetermine Price</TableCell>
            <TableCell>Fixed Price</TableCell>
            <TableCell>Price</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tableContant.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.caseIdentifier}</TableCell>
              <TableCell>{row.serviceType}</TableCell>
              <TableCell>{row.vehicleMotorcycle ? "Yes" : "No"}</TableCell>
              <TableCell>{row.vehicleTow ? "Yes" : "No"}</TableCell>
              <TableCell>{row.initialAddress}</TableCell>
              <TableCell>{row.deliveryAddress}</TableCell>
              <TableCell>{row.pricePredetermine ? "Yes" : "No"}</TableCell>
              <TableCell>{row.fixedPrice ? "Yes" : "No"}</TableCell>
              <TableCell>
                {row.price !== null ? `$${row.price}` : "N/A"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ViewNewCases = () => {
  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "reportNewCase"]}
    >
      <NewCaseHeader />

      <NewCasesTable />
    </PageLayout>
  );
};

export default ViewNewCases;
