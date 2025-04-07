import pool from "../../config/dbConfig.js";

export const addNewCase = async (body) => {
  const {
    caseIdentifier,
    serviceType,
    vehicleMotorcycle,
    vehicleTow,
    initialAddress,
    deliveryAddress,
    pricePredetermine,
    fixedPrice,
    price,
  } = body;

  try {
    const sql =
      "INSERT INTO dispatch_new_cases (caseIdentifier, serviceType, vehicleMotorcycle, vehicleTow, initialAddress, deliveryAddress, pricePredetermine, fixedPrice, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    return new Promise((resolve, reject) => {
      pool.query(
        sql,
        [
          caseIdentifier,
          serviceType,
          vehicleMotorcycle,
          vehicleTow,
          initialAddress,
          deliveryAddress,
          pricePredetermine,
          fixedPrice,
          price,
        ],
        (err, results) => {
          if (err) {
            reject(err);
          }
          resolve(results);
        }
      );
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchAllNewCases = async () => {
  const sql = "SELECT * FROM dispatch_new_cases";
  return new Promise((resolve, reject) => {
    pool.query(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};
