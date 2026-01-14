const mockCategories = [
  { id: "food", name: "Food", group: "Places" },
  { id: "fuel", name: "Fuel", group: "Services" },
  { id: "hospital", name: "Hospital", group: "Services" },
  { id: "school", name: "School", group: "Places" },
  { id: "parking", name: "Parking", group: "Services" },
  { id: "shopping", name: "Shopping", group: "Places" },
  { id: "warehouse", name: "Warehouse", group: "Industry" },
  { id: "office", name: "Office", group: "Industry" },
  { id: "workshop", name: "Workshop", group: "Industry" },
];

const poiNames = {
  food: ["Restaurant", "Cafe", "Diner"],
  fuel: ["Fuel Station", "Gas Stop", "Petrol Point"],
  hospital: ["Clinic", "Hospital", "Medical Center"],
  school: ["School", "College", "Institute"],
  parking: ["Parking Lot", "Garage", "Parking"],
  shopping: ["Mall", "Market", "Shop"],
  warehouse: ["Warehouse", "Depot", "Storage"],
  office: ["Office", "HQ", "Branch"],
  workshop: ["Workshop", "Garage", "Service Bay"],
};

const categoryIcons = {
  food: "🍽️",
  fuel: "⛽",
  hospital: "🏥",
  school: "🏫",
  parking: "🅿️",
  shopping: "🛍️",
  warehouse: "🏭",
  office: "🏢",
  workshop: "🛠️",
  default: "📍",
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

const generateMockPOIs = (center, radiusMeters, categoryIds, limit = 100) => {
  const [lng, lat] = [center.lng, center.lat];
  const latRadius = radiusMeters / 111320;
  const lngRadius = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const pois = [];

  for (let i = 0; i < limit; i += 1) {
    const categoryId = categoryIds[i % categoryIds.length];
    const names = poiNames[categoryId] || [`POI ${categoryId}`];
    const name = names[Math.floor(Math.random() * names.length)];
    const offsetLng = randomBetween(-lngRadius, lngRadius);
    const offsetLat = randomBetween(-latRadius, latRadius);
    const distanceMeters = Math.round(randomBetween(50, radiusMeters));

    pois.push({
      id: `${categoryId}-${Date.now()}-${i}`,
      name: `${name} ${i + 1}`,
      categoryId,
      lat: lat + offsetLat,
      lng: lng + offsetLng,
      address: "Nearby location",
      distanceMeters,
    });
  }

  return pois;
};

export const fetchPOICategories = async () => {
  return Promise.resolve(mockCategories);
};

export const searchPOIs = async ({ center, radiusMeters, categoryIds, limit = 200 }) => {
  return Promise.resolve(generateMockPOIs(center, radiusMeters, categoryIds, limit));
};

export const getCategoryIcon = (id) => {
  return categoryIcons[id] || categoryIcons.default;
};

export const addCustomCategory = (name, group = "Custom") => {
  const newCategory = {
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    name,
    group,
  };
  mockCategories.push(newCategory);
  return newCategory;
};
