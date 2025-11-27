import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";

// Correct imports
import HomePage from "./pages/Homepage";
import DashboardHomePage from "./pages/DashboardHomePage";
import UploadPage from "./pages/UploadPage";
import ClaimsListPage from "./pages/ClaimsListPage";
// import ClaimDetailsPage from "./pages/ClaimDetailsPage";

function App() {
  return (
    <Router>
      <div style={styles.app}>
        <Header />

        <div style={styles.main}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardHomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/claims" element={<ClaimsListPage />} />
            {/* <Route path="/claims/:id" element={<ClaimDetailsPage />} /> */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    fontFamily: "Segoe UI, Arial, sans-serif",
    background: "transparent",
  },
  main: {
    paddingTop: "80px",
  },
};

export default App;
