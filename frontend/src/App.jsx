// App.jsx
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Signup from "./components/Signup";
import Login from "./components/Login";
import FaceDetection from "./components/FaceDetection";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<Signup />} />
      <Route path="login" element={<Login />} />
      <Route path="face-detection" element={<FaceDetection />} />
    </Route>
  )
);

export default function App() {
  return <RouterProvider router={router} />;
}
