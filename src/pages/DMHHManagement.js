import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, Package, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, AlertTriangle, Archive, Eye, Calendar, DollarSign, Layers } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const DMHHManagement = () => {
    // State Management
    const [dmhhItems, setDmhhItems] = useState([]);
    const [tonKho, setTonKho] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        'NHOM_HANG': '',
        'DAY': '',
        'RONG': '',
        'DAI': '',
        'DONGIA_HIEULUC': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedItemDetail, setSelectedItemDetail] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [originalNhomHang, setOriginalNhomHang] = useState('');

    // Thêm state cho filter
    const [priceFilter, setPriceFilter] = useState('all'); // 'all', 'with-price', 'no-price'
    const [stockFilter, setStockFilter] = useState('all'); // 'all', 'in-stock', 'out-of-stock'

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';

            return date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return 'N/A';
        }
    };

    // Tự động tạo NHOM_HANG từ các thông tin đã nhập
    const generateNhomHang = (day, rong, dai) => {
        if (!day || !rong || !dai) return '';
        return `${day}*${rong}*${dai}`;
    };

    // Tính tồn kho cho từng nhóm hàng
    const getTonKhoByNhomHang = (nhomHang) => {
        const kienTon = tonKho.filter(item =>
            item['NHOM_HANG'] === nhomHang &&
            item['NGHIEP_VU'] === 'NHAP'
        );
        return kienTon.length;
    };

    // Tính tổng khối lượng tồn kho
    const getTongKhoiLuongTon = (nhomHang) => {
        const kienTon = tonKho.filter(item =>
            item['NHOM_HANG'] === nhomHang &&
            item['NGHIEP_VU'] === 'NHAP'
        );
        return kienTon.reduce((sum, item) => sum + (parseFloat(item['SO_KHOI']) || 0), 0);
    };

    // Lấy danh sách kiện tồn kho chi tiết
    const getChiTietTonKho = (nhomHang) => {
        return tonKho.filter(item =>
            item['NHOM_HANG'] === nhomHang &&
            item['NGHIEP_VU'] === 'NHAP'
        );
    };

    // Fetch data
    const fetchDMHH = async () => {
        try {
            setIsLoading(true);
            const response = await authUtils.apiRequestKHO('DMHH', 'Find', {});
            setDmhhItems(response);
        } catch (error) {
            console.error('Error fetching DMHH list:', error);
            toast.error('Lỗi khi tải danh mục hàng hóa');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTonKho = async () => {
        try {
            const response = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});
            setTonKho(response);
        } catch (error) {
            console.error('Error fetching ton kho:', error);
            toast.error('Lỗi khi tải tồn kho');
        }
    };

    useEffect(() => {
        fetchDMHH();
        fetchTonKho();
    }, []);

    // Tự động cập nhật NHOM_HANG khi các trường thay đổi
    useEffect(() => {
        if (!isEditMode) {
            const newNhomHang = generateNhomHang(
                currentItem['DAY'],
                currentItem['RONG'],
                currentItem['DAI']
            );
            if (newNhomHang && newNhomHang !== currentItem['NHOM_HANG']) {
                setCurrentItem(prev => ({
                    ...prev,
                    'NHOM_HANG': newNhomHang
                }));
            }
        }
    }, [currentItem['DAY'], currentItem['RONG'], currentItem['DAI'], isEditMode]);

    // Modal handlers
    const handleOpenModal = (item = null) => {
        if (item) {
            setIsEditMode(true);
            setOriginalNhomHang(item['NHOM_HANG']);
            setCurrentItem({
                'NHOM_HANG': item['NHOM_HANG'] || '',
                'DAY': item['DAY'] || '',
                'RONG': item['RONG'] || '',
                'DAI': item['DAI'] || '',
                'DONGIA_HIEULUC': item['DONGIA_HIEULUC'] || ''
            });
        } else {
            setIsEditMode(false);
            setOriginalNhomHang('');
            setCurrentItem({
                'NHOM_HANG': '',
                'DAY': '',
                'RONG': '',
                'DAI': '',
                'DONGIA_HIEULUC': ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setOriginalNhomHang('');
        setCurrentItem({
            'NHOM_HANG': '',
            'DAY': '',
            'RONG': '',
            'DAI': '',
            'DONGIA_HIEULUC': ''
        });
    };

    // Detail modal handlers
    const handleOpenDetailModal = (item) => {
        setSelectedItemDetail(item);
        setShowDetailModal(true);
    };

    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setSelectedItemDetail(null);
    };

    // Form handlers
    const handleInputChange = (field, value) => {
        setCurrentItem(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateItem = (item) => {
        const errors = [];

        if (!item['DAY']) {
            errors.push('Dày không được để trống');
        }

        if (!item['RONG']) {
            errors.push('Rộng không được để trống');
        }

        if (!item['DAI']) {
            errors.push('Dài không được để trống');
        }

        if (!item['NHOM_HANG']) {
            errors.push('Nhóm hàng không được tạo. Vui lòng kiểm tra lại thông tin');
        }

        return errors;
    };

    // Save item
    const handleSaveItem = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateItem(currentItem);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                setIsSubmitting(false);
                return;
            }

            const itemToSave = {
                'NHOM_HANG': currentItem['NHOM_HANG'],
                'DAY': currentItem['DAY'],
                'RONG': currentItem['RONG'],
                'DAI': currentItem['DAI'],
                'DONGIA_HIEULUC': currentItem['DONGIA_HIEULUC']
            };

            if (isEditMode) {
                const newNhomHang = generateNhomHang(
                    itemToSave['DAY'],
                    itemToSave['RONG'],
                    itemToSave['DAI']
                );

                if (originalNhomHang !== newNhomHang) {
                    const soKienTon = getTonKhoByNhomHang(originalNhomHang);
                    if (soKienTon > 0) {
                        toast.error(`Không thể thay đổi kích thước! Nhóm hàng này còn ${soKienTon} kiện tồn kho.`);
                        setIsSubmitting(false);
                        return;
                    }

                    const existingItem = dmhhItems.find(
                        item => item['NHOM_HANG'] === newNhomHang
                    );

                    if (existingItem) {
                        toast.error('Nhóm hàng mới này đã tồn tại!');
                        setIsSubmitting(false);
                        return;
                    }

                    await authUtils.apiRequestKHO('DMHH', 'Delete', {
                        "Rows": [{ "NHOM_HANG": originalNhomHang }]
                    });

                    itemToSave['NHOM_HANG'] = newNhomHang;

                    await authUtils.apiRequestKHO('DMHH', 'Add', {
                        "Rows": [itemToSave]
                    });
                    toast.success('Cập nhật hàng hóa thành công!');
                } else {
                    await authUtils.apiRequestKHO('DMHH', 'Edit', {
                        "Rows": [itemToSave]
                    });
                    toast.success('Cập nhật hàng hóa thành công!');
                }
            } else {
                const existingItem = dmhhItems.find(
                    item => item['NHOM_HANG'] === itemToSave['NHOM_HANG']
                );

                if (existingItem) {
                    toast.error('Nhóm hàng này đã tồn tại!');
                    setIsSubmitting(false);
                    return;
                }

                await authUtils.apiRequestKHO('DMHH', 'Add', {
                    "Rows": [itemToSave]
                });
                toast.success('Thêm hàng hóa mới thành công!');
            }

            await fetchDMHH();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving DMHH:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu hàng hóa'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handlers
    const handleOpenDeleteConfirmation = (item, e) => {
        e.stopPropagation();
        const soKienTon = getTonKhoByNhomHang(item['NHOM_HANG']);
        if (soKienTon > 0) {
            toast.error(
                `Không thể xóa! Nhóm hàng "${item['NHOM_HANG']}" còn ${soKienTon} kiện tồn kho.`,
                { autoClose: 5000 }
            );
            return;
        }

        setItemToDelete(item);
        setShowDeleteConfirmation(true);
    };

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
        setItemToDelete(null);
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;

        try {
            const soKienTon = getTonKhoByNhomHang(itemToDelete['NHOM_HANG']);
            if (soKienTon > 0) {
                toast.error(`Không thể xóa! Nhóm hàng này còn ${soKienTon} kiện tồn kho.`);
                handleCloseDeleteConfirmation();
                return;
            }

            await authUtils.apiRequestKHO('DMHH', 'Delete', {
                "Rows": [{ "NHOM_HANG": itemToDelete['NHOM_HANG'] }]
            });
            toast.success('Xóa hàng hóa thành công!');
            await fetchDMHH();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting DMHH:', error);
            toast.error('Có lỗi xảy ra khi xóa hàng hóa');
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

    const getSortedItems = useCallback(() => {
        const sortableItems = [...dmhhItems];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                // XỬ LÝ SẮP XẾP THEO TỒN KHO
                if (sortConfig.key === 'TON_KHO') {
                    const tonKhoA = getTonKhoByNhomHang(a['NHOM_HANG']);
                    const tonKhoB = getTonKhoByNhomHang(b['NHOM_HANG']);
                    return sortConfig.direction === 'ascending' ? tonKhoA - tonKhoB : tonKhoB - tonKhoA;
                }

                const keyA = a[sortConfig.key] || '';
                const keyB = b[sortConfig.key] || '';

                if (sortConfig.key === 'DONGIA_HIEULUC') {
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
        return sortableItems;
    }, [dmhhItems, sortConfig, tonKho]);

    // Filtering
    const filteredItems = getSortedItems().filter(item => {
        const matchesSearch =
            (item['NHOM_HANG']?.toLowerCase().includes(search.toLowerCase()) ||
                item['DAY']?.toString().includes(search) ||
                item['RONG']?.toString().includes(search) ||
                item['DAI']?.toString().includes(search));

        // Filter theo giá
        let matchesPriceFilter = true;
        if (priceFilter === 'with-price') {
            matchesPriceFilter = item['DONGIA_HIEULUC'] && item['DONGIA_HIEULUC'] > 0;
        } else if (priceFilter === 'no-price') {
            matchesPriceFilter = !item['DONGIA_HIEULUC'] || item['DONGIA_HIEULUC'] === 0;
        }

        // Filter theo tồn kho
        let matchesStockFilter = true;
        if (stockFilter === 'in-stock') {
            matchesStockFilter = getTonKhoByNhomHang(item['NHOM_HANG']) > 0;
        } else if (stockFilter === 'out-of-stock') {
            matchesStockFilter = getTonKhoByNhomHang(item['NHOM_HANG']) === 0;
        }

        return matchesSearch && matchesPriceFilter && matchesStockFilter;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage, priceFilter, stockFilter]);

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
        await fetchDMHH();
        await fetchTonKho();
        toast.success('Đã tải lại dữ liệu thành công!');
    };

    // XỬ LÝ CLICK VÀO STATISTIC CARDS
    const handleStatisticCardClick = (filterType) => {
        // Reset các filter khác
        if (filterType === 'all') {
            setPriceFilter('all');
            setStockFilter('all');
            setSortConfig({ key: null, direction: 'ascending' });
        } else if (filterType === 'with-price') {
            setPriceFilter('with-price');
            setStockFilter('all');
        } else if (filterType === 'no-price') {
            setPriceFilter('no-price');
            setStockFilter('all');
        } else if (filterType === 'in-stock') {
            setPriceFilter('all');
            setStockFilter('in-stock');
        }

        // Hiển thị filters nếu đang ẩn
        if (!showFilters) {
            setShowFilters(true);
        }

        toast.info(`Đã lọc theo: ${filterType === 'all' ? 'Tất cả' :
            filterType === 'with-price' ? 'Có giá hiệu lực' :
                filterType === 'no-price' ? 'Chưa có giá' :
                    'Có tồn kho'
            }`);
    };

    // TÍNH TOÁN THỐNG KÊ THEO BỘ LỌC
    const getFilteredStatistics = () => {
        // Tổng số hàng hóa sau khi lọc
        const totalItems = filteredItems.length;

        // Số hàng hóa có giá sau khi lọc
        const itemsWithPrice = filteredItems.filter(item =>
            item['DONGIA_HIEULUC'] && item['DONGIA_HIEULUC'] > 0
        ).length;

        // Số hàng hóa chưa có giá sau khi lọc
        const itemsWithoutPrice = filteredItems.filter(item =>
            !item['DONGIA_HIEULUC'] || item['DONGIA_HIEULUC'] === 0
        ).length;

        // Tính tổng số kiện tồn và tổng m³ theo bộ lọc
        let totalKienTon = 0;
        let totalKhoiLuong = 0;

        filteredItems.forEach(item => {
            const soKien = getTonKhoByNhomHang(item['NHOM_HANG']);
            const khoiLuong = getTongKhoiLuongTon(item['NHOM_HANG']);
            totalKienTon += soKien;
            totalKhoiLuong += khoiLuong;
        });

        return {
            totalItems,
            itemsWithPrice,
            itemsWithoutPrice,
            totalKienTon,
            totalKhoiLuong
        };
    };

    const statistics = getFilteredStatistics();

    return (
        <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">Danh Mục Hàng Hóa</h1>
                                <p className="text-xs text-gray-500 mt-0.5">Quản lý thông tin hàng hóa và giá bán</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleRefresh}
                                className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 flex items-center gap-1.5 transition-all shadow-sm text-sm"
                                title="Tải lại dữ liệu"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="hidden sm:inline">Làm mới</span>
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm text-sm ${showFilters
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm hàng hóa
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    {showFilters && (
                        <div className="mb-3 animate-fadeIn space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo nhóm hàng, kích thước..."
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Bộ lọc nâng cao */}
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-600">Giá:</span>
                                    <button
                                        onClick={() => setPriceFilter('all')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${priceFilter === 'all'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Tất cả
                                    </button>
                                    <button
                                        onClick={() => setPriceFilter('with-price')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${priceFilter === 'with-price'
                                            ? 'bg-green-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Có giá
                                    </button>
                                    <button
                                        onClick={() => setPriceFilter('no-price')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${priceFilter === 'no-price'
                                            ? 'bg-orange-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Chưa có giá
                                    </button>
                                </div>

                                <div className="h-6 w-px bg-gray-300"></div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-600">Tồn kho:</span>
                                    <button
                                        onClick={() => setStockFilter('all')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${stockFilter === 'all'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Tất cả
                                    </button>
                                    <button
                                        onClick={() => setStockFilter('in-stock')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${stockFilter === 'in-stock'
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Còn hàng
                                    </button>
                                    <button
                                        onClick={() => setStockFilter('out-of-stock')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${stockFilter === 'out-of-stock'
                                            ? 'bg-gray-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Hết hàng
                                    </button>
                                </div>

                                {(priceFilter !== 'all' || stockFilter !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setPriceFilter('all');
                                            setStockFilter('all');
                                            toast.info('Đã xóa bộ lọc');
                                        }}
                                        className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" />
                                        Xóa bộ lọc
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Statistics cards - CẬP NHẬT: Hiển thị theo bộ lọc và thêm 2 cards mới */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                        <div
                            onClick={() => handleStatisticCardClick('all')}
                            className={`bg-gradient-to-br from-blue-50 to-blue-100 border-2 rounded-lg p-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-105 ${priceFilter === 'all' && stockFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-blue-700 mb-0.5">Tổng hàng hóa</h3>
                                    <p className="text-2xl font-bold text-blue-900">{statistics.totalItems}</p>
                                </div>
                                <div className="p-2 bg-blue-200 rounded-lg">
                                    <Package className="w-5 h-5 text-blue-700" />
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => handleStatisticCardClick('with-price')}
                            className={`bg-gradient-to-br from-green-50 to-green-100 border-2 rounded-lg p-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-105 ${priceFilter === 'with-price' ? 'border-green-500 ring-2 ring-green-200' : 'border-green-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-green-700 mb-0.5">Có giá hiệu lực</h3>
                                    <p className="text-2xl font-bold text-green-900">{statistics.itemsWithPrice}</p>
                                </div>
                                <div className="p-2 bg-green-200 rounded-lg">
                                    <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => handleStatisticCardClick('no-price')}
                            className={`bg-gradient-to-br from-orange-50 to-orange-100 border-2 rounded-lg p-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-105 ${priceFilter === 'no-price' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-orange-700 mb-0.5">Chưa có giá</h3>
                                    <p className="text-2xl font-bold text-orange-900">{statistics.itemsWithoutPrice}</p>
                                </div>
                                <div className="p-2 bg-orange-200 rounded-lg">
                                    <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => handleStatisticCardClick('in-stock')}
                            className={`bg-gradient-to-br from-purple-50 to-purple-100 border-2 rounded-lg p-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-105 ${stockFilter === 'in-stock' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-purple-700 mb-0.5">Loại có tồn</h3>
                                    <p className="text-2xl font-bold text-purple-900">
                                        {filteredItems.filter(item => getTonKhoByNhomHang(item['NHOM_HANG']) > 0).length}
                                    </p>
                                </div>
                                <div className="p-2 bg-purple-200 rounded-lg">
                                    <Archive className="w-5 h-5 text-purple-700" />
                                </div>
                            </div>
                        </div>

                        {/* CARD MỚI: Tổng số kiện tồn */}
                        <div
                            className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-3 shadow-sm transition-all hover:shadow-md hover:scale-105"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-indigo-700 mb-0.5">Tổng kiện tồn</h3>
                                    <p className="text-2xl font-bold text-indigo-900">{statistics.totalKienTon}</p>
                                    <p className="text-xs text-indigo-600 mt-0.5">kiện</p>
                                </div>
                                <div className="p-2 bg-indigo-200 rounded-lg">
                                    <Layers className="w-5 h-5 text-indigo-700" />
                                </div>
                            </div>
                        </div>

                        {/* CARD MỚI: Tổng khối lượng (m³) */}
                        <div
                            className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 rounded-lg p-3 shadow-sm transition-all hover:shadow-md hover:scale-105"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-teal-700 mb-0.5">Tổng khối lượng</h3>
                                    <p className="text-2xl font-bold text-teal-900">{statistics.totalKhoiLuong.toFixed(2)}</p>
                                    <p className="text-xs text-teal-600 mt-0.5">m³</p>
                                </div>
                                <div className="p-2 bg-teal-200 rounded-lg">
                                    <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items per page selector */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 font-medium">Hiển thị:</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                            >
                                <option value={5}>5 mục</option>
                                <option value={10}>10 mục</option>
                                <option value={20}>20 mục</option>
                                <option value={50}>50 mục</option>
                                <option value={100}>100 mục</option>
                            </select>
                        </div>
                        <div className="text-xs text-gray-600">
                            Hiển thị <span className="font-semibold text-gray-800">{indexOfFirstItem + 1}</span> - <span className="font-semibold text-gray-800">{Math.min(indexOfLastItem, filteredItems.length)}</span> trong tổng số <span className="font-semibold text-gray-800">{filteredItems.length}</span> mục
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                                    <p className="text-gray-600 text-sm">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col"
                                            className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('NHOM_HANG')}>
                                            <div className="flex items-center gap-1">
                                                Nhóm hàng {getSortIcon('NHOM_HANG')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('DAY')}>
                                            <div className="flex items-center gap-1">
                                                Dày {getSortIcon('DAY')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('RONG')}>
                                            <div className="flex items-center gap-1">
                                                Rộng {getSortIcon('RONG')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('DAI')}>
                                            <div className="flex items-center gap-1">
                                                Dài {getSortIcon('DAI')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('DONGIA_HIEULUC')}>
                                            <div className="flex items-center gap-1">
                                                Đơn giá hiệu lực {getSortIcon('DONGIA_HIEULUC')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('TON_KHO')}>
                                            <div className="flex items-center justify-center gap-1">
                                                Tồn kho {getSortIcon('TON_KHO')}
                                            </div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((item, index) => {
                                            const soKienTon = getTonKhoByNhomHang(item['NHOM_HANG']);
                                            const tongKhoiLuong = getTongKhoiLuongTon(item['NHOM_HANG']);
                                            const coTonKho = soKienTon > 0;

                                            return (
                                                <tr
                                                    key={item['NHOM_HANG']}
                                                    onClick={() => handleOpenDetailModal(item)}
                                                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                                >
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <span className="px-2 py-1 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded-lg text-xs font-semibold">
                                                            {item['NHOM_HANG']}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item['DAY']}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item['RONG']}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item['DAI']}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                        {item['DONGIA_HIEULUC'] && item['DONGIA_HIEULUC'] > 0 ? (
                                                            <span className="font-bold text-green-600">
                                                                {formatCurrency(item['DONGIA_HIEULUC'])}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 italic text-xs">Chưa có giá</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-center">
                                                        {coTonKho ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                                                                    {soKienTon} kiện
                                                                </span>
                                                                <span className="text-xs text-gray-600 mt-0.5">
                                                                    {tongKhoiLuong.toFixed(3)} m³
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic text-xs">Không tồn</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                                                        <div className="flex justify-center space-x-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenModal(item);
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-100 transition-all"
                                                                title="Sửa hàng hóa"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleOpenDeleteConfirmation(item, e)}
                                                                disabled={coTonKho}
                                                                className={`p-1.5 rounded-lg transition-all ${coTonKho
                                                                    ? 'text-gray-400 cursor-not-allowed opacity-50'
                                                                    : 'text-red-600 hover:text-red-900 hover:bg-red-100'
                                                                    }`}
                                                                title={coTonKho ? `Không thể xóa (còn ${soKienTon} kiện tồn)` : 'Xóa hàng hóa'}
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Package className="w-12 h-12 text-gray-300 mb-3" />
                                                    <p className="text-base font-medium">Không tìm thấy hàng hóa nào</p>
                                                    <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredItems.length > 0 && (
                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-xs text-gray-600">
                                Trang <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={goToFirstPage}
                                    disabled={currentPage === 1}
                                    className={`p-1.5 rounded-lg border transition-all ${currentPage === 1
                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                    title="Trang đầu"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                    className={`p-1.5 rounded-lg border transition-all ${currentPage === 1
                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                    title="Trang trước"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {getPageNumbers().map((page, index) => (
                                        page === '...' ? (
                                            <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-500 text-xs">...</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`min-w-[32px] px-2 py-1 rounded-lg border font-medium transition-all text-xs ${currentPage === page
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
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
                                    className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages
                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                    title="Trang sau"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={goToLastPage}
                                    disabled={currentPage === totalPages}
                                    className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages
                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                    title="Trang cuối"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal - XEM CHI TIẾT */}
            {showDetailModal && selectedItemDetail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full p-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Eye className="w-5 h-5 text-blue-600" />
                                </div>
                                Chi tiết hàng hóa
                            </h2>
                            <button
                                onClick={handleCloseDetailModal}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Thông tin cơ bản */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Thông tin sản phẩm */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
                                    <h3 className="text-base font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Thông tin sản phẩm
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-white rounded-lg p-2">
                                            <span className="text-xs font-medium text-gray-600">Nhóm hàng:</span>
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-bold">
                                                {selectedItemDetail['NHOM_HANG']}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white rounded-lg p-2">
                                            <span className="text-xs font-medium text-gray-600">Dày:</span>
                                            <span className="text-xs font-bold text-gray-800">{selectedItemDetail['DAY']}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white rounded-lg p-2">
                                            <span className="text-xs font-medium text-gray-600">Rộng:</span>
                                            <span className="text-xs font-bold text-gray-800">{selectedItemDetail['RONG']}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white rounded-lg p-2">
                                            <span className="text-xs font-medium text-gray-600">Dài:</span>
                                            <span className="text-xs font-bold text-gray-800">{selectedItemDetail['DAI']}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Giá và tồn kho */}
                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm">
                                    <h3 className="text-base font-semibold text-green-800 mb-3 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Giá & Tồn kho
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="bg-white rounded-lg p-3">
                                            <span className="text-xs font-medium text-gray-600 block mb-1.5">Đơn giá hiệu lực:</span>
                                            {selectedItemDetail['DONGIA_HIEULUC'] && selectedItemDetail['DONGIA_HIEULUC'] > 0 ? (
                                                <span className="text-xl font-bold text-green-600">
                                                    {formatCurrency(selectedItemDetail['DONGIA_HIEULUC'])}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Chưa có giá</span>
                                            )}
                                        </div>
                                        <div className="bg-white rounded-lg p-3">
                                            <span className="text-xs font-medium text-gray-600 block mb-1.5">Tồn kho:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-bold text-purple-600">
                                                    {getTonKhoByNhomHang(selectedItemDetail['NHOM_HANG'])} kiện
                                                </span>
                                                <span className="text-xs text-gray-600">
                                                    ({getTongKhoiLuongTon(selectedItemDetail['NHOM_HANG']).toFixed(3)} m³)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chi tiết tồn kho */}
                            {getTonKhoByNhomHang(selectedItemDetail['NHOM_HANG']) > 0 && (
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 shadow-sm">
                                    <h3 className="text-base font-semibold text-purple-800 mb-3 flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        Chi tiết kiện hàng tồn kho ({getTonKhoByNhomHang(selectedItemDetail['NHOM_HANG'])} kiện)
                                    </h3>
                                    <div className="bg-white rounded-lg overflow-hidden">
                                        <div className="max-h-96 overflow-y-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-purple-100 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-purple-800 uppercase">STT</th>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-purple-800 uppercase">Số phiếu</th>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-purple-800 uppercase">Mã kiện</th>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-purple-800 uppercase">Số thanh</th>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-purple-800 uppercase">Số khối (m³)</th>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-purple-800 uppercase">Tiêu chuẩn</th>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-purple-800 uppercase">Ngày nhập</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {getChiTietTonKho(selectedItemDetail['NHOM_HANG']).map((kien, index) => (
                                                        <tr key={kien['ID_CT'] || index} className="hover:bg-purple-50 transition-colors">
                                                            <td className="px-3 py-2 text-xs text-gray-900">{index + 1}</td>
                                                            <td className="px-3 py-2 text-xs font-medium text-blue-600">
                                                                {kien['SOPHIEU']}
                                                            </td>
                                                            <td className="px-3 py-2 text-xs">
                                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded font-semibold">
                                                                    {kien['MA_KIEN'] || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-xs font-bold text-orange-600">
                                                                {kien['THANH'] || 0}
                                                            </td>
                                                            <td className="px-3 py-2 text-xs font-bold text-green-600">
                                                                {parseFloat(kien['SO_KHOI'] || 0).toFixed(3)}
                                                            </td>
                                                            <td className="px-3 py-2 text-xs">
                                                                {kien['TIEU_CHUAN'] ? (
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${kien['TIEU_CHUAN'] === 'TỐT'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : kien['TIEU_CHUAN'] === 'TRUNG BÌNH'
                                                                            ? 'bg-yellow-100 text-yellow-800'
                                                                            : 'bg-red-100 text-red-800'
                                                                        }`}>
                                                                        {kien['TIEU_CHUAN']}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400 italic">N/A</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-xs text-gray-600">
                                                                {formatDate(kien['NGAY_NHAP_XUAT'])}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-purple-100">
                                                    <tr>
                                                        <td colSpan="3" className="px-3 py-2 text-xs font-bold text-purple-800">Tổng cộng:</td>
                                                        <td className="px-3 py-2 text-xs font-bold text-purple-800">
                                                            {getChiTietTonKho(selectedItemDetail['NHOM_HANG']).reduce((sum, item) =>
                                                                sum + (parseFloat(item['THANH']) || 0), 0
                                                            )} thanh
                                                        </td>
                                                        <td className="px-3 py-2 text-xs font-bold text-purple-800">
                                                            {getTongKhoiLuongTon(selectedItemDetail['NHOM_HANG']).toFixed(3)} m³
                                                        </td>
                                                        <td colSpan="2"></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Thêm thông tin tổng hợp */}
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        <div className="bg-white rounded-lg p-2 border border-purple-200">
                                            <p className="text-xs text-gray-600">Tổng kiện</p>
                                            <p className="text-lg font-bold text-purple-700">
                                                {getTonKhoByNhomHang(selectedItemDetail['NHOM_HANG'])}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border border-purple-200">
                                            <p className="text-xs text-gray-600">Tổng thanh</p>
                                            <p className="text-lg font-bold text-orange-600">
                                                {getChiTietTonKho(selectedItemDetail['NHOM_HANG']).reduce((sum, item) =>
                                                    sum + (parseFloat(item['THANH']) || 0), 0
                                                )}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border border-purple-200">
                                            <p className="text-xs text-gray-600">Tổng khối (m³)</p>
                                            <p className="text-lg font-bold text-green-600">
                                                {getTongKhoiLuongTon(selectedItemDetail['NHOM_HANG']).toFixed(3)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {getTonKhoByNhomHang(selectedItemDetail['NHOM_HANG']) === 0 && (
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6 text-center">
                                    <Archive className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 font-medium text-sm">Không có kiện hàng tồn kho</p>
                                </div>
                            )}
                        </div>

                        {/* Footer buttons */}
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
                            <button
                                onClick={handleCloseDetailModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center gap-1.5 text-sm"
                            >
                                <X className="h-4 w-4" />
                                Đóng
                            </button>
                            <button
                                onClick={() => {
                                    handleCloseDetailModal();
                                    handleOpenModal(selectedItemDetail);
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-1.5 transition-all shadow-sm text-sm"
                            >
                                <Edit className="h-4 w-4" />
                                Chỉnh sửa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-5 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Package className="w-5 h-5 text-blue-600" />
                                </div>
                                {isEditMode ? 'Cập nhật hàng hóa' : 'Thêm hàng hóa mới'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Thông tin nhập liệu */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-blue-500" />
                                    Thông tin kích thước
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Dày <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentItem['DAY']}
                                            onChange={(e) => handleInputChange('DAY', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập dày"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Rộng <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentItem['RONG']}
                                            onChange={(e) => handleInputChange('RONG', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập rộng"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Dài <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentItem['DAI']}
                                            onChange={(e) => handleInputChange('DAI', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập dài"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Nhóm hàng tự động */}
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-purple-600" />
                                    Nhóm hàng (Tự động tạo)
                                </label>
                                <div className="bg-white rounded-lg p-3 border-2 border-purple-300">
                                    {currentItem['NHOM_HANG'] ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-purple-700">
                                                {currentItem['NHOM_HANG']}
                                            </span>
                                            <span className="text-xs text-gray-600 bg-purple-100 px-2 py-1 rounded">
                                                Tự động từ thông tin trên
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic flex items-center gap-2 text-sm">
                                            <Info className="w-4 h-4" />
                                            Nhập đầy đủ thông tin để tạo nhóm hàng
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Format: Dày*Rộng*Dài
                                </p>
                            </div>

                            {/* Đơn giá hiệu lực - Chỉ hiển thị */}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Đơn giá hiệu lực
                                </label>
                                <div className="flex items-center gap-2">
                                    {currentItem['DONGIA_HIEULUC'] && currentItem['DONGIA_HIEULUC'] > 0 ? (
                                        <>
                                            <span className="text-2xl font-bold text-green-700">
                                                {formatCurrency(currentItem['DONGIA_HIEULUC'])}
                                            </span>
                                            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded shadow-sm">
                                                Từ Cài đặt giá bán
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-gray-500 italic flex items-center gap-2 text-sm">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Chưa có giá hiệu lực. Vui lòng cài đặt giá bán.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Hiển thị tồn kho nếu đang edit */}
                            {isEditMode && originalNhomHang && (
                                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 shadow-sm">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Archive className="w-4 h-4 text-purple-600" />
                                        Tồn kho hiện tại
                                    </label>
                                    <div className="bg-white rounded-lg p-3 border-2 border-purple-300">
                                        {getTonKhoByNhomHang(originalNhomHang) > 0 ? (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xl font-bold text-purple-700">
                                                        {getTonKhoByNhomHang(originalNhomHang)} kiện
                                                    </span>
                                                    <p className="text-xs text-gray-600 mt-0.5">
                                                        Tổng: {getTongKhoiLuongTon(originalNhomHang).toFixed(3)} m³
                                                    </p>
                                                </div>
                                                <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Không thể đổi kích thước
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 italic flex items-center gap-2 text-sm">
                                                <Info className="w-4 h-4" />
                                                Không có tồn kho
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Note */}
                            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-3">
                                <p className="text-xs text-yellow-800 flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>
                                        <strong>Lưu ý:</strong> Nhóm hàng sẽ được tự động tạo theo format: <strong>Dày*Rộng*Dài</strong>.
                                        Đơn giá hiệu lực được tự động cập nhật từ trang "Cài đặt giá bán" khi có giá mới được áp dụng.
                                        {isEditMode && getTonKhoByNhomHang(originalNhomHang) > 0 && (
                                            <span className="block mt-1.5 text-red-600 font-semibold">
                                                ⚠️ Không thể thay đổi kích thước khi còn hàng tồn kho!
                                            </span>
                                        )}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Footer with buttons */}
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center gap-1.5 text-sm"
                                disabled={isSubmitting}
                            >
                                <X className="h-4 w-4" />
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveItem}
                                disabled={isSubmitting}
                                className={`px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:from-blue-700 hover:to-blue-800 hover:shadow-md'
                                    } flex items-center gap-1.5 transition-all shadow-sm font-medium text-sm`}
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
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Lưu hàng hóa
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && itemToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Trash className="w-4 h-4 text-red-600" />
                                </div>
                                Xác nhận xóa
                            </h2>
                            <button
                                onClick={handleCloseDeleteConfirmation}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                                <p className="text-red-700 mb-2 font-medium text-sm">
                                    Bạn có chắc chắn muốn xóa hàng hóa này?
                                </p>
                                <div className="bg-white rounded-lg p-3 mt-2 space-y-2 shadow-sm">
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[90px]">Nhóm hàng:</span>
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                            {itemToDelete['NHOM_HANG']}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[90px]">Kích thước:</span>
                                        <span>{itemToDelete['DAY']} × {itemToDelete['RONG']} × {itemToDelete['DAI']}</span>
                                    </p>
                                    {itemToDelete['DONGIA_HIEULUC'] && itemToDelete['DONGIA_HIEULUC'] > 0 && (
                                        <p className="text-xs text-gray-700 flex items-center gap-2">
                                            <span className="font-semibold min-w-[90px]">Giá hiệu lực:</span>
                                            <span className="font-bold text-green-600">
                                                {formatCurrency(itemToDelete['DONGIA_HIEULUC'])}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <p className="text-xs text-red-600 mt-3 flex items-center gap-2 font-medium">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Hành động này không thể hoàn tác.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                <button
                                    onClick={handleCloseDeleteConfirmation}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleDeleteItem}
                                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 flex items-center gap-1.5 transition-all shadow-sm text-sm"
                                >
                                    <Trash className="h-4 w-4" />
                                    Xóa hàng hóa
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
                .overflow-y-auto::-webkit-scrollbar {
                    width: 8px;
                }

                .overflow-y-auto::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }

                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }

                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
        </div>
    );
};

export default DMHHManagement;
