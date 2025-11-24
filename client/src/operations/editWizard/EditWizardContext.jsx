// src/operations/editWizard/EditWizardContext.jsx
import React, { createContext, useContext, useState } from "react";

const EditWizardContext = createContext(null);

export function EditWizardProvider({ children }) {
  // Operation
  const [operation, setOperation] = useState(null);

  // 4 zone types (always exactly 4 zones)
  const [queueZone, setQueueZone] = useState(null);
  const [loadPadZone, setLoadPadZone] = useState(null);
  const [dumpZone, setDumpZone] = useState(null);
  const [zoneArea, setZoneArea] = useState(null);

  // Devices assigned to the operation
  const [assignedDevices, setAssignedDevices] = useState([]);

  const value = {
    operation,
    setOperation,

    queueZone,
    setQueueZone,

    loadPadZone,
    setLoadPadZone,

    dumpZone,
    setDumpZone,

    zoneArea,
    setZoneArea,

    assignedDevices,
    setAssignedDevices,
  };

  return (
    <EditWizardContext.Provider value={value}>
      {children}
    </EditWizardContext.Provider>
  );
}

export function useEditWizard() {
  const ctx = useContext(EditWizardContext);
  if (!ctx) {
    throw new Error("useEditWizard must be used inside EditWizardProvider");
  }
  return ctx;
}
