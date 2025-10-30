import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, Package, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Calendar, TrendingUp, TrendingDown, DollarSign, Weight, FileText, ChevronDown, Save, Minus, AlertCircle, Eye, Printer } from 'lucide-react';
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
    'CHATLUONG': ''
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

  // Print function
  const handlePrintPhieu = async (phieu) => {
    try {
      // Load chi tiết if not already loaded
      let chiTiet = chiTietList;
      if (phieu['SOPHIEU'] !== currentPhieu['SOPHIEU']) {
        const response = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
        chiTiet = response.filter(item => item['SOPHIEU'] === phieu['SOPHIEU']);
      }

      // Format date
      const date = new Date(phieu['NGAYNHAP_XUAT']);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // Group chi tiết by DOI_HANG_KHO and specifications for summary
      const groupedByDoi = {};
      chiTiet.forEach(item => {
        const doiHangKho = item['DOI_HANG_KHO'] || 'Chưa phân đội';
        const chatLuong = item['CHATLUONG'] || '';
        const kichThuoc = `${item['DAY']}x${item['RONG']}x${item['DAI']}`;

        const key = `${doiHangKho}_${chatLuong}_${kichThuoc}`;

        if (!groupedByDoi[key]) {
          groupedByDoi[key] = {
            doiHangKho: doiHangKho,
            chatluong: chatLuong,
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

      // Sort groups by DOI_HANG_KHO
      const sortedGroups = Object.values(groupedByDoi).sort((a, b) => {
        return a.doiHangKho.localeCompare(b.doiHangKho);
      });

      // Create print content
      const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Phiếu ${phieu['NGHIEP_VU'] === 'NHAP' ? 'Nhập' : 'Xuất'} Kho - ${phieu['SOPHIEU']}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.3;
            color: #000;
          }
          
          .container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 5mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .header h1 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          
          .header .date {
            font-size: 11pt;
            font-style: italic;
          }
          
          .info-section {
            margin-bottom: 15px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          
          .info-item {
            font-size: 11pt;
            padding: 3px 0;
          }
          
          .info-item strong {
            font-weight: bold;
            min-width: 120px;
            display: inline-block;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 10pt;
          }
          
          table th {
            background-color: #f0f0f0;
            border: 1px solid #000;
            padding: 6px 4px;
            text-align: center;
            font-weight: bold;
            font-size: 9pt;
          }
          
          table td {
            border: 1px solid #000;
            padding: 5px 4px;
            text-align: center;
          }
          
          table td.left {
            text-align: left;
          }
          
          table td.right {
            text-align: right;
          }
          
          .summary-row {
            background-color: #fff3cd;
            font-weight: bold;
          }
          
          .total-section {
            margin-top: 15px;
            padding: 10px;
            background-color: #f8f9fa;
            border: 2px solid #000;
          }
          
          .total-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 12pt;
          }
          
          .total-item strong {
            font-weight: bold;
          }
          
          .signatures {
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            text-align: center;
          }
          
          .signature-box {
            padding: 10px;
          }
          
          .signature-box .title {
            font-weight: bold;
            margin-bottom: 60px;
            font-size: 11pt;
          }
          
          .signature-box .name {
            font-style: italic;
            margin-top: 5px;
          }
          
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9pt;
            font-style: italic;
            color: #666;
          }
          
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .no-print {
              display: none;
            }
            
            .page-break {
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>SỔ NHẬT KÝ - ${phieu['NGHIEP_VU'] === 'NHAP' ? 'NHẬP KHO' : 'XUẤT KHO'} THÀNH PHẨM</h1>
            <div class="date">Ngày ${day} Tháng ${month} Năm ${year}</div>
          </div>
          
          <!-- Info Section -->
          <div class="info-section">
            <div class="info-item">
              <strong>Số phiếu:</strong> ${phieu['SOPHIEU']}
            </div>
            <div class="info-item">
              <strong>Nghiệp vụ:</strong> ${phieu['NGHIEP_VU'] === 'NHAP' ? 'Nhập kho' : 'Xuất kho'}
            </div>
            <div class="info-item">
              <strong>${phieu['NGHIEP_VU'] === 'NHAP' ? 'Nhà cung cấp' : 'Khách hàng'}:</strong> ${phieu['NCC_KHACHHANG'] || ''}
            </div>
            <div class="info-item">
              <strong>Người phụ trách:</strong> ${phieu['NGUOIPHUTRACH'] || ''}
            </div>
            <div class="info-item">
              <strong>${phieu['NGHIEP_VU'] === 'NHAP' ? 'Kho nhập' : 'Kho xuất'}:</strong> ${phieu['NGHIEP_VU'] === 'NHAP' ? phieu['KHONHAP'] : phieu['KHOXUAT']}
            </div>
            ${phieu['DIENGIAI'] ? `
            <div class="info-item" style="grid-column: 1 / -1;">
              <strong>Diễn giải:</strong> ${phieu['DIENGIAI']}
            </div>
            ` : ''}
          </div>
          
          <!-- Detail Table -->
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
                <th style="width: 80px;">Tiêu chuẩn/ Chất lượng</th>
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
                  <td>${item['CHATLUONG'] || ''}</td>
                  <td></td>
                  <td>${item['DOI_HANG_KHO'] || ''}</td>
                  <td>${item['GHICHU'] || ''}</td>
                </tr>
              `).join('')}
              
              <!-- Summary rows by DOI_HANG_KHO -->
              ${sortedGroups.map(group => `
                <tr class="summary-row">
                  <td colspan="2" class="left">TỔNG CỘNG ĐỘI ${group.doiHangKho}</td>
                  <td colspan="3">Hàng ${group.day}x${group.rong}x${group.dai}</td>
                  <td>${group.soKien}</td>
                  <td class="right">${group.tongKhoi.toFixed(4)}</td>
                  <td colspan="4">${group.soKien} kiện</td>
                </tr>
              `).join('')}
              
              <!-- Grand Total -->
              <tr class="summary-row" style="background-color: #ffc107;">
                <td colspan="5" class="left"><strong>TỔNG NGÀY ${day}/${month}/${year}</strong></td>
                <td><strong>${chiTiet.length}</strong></td>
                <td class="right"><strong>${parseFloat(phieu['TONGKHOILUONG']).toFixed(4)}</strong></td>
                <td colspan="4" class="left"><strong>Tổng cộng ${chiTiet.length} kiện</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${phieu['NGHIEP_VU'] === 'XUAT' && phieu['TONGTIEN'] > 0 ? `
          <!-- Total Amount Section (for XUAT only) -->
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
          
          <!-- Signatures -->
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
          
          <!-- Footer -->
          <div class="footer">
            <p>In lúc: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            // Uncomment the line below if you want to close the window after printing
            // window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `;

      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(printContent);
      printWindow.document.close();

    } catch (error) {
      console.error('Error printing phieu:', error);
      toast.error('Có lỗi xảy ra khi in phiếu');
    }
  };


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
  const generateMaKien = () => {
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
    const newChiTietList = [];

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
                      className="w-full px-2 py-1.5 border  border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
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
                              onClick={() => handlePrintPhieu(phieu)}
                              className="text-purple-600 hover:text-purple-900 p-1 rounded-lg hover:bg-purple-100 transition-all transform hover:scale-110"
                              title="In phiếu"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
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
                      onClick={() => handlePrintPhieu(phieu)}
                      className="flex-1 text-purple-600 hover:text-purple-900 px-2 py-1.5 rounded-lg hover:bg-purple-100 transition-all flex items-center justify-center gap-1.5 text-xs font-medium"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      In
                    </button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl p-4 animate-fadeIn max-h-[98vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  {isEditMode ? <Edit className="w-5 h-5 text-purple-600" /> : <Plus className="w-5 h-5 text-purple-600" />}
                </div>
                {isEditMode ? 'Chỉnh sửa phiếu' : 'Tạo phiếu mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Thông tin phiếu */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-500" />
                  Thông tin phiếu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Số phiếu: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentPhieu['SOPHIEU']}
                      onChange={(e) => handleInputChange('SOPHIEU', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="Nhập số phiếu"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nghiệp vụ: <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={currentPhieu['NGHIEP_VU']}
                      onChange={(e) => handleInputChange('NGHIEP_VU', e.target.value)}
                      disabled={isEditMode}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white disabled:bg-gray-100"
                    >
                      <option value="NHAP">Nhập kho</option>
                      <option value="XUAT">Xuất kho</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Ngày nhập/xuất: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={currentPhieu['NGAYNHAP_XUAT']}
                      onChange={(e) => handleInputChange('NGAYNHAP_XUAT', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  <div className="relative" ref={customerDropdownRef}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'Nhà cung cấp:' : 'Khách hàng:'}
                    </label>
                    <input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => handleCustomerInputChange(e.target.value)}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="Tìm kiếm hoặc nhập tên..."
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.map((customer, index) => (
                          <div
                            key={index}
                            onClick={() => handleSelectCustomer(customer['TEN_KHACHHANG'])}
                            className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{customer['TEN_KHACHHANG']}</div>
                            <div className="text-xs text-gray-500">{customer['MA_KH']}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Kho nhập: <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentPhieu['KHONHAP']}
                        onChange={(e) => handleInputChange('KHONHAP', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                      >
                        <option value="">Chọn kho</option>
                        <option value="KHO A">Kho A</option>
                        <option value="KHO B">Kho B</option>
                        <option value="KHO C">Kho C</option>
                      </select>
                    </div>
                  )}

                  {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Kho xuất: <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentPhieu['KHOXUAT']}
                        onChange={(e) => handleInputChange('KHOXUAT', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                      >
                        <option value="">Chọn kho</option>
                        <option value="KHO A">Kho A</option>
                        <option value="KHO B">Kho B</option>
                        <option value="KHO C">Kho C</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Người phụ trách:</label>
                    <input
                      type="text"
                      value={currentPhieu['NGUOIPHUTRACH']}
                      onChange={(e) => handleInputChange('NGUOIPHUTRACH', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="Nhập tên người phụ trách"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Diễn giải:</label>
                    <textarea
                      value={currentPhieu['DIENGIAI']}
                      onChange={(e) => handleInputChange('DIENGIAI', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      rows="2"
                      placeholder="Nhập diễn giải..."
                    />
                  </div>
                </div>
              </div>

              {/* Thêm chi tiết */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-500" />
                  {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'Thêm kiện hàng' : 'Chọn kiện xuất'}
                </h3>

                {currentPhieu['NGHIEP_VU'] === 'NHAP' ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                    <div className="relative" ref={nhomHangDropdownRef}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nhóm hàng:</label>
                      <input
                        type="text"
                        value={nhomHangSearchTerm}
                        onChange={(e) => handleNhomHangInputChange(e.target.value)}
                        onFocus={() => setShowNhomHangDropdown(true)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Tìm kiếm nhóm hàng..."
                      />
                      {showNhomHangDropdown && filteredNhomHang.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredNhomHang.map((item, index) => (
                            <div
                              key={index}
                              onClick={() => handleSelectNhomHang(item['NHOM_HANG'])}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                            >
                              <div className="font-medium">{item['NHOM_HANG']}</div>
                              <div className="text-xs text-gray-500">
                                {item['DAY']}x{item['RONG']}x{item['DAI']}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Số kiện:</label>
                      <input
                        type="number"
                        value={currentChiTiet['SO_KIEN']}
                        onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'SO_KIEN': e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Nhập số kiện"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Chất lượng:</label>
                      <select
                        value={currentChiTiet['CHATLUONG']}
                        onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'CHATLUONG': e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      >
                        <option value="">Chọn chất lượng</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="AB">AB</option>
                        <option value="BC">BC</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handleAddChiTietNhap}
                        className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Thêm kiện
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="relative" ref={nhomHangDropdownRef}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nhóm hàng:</label>
                        <input
                          type="text"
                          value={nhomHangSearchTerm}
                          onChange={(e) => handleNhomHangInputChange(e.target.value)}
                          onFocus={() => setShowNhomHangDropdown(true)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Tìm kiếm nhóm hàng..."
                        />
                        {showNhomHangDropdown && filteredNhomHang.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredNhomHang.map((item, index) => (
                              <div
                                key={index}
                                onClick={() => handleSelectNhomHang(item['NHOM_HANG'])}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                              >
                                <div className="font-medium">{item['NHOM_HANG']}</div>
                                <div className="text-xs text-gray-500">
                                  {item['DAY']}x{item['RONG']}x{item['DAI']} - Đơn giá: {formatCurrency(item['DONGIA_HIEULUC'])}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Đơn giá:</label>
                        <input
                          type="number"
                          value={currentChiTiet['DONGIA']}
                          onChange={(e) => setCurrentChiTiet(prev => ({ ...prev, 'DONGIA': e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Đơn giá"
                        />
                      </div>

                      <div className="text-sm">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Kiện có sẵn:</label>
                        <div className="px-2 py-1.5 bg-gray-100 rounded-lg font-semibold text-blue-600">
                          {availableKien.length} kiện
                        </div>
                      </div>
                    </div>

                    {availableKien.length > 0 && (
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Mã kiện</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Kích thước</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Khối lượng</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Chất lượng</th>
                              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-700">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {availableKien.map((kien, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-2 py-1.5 text-xs">{kien['MA_KIEN']}</td>
                                <td className="px-2 py-1.5 text-xs">{kien['DAY']}x{kien['RONG']}x{kien['DAI']}</td>
                                <td className="px-2 py-1.5 text-xs font-medium">{parseFloat(kien['SO_KHOI']).toFixed(3)} m³</td>
                                <td className="px-2 py-1.5 text-xs">{kien['CHATLUONG']}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <button
                                    onClick={() => handleSelectKien(kien)}
                                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                                  >
                                    Chọn
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Danh sách chi tiết */}
              {chiTietList.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Danh sách chi tiết ({chiTietList.length} {currentPhieu['NGHIEP_VU'] === 'NHAP' ? 'kiện' : 'dòng'})
                  </h3>

                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">STT</th>
                          <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Nhóm hàng</th>
                          <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Mã kiện</th>
                          <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Kích thước</th>
                          <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Chất lượng</th>
                          {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                            <>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Số thanh</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Đội hàng khô</th>
                            </>
                          )}
                          <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Khối lượng (m³)</th>
                          {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                            <>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Đơn giá</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-700">Thành tiền</th>
                            </>
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
                            <td className="px-2 py-1.5 text-xs">{item['DAY']}x{item['RONG']}x{item['DAI']}</td>
                            <td className="px-2 py-1.5 text-xs">
                              {item['CHATLUONG'] ? (
                                <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                                  {item['CHATLUONG']}
                                </span>
                              ) : '—'}
                            </td>
                            {currentPhieu['NGHIEP_VU'] === 'NHAP' && (
                              <>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="number"
                                    value={item['THANH']}
                                    onChange={(e) => handleUpdateChiTietField(index, 'THANH', e.target.value)}
                                    className="w-20 px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Thanh"
                                    min="0"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    value={item['DOI_HANG_KHO']}
                                    onChange={(e) => handleUpdateChiTietField(index, 'DOI_HANG_KHO', e.target.value)}
                                    className="w-24 px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Đội"
                                  />
                                </td>
                              </>
                            )}
                            <td className="px-2 py-1.5 text-xs font-medium">{parseFloat(item['SO_KHOI'] || 0).toFixed(3)}</td>
                            {currentPhieu['NGHIEP_VU'] === 'XUAT' && (
                              <>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="number"
                                    value={item['DONGIA']}
                                    onChange={(e) => handleUpdateDonGia(index, e.target.value)}
                                    className="w-24 px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Đơn giá"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-xs font-bold text-green-600">{formatCurrency(item['THANHTIEN'])}</td>
                              </>
                            )}
                            <td className="px-2 py-1.5 text-center">
                              <button
                                onClick={() => handleRemoveChiTiet(index)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Tổng kết */}
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
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all flex items-center gap-1.5 text-sm font-medium"
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
                Hủy
              </button>
              <button
                onClick={handleSavePhieu}
                disabled={isSubmitting || chiTietList.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? 'Cập nhật' : 'Lưu phiếu'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintPhieu(currentPhieu)}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-1.5 text-sm font-medium shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  In phiếu
                </button>
                <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
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
                  <div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && phieuToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Xác nhận xóa</h3>
                <p className="text-sm text-gray-600">Bạn có chắc chắn muốn xóa phiếu này?</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Số phiếu:</span>
                  <span className="font-semibold text-gray-900">{phieuToDelete['SOPHIEU']}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nghiệp vụ:</span>
                  <span className="font-semibold text-gray-900">
                    {phieuToDelete['NGHIEP_VU'] === 'NHAP' ? 'Nhập kho' : 'Xuất kho'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày:</span>
                  <span className="font-semibold text-gray-900">{formatDate(phieuToDelete['NGAYNHAP_XUAT'])}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">NCC/KH:</span>
                  <span className="font-semibold text-gray-900">{phieuToDelete['NCC_KHACHHANG']}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800">
                  <strong>Cảnh báo:</strong> Hành động này sẽ xóa vĩnh viễn phiếu và tất cả chi tiết liên quan. Không thể hoàn tác!
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCloseDeleteConfirmation}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all text-sm font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleDeletePhieu}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <Trash className="h-4 w-4" />
                Xóa phiếu
              </button>
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
        
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default XuatNhapKhoManagement;

