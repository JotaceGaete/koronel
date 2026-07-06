import React from "react";
import Routes from "./Routes";
import { AuthProvider } from "./contexts/AuthContext";
import { CityProvider } from "./contexts/CityContext";

function App() {
  return (
    <CityProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </CityProvider>
  );
}

export default App;
