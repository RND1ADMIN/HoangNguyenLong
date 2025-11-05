import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './pages/LoginPage';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';
import authUtils from './utils/authUtils';
import Profile from './pages/Profile';
import Users from './pages/UserManagement';
import ReportManagement from './pages/BaoCao';
import TongHop from './pages/TongHop';
// import XuatNhapKhoForm from './pages/XuatNhapKhoForm';
// import QuyCachManagement from './pages/QuyCachManagement';

import GiaBanManagement from './pages/GiaBanManagement';
import DMHHManagement from './pages/DMHHManagement';
import DSKHManagement from './pages/DSKHManagement';
import HopDongNguyenTacManagement from './pages/HopDongNguyenTacManagement';
import XuatNhapKhoManager from './pages/XuatNhapKhoManager';

import CongDoanDonGiaManagement from './pages/CongDoanDonGiaManagement';
import PhanBoNhanSuManagement from './pages/PhanBoNhanSuManagement';
import NhapBaoBiManagement from './pages/NhapBaoBiManagement';

import BaoCaoMobie from './pages/BaoCaoMobie';
import TonKhoManager from './pages/TonKhoManager';
import Baocaoreport from './pages/Baocaoreport';
import TheKhoManagement from './pages/TheKhoManagement';

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
                  <Route path="/home" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/users" element={<Users />} />
                  {/* <Route path="/xuatnhapfrom" element={<XuatNhapKhoForm />} />
                  <Route path="/xuatnhapfrom/:maPhieu" element={<XuatNhapKhoForm />} /> */}

                  <Route path="/giaban" element={<GiaBanManagement />} />
                  <Route path="/dmhh" element={<DMHHManagement />} />
                  <Route path="/dskh" element={<DSKHManagement />} />
                  <Route path="/hopdongnguyentac" element={<HopDongNguyenTacManagement />} />
                  <Route path="/xuatnhapkho" element={<XuatNhapKhoManager />} />
                  <Route path="/tonkho" element={<TonKhoManager />} />
                  <Route path="/makien" element={<TheKhoManagement />} />
                  
                  <Route path="/baocaoreport" element={<Baocaoreport />} />
                  <Route path="/nhapbaobi" element={<NhapBaoBiManagement />} />
                  <Route path="/congdoan_dongia" element={<CongDoanDonGiaManagement />} />
                  <Route path="/phanbonhansu" element={<PhanBoNhanSuManagement />} />
                  <Route path="/report" element={<ReportManagement />} />
                  <Route path="/tonghop" element={<TongHop />} />
                  <Route path="/reportMobile" element={<BaoCaoMobie />} />
                  



                  <Route path="/" element={<Navigate to="/home" replace />} />
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