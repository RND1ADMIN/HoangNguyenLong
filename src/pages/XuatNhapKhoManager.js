import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, Package, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Calendar, TrendingUp, TrendingDown, DollarSign, Weight, FileText, ChevronDown, Save, Minus, AlertCircle, Eye, Printer } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const XuatNhapKhoManagement = () => {
  // State Management
  const [phieuList, setPhieuList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [dmhh, setDmhh] = useState([]);
  const [tonKho, setTonKho] = useState([]);
  const [tieuChuanList, setTieuChuanList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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
    'TIEU_CHUAN': '',
    'DOI_HANG_KHO': ''
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTieuChuanModal, setShowTieuChuanModal] = useState(false);
  const [newTieuChuan, setNewTieuChuan] = useState('');
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

  // Print function
  const handlePrintPhieu = async (phieu) => {
    try {
      let chiTiet = chiTietList;
      if (phieu['SOPHIEU'] !== currentPhieu['SOPHIEU']) {
        const response = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
        chiTiet = response.filter(item => item['SOPHIEU'] === phieu['SOPHIEU']);
      }

      const date = new Date(phieu['NGAYNHAP_XUAT']);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const groupedByDoi = {};
      chiTiet.forEach(item => {
        const doiHangKho = item['DOI_HANG_KHO'] || 'Chưa phân đội';
        const tieuChuan = item['TIEU_CHUAN'] || '';
        const kichThuoc = `${item['DAY']}x${item['RONG']}x${item['DAI']}`;
        const key = `${doiHangKho}_${tieuChuan}_${kichThuoc}`;

        if (!groupedByDoi[key]) {
          groupedByDoi[key] = {
            doiHangKho: doiHangKho,
            tieuChuan: tieuChuan,
            day: item['DAY'],
            rong: item['RONG'],
            dai: item['DAI'],
            soKien: 0,
            tongKhoi: 0
          };
        }
        groupedByDoi[key].soKien += 1;
        groupedByDoi[key].tongKhoi += parseFloat(item['SO_KHOI'] || 0);
      });

      const sortedGroups = Object.values(groupedByDoi).sort((a, b) => {
        return a.doiHangKho.localeCompare(b.doiHangKho);
      });

      const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Phiếu ${phieu['NGHIEP_VU'] === 'NHAP' ? 'Nhập' : 'Xuất'} Kho - ${phieu['SOPHIEU']}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.3; color: #000; }
          .container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 5mm; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 18pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          .header .date { font-size: 11pt; font-style: italic; }
          .info-section { margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-item { font-size: 11pt; padding: 3px 0; }
          .info-item strong { font-weight: bold; min-width: 120px; display: inline-block; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10pt; }
          table th { background-color: #f0f0f0; border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold; font-size: 9pt; }
          table td { border: 1px solid #000; padding: 5px 4px; text-align: center; }
          table td.left { text-align: left; }
          table td.right { text-align: right; }
          .summary-row { background-color: #fff3cd; font-weight: bold; }
          .total-section { margin-top: 15px; padding: 10px; background-color: #f8f9fa; border: 2px solid #000; }
          .total-item { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12pt; }
          .total-item strong { font-weight: bold; }
          .signatures { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; }
          .signature-box { padding: 10px; }
          .signature-box .title { font-weight: bold; margin-bottom: 60px; font-size: 11pt; }
          .signature-box .name { font-style: italic; margin-top: 5px; }
          .footer { margin-top: 20px; text-align: center; font-size: 9pt; font-style: italic; color: #666; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SỔ NHẬT KÝ - ${phieu['NGHIEP_VU'] === 'NHAP' ? 'NHẬP KHO' : 'XUẤT KHO'} THÀNH PHẨM</h1>
            <div class="date">Ngày ${day} Tháng ${month} Năm ${year}</div>
          </div>
          
          <div class="info-section">
            <div class="info-item"><strong>Số phiếu:</strong> ${phieu['SOPHIEU']}</div>
            <div class="info-item"><strong>Nghiệp vụ:</strong> ${phieu['NGHIEP_VU'] === 'NHAP' ? 'Nhập kho' : 'Xuất kho'}</div>
            <div class="info-item"><strong>${phieu['NGHIEP_VU'] === 'NHAP' ? 'Nhà cung cấp' : 'Khách hàng'}:</strong> ${phieu['NCC_KHACHHANG'] || ''}</div>
            <div class="info-item"><strong>Người phụ trách:</strong> ${phieu['NGUOIPHUTRACH'] || ''}</div>
            <div class="info-item"><strong>${phieu['NGHIEP_VU'] === 'NHAP' ? 'Kho nhập' : 'Kho xuất'}:</strong> ${phieu['NGHIEP_VU'] === 'NHAP' ? phieu['KHONHAP'] : phieu['KHOXUAT']}</div>
            ${phieu['DIENGIAI'] ? `<div class="info-item" style="grid-column: 1 / -1;"><strong>Diễn giải:</strong> ${phieu['DIENGIAI']}</div>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">STT</th>
                <th style="width: 80px;">Mã Kiện</th>
                <th style="width: 40px;">Dày</th>
                <th style="width: 40px;">Rộng</th>
                <th style="width: 40px;">Dài</th>
                <th style="width: 60px;">Số thanh</th>
                <th style="width: 60px;">Số m3</th>
                <th style="width: 80px;">Tiêu chuẩn</th>
                <th style="width: 60px;">Thủ kho</th>
                <th style="width: 80px;">Đội hàng Khô</th>
                <th style="width: 60px;">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${chiTiet.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item['MA_KIEN']}</td>
                  <td>${item['DAY']}</td>
                  <td>${item['RONG']}</td>
                  <td>${item['DAI']}</td>
                  <td>${item['THANH'] || ''}</td>
                  <td class="right">${parseFloat(item['SO_KHOI'] || 0).toFixed(4)}</td>
                  <td>${item['TIEU_CHUAN'] || ''}</td>
                  <td></td>
                  <td>${item['DOI_HANG_KHO'] || ''}</td>
                  <td>${item['GHICHU'] || ''}</td>
                </tr>
              `).join('')}
              
              ${sortedGroups.map(group => `
                <tr class="summary-row">
                  <td colspan="2" class="left">TỔNG CỘNG ĐỘI ${group.doiHangKho}</td>
                  <td colspan="3">Hàng ${group.day}x${group.rong}x${group.dai}</td>
                  <td>${group.soKien}</td>
                  <td class="right">${group.tongKhoi.toFixed(4)}</td>
                  <td colspan="4">${group.soKien} kiện</td>
                </tr>
              `).join('')}
              
              <tr class="summary-row" style="background-color: #ffc107;">
                <td colspan="5" class="left"><strong>TỔNG NGÀY ${day}/${month}/${year}</strong></td>
                <td><strong>${chiTiet.length}</strong></td>
                <td class="right"><strong>${parseFloat(phieu['TONGKHOILUONG']).toFixed(4)}</strong></td>
                <td colspan="4" class="left"><strong>Tổng cộng ${chiTiet.length} kiện</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${phieu['NGHIEP_VU'] === 'XUAT' && phieu['TONGTIEN'] > 0 ? `
          <div class="total-section">
            <div class="total-item">
              <span>Tổng khối lượng:</span>
              <strong>${parseFloat(phieu['TONGKHOILUONG']).toFixed(3)} m³</strong>
            </div>
            <div class="total-item">
              <span>Tổng tiền:</span>
              <strong>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(phieu['TONGTIEN'])}</strong>
            </div>
          </div>
          ` : ''}
          
          <div class="signatures">
            <div class="signature-box">
              <div class="title">Người lập phiếu</div>
              <div class="name">${phieu['NGUOIPHUTRACH'] || '(Ký và ghi rõ họ tên)'}</div>
            </div>
            <div class="signature-box">
              <div class="title">Thủ kho</div>
              <div class="name">(Ký và ghi rõ họ tên)</div>
            </div>
            <div class="signature-box">
              <div class="title">Kế toán trưởng</div>
              <div class="name">(Ký và ghi rõ họ tên)</div>
            </div>
          </div>
          
          <div class="footer">
            <p>In lúc: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(printContent);
      printWindow.document.close();

    } catch (error) {
      console.error('Error printing phieu:', error);
      toast.error('Có lỗi xảy ra khi in phiếu');
    }
  };

  // Generate so phieu tu dong với format YYMMDD-001
  const generateSoPhieu = (nghiepVu, ngayNhapXuat) => {
    const date = new Date(ngayNhapXuat);
    const yy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const prefix = nghiepVu === 'NHAP' ? 'NK' : 'XK';
    const yearMonthDay = `${yy}${mm}${dd}`;

    const phieuCungNgay = phieuList.filter(p => {
      if (p['SOPHIEU'] && p['SOPHIEU'].startsWith(prefix)) {
        const phieuYearMonthDay = p['SOPHIEU'].substring(2, 8);
        return phieuYearMonthDay === yearMonthDay;
      }
      return false;
    });

    let maxNumber = 0;
    phieuCungNgay.forEach(p => {
      const match = p['SOPHIEU'].match(/\d{3}$/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${prefix}${yearMonthDay}-${nextNumber}`;
  };

  // Generate ma kien tu dong với format YYMMDD-001
  const generateMaKien = (ngayNhapXuat) => {
    const date = new Date(ngayNhapXuat);
    const yy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const yearMonthDay = `${yy}${mm}${dd}`;

    const allKien = [
      ...tonKho,
      ...chiTietList
    ];

    const kienCungNgay = allKien.filter(k => {
      if (k['MA_KIEN'] && k['MA_KIEN'].startsWith('K')) {
        const kienYearMonthDay = k['MA_KIEN'].substring(1, 7);
        return kienYearMonthDay === yearMonthDay;
      }
      return false;
    });

    let maxNumber = 0;
    kienCungNgay.forEach(k => {
      const match = k['MA_KIEN'].match(/\d{3}$/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `K${yearMonthDay}-${nextNumber}`;
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

  const fetchKhoList = async () => {
    try {
      const response = await authUtils.apiRequestKHO('CD_KHO', 'Find', {});
      setKhoList(response);
    } catch (error) {
      console.error('Error fetching kho list:', error);
      toast.error('Lỗi khi tải danh sách kho');
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

  const fetchTieuChuan = async () => {
    try {
      const response = await authUtils.apiRequestKHO('CD_TIEUCHUAN', 'Find', {});
      setTieuChuanList(response);
    } catch (error) {
      console.error('Error fetching tieu chuan:', error);
      toast.error('Lỗi khi tải danh sách tiêu chuẩn');
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const localUser = authUtils.getUserData();
      if (localUser) {
        setCurrentUser(localUser);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const handleAddTieuChuan = async () => {
    if (!newTieuChuan.trim()) {
      toast.error('Vui lòng nhập tên tiêu chuẩn');
      return;
    }

    const exists = tieuChuanList.find(tc =>
      tc['TIEU_CHUAN'].toLowerCase() === newTieuChuan.trim().toLowerCase()
    );

    if (exists) {
      toast.error('Tiêu chuẩn này đã tồn tại');
      return;
    }

    try {
      const newTC = {
        'ID_TC': Date.now(),
        'TIEU_CHUAN': newTieuChuan.trim().toUpperCase()
      };

      await authUtils.apiRequestKHO('CD_TIEUCHUAN', 'Add', {
        "Rows": [newTC]
      });

      toast.success('Thêm tiêu chuẩn mới thành công!');
      await fetchTieuChuan();
      setNewTieuChuan('');
      setShowTieuChuanModal(false);
    } catch (error) {
      console.error('Error adding tieu chuan:', error);
      toast.error('Có lỗi xảy ra khi thêm tiêu chuẩn');
    }
  };

  const handleDeleteTieuChuan = async (idTC) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tiêu chuẩn này?')) {
      return;
    }

    try {
      await authUtils.apiRequestKHO('CD_TIEUCHUAN', 'Delete', {
        "Rows": [{ "ID_TC": idTC }]
      });

      toast.success('Xóa tiêu chuẩn thành công!');
      await fetchTieuChuan();
    } catch (error) {
      console.error('Error deleting tieu chuan:', error);
      toast.error('Có lỗi xảy ra khi xóa tiêu chuẩn');
    }
  };

  useEffect(() => {
    fetchPhieuList();
    fetchCustomers();
    fetchKhoList();
    fetchDMHH();
    fetchTonKho();
    fetchTieuChuan();
    fetchCurrentUser();
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
  const handleSelectCustomer = (customer) => {
    setCurrentPhieu(prev => ({
      ...prev,
      'NCC_KHACHHANG': customer['TEN_KHACHHANG']
    }));
    setCustomerSearchTerm(customer['TEN_KHACHHANG']);
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
      'TIEU_CHUAN': kien['TIEU_CHUAN'],
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
  const handleAddChiTietNhap = () => {
    if (!currentChiTiet['NHOM_HANG']) {
      toast.error('Vui lòng chọn nhóm hàng');
      return;
    }
    if (!currentChiTiet['TIEU_CHUAN']) {
      toast.error('Vui lòng chọn tiêu chuẩn');
      return;
    }
    if (!currentChiTiet['SO_KIEN'] || parseInt(currentChiTiet['SO_KIEN']) <= 0) {
      toast.error('Vui lòng nhập số kiện hợp lệ');
      return;
    }

    const soKien = parseInt(currentChiTiet['SO_KIEN']) || 0;
    const newChiTietList = [];

    const date = new Date(currentPhieu['NGAYNHAP_XUAT']);
    const yy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const yearMonthDay = `${yy}${mm}${dd}`;

    const allKien = [
      ...tonKho,
      ...chiTietList
    ];

    const kienCungNgay = allKien.filter(k => {
      if (k['MA_KIEN'] && k['MA_KIEN'].startsWith('K')) {
        const kienYearMonthDay = k['MA_KIEN'].substring(1, 7);
        return kienYearMonthDay === yearMonthDay;
      }
      return false;
    });

    let maxNumber = 0;
    kienCungNgay.forEach(k => {
      const match = k['MA_KIEN'].match(/\d{3}$/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) maxNumber = num;
      }
    });

    for (let i = 0; i < soKien; i++) {
      const nextNumber = (maxNumber + 1 + i).toString().padStart(3, '0');
      const maKien = `K${yearMonthDay}-${nextNumber}`;

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
        'TIEU_CHUAN': currentChiTiet['TIEU_CHUAN'],
        'DOI_HANG_KHO': currentChiTiet['DOI_HANG_KHO'] || '',
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
      'TIEU_CHUAN': '',
      'DOI_HANG_KHO': ''
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
      const newSoPhieu = generateSoPhieu('NHAP', new Date().toISOString().split('T')[0]);
      const nguoiPhuTrach = currentUser ? (currentUser['Họ và Tên'] || currentUser.username) : '';

      setCurrentPhieu({
        'SOPHIEU': newSoPhieu,
        'NGHIEP_VU': 'NHAP',
        'NGAYNHAP_XUAT': new Date().toISOString().split('T')[0],
        'NCC_KHACHHANG': '',
        'KHOXUAT': '',
        'KHONHAP': '',
        'NGUOIPHUTRACH': nguoiPhuTrach,
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
      'TIEU_CHUAN': '',
      'DOI_HANG_KHO': ''
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

    if ((field === 'NGHIEP_VU' || field === 'NGAYNHAP_XUAT') && !isEditMode) {
      const nghiepVu = field === 'NGHIEP_VU' ? value : currentPhieu['NGHIEP_VU'];
      const ngayNhapXuat = field === 'NGAYNHAP_XUAT' ? value : currentPhieu['NGAYNHAP_XUAT'];
      const newSoPhieu = generateSoPhieu(nghiepVu, ngayNhapXuat);
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

          const chiTietResponse = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
          const oldChiTiet = chiTietResponse.filter(item => item['SOPHIEU'] === originalSoPhieu);

          if (oldChiTiet.length > 0) {
            const rowsToDelete = oldChiTiet.map(item => ({ "ID_CT": item['ID_CT'] }));
            await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Delete', {
              "Rows": rowsToDelete
            });
          }

          await authUtils.apiRequestKHO('XUATNHAPKHO', 'Delete', {
            "Rows": [{ "SOPHIEU": originalSoPhieu }]
          });

          await authUtils.apiRequestKHO('XUATNHAPKHO', 'Add', {
            "Rows": [phieuToSave]
          });

          const chiTietToSave = chiTietList.map(chiTiet => ({
            ...chiTiet,
            'SOPHIEU': phieuToSave['SOPHIEU']
          }));

          await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Add', {
            "Rows": chiTietToSave
          });

          toast.success('Cập nhật phiếu thành công!');
        } else {
          await authUtils.apiRequestKHO('XUATNHAPKHO', 'Edit', {
            "Rows": [phieuToSave]
          });

          const chiTietResponse = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
          const oldChiTiet = chiTietResponse.filter(item => item['SOPHIEU'] === phieuToSave['SOPHIEU']);

          if (oldChiTiet.length > 0) {
            const rowsToDelete = oldChiTiet.map(item => ({ "ID_CT": item['ID_CT'] }));
            await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Delete', {
              "Rows": rowsToDelete
            });
          }

          await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Add', {
            "Rows": chiTietList
          });

          toast.success('Cập nhật phiếu thành công!');
        }
      } else {
        const existingPhieu = phieuList.find(
          p => p['SOPHIEU'] === phieuToSave['SOPHIEU']
        );

        if (existingPhieu) {
          toast.error('Số phiếu này đã tồn tại!');
          setIsSubmitting(false);
          return;
        }

        await authUtils.apiRequestKHO('XUATNHAPKHO', 'Add', {
          "Rows": [phieuToSave]
        });

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
      const chiTietResponse = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
      const chiTietOfPhieu = chiTietResponse.filter(item => item['SOPHIEU'] === phieuToDelete['SOPHIEU']);

      if (chiTietOfPhieu.length > 0) {
        const rowsToDelete = chiTietOfPhieu.map(item => ({ "ID_CT": item['ID_CT'] }));
        await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Delete', {
          "Rows": rowsToDelete
        });
      }

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
    await fetchKhoList();
    await fetchDMHH();
    await fetchTonKho();
    await fetchTieuChuan();
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
                <span className="hidden sm:inline">Bộ lọc</span>
              </button>
              <button
                onClick={() => setShowTieuChuanModal(true)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Tiêu chuẩn</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo phiếu</span>
              </button>
            </div>
          </div>

          {/* Statistics Cards - Compact Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-3">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Phiếu nhập</p>
                  <p className="text-xl md:text-2xl font-bold text-green-700 mt-1">{tongNhap}</p>
                </div>
                <div className="p-2 bg-green-200 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Phiếu xuất</p>
                  <p className="text-xl md:text-2xl font-bold text-red-700 mt-1">{tongXuat}</p>
                </div>
                <div className="p-2 bg-red-200 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">KL Nhập (m³)</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-700 mt-1">{tongKhoiLuongNhap.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-blue-200 rounded-lg">
                  <Weight className="w-5 h-5 text-blue-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-lg border border-yellow-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Doanh thu</p>
                  <p className="text-lg md:text-xl font-bold text-yellow-700 mt-1">{formatCurrency(tongTienXuat)}</p>
                </div>
                <div className="p-2 bg-yellow-200 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section - Collapsible */}
          {showFilters && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nghiệp vụ</label>
                  <select
                    value={filterNghiepVu}
                    onChange={(e) => setFilterNghiepVu(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="ALL">Tất cả</option>
                    <option value="NHAP">Nhập kho</option>
                    <option value="XUAT">Xuất kho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Khách hàng</label>
                  <select
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="ALL">Tất cả</option>
                    {uniqueCustomers.map((customer, index) => (
                      <option key={index} value={customer}>{customer}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    setFilterNghiepVu('ALL');
                    setFilterCustomer('ALL');
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

          {/* Search Bar - Compact */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo số phiếu, khách hàng, người phụ trách..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Table Section - Responsive with 3:7 Layout */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-purple-300 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Không tìm thấy phiếu nào</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900 cursor-pointer hover:bg-purple-200 transition-colors"
                      onClick={() => requestSort('SOPHIEU')}>
                      Số phiếu {getSortIcon('SOPHIEU')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900 cursor-pointer hover:bg-purple-200 transition-colors"
                      onClick={() => requestSort('NGHIEP_VU')}>
                      Nghiệp vụ {getSortIcon('NGHIEP_VU')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900 cursor-pointer hover:bg-purple-200 transition-colors"
                      onClick={() => requestSort('NGAYNHAP_XUAT')}>
                      Ngày {getSortIcon('NGAYNHAP_XUAT')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900">
                      Khách hàng/NCC
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900">
                      Kho
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900">
                      Người phụ trách
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-purple-900 cursor-pointer hover:bg-purple-200 transition-colors"
                      onClick={() => requestSort('TONGKHOILUONG')}>
                      KL (m³) {getSortIcon('TONGKHOILUONG')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-purple-900 cursor-pointer hover:bg-purple-200 transition-colors"
                      onClick={() => requestSort('TONGTIEN')}>
                      Tổng tiền {getSortIcon('TONGTIEN')}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-purple-900">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {currentItems.map((phieu, index) => (
                    <tr key={index} className="hover:bg-purple-50 transition-colors">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">
                        {phieu['SOPHIEU']}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${phieu['NGHIEP_VU'] === 'NHAP'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {phieu['NGHIEP_VU'] === 'NHAP' ? 'Nhập' : 'Xuất'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {formatDate(phieu['NGAYNHAP_XUAT'])}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {phieu['NCC_KHACHHANG'] || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {phieu['NGHIEP_VU'] === 'NHAP' ? phieu['KHONHAP'] : phieu['KHOXUAT']}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {phieu['NGUOIPHUTRACH'] || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-medium text-gray-900">
                        {parseFloat(phieu['TONGKHOILUONG'] || 0).toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-medium text-gray-900">
                        {formatCurrency(phieu['TONGTIEN'])}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDetailModal(phieu)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintPhieu(phieu)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="In phiếu"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(phieu)}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteConfirmation(phieu)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination - Compact */}
          {filteredPhieuList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Hiển thị</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs text-gray-600">
                  / {filteredPhieuList.length} phiếu
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
                          ? 'bg-purple-500 text-white font-medium'
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

      {/* Modal Tạo/Sửa Phiếu - Layout 3:7 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
              <h2 className="text-lg md:text-xl font-bold text-purple-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {isEditMode ? 'Sửa Phiếu' : 'Tạo Phiếu Mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="p-1.5 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Body - Grid Layout 3:7 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
                {/* Left Column - 30% (3/10) - Thông tin phiếu */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-3 text-sm flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Thông tin phiếu
                    </h3>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Số phiếu <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={currentPhieu['SOPHIEU']}
                          onChange={(e) => handleInputChange('SOPHIEU', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 font-medium"
                          placeholder="Tự động tạo"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nghiệp vụ <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={currentPhieu['NGHIEP_VU']}
                          onChange={(e) => handleInputChange('NGHIEP_VU', e.target.value)}
                          disabled={isSubmitting || isEditMode}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                        >
                          <option value="NHAP">Nhập kho</option>
                          <option value="XUAT">Xuất kho</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Ngày nhập/xuất <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={currentPhieu['NGAYNHAP_XUAT']}
                          onChange={(e) => handleInputChange('NGAYNHAP_XUAT', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'Nhà cung cấp' : 'Khách hàng'}
                        </label>
                        <div className="relative" ref={customerDropdownRef}>
                          <input
                            type="text"
                            value={customerSearchTerm}
                            onChange={(e) => handleCustomerInputChange(e.target.value)}
                            onFocus={() => setShowCustomerDropdown(true)}
                            disabled={isSubmitting}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                            placeholder="Nhập để tìm kiếm..."
                          />
                          {showCustomerDropdown && filteredCustomers.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredCustomers.map((customer, index) => (
                                <div
                                  key={index}
                                  onClick={() => handleSelectCustomer(customer)}
                                  className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">{customer['TEN_KHACHHANG']}</div>
                                  <div className="text-xs text-gray-500">{customer['MA_KH']}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Kho nhập <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={currentPhieu['KHONHAP']}
                            onChange={(e) => handleInputChange('KHONHAP', e.target.value)}
                            disabled={isSubmitting}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                          >
                            <option value="">-- Chọn kho --</option>
                            {khoList.map((kho, index) => (
                              <option key={index} value={kho['KHO']}>
                                {kho['KHO']}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Kho xuất <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={currentPhieu['KHOXUAT']}
                            onChange={(e) => handleInputChange('KHOXUAT', e.target.value)}
                            disabled={isSubmitting}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                          >
                            <option value="">-- Chọn kho --</option>
                            {khoList.map((kho, index) => (
                              <option key={index} value={kho['KHO']}>
                                {kho['KHO']}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Người phụ trách
                        </label>
                        <input
                          type="text"
                          value={currentPhieu['NGUOIPHUTRACH']}
                          onChange={(e) => handleInputChange('NGUOIPHUTRACH', e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                          placeholder="Nhập tên người phụ trách"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Diễn giải
                        </label>
                        <textarea
                          value={currentPhieu['DIENGIAI']}
                          onChange={(e) => handleInputChange('DIENGIAI', e.target.value)}
                          disabled={isSubmitting}
                          rows={3}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 resize-none"
                          placeholder="Ghi chú thêm..."
                        />
                      </div>

                      {/* Summary */}
                      <div className="bg-white p-2.5 rounded-lg border border-purple-300 mt-3">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-gray-600">Tổng khối lượng:</span>
                          <span className="font-bold text-purple-900">
                            {parseFloat(currentPhieu['TONGKHOILUONG'] || 0).toFixed(3)} m³
                          </span>
                        </div>
                        {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                          <div className="flex justify-between items-center text-xs pt-1.5 border-t border-purple-200">
                            <span className="text-gray-600">Tổng tiền:</span>
                            <span className="font-bold text-purple-900">
                              {formatCurrency(currentPhieu['TONGTIEN'])}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - 70% (7/10) - Chi tiết phiếu */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3 text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Chi tiết phiếu ({chiTietList.length} kiện)
                    </h3>

                    {/* Form thêm chi tiết */}
                    {currentPhieu['NGHIEP_VU'] === 'NHAP' ? (
                      <div className="bg-white p-3 rounded-lg border border-blue-300 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                          <div className="relative" ref={nhomHangDropdownRef}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Nhóm hàng <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={nhomHangSearchTerm}
                              onChange={(e) => handleNhomHangInputChange(e.target.value)}
                              onFocus={() => setShowNhomHangDropdown(true)}
                              disabled={isSubmitting}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                              placeholder="Chọn nhóm hàng..."
                            />
                            {showNhomHangDropdown && filteredNhomHang.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredNhomHang.map((item, index) => (
                                  <div
                                    key={index}
                                    onClick={() => handleSelectNhomHang(item['NHOM_HANG'])}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{item['NHOM_HANG']}</div>
                                    <div className="text-xs text-gray-500">
                                      {item['DAY']}x{item['RONG']}x{item['DAI']}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Tiêu chuẩn <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={currentChiTiet['TIEU_CHUAN']}
                              onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'TIEU_CHUAN': e.target.value }))}
                              disabled={isSubmitting}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                            >
                              <option value="">-- Chọn --</option>
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
                              onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'DOI_HANG_KHO': e.target.value }))}
                              disabled={isSubmitting}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                              placeholder="Nhập đội hàng khô"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Số kiện <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={currentChiTiet['SO_KIEN']}
                              onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'SO_KIEN': e.target.value }))}
                              disabled={isSubmitting}
                              min="1"
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                              placeholder="Nhập số kiện"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              onClick={handleAddChiTietNhap}
                              disabled={isSubmitting}
                              className="w-full px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                              <Plus className="w-4 h-4" />
                              Thêm
                            </button>
                          </div>
                        </div>

                        {selectedNhomHangInfo && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 text-xs text-blue-800">
                            <strong>Thông tin:</strong> {selectedNhomHangInfo['NHOM_HANG']} -
                            Kích thước: {selectedNhomHangInfo['DAY']}x{selectedNhomHangInfo['RONG']}x{selectedNhomHangInfo['DAI']}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-lg border border-blue-300 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="relative" ref={nhomHangDropdownRef}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Nhóm hàng <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={nhomHangSearchTerm}
                              onChange={(e) => handleNhomHangInputChange(e.target.value)}
                              onFocus={() => setShowNhomHangDropdown(true)}
                              disabled={isSubmitting || !currentPhieu['KHOXUAT']}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                              placeholder={currentPhieu['KHOXUAT'] ? "Chọn nhóm hàng..." : "Chọn kho xuất trước"}
                            />
                            {showNhomHangDropdown && filteredNhomHang.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredNhomHang.map((item, index) => (
                                  <div
                                    key={index}
                                    onClick={() => handleSelectNhomHang(item['NHOM_HANG'])}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{item['NHOM_HANG']}</div>
                                    <div className="text-xs text-gray-500">
                                      {item['DAY']}x{item['RONG']}x{item['DAI']} - Giá: {formatCurrency(item['DONGIA_HIEULUC'])}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Đơn giá
                            </label>
                            <input
                              type="number"
                              value={currentChiTiet['DONGIA']}
                              onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'DONGIA': e.target.value }))}
                              disabled={isSubmitting}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                              placeholder="Đơn giá"
                            />
                          </div>

                          <div className="flex items-end">
                            <div className="text-xs text-gray-600 w-full">
                              {availableKien.length > 0 ? (
                                <span className="text-green-600 font-medium">
                                  {availableKien.length} kiện có sẵn
                                </span>
                              ) : (
                                <span className="text-orange-600">
                                  Chọn nhóm hàng để xem kiện
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {availableKien.length > 0 && (
                          <div className="mt-2 max-h-32 overflow-y-auto border border-blue-200 rounded-lg">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 p-2">
                              {availableKien.map((kien, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSelectKien(kien)}
                                  disabled={isSubmitting}
                                  className="px-2 py-1.5 text-xs bg-white border border-blue-300 rounded hover:bg-blue-50 hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                                >
                                  <div className="font-medium text-blue-900">{kien['MA_KIEN']}</div>
                                  <div className="text-gray-600">{parseFloat(kien['SO_KHOI'] || 0).toFixed(3)} m³</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Danh sách chi tiết */}
                    <div className="overflow-x-auto rounded-lg border border-blue-300">
                      {chiTietList.length === 0 ? (
                        <div className="text-center py-8 bg-white">
                          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Chưa có chi tiết nào</p>
                        </div>
                      ) : (
                        <table className="w-full text-xs bg-white">
                          <thead className="bg-blue-100 border-b border-blue-300">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-semibold text-blue-900">STT</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-blue-900">Mã kiện</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-blue-900">Nhóm hàng</th>
                              <th className="px-2 py-1.5 text-center font-semibold text-blue-900">Dày</th>
                              <th className="px-2 py-1.5 text-center font-semibold text-blue-900">Rộng</th>
                              <th className="px-2 py-1.5 text-center font-semibold text-blue-900">Dài</th>
                              {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                                <th className="px-2 py-1.5 text-center font-semibold text-blue-900">Thanh</th>
                              )}
                              <th className="px-2 py-1.5 text-right font-semibold text-blue-900">Số khối</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-blue-900">Tiêu chuẩn</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-blue-900">Đội hàng khô</th>
                              {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                                <>
                                  <th className="px-2 py-1.5 text-right font-semibold text-blue-900">Đơn giá</th>
                                  <th className="px-2 py-1.5 text-right font-semibold text-blue-900">Thành tiền</th>
                                </>
                              )}
                              <th className="px-2 py-1.5 text-center font-semibold text-blue-900">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {chiTietList.map((item, index) => (
                              <tr key={index} className="hover:bg-blue-50 transition-colors">
                                <td className="px-2 py-1.5">{index + 1}</td>
                                <td className="px-2 py-1.5 font-medium text-gray-900">{item['MA_KIEN']}</td>
                                <td className="px-2 py-1.5 text-gray-700">{item['NHOM_HANG']}</td>
                                <td className="px-2 py-1.5 text-center text-gray-700">{item['DAY']}</td>
                                <td className="px-2 py-1.5 text-center text-gray-700">{item['RONG']}</td>
                                <td className="px-2 py-1.5 text-center text-gray-700">{item['DAI']}</td>
                                {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="number"
                                      value={item['THANH']}
                                      onChange={(e) => handleUpdateChiTietField(index, 'THANH', e.target.value)}
                                      disabled={isSubmitting}
                                      className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center"
                                      min="0"
                                      step="1"
                                    />
                                  </td>
                                )}
                                <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                                  {parseFloat(item['SO_KHOI'] || 0).toFixed(4)}
                                </td>
                                <td className="px-2 py-1.5 text-gray-700">{item['TIEU_CHUAN']}</td>
                                {currentPhieu['NGHIEP_VU'] === 'NHAP' ? (
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="text"
                                      value={item['DOI_HANG_KHO'] || ''}
                                      onChange={(e) => handleUpdateChiTietField(index, 'DOI_HANG_KHO', e.target.value)}
                                      disabled={isSubmitting}
                                      className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Đội hàng khô"
                                    />
                                  </td>
                                ) : (
                                  <td className="px-2 py-1.5 text-gray-700">{item['DOI_HANG_KHO'] || '-'}</td>
                                )}
                                {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                                  <>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={item['DONGIA']}
                                        onChange={(e) => handleUpdateDonGia(index, e.target.value)}
                                        disabled={isSubmitting}
                                        className="w-24 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-right"
                                        min="0"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                                      {formatCurrency(item['THANHTIEN'])}
                                    </td>
                                  </>
                                )}
                                <td className="px-2 py-1.5 text-center">
                                  <button
                                    onClick={() => handleRemoveChiTiet(index)}
                                    disabled={isSubmitting}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                    title="Xóa"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleSavePhieu}
                disabled={isSubmitting || chiTietList.length === 0}
                className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditMode ? 'Cập nhật' : 'Lưu phiếu'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <h2 className="text-lg md:text-xl font-bold text-blue-900 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Chi Tiết Phiếu - {currentPhieu['SOPHIEU']}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 text-sm">Thông tin chung</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Số phiếu:</span>
                      <span className="font-medium text-gray-900">{currentPhieu['SOPHIEU']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nghiệp vụ:</span>
                      <span className={`font-medium ${currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'text-green-700' : 'text-red-700'}`}>
                        {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'Nhập kho' : 'Xuất kho'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ngày:</span>
                      <span className="font-medium text-gray-900">{formatDate(currentPhieu['NGAYNHAP_XUAT'])}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'NCC' : 'Khách hàng'}:</span>
                      <span className="font-medium text-gray-900">{currentPhieu['NCC_KHACHHANG'] || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2 text-sm">Thông tin kho</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kho:</span>
                      <span className="font-medium text-gray-900">
                        {currentPhieu['NGHIEP_VU'] === 'NHAP' ? currentPhieu['KHONHAP'] : currentPhieu['KHOXUAT']}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Người phụ trách:</span>
                      <span className="font-medium text-gray-900">{currentPhieu['NGUOIPHUTRACH'] || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tổng KL:</span>
                      <span className="font-medium text-gray-900">{parseFloat(currentPhieu['TONGKHOILUONG'] || 0).toFixed(3)} m³</span>
                    </div>
                    {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tổng tiền:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(currentPhieu['TONGTIEN'])}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {currentPhieu['DIENGIAI'] && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4">
                  <h3 className="font-semibold text-yellow-900 mb-1 text-sm">Diễn giải</h3>
                  <p className="text-xs text-gray-700">{currentPhieu['DIENGIAI']}</p>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Danh sách chi tiết ({chiTietList.length} kiện)</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-300">
                  <table className="w-full text-xs bg-white">
                    <thead className="bg-gray-100 border-b border-gray-300">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900">STT</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900">Mã kiện</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900">Nhóm hàng</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-900">Kích thước</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-900">Thanh</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-900">Số khối</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900">Tiêu chuẩn</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900">Đội hàng khô</th>
                        {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                          <>
                            <th className="px-2 py-1.5 text-right font-semibold text-gray-900">Đơn giá</th>
                            <th className="px-2 py-1.5 text-right font-semibold text-gray-900">Thành tiền</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {chiTietList.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 py-1.5">{index + 1}</td>
                          <td className="px-2 py-1.5 font-medium text-gray-900">{item['MA_KIEN']}</td>
                          <td className="px-2 py-1.5 text-gray-700">{item['NHOM_HANG']}</td>
                          <td className="px-2 py-1.5 text-center text-gray-700">
                            {item['DAY']}x{item['RONG']}x{item['DAI']}
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-700">{item['THANH'] || '-'}</td>
                          <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                            {parseFloat(item['SO_KHOI'] || 0).toFixed(4)}
                          </td>
                          <td className="px-2 py-1.5 text-gray-700">{item['TIEU_CHUAN']}</td>
                          <td className="px-2 py-1.5 text-gray-700">{item['DOI_HANG_KHO'] || '-'}</td>
                          {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                            <>
                              <td className="px-2 py-1.5 text-right text-gray-700">
                                {formatCurrency(item['DONGIA'])}
                              </td>
                              <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                                {formatCurrency(item['THANHTIEN'])}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => handlePrintPhieu(currentPhieu)}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                In phiếu
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản Lý Tiêu Chuẩn */}
      {showTieuChuanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <h2 className="text-lg md:text-xl font-bold text-blue-900 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Quản Lý Tiêu Chuẩn
              </h2>
              <button
                onClick={() => setShowTieuChuanModal(false)}
                className="p-1.5 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2 text-sm">Thêm tiêu chuẩn mới</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTieuChuan}
                    onChange={(e) => setNewTieuChuan(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTieuChuan()}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập tên tiêu chuẩn..."
                  />
                  <button
                    onClick={handleAddTieuChuan}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                  Danh sách tiêu chuẩn ({tieuChuanList.length})
                </h3>
                {tieuChuanList.length === 0 ? (
                  <div className="text-center py-8">
                    <Info className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Chưa có tiêu chuẩn nào</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tieuChuanList.map((tc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-700">{index + 1}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{tc['TIEU_CHUAN']}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteTieuChuan(tc['ID_TC'])}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa tiêu chuẩn"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowTieuChuanModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Đóng
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
                Xác nhận xóa phiếu
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Bạn có chắc chắn muốn xóa phiếu <strong>{phieuToDelete?.['SOPHIEU']}</strong>?
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
                  onClick={handleDeletePhieu}
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
        newestOnTop={true}
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

export default XuatNhapKhoManagement;


