import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  FileText, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ShoppingCart, 
  Package, 
  CheckCircle, 
  Clock, 
  Eye, 
  Edit, 
  Trash, 
  X, 
  ChevronDown, 
  ChevronUp,
  Download,
  Printer
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const XuatNhapKhoManager = () => {
  const navigate = useNavigate();
  
  // State for list and filters
  const [danhSachPhieu, setDanhSachPhieu] = useState([]);
  const [filteredPhieu, setFilteredPhieu] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPhieu, setSelectedPhieu] = useState(null);
  const [selectedPhieuDetails, setSelectedPhieuDetails] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    loaiPhieu: 'ALL',
    mucDich: 'ALL',
    trangThai: 'ALL',
    tuNgay: '',
    denNgay: ''
  });

  // Fetch data on load
  useEffect(() => {
    fetchDanhSachPhieu();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, danhSachPhieu]);

  // Fetch list of documents
  const fetchDanhSachPhieu = async () => {
    setIsLoading(true);
    try {
      const response = await authUtils.apiRequest('XUATNHAPKHO', 'Find', {});
      setDanhSachPhieu(response || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Không thể tải danh sách phiếu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch details for a specific document
  const fetchPhieuDetails = async (maPhieu) => {
    try {
      const response = await authUtils.apiRequest('XUATNHAPKHO_CHITIET', 'Find', {
        Properties: {
            Selector: `Filter(XUATNHAPKHO_CHITIET, [MÃ PHIẾU] = "${maPhieu}" )`
        }
      });
      
      if (response && response.length > 0) {
        setSelectedPhieuDetails(response);
        return response;
      } else {
        setSelectedPhieuDetails([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
      toast.error('Không thể tải chi tiết phiếu.');
      return [];
    }
  };

  // Apply all filters
  const applyFilters = () => {
    let result = [...danhSachPhieu];
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(phieu => 
        phieu['MÃ PHIẾU']?.toLowerCase().includes(query) ||
        phieu['ĐỐI TÁC']?.toLowerCase().includes(query) ||
        phieu['NGƯỜI TẠO']?.toLowerCase().includes(query)
      );
    }
    
    // Apply form type filter
    if (filters.loaiPhieu !== 'ALL') {
      result = result.filter(phieu => phieu['LOẠI PHIẾU'] === filters.loaiPhieu);
    }
    
    // Apply purpose filter
    if (filters.mucDich !== 'ALL') {
      result = result.filter(phieu => phieu['MỤC ĐÍCH'] === filters.mucDich);
    }
    
    // Apply status filter
    if (filters.trangThai !== 'ALL') {
      result = result.filter(phieu => phieu['TRẠNG THÁI'] === filters.trangThai);
    }
    
    // Apply date range filter
    if (filters.tuNgay) {
      const tuNgay = new Date(filters.tuNgay);
      result = result.filter(phieu => {
        const phieuDate = new Date(phieu['NGÀY GD']);
        return phieuDate >= tuNgay;
      });
    }
    
    if (filters.denNgay) {
      const denNgay = new Date(filters.denNgay);
      denNgay.setHours(23, 59, 59); // End of day
      result = result.filter(phieu => {
        const phieuDate = new Date(phieu['NGÀY GD']);
        return phieuDate <= denNgay;
      });
    }
    
    // Sort by date, newest first
    result.sort((a, b) => {
      const dateA = new Date(a['NGÀY GD']);
      const dateB = new Date(b['NGÀY GD']);
      return dateB - dateA;
    });
    
    setFilteredPhieu(result);
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      loaiPhieu: 'ALL',
      mucDich: 'ALL',
      trangThai: 'ALL',
      tuNgay: '',
      denNgay: ''
    });
    setSearchQuery('');
  };

  // View details of a document
  const viewPhieuDetails = async (phieu) => {
    setSelectedPhieu(phieu);
    const details = await fetchPhieuDetails(phieu['MÃ PHIẾU']);
    setShowDetailModal(true);
  };

  // Handle document deletion
  const handleDeletePhieu = async (maPhieu) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu này không?')) {
      return;
    }
    
    try {
      // First delete all details
      
      
      toast.success('đang xây');
      
      // Refresh the list
      fetchDanhSachPhieu();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Không thể xóa phiếu. Vui lòng thử lại.');
    }
  };

  // Edit a document
  const handleEditPhieu = (maPhieu) => {
    navigate(`/xuatnhapfrom/${maPhieu}`);
  };

  // Create a new document
  const handleCreateNewPhieu = () => {
    navigate('/xuatnhapfrom');
  };

  // Get purpose icon
  const getPurposeIcon = (mucDich) => {
    switch (mucDich) {
      case 'NHẬP NVL':
        return <ArrowDownCircle className="h-5 w-5 text-blue-500" />;
      case 'XUẤT CHẾ BIẾN':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'NHẬP THÀNH PHẨM':
        return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
      case 'XUẤT BÁN':
        return <ShoppingCart className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Đã xác nhận
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Bản nháp
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-800">
                Quản lý phiếu nhập xuất kho
              </h1>
            </div> 

            <button
              onClick={handleCreateNewPhieu}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Tạo phiếu mới
            </button>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm theo mã phiếu, đối tác, người tạo..."
                  className="p-2.5 pl-10 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border ${showFilters ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 bg-white text-gray-700'} rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors`}
              >
                <Filter className="h-4 w-4" />
                Bộ lọc {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại phiếu
                    </label>
                    <select
                      value={filters.loaiPhieu}
                      onChange={(e) => handleFilterChange('loaiPhieu', e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="ALL">Tất cả</option>
                      <option value="NHẬP KHO">Nhập kho</option>
                      <option value="XUẤT KHO">Xuất kho</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mục đích
                    </label>
                    <select
                      value={filters.mucDich}
                      onChange={(e) => handleFilterChange('mucDich', e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="ALL">Tất cả</option>
                      <option value="NHẬP NVL">Nhập NVL</option>
                      <option value="NHẬP THÀNH PHẨM">Nhập thành phẩm</option>
                      <option value="XUẤT CHẾ BIẾN">Xuất chế biến</option>
                      <option value="XUẤT BÁN">Xuất bán</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={filters.trangThai}
                      onChange={(e) => handleFilterChange('trangThai', e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="ALL">Tất cả</option>
                      <option value="DRAFT">Bản nháp</option>
                      <option value="CONFIRMED">Đã xác nhận</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={filters.tuNgay}
                      onChange={(e) => handleFilterChange('tuNgay', e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={filters.denNgay}
                      onChange={(e) => handleFilterChange('denNgay', e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 text-sm flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            )}

            {/* Results Stats */}
            <div className="text-sm text-gray-500">
              Tìm thấy {filteredPhieu.length} phiếu {searchQuery ? `cho '${searchQuery}'` : ''} {filteredPhieu.length !== danhSachPhieu.length ? '(đã lọc)' : ''}
            </div>
          </div>

          {/* Table Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã phiếu
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại phiếu
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mục đích
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày GD
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đối tác
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người tạo
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng tiền
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-4 text-center text-gray-500">
                        <div className="flex justify-center items-center">
                          <svg className="animate-spin h-5 w-5 text-indigo-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Đang tải dữ liệu...
                        </div>
                      </td>
                    </tr>
                  ) : filteredPhieu.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-4 text-center text-gray-500 italic">
                        Không tìm thấy phiếu nào
                      </td>
                    </tr>
                  ) : (
                    filteredPhieu.map((phieu) => (
                      <tr key={phieu['MÃ PHIẾU']} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                          {phieu['MÃ PHIẾU']}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {phieu['LOẠI PHIẾU']}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            {getPurposeIcon(phieu['MỤC ĐÍCH'])}
                            {phieu['MỤC ĐÍCH']}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(phieu['NGÀY GD']).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {phieu['ĐỐI TÁC'] || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {phieu['NGƯỜI TẠO']}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {parseFloat(phieu['TỔNG TIỀN']).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {getStatusBadge(phieu['TRẠNG THÁI'])}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => viewPhieuDetails(phieu)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            
                            {phieu['TRẠNG THÁI'] === 'DRAFT' && (
                              <button
                                onClick={() => handleEditPhieu(phieu['MÃ PHIẾU'])}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                                title="Chỉnh sửa"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            
                            {phieu['TRẠNG THÁI'] === 'DRAFT' && (
                              <button
                                onClick={() => handleDeletePhieu(phieu['MÃ PHIẾU'])}
                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                                title="Xóa phiếu"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            )}
                            
                            {phieu['TRẠNG THÁI'] === 'CONFIRMED' && (
                              <button
                                className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                                title="In phiếu"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedPhieu && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getPurposeIcon(selectedPhieu['MỤC ĐÍCH'])}
                <h2 className="text-lg font-semibold">
                  Chi tiết phiếu {selectedPhieu['MÃ PHIẾU']}
                </h2>
                {getStatusBadge(selectedPhieu['TRẠNG THÁI'])}
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4">
              {/* Document Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-500">Loại phiếu</div>
                  <div className="font-medium">{selectedPhieu['LOẠI PHIẾU']}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Mục đích</div>
                  <div className="font-medium">{selectedPhieu['MỤC ĐÍCH']}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Ngày giao dịch</div>
                  <div className="font-medium">{new Date(selectedPhieu['NGÀY GD']).toLocaleDateString('vi-VN')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Đối tác</div>
                  <div className="font-medium">{selectedPhieu['ĐỐI TÁC'] || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Người tạo</div>
                  <div className="font-medium">{selectedPhieu['NGƯỜI TẠO']}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Tổng tiền</div>
                  <div className="font-medium text-indigo-600">{parseFloat(selectedPhieu['TỔNG TIỀN']).toLocaleString('vi-VN')} đ</div>
                </div>
              </div>
              
              {selectedPhieu['GHI CHÚ'] && (
                <div className="mb-6">
                  <div className="text-sm text-gray-500">Ghi chú</div>
                  <div className="italic text-gray-700">{selectedPhieu['GHI CHÚ']}</div>
                </div>
              )}
              
              {/* Document Details */}
              <h3 className="text-md font-semibold mb-3">Chi tiết các mặt hàng</h3>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        STT
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mã hàng
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tên hàng
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số lượng
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Đơn giá
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPhieuDetails.length > 0 ? (
                      selectedPhieuDetails.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item['MÃ HÀNG']}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {/* Would need to fetch product name from product list */}
                          {/* Would need to fetch product name from product list */}
                          {item['TÊN HÀNG']}
                         </td>
                         <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                           {parseFloat(item['SỐ LƯỢNG']).toLocaleString('vi-VN')}
                         </td>
                         <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                           {parseFloat(item['ĐƠN GIÁ']).toLocaleString('vi-VN')}
                         </td>
                         <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                           {parseFloat(item['THÀNH TIỀN']).toLocaleString('vi-VN')}
                         </td>
                       </tr>
                     ))
                   ) : (
                     <tr>
                       <td colSpan="6" className="px-4 py-4 text-center text-gray-500 italic">
                         Không có dữ liệu chi tiết
                       </td>
                     </tr>
                   )}
                 </tbody>
                 <tfoot className="bg-gray-50">
                   <tr>
                     <td colSpan="5" className="px-4 py-2 text-right font-semibold text-gray-700">
                       Tổng cộng:
                     </td>
                     <td className="px-4 py-2 text-right font-bold text-indigo-600">
                       {parseFloat(selectedPhieu['TỔNG TIỀN']).toLocaleString('vi-VN')}
                     </td>
                   </tr>
                 </tfoot>
               </table>
             </div>
           </div>
           
           <div className="p-4 border-t border-gray-200 flex justify-between">
             <div>
               {selectedPhieu['TRẠNG THÁI'] === 'CONFIRMED' && (
                 <button
                   className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                 >
                   <Printer className="h-4 w-4" />
                   In phiếu
                 </button>
               )}
             </div>
             <div className="flex gap-2">
               <button
                 onClick={() => setShowDetailModal(false)}
                 className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
               >
                 Đóng
               </button>
               
               {selectedPhieu['TRẠNG THÁI'] === 'DRAFT' && (
                 <button
                   onClick={() => {
                     setShowDetailModal(false);
                     handleEditPhieu(selectedPhieu['MÃ PHIẾU']);
                   }}
                   className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                 >
                   <Edit className="h-4 w-4" />
                   Chỉnh sửa
                 </button>
               )}
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
   </div>
 );
};

export default XuatNhapKhoManager;