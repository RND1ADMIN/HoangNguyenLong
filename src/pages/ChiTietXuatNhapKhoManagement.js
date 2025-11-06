import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, X, Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Calendar, Eye, Printer, Download, FileSpreadsheet, Edit, Trash, AlertCircle, Save, Info } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ChiTietXuatNhapKhoManagement = () => {
  // State Management
  const [chiTietList, setChiTietList] = useState([]);
  const [phieuList, setPhieuList] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [dmhh, setDmhh] = useState([]);
  const [tieuChuanList, setTieuChuanList] = useState([]);

  const [currentChiTiet, setCurrentChiTiet] = useState({
    'ID_CT': '',
    'SOPHIEU': '',
    'NGHIEP_VU': '',
    'KHO_XUAT': '',
    'KHO_NHAP': '',
    'NGAY_NHAP_XUAT': '',
    'NHOM_HANG': '',
    'MA_KIEN': '',
    'DAY': '',
    'RONG': '',
    'DAI': '',
    'THANH': '',
    'SO_KHOI': 0,
    'TIEU_CHUAN': '',
    'DOI_HANG_KHO': '',
    'DONGIA': 0,
    'THANHTIEN': 0,
    'GHICHU': ''
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterNghiepVu, setFilterNghiepVu] = useState('ALL');
  const [filterKho, setFilterKho] = useState('ALL');
  const [filterNhomHang, setFilterNhomHang] = useState('ALL');
  const [filterTieuChuan, setFilterTieuChuan] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'NGAY_NHAP_XUAT', direction: 'descending' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // ==================== FETCH DATA ====================
  const fetchChiTietList = async () => {
    try {
      setIsLoading(true);
      const response = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
      setChiTietList(response);
    } catch (error) {
      console.error('Error fetching chi tiet list:', error);
      toast.error('Lỗi khi tải danh sách chi tiết');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhieuList = async () => {
    try {
      const response = await authUtils.apiRequestKHO('XUATNHAPKHO', 'Find', {});
      setPhieuList(response);
    } catch (error) {
      console.error('Error fetching phieu list:', error);
    }
  };

  const fetchKhoList = async () => {
    try {
      const response = await authUtils.apiRequestKHO('CD_KHO', 'Find', {});
      setKhoList(response);
    } catch (error) {
      console.error('Error fetching kho list:', error);
    }
  };

  const fetchDMHH = async () => {
    try {
      const response = await authUtils.apiRequestKHO('DMHH', 'Find', {});
      setDmhh(response);
    } catch (error) {
      console.error('Error fetching DMHH:', error);
    }
  };

  const fetchTieuChuan = async () => {
    try {
      const response = await authUtils.apiRequestKHO('CD_TIEUCHUAN', 'Find', {});
      setTieuChuanList(response);
    } catch (error) {
      console.error('Error fetching tieu chuan:', error);
    }
  };

  useEffect(() => {
    fetchChiTietList();
    fetchPhieuList();
    fetchKhoList();
    fetchDMHH();
    fetchTieuChuan();
  }, []);

  // ==================== HELPER FUNCTIONS ====================
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

  const calculateM3 = (day, rong, dai, thanh) => {
    const dayNum = parseFloat(day) || 0;
    const rongNum = parseFloat(rong) || 0;
    const daiNum = parseFloat(dai) || 0;
    const thanhNum = parseFloat(thanh) || 0;
    return (dayNum * rongNum * daiNum * thanhNum) / 1000000000;
  };

  const getPhieuInfo = (soPhieu) => {
    return phieuList.find(p => p['SOPHIEU'] === soPhieu);
  };

  // ==================== MODAL HANDLERS ====================
  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEditMode(true);
      setCurrentChiTiet({ ...item });
    } else {
      setIsEditMode(false);
      setCurrentChiTiet({
        'ID_CT': '',
        'SOPHIEU': '',
        'NGHIEP_VU': '',
        'KHO_XUAT': '',
        'KHO_NHAP': '',
        'NGAY_NHAP_XUAT': new Date().toISOString().split('T')[0],
        'NHOM_HANG': '',
        'MA_KIEN': '',
        'DAY': '',
        'RONG': '',
        'DAI': '',
        'THANH': '',
        'SO_KHOI': 0,
        'TIEU_CHUAN': '',
        'DOI_HANG_KHO': '',
        'DONGIA': 0,
        'THANHTIEN': 0,
        'GHICHU': ''
      });
    }
    setShowModal(true);
  };

  const handleOpenDetailModal = (item) => {
    setCurrentChiTiet(item);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowDetailModal(false);
    setIsEditMode(false);
    setCurrentChiTiet({
      'ID_CT': '',
      'SOPHIEU': '',
      'NGHIEP_VU': '',
      'KHO_XUAT': '',
      'KHO_NHAP': '',
      'NGAY_NHAP_XUAT': new Date().toISOString().split('T')[0],
      'NHOM_HANG': '',
      'MA_KIEN': '',
      'DAY': '',
      'RONG': '',
      'DAI': '',
      'THANH': '',
      'SO_KHOI': 0,
      'TIEU_CHUAN': '',
      'DOI_HANG_KHO': '',
      'DONGIA': 0,
      'THANHTIEN': 0,
      'GHICHU': ''
    });
  };

  // ==================== FORM HANDLERS ====================
  const handleInputChange = (field, value) => {
    setCurrentChiTiet(prev => {
      const updated = { ...prev, [field]: value };

      // Auto calculate SO_KHOI when dimensions or THANH change
      if (['DAY', 'RONG', 'DAI', 'THANH'].includes(field)) {
        const soKhoi = calculateM3(
          updated['DAY'],
          updated['RONG'],
          updated['DAI'],
          updated['THANH']
        );
        updated['SO_KHOI'] = soKhoi;

        // Auto calculate THANHTIEN for XUAT
        if (updated['NGHIEP_VU'] === 'XUAT') {
          updated['THANHTIEN'] = soKhoi * (parseFloat(updated['DONGIA']) || 0);
        }
      }

      // Auto calculate THANHTIEN when DONGIA changes
      if (field === 'DONGIA' && updated['NGHIEP_VU'] === 'XUAT') {
        updated['THANHTIEN'] = (parseFloat(updated['SO_KHOI']) || 0) * (parseFloat(value) || 0);
      }

      return updated;
    });
  };

  const validateChiTiet = (item) => {
    const errors = [];

    if (!item['SOPHIEU']) errors.push('Số phiếu không được để trống');
    if (!item['NGHIEP_VU']) errors.push('Nghiệp vụ không được để trống');
    if (!item['NGAY_NHAP_XUAT']) errors.push('Ngày nhập/xuất không được để trống');
    if (!item['NHOM_HANG']) errors.push('Nhóm hàng không được để trống');
    if (!item['MA_KIEN']) errors.push('Mã kiện không được để trống');
    if (!item['TIEU_CHUAN']) errors.push('Tiêu chuẩn không được để trống');

    if (item['NGHIEP_VU'] === 'NHAP' && !item['KHO_NHAP']) {
      errors.push('Kho nhập không được để trống');
    }
    if (item['NGHIEP_VU'] === 'XUAT' && !item['KHO_XUAT']) {
      errors.push('Kho xuất không được để trống');
    }

    if (!item['DAY'] || parseFloat(item['DAY']) <= 0) errors.push('Dày phải lớn hơn 0');
    if (!item['RONG'] || parseFloat(item['RONG']) <= 0) errors.push('Rộng phải lớn hơn 0');
    if (!item['DAI'] || parseFloat(item['DAI']) <= 0) errors.push('Dài phải lớn hơn 0');

    return errors;
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const errors = validateChiTiet(currentChiTiet);
      if (errors.length > 0) {
        toast.error(errors.join('\n'));
        setIsSubmitting(false);
        return;
      }

      const itemToSave = { ...currentChiTiet };

      if (isEditMode) {
        await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Edit', {
          "Rows": [itemToSave]
        });
        toast.success('Cập nhật chi tiết thành công!');
      } else {
        itemToSave['ID_CT'] = Date.now();
        await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Add', {
          "Rows": [itemToSave]
        });
        toast.success('Thêm chi tiết mới thành công!');
      }

      await fetchChiTietList();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving chi tiet:', error);
      toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu chi tiết'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== DELETE HANDLERS ====================
  const handleOpenDeleteConfirmation = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirmation(true);
  };

  const handleCloseDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Delete', {
        "Rows": [{ "ID_CT": itemToDelete['ID_CT'] }]
      });

      toast.success('Xóa chi tiết thành công!');
      await fetchChiTietList();
      handleCloseDeleteConfirmation();
    } catch (error) {
      console.error('Error deleting chi tiet:', error);
      toast.error('Có lỗi xảy ra khi xóa chi tiết: ' + (error.message || ''));
    }
  };

  // ==================== EXPORT EXCEL ====================
  const handleExportExcel = () => {
    const dataToExport = filteredChiTietList.map((item, index) => {
      const phieu = getPhieuInfo(item['SOPHIEU']);
      return {
        'STT': index + 1,
        'Số phiếu': item['SOPHIEU'],
        'Nghiệp vụ': item['NGHIEP_VU'] === 'NHAP' ? 'Nhập kho' : 'Xuất kho',
        'Ngày': formatDate(item['NGAY_NHAP_XUAT']),
        'Khách hàng/NCC': phieu?.['NCC_KHACHHANG'] || '',
        'Kho': item['NGHIEP_VU'] === 'NHAP' ? item['KHO_NHAP'] : item['KHO_XUAT'],
        'Mã kiện': item['MA_KIEN'],
        'Nhóm hàng': item['NHOM_HANG'],
        'Dày (mm)': item['DAY'],
        'Rộng (mm)': item['RONG'],
        'Dài (mm)': item['DAI'],
        'Số thanh': item['THANH'] || '',
        'Số m³': parseFloat(item['SO_KHOI'] || 0).toFixed(4),
        'Tiêu chuẩn': item['TIEU_CHUAN'],
        'Đội hàng khô': item['DOI_HANG_KHO'] || '',
        'Đơn giá': item['DONGIA'] || 0,
        'Thành tiền': item['THANHTIEN'] || 0,
        'Ghi chú': item['GHICHU'] || ''
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // STT
      { wch: 15 }, // Số phiếu
      { wch: 12 }, // Nghiệp vụ
      { wch: 12 }, // Ngày
      { wch: 25 }, // Khách hàng/NCC
      { wch: 12 }, // Kho
      { wch: 15 }, // Mã kiện
      { wch: 20 }, // Nhóm hàng
      { wch: 10 }, // Dày
      { wch: 10 }, // Rộng
      { wch: 10 }, // Dài
      { wch: 10 }, // Số thanh
      { wch: 12 }, // Số m³
      { wch: 12 }, // Tiêu chuẩn
      { wch: 15 }, // Đội hàng khô
      { wch: 15 }, // Đơn giá
      { wch: 15 }, // Thành tiền
      { wch: 20 }  // Ghi chú
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Chi tiết nhập xuất kho');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `ChiTiet_NhapXuatKho_${new Date().getTime()}.xlsx`);

    toast.success('Đã xuất file Excel thành công!');
  };

  // ==================== SORTING ====================
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedList = useCallback(() => {
    const sortableList = [...chiTietList];
    if (sortConfig.key) {
      sortableList.sort((a, b) => {
        const keyA = a[sortConfig.key] || '';
        const keyB = b[sortConfig.key] || '';

        if (sortConfig.key === 'NGAY_NHAP_XUAT') {
          const dateA = new Date(keyA);
          const dateB = new Date(keyB);
          return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }

        if (['SO_KHOI', 'DONGIA', 'THANHTIEN', 'DAY', 'RONG', 'DAI', 'THANH'].includes(sortConfig.key)) {
          const numA = parseFloat(keyA) || 0;
          const numB = parseFloat(keyB) || 0;
          return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
        }

        if (keyA < keyB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (keyA > keyB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableList;
  }, [chiTietList, sortConfig]);

  // ==================== FILTERING ====================
  const filteredChiTietList = getSortedList().filter(item => {
    const searchLower = search.toLowerCase();
    const matchesSearch = (
      item['SOPHIEU']?.toLowerCase().includes(searchLower) ||
      item['MA_KIEN']?.toLowerCase().includes(searchLower) ||
      item['NHOM_HANG']?.toLowerCase().includes(searchLower) ||
      item['DOI_HANG_KHO']?.toLowerCase().includes(searchLower)
    );

    const matchesNghiepVu = filterNghiepVu === 'ALL' || item['NGHIEP_VU'] === filterNghiepVu;

    const kho = item['NGHIEP_VU'] === 'NHAP' ? item['KHO_NHAP'] : item['KHO_XUAT'];
    const matchesKho = filterKho === 'ALL' || kho === filterKho;

    const matchesNhomHang = filterNhomHang === 'ALL' || item['NHOM_HANG'] === filterNhomHang;
    const matchesTieuChuan = filterTieuChuan === 'ALL' || item['TIEU_CHUAN'] === filterTieuChuan;

    let matchesDateRange = true;
    if (filterDateFrom || filterDateTo) {
      const itemDate = new Date(item['NGAY_NHAP_XUAT']);
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        matchesDateRange = matchesDateRange && itemDate >= fromDate;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && itemDate <= toDate;
      }
    }

    return matchesSearch && matchesNghiepVu && matchesKho && matchesNhomHang && matchesTieuChuan && matchesDateRange;
  });

  // ==================== PAGINATION ====================
  const totalPages = Math.ceil(filteredChiTietList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredChiTietList.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterNghiepVu, filterKho, filterNhomHang, filterTieuChuan, filterDateFrom, filterDateTo, itemsPerPage]);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (page) => setCurrentPage(page);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return sortConfig.direction === 'ascending' ?
      <span className="text-blue-600 ml-1">↑</span> :
      <span className="text-blue-600 ml-1">↓</span>;
  };

  const handleRefresh = async () => {
    toast.info('Đang tải lại dữ liệu...');
    await fetchChiTietList();
    await fetchPhieuList();
    await fetchKhoList();
    await fetchDMHH();
    await fetchTieuChuan();
    toast.success('Đã tải lại dữ liệu thành công!');
  };

  // ==================== STATISTICS ====================
  const uniqueNhomHang = [...new Set(chiTietList.map(item => item['NHOM_HANG']).filter(Boolean))];
  const uniqueKho = [...new Set(chiTietList.map(item =>
    item['NGHIEP_VU'] === 'NHAP' ? item['KHO_NHAP'] : item['KHO_XUAT']
  ).filter(Boolean))];

  const tongKienNhap = chiTietList.filter(item => item['NGHIEP_VU'] === 'NHAP').length;
  const tongKienXuat = chiTietList.filter(item => item['NGHIEP_VU'] === 'XUAT').length;
  const tongKienTon = tongKienNhap - tongKienXuat;

  const tongKLNhap = chiTietList
    .filter(item => item['NGHIEP_VU'] === 'NHAP')
    .reduce((sum, item) => sum + (parseFloat(item['SO_KHOI']) || 0), 0);

  const tongKLXuat = chiTietList
    .filter(item => item['NGHIEP_VU'] === 'XUAT')
    .reduce((sum, item) => sum + (parseFloat(item['SO_KHOI']) || 0), 0);

  const tongKLTon = tongKLNhap - tongKLXuat;

  const tongTienXuat = chiTietList
    .filter(item => item['NGHIEP_VU'] === 'XUAT')
    .reduce((sum, item) => sum + (parseFloat(item['THANHTIEN']) || 0), 0);

  return (
    <div className="p-3 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 border border-gray-100">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Chi Tiết Nhập Xuất Kho</h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Quản lý chi tiết từng kiện hàng</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm"
                title="Tải lại dữ liệu"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm ${showFilters
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Bộ lọc</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Xuất Excel</span>
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 md:gap-3 mb-3">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border-l-4 border-green-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-green-600" />
                <p className="text-xs font-medium text-green-700">Kiện nhập</p>
              </div>
              <p className="text-2xl font-bold text-green-900">{tongKienNhap}</p>
              <p className="text-xs text-green-600 mt-0.5">{tongKLNhap.toFixed(4)} m³</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border-l-4 border-red-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-red-600" />
                <p className="text-xs font-medium text-red-700">Kiện xuất</p>
              </div>
              <p className="text-2xl font-bold text-red-900">{tongKienXuat}</p>
              <p className="text-xs text-red-600 mt-0.5">{tongKLXuat.toFixed(4)} m³</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-medium text-purple-700">Kiện tồn</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{tongKienTon}</p>
              <p className="text-xs text-purple-600 mt-0.5">{tongKLTon.toFixed(4)} m³</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-700">Nhóm hàng</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{uniqueNhomHang.length}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-medium text-orange-700">Kho</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{uniqueKho.length}</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-lg border-l-4 border-yellow-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-yellow-600" />
                <p className="text-xs font-medium text-yellow-700">Doanh thu</p>
              </div>
              <p className="text-xl font-bold text-yellow-900">
                {new Intl.NumberFormat('vi-VN', {
                  notation: 'compact',
                  compactDisplay: 'short',
                  maximumFractionDigits: 1
                }).format(tongTienXuat)}
              </p>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 md:gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nghiệp vụ</label>
                  <select
                    value={filterNghiepVu}
                    onChange={(e) => setFilterNghiepVu(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALL">Tất cả</option>
                    <option value="NHAP">Nhập kho</option>
                    <option value="XUAT">Xuất kho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Kho</label>
                  <select
                    value={filterKho}
                    onChange={(e) => setFilterKho(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALL">Tất cả</option>
                    {uniqueKho.map((kho, index) => (
                      <option key={index} value={kho}>{kho}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nhóm hàng</label>
                  <select
                    value={filterNhomHang}
                    onChange={(e) => setFilterNhomHang(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALL">Tất cả</option>
                    {uniqueNhomHang.map((nhom, index) => (
                      <option key={index} value={nhom}>{nhom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tiêu chuẩn</label>
                  <select
                    value={filterTieuChuan}
                    onChange={(e) => setFilterTieuChuan(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALL">Tất cả</option>
                    {tieuChuanList.map((tc, index) => (
                      <option key={index} value={tc['TIEU_CHUAN']}>{tc['TIEU_CHUAN']}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    setFilterNghiepVu('ALL');
                    setFilterKho('ALL');
                    setFilterNhomHang('ALL');
                    setFilterTieuChuan('ALL');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo số phiếu, mã kiện, nhóm hàng, đội hàng khô..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-300 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Không tìm thấy chi tiết nào</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => requestSort('SOPHIEU')}>
                      Số phiếu {getSortIcon('SOPHIEU')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => requestSort('NGHIEP_VU')}>
                      Nghiệp vụ {getSortIcon('NGHIEP_VU')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => requestSort('NGAY_NHAP_XUAT')}>
                      Ngày {getSortIcon('NGAY_NHAP_XUAT')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">
                      Mã kiện
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => requestSort('NHOM_HANG')}>
                      Nhóm hàng {getSortIcon('NHOM_HANG')}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-blue-900">
                      Kích thước
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => requestSort('THANH')}>
                      Thanh {getSortIcon('THANH')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => requestSort('SO_KHOI')}>
                      Số m³ {getSortIcon('SO_KHOI')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">
                      Tiêu chuẩn
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">
                      Kho
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">
                      Đội hàng khô
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => requestSort('DONGIA')}>
                      Đơn giá {getSortIcon('DONGIA')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => requestSort('THANHTIEN')}>
                      Thành tiền {getSortIcon('THANHTIEN')}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-blue-900">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {currentItems.map((item, index) => {
                    const phieu = getPhieuInfo(item['SOPHIEU']);
                    return (
                      <tr key={index} className="hover:bg-blue-50 transition-colors">
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          {item['SOPHIEU']}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item['NGHIEP_VU'] === 'NHAP'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {item['NGHIEP_VU'] === 'NHAP' ? 'Nhập' : 'Xuất'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {formatDate(item['NGAY_NHAP_XUAT'])}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-blue-700">
                          {item['MA_KIEN']}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {item['NHOM_HANG']}
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-700">
                          {item['DAY']}×{item['RONG']}×{item['DAI']}
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-700">
                          {item['THANH'] || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-right font-medium text-gray-900">
                          {parseFloat(item['SO_KHOI'] || 0).toFixed(4)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {item['TIEU_CHUAN']}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {item['NGHIEP_VU'] === 'NHAP' ? item['KHO_NHAP'] : item['KHO_XUAT']}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {item['DOI_HANG_KHO'] || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-right text-gray-700">
                          {item['DONGIA'] > 0 ? formatCurrency(item['DONGIA']) : '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-right font-medium text-gray-900">
                          {item['THANHTIEN'] > 0 ? formatCurrency(item['THANHTIEN']) : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenDetailModal(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteConfirmation(item)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredChiTietList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Hiển thị</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-gray-600">
                  / {filteredChiTietList.length} kiện
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Trang đầu"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-1">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={index} className="px-2 py-1 text-xs text-gray-500">...</span>
                    ) : (
                      <button
                        key={index}
                        onClick={() => goToPage(page)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${currentPage === page
                            ? 'bg-blue-500 text-white font-medium'
                            : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Xem Chi Tiết */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <h2 className="text-lg md:text-xl font-bold text-blue-900 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Chi Tiết Kiện - {currentChiTiet['MA_KIEN']}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 text-sm">Thông tin phiếu</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Số phiếu:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['SOPHIEU']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nghiệp vụ:</span>
                      <span className={`font-medium ${currentChiTiet['NGHIEP_VU'] === 'NHAP' ? 'text-green-700' : 'text-red-700'}`}>
                        {currentChiTiet['NGHIEP_VU'] === 'NHAP' ? 'Nhập kho' : 'Xuất kho'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ngày:</span>
                      <span className="font-medium text-gray-900">{formatDate(currentChiTiet['NGAY_NHAP_XUAT'])}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kho:</span>
                      <span className="font-medium text-gray-900">
                        {currentChiTiet['NGHIEP_VU'] === 'NHAP' ? currentChiTiet['KHO_NHAP'] : currentChiTiet['KHO_XUAT']}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2 text-sm">Thông tin kiện</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mã kiện:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['MA_KIEN']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nhóm hàng:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['NHOM_HANG']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiêu chuẩn:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['TIEU_CHUAN']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Đội hàng khô:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['DOI_HANG_KHO'] || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2 text-sm">Kích thước & Khối lượng</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dày:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['DAY']} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rộng:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['RONG']} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dài:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['DAI']} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Số thanh:</span>
                      <span className="font-medium text-gray-900">{currentChiTiet['THANH'] || '-'}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-green-300">
                      <span className="text-gray-600 font-semibold">Số m³:</span>
                      <span className="font-bold text-green-900">{parseFloat(currentChiTiet['SO_KHOI'] || 0).toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {currentChiTiet['NGHIEP_VU'] === 'XUAT' && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-900 mb-2 text-sm">Thông tin giá</h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Đơn giá:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(currentChiTiet['DONGIA'])}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-yellow-300">
                        <span className="text-gray-600 font-semibold">Thành tiền:</span>
                        <span className="font-bold text-yellow-900">{formatCurrency(currentChiTiet['THANHTIEN'])}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {currentChiTiet['GHICHU'] && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-3">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">Ghi chú</h3>
                  <p className="text-xs text-gray-700">{currentChiTiet['GHICHU']}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa Chi Tiết */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <h2 className="text-lg md:text-xl font-bold text-blue-900 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                {isEditMode ? 'Sửa Chi Tiết' : 'Thêm Chi Tiết Mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="p-1.5 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Thông tin phiếu */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 text-sm">Thông tin phiếu</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Số phiếu <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentChiTiet['SOPHIEU']}
                        onChange={(e) => {
                          const selectedPhieu = phieuList.find(p => p['SOPHIEU'] === e.target.value);
                          if (selectedPhieu) {
                            handleInputChange('SOPHIEU', e.target.value);
                            handleInputChange('NGHIEP_VU', selectedPhieu['NGHIEP_VU']);
                            handleInputChange('NGAY_NHAP_XUAT', selectedPhieu['NGAYNHAP_XUAT']);
                            handleInputChange('KHO_NHAP', selectedPhieu['KHONHAP'] || '');
                            handleInputChange('KHO_XUAT', selectedPhieu['KHOXUAT'] || '');
                          }
                        }}
                        disabled={isSubmitting || isEditMode}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">-- Chọn phiếu --</option>
                        {phieuList.map((phieu, index) => (
                          <option key={index} value={phieu['SOPHIEU']}>
                            {phieu['SOPHIEU']} - {phieu['NGHIEP_VU'] === 'NHAP' ? 'Nhập' : 'Xuất'} - {formatDate(phieu['NGAYNHAP_XUAT'])}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nghiệp vụ
                      </label>
                      <input
                        type="text"
                        value={currentChiTiet['NGHIEP_VU'] === 'NHAP' ? 'Nhập kho' : 'Xuất kho'}
                        disabled
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Ngày nhập/xuất
                      </label>
                      <input
                        type="date"
                        value={currentChiTiet['NGAY_NHAP_XUAT']}
                        disabled
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Kho
                      </label>
                      <input
                        type="text"
                        value={currentChiTiet['NGHIEP_VU'] === 'NHAP' ? currentChiTiet['KHO_NHAP'] : currentChiTiet['KHO_XUAT']}
                        disabled
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Thông tin kiện */}
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2 text-sm">Thông tin kiện</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Mã kiện <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={currentChiTiet['MA_KIEN']}
                        onChange={(e) => handleInputChange('MA_KIEN', e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                        placeholder="Nhập mã kiện"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nhóm hàng <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentChiTiet['NHOM_HANG']}
                        onChange={(e) => {
                          const selectedNhom = dmhh.find(item => item['NHOM_HANG'] === e.target.value);
                          if (selectedNhom) {
                            handleInputChange('NHOM_HANG', e.target.value);
                            handleInputChange('DAY', selectedNhom['DAY']);
                            handleInputChange('RONG', selectedNhom['RONG']);
                            handleInputChange('DAI', selectedNhom['DAI']);
                            handleInputChange('DONGIA', selectedNhom['DONGIA_HIEULUC'] || 0);
                          }
                        }}
                        disabled={isSubmitting}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">-- Chọn nhóm hàng --</option>
                        {dmhh.map((item, index) => (
                          <option key={index} value={item['NHOM_HANG']}>
                            {item['NHOM_HANG']} - {item['DAY']}×{item['RONG']}×{item['DAI']}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tiêu chuẩn <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentChiTiet['TIEU_CHUAN']}
                        onChange={(e) => handleInputChange('TIEU_CHUAN', e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">-- Chọn tiêu chuẩn --</option>
                        {tieuChuanList.map((tc, index) => (
                          <option key={index} value={tc['TIEU_CHUAN']}>
                            {tc['TIEU_CHUAN']}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Đội hàng khô
                      </label>
                      <input
                        type="text"
                        value={currentChiTiet['DOI_HANG_KHO']}
                        onChange={(e) => handleInputChange('DOI_HANG_KHO', e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                        placeholder="Nhập đội hàng khô"
                      />
                    </div>
                  </div>
                </div>

                {/* Kích thước */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2 text-sm">Kích thước & Khối lượng</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Dày (mm) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={currentChiTiet['DAY']}
                          onChange={(e) => handleInputChange('DAY', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                          placeholder="Dày"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rộng (mm) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={currentChiTiet['RONG']}
                          onChange={(e) => handleInputChange('RONG', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                          placeholder="Rộng"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Dài (mm) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={currentChiTiet['DAI']}
                          onChange={(e) => handleInputChange('DAI', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                          placeholder="Dài"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Số thanh
                      </label>
                      <input
                        type="number"
                        value={currentChiTiet['THANH']}
                        onChange={(e) => handleInputChange('THANH', e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                        placeholder="Nhập số thanh"
                        min="0"
                        step="1"
                      />
                    </div>

                    <div className="bg-white p-2 rounded border border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">Số m³:</span>
                        <span className="text-sm font-bold text-green-900">
                          {parseFloat(currentChiTiet['SO_KHOI'] || 0).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Giá (chỉ hiện khi xuất) */}
                {currentChiTiet['NGHIEP_VU'] === 'XUAT' && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-900 mb-2 text-sm">Thông tin giá</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Đơn giá (VNĐ)
                        </label>
                        <input
                          type="number"
                          value={currentChiTiet['DONGIA']}
                          onChange={(e) => handleInputChange('DONGIA', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-100"
                          placeholder="Nhập đơn giá"
                          min="0"
                          step="1000"
                        />
                      </div>

                      <div className="bg-white p-2 rounded border border-yellow-300">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-700">Thành tiền:</span>
                          <span className="text-sm font-bold text-yellow-900">
                            {formatCurrency(currentChiTiet['THANHTIEN'])}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ghi chú */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 md:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Ghi chú</h3>
                  <textarea
                    value={currentChiTiet['GHICHU']}
                    onChange={(e) => handleInputChange('GHICHU', e.target.value)}
                    disabled={isSubmitting}
                    rows={3}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 resize-none"
                    placeholder="Nhập ghi chú..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditMode ? 'Cập nhật' : 'Lưu'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                Xác nhận xóa chi tiết
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Bạn có chắc chắn muốn xóa kiện <strong>{itemToDelete?.['MA_KIEN']}</strong>?
                <br />
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseDeleteConfirmation}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default ChiTietXuatNhapKhoManagement;

