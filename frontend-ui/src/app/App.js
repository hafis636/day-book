import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import About from "../pages/about";
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;