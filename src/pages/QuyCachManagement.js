import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, Ruler, RefreshCw, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Package } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const QuyCachManagement = () => {
    // State Management
    const [quyCachItems, setQuyCachItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        'IQ_QC': '',
        'DAY': '',
        'RONG': '',
        'DAI': '',
        'TIEU_CHUAN': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [filterTieuChuan, setFilterTieuChuan] = useState('TẤT CẢ');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Fetch data
    const fetchQuyCach = async () => {
        try {
            setIsLoading(true);
            const response = await authUtils.apiRequestKHO('CD_QUYCACH', 'Find', {});
            setQuyCachItems(response);
        } catch (error) {
            console.error('Error fetching quy cach list:', error);
            toast.error('Lỗi khi tải danh sách quy cách');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuyCach();
    }, []);

    // Modal handlers
    const handleOpenModal = (item = null) => {
        if (item) {
            setIsEditMode(true);
            setCurrentItem({
                'IQ_QC': item['IQ_QC'] || '',
                'DAY': item['DAY'] || '',
                'RONG': item['RONG'] || '',
                'DAI': item['DAI'] || '',
                'TIEU_CHUAN': item['TIEU_CHUAN'] || ''
            });
        } else {
            setIsEditMode(false);
            setCurrentItem({
                'IQ_QC': '',
                'DAY': '',
                'RONG': '',
                'DAI': '',
                'TIEU_CHUAN': ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setCurrentItem({
            'IQ_QC': '',
            'DAY': '',
            'RONG': '',
            'DAI': '',
            'TIEU_CHUAN': ''
        });
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
        if (!item['DAY'] || isNaN(item['DAY']) || parseFloat(item['DAY']) <= 0) {
            errors.push('Dày phải là số dương');
        }
        if (!item['RONG'] || isNaN(item['RONG']) || parseFloat(item['RONG']) <= 0) {
            errors.push('Rộng phải là số dương');
        }
        if (!item['DAI'] || isNaN(item['DAI']) || parseFloat(item['DAI']) <= 0) {
            errors.push('Dài phải là số dương');
        }
        if (!item['TIEU_CHUAN'] || item['TIEU_CHUAN'].trim() === '') {
            errors.push('Tiêu chuẩn không được để trống');
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

            // Chuyển đổi các giá trị số
            const itemToSave = {
                ...currentItem,
                'DAY': parseFloat(currentItem['DAY']),
                'RONG': parseFloat(currentItem['RONG']),
                'DAI': parseFloat(currentItem['DAI'])
            };

            if (isEditMode) {
                // Edit existing item
                await authUtils.apiRequestKHO('CD_QUYCACH', 'Edit', {
                    "Rows": [itemToSave]
                });
                toast.success('Cập nhật quy cách thành công!');
            } else {
                // Create new item - không cần gửi IQ_QC vì sẽ tự động tạo
                const { IQ_QC, ...newItem } = itemToSave;
                await authUtils.apiRequestKHO('CD_QUYCACH', 'Add', {
                    "Rows": [newItem]
                });
                toast.success('Thêm quy cách mới thành công!');
            }

            await fetchQuyCach();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving quy cach:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu quy cách'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handlers
    const handleOpenDeleteConfirmation = (item) => {
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
            await authUtils.apiRequestKHO('CD_QUYCACH', 'Delete', {
                "Rows": [{ "IQ_QC": itemToDelete['IQ_QC'] }]
            });
            toast.success('Xóa quy cách thành công!');
            await fetchQuyCach();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting quy cach:', error);
            toast.error('Có lỗi xảy ra khi xóa quy cách');
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
        const sortableItems = [...quyCachItems];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const keyA = a[sortConfig.key] || '';
                const keyB = b[sortConfig.key] || '';

                // Handle numeric sorting
                if (['DAY', 'RONG', 'DAI', 'IQ_QC'].includes(sortConfig.key)) {
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
    }, [quyCachItems, sortConfig]);

    // Filtering
    const filteredItems = getSortedItems().filter(item => {
        const matchesSearch =
            (item['IQ_QC']?.toString().toLowerCase().includes(search.toLowerCase()) ||
                item['TIEU_CHUAN']?.toLowerCase().includes(search.toLowerCase()) ||
                item['DAY']?.toString().includes(search) ||
                item['RONG']?.toString().includes(search) ||
                item['DAI']?.toString().includes(search));

        const matchesTieuChuan = filterTieuChuan === 'TẤT CẢ' || item['TIEU_CHUAN'] === filterTieuChuan;

        return matchesSearch && matchesTieuChuan;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterTieuChuan, itemsPerPage]);

    // Pagination handlers
    const goToFirstPage = () => setCurrentPage(1);
    const goToLastPage = () => setCurrentPage(totalPages);
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const goToPage = (page) => setCurrentPage(page);

    // Get page numbers to display
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

    // Get sort direction icon
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <span className="text-gray-400 ml-1">⇅</span>;
        }
        return sortConfig.direction === 'ascending' ? 
            <span className="text-indigo-600 ml-1">↑</span> : 
            <span className="text-indigo-600 ml-1">↓</span>;
    };

    // Format dimension display
    const formatDimension = (day, rong, dai) => {
        return `${day || 0} × ${rong || 0} × ${dai || 0}`;
    };

    // Get unique tieu chuan list
    const tieuChuanList = [...new Set(quyCachItems.map(item => item['TIEU_CHUAN']).filter(Boolean))];

    // Refresh data
    const handleRefresh = async () => {
        toast.info('Đang tải lại dữ liệu...');
        await fetchQuyCach();
        toast.success('Đã tải lại dữ liệu thành công!');
    };

    // Calculate volume
    const calculateVolume = (day, rong, dai) => {
        const volume = (parseFloat(day) || 0) * (parseFloat(rong) || 0) * (parseFloat(dai) || 0);
        return volume.toLocaleString('vi-VN');
    };

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md">
                                <Ruler className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Cài Đặt Quy Cách</h1>
                                <p className="text-sm text-gray-500 mt-1">Quản lý kích thước và tiêu chuẩn sản phẩm</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleRefresh}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2 transition-all shadow-sm hover:shadow"
                                title="Tải lại dữ liệu"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="hidden sm:inline">Làm mới</span>
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow ${
                                    showFilters 
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm quy cách
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    {showFilters && (
                        <div className="mb-6 space-y-4 animate-fadeIn">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo ID, tiêu chuẩn hoặc kích thước..."
                                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Lọc theo tiêu chuẩn:
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setFilterTieuChuan('TẤT CẢ')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterTieuChuan === 'TẤT CẢ'
                                            ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                            }`}
                                    >
                                        Tất cả ({quyCachItems.length})
                                    </button>
                                    {tieuChuanList.map((tieuChuan) => (
                                        <button
                                            key={tieuChuan}
                                            onClick={() => setFilterTieuChuan(tieuChuan)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterTieuChuan === tieuChuan
                                                ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                                }`}
                                        >
                                            {tieuChuan} ({quyCachItems.filter(item => item['TIEU_CHUAN'] === tieuChuan).length})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-blue-700 mb-1">Tổng số quy cách</h3>
                                    <p className="text-3xl font-bold text-blue-900">{quyCachItems.length}</p>
                                </div>
                                <div className="p-3 bg-blue-200 rounded-lg">
                                    <Ruler className="w-6 h-6 text-blue-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-green-700 mb-1">Kết quả tìm kiếm</h3>
                                    <p className="text-3xl font-bold text-green-900">{filteredItems.length}</p>
                                </div>
                                <div className="p-3 bg-green-200 rounded-lg">
                                    <Search className="w-6 h-6 text-green-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-purple-700 mb-1">Tiêu chuẩn</h3>
                                    <p className="text-3xl font-bold text-purple-900">{tieuChuanList.length}</p>
                                </div>
                                <div className="p-3 bg-purple-200 rounded-lg">
                                    <Package className="w-6 h-6 text-purple-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-orange-700 mb-1">Trang hiện tại</h3>
                                    <p className="text-3xl font-bold text-orange-900">{currentPage}/{totalPages || 1}</p>
                                </div>
                                <div className="p-3 bg-orange-200 rounded-lg">
                                    <Info className="w-6 h-6 text-orange-700" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items per page selector */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 font-medium">Hiển thị:</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                            >
                                <option value={5}>5 mục</option>
                                <option value={10}>10 mục</option>
                                <option value={20}>20 mục</option>
                                <option value={50}>50 mục</option>
                                <option value={100}>100 mục</option>
                            </select>
                        </div>
                        <div className="text-sm text-gray-600">
                            Hiển thị <span className="font-semibold text-gray-800">{indexOfFirstItem + 1}</span> - <span className="font-semibold text-gray-800">{Math.min(indexOfLastItem, filteredItems.length)}</span> trong tổng số <span className="font-semibold text-gray-800">{filteredItems.length}</span> mục
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('IQ_QC')}>
                                            <div className="flex items-center gap-1">
                                                ID {getSortIcon('IQ_QC')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('DAY')}>
                                            <div className="flex items-center gap-1">
                                                Dày (mm) {getSortIcon('DAY')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('RONG')}>
                                            <div className="flex items-center gap-1">
                                                Rộng (mm) {getSortIcon('RONG')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('DAI')}>
                                            <div className="flex items-center gap-1">
                                                Dài (mm) {getSortIcon('DAI')}
                                            </div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Kích thước (D×R×D)
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Thể tích (mm³)
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('TIEU_CHUAN')}>
                                            <div className="flex items-center gap-1">
                                                Tiêu chuẩn {getSortIcon('TIEU_CHUAN')}
                                            </div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((item, index) => (
                                            <tr key={item['IQ_QC']} className={`hover:bg-indigo-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg text-sm font-bold shadow-sm">
                                                        #{item['IQ_QC']}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item['DAY']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item['RONG']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item['DAI']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                    <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-lg font-mono font-semibold shadow-sm">
                                                        {formatDimension(item['DAY'], item['RONG'], item['DAI'])}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                    <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-lg font-mono text-xs font-medium shadow-sm">
                                                        {calculateVolume(item['DAY'], item['RONG'], item['DAI'])}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    <span className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-lg text-xs font-semibold shadow-sm">
                                                        {item['TIEU_CHUAN']}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex justify-center space-x-2">
                                                        <button
                                                            onClick={() => handleOpenModal(item)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-100 transition-all transform hover:scale-110"
                                                            title="Sửa quy cách"
                                                        >
                                                            <Edit className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteConfirmation(item)}
                                                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-100 transition-all transform hover:scale-110"
                                                            title="Xóa quy cách"
                                                        >
                                                            <Trash className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Ruler className="w-16 h-16 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">Không tìm thấy quy cách nào</p>
                                                    <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
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
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-600">
                                Trang <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToFirstPage}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg border transition-all ${
                                        currentPage === 1
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                    title="Trang đầu"
                                >
                                    <ChevronsLeft className="w-5 h-5" />
                                </button>
                                
                                <button
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg border transition-all ${
                                        currentPage === 1
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                    title="Trang trước"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {getPageNumbers().map((page, index) => (
                                        page === '...' ? (
                                            <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">...</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`min-w-[40px] px-3 py-2 rounded-lg border font-medium transition-all ${
                                                    currentPage === page
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
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
                                    className={`p-2 rounded-lg border transition-all ${
                                        currentPage === totalPages
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                    title="Trang sau"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                
                                <button
                                    onClick={goToLastPage}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg border transition-all ${
                                        currentPage === totalPages
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                    title="Trang cuối"
                                >
                                    <ChevronsRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Ruler className="w-6 h-6 text-indigo-600" />
                                </div>
                                {isEditMode ? 'Cập nhật quy cách' : 'Thêm quy cách mới'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {isEditMode && (
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm">
                                    <p className="text-sm text-blue-700 flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        <span className="font-medium">ID quy cách:</span> 
                                        <span className="px-2 py-1 bg-blue-200 text-blue-900 rounded-lg font-bold">#{currentItem['IQ_QC']}</span>
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Dày (mm) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={currentItem['DAY']}
                                        onChange={(e) => handleInputChange('DAY', e.target.value)}
                                        className="p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Nhập dày"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Rộng (mm) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={currentItem['RONG']}
                                        onChange={(e) => handleInputChange('RONG', e.target.value)}
                                        className="p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Nhập rộng"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Dài (mm) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={currentItem['DAI']}
                                        onChange={(e) => handleInputChange('DAI', e.target.value)}
                                        className="p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Nhập dài"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Preview kích thước */}
                            {(currentItem['DAY'] || currentItem['RONG'] || currentItem['DAI']) && (
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                                                <Ruler className="w-4 h-4" />
                                                Kích thước:
                                            </p>
                                            <p className="text-xl font-mono font-bold text-gray-800 bg-white px-4 py-2 rounded-lg shadow-sm">
                                                {formatDimension(currentItem['DAY'], currentItem['RONG'], currentItem['DAI'])} mm
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                                                <Package className="w-4 h-4" />
                                                Thể tích:
                                            </p>
                                            <p className="text-xl font-mono font-bold text-green-700 bg-white px-4 py-2 rounded-lg shadow-sm">
                                                {calculateVolume(currentItem['DAY'], currentItem['RONG'], currentItem['DAI'])} mm³
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tiêu chuẩn <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={currentItem['TIEU_CHUAN']}
                                    onChange={(e) => handleInputChange('TIEU_CHUAN', e.target.value)}
                                    className="p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Nhập tiêu chuẩn (VD: TCVN, ISO, ASTM...)"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Ví dụ: TCVN 1651-1:2018, ISO 9001, ASTM A36
                                </p>
                            </div>

                            {/* Note */}
                            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
                                <p className="text-sm text-yellow-800 flex items-start gap-2">
                                    <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <span>
                                        <strong>Lưu ý:</strong> Tất cả kích thước được tính bằng milimét (mm). 
                                        Đảm bảo nhập đúng đơn vị để tính toán chính xác.
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Footer with buttons */}
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                            <button
                                onClick={handleCloseModal}
                                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center gap-2"
                                disabled={isSubmitting}
                            >
                                <X className="h-4 w-4" />
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveItem}
                                disabled={isSubmitting}
                                className={`px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:from-indigo-700 hover:to-indigo-800 hover:shadow-lg transform hover:-translate-y-0.5'
                                    } flex items-center gap-2 transition-all shadow-md font-medium`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Lưu quy cách
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
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Trash className="w-5 h-5 text-red-600" />
                                </div>
                                Xác nhận xóa
                            </h2>
                            <button
                                onClick={handleCloseDeleteConfirmation}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-5">
                                <p className="text-red-700 mb-3 font-medium">
                                    Bạn có chắc chắn muốn xóa quy cách này?
                                </p>
                                <div className="bg-white rounded-lg p-4 mt-3 space-y-2.5 shadow-sm">
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">ID:</span>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-bold">
                                            #{itemToDelete['IQ_QC']}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Kích thước:</span>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono font-semibold">
                                            {formatDimension(itemToDelete['DAY'], itemToDelete['RONG'], itemToDelete['DAI'])} mm
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Thể tích:</span>
                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                                            {calculateVolume(itemToDelete['DAY'], itemToDelete['RONG'], itemToDelete['DAI'])} mm³
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Tiêu chuẩn:</span>
                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                                            {itemToDelete['TIEU_CHUAN']}
                                        </span>
                                    </p>
                                </div>
                                <p className="text-sm text-red-600 mt-4 flex items-center gap-2 font-medium">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Hành động này không thể hoàn tác.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleCloseDeleteConfirmation}
                                    className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleDeleteItem}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                    <Trash className="h-4 w-4" />
                                    Xóa quy cách
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
            `}</style>
        </div>
    );
};

export default QuyCachManagement;
