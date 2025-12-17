import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignImages from "./pages/SignImages";
import SignAvatar from "./pages/SignAvatar";
import ASLHand from "./pages/ASLHand";
import ASLRecognizer from "./pages/ASLRecognizer";
import Deaf from "./pages/Deaf";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/image" element={<SignImages />} />
        <Route path="/avatar" element={<SignAvatar />} />
        <Route path="/letters" element={<ASLHand />} />
        <Route path="/recognize" element={<ASLRecognizer />} />
        <Route path="/deaf" element={<Deaf />} />
        <Route path="*" element={<h1>404: Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}
