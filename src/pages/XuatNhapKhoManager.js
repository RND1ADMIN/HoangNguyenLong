import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, Package, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Calendar, TrendingUp, TrendingDown, DollarSign, Weight, FileText, ChevronDown, Save, Minus, AlertCircle, Eye } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const XuatNhapKhoManagement = () => {
  // State Management
  const [phieuList, setPhieuList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dmhh, setDmhh] = useState([]);
  const [tonKho, setTonKho] = useState([]);

  const [currentPhieu, setCurrentPhieu] = useState({
    'SOPHIEU': '',
    'NGHIEP_VU': 'NHAP',
    'NGAYNHAP_XUAT': new Date().toISOString().split('T')[0],
    'NCC_KHACHHANG': '',
    'KHOXUAT': '',
    'KHONHAP': '',
    'NGUOIPHUTRACH': '',
    'TONGKHOILUONG': 0,
    'TONGTIEN': 0,
    'DIENGIAI': ''
  });

  const [chiTietList, setChiTietList] = useState([]);
  const [currentChiTiet, setCurrentChiTiet] = useState({
    'NHOM_HANG': '',
    'SO_KIEN': '',
    'DONGIA': 0,
    'CHATLUONG': '' // Thêm trường chất lượng để người dùng nhập
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [phieuToDelete, setPhieuToDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalSoPhieu, setOriginalSoPhieu] = useState('');

  // Autocomplete states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showNhomHangDropdown, setShowNhomHangDropdown] = useState(false);
  const [nhomHangSearchTerm, setNhomHangSearchTerm] = useState('');
  const [selectedNhomHangInfo, setSelectedNhomHangInfo] = useState(null);
  const [availableKien, setAvailableKien] = useState([]);

  const customerDropdownRef = useRef(null);
  const nhomHangDropdownRef = useRef(null);

  // Filter states
  const [filterNghiepVu, setFilterNghiepVu] = useState('ALL');
  const [filterCustomer, setFilterCustomer] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Generate so phieu tu dong
  const generateSoPhieu = (nghiepVu) => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = nghiepVu === 'NHAP' ? 'NK' : 'XK';
    const yearMonth = `${yy}${mm}`;

    const phieuCungThang = phieuList.filter(p => {
      if (p['SOPHIEU'] && p['SOPHIEU'].startsWith(prefix)) {
        const phieuYearMonth = p['SOPHIEU'].substring(2, 6);
        return phieuYearMonth === yearMonth;
      }
      return false;
    });

    let maxNumber = 0;
    phieuCungThang.forEach(p => {
      const match = p['SOPHIEU'].match(/\d{3}$/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${prefix}${yearMonth}-${nextNumber}`;
  };

  // Generate ma kien tu dong
  // Sửa hàm generateMaKien để kiểm tra cả tonKho VÀ chiTietList hiện tại
  const generateMaKien = () => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = `${yy}${mm}`;

    // Kết hợp cả tonKho (đã lưu trong DB) và chiTietList (đang nhập trong form)
    const allKien = [
      ...tonKho,
      ...chiTietList
    ];

    const kienCungThang = allKien.filter(k => {
      if (k['MA_KIEN'] && k['MA_KIEN'].startsWith('K')) {
        const kienYearMonth = k['MA_KIEN'].substring(1, 5);
        return kienYearMonth === yearMonth;
      }
      return false;
    });

    let maxNumber = 0;
    kienCungThang.forEach(k => {
      const match = k['MA_KIEN'].match(/\d{3}$/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `K${yearMonth}-${nextNumber}`;
  };


  // Format currency VND
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return dateString;
    }
  };

  // Fetch data
  const fetchPhieuList = async () => {
    try {
      setIsLoading(true);
      const response = await authUtils.apiRequestKHO('XUATNHAPKHO', 'Find', {});
      setPhieuList(response);
    } catch (error) {
      console.error('Error fetching phieu list:', error);
      toast.error('Lỗi khi tải danh sách phiếu');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await authUtils.apiRequestKHO('DSKH', 'Find', {});
      setCustomers(response);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Lỗi khi tải danh sách khách hàng');
    }
  };

  const fetchDMHH = async () => {
    try {
      const response = await authUtils.apiRequestKHO('DMHH', 'Find', {});
      setDmhh(response);
    } catch (error) {
      console.error('Error fetching DMHH:', error);
      toast.error('Lỗi khi tải danh mục hàng hóa');
    }
  };

  const fetchTonKho = async () => {
    try {
      const response = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
      setTonKho(response);
    } catch (error) {
      console.error('Error fetching ton kho:', error);
    }
  };

  useEffect(() => {
    fetchPhieuList();
    fetchCustomers();
    fetchDMHH();
    fetchTonKho();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
      if (nhomHangDropdownRef.current && !nhomHangDropdownRef.current.contains(event.target)) {
        setShowNhomHangDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer['TEN_KHACHHANG']?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer['MA_KH']?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // Filter nhom hang based on search term
  const filteredNhomHang = dmhh.filter(item =>
    item['NHOM_HANG']?.toLowerCase().includes(nhomHangSearchTerm.toLowerCase())
  );

  // Handle customer selection
  const handleSelectCustomer = (customerName) => {
    setCurrentPhieu(prev => ({
      ...prev,
      'NCC_KHACHHANG': customerName
    }));
    setCustomerSearchTerm(customerName);
    setShowCustomerDropdown(false);
  };

  // Handle nhom hang selection
  const handleSelectNhomHang = (nhomHang) => {
    const nhomHangInfo = dmhh.find(item => item['NHOM_HANG'] === nhomHang);
    setSelectedNhomHangInfo(nhomHangInfo);
    setNhomHangSearchTerm(nhomHang);
    setCurrentChiTiet(prev => ({
      ...prev,
      'NHOM_HANG': nhomHang,
      'DONGIA': nhomHangInfo?.['DONGIA_HIEULUC'] || 0
      // Không tự động set CHATLUONG nữa
    }));
    setShowNhomHangDropdown(false);

    if (currentPhieu['NGHIEP_VU'] === 'XUAT') {
      loadAvailableKien(nhomHang);
    }
  };

  // Load available kien for xuat kho
  const loadAvailableKien = (nhomHang) => {
    const kienTon = tonKho.filter(item =>
      item['NHOM_HANG'] === nhomHang &&
      item['NGHIEP_VU'] === 'NHAP' &&
      item['KHO_NHAP'] === currentPhieu['KHOXUAT']
    );
    setAvailableKien(kienTon);
  };

  // Handle kien selection for xuat kho
  const handleSelectKien = (kien) => {
    const exists = chiTietList.find(item => item['MA_KIEN'] === kien['MA_KIEN']);
    if (exists) {
      toast.warning('Kiện này đã được chọn');
      return;
    }

    const donGia = parseFloat(currentChiTiet['DONGIA']) || 0;
    const soKhoi = parseFloat(kien['SO_KHOI']) || 0;

    const newChiTiet = {
      'ID_CT': Date.now(),
      'SOPHIEU': currentPhieu['SOPHIEU'],
      'NGHIEP_VU': 'XUAT',
      'KHO_XUAT': currentPhieu['KHOXUAT'],
      'KHO_NHAP': '',
      'NGAY_NHAP_XUAT': currentPhieu['NGAYNHAP_XUAT'],
      'NHOM_HANG': kien['NHOM_HANG'],
      'MA_KIEN': kien['MA_KIEN'],
      'DAY': kien['DAY'],
      'RONG': kien['RONG'],
      'DAI': kien['DAI'],
      'THANH': kien['THANH'],
      'SO_KHOI': soKhoi,
      'CHATLUONG': kien['CHATLUONG'],
      'DOI_HANG_KHO': kien['DOI_HANG_KHO'],
      'DONGIA': donGia,
      'THANHTIEN': soKhoi * donGia,
      'GHICHU': ''
    };

    const newList = [...chiTietList, newChiTiet];
    setChiTietList(newList);
    updateTongTien(newList);
    toast.success('Đã thêm kiện vào danh sách');
  };

  // Add chi tiet for nhap kho
  // Sửa lại hàm handleAddChiTietNhap
  const handleAddChiTietNhap = () => {
    if (!currentChiTiet['NHOM_HANG']) {
      toast.error('Vui lòng chọn nhóm hàng');
      return;
    }
    if (!currentChiTiet['SO_KIEN'] || parseInt(currentChiTiet['SO_KIEN']) <= 0) {
      toast.error('Vui lòng nhập số kiện hợp lệ');
      return;
    }

    const soKien = parseInt(currentChiTiet['SO_KIEN']) || 0;

    // Tạo danh sách tạm để tính toán mã kiện
    const newChiTietList = [];

    // Kết hợp tonKho + chiTietList hiện tại để tính mã kiện đầu tiên
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = `${yy}${mm}`;

    const allKien = [
      ...tonKho,
      ...chiTietList
    ];

    const kienCungThang = allKien.filter(k => {
      if (k['MA_KIEN'] && k['MA_KIEN'].startsWith('K')) {
        const kienYearMonth = k['MA_KIEN'].substring(1, 5);
        return kienYearMonth === yearMonth;
      }
      return false;
    });

    let maxNumber = 0;
    kienCungThang.forEach(k => {
      const match = k['MA_KIEN'].match(/\d{3}$/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) maxNumber = num;
      }
    });

    // Tạo các kiện với mã tăng dần
    for (let i = 0; i < soKien; i++) {
      const nextNumber = (maxNumber + 1 + i).toString().padStart(3, '0');
      const maKien = `K${yearMonth}-${nextNumber}`;

      const chiTiet = {
        'ID_CT': Date.now() + i,
        'SOPHIEU': currentPhieu['SOPHIEU'],
        'NGHIEP_VU': 'NHAP',
        'KHO_XUAT': '',
        'KHO_NHAP': currentPhieu['KHONHAP'],
        'NGAY_NHAP_XUAT': currentPhieu['NGAYNHAP_XUAT'],
        'NHOM_HANG': currentChiTiet['NHOM_HANG'],
        'MA_KIEN': maKien,
        'DAY': selectedNhomHangInfo?.['DAY'] || '',
        'RONG': selectedNhomHangInfo?.['RONG'] || '',
        'DAI': selectedNhomHangInfo?.['DAI'] || '',
        'THANH': '',
        'SO_KHOI': 0,
        'CHATLUONG': currentChiTiet['CHATLUONG'] || '',
        'DOI_HANG_KHO': '',
        'DONGIA': 0,
        'THANHTIEN': 0,
        'GHICHU': ''
      };
      newChiTietList.push(chiTiet);
    }

    setChiTietList(prev => [...prev, ...newChiTietList]);
    toast.success(`Đã thêm ${soKien} kiện vào danh sách`);

    setCurrentChiTiet({
      'NHOM_HANG': '',
      'SO_KIEN': '',
      'DONGIA': 0,
      'CHATLUONG': ''
    });
    setNhomHangSearchTerm('');
    setSelectedNhomHangInfo(null);
  };


  // Update chi tiet field (for nhap kho)
  const handleUpdateChiTietField = (index, field, value) => {
    const newChiTietList = [...chiTietList];
    newChiTietList[index][field] = value;

    if (field === 'THANH') {
      const day = parseFloat(newChiTietList[index]['DAY']) || 0;
      const rong = parseFloat(newChiTietList[index]['RONG']) || 0;
      const dai = parseFloat(newChiTietList[index]['DAI']) || 0;
      const soThanh = parseFloat(value) || 0;
      newChiTietList[index]['SO_KHOI'] = (day * rong * dai * soThanh) / 1000000000;
    }

    setChiTietList(newChiTietList);
    updateTongKhoiLuong(newChiTietList);
  };

  // Update tong khoi luong
  const updateTongKhoiLuong = (chiTietArray) => {
    const tongKhoiLuong = chiTietArray.reduce((sum, item) => sum + (parseFloat(item['SO_KHOI']) || 0), 0);
    setCurrentPhieu(prev => ({
      ...prev,
      'TONGKHOILUONG': tongKhoiLuong
    }));
  };

  // Update tong tien
  const updateTongTien = (chiTietArray) => {
    const tongTien = chiTietArray.reduce((sum, item) => sum + (parseFloat(item['THANHTIEN']) || 0), 0);
    const tongKhoiLuong = chiTietArray.reduce((sum, item) => sum + (parseFloat(item['SO_KHOI']) || 0), 0);
    setCurrentPhieu(prev => ({
      ...prev,
      'TONGTIEN': tongTien,
      'TONGKHOILUONG': tongKhoiLuong
    }));
  };

  // Remove chi tiet
  const handleRemoveChiTiet = (index) => {
    const newChiTietList = chiTietList.filter((_, i) => i !== index);
    setChiTietList(newChiTietList);

    if (currentPhieu['NGHIEP_VU'] === 'NHAP') {
      updateTongKhoiLuong(newChiTietList);
    } else {
      updateTongTien(newChiTietList);
    }
    toast.info('Đã xóa chi tiết');
  };

  // Update don gia in chi tiet (for xuat kho)
  const handleUpdateDonGia = (index, newDonGia) => {
    const newChiTietList = [...chiTietList];
    newChiTietList[index]['DONGIA'] = parseFloat(newDonGia) || 0;
    newChiTietList[index]['THANHTIEN'] = newChiTietList[index]['SO_KHOI'] * newChiTietList[index]['DONGIA'];
    setChiTietList(newChiTietList);
    updateTongTien(newChiTietList);
  };

  // Modal handlers
  const handleOpenModal = (phieu = null) => {
    if (phieu) {
      setIsEditMode(true);
      setOriginalSoPhieu(phieu['SOPHIEU']);
      const phieuDate = phieu['NGAYNHAP_XUAT'] ?
        new Date(phieu['NGAYNHAP_XUAT']).toISOString().split('T')[0] :
        new Date().toISOString().split('T')[0];

      setCurrentPhieu({
        'SOPHIEU': phieu['SOPHIEU'] || '',
        'NGHIEP_VU': phieu['NGHIEP_VU'] || 'NHAP',
        'NGAYNHAP_XUAT': phieuDate,
        'NCC_KHACHHANG': phieu['NCC_KHACHHANG'] || '',
        'KHOXUAT': phieu['KHOXUAT'] || '',
        'KHONHAP': phieu['KHONHAP'] || '',
        'NGUOIPHUTRACH': phieu['NGUOIPHUTRACH'] || '',
        'TONGKHOILUONG': phieu['TONGKHOILUONG'] || 0,
        'TONGTIEN': phieu['TONGTIEN'] || 0,
        'DIENGIAI': phieu['DIENGIAI'] || ''
      });
      setCustomerSearchTerm(phieu['NCC_KHACHHANG'] || '');

      loadChiTiet(phieu['SOPHIEU']);
    } else {
      setIsEditMode(false);
      setOriginalSoPhieu('');
      const newSoPhieu = generateSoPhieu('NHAP');
      setCurrentPhieu({
        'SOPHIEU': newSoPhieu,
        'NGHIEP_VU': 'NHAP',
        'NGAYNHAP_XUAT': new Date().toISOString().split('T')[0],
        'NCC_KHACHHANG': '',
        'KHOXUAT': '',
        'KHONHAP': '',
        'NGUOIPHUTRACH': '',
        'TONGKHOILUONG': 0,
        'TONGTIEN': 0,
        'DIENGIAI': ''
      });
      setCustomerSearchTerm('');
      setChiTietList([]);
    }
    setShowModal(true);
  };

  // View detail modal
  const handleOpenDetailModal = async (phieu) => {
    setCurrentPhieu(phieu);
    setCustomerSearchTerm(phieu['NCC_KHACHHANG'] || '');
    await loadChiTiet(phieu['SOPHIEU']);
    setShowDetailModal(true);
  };

  const loadChiTiet = async (soPhieu) => {
    try {
      const response = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
      const filtered = response.filter(item => item['SOPHIEU'] === soPhieu);
      setChiTietList(filtered);
    } catch (error) {
      console.error('Error loading chi tiet:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowDetailModal(false);
    setIsEditMode(false);
    setOriginalSoPhieu('');
    setCurrentPhieu({
      'SOPHIEU': '',
      'NGHIEP_VU': 'NHAP',
      'NGAYNHAP_XUAT': new Date().toISOString().split('T')[0],
      'NCC_KHACHHANG': '',
      'KHOXUAT': '',
      'KHONHAP': '',
      'NGUOIPHUTRACH': '',
      'TONGKHOILUONG': 0,
      'TONGTIEN': 0,
      'DIENGIAI': ''
    });
    setCustomerSearchTerm('');
    setChiTietList([]);
    setCurrentChiTiet({
      'NHOM_HANG': '',
      'SO_KIEN': '',
      'DONGIA': 0,
      'CHATLUONG': ''
    });
    setNhomHangSearchTerm('');
    setSelectedNhomHangInfo(null);
    setShowCustomerDropdown(false);
    setShowNhomHangDropdown(false);
    setAvailableKien([]);
  };

  // Form handlers
  const handleInputChange = (field, value) => {
    setCurrentPhieu(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'NGHIEP_VU' && !isEditMode) {
      const newSoPhieu = generateSoPhieu(value);
      setCurrentPhieu(prev => ({
        ...prev,
        'SOPHIEU': newSoPhieu
      }));
    }
  };

  const handleCustomerInputChange = (value) => {
    setCustomerSearchTerm(value);
    setCurrentPhieu(prev => ({
      ...prev,
      'NCC_KHACHHANG': value
    }));
    setShowCustomerDropdown(true);
  };

  const handleNhomHangInputChange = (value) => {
    setNhomHangSearchTerm(value);
    setShowNhomHangDropdown(true);
  };

  const validatePhieu = (phieu) => {
    const errors = [];

    if (!phieu['SOPHIEU']) {
      errors.push('Số phiếu không được để trống');
    }

    if (!phieu['NGAYNHAP_XUAT']) {
      errors.push('Ngày nhập/xuất không được để trống');
    }

    if (phieu['NGHIEP_VU'] === 'NHAP' && !phieu['KHONHAP']) {
      errors.push('Kho nhập không được để trống');
    }

    if (phieu['NGHIEP_VU'] === 'XUAT' && !phieu['KHOXUAT']) {
      errors.push('Kho xuất không được để trống');
    }

    if (chiTietList.length === 0) {
      errors.push('Vui lòng thêm ít nhất một chi tiết');
    }

    if (phieu['NGHIEP_VU'] === 'NHAP') {
      const invalidItems = chiTietList.filter(item =>
        !item['THANH'] || parseFloat(item['THANH']) <= 0
      );
      if (invalidItems.length > 0) {
        errors.push('Vui lòng nhập số thanh cho tất cả các kiện');
      }
    }

    return errors;
  };

  // Save phieu
  const handleSavePhieu = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const errors = validatePhieu(currentPhieu);
      if (errors.length > 0) {
        toast.error(errors.join('\n'));
        setIsSubmitting(false);
        return;
      }

      const phieuToSave = { ...currentPhieu };

      if (isEditMode) {
        if (originalSoPhieu !== phieuToSave['SOPHIEU']) {
          const existingPhieu = phieuList.find(
            p => p['SOPHIEU'] === phieuToSave['SOPHIEU']
          );

          if (existingPhieu) {
            toast.error('Số phiếu mới này đã tồn tại!');
            setIsSubmitting(false);
            return;
          }

          // 1. LẤY DANH SÁCH CHI TIẾT CŨ
          const chiTietResponse = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
          const oldChiTiet = chiTietResponse.filter(item => item['SOPHIEU'] === originalSoPhieu);

          // 2. XÓA CHI TIẾT CŨ THEO ID_CT
          if (oldChiTiet.length > 0) {
            const rowsToDelete = oldChiTiet.map(item => ({ "ID_CT": item['ID_CT'] }));
            await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Delete', {
              "Rows": rowsToDelete
            });
          }

          // 3. XÓA PHIẾU CŨ
          await authUtils.apiRequestKHO('XUATNHAPKHO', 'Delete', {
            "Rows": [{ "SOPHIEU": originalSoPhieu }]
          });

          // 4. THÊM PHIẾU MỚI
          await authUtils.apiRequestKHO('XUATNHAPKHO', 'Add', {
            "Rows": [phieuToSave]
          });

          // 5. THÊM CHI TIẾT MỚI
          const chiTietToSave = chiTietList.map(chiTiet => ({
            ...chiTiet,
            'SOPHIEU': phieuToSave['SOPHIEU']
          }));

          await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Add', {
            "Rows": chiTietToSave
          });

          toast.success('Cập nhật phiếu thành công!');
        } else {
          // CẬP NHẬT PHIẾU (KHÔNG ĐỔI SỐ PHIẾU)
          await authUtils.apiRequestKHO('XUATNHAPKHO', 'Edit', {
            "Rows": [phieuToSave]
          });

          // LẤY DANH SÁCH CHI TIẾT CŨ
          const chiTietResponse = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
          const oldChiTiet = chiTietResponse.filter(item => item['SOPHIEU'] === phieuToSave['SOPHIEU']);

          // XÓA CHI TIẾT CŨ THEO ID_CT
          if (oldChiTiet.length > 0) {
            const rowsToDelete = oldChiTiet.map(item => ({ "ID_CT": item['ID_CT'] }));
            await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Delete', {
              "Rows": rowsToDelete
            });
          }

          // THÊM CHI TIẾT MỚI
          await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Add', {
            "Rows": chiTietList
          });

          toast.success('Cập nhật phiếu thành công!');
        }
      } else {
        // TẠO MỚI
        const existingPhieu = phieuList.find(
          p => p['SOPHIEU'] === phieuToSave['SOPHIEU']
        );

        if (existingPhieu) {
          toast.error('Số phiếu này đã tồn tại!');
          setIsSubmitting(false);
          return;
        }

        // Thêm phiếu mới
        await authUtils.apiRequestKHO('XUATNHAPKHO', 'Add', {
          "Rows": [phieuToSave]
        });

        // Thêm chi tiết mới
        await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Add', {
          "Rows": chiTietList
        });

        toast.success('Thêm phiếu mới thành công!');
      }

      await fetchPhieuList();
      await fetchTonKho();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving phieu:', error);
      toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu phiếu'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handlers
  const handleOpenDeleteConfirmation = (phieu) => {
    setPhieuToDelete(phieu);
    setShowDeleteConfirmation(true);
  };

  const handleCloseDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setPhieuToDelete(null);
  };

  const handleDeletePhieu = async () => {
    if (!phieuToDelete) return;

    try {
      // 1. LẤY DANH SÁCH CHI TIẾT CỦA PHIẾU
      const chiTietResponse = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
      const chiTietOfPhieu = chiTietResponse.filter(item => item['SOPHIEU'] === phieuToDelete['SOPHIEU']);

      // 2. XÓA TỪNG BẢN GHI CHI TIẾT THEO ID_CT
      if (chiTietOfPhieu.length > 0) {
        const rowsToDelete = chiTietOfPhieu.map(item => ({ "ID_CT": item['ID_CT'] }));
        await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Delete', {
          "Rows": rowsToDelete
        });
      }

      // 3. SAU ĐÓ MỚI XÓA PHIẾU CHA
      await authUtils.apiRequestKHO('XUATNHAPKHO', 'Delete', {
        "Rows": [{ "SOPHIEU": phieuToDelete['SOPHIEU'] }]
      });

      toast.success('Xóa phiếu thành công!');
      await fetchPhieuList();
      await fetchTonKho();
      handleCloseDeleteConfirmation();
    } catch (error) {
      console.error('Error deleting phieu:', error);
      toast.error('Có lỗi xảy ra khi xóa phiếu: ' + (error.message || ''));
    }
  };


  // Sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedPhieuList = useCallback(() => {
    const sortableList = [...phieuList];
    if (sortConfig.key) {
      sortableList.sort((a, b) => {
        const keyA = a[sortConfig.key] || '';
        const keyB = b[sortConfig.key] || '';

        if (sortConfig.key === 'NGAYNHAP_XUAT') {
          const dateA = new Date(keyA);
          const dateB = new Date(keyB);
          return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }

        if (['TONGKHOILUONG', 'TONGTIEN'].includes(sortConfig.key)) {
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
  }, [phieuList, sortConfig]);

  // Filtering
  const filteredPhieuList = getSortedPhieuList().filter(phieu => {
    const searchLower = search.toLowerCase();
    const matchesSearch = (
      phieu['SOPHIEU']?.toLowerCase().includes(searchLower) ||
      phieu['NCC_KHACHHANG']?.toLowerCase().includes(searchLower) ||
      phieu['NGUOIPHUTRACH']?.toLowerCase().includes(searchLower)
    );

    const matchesNghiepVu = filterNghiepVu === 'ALL' || phieu['NGHIEP_VU'] === filterNghiepVu;
    const matchesCustomer = filterCustomer === 'ALL' || phieu['NCC_KHACHHANG'] === filterCustomer;

    let matchesDateRange = true;
    if (filterDateFrom || filterDateTo) {
      const phieuDate = new Date(phieu['NGAYNHAP_XUAT']);
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        matchesDateRange = matchesDateRange && phieuDate >= fromDate;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && phieuDate <= toDate;
      }
    }

    return matchesSearch && matchesNghiepVu && matchesCustomer && matchesDateRange;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPhieuList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPhieuList.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterNghiepVu, filterCustomer, filterDateFrom, filterDateTo, itemsPerPage]);

  // Pagination handlers
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
    await fetchPhieuList();
    await fetchCustomers();
    await fetchDMHH();
    await fetchTonKho();
    toast.success('Đã tải lại dữ liệu thành công!');
  };

  // Statistics
  const tongNhap = phieuList.filter(p => p['NGHIEP_VU'] === 'NHAP').length;
  const tongXuat = phieuList.filter(p => p['NGHIEP_VU'] === 'XUAT').length;
  const tongKhoiLuongNhap = phieuList
    .filter(p => p['NGHIEP_VU'] === 'NHAP')
    .reduce((sum, p) => sum + (parseFloat(p['TONGKHOILUONG']) || 0), 0);
  const tongTienXuat = phieuList
    .filter(p => p['NGHIEP_VU'] === 'XUAT')
    .reduce((sum, p) => sum + (parseFloat(p['TONGTIEN']) || 0), 0);

  const uniqueCustomers = [...new Set(phieuList.map(p => p['NCC_KHACHHANG']).filter(Boolean))];

  return (
    <div className="p-3 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 border border-gray-100">
          {/* Header Section - Compact */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Quản Lý Nhập Xuất Kho</h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Quản lý phiếu nhập xuất kho và chi tiết</p>
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
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Tạo phiếu
              </button>
            </div>
          </div>

          {/* Search and Filter Section - Compact */}
          {showFilters && (
            <div className="mb-3 space-y-3 animate-fadeIn">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo số phiếu, NCC/KH, người phụ trách..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  Bộ lọc nâng cao:
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nghiệp vụ:</label>
                    <select
                      value={filterNghiepVu}
                      onChange={(e) => setFilterNghiepVu(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                    >
                      <option value="ALL">Tất cả ({phieuList.length})</option>
                      <option value="NHAP">Nhập kho ({tongNhap})</option>
                      <option value="XUAT">Xuất kho ({tongXuat})</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Khách hàng:</label>
                    <select
                      value={filterCustomer}
                      onChange={(e) => setFilterCustomer(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                    >
                      <option value="ALL">Tất cả</option>
                      {uniqueCustomers.map((customer, index) => (
                        <option key={index} value={customer}>{customer}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Từ ngày:</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Đến ngày:</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                    />
                  </div>
                </div>

                {(filterNghiepVu !== 'ALL' || filterCustomer !== 'ALL' || filterDateFrom || filterDateTo) && (
                  <button
                    onClick={() => {
                      setFilterNghiepVu('ALL');
                      setFilterCustomer('ALL');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                    }}
                    className="mt-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all text-xs font-medium"
                  >
                    <X className="w-3.5 h-3.5 inline mr-1" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Statistics cards - Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-purple-700 mb-0.5">Tổng phiếu</h3>
                  <p className="text-2xl font-bold text-purple-900">{phieuList.length}</p>
                </div>
                <div className="p-2 bg-purple-200 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-green-700 mb-0.5">Phiếu nhập</h3>
                  <p className="text-2xl font-bold text-green-900">{tongNhap}</p>
                  <p className="text-xs text-green-600 mt-0.5">{tongKhoiLuongNhap.toFixed(2)} m³</p>
                </div>
                <div className="p-2 bg-green-200 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-green-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-blue-700 mb-0.5">Phiếu xuất</h3>
                  <p className="text-2xl font-bold text-blue-900">{tongXuat}</p>
                  <p className="text-xs text-blue-600 mt-0.5">{formatCurrency(tongTienXuat)}</p>
                </div>
                <div className="p-2 bg-blue-200 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-orange-700 mb-0.5">Tháng này</h3>
                  <p className="text-2xl font-bold text-orange-900">
                    {phieuList.filter(p => {
                      const phieuDate = new Date(p['NGAYNHAP_XUAT']);
                      const now = new Date();
                      return phieuDate.getMonth() === now.getMonth() &&
                        phieuDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
                <div className="p-2 bg-orange-200 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Items per page selector - Compact */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-medium">Hiển thị:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-gray-800">{indexOfFirstItem + 1}</span> - <span className="font-semibold text-gray-800">{Math.min(indexOfLastItem, filteredPhieuList.length)}</span> / <span className="font-semibold text-gray-800">{filteredPhieuList.length}</span>
            </div>
          </div>

          {/* Table Section - Desktop - Compact */}
          <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('SOPHIEU')}>
                      <div className="flex items-center gap-1">Số phiếu {getSortIcon('SOPHIEU')}</div>
                    </th>
                    <th scope="col" className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('NGHIEP_VU')}>
                      <div className="flex items-center gap-1">Nghiệp vụ {getSortIcon('NGHIEP_VU')}</div>
                    </th>
                    <th scope="col" className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('NGAYNHAP_XUAT')}>
                      <div className="flex items-center gap-1">Ngày {getSortIcon('NGAYNHAP_XUAT')}</div>
                    </th>
                    <th scope="col" className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">NCC/KH</th>
                    <th scope="col" className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('TONGKHOILUONG')}>
                      <div className="flex items-center gap-1">Khối lượng {getSortIcon('TONGKHOILUONG')}</div>
                    </th>
                    <th scope="col" className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('TONGTIEN')}>
                      <div className="flex items-center gap-1">Tổng tiền {getSortIcon('TONGTIEN')}</div>
                    </th>
                    <th scope="col" className="px-2 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.length > 0 ? (
                    currentItems.map((phieu, index) => (
                      <tr key={phieu['SOPHIEU']} className={`hover:bg-purple-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded text-xs font-semibold">
                            {phieu['SOPHIEU']}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {phieu['NGHIEP_VU'] === 'NHAP' ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1 w-fit">
                              <TrendingDown className="w-3 h-3" />
                              Nhập
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium flex items-center gap-1 w-fit">
                              <TrendingUp className="w-3 h-3" />
                              Xuất
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-700">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {formatDate(phieu['NGAYNHAP_XUAT'])}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 max-w-[150px] truncate">
                          {phieu['NCC_KHACHHANG']}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-700">
                          <div className="flex items-center gap-1">
                            <Weight className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{parseFloat(phieu['TONGKHOILUONG'] || 0).toFixed(2)} m³</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs">
                          {phieu['TONGTIEN'] && phieu['TONGTIEN'] > 0 ? (
                            <span className="font-bold text-green-600">
                              {formatCurrency(phieu['TONGTIEN'])}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500 text-center">
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={() => handleOpenDetailModal(phieu)}
                              className="text-green-600 hover:text-green-900 p-1 rounded-lg hover:bg-green-100 transition-all transform hover:scale-110"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenModal(phieu)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded-lg hover:bg-indigo-100 transition-all transform hover:scale-110"
                              title="Sửa"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteConfirmation(phieu)}
                              className="text-red-600 hover:text-red-900 p-1 rounded-lg hover:bg-red-100 transition-all transform hover:scale-110"
                              title="Xóa"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Package className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-sm font-medium">Không tìm thấy phiếu nào</p>
                          <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Card View - Mobile - Compact */}
          <div className="lg:hidden space-y-2.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : currentItems.length > 0 ? (
              currentItems.map((phieu) => (
                <div key={phieu['SOPHIEU']} className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded text-xs font-semibold">
                          {phieu['SOPHIEU']}
                        </span>
                        {phieu['NGHIEP_VU'] === 'NHAP' ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Nhập
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Xuất
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">{phieu['NCC_KHACHHANG']}</h3>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{formatDate(phieu['NGAYNHAP_XUAT'])}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Weight className="w-3 h-3 text-gray-400" />
                      <span>Khối lượng: <span className="font-medium">{parseFloat(phieu['TONGKHOILUONG'] || 0).toFixed(2)} m³</span></span>
                    </div>
                    {phieu['TONGTIEN'] && phieu['TONGTIEN'] > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 text-green-500" />
                        <span className="font-bold text-green-600">{formatCurrency(phieu['TONGTIEN'])}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleOpenDetailModal(phieu)}
                      className="flex-1 text-green-600 hover:text-green-900 px-2 py-1.5 rounded-lg hover:bg-green-100 transition-all flex items-center justify-center gap-1.5 text-xs font-medium"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem
                    </button>
                    <button
                      onClick={() => handleOpenModal(phieu)}
                      className="flex-1 text-indigo-600 hover:text-indigo-900 px-2 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5 text-xs font-medium"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleOpenDeleteConfirmation(phieu)}
                      className="flex-1 text-red-600 hover:text-red-900 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-all flex items-center justify-center gap-1.5 text-xs font-medium"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 py-8">
                <Package className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium">Không tìm thấy phiếu nào</p>
                <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
              </div>
            )}
          </div>

          {/* Pagination - Compact */}
          {filteredPhieuList.length > 0 && (
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="text-xs text-gray-600">
                Trang <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={goToFirstPage} disabled={currentPage === 1} className={`p-1.5 rounded-lg border transition-all ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button onClick={goToPrevPage} disabled={currentPage === 1} className={`p-1.5 rounded-lg border transition-all ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-500 text-xs">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`min-w-[32px] px-2 py-1 rounded-lg border font-medium transition-all text-xs ${currentPage === page
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                <button onClick={goToNextPage} disabled={currentPage === totalPages} className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button onClick={goToLastPage} disabled={currentPage === totalPages} className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal - Compact */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl p-4 animate-fadeIn max-h-[98vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                {isEditMode ? 'Cập nhật phiếu' : 'Tạo phiếu mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* LEFT SIDE - Thông tin phiếu - Compact */}
              <div className="lg:col-span-1 space-y-3">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-purple-500" />
                    Thông tin phiếu
                  </h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Số phiếu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={currentPhieu['SOPHIEU']}
                        onChange={(e) => handleInputChange('SOPHIEU', e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm bg-gray-50"
                        placeholder="Tự động tạo"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nghiệp vụ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentPhieu['NGHIEP_VU']}
                        onChange={(e) => {
                          handleInputChange('NGHIEP_VU', e.target.value);
                          setChiTietList([]);
                          setCurrentChiTiet({
                            'NHOM_HANG': '',
                            'SO_KIEN': '',
                            'DONGIA': 0,
                            'CHATLUONG': ''
                          });
                        }}
                        className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                        disabled={isEditMode}
                      >
                        <option value="NHAP">Nhập kho</option>
                        <option value="XUAT">Xuất kho</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Ngày <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={currentPhieu['NGAYNHAP_XUAT']}
                        onChange={(e) => handleInputChange('NGAYNHAP_XUAT', e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                      />
                    </div>

                    <div ref={customerDropdownRef}>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'Nhà cung cấp' : 'Khách hàng'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={customerSearchTerm}
                          onChange={(e) => handleCustomerInputChange(e.target.value)}
                          onFocus={() => setShowCustomerDropdown(true)}
                          className="p-2 pr-8 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                          placeholder="Nhập để tìm..."
                        />
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredCustomers.map((customer) => (
                              <div
                                key={customer['MA_KH']}
                                onClick={() => handleSelectCustomer(customer['TEN_KHACHHANG'])}
                                className="px-3 py-2 hover:bg-purple-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">
                                    {customer['TEN_KHACHHANG']}
                                  </span>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {customer['MA_KH']}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Người phụ trách
                      </label>
                      <input
                        type="text"
                        value={currentPhieu['NGUOIPHUTRACH']}
                        onChange={(e) => handleInputChange('NGUOIPHUTRACH', e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                        placeholder="Nhập người phụ trách"
                      />
                    </div>

                    {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Kho nhập <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={currentPhieu['KHONHAP']}
                          onChange={(e) => handleInputChange('KHONHAP', e.target.value)}
                          className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                          placeholder="Nhập kho nhập"
                        />
                      </div>
                    )}

                    {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Kho xuất <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={currentPhieu['KHOXUAT']}
                          onChange={(e) => handleInputChange('KHOXUAT', e.target.value)}
                          className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                          placeholder="Nhập kho xuất"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Diễn giải
                      </label>
                      <textarea
                        value={currentPhieu['DIENGIAI']}
                        onChange={(e) => handleInputChange('DIENGIAI', e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                        placeholder="Nhập diễn giải"
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE - Chi tiết và danh sách - Compact */}
              <div className="lg:col-span-2 space-y-3">
                {/* Form nhập chi tiết */}
                {currentPhieu['NGHIEP_VU'] === 'NHAP' ? (
                  <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-green-500" />
                      Thêm chi tiết nhập kho
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div ref={nhomHangDropdownRef}>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Nhóm hàng <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={nhomHangSearchTerm}
                            onChange={(e) => handleNhomHangInputChange(e.target.value)}
                            onFocus={() => setShowNhomHangDropdown(true)}
                            className="p-2 pr-8 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                            placeholder="Chọn nhóm hàng..."
                          />
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                          {showNhomHangDropdown && filteredNhomHang.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredNhomHang.map((item, index) => (
                                <div
                                  key={index}
                                  onClick={() => handleSelectNhomHang(item['NHOM_HANG'])}
                                  className="px-3 py-2 hover:bg-green-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="text-sm font-medium text-gray-900">
                                    {item['NHOM_HANG']}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {item['DAY']} x {item['RONG']} x {item['DAI']}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Chất lượng
                        </label>
                        <input
                          type="text"
                          value={currentChiTiet['CHATLUONG']}
                          onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'CHATLUONG': e.target.value }))}
                          className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                          placeholder="Nhập chất lượng"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Số kiện <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={currentChiTiet['SO_KIEN']}
                          onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'SO_KIEN': e.target.value }))}
                          className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                          placeholder="Số kiện"
                          min="1"
                        />
                      </div>

                      {selectedNhomHangInfo && (
                        <div className="col-span-full p-2 bg-white rounded-lg border border-green-200">
                          <p className="text-xs text-gray-600">
                            <strong>Thông tin:</strong> Dày: {selectedNhomHangInfo['DAY']}mm,
                            Rộng: {selectedNhomHangInfo['RONG']}mm,
                            Dài: {selectedNhomHangInfo['DAI']}mm
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleAddChiTietNhap}
                        className="col-span-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm kiện vào danh sách
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      Thêm chi tiết xuất kho
                    </h3>
                    <div className="space-y-2.5">
                      <div ref={nhomHangDropdownRef}>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Nhóm hàng <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={nhomHangSearchTerm}
                            onChange={(e) => handleNhomHangInputChange(e.target.value)}
                            onFocus={() => setShowNhomHangDropdown(true)}
                            className="p-2 pr-8 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            placeholder="Chọn nhóm hàng..."
                          />
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                          {showNhomHangDropdown && filteredNhomHang.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredNhomHang.map((item, index) => (
                                <div
                                  key={index}
                                  onClick={() => handleSelectNhomHang(item['NHOM_HANG'])}
                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {item['NHOM_HANG']}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {item['DAY']} x {item['RONG']} x {item['DAI']}
                                      </div>
                                    </div>
                                    <div className="text-xs font-semibold text-green-600">
                                      {formatCurrency(item['DONGIA_HIEULUC'])}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Đơn giá (có thể sửa)
                        </label>
                        <input
                          type="number"
                          value={currentChiTiet['DONGIA']}
                          onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'DONGIA': e.target.value }))}
                          className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                          placeholder="Đơn giá"
                        />
                      </div>

                      {selectedNhomHangInfo && availableKien.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Chọn kiện xuất (Tồn: {availableKien.length} kiện)
                          </label>
                          <div className="max-h-48 overflow-y-auto border border-blue-200 rounded-lg bg-white">
                            {availableKien.map((kien, index) => (
                              <div
                                key={index}
                                onClick={() => handleSelectKien(kien)}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-medium text-gray-900">{kien['MA_KIEN']}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {kien['THANH']} thanh - {parseFloat(kien['SO_KHOI']).toFixed(3)} m³
                                    </span>
                                    {kien['CHATLUONG'] && (
                                      <span className="text-xs text-purple-600 ml-2 bg-purple-100 px-1.5 py-0.5 rounded">
                                        {kien['CHATLUONG']}
                                      </span>
                                    )}
                                  </div>
                                  <Plus className="w-4 h-4 text-blue-600" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedNhomHangInfo && availableKien.length === 0 && (
                        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-1.5 text-yellow-700">
                            <AlertCircle className="w-4 h-4" />
                            <p className="text-xs font-medium">Không có kiện tồn kho cho nhóm hàng này</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Danh sách chi tiết - Compact */}
                {chiTietList.length > 0 && (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Danh sách chi tiết ({chiTietList.length} {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'kiện' : 'dòng'})
                    </h3>

                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">STT</th>
                            <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Nhóm hàng</th>
                            <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Mã kiện</th>
                            <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Chất lượng</th>
                            {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                              <>
                                <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Số thanh</th>
                                <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Đội hàng</th>
                              </>
                            )}
                            {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                              <>
                                <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Thanh</th>
                                <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Đơn giá</th>
                              </>
                            )}
                            <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Khối (m³)</th>
                            {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Thành tiền</th>
                            )}
                            <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-700">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {chiTietList.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5 text-xs">{index + 1}</td>
                              <td className="px-2 py-1.5 text-xs font-medium">{item['NHOM_HANG']}</td>
                              <td className="px-2 py-1.5 text-xs">{item['MA_KIEN']}</td>
                              <td className="px-2 py-1.5 text-xs">
                                {currentPhieu['NGHIEP_VU'] === 'NHAP' ? (
                                  <input
                                    type="text"
                                    value={item['CHATLUONG']}
                                    onChange={(e) => handleUpdateChiTietField(index, 'CHATLUONG', e.target.value)}
                                    className="w-24 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500"
                                    placeholder="Chất lượng"
                                  />
                                ) : (
                                  <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                                    {item['CHATLUONG'] || '—'}
                                  </span>
                                )}
                              </td>

                              {currentPhieu['NGHIEP_VU'] === 'NHAP' ? (
                                <>
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="number"
                                      value={item['THANH']}
                                      onChange={(e) => handleUpdateChiTietField(index, 'THANH', e.target.value)}
                                      className="w-20 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500"
                                      placeholder="Số thanh"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="text"
                                      value={item['DOI_HANG_KHO']}
                                      onChange={(e) => handleUpdateChiTietField(index, 'DOI_HANG_KHO', e.target.value)}
                                      className="w-24 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500"
                                      placeholder="Đội hàng"
                                    />
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-2 py-1.5 text-xs">{item['THANH']}</td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="number"
                                      value={item['DONGIA']}
                                      onChange={(e) => handleUpdateDonGia(index, e.target.value)}
                                      className="w-24 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                    />
                                  </td>
                                </>
                              )}

                              <td className="px-2 py-1.5 text-xs font-medium">
                                {parseFloat(item['SO_KHOI'] || 0).toFixed(3)}
                              </td>

                              {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                                <td className="px-2 py-1.5 text-xs font-bold text-green-600">
                                  {formatCurrency(item['THANHTIEN'])}
                                </td>
                              )}

                              <td className="px-2 py-1.5 text-center">
                                <button
                                  onClick={() => handleRemoveChiTiet(index)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100 transition-all"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Tổng kết - Compact */}
                    <div className="mt-3 p-2.5 bg-white rounded-lg border-2 border-purple-200">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-700">Tổng khối lượng:</span>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-purple-600">
                            {parseFloat(currentPhieu['TONGKHOILUONG']).toFixed(3)} m³
                          </span>
                        </div>

                        {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                          <>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-700">Tổng tiền:</span>
                            </div>
                            <div>
                              <span className="text-lg font-bold text-green-600">
                                {formatCurrency(currentPhieu['TONGTIEN'])}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with buttons - Compact */}
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center gap-1.5 text-sm"
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
                Hủy
              </button>
              <button
                onClick={handleSavePhieu}
                disabled={isSubmitting || chiTietList.length === 0}
                className={`px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg ${isSubmitting || chiTietList.length === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:from-purple-700 hover:to-purple-800 hover:shadow-lg transform hover:-translate-y-0.5'
                  } flex items-center gap-1.5 transition-all shadow-md font-medium text-sm`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Lưu phiếu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal - Compact */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl p-4 animate-fadeIn max-h-[98vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                Chi tiết phiếu
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Thông tin phiếu - Compact */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-500" />
                  Thông tin phiếu
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Số phiếu:</label>
                    <p className="text-sm font-semibold text-gray-900">{currentPhieu['SOPHIEU']}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Nghiệp vụ:</label>
                    {currentPhieu['NGHIEP_VU'] === 'NHAP' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium inline-flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Nhập kho
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Xuất kho
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Ngày:</label>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(currentPhieu['NGAYNHAP_XUAT'])}</p>
                  </div>
                  <div >
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'Nhà cung cấp:' : 'Khách hàng:'}
                    </label>
                    <p className="text-sm font-semibold text-gray-900">{currentPhieu['NCC_KHACHHANG']}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Người phụ trách:</label>
                    <p className="text-sm font-semibold text-gray-900">{currentPhieu['NGUOIPHUTRACH'] || '—'}</p>
                  </div>
                  {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Kho nhập:</label>
                      <p className="text-sm font-semibold text-gray-900">{currentPhieu['KHONHAP']}</p>
                    </div>
                  )}
                  {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Kho xuất:</label>
                      <p className="text-sm font-semibold text-gray-900">{currentPhieu['KHOXUAT']}</p>
                    </div>
                  )}
                  {currentPhieu['DIENGIAI'] && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Diễn giải:</label>
                      <p className="text-sm text-gray-900">{currentPhieu['DIENGIAI']}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Danh sách chi tiết - Compact */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Danh sách chi tiết ({chiTietList.length} {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'kiện' : 'dòng'})
                </h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">STT</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Nhóm hàng</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Mã kiện</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Kích thước</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Chất lượng</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Số thanh</th>
                        {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Đội hàng khô</th>
                        )}
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Khối lượng (m³)</th>
                        {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                          <>
                            <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Đơn giá</th>
                            <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Thành tiền</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chiTietList.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 py-2 text-xs">{index + 1}</td>
                          <td className="px-2 py-2 text-xs font-medium">{item['NHOM_HANG']}</td>
                          <td className="px-2 py-2 text-xs">{item['MA_KIEN']}</td>
                          <td className="px-2 py-2 text-xs">{item['DAY']}x{item['RONG']}x{item['DAI']}</td>
                          <td className="px-2 py-2 text-xs">
                            {item['CHATLUONG'] ? (
                              <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                                {item['CHATLUONG']}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-2 py-2 text-xs">{item['THANH']}</td>
                          {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                            <td className="px-2 py-2 text-xs">{item['DOI_HANG_KHO'] || '—'}</td>
                          )}
                          <td className="px-2 py-2 text-xs font-medium">{parseFloat(item['SO_KHOI'] || 0).toFixed(3)}</td>
                          {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                            <>
                              <td className="px-2 py-2 text-xs">{formatCurrency(item['DONGIA'])}</td>
                              <td className="px-2 py-2 text-xs font-bold text-green-600">{formatCurrency(item['THANHTIEN'])}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tổng kết - Compact */}
                <div className="mt-3 p-2.5 bg-white rounded-lg border-2 border-purple-200">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-700">Tổng khối lượng:</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-purple-600">
                        {parseFloat(currentPhieu['TONGKHOILUONG']).toFixed(3)} m³
                      </span>
                    </div>

                    {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                      <>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-700">Tổng tiền:</span>
                        </div>
                        <div>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(currentPhieu['TONGTIEN'])}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Compact */}
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all flex items-center gap-1.5 text-sm font-medium"
              >
                <X className="h-4 w-4" />
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Compact */}
      {showDeleteConfirmation && phieuToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2.5 mb-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <Trash className="w-4 h-4 text-red-600" />
                </div>
                Xác nhận xóa
              </h2>
              <button onClick={handleCloseDeleteConfirmation} className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 mb-2 font-medium text-sm">
                  Bạn có chắc chắn muốn xóa phiếu này?
                </p>
                <div className="bg-white rounded-lg p-2.5 mt-2 space-y-1.5 shadow-sm">
                  <p className="text-xs text-gray-700 flex items-center gap-2">
                    <span className="font-semibold min-w-[80px]">Số phiếu:</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      {phieuToDelete['SOPHIEU']}
                    </span>
                  </p>
                  <p className="text-xs text-gray-700 flex items-center gap-2">
                    <span className="font-semibold min-w-[80px]">Nghiệp vụ:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${phieuToDelete['NGHIEP_VU'] === 'NHAP' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {phieuToDelete['NGHIEP_VU'] === 'NHAP' ? 'Nhập kho' : 'Xuất kho'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-700 flex items-center gap-2">
                    <span className="font-semibold min-w-[80px]">NCC/KH:</span>
                    <span>{phieuToDelete['NCC_KHACHHANG']}</span>
                  </p>
                </div>
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  Hành động này sẽ xóa cả chi tiết phiếu và không thể hoàn tác.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  onClick={handleCloseDeleteConfirmation}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeletePhieu}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                >
                  <Trash className="h-4 w-4" />
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
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

      {/* Add CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        /* Custom scrollbar */
        .overflow-y-auto::-webkit-scrollbar,
        .overflow-x-auto::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track,
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb,
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover,
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default XuatNhapKhoManagement;

