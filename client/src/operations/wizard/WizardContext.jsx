// src/operations/wizard/WizardContext.jsx
import React, { createContext, useContext, useState } from "react";

const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [operation, setOperation] = useState(null);
  const [queueZone, setQueueZone] = useState(null);
  const [loadPadZone, setLoadPadZone] = useState(null);
  const [dumpZone, setDumpZone] = useState(null);
  const [zoneArea, setZoneArea] = useState(null);
  const [assignedDevices, setAssignedDevices] = useState([]); // array of device IDs

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
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used inside WizardProvider");
  }
  return ctx;
}
