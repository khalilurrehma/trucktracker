export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        tablet: "768px",
        "mobile-l": "425px",
        "mobile-m": "375px",
        "mobile-s": "320px",
      },
    },
  },

  plugins: [],
};
