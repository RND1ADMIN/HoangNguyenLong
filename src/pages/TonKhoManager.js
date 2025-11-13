import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Filter, Download, RefreshCw, Package, TrendingUp, TrendingDown, Archive, FileText, ChevronDown, ArrowDownToLine, ArrowUpFromLine, Award, Layers, Search, X } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const BaoCaoKho = () => {
  // Helper function to get default date range (first day of month to today)
  const getDefaultDateRange = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      from: formatDate(firstDayOfMonth),
      to: formatDate(today)
    };
  };

  const defaultDates = getDefaultDateRange();

  // State Management
  const [phieuList, setPhieuList] = useState([]);
  const [chiTietList, setChiTietList] = useState([]);
  const [dmhh, setDmhh] = useState([]);

  // Filter states - Khởi tạo với giá trị mặc định
  const [filterDateFrom, setFilterDateFrom] = useState(defaultDates.from);
  const [filterDateTo, setFilterDateTo] = useState(defaultDates.to);
  const [selectedNhomHang, setSelectedNhomHang] = useState('ALL');
  const [searchNhomHang, setSearchNhomHang] = useState('');
  const [showNhomHangDropdown, setShowNhomHangDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(true);
  const [activeTab, setActiveTab] = useState('tong-hop');
  const [activeTop10Tab, setActiveTop10Tab] = useState('nhap');

  // Refs
  const nhomHangDropdownRef = useRef(null);

  // Report data states
  const [tongHopData, setTongHopData] = useState({
    tonDauKy: { kien: 0, m3: 0 },
    nhapTrongKy: { kien: 0, m3: 0 },
    xuatTrongKy: { kien: 0, m3: 0 },
    tonCuoiKy: { kien: 0, m3: 0 }
  });
  const [tonTheoNhomHang, setTonTheoNhomHang] = useState([]);
  const [tonTheoKien, setTonTheoKien] = useState([]);
  const [tonTheoDoDay, setTonTheoDoDay] = useState([]);
  const [top10Data, setTop10Data] = useState({
    nhapNhieu: [],
    xuatNhieu: [],
    tonNhieu: []
  });

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

  // Get unique nhom hang
  const uniqueNhomHang = [...new Set(chiTietList.map(item => item['NHOM_HANG']).filter(Boolean))];

  // Filter nhom hang based on search
  const filteredNhomHang = uniqueNhomHang.filter(nhomHang =>
    nhomHang.toLowerCase().includes(searchNhomHang.toLowerCase())
  );

  // Get display text for selected nhom hang
  const getSelectedNhomHangText = () => {
    if (selectedNhomHang === 'ALL') {
      return 'Tất cả nhóm hàng';
    }
    return selectedNhomHang;
  };

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (nhomHangDropdownRef.current && !nhomHangDropdownRef.current.contains(event.target)) {
        setShowNhomHangDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Calculate Top 10
  const calculateTop10 = (data) => {
    // Top 10 Nhập nhiều nhất
    const nhapNhieu = [...data]
      .sort((a, b) => b.nhap.m3 - a.nhap.m3)
      .slice(0, 10)
      .map(item => ({
        nhomHang: item.nhomHang,
        tieuChuan: item.tieuChuan,
        kien: item.nhap.kien,
        m3: item.nhap.m3
      }));

    // Top 10 Xuất nhiều nhất
    const xuatNhieu = [...data]
      .sort((a, b) => b.xuat.m3 - a.xuat.m3)
      .slice(0, 10)
      .map(item => ({
        nhomHang: item.nhomHang,
        tieuChuan: item.tieuChuan,
        kien: item.xuat.kien,
        m3: item.xuat.m3
      }));

    // Top 10 Tồn nhiều nhất
    const tonNhieu = [...data]
      .sort((a, b) => b.tonCuoiKy.m3 - a.tonCuoiKy.m3)
      .slice(0, 10)
      .map(item => ({
        nhomHang: item.nhomHang,
        tieuChuan: item.tieuChuan,
        kien: item.tonCuoiKy.kien,
        m3: item.tonCuoiKy.m3
      }));

    setTop10Data({ nhapNhieu, xuatNhieu, tonNhieu });
  };

  const calculateReports = () => {
    const fromDate = filterDateFrom ? new Date(filterDateFrom) : null;
    const toDate = filterDateTo ? new Date(filterDateTo) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // Phân loại dữ liệu theo thời gian
    const dataTruocKy = [];
    const dataTrongKy = [];
    const dataSauKy = [];

    chiTietList.forEach(item => {
      const itemDate = new Date(item['NGAY_NHAP_XUAT']);

      if (fromDate && itemDate < fromDate) {
        dataTruocKy.push(item);
      } else if ((!fromDate || itemDate >= fromDate) && (!toDate || itemDate <= toDate)) {
        dataTrongKy.push(item);
      } else if (toDate && itemDate > toDate) {
        dataSauKy.push(item);
      }
    });

    // Filter by nhom hang if needed
    const filterByNhomHang = (data) => {
      if (selectedNhomHang === 'ALL') return data;
      return data.filter(item => item['NHOM_HANG'] === selectedNhomHang);
    };

    const dataTruocKyFiltered = filterByNhomHang(dataTruocKy);
    const dataTrongKyFiltered = filterByNhomHang(dataTrongKy);

    // Tính tồn đầu kỳ (từ đầu đến trước kỳ báo cáo)
    const tonDauKy = calculateTonKho(dataTruocKyFiltered);

    // Tính nhập xuất trong kỳ
    const nhapXuatTrongKy = calculateNhapXuat(dataTrongKyFiltered);

    // Tính tồn cuối kỳ
    const tonCuoiKy = {
      kien: tonDauKy.kien + nhapXuatTrongKy.nhap.kien - nhapXuatTrongKy.xuat.kien,
      m3: tonDauKy.m3 + nhapXuatTrongKy.nhap.m3 - nhapXuatTrongKy.xuat.m3
    };

    // Set tổng hợp data
    setTongHopData({
      tonDauKy: tonDauKy,
      nhapTrongKy: nhapXuatTrongKy.nhap,
      xuatTrongKy: nhapXuatTrongKy.xuat,
      tonCuoiKy: tonCuoiKy
    });

    // Tính tồn theo nhóm hàng
    const nhomHangData = calculateTonTheoNhomHang(dataTruocKyFiltered, dataTrongKyFiltered);
    setTonTheoNhomHang(nhomHangData);

    // Calculate Top 10
    calculateTop10(nhomHangData);

    // Tính tồn theo kiện
    calculateTonTheoKien(dataTruocKyFiltered, dataTrongKyFiltered);

    // Tính tồn theo độ dày
    calculateTonTheoDoDay(dataTruocKyFiltered, dataTrongKyFiltered);
  };

  const calculateTonKho = (data) => {
    const tonKhoMap = {};

    data.forEach(item => {
      const maKien = item['MA_KIEN'];
      const nghiepVu = item['NGHIEP_VU'];

      if (nghiepVu === 'NHAP') {
        tonKhoMap[maKien] = item;
      } else if (nghiepVu === 'XUAT') {
        delete tonKhoMap[maKien];
      }
    });

    const tonKhoList = Object.values(tonKhoMap);
    return {
      kien: tonKhoList.length,
      m3: tonKhoList.reduce((sum, item) => sum + (parseFloat(item['SO_KHOI']) || 0), 0)
    };
  };

  const calculateNhapXuat = (data) => {
    let nhapKien = 0, nhapM3 = 0;
    let xuatKien = 0, xuatM3 = 0;

    data.forEach(item => {
      const nghiepVu = item['NGHIEP_VU'];
      const soKhoi = parseFloat(item['SO_KHOI']) || 0;

      if (nghiepVu === 'NHAP') {
        nhapKien += 1;
        nhapM3 += soKhoi;
      } else if (nghiepVu === 'XUAT') {
        xuatKien += 1;
        xuatM3 += soKhoi;
      }
    });

    return {
      nhap: { kien: nhapKien, m3: nhapM3 },
      xuat: { kien: xuatKien, m3: xuatM3 }
    };
  };

  const calculateTonTheoNhomHang = (dataTruocKy, dataTrongKy) => {
    const nhomHangMap = {};

    // Tính tồn đầu kỳ theo nhóm hàng
    const tonDauKyMap = {};
    dataTruocKy.forEach(item => {
      const maKien = item['MA_KIEN'];
      const nghiepVu = item['NGHIEP_VU'];

      if (nghiepVu === 'NHAP') {
        tonDauKyMap[maKien] = item;
      } else if (nghiepVu === 'XUAT') {
        delete tonDauKyMap[maKien];
      }
    });

    Object.values(tonDauKyMap).forEach(item => {
      const nhomHang = item['NHOM_HANG'] || 'Không xác định';
      const tieuChuan = item['TIEU_CHUAN'] || 'Không xác định';
      const key = `${nhomHang}_${tieuChuan}`;

      if (!nhomHangMap[key]) {
        nhomHangMap[key] = {
          nhomHang,
          tieuChuan,
          tonDauKy: { kien: 0, m3: 0 },
          nhap: { kien: 0, m3: 0 },
          xuat: { kien: 0, m3: 0 },
          tonCuoiKy: { kien: 0, m3: 0 }
        };
      }

      nhomHangMap[key].tonDauKy.kien += 1;
      nhomHangMap[key].tonDauKy.m3 += parseFloat(item['SO_KHOI']) || 0;
    });

    // Tính nhập xuất trong kỳ theo nhóm hàng
    dataTrongKy.forEach(item => {
      const nhomHang = item['NHOM_HANG'] || 'Không xác định';
      const tieuChuan = item['TIEU_CHUAN'] || 'Không xác định';
      const key = `${nhomHang}_${tieuChuan}`;
      const nghiepVu = item['NGHIEP_VU'];
      const soKhoi = parseFloat(item['SO_KHOI']) || 0;

      if (!nhomHangMap[key]) {
        nhomHangMap[key] = {
          nhomHang,
          tieuChuan,
          tonDauKy: { kien: 0, m3: 0 },
          nhap: { kien: 0, m3: 0 },
          xuat: { kien: 0, m3: 0 },
          tonCuoiKy: { kien: 0, m3: 0 }
        };
      }

      if (nghiepVu === 'NHAP') {
        nhomHangMap[key].nhap.kien += 1;
        nhomHangMap[key].nhap.m3 += soKhoi;
      } else if (nghiepVu === 'XUAT') {
        nhomHangMap[key].xuat.kien += 1;
        nhomHangMap[key].xuat.m3 += soKhoi;
      }
    });

    // Tính tồn cuối kỳ
    Object.keys(nhomHangMap).forEach(key => {
      const item = nhomHangMap[key];
      item.tonCuoiKy.kien = item.tonDauKy.kien + item.nhap.kien - item.xuat.kien;
      item.tonCuoiKy.m3 = item.tonDauKy.m3 + item.nhap.m3 - item.xuat.m3;
    });

    return Object.values(nhomHangMap);
  };

  const calculateTonTheoKien = (dataTruocKy, dataTrongKy) => {
    const tonKhoMap = {};

    // Tính tồn đầu kỳ
    dataTruocKy.forEach(item => {
      const maKien = item['MA_KIEN'];
      const nghiepVu = item['NGHIEP_VU'];

      if (nghiepVu === 'NHAP') {
        tonKhoMap[maKien] = { ...item, trangThai: 'TON_DAU_KY' };
      } else if (nghiepVu === 'XUAT') {
        delete tonKhoMap[maKien];
      }
    });

    // Xử lý nhập xuất trong kỳ
    dataTrongKy.forEach(item => {
      const maKien = item['MA_KIEN'];
      const nghiepVu = item['NGHIEP_VU'];

      if (nghiepVu === 'NHAP') {
        tonKhoMap[maKien] = { ...item, trangThai: 'NHAP_TRONG_KY' };
      } else if (nghiepVu === 'XUAT') {
        delete tonKhoMap[maKien];
      }
    });

    // Chỉ lấy các kiện còn tồn
    const tonKhoList = Object.values(tonKhoMap);
    setTonTheoKien(tonKhoList);
  };

  // Hàm mới: Tính tồn theo độ dày
  const calculateTonTheoDoDay = (dataTruocKy, dataTrongKy) => {
    const doDayMap = {};

    // Tính tồn đầu kỳ theo độ dày
    const tonDauKyMap = {};
    dataTruocKy.forEach(item => {
      const maKien = item['MA_KIEN'];
      const nghiepVu = item['NGHIEP_VU'];

      if (nghiepVu === 'NHAP') {
        tonDauKyMap[maKien] = item;
      } else if (nghiepVu === 'XUAT') {
        delete tonDauKyMap[maKien];
      }
    });

    Object.values(tonDauKyMap).forEach(item => {
      const doDay = item['DAY'] || 'Không xác định';

      if (!doDayMap[doDay]) {
        doDayMap[doDay] = {
          doDay,
          tonDauKy: { kien: 0, m3: 0 },
          nhap: { kien: 0, m3: 0 },
          xuat: { kien: 0, m3: 0 },
          tonCuoiKy: { kien: 0, m3: 0 }
        };
      }

      doDayMap[doDay].tonDauKy.kien += 1;
      doDayMap[doDay].tonDauKy.m3 += parseFloat(item['SO_KHOI']) || 0;
    });

    // Tính nhập xuất trong kỳ theo độ dày
    dataTrongKy.forEach(item => {
      const doDay = item['DAY'] || 'Không xác định';
      const nghiepVu = item['NGHIEP_VU'];
      const soKhoi = parseFloat(item['SO_KHOI']) || 0;

      if (!doDayMap[doDay]) {
        doDayMap[doDay] = {
          doDay,
          tonDauKy: { kien: 0, m3: 0 },
          nhap: { kien: 0, m3: 0 },
          xuat: { kien: 0, m3: 0 },
          tonCuoiKy: { kien: 0, m3: 0 }
        };
      }

      if (nghiepVu === 'NHAP') {
        doDayMap[doDay].nhap.kien += 1;
        doDayMap[doDay].nhap.m3 += soKhoi;
      } else if (nghiepVu === 'XUAT') {
        doDayMap[doDay].xuat.kien += 1;
        doDayMap[doDay].xuat.m3 += soKhoi;
      }
    });

    // Tính tồn cuối kỳ
    Object.keys(doDayMap).forEach(key => {
      const item = doDayMap[key];
      item.tonCuoiKy.kien = item.tonDauKy.kien + item.nhap.kien - item.xuat.kien;
      item.tonCuoiKy.m3 = item.tonDauKy.m3 + item.nhap.m3 - item.xuat.m3;
    });

    // Sắp xếp theo độ dày (số)
    const sortedData = Object.values(doDayMap).sort((a, b) => {
      const doDayA = parseFloat(a.doDay) || 0;
      const doDayB = parseFloat(b.doDay) || 0;
      return doDayA - doDayB;
    });

    setTonTheoDoDay(sortedData);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num));
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

  // Custom label for bar chart
  const renderCustomBarLabel = (props) => {
    const { x, y, width, height, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="#374151"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
      >
        {value}
      </text>
    );
  };

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
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Báo Cáo Tồn Kho</h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Thống kê tồn đầu kỳ, nhập, xuất, tồn cuối kỳ</p>
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
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm ${showFilter
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

                <div className="relative" ref={nhomHangDropdownRef}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nhóm hàng:</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowNhomHangDropdown(!showNhomHangDropdown)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-left flex items-center justify-between"
                    >
                      <span className={selectedNhomHang === 'ALL' ? 'text-gray-500' : 'text-gray-900'}>
                        {getSelectedNhomHangText()}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNhomHangDropdown ? 'transform rotate-180' : ''}`} />
                    </button>

                    {showNhomHangDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                        {/* Search box */}
                        <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={searchNhomHang}
                              onChange={(e) => setSearchNhomHang(e.target.value)}
                              placeholder="Tìm kiếm nhóm hàng..."
                              className="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            {searchNhomHang && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchNhomHang('');
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Options list */}
                        <div className="max-h-60 overflow-y-auto">
                          <button
                            onClick={() => {
                              setSelectedNhomHang('ALL');
                              setShowNhomHangDropdown(false);
                              setSearchNhomHang('');
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${selectedNhomHang === 'ALL' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                              }`}
                          >
                            Tất cả nhóm hàng
                          </button>

                          {filteredNhomHang.length > 0 ? (
                            filteredNhomHang.map((nhomHang, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSelectedNhomHang(nhomHang);
                                  setShowNhomHangDropdown(false);
                                  setSearchNhomHang('');
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${selectedNhomHang === nhomHang ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                                  }`}
                              >
                                {nhomHang}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                              Không tìm thấy nhóm hàng phù hợp
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clear button */}
                  {selectedNhomHang !== 'ALL' && (
                    <button
                      onClick={() => {
                        setSelectedNhomHang('ALL');
                        setSearchNhomHang('');
                      }}
                      className="absolute right-8 top-[30px] text-gray-400 hover:text-gray-600"
                      title="Xóa lựa chọn"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards - Hiển thị ở tất cả các tab */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-orange-700">TỒN ĐẦU KỲ</h3>
              <Archive className="w-5 h-5 text-orange-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-orange-600">Số kiện:</span>
                <span className="text-lg font-bold text-orange-900">{formatNumber(tongHopData.tonDauKy.kien)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-orange-600">Khối lượng:</span>
                <span className="text-sm font-semibold text-orange-800">{tongHopData.tonDauKy.m3.toFixed(3)} m³</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-green-700">NHẬP TRONG KỲ</h3>
              <ArrowDownToLine className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600">Số kiện:</span>
                <span className="text-lg font-bold text-green-900">{formatNumber(tongHopData.nhapTrongKy.kien)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600">Khối lượng:</span>
                <span className="text-sm font-semibold text-green-800">{tongHopData.nhapTrongKy.m3.toFixed(3)} m³</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-blue-700">XUẤT TRONG KỲ</h3>
              <ArrowUpFromLine className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600">Số kiện:</span>
                <span className="text-lg font-bold text-blue-900">{formatNumber(tongHopData.xuatTrongKy.kien)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600">Khối lượng:</span>
                <span className="text-sm font-semibold text-blue-800">{tongHopData.xuatTrongKy.m3.toFixed(3)} m³</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-purple-700">TỒN CUỐI KỲ</h3>
              <Archive className="w-5 h-5 text-purple-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-600">Số kiện:</span>
                <span className="text-lg font-bold text-purple-900">{formatNumber(tongHopData.tonCuoiKy.kien)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-600">Khối lượng:</span>
                <span className="text-sm font-semibold text-purple-800">{tongHopData.tonCuoiKy.m3.toFixed(3)} m³</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'tong-hop' && (
          <div className="space-y-4">
            {/* Chart Tổng Hợp */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-base font-bold text-gray-800 mb-4">Biểu đồ tổng hợp</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Số kiện</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { name: 'Tồn đầu kỳ', value: tongHopData.tonDauKy.kien },
                        { name: 'Nhập', value: tongHopData.nhapTrongKy.kien },
                        { name: 'Xuất', value: tongHopData.xuatTrongKy.kien },
                        { name: 'Tồn cuối kỳ', value: tongHopData.tonCuoiKy.kien }
                      ]}
                      margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" label={renderCustomBarLabel} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Khối lượng (m³)</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { name: 'Tồn đầu kỳ', value: parseFloat(tongHopData.tonDauKy.m3.toFixed(3)) },
                        { name: 'Nhập', value: parseFloat(tongHopData.nhapTrongKy.m3.toFixed(3)) },
                        { name: 'Xuất', value: parseFloat(tongHopData.xuatTrongKy.m3.toFixed(3)) },
                        { name: 'Tồn cuối kỳ', value: parseFloat(tongHopData.tonCuoiKy.m3.toFixed(3)) }
                      ]}
                      margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        label={(props) => {
                          const { x, y, width, value } = props;
                          return (
                            <text
                              x={x + width / 2}
                              y={y - 5}
                              fill="#374151"
                              textAnchor="middle"
                              fontSize="12"
                              fontWeight="600"
                            >
                              {value.toFixed(3)}
                            </text>
                          );
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top 10 Section */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Top 10 Mặt Hàng
              </h3>

              {/* Top 10 Tabs */}
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTop10Tab('nhap')}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTop10Tab === 'nhap'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  Nhập nhiều nhất
                </button>
                <button
                  onClick={() => setActiveTop10Tab('xuat')}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTop10Tab === 'xuat'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  Xuất nhiều nhất
                </button>
                <button
                  onClick={() => setActiveTop10Tab('ton')}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTop10Tab === 'ton'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  Tồn nhiều nhất
                </button>
              </div>

              {/* Top 10 Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${activeTop10Tab === 'nhap' ? 'bg-gradient-to-r from-green-50 to-green-100' :
                      activeTop10Tab === 'xuat' ? 'bg-gradient-to-r from-blue-50 to-blue-100' :
                        'bg-gradient-to-r from-purple-50 to-purple-100'
                      }`}>
                      <tr>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Top</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nhóm hàng</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Chất lượng</th>
                        <th className={`px-3 py-3 text-center text-xs font-bold uppercase ${activeTop10Tab === 'nhap' ? 'text-green-700' :
                          activeTop10Tab === 'xuat' ? 'text-blue-700' :
                            'text-purple-700'
                          }`}>Kiện</th>
                        <th className={`px-3 py-3 text-center text-xs font-bold uppercase ${activeTop10Tab === 'nhap' ? 'text-green-700' :
                          activeTop10Tab === 'xuat' ? 'text-blue-700' :
                            'text-purple-700'
                          }`}>m³</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(activeTop10Tab === 'nhap' ? top10Data.nhapNhieu :
                        activeTop10Tab === 'xuat' ? top10Data.xuatNhieu :
                          top10Data.tonNhieu).map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                  index === 1 ? 'bg-gray-300 text-gray-900' :
                                    index === 2 ? 'bg-orange-400 text-orange-900' :
                                      activeTop10Tab === 'nhap' ? 'bg-green-100 text-green-800' :
                                        activeTop10Tab === 'xuat' ? 'bg-blue-100 text-blue-800' :
                                          'bg-purple-100 text-purple-800'
                                  }`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">{item.nhomHang}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                  {item.tieuChuan}
                                </span>
                              </td>
                              <td className={`px-3 py-2 text-sm text-center font-semibold ${activeTop10Tab === 'nhap' ? 'text-green-600' :
                                activeTop10Tab === 'xuat' ? 'text-blue-600' :
                                  'text-purple-600'
                                }`}>{formatNumber(item.kien)}</td>
                              <td className={`px-3 py-2 text-sm text-center font-bold ${activeTop10Tab === 'nhap' ? 'text-green-700' :
                                activeTop10Tab === 'xuat' ? 'text-blue-700' :
                                  'text-purple-700'
                                }`}>{item.m3.toFixed(3)}</td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>

                {/* Chart */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={(activeTop10Tab === 'nhap' ? top10Data.nhapNhieu :
                        activeTop10Tab === 'xuat' ? top10Data.xuatNhieu :
                          top10Data.tonNhieu).map((item, index) => ({
                            name: `${index + 1}`,
                            nhomHang: item.nhomHang,
                            value: parseFloat(item.m3.toFixed(3))
                          }))}
                      margin={{ top: 30, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="nhomHang"
                        fontSize={10}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis
                        fontSize={10}
                        label={{ value: 'm³', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
                                <p className="text-xs font-semibold">{payload[0].payload.nhomHang}</p>
                                <p className="text-xs text-gray-600">m³: {payload[0].value.toFixed(3)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill={
                        activeTop10Tab === 'nhap' ? '#10b981' :
                          activeTop10Tab === 'xuat' ? '#3b82f6' :
                            '#8b5cf6'
                      }
                        label={{
                          position: 'top',
                          fontSize: 11,
                          fontWeight: 'bold',
                          fill: '#374151',
                          formatter: (value) => value.toFixed(3)
                        }}
                      >
                        {(activeTop10Tab === 'nhap' ? top10Data.nhapNhieu :
                          activeTop10Tab === 'xuat' ? top10Data.xuatNhieu :
                            top10Data.tonNhieu).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nhom-hang' && (
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Tồn kho theo Nhóm hàng & Chất lượng
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th rowSpan="2" className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r">STT</th>
                    <th rowSpan="2" className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border-r">Nhóm hàng</th>
                    <th rowSpan="2" className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r">Chất lượng</th>
                    <th colSpan="2" className="px-3 py-2 text-center text-xs font-bold text-orange-700 uppercase border-r bg-orange-50">Tồn đầu kỳ</th>
                    <th colSpan="2" className="px-3 py-2 text-center text-xs font-bold text-green-700 uppercase border-r bg-green-50">Nhập</th>
                    <th colSpan="2" className="px-3 py-2 text-center text-xs font-bold text-blue-700 uppercase border-r bg-blue-50">Xuất</th>
                    <th colSpan="2" className="px-3 py-2 text-center text-xs font-bold text-purple-700 uppercase bg-purple-50">Tồn cuối kỳ</th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-center text-xs font-bold text-orange-600 uppercase bg-orange-50">Kiện</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-orange-600 uppercase border-r bg-orange-50">m³</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-green-600 uppercase bg-green-50">Kiện</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-green-600 uppercase border-r bg-green-50">m³</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-blue-600 uppercase bg-blue-50">Kiện</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-blue-600 uppercase border-r bg-blue-50">m³</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-purple-600 uppercase bg-purple-50">Kiện</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-purple-600 uppercase bg-purple-50">m³</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tonTheoNhomHang.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-center text-gray-700 border-r">{index + 1}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r">{item.nhomHang}</td>
                      <td className="px-3 py-2 text-center border-r">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          {item.tieuChuan}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-orange-600 font-semibold bg-orange-50">{formatNumber(item.tonDauKy.kien)}</td>
                      <td className="px-3 py-2 text-sm text-center text-orange-600 border-r bg-orange-50">{item.tonDauKy.m3.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center text-green-600 font-semibold bg-green-50">{formatNumber(item.nhap.kien)}</td>
                      <td className="px-3 py-2 text-sm text-center text-green-600 border-r bg-green-50">{item.nhap.m3.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center text-blue-600 font-semibold bg-blue-50">{formatNumber(item.xuat.kien)}</td>
                      <td className="px-3 py-2 text-sm text-center text-blue-600 border-r bg-blue-50">{item.xuat.m3.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center text-purple-600 font-semibold bg-purple-50">{formatNumber(item.tonCuoiKy.kien)}</td>
                      <td className="px-3 py-2 text-sm text-center text-purple-600 font-bold bg-purple-50">{item.tonCuoiKy.m3.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr className="font-bold">
                    <td colSpan="3" className="px-3 py-3 text-sm text-center text-gray-900 border-r">TỔNG CỘNG</td>
                    <td className="px-3 py-3 text-sm text-center text-orange-700 bg-orange-50">
                      {formatNumber(tonTheoNhomHang.reduce((sum, item) => sum + item.tonDauKy.kien, 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-orange-700 border-r bg-orange-50">
                      {tonTheoNhomHang.reduce((sum, item) => sum + item.tonDauKy.m3, 0).toFixed(3)}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-green-700 bg-green-50">
                      {formatNumber(tonTheoNhomHang.reduce((sum, item) => sum + item.nhap.kien, 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-green-700 border-r bg-green-50">
                      {tonTheoNhomHang.reduce((sum, item) => sum + item.nhap.m3, 0).toFixed(3)}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-blue-700 bg-blue-50">
                      {formatNumber(tonTheoNhomHang.reduce((sum, item) => sum + item.xuat.kien, 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-blue-700 border-r bg-blue-50">
                      {tonTheoNhomHang.reduce((sum, item) => sum + item.xuat.m3, 0).toFixed(3)}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-purple-700 bg-purple-50">
                      {formatNumber(tonTheoNhomHang.reduce((sum, item) => sum + item.tonCuoiKy.kien, 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-purple-700 bg-purple-50">
                      {tonTheoNhomHang.reduce((sum, item) => sum + item.tonCuoiKy.m3, 0).toFixed(3)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'do-day' && (
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Tồn kho theo Nhóm Độ Dày
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th rowSpan="2" className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r">STT</th>
                    <th rowSpan="2" className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r">Độ dày (mm)</th>
                    <th colSpan="2" className="px-3 py-2 text-center text-xs font-bold text-orange-700 uppercase border-r bg-orange-50">Tồn đầu kỳ</th>
                    <th colSpan="2" className="px-3 py-2 text-center text-xs font-bold text-green-700 uppercase border-r bg-green-50">Nhập</th>
                    <th colSpan="2" className="px-3 py-2 text-center text-xs font-bold text-blue-700 uppercase border-r bg-blue-50">Xuất</th>
                    <th colSpan="2" className="px-3 py-2 text-center text-xs font-bold text-purple-700 uppercase bg-purple-50">Tồn cuối kỳ</th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-center text-xs font-bold text-orange-600 uppercase bg-orange-50">Kiện</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-orange-600 uppercase border-r bg-orange-50">m³</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-green-600 uppercase bg-green-50">Kiện</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-green-600 uppercase border-r bg-green-50">m³</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-blue-600 uppercase bg-blue-50">Kiện</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-blue-600 uppercase border-r bg-blue-50">m³</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-purple-600 uppercase bg-purple-50">Kiện</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-purple-600 uppercase bg-purple-50">m³</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tonTheoDoDay.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-center text-gray-700 border-r">{index + 1}</td>
                      <td className="px-3 py-2 text-center border-r">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-bold">
                          {item.doDay}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-orange-600 font-semibold bg-orange-50">{formatNumber(item.tonDauKy.kien)}</td>
                      <td className="px-3 py-2 text-sm text-center text-orange-600 border-r bg-orange-50">{item.tonDauKy.m3.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center text-green-600 font-semibold bg-green-50">{formatNumber(item.nhap.kien)}</td>
                      <td className="px-3 py-2 text-sm text-center text-green-600 border-r bg-green-50">{item.nhap.m3.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center text-blue-600 font-semibold bg-blue-50">{formatNumber(item.xuat.kien)}</td>
                      <td className="px-3 py-2 text-sm text-center text-blue-600 border-r bg-blue-50">{item.xuat.m3.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm text-center text-purple-600 font-semibold bg-purple-50">{formatNumber(item.tonCuoiKy.kien)}</td>
                      <td className="px-3 py-2 text-sm text-center text-purple-600 font-bold bg-purple-50">{item.tonCuoiKy.m3.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr className="font-bold">
                    <td colSpan="2" className="px-3 py-3 text-sm text-center text-gray-900 border-r">TỔNG CỘNG</td>
                    <td className="px-3 py-3 text-sm text-center text-orange-700 bg-orange-50">
                      {formatNumber(tonTheoDoDay.reduce((sum, item) => sum + item.tonDauKy.kien, 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-orange-700 border-r bg-orange-50">
                      {tonTheoDoDay.reduce((sum, item) => sum + item.tonDauKy.m3, 0).toFixed(3)}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-green-700 bg-green-50">
                      {formatNumber(tonTheoDoDay.reduce((sum, item) => sum + item.nhap.kien, 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-green-700 border-r bg-green-50">
                      {tonTheoDoDay.reduce((sum, item) => sum + item.nhap.m3, 0).toFixed(3)}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-blue-700 bg-blue-50">
                      {formatNumber(tonTheoDoDay.reduce((sum, item) => sum + item.xuat.kien, 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-blue-700 border-r bg-blue-50">
                      {tonTheoDoDay.reduce((sum, item) => sum + item.xuat.m3, 0).toFixed(3)}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-purple-700 bg-purple-50">
                      {formatNumber(tonTheoDoDay.reduce((sum, item) => sum + item.tonCuoiKy.kien, 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-purple-700 bg-purple-50">
                      {tonTheoDoDay.reduce((sum, item) => sum + item.tonCuoiKy.m3, 0).toFixed(3)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Biểu đồ cho tab Độ dày */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Biểu đồ tồn kho theo độ dày</h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={tonTheoDoDay.map(item => ({
                    doDay: item.doDay,
                    tonDauKy: parseFloat(item.tonDauKy.m3.toFixed(3)),
                    nhap: parseFloat(item.nhap.m3.toFixed(3)),
                    xuat: parseFloat(item.xuat.m3.toFixed(3)),
                    tonCuoiKy: parseFloat(item.tonCuoiKy.m3.toFixed(3))
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="doDay"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    label={{ value: 'Độ dày (mm)', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis
                    fontSize={10}
                    label={{ value: 'm³', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: '12px' }}
                    formatter={(value) => value.toFixed(3) + ' m³'}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="rect"
                  />
                  <Bar dataKey="tonDauKy" fill="#f97316" name="Tồn đầu kỳ" />
                  <Bar dataKey="nhap" fill="#10b981" name="Nhập" />
                  <Bar dataKey="xuat" fill="#3b82f6" name="Xuất" />
                  <Bar dataKey="tonCuoiKy" fill="#8b5cf6" name="Tồn cuối kỳ" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'theo-kien' && (
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Archive className="w-5 h-5 text-purple-600" />
              Chi tiết tồn kho theo kiện ({tonTheoKien.length} kiện)
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">STT</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Mã kiện</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Kích thước (DxRxD)</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Chất lượng</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Số thanh</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">m³</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Đội hàng khô</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Kho</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tonTheoKien.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-center text-gray-700">{index + 1}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{item['MA_KIEN']}</td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700">
                        {item['DAY']} x {item['RONG']} x {item['DAI']}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item['TIEU_CHUAN'] && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {item['TIEU_CHUAN']}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700 font-medium">
                        {item['THANH'] || '—'}
                      </td>
                      <td className="px-3 py-2 text-sm text-center font-semibold text-purple-600">
                        {parseFloat(item['SO_KHOI'] || 0).toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700">{item['DOI_HANG_KHO'] || '—'}</td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700">{item['KHO_NHAP'] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr className="font-bold">
                    <td colSpan="4" className="px-3 py-3 text-sm text-center text-gray-900">TỔNG CỘNG</td>
                    <td className="px-3 py-3 text-sm text-center text-gray-900">
                      {formatNumber(tonTheoKien.reduce((sum, item) => sum + (parseFloat(item['THANH']) || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-purple-700">
                      {tonTheoKien.reduce((sum, item) => sum + (parseFloat(item['SO_KHOI']) || 0), 0).toFixed(3)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
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
