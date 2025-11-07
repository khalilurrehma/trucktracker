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
  const [loading, setLoading] = useState(false);

  // 🔁 Load all operations
  const loadOperations = async () => {
    setLoading(true);
    try {
      const allOps = await getAllOperations();
      setOperations(allOps || []);
    } catch (err) {
      console.error("Error loading operations:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Initial load
  useEffect(() => {
    loadOperations();
  }, []);

  // 💾 Save operation
  const saveOperation = async (payload) => {
    const op = await createOperation({ ...payload, user_id: userId });
    setOperations((old) => [op, ...old]);
    setSelectedOperationId(op.id);

    Swal.fire({
      icon: "success",
      title: "Operation saved!",
      timer: 1500,
      showConfirmButton: false,
    });
    return op;
  };

  // 🗑 Delete operation + reload
  const deleteOperation = async (id) => {
    await apiDeleteOperation(id);
    await loadOperations(); // ✅ reload updated list
    if (selectedOperationId === id) setSelectedOperationId(null);

    Swal.fire({ icon: "success", title: "Operation deleted" });
  };

  return {
    operations,
    setOperations,
    selectedOperationId,
    setSelectedOperationId,
    saveOperation,
    deleteOperation,
    loadOperations, // ✅ reusable reload
    mode,
    setMode,
    loading,
  };
}
