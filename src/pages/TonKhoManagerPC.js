// TonKhoManagerPC.jsx
import React, { useState, useEffect, useRef } from 'react';
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
    TrendingUp
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import { utils, writeFile } from 'xlsx';

const TonKhoManagerPC = () => {
    const navigate = useNavigate();
    const tableRef = useRef(null);

    // State for list and filters
    const [danhSachTonKho, setDanhSachTonKho] = useState([]);
    const [filteredTonKho, setFilteredTonKho] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
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
    // Sửa đổi useEffect để gọi applyFilters khi filters thay đổi
useEffect(() => {
    applyFilters();
}, [searchQuery, filters, danhSachTonKho, rawData]);

    // Calculate statistics when filtered data changes
    useEffect(() => {
        calculateStatistics();
    }, [filteredTonKho]);

   
// Sửa hàm fetchDanhSachTonKho để lưu dữ liệu gốc
const fetchDanhSachTonKho = async () => {
    setIsLoading(true);
    try {
        const phieuResponse = await authUtils.apiRequest('XUATNHAPKHO', 'Find', {});
        const chiTietResponse = await authUtils.apiRequest('XUATNHAPKHO_CHITIET', 'Find', {});
        const hangHoaResponse = await authUtils.apiRequest('DMHH', 'Find', {});

        if (phieuResponse && chiTietResponse && hangHoaResponse) {
            // Lưu dữ liệu gốc
            setRawData({
                phieuList: phieuResponse,
                chiTietList: chiTietResponse,
                hangHoaList: hangHoaResponse
            });
            
            // Tính toán tồn kho với dữ liệu mới
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
            'ĐƠN GIÁ': item['ĐƠN GIÁ'] || 0, // Đảm bảo có giá trị mặc định
            'TỒN ĐẦU KỲ': 0,
            'NHẬP TRONG KỲ': 0,
            'XUẤT TRONG KỲ': 0,
            'TỒN CUỐI KỲ': 0,
            'GIÁ TRỊ TỒN KHO': 0 // Sẽ được tính toán sau
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

            // Kiểm tra xem mã hàng có tồn tại trong danh sách hàng hóa không
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
                // Nếu giao dịch sau kỳ báo cáo, không tính vào báo cáo hiện tại
            }
        });
    });

    // Tính toán tồn cuối kỳ và giá trị tồn kho
    Object.values(tonKhoMap).forEach(item => {
        // Đảm bảo giá trị số
        item['TỒN ĐẦU KỲ'] = parseFloat(item['TỒN ĐẦU KỲ']) || 0;
        item['NHẬP TRONG KỲ'] = parseFloat(item['NHẬP TRONG KỲ']) || 0;
        item['XUẤT TRONG KỲ'] = parseFloat(item['XUẤT TRONG KỲ']) || 0;
        item['ĐƠN GIÁ'] = parseFloat(item['ĐƠN GIÁ']) || 0;

        // Tính tồn cuối kỳ
        item['TỒN CUỐI KỲ'] = item['TỒN ĐẦU KỲ'] + item['NHẬP TRONG KỲ'] - item['XUẤT TRONG KỲ'];
        
        // Đảm bảo tồn không âm (tùy vào logic nghiệp vụ)
        // item['TỒN CUỐI KỲ'] = Math.max(0, item['TỒN CUỐI KỲ']);

        // Tính giá trị tồn kho
        item['GIÁ TRỊ TỒN KHO'] = item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ'];
    });

    // Chuyển đối tượng thành mảng để trả về
    const result = Object.values(tonKhoMap);

    // Lọc các mặt hàng có dữ liệu (tùy thuộc vào yêu cầu)
    // Có thể bỏ qua bước này nếu muốn hiển thị tất cả mặt hàng
    // const filteredResult = result.filter(item => 
    //    item['TỒN ĐẦU KỲ'] !== 0 || 
    //    item['NHẬP TRONG KỲ'] !== 0 || 
    //    item['XUẤT TRONG KỲ'] !== 0 || 
    //    item['TỒN CUỐI KỲ'] !== 0
    // );

    // Sắp xếp theo mã hàng
    result.sort((a, b) => a['MÃ HÀNG'].localeCompare(b['MÃ HÀNG']));

    return result;
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
    // Sửa đổi hàm applyFilters
const applyFilters = () => {
    let result = [...danhSachTonKho];

    // Nếu ngày thay đổi, tính toán lại từ dữ liệu gốc
    if (filters.tuNgay !== new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] ||
        filters.denNgay !== new Date().toISOString().split('T')[0]) {
        // Tính toán lại dữ liệu tồn kho với ngày mới mà không gọi API
        if (rawData.phieuList.length > 0) {
            result = tinhToanTonKho(rawData.phieuList, rawData.chiTietList, rawData.hangHoaList);
        }
    }

    // Áp dụng bộ lọc tìm kiếm
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(item =>
            item['MÃ HÀNG']?.toLowerCase().includes(query) ||
            item['TÊN HÀNG']?.toLowerCase().includes(query)
        );
    }

    // Áp dụng bộ lọc loại hàng
    if (filters.loaiHang !== 'ALL') {
        result = result.filter(item => item['LOẠI'] === filters.loaiHang);
    }

    // Sắp xếp theo mã hàng
    result.sort((a, b) => {
        return a['MÃ HÀNG'].localeCompare(b['MÃ HÀNG']);
    });

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

            // Set column widths
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

    // Print report with custom styling
    const printReport = () => {
        try {
            // Create print-friendly version
            const printContent = document.createElement('div');
            printContent.innerHTML = `
                <style>
                    @media print {
                        body { font-family: Arial, sans-serif; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; }
                        th { background-color: #f2f2f2; }
                        .text-right { text-align: right; }
                        .report-header { text-align: center; margin-bottom: 20px; }
                        .report-meta { margin-bottom: 20px; }
                        .report-summary { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; background-color: #f9f9f9; }
                        .report-footer { margin-top: 20px; text-align: right; }
                        .no-print { display: none; }
                    }
                </style>
                <div class="report-header">
                    <h1>BÁO CÁO TỒN KHO</h1>
                    <p>Kỳ báo cáo: ${new Date(filters.tuNgay).toLocaleDateString('vi-VN')} đến ${new Date(filters.denNgay).toLocaleDateString('vi-VN')}</p>
                </div>
                <div class="report-meta">
                    <p>Loại hàng: ${filters.loaiHang === 'ALL' ? 'Tất cả' : filters.loaiHang}</p>
                    <p>Tổng số mặt hàng: ${filteredTonKho.length}</p>
                </div>
                <div class="report-summary">
                    <h3>Tổng kết báo cáo:</h3>
                    <p>Tổng giá trị tồn kho: ${statistics.tongGiaTri.toLocaleString('vi-VN')} VNĐ</p>
                    <p>Hàng có giá trị tồn kho cao nhất: ${statistics.matHangCaoNhat.ten} (${statistics.matHangCaoNhat.giaTri.toLocaleString('vi-VN')} VNĐ)</p>
                    <p>Hàng có giá trị tồn kho thấp nhất: ${statistics.matHangThapNhat.ten} (${statistics.matHangThapNhat.giaTri.toLocaleString('vi-VN')} VNĐ)</p>
                </div>
            `;

            // Clone the table
            const tableClone = tableRef.current.cloneNode(true);
            printContent.appendChild(tableClone);

            printContent.innerHTML += `
                <div class="report-footer">
                    <p>Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}</p>
                </div>
            `;

            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            printWindow.document.open();
            printWindow.document.write(printContent.innerHTML);
            printWindow.document.close();

            // Print after content is loaded
            printWindow.onload = function () {
                printWindow.print();
                printWindow.close();
            };

            toast.success("Đã gửi báo cáo đến máy in!");
        } catch (error) {
            console.error('Error printing:', error);
            toast.error('Không thể in báo cáo. Vui lòng thử lại.');
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-indigo-600" />
                            <h1 className="text-2xl font-bold text-gray-800">
                                Báo cáo tồn kho
                            </h1>
                        </div>

                        <div className="flex gap-2">
                            {/* Refresh data button */}
                            <button
                                onClick={fetchDanhSachTonKho}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-sm flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Làm mới dữ liệu
                            </button>
                            <button
                                onClick={exportToExcel}
                                className="px-4 py-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-2 transition-colors"
                            >
                                <Download className="h-4 w-4" />
                                Xuất Excel
                            </button>
                            <button
                                onClick={printReport}
                                className="px-4 py-2 border border-indigo-500 text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                            >
                                <Printer className="h-4 w-4" />
                                In báo cáo
                            </button>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Tổng số mặt hàng</p>
                                    <h3 className="text-xl font-bold text-gray-800 mt-1">{statistics.tongSoMatHang}</h3>
                                </div>
                                <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-indigo-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Tổng giá trị tồn kho</p>
                                    <h3 className="text-xl font-bold text-gray-800 mt-1">
                                        {statistics.tongGiaTri.toLocaleString('vi-VN')} VNĐ
                                    </h3>
                                </div>
                                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div>
                                <p className="text-sm text-gray-500">Mặt hàng có giá trị cao nhất</p>
                                <h3 className="text-lg font-bold text-gray-800 mt-1 truncate" title={statistics.matHangCaoNhat.ten}>
                                    {statistics.matHangCaoNhat.ten}
                                </h3>
                                <p className="text-sm text-green-600 font-medium">
                                    {statistics.matHangCaoNhat.giaTri.toLocaleString('vi-VN')} VNĐ
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div>
                                <p className="text-sm text-gray-500">Mặt hàng có giá trị thấp nhất</p>
                                <h3 className="text-lg font-bold text-gray-800 mt-1 truncate" title={statistics.matHangThapNhat.ten}>
                                    {statistics.matHangThapNhat.ten}
                                </h3>
                                <p className="text-sm text-red-600 font-medium">
                                    {statistics.matHangThapNhat.giaTri.toLocaleString('vi-VN')} VNĐ
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6">
                        <div className="flex gap-3 mb-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm theo mã hàng, tên hàng..."
                                    className="p-2.5 pl-10 text-base border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
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
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Loại hàng
                                        </label>
                                        <select
                                            value={filters.loaiHang}
                                            onChange={(e) => handleFilterChange('loaiHang', e.target.value)}
                                            className="p-2 text-base border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="ALL">Tất cả</option>
                                            <option value="NGUYÊN VẬT LIỆU">Nguyên vật liệu</option>
                                            <option value="THÀNH PHẨM">Thành phẩm</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <Calendar className="h-4 w-4 inline mr-1" />
                                            Từ ngày
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.tuNgay}
                                            onChange={(e) => handleFilterChange('tuNgay', e.target.value)}
                                            className="p-2 text-base border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <Calendar className="h-4 w-4 inline mr-1" />
                                            Đến ngày
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.denNgay}
                                            onChange={(e) => handleFilterChange('denNgay', e.target.value)}
                                            className="p-2 text-base border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
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
                            <div className="flex items-center gap-4">
                                <div>
                                    Kỳ báo cáo: <span className="font-medium">{new Date(filters.tuNgay).toLocaleDateString('vi-VN')}</span> đến <span className="font-medium">{new Date(filters.denNgay).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div>
                                    Tìm thấy {filteredTonKho.length} mặt hàng {searchQuery ? `cho '${searchQuery}'` : ''} {filteredTonKho.length !== danhSachTonKho.length ? '(đã lọc)' : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    {/* Table Section */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            STT
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mã hàng
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tên hàng
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Loại
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ĐVT
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Đơn giá
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tồn đầu kỳ
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nhập trong kỳ
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Xuất trong kỳ
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tồn cuối kỳ
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Giá trị tồn kho
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="11" className="px-4 py-4 text-center text-gray-500">
                                                <div className="flex justify-center items-center">
                                                    <svg className="animate-spin h-5 w-5 text-indigo-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Đang tải dữ liệu...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredTonKho.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className="px-4 py-4 text-center text-gray-500 italic">
                                                Không tìm thấy dữ liệu tồn kho nào
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTonKho.map((item, index) => (
                                            <tr key={item['MÃ HÀNG']} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                                                    {item['MÃ HÀNG']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {item['TÊN HÀNG']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {item['LOẠI']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    M3
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {item['ĐƠN GIÁ'].toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {parseFloat(item['TỒN ĐẦU KỲ']).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {parseFloat(item['NHẬP TRONG KỲ']).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {parseFloat(item['XUẤT TRONG KỲ']).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                                                    {parseFloat(item['TỒN CUỐI KỲ']).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                                                    {(item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ']).toLocaleString('vi-VN')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan="6" className="px-4 py-3 text-right font-semibold text-sm text-gray-700">
                                            Tổng cộng:
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-sm text-indigo-600">
                                            {filteredTonKho.reduce((sum, item) => sum + parseFloat(item['TỒN ĐẦU KỲ'] || 0), 0).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-sm text-indigo-600">
                                            {filteredTonKho.reduce((sum, item) => sum + parseFloat(item['NHẬP TRONG KỲ'] || 0), 0).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-sm text-indigo-600">
                                            {filteredTonKho.reduce((sum, item) => sum + parseFloat(item['XUẤT TRONG KỲ'] || 0), 0).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-sm text-indigo-600">
                                            {filteredTonKho.reduce((sum, item) => sum + parseFloat(item['TỒN CUỐI KỲ'] || 0), 0).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-sm text-green-600">
                                            {filteredTonKho.reduce((sum, item) => sum + (item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ']), 0).toLocaleString('vi-VN')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Empty state suggestion */}
                    {filteredTonKho.length === 0 && !isLoading && (
                        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 text-center">
                            <div className="text-gray-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-gray-700 font-medium text-lg">Không tìm thấy dữ liệu tồn kho</h3>
                            <p className="text-gray-500 text-sm mt-1">Thử thay đổi bộ lọc hoặc nhập từ khóa tìm kiếm khác</p>
                            <button
                                onClick={resetFilters}
                                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    )}
                </div>
            </div>

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

export default TonKhoManagerPC;