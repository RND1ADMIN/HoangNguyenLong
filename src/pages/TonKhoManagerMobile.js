// TonKhoManagerMobile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    FileText,
    Download,
    Printer,
    ChevronDown,
    ChevronUp,
    X,
    Calendar,
    TrendingUp,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import { utils, writeFile } from 'xlsx';

const TonKhoManagerMobile = () => {
    const navigate = useNavigate();

    // State for list and filters
    const [danhSachTonKho, setDanhSachTonKho] = useState([]);
    const [filteredTonKho, setFilteredTonKho] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedItem, setExpandedItem] = useState(null);
    const [visibleItems, setVisibleItems] = useState(10);
    // Cả hai component đều cần thêm state này
const [rawData, setRawData] = useState({
    phieuList: [],
    chiTietList: [],
    hangHoaList: []
});
    // State for statistics
    const [statistics, setStatistics] = useState({
        tongSoMatHang: 0,
        tongGiaTri: 0,
        matHangCaoNhat: { ten: '', giaTri: 0 },
        matHangThapNhat: { ten: '', giaTri: 0 },
    });

    // Filter states
    const [filters, setFilters] = useState({
        loaiHang: 'ALL',
        tuNgay: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        denNgay: new Date().toISOString().split('T')[0]
    });

    // Fetch data on load
    useEffect(() => {
        fetchDanhSachTonKho();
    }, []);

    // Apply filters when they change
    useEffect(() => {
        applyFilters();
    }, [searchQuery, filters, danhSachTonKho, rawData]);
    
    // Calculate statistics when filtered data changes
    useEffect(() => {
        calculateStatistics();
    }, [filteredTonKho]);

    // Fetch list of inventory
    const fetchDanhSachTonKho = async () => {
        setIsLoading(true);
        try {
            const phieuResponse = await authUtils.apiRequest('XUATNHAPKHO', 'Find', {});
            const chiTietResponse = await authUtils.apiRequest('XUATNHAPKHO_CHITIET', 'Find', {});
            const hangHoaResponse = await authUtils.apiRequest('DMHH', 'Find', {});
    
            if (phieuResponse && chiTietResponse && hangHoaResponse) {
                // Lưu dữ liệu gốc vào state
                setRawData({
                    phieuList: phieuResponse,
                    chiTietList: chiTietResponse,
                    hangHoaList: hangHoaResponse
                });
                
                // Tính toán tồn kho từ dữ liệu gốc
                const tonKhoData = tinhToanTonKho(phieuResponse, chiTietResponse, hangHoaResponse);
                setDanhSachTonKho(tonKhoData);
            }
        } catch (error) {
            console.error('Error fetching inventory data:', error);
            toast.error('Không thể tải dữ liệu tồn kho. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    // Tính toán dữ liệu tồn kho
    const tinhToanTonKho = (phieuList, chiTietList, hangHoaList) => {
        // Tạo đối tượng lưu trữ thông tin tồn kho theo mã hàng
        const tonKhoMap = {};
    
        // Khởi tạo dữ liệu tồn kho từ danh sách hàng hóa
        hangHoaList.forEach(item => {
            tonKhoMap[item['MÃ HÀNG']] = {
                'MÃ HÀNG': item['MÃ HÀNG'],
                'TÊN HÀNG': item['TÊN HÀNG'],
                'LOẠI': item['LOẠI'],
                'ĐƠN VỊ TÍNH': item['ĐƠN VỊ TÍNH'],
                'ĐƠN GIÁ': parseFloat(item['ĐƠN GIÁ']) || 0,
                'TỒN ĐẦU KỲ': 0,
                'NHẬP TRONG KỲ': 0,
                'XUẤT TRONG KỲ': 0,
                'TỒN CUỐI KỲ': 0,
                'GIÁ TRỊ TỒN KHO': 0
            };
        });
    
        // Lấy mốc thời gian từ filter hiện tại
        const tuNgay = new Date(filters.tuNgay);
        tuNgay.setHours(0, 0, 0, 0);
    
        const denNgay = new Date(filters.denNgay);
        denNgay.setHours(23, 59, 59, 999);
    
        // Xử lý dữ liệu giao dịch
        phieuList.forEach(phieu => {
            const ngayGD = new Date(phieu['NGÀY GD']);
            const maPhieu = phieu['MÃ PHIẾU'];
            const loaiPhieu = phieu['LOẠI PHIẾU'];
    
            // Lọc chi tiết phiếu cho phiếu hiện tại
            const chiTietPhieu = chiTietList.filter(item => item['MÃ PHIẾU'] === maPhieu);
    
            chiTietPhieu.forEach(chiTiet => {
                const maHang = chiTiet['MÃ HÀNG'];
                const soLuong = parseFloat(chiTiet['SỐ LƯỢNG']) || 0;
    
                if (tonKhoMap[maHang]) {
                    // Nếu giao dịch trước kỳ báo cáo, tính vào tồn đầu kỳ
                    if (ngayGD < tuNgay) {
                        if (loaiPhieu === 'NHẬP KHO') {
                            tonKhoMap[maHang]['TỒN ĐẦU KỲ'] += soLuong;
                        } else if (loaiPhieu === 'XUẤT KHO') {
                            tonKhoMap[maHang]['TỒN ĐẦU KỲ'] -= soLuong;
                        }
                    }
                    // Nếu giao dịch trong kỳ báo cáo, tính vào nhập/xuất trong kỳ
                    else if (ngayGD >= tuNgay && ngayGD <= denNgay) {
                        if (loaiPhieu === 'NHẬP KHO') {
                            tonKhoMap[maHang]['NHẬP TRONG KỲ'] += soLuong;
                        } else if (loaiPhieu === 'XUẤT KHO') {
                            tonKhoMap[maHang]['XUẤT TRONG KỲ'] += soLuong;
                        }
                    }
                    // Các giao dịch sau kỳ báo cáo sẽ không tính
                }
            });
        });
    
        // Tính toán tồn cuối kỳ và giá trị tồn kho
        Object.values(tonKhoMap).forEach(item => {
            item['TỒN CUỐI KỲ'] = item['TỒN ĐẦU KỲ'] + item['NHẬP TRONG KỲ'] - item['XUẤT TRONG KỲ'];
            item['GIÁ TRỊ TỒN KHO'] = item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ'];
        });
    
        return Object.values(tonKhoMap);
    };

    // Calculate statistics for top of the report
    const calculateStatistics = () => {
        if (filteredTonKho.length === 0) {
            setStatistics({
                tongSoMatHang: 0,
                tongGiaTri: 0,
                matHangCaoNhat: { ten: '', giaTri: 0 },
                matHangThapNhat: { ten: '', giaTri: 0 },
            });
            return;
        }

        // Calculate total value
        const tongGiaTri = filteredTonKho.reduce((sum, item) => 
            sum + (item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ']), 0);
        
        // Find items with highest and lowest values
        let maxItem = filteredTonKho[0];
        let minItem = filteredTonKho[0];
        
        filteredTonKho.forEach(item => {
            const giaTri = item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ'];
            if (giaTri > maxItem['TỒN CUỐI KỲ'] * maxItem['ĐƠN GIÁ']) {
                maxItem = item;
            }
            if (giaTri < minItem['TỒN CUỐI KỲ'] * minItem['ĐƠN GIÁ'] && item['TỒN CUỐI KỲ'] > 0) {
                minItem = item;
            }
        });
        
        setStatistics({
            tongSoMatHang: filteredTonKho.length,
            tongGiaTri,
            matHangCaoNhat: { 
                ten: maxItem['TÊN HÀNG'], 
                giaTri: maxItem['TỒN CUỐI KỲ'] * maxItem['ĐƠN GIÁ'] 
            },
            matHangThapNhat: { 
                ten: minItem['TÊN HÀNG'], 
                giaTri: minItem['TỒN CUỐI KỲ'] * minItem['ĐƠN GIÁ'] 
            },
        });
    };

    // Apply all filters
    const applyFilters = () => {
        let result = [...danhSachTonKho];
    
        // Nếu ngày thay đổi, tính toán lại từ dữ liệu gốc
        if (filters.tuNgay !== new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] ||
            filters.denNgay !== new Date().toISOString().split('T')[0]) {
            
            // Chỉ tính toán lại nếu đã có dữ liệu gốc
            if (rawData.phieuList.length > 0) {
                // Tính toán lại dữ liệu tồn kho với ngày mới mà không gọi API
                result = tinhToanTonKho(rawData.phieuList, rawData.chiTietList, rawData.hangHoaList);
            }
        }
    
        // Áp dụng tìm kiếm
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item['MÃ HÀNG']?.toLowerCase().includes(query) ||
                item['TÊN HÀNG']?.toLowerCase().includes(query)
            );
        }
    
        // Áp dụng lọc theo loại hàng
        if (filters.loaiHang !== 'ALL') {
            result = result.filter(item => item['LOẠI'] === filters.loaiHang);
        }
    
        // Sắp xếp theo mã hàng
        result.sort((a, b) => a['MÃ HÀNG'].localeCompare(b['MÃ HÀNG']));
    
        setFilteredTonKho(result);
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
            loaiHang: 'ALL',
            tuNgay: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            denNgay: new Date().toISOString().split('T')[0]
        });
        setSearchQuery('');
    };

    // Toggle expanded view for an item
    const toggleExpand = (maHang) => {
        if (expandedItem === maHang) {
            setExpandedItem(null);
        } else {
            setExpandedItem(maHang);
        }
    };

    // Load more items
    const loadMoreItems = () => {
        setVisibleItems(prev => prev + 10);
    };

    // Export to Excel
    const exportToExcel = () => {
        try {
            toast.info("Đang xuất báo cáo tồn kho...");

            // Create worksheet from data
            const worksheet = utils.json_to_sheet(filteredTonKho.map(item => ({
                'STT': filteredTonKho.indexOf(item) + 1,
                'MÃ HÀNG': item['MÃ HÀNG'],
                'TÊN HÀNG': item['TÊN HÀNG'],
                'LOẠI': item['LOẠI'],
                'ĐƠN VỊ TÍNH': item['ĐƠN VỊ TÍNH'],
                'ĐƠN GIÁ': item['ĐƠN GIÁ'],
                'TỒN ĐẦU KỲ': item['TỒN ĐẦU KỲ'],
                'NHẬP TRONG KỲ': item['NHẬP TRONG KỲ'],
                'XUẤT TRONG KỲ': item['XUẤT TRONG KỲ'],
                'TỒN CUỐI KỲ': item['TỒN CUỐI KỲ'],
                'GIÁ TRỊ TỒN KHO': item['GIÁ TRỊ TỒN KHO']
            })));

            // Set column widths (simplified for mobile)
            const wscols = [
                { wch: 5 },   // STT
                { wch: 12 },  // MÃ HÀNG
                { wch: 30 },  // TÊN HÀNG
                { wch: 15 },  // LOẠI
                { wch: 10 },  // ĐƠN VỊ TÍNH
                { wch: 12 },  // ĐƠN GIÁ
                { wch: 12 },  // TỒN ĐẦU KỲ
                { wch: 12 },  // NHẬP TRONG KỲ
                { wch: 12 },  // XUẤT TRONG KỲ
                { wch: 12 },  // TỒN CUỐI KỲ
                { wch: 15 }   // GIÁ TRỊ TỒN KHO
            ];

            worksheet['!cols'] = wscols;

            // Create workbook
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, worksheet, "Báo cáo tồn kho");

            // Export workbook
            const fileName = `BaoCaoTonKho_${new Date().toISOString().slice(0, 10)}.xlsx`;
            writeFile(workbook, fileName);

            toast.success("Xuất báo cáo thành công!");
        } catch (error) {
            console.error('Error exporting data:', error);
            toast.error('Không thể xuất báo cáo. Vui lòng thử lại.');
        }
    };

    return (
        <div className="p-2 bg-gray-50 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-3 mb-4 border border-gray-100">
                    {/* Header Section - Mobile */}
                    <div className="flex flex-col gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-600" />
                            <h1 className="text-xl font-bold text-gray-800">
                                Báo cáo tồn kho
                            </h1>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full">
                            {/* Refresh data button */}
                            <button
                                onClick={fetchDanhSachTonKho}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-xs flex items-center gap-1 flex-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Làm mới
                            </button>
                            <button
                                onClick={exportToExcel}
                                className="px-3 py-1.5 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-1 transition-colors text-xs flex-1 justify-center"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Xuất Excel
                            </button>
                        </div>
                    </div>

                    {/* Statistics Cards - Mobile */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Tổng mặt hàng</p>
                            <h3 className="text-base font-bold text-gray-800 mt-0.5">{statistics.tongSoMatHang}</h3>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Tổng giá trị</p>
                            <h3 className="text-base font-bold text-green-600 mt-0.5">
                                {statistics.tongGiaTri.toLocaleString('vi-VN')} VNĐ
                            </h3>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Giá trị cao nhất</p>
                            <div className="flex items-center mt-0.5">
                                <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                                <span className="text-sm font-medium text-green-600">
                                    {statistics.matHangCaoNhat.giaTri.toLocaleString('vi-VN')}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate" title={statistics.matHangCaoNhat.ten}>
                                {statistics.matHangCaoNhat.ten}
                            </p>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Giá trị thấp nhất</p>
                            <div className="flex items-center mt-0.5">
                                <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                                <span className="text-sm font-medium text-red-600">
                                    {statistics.matHangThapNhat.giaTri.toLocaleString('vi-VN')}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate" title={statistics.matHangThapNhat.ten}>
                                {statistics.matHangThapNhat.ten}
                            </p>
                        </div>
                    </div>

                    {/* Search and Filter Section - Mobile */}
                    <div className="mb-4">
                        <div className="flex flex-col gap-2 mb-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm theo mã hàng, tên hàng..."
                                    className="p-2 pl-9 text-sm border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 border ${showFilters ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 bg-white text-gray-700'} rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1 transition-colors text-sm`}
                            >
                                <Filter className="h-4 w-4" />
                                Bộ lọc {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                        </div>

                        {/* Advanced Filters - Mobile */}
                        {showFilters && (
                            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 mb-3">
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Loại hàng
                                        </label>
                                        <select
                                            value={filters.loaiHang}
                                            onChange={(e) => handleFilterChange('loaiHang', e.target.value)}
                                            className="p-2 text-sm border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="ALL">Tất cả</option>
                                            <option value="NGUYÊN VẬT LIỆU">Nguyên vật liệu</option>
                                            <option value="THÀNH PHẨM">Thành phẩm</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            <Calendar className="h-3 w-3 inline mr-1" />
                                            Từ ngày
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.tuNgay}
                                            onChange={(e) => handleFilterChange('tuNgay', e.target.value)}
                                            className="p-2 text-sm border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            <Calendar className="h-3 w-3 inline mr-1" />
                                            Đến ngày
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.denNgay}
                                            onChange={(e) => handleFilterChange('denNgay', e.target.value)}
                                            className="p-2 text-sm border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={resetFilters}
                                        className="px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 text-xs flex items-center gap-1"
                                    >
                                        <X className="h-3 w-3" />
                                        Xóa bộ lọc
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Results Stats - Mobile */}
                        <div className="text-xs text-gray-500">
                            <div className="flex flex-col gap-1">
                                <div>
                                    Kỳ báo cáo: <span className="font-medium">{new Date(filters.tuNgay).toLocaleDateString('vi-VN')}</span> đến <span className="font-medium">{new Date(filters.denNgay).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div>
                                    Tìm thấy {filteredTonKho.length} mặt hàng {searchQuery ? `cho '${searchQuery}'` : ''} {filteredTonKho.length !== danhSachTonKho.length ? '(đã lọc)' : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="p-3 bg-white rounded-lg border border-gray-200 text-center">
                                <div className="flex justify-center items-center">
                                    <svg className="animate-spin h-4 w-4 text-indigo-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-xs">Đang tải dữ liệu...</span>
                                </div>
                            </div>
                        ) : filteredTonKho.length === 0 ? (
                            <div className="p-3 bg-white rounded-lg border border-gray-200 text-center text-xs italic text-gray-500">
                                Không tìm thấy dữ liệu tồn kho nào
                            </div>
                        ) : (
                            filteredTonKho.slice(0, visibleItems).map((item) => (
                                <div key={item['MÃ HÀNG']} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    {/* Card Header */}
                                    <div className="p-3 border-b border-gray-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-indigo-600">{item['MÃ HÀNG']}</div>
                                                <div className="text-sm">{item['TÊN HÀNG']}</div>
                                            </div>
                                            <div className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{item['LOẠI']}</div>
                                        </div>
                                    </div>
                                    
                                    {/* Card Body */}
                                    <div className="p-3">
                                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                            <div className="bg-gray-50 p-1.5 rounded">
                                                <div className="text-gray-500">Đơn giá:</div>
                                                <div className="font-medium text-gray-900">{item['ĐƠN GIÁ'].toLocaleString('vi-VN')} VNĐ</div>
                                            </div>
                                            <div className="bg-indigo-50 p-1.5 rounded">
                                                <div className="text-indigo-700">Tồn cuối kỳ:</div>
                                                <div className="font-bold text-indigo-700">{parseFloat(item['TỒN CUỐI KỲ']).toLocaleString('vi-VN')} {item['ĐƠN VỊ TÍNH']}</div>
                                            </div>
                                            <div className="bg-green-50 p-1.5 rounded col-span-2">
                                                <div className="text-green-700">Giá trị tồn kho:</div>
                                                <div className="font-bold text-green-700">{(item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ']).toLocaleString('vi-VN')} VNĐ</div>
                                            </div>
                                        </div>
                                        
                                        {/* Expandable section */}
                                        <button 
                                            onClick={() => toggleExpand(item['MÃ HÀNG'])}
                                            className="w-full text-xs text-center text-gray-500 flex items-center justify-center gap-1"
                                        >
                                            {expandedItem === item['MÃ HÀNG'] ? (
                                                <>
                                                    <ChevronUp className="h-3 w-3" />
                                                    Ẩn chi tiết
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-3 w-3" />
                                                    Xem chi tiết
                                                </>
                                            )}
                                        </button>
                                        
                                        {expandedItem === item['MÃ HÀNG'] && (
                                            <div className="mt-2 pt-2 border-t border-gray-100">
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="p-1.5">
                                                        <div className="text-gray-500">Tồn đầu kỳ:</div>
                                                        <div className="font-medium">{parseFloat(item['TỒN ĐẦU KỲ']).toLocaleString('vi-VN')} {item['ĐƠN VỊ TÍNH']}</div>
                                                    </div>
                                                    <div className="p-1.5">
                                                        <div className="text-gray-500">Đơn vị tính:</div>
                                                        <div className="font-medium">M3</div>
                                                    </div>
                                                    <div className="p-1.5">
                                                        <div className="text-gray-500">Nhập trong kỳ:</div>
                                                        <div className="font-medium text-green-600">+{parseFloat(item['NHẬP TRONG KỲ']).toLocaleString('vi-VN')} {item['ĐƠN VỊ TÍNH']}</div>
                                                    </div>
                                                    <div className="p-1.5">
                                                        <div className="text-gray-500">Xuất trong kỳ:</div>
                                                        <div className="font-medium text-red-600">-{parseFloat(item['XUẤT TRONG KỲ']).toLocaleString('vi-VN')} {item['ĐƠN VỊ TÍNH']}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {filteredTonKho.length > visibleItems && (
                            <div className="text-center mt-3">
                                <button
                                    onClick={loadMoreItems}
                                    className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200"
                                >
                                    Xem thêm {filteredTonKho.length - visibleItems} mặt hàng
                                </button>
                            </div>
                        )}

                        {filteredTonKho.length > 0 && (
                            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 mt-3">
                                <div className="text-xs font-medium text-indigo-700 mb-1">Tổng kết tồn kho:</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <div className="text-gray-600">Tổng tồn đầu kỳ:</div>
                                        <div className="font-medium">{filteredTonKho.reduce((sum, item) => sum + parseFloat(item['TỒN ĐẦU KỲ'] || 0), 0).toLocaleString('vi-VN')}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-600">Tổng nhập trong kỳ:</div>
                                        <div className="font-medium text-green-600">{filteredTonKho.reduce((sum, item) => sum + parseFloat(item['NHẬP TRONG KỲ'] || 0), 0).toLocaleString('vi-VN')}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-600">Tổng xuất trong kỳ:</div>
                                        <div className="font-medium text-red-600">{filteredTonKho.reduce((sum, item) => sum + parseFloat(item['XUẤT TRONG KỲ'] || 0), 0).toLocaleString('vi-VN')}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-600">Tổng tồn cuối kỳ:</div>
                                        <div className="font-bold text-indigo-700">{filteredTonKho.reduce((sum, item) => sum + parseFloat(item['TỒN CUỐI KỲ'] || 0), 0).toLocaleString('vi-VN')}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-gray-600">Tổng giá trị tồn kho:</div>
                                        <div className="font-bold text-green-700">{filteredTonKho.reduce((sum, item) => sum + (item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ']), 0).toLocaleString('vi-VN')} VNĐ</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Empty state suggestion */}
            {filteredTonKho.length === 0 && !isLoading && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 text-center">
                    <div className="text-gray-400 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-gray-700 font-medium">Không tìm thấy dữ liệu tồn kho</h3>
                    <p className="text-gray-500 text-xs mt-1">Thử thay đổi bộ lọc hoặc nhập từ khóa tìm kiếm khác</p>
                    <button
                        onClick={resetFilters}
                        className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs"
                    >
                        Xóa bộ lọc
                    </button>
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

export default TonKhoManagerMobile;