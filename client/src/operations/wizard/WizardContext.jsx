// src/operations/wizard/WizardContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const safeParse = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const loadFromStorage = (key) => safeParse(sessionStorage.getItem(key));

const saveToStorage = (key, value) => {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    /* ignore quota / availability issues */
  }
};

const clearStorage = () => {
  sessionStorage.removeItem("wizard_operation");
  sessionStorage.removeItem("wizard_queueZone");
  sessionStorage.removeItem("wizard_loadPadZone");
  sessionStorage.removeItem("wizard_dumpZone");
  sessionStorage.removeItem("wizard_zoneArea");
  sessionStorage.removeItem("wizard_assignedDevices");
};

const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [operation, setOperation] = useState(() => loadFromStorage("wizard_operation"));
  const [queueZone, setQueueZone] = useState(() => loadFromStorage("wizard_queueZone"));
  const [loadPadZone, setLoadPadZone] = useState(() => loadFromStorage("wizard_loadPadZone"));
  const [dumpZone, setDumpZone] = useState(() => loadFromStorage("wizard_dumpZone"));
  const [zoneArea, setZoneArea] = useState(() => loadFromStorage("wizard_zoneArea"));
  const [assignedDevices, setAssignedDevices] = useState(
    () => loadFromStorage("wizard_assignedDevices") || []
  ); // array of device IDs

  // Persist to session storage so data survives back navigation/refresh in create wizard
  useEffect(() => saveToStorage("wizard_operation", operation), [operation]);
  useEffect(() => saveToStorage("wizard_queueZone", queueZone), [queueZone]);
  useEffect(() => saveToStorage("wizard_loadPadZone", loadPadZone), [loadPadZone]);
  useEffect(() => saveToStorage("wizard_dumpZone", dumpZone), [dumpZone]);
  useEffect(() => saveToStorage("wizard_zoneArea", zoneArea), [zoneArea]);
  useEffect(
    () => saveToStorage("wizard_assignedDevices", assignedDevices),
    [assignedDevices]
  );

  // When leaving the wizard (provider unmount), clear persisted data
  useEffect(() => () => clearStorage(), []);

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
