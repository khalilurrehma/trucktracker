import React from "react";
import { Oval } from "react-loader-spinner";

const SettingLoader = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "30vh",
        width: "100%",
      }}
    >
      <Oval
        visible={true}
        height="50"
        width="50"
        color="#1a237e"
        ariaLabel="oval-loading"
        wrapperStyle={{}}
        wrapperClass=""
      />
    </div>
  );
};

export default SettingLoader;
