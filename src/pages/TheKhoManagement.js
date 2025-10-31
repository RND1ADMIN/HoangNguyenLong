import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Package, Printer, Download, QrCode, Tag, Calendar, User, Ruler, Weight } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import Barcode from 'react-barcode';

const TheKhoManagement = () => {
  const [kienList, setKienList] = useState([]);
  const [filteredKienList, setFilteredKienList] = useState([]);
  const [selectedKien, setSelectedKien] = useState([]);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filter states
  const [filterKho, setFilterKho] = useState('ALL');
  const [filterChatLuong, setFilterChatLuong] = useState('ALL');
  const [filterNhomHang, setFilterNhomHang] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Company info (có thể chỉnh sửa)
  const companyInfo = {
    name: 'CÔNG TY TNHH HOÀNG NGUYÊN LONG',
    address: 'Địa chỉ: Ấp Kinh Nhượng, Xã Vịnh Hòa, Huyện Phú Giáo,Bình Dương',
    phone: 'ĐT: 0123 456 789',
    logo: '/logo1.png' // Đường dẫn đến logo
  };

  // Fetch data
  const fetchKienList = async () => {
    try {
      setIsLoading(true);
      const response = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
      // Chỉ lấy các kiện đã nhập kho
      const kienNhap = response.filter(item => item['NGHIEP_VU'] === 'NHAP');
      setKienList(kienNhap);
      setFilteredKienList(kienNhap);
    } catch (error) {
      console.error('Error fetching kien list:', error);
      toast.error('Lỗi khi tải danh sách kiện');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKienList();
  }, []);

  // Filter logic
  useEffect(() => {
    let filtered = [...kienList];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(kien =>
        kien['MA_KIEN']?.toLowerCase().includes(searchLower) ||
        kien['NHOM_HANG']?.toLowerCase().includes(searchLower) ||
        kien['DOI_HANG_KHO']?.toLowerCase().includes(searchLower)
      );
    }

    // Kho filter
    if (filterKho !== 'ALL') {
      filtered = filtered.filter(kien => kien['KHO_NHAP'] === filterKho);
    }

    // Chat luong filter
    if (filterChatLuong !== 'ALL') {
      filtered = filtered.filter(kien => kien['CHATLUONG'] === filterChatLuong);
    }

    // Nhom hang filter
    if (filterNhomHang !== 'ALL') {
      filtered = filtered.filter(kien => kien['NHOM_HANG'] === filterNhomHang);
    }

    // Date range filter
    if (filterDateFrom || filterDateTo) {
      filtered = filtered.filter(kien => {
        const kienDate = new Date(kien['NGAY_NHAP_XUAT']);
        let match = true;
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          match = match && kienDate >= fromDate;
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          match = match && kienDate <= toDate;
        }
        return match;
      });
    }

    setFilteredKienList(filtered);
  }, [search, filterKho, filterChatLuong, filterNhomHang, filterDateFrom, filterDateTo, kienList]);

  // Get unique values for filters
  const uniqueKho = [...new Set(kienList.map(k => k['KHO_NHAP']).filter(Boolean))];
  const uniqueChatLuong = [...new Set(kienList.map(k => k['CHATLUONG']).filter(Boolean))];
  const uniqueNhomHang = [...new Set(kienList.map(k => k['NHOM_HANG']).filter(Boolean))];

  // Handle selection
  const handleSelectKien = (kien) => {
    const isSelected = selectedKien.find(k => k['ID_CT'] === kien['ID_CT']);
    if (isSelected) {
      setSelectedKien(selectedKien.filter(k => k['ID_CT'] !== kien['ID_CT']));
    } else {
      setSelectedKien([...selectedKien, kien]);
    }
  };

  const handleSelectAll = () => {
    if (selectedKien.length === filteredKienList.length) {
      setSelectedKien([]);
    } else {
      setSelectedKien([...filteredKienList]);
    }
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

  // Print single tag
  const handlePrintSingleTag = (kien) => {
    printTags([kien]);
  };

  // Print selected tags
  const handlePrintSelectedTags = () => {
    if (selectedKien.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một kiện để in');
      return;
    }
    printTags(selectedKien);
  };

  // Print all filtered tags
  const handlePrintAllTags = () => {
    if (filteredKienList.length === 0) {
      toast.warning('Không có kiện nào để in');
      return;
    }
    printTags(filteredKienList);
  };

  // Main print function
  const printTags = (kienArray) => {
    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>In Thẻ Kho</title>
      <style>
        @page {
          size: 100mm 150mm;
          margin: 0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          background: white;
        }
        
        .tag-container {
          width: 100mm;
          height: 150mm;
          page-break-after: always;
          page-break-inside: avoid;
          position: relative;
          border: 2px solid #000;
          padding: 5mm;
          display: flex;
          flex-direction: column;
          background: white;
          overflow: hidden;
        }
        
        .tag-container:last-child {
          page-break-after: auto;
        }
        
        /* Watermark logo */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.08;
          z-index: 0;
          width: 55mm;
          height: 55mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .watermark img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        /* Content */
        .tag-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        /* Header */
        .tag-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 2mm;
          margin-bottom: 2mm;
        }
        
        .header-logo {
          width: 20mm;
          height: auto;
          margin: 0 auto 1mm;
          display: block;
        }
        
        .company-name {
          font-size: 9pt;
          font-weight: bold;
          margin-bottom: 0.5mm;
          text-transform: uppercase;
          color: #0066cc;
          line-height: 1.1;
        }
        
        .company-address {
          font-size: 6pt;
          margin-bottom: 0.3mm;
          color: #333;
          line-height: 1.2;
        }
        
        .company-phone {
          font-size: 6pt;
          margin-bottom: 1mm;
          color: #333;
        }
        
        .tag-title {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 1mm;
          letter-spacing: 2px;
          color: #0066cc;
        }
        
        /* Barcode section */
        .barcode-section {
          text-align: center;
          margin: 2mm 0;
          padding: 1.5mm 0;
          border-top: 1px dashed #666;
          border-bottom: 1px dashed #666;
          background: linear-gradient(to right, #f8f9fa, #ffffff, #f8f9fa);
        }
        
        .barcode-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 18mm;
        }
        
        .ma-kien-text {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 1mm;
          letter-spacing: 1px;
          color: #000;
        }
        
        /* Info section */
        .info-section {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.8mm;
          margin-bottom: 2mm;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 1mm 1.5mm;
          border-bottom: 1px solid #e0e0e0;
          font-size: 8pt;
          background: #fafafa;
          line-height: 1.2;
        }
        
        .info-row:nth-child(even) {
          background: #ffffff;
        }
        
        .info-row:last-child {
          border-bottom: none;
        }
        
        .info-label {
          font-weight: bold;
          color: #555;
          min-width: 25mm;
        }
        
        .info-value {
          font-weight: bold;
          color: #000;
          text-align: right;
          flex: 1;
        }
        
        /* Size section */
        .size-section {
          flex: 0 0 auto;
          margin-top: auto;
          padding: 1.5mm;
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border: 2px solid #0066cc;
          border-radius: 1.5mm;
        }
        
        .size-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5mm;
          margin-bottom: 1.5mm;
        }
        
        .size-item {
          display: flex;
          justify-content: space-between;
          font-size: 9pt;
          padding: 0.8mm;
          background: white;
          border-radius: 1mm;
          line-height: 1.2;
        }
        
        .size-label {
          font-weight: bold;
          color: #0066cc;
        }
        
        .size-value {
          font-weight: bold;
          color: #d32f2f;
        }
        
        .total-volume {
          padding: 1.5mm;
          background: white;
          border-radius: 1mm;
          border: 1px solid #0066cc;
        }
        
        .total-volume-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        /* Footer */
        .tag-footer {
          flex: 0 0 auto;
          margin-top: 2mm;
          padding-top: 1.5mm;
          border-top: 1px solid #000;
          text-align: center;
          font-size: 6pt;
          color: #666;
          line-height: 1.3;
        }
        
        .footer-company {
          margin-top: 0.5mm;
          font-weight: bold;
          color: #0066cc;
          font-size: 7pt;
        }
        
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .tag-container {
            page-break-inside: avoid !important;
          }
          
          @page {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      ${kienArray.map(kien => `
        <div class="tag-container">
          <!-- Watermark -->
          <div class="watermark">
            <img src="${window.location.origin}/logo1.png" alt="Logo" />
          </div>
          
          <!-- Content -->
          <div class="tag-content">
            <!-- Header -->
            <div class="tag-header">
              <img src="${window.location.origin}/logo1.png" alt="Logo" class="header-logo" />
              <div class="company-name">${companyInfo.name}</div>
              <div class="company-address">${companyInfo.address}</div>
              <div class="company-phone">${companyInfo.phone}</div>
              <div class="tag-title">THẺ KHO</div>
            </div>
            
            <!-- Barcode Section -->
            <div class="barcode-section">
              <div class="barcode-wrapper">
                <svg id="barcode-${kien['MA_KIEN']}"></svg>
              </div>
              <div class="ma-kien-text">${kien['MA_KIEN']}</div>
            </div>
            
            <!-- Info Section -->
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">📅 Ngày nhập:</span>
                <span class="info-value">${formatDate(kien['NGAY_NHAP_XUAT'])}</span>
              </div>
              <div class="info-row">
                <span class="info-label">⭐ Chất lượng:</span>
                <span class="info-value">${kien['CHATLUONG'] || '—'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📦 Nhóm hàng:</span>
                <span class="info-value">${kien['NHOM_HANG'] || '—'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">👷 Đội hàng khô:</span>
                <span class="info-value">${kien['DOI_HANG_KHO'] || '—'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">🏢 Kho:</span>
                <span class="info-value">${kien['KHO_NHAP'] || '—'}</span>
              </div>
            </div>
            
            <!-- Size Section -->
            <div class="size-section">
              <div class="size-grid">
                <div class="size-item">
                  <span class="size-label">Dày:</span>
                  <span class="size-value">${kien['DAY']} mm</span>
                </div>
                <div class="size-item">
                  <span class="size-label">Rộng:</span>
                  <span class="size-value">${kien['RONG']} mm</span>
                </div>
                <div class="size-item">
                  <span class="size-label">Dài:</span>
                  <span class="size-value">${kien['DAI']} mm</span>
                </div>
                <div class="size-item">
                  <span class="size-label">Số thanh:</span>
                  <span class="size-value">${kien['THANH'] || '—'}</span>
                </div>
              </div>
              <div class="total-volume">
                <div class="total-volume-inner">
                  <span class="size-label" style="font-size: 10pt;">📊 Khối lượng:</span>
                  <span class="size-value" style="font-size: 11pt;">${parseFloat(kien['SO_KHOI'] || 0).toFixed(4)} m³</span>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="tag-footer">
              <div>In lúc: ${new Date().toLocaleString('vi-VN')}</div>
              <div class="footer-company">HOÀNG NGUYÊN LONG</div>
            </div>
          </div>
        </div>
      `).join('')}
      
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() {
          ${kienArray.map(kien => `
            try {
              JsBarcode("#barcode-${kien['MA_KIEN']}", "${kien['MA_KIEN']}", {
                format: "CODE128",
                width: 1.8,
                height: 45,
                displayValue: false,
                margin: 3
              });
            } catch(e) {
              console.error('Barcode error:', e);
            }
          `).join('\n')}
          
          setTimeout(function() {
            window.print();
          }, 500);
        }
      </script>
    </body>
    </html>
  `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <div className="p-3 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 border border-gray-100">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Quản Lý Thẻ Kho</h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">In thẻ tag cho mã kiện</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm ${showFilters
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
              </button>
              {selectedKien.length > 0 && (
                <button
                  onClick={handlePrintSelectedTags}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  In đã chọn ({selectedKien.length})
                </button>
              )}
              <button
                onClick={handlePrintAllTags}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                In tất cả ({filteredKienList.length})
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mb-3 space-y-3 animate-fadeIn">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã kiện, nhóm hàng, đội hàng khô..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  Bộ lọc nâng cao:
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Kho:</label>
                    <select
                      value={filterKho}
                      onChange={(e) => setFilterKho(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="ALL">Tất cả</option>
                      {uniqueKho.map((kho, index) => (
                        <option key={index} value={kho}>{kho}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Chất lượng:</label>
                    <select
                      value={filterChatLuong}
                      onChange={(e) => setFilterChatLuong(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="ALL">Tất cả</option>
                      {uniqueChatLuong.map((cl, index) => (
                        <option key={index} value={cl}>{cl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nhóm hàng:</label>
                    <select
                      value={filterNhomHang}
                      onChange={(e) => setFilterNhomHang(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="ALL">Tất cả</option>
                      {uniqueNhomHang.map((nh, index) => (
                        <option key={index} value={nh}>{nh}</option>
                      ))}
                    </select>
                  </div>

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
                </div>

                {(filterKho !== 'ALL' || filterChatLuong !== 'ALL' || filterNhomHang !== 'ALL' || filterDateFrom || filterDateTo) && (
                  <button
                    onClick={() => {
                      setFilterKho('ALL');
                      setFilterChatLuong('ALL');
                      setFilterNhomHang('ALL');
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

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-blue-700 mb-0.5">Tổng kiện</h3>
                  <p className="text-2xl font-bold text-blue-900">{kienList.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-green-700 mb-0.5">Đã lọc</h3>
                  <p className="text-2xl font-bold text-green-900">{filteredKienList.length}</p>
                </div>
                <Filter className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-purple-700 mb-0.5">Đã chọn</h3>
                  <p className="text-2xl font-bold text-purple-900">{selectedKien.length}</p>
                </div>
                <Tag className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-orange-700 mb-0.5">Tổng m³</h3>
                  <p className="text-xl font-bold text-orange-900">
                    {filteredKienList.reduce((sum, k) => sum + (parseFloat(k['SO_KHOI']) || 0), 0).toFixed(2)}
                  </p>
                </div>
                <Weight className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedKien.length === filteredKienList.length && filteredKienList.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Mã kiện</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Nhóm hàng</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Kích thước</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Số thanh</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">M³</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Chất lượng</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Ngày nhập</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Kho</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredKienList.length > 0 ? (
                  filteredKienList.map((kien, index) => (
                    <tr key={kien['ID_CT']} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedKien.find(k => k['ID_CT'] === kien['ID_CT']) !== undefined}
                          onChange={() => handleSelectKien(kien)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded text-xs font-semibold">
                          {kien['MA_KIEN']}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900">{kien['NHOM_HANG']}</td>
                      <td className="px-2 py-2 text-xs text-gray-700">{kien['DAY']}x{kien['RONG']}x{kien['DAI']}</td>
                      <td className="px-2 py-2 text-xs text-gray-700">{kien['THANH'] || '—'}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900">{parseFloat(kien['SO_KHOI'] || 0).toFixed(4)}</td>
                      <td className="px-2 py-2 text-xs">
                        {kien['CHATLUONG'] ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {kien['CHATLUONG']}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-700">{formatDate(kien['NGAY_NHAP_XUAT'])}</td>
                      <td className="px-2 py-2 text-xs text-gray-700">{kien['KHO_NHAP']}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => handlePrintSingleTag(kien)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-lg hover:bg-blue-100 transition-all"
                          title="In thẻ"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Package className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-sm font-medium">Không tìm thấy kiện nào</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      `}</style>
    </div>
  );
};

export default TheKhoManagement;
