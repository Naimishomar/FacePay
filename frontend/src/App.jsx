// App.jsx
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Signup from "./components/Signup";
import Login from "./components/Login";
import FaceRegistration from "./components/FaceRegistration";
import Home from "./components/Home";
import PayFaceDetection from "./components/PayFaceDetection";
import Pay from "./components/Pay";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/Face-registration" element={<FaceRegistration />} />
      <Route path="/home/:id" element={<Home />} />
      <Route path="/detect" element={<PayFaceDetection />} />
      <Route path="/pay" element={<Pay />} />
    </Route>
  )
);

export default function App() {
  return <RouterProvider router={router} />;
}
