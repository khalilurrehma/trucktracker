import pool from "../../config/dbConfig.js";

export const addDispatchServices = (services) => {
  const insertPromise = services.map((service) => {
    return new Promise((resolve, reject) => {
      pool.query(
        "INSERT INTO dispatch_services (service_name) VALUES (?)",
        [service.name],
        (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result);
        }
      );
    });
  });

  return Promise.all(insertPromise);
};

export const fetchAllDispatchServices = async () => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT * FROM dispatch_services", (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};
