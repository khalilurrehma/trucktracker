import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  getAllOperations,
  createOperation,
  deleteOperation as apiDeleteOperation,
} from "../apis/operationApi";
import { useSelector } from "react-redux";

export function useOperations() {
  const [operations, setOperations] = useState([]);
  const [selectedOperationId, setSelectedOperationId] = useState(null);
  const [mode, setMode] = useState("OPERATION"); // OPERATION | ZONE
  const userId = useSelector((s) => s.session.user.id);

  useEffect(() => {
    (async () => {
      const allOps = await getAllOperations();
      setOperations(allOps || []);
    })();
  }, []);

  const saveOperation = async (payload) => {
    const op = await createOperation({ ...payload, user_id: userId });
    setOperations((old) => [op, ...old]);
    setSelectedOperationId(op.id);
    Swal.fire({ icon: "success", title: "Operation saved!", timer: 1500, showConfirmButton: false });
    return op;
  };

  const deleteOperation = async (id) => {
    await apiDeleteOperation(id);
    setOperations((old) => old.filter((p) => p.id !== id));
    if (selectedOperationId === id) setSelectedOperationId(null);
    Swal.fire({ icon: "success", title: "Operation deleted" });
  };

  return {
    operations,
    selectedOperationId,
    setSelectedOperationId,
    saveOperation,
    deleteOperation,
    mode,
    setMode,
  };
}
