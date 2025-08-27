import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';
import authUtils from './utils/authUtils';
import Profile from './pages/Profile';
import Users from './pages/UserManagement';
import ReportManagement from './pages/BaoCao';
import XuatNhapKhoForm from './pages/XuatNhapKhoForm';
import DMHHManagement  from './pages/DMHHManagement';
import XuatNhapKhoManager from './pages/XuatNhapKhoManager';
import CongDoanManagement from './pages/CongDoan';
import ReportMobile from './pages/BaoCaoMobie';
import TonKhoManager from './pages/TonKhoManager';
import Baocaoreport from './pages/Baocaoreport';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!authUtils.isAuthenticated()) {
    // Lưu lại đường dẫn hiện tại trước khi chuyển hướng
    localStorage.setItem('returnUrl', location.pathname + location.search);
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    // Không cần basename vì đã có domain
    <BrowserRouter>
      <ToastContainer position="top-right" />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/xuatnhapfrom" element={<XuatNhapKhoForm />} />
                  <Route path="/xuatnhapfrom/:maPhieu" element={<XuatNhapKhoForm />} />
                  <Route path="/dmhh" element={<DMHHManagement />} />
                  <Route path="/xuatnhapkho" element={<XuatNhapKhoManager />} />
                  <Route path="/tonkho" element={<TonKhoManager />} />
                  <Route path="/baocaoreport" element={<Baocaoreport />} />
                  
                  <Route path="/congdoan" element={<CongDoanManagement />} />
                  <Route path="/report" element={<ReportManagement />} />
                  <Route path="/reportMobile" element={<ReportMobile />} />



                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;