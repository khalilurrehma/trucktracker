import axios from "axios";
import dayjs from "dayjs";
const traccarBearerToken = process.env.TraccarToken;
const traccarApiUrl = `http://${process.env.TraccarPort}/api`;
const flespiToken = process.env.FlespiToken;
const flespiApiUrl = `https://flespi.io/gw`;

export const dayHelper = dayjs();

export function formatTimeISO(dateString) {
  const date = new Date(dateString);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const dateStr = `${day} ${month} ${date.getUTCDate()} ${year}`;
  const timeStr = date.toLocaleTimeString("en-US", { hour12: false });
  return `${dateStr} ${timeStr}`;
}

export function getAllUniqueIds(data) {
  const uniqueIdsArray = Object.values(data).map((item) => item.uniqueId);
  return uniqueIdsArray;
}

export const parseGeofence = (areaString) => {
  let cleanedString, type;
  try {
    if (areaString?.startsWith("POLYGON")) {
      cleanedString = areaString.replace("POLYGON ((", "").replace("))", "");
      type = "polygon";
    } else if (areaString?.startsWith("LINESTRING")) {
      cleanedString = areaString.replace("LINESTRING (", "").replace(")", "");
      type = "corridor";
    } else {
      throw new Error("Invalid WKT format");
    }

    const coordinates = cleanedString.split(", ").map((pair) => {
      const [lat, lon] = pair.split(" ").map(Number);
      return { lat, lon };
    });

    return { type, coordinates };
  } catch (error) {
    console.error("Error parsing geofence:", error.message);
    return [];
  }
};

export const deleteGroupFromTraccar = async (groupId) => {
  try {
    await axios.delete(`${traccarApiUrl}/groups/${groupId}`, {
      headers: {
        Authorization: `Bearer ${traccarBearerToken}`,
      },
    });
  } catch (error) {
    console.error(`Traccar delete error for group ${groupId}:`, error.message);
    throw error;
  }
};

export const deleteGroupFromFlespi = async (groupId) => {
  try {
    await axios.delete(`${flespiApiUrl}/groups/${groupId}`, {
      headers: {
        Authorization: flespiToken,
      },
    });
  } catch (error) {
    console.error(`Flespi delete error for group ${groupId}:`, error.message);
    throw error;
  }
};
export const deleteGeofencesFromTraccar = async (geofenceId) => {
  try {
    await axios.delete(`${traccarApiUrl}/geofences/${geofenceId}`, {
      headers: {
        Authorization: `Bearer ${traccarBearerToken}`,
      },
    });
  } catch (error) {
    console.error(
      `Traccar delete error for group ${geofenceId}:`,
      error.message
    );
    throw error;
  }
};

export const deleteGeofencesFromFlespi = async (geofenceId) => {
  try {
    await axios.delete(`${flespiApiUrl}/geofences/${geofenceId}`, {
      headers: {
        Authorization: flespiToken,
      },
    });
  } catch (error) {
    console.error(
      `Flespi delete error for group ${geofenceId}:`,
      error.message
    );
    throw error;
  }
};
export const getAverageServiceTime = (secondsArray) => {
  if (!Array.isArray(secondsArray) || secondsArray.length === 0) return null;

  const total = secondsArray.reduce((sum, sec) => sum + sec, 0);
  const averageSeconds = total / secondsArray.length;

  const minutes = Math.floor(averageSeconds / 60);
  const hours = Math.floor(averageSeconds / 3600);

  if (hours >= 1) {
    const remainingMinutes = Math.round((averageSeconds % 3600) / 60);
    return `${hours}hr ${remainingMinutes}min`;
  } else {
    return `${minutes}min`;
  }
};

export function mapToRimacApiPayload(report, rimacReport) {
  // Parse rimacReport[0].report_data
  let rimacData = {};
  if (rimacReport && rimacReport.report_data) {
    try {
      rimacData = JSON.parse(rimacReport.report_data);
    } catch (e) {
      rimacData = {};
    }
  }

  // Parse vehicles (from report.vehicles, which is a JSON string)
  let vehicles = [];
  if (report.vehicles) {
    try {
      vehicles =
        typeof report.vehicles === "string"
          ? JSON.parse(report.vehicles)
          : report.vehicles;
    } catch (e) {
      vehicles = [];
    }
  }

  // Compose vehicparts
  const vehicparts = {
    vehicpart: vehicles.map((v, idx) => ({
      idvehiculo: v.vehicle_id ? String(v.vehicle_id) : "",
      codtipprop: "",
      numplaca: v.plate_number || rimacData.NroPlaca || "",
      nummotor: "",
      numchasis: "",
      marca: rimacData.Marca || "",
      modelo: rimacData.Modelo || "",
      color: rimacData.Color || "",
      ahno: rimacData.AnioVehic || "",
      uso: "",
      codservic: "",
      kilomet: "",
      numocupan: "",
      ciaaseg: "",
      ciaasegsoat: "",
      dahnosveh: report.damage || "",
      nompropiet: "",
      domicilio: "",
      telefprop: "",
      nomconduc: rimacData.NomCond || "",
      edad: "",
      tipodocumento: "",
      documento: "",
      telefconduc: "",
      numbrevet: "",
      categ: "",
      fecexpbrevet: "",
    })),
  };

  // Compose fotos
  const fotos = {
    foto: [],
  };

  if (report.pdfUrl) {
    fotos.foto.push({
      tipoimagen: "pdf",
      nombarch: "detailed-report.pdf",
      imagen: report.pdfUrl,
    });
  }

  vehicles.forEach((vehicle) => {
    (vehicle.photos || []).forEach((photo) => {
      fotos.foto.push({
        tipoimagen: photo.type || "",
        nombarch: "", // No file name, just URL
        imagen: photo.url || "",
      });
    });
  });

  // Compose persparts (if you have any; left empty here)
  const persparts = {
    perspart: [],
  };

  // Main Rimac siniestro object mapping
  const siniestro = {
    esinformep: "S",
    informe: rimacData.Informe ? String(rimacData.Informe) : "", // Report number
    numsin: rimacData.NroPoliza || "", // Claim number
    fechorcontact: rimacData.FecEnvio || "", // Contact date
    fecculm: "", // Completion date (not available)
    fechorocurr: rimacData.FecOcurr || "", // Incident date
    nomprocurador: rimacData.NomProd || "", // Procurator name
    nomcontact: rimacData.NomCont || "", // Contact name
    telfcontact: rimacData.TelfCont || "", // Contact phone
    numaten: "", // Not available
    coddep: rimacData.Dpto || "", // Department code
    codprov: rimacData.Prov || "", // Province code
    coddistr: rimacData.Dist || "", // District code
    lugar: rimacData.DirSin || "", // Place of incident
    tipsin: rimacData.TipVehic || report.subservices || "", // Type of incident (try mapping as you see fit)
    codcomisaria: "", // Police station code (not available)
    informeparcial: "N", // Not available
    denunciapol: {
      codcomisaria: "",
      nrodenuncia: "",
      fechordenun: "",
      fechorsinpoli: "",
      coplit: "",
      obs: "",
    },
    vehicparts,
    persparts,
    bienafects: [],
    dosajeetilico: {
      boleta: "",
      nrooficio: "",
      nrolicencond: "",
      codcateg: "",
      fechorinfracc: "",
      fechorextrac: "",
      resulbolet: "",
      nomcomipreced: "",
      incrtiemptrans: "",
      cuantittotal: "",
    },
    recordconductor: {
      restricc: "",
      clascatg: "",
      codestado: "",
      fecexp: "",
      fecrevali: "",
      fecrevmed: "",
      fecemi: "",
      indsancion: "",
      datosafect: "",
    },
    conpolitp: {
      atestado: "",
      codcomi: "",
      fecemi: "",
      factpredom: "",
      factcontrib: "",
      infraccion: "",
    },
    verificacionlicencia: {
      nomlicencia: "",
      docident: "",
      codproceden: "",
      cat: "",
      licenconducir: "",
      fecreval: "",
      fecexped: "",
      situacion: "",
      licenantigua: "",
    },
    inspvia: {
      via: [],
    },
    resinf: {
      analisis: report.meta_information || "",
      conclu: "",
    },
    ordencomp: {
      numorden: "",
      proveed: "",
      fechagen: "",
      detalle: "",
    },
    fotos,
  };

  return {
    compositerequest: [
      {
        body: {
          itransaccion: report.report_id ? String(report.report_id) : "",
          token: "20",
          id: "20",
        },
        parameters: { siniestro },
      },
    ],
  };
}
