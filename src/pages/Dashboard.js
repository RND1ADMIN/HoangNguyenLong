import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import {
    Package, Warehouse, Factory, TrendingUp, AlertTriangle, Loader2, Calendar,
    Search, Filter, FileText, Download, Printer, ChevronDown, ChevronUp, ChevronRight,
    X, ArrowDownCircle, ArrowUpCircle, ShoppingCart, Plus, Edit
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
    const navigate = useNavigate();

    // State for dashboard data
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        inventorySummary: {},
        productCategories: [],
        recentTransactions: [],
        lowStockItems: [],
        inventoryValue: [],
        productionOverview: [],
        monthlyFinancials: []
    });

    // State for date range filter
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    });
    const [rawData, setRawData] = useState({
        phieuList: [],
        chiTietList: [],
        hangHoaList: [],
        reportData: []
    });
    // Fetch data for dashboard
    // Trong Dashboard.jsx
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                console.log("Đang tải dữ liệu dashboard...");

                // Chỉ tải dữ liệu khi rawData chưa có
                if (rawData.phieuList.length === 0) {
                    // Fetch dữ liệu tồn kho
                    const tonKhoData = await authUtils.apiRequest('DMHH', 'Find', {});
                    const phieuData = await authUtils.apiRequest('XUATNHAPKHO', 'Find', {});
                    const chiTietData = await authUtils.apiRequest('XUATNHAPKHO_CHITIET', 'Find', {});
                    const reportData = await authUtils.apiRequest('BC', 'Find', {});

                    console.log("Dữ liệu tải về:", {
                        tonKhoData: tonKhoData?.length,
                        phieuData: phieuData?.length,
                        chiTietData: chiTietData?.length,
                        reportData: reportData?.length
                    });

                    // Lưu dữ liệu gốc
                    setRawData({
                        phieuList: phieuData || [],
                        chiTietList: chiTietData || [],
                        hangHoaList: tonKhoData || [],
                        reportData: reportData || []
                    });

                    // Xử lý dữ liệu
                    if (tonKhoData && phieuData && chiTietData) {
                        processData(tonKhoData, phieuData, chiTietData, reportData || []);
                    } else {
                        console.error("Thiếu dữ liệu cần thiết");
                        toast.error("Không thể tải đủ dữ liệu. Vui lòng thử lại.");
                    }
                } else {
                    // Nếu đã có dữ liệu, chỉ xử lý lại dữ liệu với bộ lọc ngày mới
                    processData(
                        rawData.hangHoaList,
                        rawData.phieuList,
                        rawData.chiTietList,
                        rawData.reportData
                    );
                }
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu dashboard:', error);
                toast.error('Không thể tải dữ liệu. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [dateRange, rawData]);
    // Thêm hàm này vào Dashboard.jsx (sao chép từ TonKhoManagerPC)
    const tinhToanTonKhoDashboard = (tonKhoData, phieuList, chiTietList) => {
        // Tạo đối tượng lưu trữ thông tin tồn kho theo mã hàng
        const tonKhoMap = {};

        // Khởi tạo dữ liệu tồn kho từ danh sách hàng hóa
        tonKhoData.forEach(item => {
            tonKhoMap[item['MÃ HÀNG']] = {
                'MÃ HÀNG': item['MÃ HÀNG'],
                'TÊN HÀNG': item['TÊN HÀNG'],
                'LOẠI': item['LOẠI'],
                'ĐƠN VỊ TÍNH': item['ĐƠN VỊ TÍNH'],
                'ĐƠN GIÁ': item['ĐƠN GIÁ'],
                'TỒN ĐẦU KỲ': 0,
                'NHẬP TRONG KỲ': 0,
                'XUẤT TRONG KỲ': 0,
                'TỒN CUỐI KỲ': 0,
                'GIÁ TRỊ TỒN KHO': 0
            };
        });

        // Lấy mốc thời gian
        const tuNgay = new Date(dateRange.start);
        tuNgay.setHours(0, 0, 0, 0);

        const denNgay = new Date(dateRange.end);
        denNgay.setHours(23, 59, 59, 999);

        // Xử lý dữ liệu giao dịch
        phieuList.forEach(phieu => {
            const ngayGD = new Date(phieu['NGÀY GD']);
            const maPhieu = phieu['MÃ PHIẾU'];
            const loaiPhieu = phieu['LOẠI PHIẾU'];

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
                }
            });
        });

        // Tính toán tồn cuối kỳ và giá trị tồn kho
        Object.values(tonKhoMap).forEach(item => {
            item['TỒN CUỐI KỲ'] = item['TỒN ĐẦU KỲ'] + item['NHẬP TRONG KỲ'] - item['XUẤT TRONG KỲ'];
            item['GIÁ TRỊ TỒN KHO'] = item['TỒN CUỐI KỲ'] * item['ĐƠN GIÁ'];
        });

        // Log để debug
        console.log("Kết quả tính tồn kho:", Object.values(tonKhoMap));
        return Object.values(tonKhoMap);
    };

    const processData = (tonKhoData, phieuData, chiTietData, reportData = []) => {
        try {
            // Tính toán tồn kho sử dụng cùng phương pháp với TonKhoManagerPC
            const processedTonKhoData = tinhToanTonKhoDashboard(tonKhoData, phieuData, chiTietData);

            // Filter transactions by date range
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);

            const filteredPhieu = phieuData.filter(phieu => {
                const phieuDate = new Date(phieu['NGÀY GD']);
                return phieuDate >= startDate && phieuDate <= endDate;
            });

            // Tính tổng giá trị tồn kho từ dữ liệu đã được xử lý
            const totalInventoryValue = processedTonKhoData.reduce((sum, item) => {
                return sum + item['GIÁ TRỊ TỒN KHO'];
            }, 0);

            console.log("Tổng giá trị tồn kho:", totalInventoryValue);

            // Tính các giá trị khác từ dữ liệu đã xử lý
            const totalProducts = processedTonKhoData.length;
            const rawMaterials = processedTonKhoData.filter(item => item['LOẠI'] === 'NGUYÊN VẬT LIỆU').length;
            const finishedProducts = processedTonKhoData.filter(item => item['LOẠI'] === 'THÀNH PHẨM').length;

            // Find low stock items từ dữ liệu đã xử lý
            const lowStockItems = processedTonKhoData
                .filter(item => parseFloat(item['TỒN CUỐI KỲ'] || 0) < 10)
                .sort((a, b) => parseFloat(a['TỒN CUỐI KỲ'] || 0) - parseFloat(b['TỒN CUỐI KỲ'] || 0))
                .slice(0, 5);

            // Calculate inventory value by category từ dữ liệu đã xử lý
            const inventoryByCategory = processedTonKhoData.reduce((acc, item) => {
                const category = item['LOẠI'] || 'Khác';
                const value = item['GIÁ TRỊ TỒN KHO'] || 0;

                if (!acc[category]) {
                    acc[category] = 0;
                }

                acc[category] += value;
                return acc;
            }, {});

            // Format data for pie chart
            const inventoryValue = Object.keys(inventoryByCategory).map(key => ({
                name: key,
                value: inventoryByCategory[key]
            }));

            // Filter transactions by date range


            // Get recent transactions
            const recentTransactions = filteredPhieu
                .sort((a, b) => new Date(b['NGÀY GD']) - new Date(a['NGÀY GD']))
                .slice(0, 5);

            // Create product categories data
            const productCategories = [
                { name: 'Nguyên vật liệu', value: rawMaterials },
                { name: 'Thành phẩm', value: finishedProducts }
            ];

            // Group transactions by month for financial chart
            const monthlyData = filteredPhieu.reduce((acc, phieu) => {
                const date = new Date(phieu['NGÀY GD']);
                const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

                if (!acc[monthYear]) {
                    acc[monthYear] = {
                        month: monthYear,
                        nhapKho: 0,
                        xuatKho: 0
                    };
                }

                const tongTien = parseFloat(phieu['TỔNG TIỀN'] || 0);

                if (phieu['LOẠI PHIẾU'] === 'NHẬP KHO') {
                    acc[monthYear].nhapKho += tongTien;
                } else if (phieu['LOẠI PHIẾU'] === 'XUẤT KHO') {
                    acc[monthYear].xuatKho += tongTien;
                }

                return acc;
            }, {});

            // Convert to array and sort by date
            const monthlyFinancials = Object.values(monthlyData)
                .sort((a, b) => {
                    const [aMonth, aYear] = a.month.split('/').map(Number);
                    const [bMonth, bYear] = b.month.split('/').map(Number);

                    if (aYear !== bYear) return aYear - bYear;
                    return aMonth - bMonth;
                });

            // Calculate production overview from reports
            const productionOverview = Array.isArray(reportData) ? reportData
                .filter(report => report['TRẠNG THÁI'] === 'Đã duyệt')
                .reduce((acc, report) => {
                    const congDoan = report['CÔNG ĐOẠN'];

                    if (!acc[congDoan]) {
                        acc[congDoan] = {
                            name: congDoan,
                            volume: 0
                        };
                    }

                    acc[congDoan].volume += parseFloat(report['KHỐI LƯỢNG'] || 0);
                    return acc;
                }, {}) : {};

            // Update dashboard data
            setDashboardData({
                inventorySummary: {
                    totalProducts,
                    rawMaterials,
                    finishedProducts,
                    totalValue: totalInventoryValue
                },
                productCategories,
                recentTransactions,
                lowStockItems,
                inventoryValue,
                productionOverview: Object.values(productionOverview).sort((a, b) => b.volume - a.volume).slice(0, 5),
                monthlyFinancials
            });

            console.log("Dashboard data updated:", {
                totalProducts,
                totalValue: totalInventoryValue,
                lowStockItems: lowStockItems.length,
                recentTransactions: recentTransactions.length
            });
        } catch (error) {
            console.error('Error processing dashboard data:', error);
            toast.error('Không thể xử lý dữ liệu tổng quan. Vui lòng thử lại.');
        }
    };

    const handleTimeFilterChange = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setDateRange({ start, end });

        // Không cần gọi API lại, useEffect sẽ xử lý với dữ liệu đã lưu
    };

    // Format currency
    const formatCurrency = (value) => {
        return value.toLocaleString('vi-VN') + ' đ';
    };

    // Shortcut navigation handlers
    const navigateToInventory = () => navigate('/tonkho');
    const navigateToTransactions = () => navigate('/xuatnhapkho');
    const navigateToProducts = () => navigate('/dmhh');
    const navigateToReports = () => navigate('/baocaoreport');

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Warehouse className="h-8 w-8 text-indigo-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">
                                    Tổng quan hệ thống quản lý kho
                                </h1>
                                <p className="text-gray-500">
                                    Xem báo cáo tổng quan từ {dateRange.start.toLocaleDateString('vi-VN')} đến {dateRange.end.toLocaleDateString('vi-VN')}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4 md:mt-0">
                            <button
                                onClick={() => handleTimeFilterChange(7)}
                                className={`px-3 py-1.5 rounded-lg text-sm ${dateRange.end.getDate() - dateRange.start.getDate() === 7
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                    : 'bg-white text-gray-700 border border-gray-300'
                                    }`}
                            >
                                7 ngày
                            </button>
                            <button
                                onClick={() => handleTimeFilterChange(30)}
                                className={`px-3 py-1.5 rounded-lg text-sm ${dateRange.end.getDate() - dateRange.start.getDate() === 30
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                    : 'bg-white text-gray-700 border border-gray-300'
                                    }`}
                            >
                                30 ngày
                            </button>
                            <button
                                onClick={() => handleTimeFilterChange(90)}
                                className={`px-3 py-1.5 rounded-lg text-sm ${dateRange.end.getDate() - dateRange.start.getDate() === 90
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                    : 'bg-white text-gray-700 border border-gray-300'
                                    }`}
                            >
                                90 ngày
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200 shadow-sm transition-transform duration-200 hover:shadow-md hover:scale-[1.02]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-indigo-600 font-medium">Tồn kho hiện tại</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                        {loading ? '...' : formatCurrency(dashboardData.inventorySummary.totalValue)}
                                    </h3>
                                    <p className="text-xs text-indigo-500 mt-1">
                                        {loading ? '...' : `${dashboardData.inventorySummary.totalProducts} mặt hàng`}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-indigo-200 rounded-full flex items-center justify-center">
                                    <Warehouse className="h-6 w-6 text-indigo-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm transition-transform duration-200 hover:shadow-md hover:scale-[1.02]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Giao dịch nhập/xuất</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                        {loading ? '...' : dashboardData.recentTransactions.length}
                                    </h3>
                                    <p className="text-xs text-green-500 mt-1">
                                        Trong {(dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)} ngày qua
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-green-200 rounded-full flex items-center justify-center">
                                    <ShoppingCart className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200 shadow-sm transition-transform duration-200 hover:shadow-md hover:scale-[1.02]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-amber-600 font-medium">Nguyên vật liệu</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                        {loading ? '...' : dashboardData.inventorySummary.rawMaterials}
                                    </h3>
                                    <p className="text-xs text-amber-500 mt-1">
                                        Loại nguyên vật liệu
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-amber-200 rounded-full flex items-center justify-center">
                                    <Package className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm transition-transform duration-200 hover:shadow-md hover:scale-[1.02]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 font-medium">Cảnh báo kho</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                        {loading ? '...' : dashboardData.lowStockItems.length}
                                    </h3>
                                    <p className="text-xs text-red-500 mt-1">
                                        Mặt hàng sắp hết
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-red-200 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 flex flex-wrap gap-2">
                        <button
                            onClick={navigateToInventory}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                        >
                            <Warehouse className="h-4 w-4" />
                            Quản lý tồn kho
                        </button>
                        <button
                            onClick={navigateToTransactions}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            Nhập xuất kho
                        </button>
                        <button
                            onClick={navigateToProducts}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 transition-colors"
                        >
                            <Package className="h-4 w-4" />
                            Danh mục hàng hóa
                        </button>
                        <button
                            onClick={navigateToReports}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            Báo cáo sản xuất
                        </button>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Chart 1: Inventory Value by Category */}
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Giá trị tồn kho theo loại</h2>
                        <div className="h-72">
                            {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dashboardData.inventoryValue}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {dashboardData.inventoryValue.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Monthly Financials */}
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Giá trị nhập xuất theo tháng</h2>
                        <div className="h-72">
                            {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboardData.monthlyFinancials}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                        <Bar dataKey="nhapKho" name="Nhập kho" fill="#0088FE" />
                                        <Bar dataKey="xuatKho" name="Xuất kho" fill="#00C49F" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 3: Production by Stage */}
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Sản lượng theo công đoạn</h2>
                        <div className="h-72">
                            {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboardData.productionOverview}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="volume" name="Sản lượng" fill="#8884d8">
                                            {dashboardData.productionOverview.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 4: Product Categories */}
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Phân loại hàng hóa</h2>
                        <div className="h-72">
                            {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dashboardData.productCategories}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {dashboardData.productCategories.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tables Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Transactions */}
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Giao dịch gần đây</h2>
                            <button
                                onClick={navigateToTransactions}
                                className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                            >
                                Xem tất cả <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mã phiếu
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Loại
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ngày GD
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Giá trị
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        Array(5).fill(0).map((_, index) => (
                                            <tr key={index} className="animate-pulse">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : dashboardData.recentTransactions.length > 0 ? (
                                        dashboardData.recentTransactions.map((transaction) => (
                                            <tr key={transaction['MÃ PHIẾU']} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                                                    {transaction['MÃ PHIẾU']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <div className="flex items-center">
                                                        {transaction['LOẠI PHIẾU'] === 'NHẬP KHO' ? (
                                                            <ArrowDownCircle className="h-4 w-4 text-green-500 mr-1" />
                                                        ) : (
                                                            <ArrowUpCircle className="h-4 w-4 text-red-500 mr-1" />
                                                        )}
                                                        {transaction['LOẠI PHIẾU']}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(transaction['NGÀY GD']).toLocaleDateString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                                                    {formatCurrency(parseFloat(transaction['TỔNG TIỀN'] || 0))}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-3 text-center text-sm text-gray-500">
                                                Không có giao dịch nào trong khoảng thời gian này
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Low Stock Items */}
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Mặt hàng sắp hết</h2>
                            <button
                                onClick={navigateToInventory}
                                className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                            >
                                Xem tất cả <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mã hàng
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tên hàng
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tồn kho
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Giá trị
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        Array(5).fill(0).map((_, index) => (
                                            <tr key={index} className="animate-pulse">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : dashboardData.lowStockItems.length > 0 ? (
                                        dashboardData.lowStockItems.map((item) => (
                                            <tr key={item['MÃ HÀNG']} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                                                    {item['MÃ HÀNG']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    {item['TÊN HÀNG']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                                    <span className="font-medium text-red-600">
                                                        {parseFloat(item['TỒN CUỐI KỲ'] || 0).toLocaleString('vi-VN')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                                                    {formatCurrency(parseFloat(item['TỒN CUỐI KỲ'] || 0) * parseFloat(item['ĐƠN GIÁ'] || 0))}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-3 text-center text-sm text-gray-500">
                                                Không có mặt hàng nào sắp hết
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 mt-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Hiệu suất sản xuất theo thời gian</h2>
                    <div className="h-80">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={dashboardData.monthlyFinancials}
                                    margin={{
                                        top: 5,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="nhapKho"
                                        name="Giá trị nhập kho"
                                        stroke="#8884d8"
                                        activeDot={{ r: 8 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="xuatKho"
                                        name="Giá trị xuất kho"
                                        stroke="#82ca9d"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast notifications */}
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
            />
        </div>
    );
};

export default Dashboard;