// App.jsx
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Signup from "./components/Signup";
import Login from "./components/Login";
import FaceRegistration from "./components/FaceRegistration";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/Face-registration" element={<FaceRegistration />} />
    </Route>
  )
);

export default function App() {
  return <RouterProvider router={router} />;
}
