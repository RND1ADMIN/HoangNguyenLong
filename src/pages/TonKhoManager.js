import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Filter, Download, RefreshCw, Package, TrendingUp, TrendingDown, Archive, FileText, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const BaoCaoKho = () => {
  // State Management
  const [phieuList, setPhieuList] = useState([]);
  const [chiTietList, setChiTietList] = useState([]);
  const [dmhh, setDmhh] = useState([]);
  
  // Filter states
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedNhomHang, setSelectedNhomHang] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(true); // Thêm state cho ẩn/hiện bộ lọc
  
  // Report data states
  const [reportByNhomHang, setReportByNhomHang] = useState([]);
  const [reportByNhomHangChatLuong, setReportByNhomHangChatLuong] = useState([]);
  const [chiTietTonKho, setChiTietTonKho] = useState([]);
  const [topNhapNhieu, setTopNhapNhieu] = useState([]);
  const [topBanChay, setTopBanChay] = useState([]);
  const [topTonNhieu, setTopTonNhieu] = useState([]);
  
  // Expand states
  const [expandedSections, setExpandedSections] = useState({
    nhomHang: true,
    nhomHangChatLuong: true,
    chiTietTon: true,
    topNhap: true,
    topBan: true,
    topTon: true
  });

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

  // Fetch data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [phieuResponse, chiTietResponse, dmhhResponse] = await Promise.all([
        authUtils.apiRequestKHO('XUATNHAPKHO', 'Find', {}),
        authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {}),
        authUtils.apiRequestKHO('DMHH', 'Find', {})
      ]);
      
      setPhieuList(phieuResponse);
      setChiTietList(chiTietResponse);
      setDmhh(dmhhResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate reports
  useEffect(() => {
    if (chiTietList.length > 0) {
      calculateReports();
    }
  }, [chiTietList, filterDateFrom, filterDateTo, selectedNhomHang]);

  const calculateReports = () => {
    let filteredChiTiet = [...chiTietList];

    // Filter by date range
    if (filterDateFrom || filterDateTo) {
      filteredChiTiet = filteredChiTiet.filter(item => {
        const itemDate = new Date(item['NGAY_NHAP_XUAT']);
        let matches = true;
        
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          matches = matches && itemDate >= fromDate;
        }
        
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          matches = matches && itemDate <= toDate;
        }
        
        return matches;
      });
    }

    // Filter by nhom hang
    if (selectedNhomHang !== 'ALL') {
      filteredChiTiet = filteredChiTiet.filter(item => item['NHOM_HANG'] === selectedNhomHang);
    }

    // Calculate report by Nhom Hang
    const nhomHangMap = {};
    filteredChiTiet.forEach(item => {
      const nhomHang = item['NHOM_HANG'] || 'Không xác định';
      const nghiepVu = item['NGHIEP_VU'];
      const soKhoi = parseFloat(item['SO_KHOI']) || 0;
      const soThanh = parseFloat(item['THANH']) || 0;

      if (!nhomHangMap[nhomHang]) {
        nhomHangMap[nhomHang] = {
          nhomHang,
          soKienNhap: 0,
          soThanhNhap: 0,
          khoiLuongNhap: 0,
          soKienXuat: 0,
          soThanhXuat: 0,
          khoiLuongXuat: 0,
          soKienTon: 0,
          soThanhTon: 0,
          khoiLuongTon: 0
        };
      }

      if (nghiepVu === 'NHAP') {
        nhomHangMap[nhomHang].soKienNhap += 1;
        nhomHangMap[nhomHang].soThanhNhap += soThanh;
        nhomHangMap[nhomHang].khoiLuongNhap += soKhoi;
      } else if (nghiepVu === 'XUAT') {
        nhomHangMap[nhomHang].soKienXuat += 1;
        nhomHangMap[nhomHang].soThanhXuat += soThanh;
        nhomHangMap[nhomHang].khoiLuongXuat += soKhoi;
      }
    });

    // Calculate ton kho
    Object.keys(nhomHangMap).forEach(key => {
      nhomHangMap[key].soKienTon = nhomHangMap[key].soKienNhap - nhomHangMap[key].soKienXuat;
      nhomHangMap[key].soThanhTon = nhomHangMap[key].soThanhNhap - nhomHangMap[key].soThanhXuat;
      nhomHangMap[key].khoiLuongTon = nhomHangMap[key].khoiLuongNhap - nhomHangMap[key].khoiLuongXuat;
    });

    setReportByNhomHang(Object.values(nhomHangMap));

    // Calculate report by Nhom Hang + Chat Luong
    const nhomHangChatLuongMap = {};
    filteredChiTiet.forEach(item => {
      const nhomHang = item['NHOM_HANG'] || 'Không xác định';
      const chatLuong = item['CHATLUONG'] || 'Không xác định';
      const key = `${nhomHang}_${chatLuong}`;
      const nghiepVu = item['NGHIEP_VU'];
      const soKhoi = parseFloat(item['SO_KHOI']) || 0;
      const soThanh = parseFloat(item['THANH']) || 0;

      if (!nhomHangChatLuongMap[key]) {
        nhomHangChatLuongMap[key] = {
          nhomHang,
          chatLuong,
          soKienNhap: 0,
          soThanhNhap: 0,
          khoiLuongNhap: 0,
          soKienXuat: 0,
          soThanhXuat: 0,
          khoiLuongXuat: 0,
          soKienTon: 0,
          soThanhTon: 0,
          khoiLuongTon: 0
        };
      }

      if (nghiepVu === 'NHAP') {
        nhomHangChatLuongMap[key].soKienNhap += 1;
        nhomHangChatLuongMap[key].soThanhNhap += soThanh;
        nhomHangChatLuongMap[key].khoiLuongNhap += soKhoi;
      } else if (nghiepVu === 'XUAT') {
        nhomHangChatLuongMap[key].soKienXuat += 1;
        nhomHangChatLuongMap[key].soThanhXuat += soThanh;
        nhomHangChatLuongMap[key].khoiLuongXuat += soKhoi;
      }
    });

    Object.keys(nhomHangChatLuongMap).forEach(key => {
      nhomHangChatLuongMap[key].soKienTon = nhomHangChatLuongMap[key].soKienNhap - nhomHangChatLuongMap[key].soKienXuat;
      nhomHangChatLuongMap[key].soThanhTon = nhomHangChatLuongMap[key].soThanhNhap - nhomHangChatLuongMap[key].soThanhXuat;
      nhomHangChatLuongMap[key].khoiLuongTon = nhomHangChatLuongMap[key].khoiLuongNhap - nhomHangChatLuongMap[key].khoiLuongXuat;
    });

    setReportByNhomHangChatLuong(Object.values(nhomHangChatLuongMap));

    // Chi tiet ton kho (only NHAP items that haven't been XUAT)
    const tonKhoMap = {};
    filteredChiTiet.forEach(item => {
      const maKien = item['MA_KIEN'];
      if (!tonKhoMap[maKien]) {
        tonKhoMap[maKien] = { ...item };
      } else {
        // If already exists, it means it was exported
        if (item['NGHIEP_VU'] === 'XUAT') {
          delete tonKhoMap[maKien];
        }
      }
    });

    const tonKhoList = Object.values(tonKhoMap).filter(item => item['NGHIEP_VU'] === 'NHAP');
    setChiTietTonKho(tonKhoList);

    // Top nhap nhieu
    const topNhap = Object.values(nhomHangMap)
      .sort((a, b) => b.khoiLuongNhap - a.khoiLuongNhap)
      .slice(0, 10);
    setTopNhapNhieu(topNhap);

    // Top ban chay (xuat nhieu)
    const topBan = Object.values(nhomHangMap)
      .sort((a, b) => b.khoiLuongXuat - a.khoiLuongXuat)
      .slice(0, 10);
    setTopBanChay(topBan);

    // Top ton nhieu
    const topTon = Object.values(nhomHangMap)
      .sort((a, b) => b.khoiLuongTon - a.khoiLuongTon)
      .slice(0, 10);
    setTopTonNhieu(topTon);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return dateString;
    }
  };

  const uniqueNhomHang = [...new Set(chiTietList.map(item => item['NHOM_HANG']).filter(Boolean))];

  // Statistics
  const tongKienNhap = reportByNhomHang.reduce((sum, item) => sum + item.soKienNhap, 0);
  const tongKienXuat = reportByNhomHang.reduce((sum, item) => sum + item.soKienXuat, 0);
  const tongKienTon = reportByNhomHang.reduce((sum, item) => sum + item.soKienTon, 0);
  const tongThanhNhap = reportByNhomHang.reduce((sum, item) => sum + item.soThanhNhap, 0);
  const tongThanhXuat = reportByNhomHang.reduce((sum, item) => sum + item.soThanhXuat, 0);
  const tongThanhTon = reportByNhomHang.reduce((sum, item) => sum + item.soThanhTon, 0);
  const tongKhoiLuongNhap = reportByNhomHang.reduce((sum, item) => sum + item.khoiLuongNhap, 0);
  const tongKhoiLuongXuat = reportByNhomHang.reduce((sum, item) => sum + item.khoiLuongXuat, 0);
  const tongKhoiLuongTon = reportByNhomHang.reduce((sum, item) => sum + item.khoiLuongTon, 0);

  return (
    <div className="p-3 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Báo Cáo Kho</h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Thống kê và phân tích nhập xuất tồn kho</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchData}
                className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm"
                title="Tải lại dữ liệu"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm ${
                  showFilter 
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100' 
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">{showFilter ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilter && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Bộ lọc báo cáo:
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Từ ngày:</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Đến ngày:</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nhóm hàng:</label>
                  <select
                    value={selectedNhomHang}
                    onChange={(e) => setSelectedNhomHang(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="ALL">Tất cả nhóm hàng</option>
                    {uniqueNhomHang.map((nhomHang, index) => (
                      <option key={index} value={nhomHang}>{nhomHang}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-green-700">NHẬP KHO</h3>
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600">Số kiện:</span>
                <span className="text-lg font-bold text-green-900">{tongKienNhap}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600">Số thanh:</span>
                <span className="text-sm font-semibold text-green-800">{tongThanhNhap.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600">Khối lượng:</span>
                <span className="text-sm font-semibold text-green-800">{tongKhoiLuongNhap.toFixed(2)} m³</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-blue-700">XUẤT KHO</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600">Số kiện:</span>
                <span className="text-lg font-bold text-blue-900">{tongKienXuat}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600">Số thanh:</span>
                <span className="text-sm font-semibold text-blue-800">{tongThanhXuat.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600">Khối lượng:</span>
                <span className="text-sm font-semibold text-blue-800">{tongKhoiLuongXuat.toFixed(2)} m³</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-purple-700">TỒN KHO</h3>
              <Archive className="w-5 h-5 text-purple-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-600">Số kiện:</span>
                <span className="text-lg font-bold text-purple-900">{tongKienTon}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-600">Số thanh:</span>
                <span className="text-sm font-semibold text-purple-800">{tongThanhTon.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-600">Khối lượng:</span>
                <span className="text-sm font-semibold text-purple-800">{tongKhoiLuongTon.toFixed(2)} m³</span>
              </div>
            </div>
          </div>
        </div>

        {/* Report 1: By Nhom Hang */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 border border-gray-100">
          <div 
            className="flex justify-between items-center cursor-pointer mb-3"
            onClick={() => toggleSection('nhomHang')}
          >
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Báo cáo theo Nhóm hàng
            </h2>
            {expandedSections.nhomHang ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>

          {expandedSections.nhomHang && (
            <>
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Nhóm hàng</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Nhập (Kiện)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Nhập (Thanh)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Nhập (m³)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Xuất (Kiện)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Xuất (Thanh)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Xuất (m³)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Tồn (Kiện)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Tồn (Thanh)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Tồn (m³)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportByNhomHang.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{item.nhomHang}</td>
                        <td className="px-3 py-2 text-sm text-center text-green-600 font-semibold">{item.soKienNhap}</td>
                        <td className="px-3 py-2 text-sm text-center text-green-600">{item.soThanhNhap?.toFixed(0) || 0}</td>
                        <td className="px-3 py-2 text-sm text-center text-green-600">{item.khoiLuongNhap.toFixed(3)}</td>
                        <td className="px-3 py-2 text-sm text-center text-blue-600 font-semibold">{item.soKienXuat}</td>
                        <td className="px-3 py-2 text-sm text-center text-blue-600">{item.soThanhXuat?.toFixed(0) || 0}</td>
                        <td className="px-3 py-2 text-sm text-center text-blue-600">{item.khoiLuongXuat.toFixed(3)}</td>
                        <td className="px-3 py-2 text-sm text-center text-purple-600 font-semibold">{item.soKienTon}</td>
                        <td className="px-3 py-2 text-sm text-center text-purple-600">{item.soThanhTon?.toFixed(0) || 0}</td>
                        <td className="px-3 py-2 text-sm text-center text-purple-600 font-bold">{item.khoiLuongTon.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="px-3 py-2 text-sm font-bold text-gray-900">TỔNG CỘNG</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-green-700">{tongKienNhap}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-green-700">{tongThanhNhap.toFixed(0)}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-green-700">{tongKhoiLuongNhap.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-blue-700">{tongKienXuat}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-blue-700">{tongThanhXuat.toFixed(0)}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-blue-700">{tongKhoiLuongXuat.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-purple-700">{tongKienTon}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-purple-700">{tongThanhTon.toFixed(0)}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-purple-700">{tongKhoiLuongTon.toFixed(3)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Chart - Tăng chiều cao và scroll ngang nếu data nhiều */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Biểu đồ số kiện</h3>
                  <ResponsiveContainer width="100%" height={400} minWidth={reportByNhomHang.length * 80}>
                    <BarChart data={reportByNhomHang} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="nhomHang" 
                        angle={-45} 
                        textAnchor="end" 
                        height={120} 
                        fontSize={9}
                        interval={0}
                      />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar dataKey="soKienNhap" fill="#10b981" name="Nhập" />
                      <Bar dataKey="soKienXuat" fill="#3b82f6" name="Xuất" />
                      <Bar dataKey="soKienTon" fill="#8b5cf6" name="Tồn" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Biểu đồ khối lượng (m³)</h3>
                  <ResponsiveContainer width="100%" height={400} minWidth={reportByNhomHang.length * 80}>
                    <BarChart data={reportByNhomHang} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="nhomHang" 
                        angle={-45} 
                        textAnchor="end" 
                        height={120} 
                        fontSize={9}
                        interval={0}
                      />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar dataKey="khoiLuongNhap" fill="#10b981" name="Nhập" />
                      <Bar dataKey="khoiLuongXuat" fill="#3b82f6" name="Xuất" />
                      <Bar dataKey="khoiLuongTon" fill="#8b5cf6" name="Tồn" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Report 2: By Nhom Hang + Chat Luong */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 border border-gray-100">
          <div 
            className="flex justify-between items-center cursor-pointer mb-3"
            onClick={() => toggleSection('nhomHangChatLuong')}
          >
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Báo cáo theo Nhóm hàng & Chất lượng
            </h2>
            {expandedSections.nhomHangChatLuong ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>

          {expandedSections.nhomHangChatLuong && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Nhóm hàng</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Chất lượng</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Nhập (Kiện)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Nhập (Thanh)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Nhập (m³)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Xuất (Kiện)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Xuất (Thanh)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Xuất (m³)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Tồn (Kiện)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Tồn (Thanh)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Tồn (m³)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportByNhomHangChatLuong.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{item.nhomHang}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          {item.chatLuong}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-green-600 font-semibold">{item.soKienNhap}</td>
                      <td className="px-3 py-2 text-sm text-center text-green-600">{item.soThanhNhap?.toFixed(0) || 0}</td>
                      <td className="px-3 py-2 text-sm text-center text-green-600">{item.khoiLuongNhap.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center text-blue-600 font-semibold">{item.soKienXuat}</td>
                      <td className="px-3 py-2 text-sm text-center text-blue-600">{item.soThanhXuat?.toFixed(0) || 0}</td>
                      <td className="px-3 py-2 text-sm text-center text-blue-600">{item.khoiLuongXuat.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center text-purple-600 font-semibold">{item.soKienTon}</td>
                      <td className="px-3 py-2 text-sm text-center text-purple-600">{item.soThanhTon?.toFixed(0) || 0}</td>
                      <td className="px-3 py-2 text-sm text-center text-purple-600 font-bold">{item.khoiLuongTon.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chi tiet ton kho */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 border border-gray-100">
          <div 
            className="flex justify-between items-center cursor-pointer mb-3"
            onClick={() => toggleSection('chiTietTon')}
          >
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Archive className="w-5 h-5 text-orange-600" />
              Chi tiết kiện tồn kho ({chiTietTonKho.length} kiện)
            </h2>
            {expandedSections.chiTietTon ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>

          {expandedSections.chiTietTon && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">STT</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Mã kiện</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Nhóm hàng</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Kích thước</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Chất lượng</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Số thanh</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Khối lượng (m³)</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Kho</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">Ngày nhập</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chiTietTonKho.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{item['MA_KIEN']}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{item['NHOM_HANG']}</td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700">
                        {item['DAY']}x{item['RONG']}x{item['DAI']}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item['CHATLUONG'] && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {item['CHATLUONG']}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700 font-medium">
                        {item['THANH'] || '—'}
                      </td>
                      <td className="px-3 py-2 text-sm text-center font-semibold text-purple-600">
                        {parseFloat(item['SO_KHOI'] || 0).toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700">{item['KHO_NHAP']}</td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700">{formatDate(item['NGAY_NHAP_XUAT'])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Nhap Nhieu */}
          <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 border border-gray-100">
            <div 
              className="flex justify-between items-center cursor-pointer mb-3"
              onClick={() => toggleSection('topNhap')}
            >
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                Top 10 nhập nhiều
              </h2>
              {expandedSections.topNhap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>

            {expandedSections.topNhap && (
              <>
                <div className="space-y-2 mb-3">
                  {topNhapNhieu.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{item.nhomHang}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">{item.soKienNhap} kiện</div>
                        <div className="text-xs text-green-500">{item.khoiLuongNhap.toFixed(2)} m³</div>
                      </div>
                    </div>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={topNhapNhieu.slice(0, 5)}
                      dataKey="khoiLuongNhap"
                      nameKey="nhomHang"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={(entry) => entry.nhomHang}
                      fontSize={10}
                    >
                      {topNhapNhieu.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Top Ban Chay */}
          <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 border border-gray-100">
            <div 
              className="flex justify-between items-center cursor-pointer mb-3"
              onClick={() => toggleSection('topBan')}
            >
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Top 10 bán chạy
              </h2>
              {expandedSections.topBan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>

            {expandedSections.topBan && (
              <>
                <div className="space-y-2 mb-3">
                  {topBanChay.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{item.nhomHang}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-600">{item.soKienXuat} kiện</div>
                        <div className="text-xs text-blue-500">{item.khoiLuongXuat.toFixed(2)} m³</div>
                      </div>
                    </div>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={topBanChay.slice(0, 5)}
                      dataKey="khoiLuongXuat"
                      nameKey="nhomHang"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={(entry) => entry.nhomHang}
                      fontSize={10}
                    >
                      {topBanChay.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Top Ton Nhieu */}
          <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 border border-gray-100">
            <div 
              className="flex justify-between items-center cursor-pointer mb-3"
              onClick={() => toggleSection('topTon')}
            >
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Archive className="w-4 h-4 text-purple-600" />
                Top 10 tồn nhiều
              </h2>
              {expandedSections.topTon ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>

            {expandedSections.topTon && (
              <>
                <div className="space-y-2 mb-3">
                  {topTonNhieu.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 bg-purple-600 text-white rounded-full text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{item.nhomHang}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-purple-600">{item.soKienTon} kiện</div>
                        <div className="text-xs text-purple-500">{item.khoiLuongTon.toFixed(2)} m³</div>
                      </div>
                    </div>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={topTonNhieu.slice(0, 5)}
                      dataKey="khoiLuongTon"
                      nameKey="nhomHang"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={(entry) => entry.nhomHang}
                      fontSize={10}
                    >
                      {topTonNhieu.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default BaoCaoKho;
