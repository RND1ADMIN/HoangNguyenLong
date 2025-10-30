import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, Package, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const DMHHManagement = () => {
    // State Management
    const [dmhhItems, setDmhhItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        'NHOM_HANG': '',
        'DAY': '',
        'RONG': '',
        'DAI': '',
        'DONGIA_HIEULUC': ''
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
    const [originalNhomHang, setOriginalNhomHang] = useState(''); // Lưu NHOM_HANG gốc khi edit

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

    // Tự động tạo NHOM_HANG từ các thông tin đã nhập
    const generateNhomHang = (day, rong, dai) => {
        if (!day || !rong || !dai) return '';
        return `${day}*${rong}*${dai}`;
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

    useEffect(() => {
        fetchDMHH();
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
            setOriginalNhomHang(item['NHOM_HANG']); // Lưu NHOM_HANG gốc
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

            // Prepare item to save
            const itemToSave = {
                'NHOM_HANG': currentItem['NHOM_HANG'],
                'DAY': currentItem['DAY'],
                'RONG': currentItem['RONG'],
                'DAI': currentItem['DAI'],
                'DONGIA_HIEULUC': currentItem['DONGIA_HIEULUC']
            };

            if (isEditMode) {
                // Edit existing item - Kiểm tra nếu đổi NHOM_HANG
                const newNhomHang = generateNhomHang(
                    itemToSave['DAY'],
                    itemToSave['RONG'],
                    itemToSave['DAI']
                );
                
                if (originalNhomHang !== newNhomHang) {
                    // Kiểm tra NHOM_HANG mới có tồn tại không
                    const existingItem = dmhhItems.find(
                        item => item['NHOM_HANG'] === newNhomHang
                    );
                    
                    if (existingItem) {
                        toast.error('Nhóm hàng mới này đã tồn tại!');
                        setIsSubmitting(false);
                        return;
                    }

                    // Xóa item cũ và thêm item mới
                    await authUtils.apiRequestKHO('DMHH', 'Delete', {
                        "Rows": [{ "NHOM_HANG": originalNhomHang }]
                    });
                    
                    itemToSave['NHOM_HANG'] = newNhomHang;
                    
                    await authUtils.apiRequestKHO('DMHH', 'Add', {
                        "Rows": [itemToSave]
                    });
                    toast.success('Cập nhật hàng hóa thành công!');
                } else {
                    // Cập nhật bình thường
                    await authUtils.apiRequestKHO('DMHH', 'Edit', {
                        "Rows": [itemToSave]
                    });
                    toast.success('Cập nhật hàng hóa thành công!');
                }
            } else {
                // Create new item - Kiểm tra trùng NHOM_HANG
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
                const keyA = a[sortConfig.key] || '';
                const keyB = b[sortConfig.key] || '';

                // Handle numeric sorting for DONGIA_HIEULUC
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
    }, [dmhhItems, sortConfig]);

    // Filtering
    const filteredItems = getSortedItems().filter(item => {
        const matchesSearch =
            (item['NHOM_HANG']?.toLowerCase().includes(search.toLowerCase()) ||
                item['DAY']?.toString().includes(search) ||
                item['RONG']?.toString().includes(search) ||
                item['DAI']?.toString().includes(search));

        return matchesSearch;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

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
            <span className="text-blue-600 ml-1">↑</span> : 
            <span className="text-blue-600 ml-1">↓</span>;
    };

    // Refresh data
    const handleRefresh = async () => {
        toast.info('Đang tải lại dữ liệu...');
        await fetchDMHH();
        toast.success('Đã tải lại dữ liệu thành công!');
    };

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Danh Mục Hàng Hóa</h1>
                                <p className="text-sm text-gray-500 mt-1">Quản lý thông tin hàng hóa và giá bán</p>
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
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm hàng hóa
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
                                    placeholder="Tìm kiếm theo nhóm hàng, kích thước..."
                                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-blue-700 mb-1">Tổng số hàng hóa</h3>
                                    <p className="text-3xl font-bold text-blue-900">{dmhhItems.length}</p>
                                </div>
                                <div className="p-3 bg-blue-200 rounded-lg">
                                    <Package className="w-6 h-6 text-blue-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-green-700 mb-1">Có giá hiệu lực</h3>
                                    <p className="text-3xl font-bold text-green-900">
                                        {dmhhItems.filter(item => item['DONGIA_HIEULUC'] && item['DONGIA_HIEULUC'] > 0).length}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-200 rounded-lg">
                                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-orange-700 mb-1">Chưa có giá</h3>
                                    <p className="text-3xl font-bold text-orange-900">
                                        {dmhhItems.filter(item => !item['DONGIA_HIEULUC'] || item['DONGIA_HIEULUC'] === 0).length}
                                    </p>
                                </div>
                                <div className="p-3 bg-orange-200 rounded-lg">
                                    <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
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
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
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
                                    <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('NHOM_HANG')}>
                                            <div className="flex items-center gap-1">
                                                Nhóm hàng {getSortIcon('NHOM_HANG')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('DAY')}>
                                            <div className="flex items-center gap-1">
                                                Dày {getSortIcon('DAY')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('RONG')}>
                                            <div className="flex items-center gap-1">
                                                Rộng {getSortIcon('RONG')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('DAI')}>
                                            <div className="flex items-center gap-1">
                                                Dài {getSortIcon('DAI')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('DONGIA_HIEULUC')}>
                                            <div className="flex items-center gap-1">
                                                Đơn giá hiệu lực {getSortIcon('DONGIA_HIEULUC')}
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
                                            <tr key={item['NHOM_HANG']} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded-lg text-sm font-semibold shadow-sm">
                                                        {item['NHOM_HANG']}
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
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    {item['DONGIA_HIEULUC'] && item['DONGIA_HIEULUC'] > 0 ? (
                                                        <span className="font-bold text-green-600 text-base">
                                                            {formatCurrency(item['DONGIA_HIEULUC'])}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Chưa có giá</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex justify-center space-x-2">
                                                        <button
                                                            onClick={() => handleOpenModal(item)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-100 transition-all transform hover:scale-110"
                                                            title="Sửa hàng hóa"
                                                        >
                                                            <Edit className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteConfirmation(item)}
                                                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-100 transition-all transform hover:scale-110"
                                                            title="Xóa hàng hóa"
                                                        >
                                                            <Trash className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Package className="w-16 h-16 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">Không tìm thấy hàng hóa nào</p>
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
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
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
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Package className="w-6 h-6 text-blue-600" />
                                </div>
                                {isEditMode ? 'Cập nhật hàng hóa' : 'Thêm hàng hóa mới'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Thông tin nhập liệu */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-500" />
                                    Thông tin kích thước
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                            Dày <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentItem['DAY']}
                                            onChange={(e) => handleInputChange('DAY', e.target.value)}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="Nhập dày"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                            Rộng <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentItem['RONG']}
                                            onChange={(e) => handleInputChange('RONG', e.target.value)}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="Nhập rộng"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                            Dài <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentItem['DAI']}
                                            onChange={(e) => handleInputChange('DAI', e.target.value)}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="Nhập dài"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Nhóm hàng tự động */}
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-purple-600" />
                                    Nhóm hàng (Tự động tạo)
                                </label>
                                <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                                    {currentItem['NHOM_HANG'] ? (
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-bold text-purple-700">
                                                {currentItem['NHOM_HANG']}
                                            </span>
                                            <span className="text-xs text-gray-600 bg-purple-100 px-3 py-1.5 rounded-lg">
                                                Tự động từ thông tin trên
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic flex items-center gap-2">
                                            <Info className="w-5 h-5" />
                                            Nhập đầy đủ thông tin để tạo nhóm hàng
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-purple-600 mt-3 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Format: Dày*Rộng*Dài
                                </p>
                            </div>

                            {/* Đơn giá hiệu lực - Chỉ hiển thị */}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Đơn giá hiệu lực
                                </label>
                                <div className="flex items-center gap-3">
                                    {currentItem['DONGIA_HIEULUC'] && currentItem['DONGIA_HIEULUC'] > 0 ? (
                                        <>
                                            <span className="text-3xl font-bold text-green-700">
                                                {formatCurrency(currentItem['DONGIA_HIEULUC'])}
                                            </span>
                                            <span className="text-xs text-gray-600 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                                                Từ Cài đặt giá bán
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-gray-500 italic flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Chưa có giá hiệu lực. Vui lòng cài đặt giá bán.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Note */}
                            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
                                <p className="text-sm text-yellow-800 flex items-start gap-2">
                                    <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <span>
                                        <strong>Lưu ý:</strong> Nhóm hàng sẽ được tự động tạo theo format: <strong>Dày*Rộng*Dài</strong>. 
                                        Đơn giá hiệu lực được tự động cập nhật từ trang "Cài đặt giá bán" khi có giá mới được áp dụng.
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
                                className={`px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transform hover:-translate-y-0.5'
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
                                    Bạn có chắc chắn muốn xóa hàng hóa này?
                                </p>
                                <div className="bg-white rounded-lg p-4 mt-3 space-y-2.5 shadow-sm">
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Nhóm hàng:</span>
                                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                            {itemToDelete['NHOM_HANG']}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Kích thước:</span>
                                        <span>{itemToDelete['DAY']} × {itemToDelete['RONG']} × {itemToDelete['DAI']}</span>
                                    </p>
                                    {itemToDelete['DONGIA_HIEULUC'] && itemToDelete['DONGIA_HIEULUC'] > 0 && (
                                        <p className="text-sm text-gray-700 flex items-center gap-2">
                                            <span className="font-semibold min-w-[100px]">Giá hiệu lực:</span>
                                            <span className="font-bold text-green-600">
                                                {formatCurrency(itemToDelete['DONGIA_HIEULUC'])}
                                            </span>
                                        </p>
                                    )}
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
