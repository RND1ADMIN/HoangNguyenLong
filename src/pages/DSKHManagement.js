import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, Users, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Phone, Mail, Building, CreditCard, User, Briefcase, Calendar } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const DSKHManagement = () => {
    // State Management
    const [customers, setCustomers] = useState([]);
    const [currentCustomer, setCurrentCustomer] = useState({
        'MA_KH': '',
        'TEN_KHACHHANG': '',
        'MST': '',
        'DIACHI': '',
        'SO_DT': '',
        'NGAY_THANHLAP': '',
        'NGUOI_LIENHE': '',
        'NGUOI_DAIDIEN': '',
        'CHUC_VU': '',
        'SO_TAIKHOAN': '',
        'NGANHANG': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [originalMaKH, setOriginalMaKH] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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
    const fetchDSKH = async () => {
        try {
            setIsLoading(true);
            const response = await authUtils.apiRequestKHO('DSKH', 'Find', {});
            setCustomers(response);
        } catch (error) {
            console.error('Error fetching DSKH list:', error);
            toast.error('Lỗi khi tải danh sách khách hàng');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDSKH();
    }, []);

    // Modal handlers
    const handleOpenModal = (customer = null) => {
        if (customer) {
            setIsEditMode(true);
            setOriginalMaKH(customer['MA_KH']);
            setCurrentCustomer({
                'MA_KH': customer['MA_KH'] || '',
                'TEN_KHACHHANG': customer['TEN_KHACHHANG'] || '',
                'MST': customer['MST'] || '',
                'DIACHI': customer['DIACHI'] || '',
                'SO_DT': customer['SO_DT'] || '',
                'NGAY_THANHLAP': customer['NGAY_THANHLAP'] || '',
                'NGUOI_LIENHE': customer['NGUOI_LIENHE'] || '',
                'NGUOI_DAIDIEN': customer['NGUOI_DAIDIEN'] || '',
                'CHUC_VU': customer['CHUC_VU'] || '',
                'SO_TAIKHOAN': customer['SO_TAIKHOAN'] || '',
                'NGANHANG': customer['NGANHANG'] || ''
            });
        } else {
            setIsEditMode(false);
            setOriginalMaKH('');
            setCurrentCustomer({
                'MA_KH': '',
                'TEN_KHACHHANG': '',
                'MST': '',
                'DIACHI': '',
                'SO_DT': '',
                'NGAY_THANHLAP': '',
                'NGUOI_LIENHE': '',
                'NGUOI_DAIDIEN': '',
                'CHUC_VU': '',
                'SO_TAIKHOAN': '',
                'NGANHANG': ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setOriginalMaKH('');
        setCurrentCustomer({
            'MA_KH': '',
            'TEN_KHACHHANG': '',
            'MST': '',
            'DIACHI': '',
            'SO_DT': '',
            'NGAY_THANHLAP': '',
            'NGUOI_LIENHE': '',
            'NGUOI_DAIDIEN': '',
            'CHUC_VU': '',
            'SO_TAIKHOAN': '',
            'NGANHANG': ''
        });
    };

    // Form handlers
    const handleInputChange = (field, value) => {
        setCurrentCustomer(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateCustomer = (customer) => {
        const errors = [];
        
        if (!customer['MA_KH']) {
            errors.push('Mã khách hàng không được để trống');
        }
        
        if (!customer['TEN_KHACHHANG']) {
            errors.push('Tên khách hàng không được để trống');
        }

        return errors;
    };

    // Save customer
    const handleSaveCustomer = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateCustomer(currentCustomer);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                setIsSubmitting(false);
                return;
            }

            const customerToSave = { ...currentCustomer };

            if (isEditMode) {
                if (originalMaKH !== customerToSave['MA_KH']) {
                    const existingCustomer = customers.find(
                        c => c['MA_KH'] === customerToSave['MA_KH']
                    );
                    
                    if (existingCustomer) {
                        toast.error('Mã khách hàng mới này đã tồn tại!');
                        setIsSubmitting(false);
                        return;
                    }

                    await authUtils.apiRequestKHO('DSKH', 'Delete', {
                        "Rows": [{ "MA_KH": originalMaKH }]
                    });
                    
                    await authUtils.apiRequestKHO('DSKH', 'Add', {
                        "Rows": [customerToSave]
                    });
                    toast.success('Cập nhật khách hàng thành công!');
                } else {
                    await authUtils.apiRequestKHO('DSKH', 'Edit', {
                        "Rows": [customerToSave]
                    });
                    toast.success('Cập nhật khách hàng thành công!');
                }
            } else {
                const existingCustomer = customers.find(
                    c => c['MA_KH'] === customerToSave['MA_KH']
                );
                
                if (existingCustomer) {
                    toast.error('Mã khách hàng này đã tồn tại!');
                    setIsSubmitting(false);
                    return;
                }

                await authUtils.apiRequestKHO('DSKH', 'Add', {
                    "Rows": [customerToSave]
                });
                toast.success('Thêm khách hàng mới thành công!');
            }

            await fetchDSKH();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving DSKH:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu khách hàng'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handlers
    const handleOpenDeleteConfirmation = (customer) => {
        setCustomerToDelete(customer);
        setShowDeleteConfirmation(true);
    };

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
        setCustomerToDelete(null);
    };

    const handleDeleteCustomer = async () => {
        if (!customerToDelete) return;

        try {
            await authUtils.apiRequestKHO('DSKH', 'Delete', {
                "Rows": [{ "MA_KH": customerToDelete['MA_KH'] }]
            });
            toast.success('Xóa khách hàng thành công!');
            await fetchDSKH();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting DSKH:', error);
            toast.error('Có lỗi xảy ra khi xóa khách hàng');
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

    const getSortedCustomers = useCallback(() => {
        const sortableCustomers = [...customers];
        if (sortConfig.key) {
            sortableCustomers.sort((a, b) => {
                const keyA = a[sortConfig.key] || '';
                const keyB = b[sortConfig.key] || '';

                if (keyA < keyB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (keyA > keyB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableCustomers;
    }, [customers, sortConfig]);

    // Filtering
    const filteredCustomers = getSortedCustomers().filter(customer => {
        const searchLower = search.toLowerCase();
        return (
            customer['MA_KH']?.toLowerCase().includes(searchLower) ||
            customer['TEN_KHACHHANG']?.toLowerCase().includes(searchLower) ||
            customer['MST']?.toLowerCase().includes(searchLower) ||
            customer['DIACHI']?.toLowerCase().includes(searchLower) ||
            customer['SO_DT']?.includes(search) ||
            customer['NGUOI_LIENHE']?.toLowerCase().includes(searchLower) ||
            customer['NGUOI_DAIDIEN']?.toLowerCase().includes(searchLower)
        );
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

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
        await fetchDSKH();
        toast.success('Đã tải lại dữ liệu thành công!');
    };

    return (
        <div className="p-3 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-4 md:p-5 mb-4 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Danh Sách Khách Hàng</h1>
                                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Quản lý thông tin khách hàng</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleRefresh}
                                className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2 transition-all shadow-sm hover:shadow text-sm"
                                title="Tải lại dữ liệu"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="hidden sm:inline">Làm mới</span>
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm hover:shadow text-sm ${
                                    showFilters 
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn tìm kiếm" : "Tìm kiếm"}
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm KH
                            </button>
                        </div>
                    </div>

                    {/* Search Section */}
                    {showFilters && (
                        <div className="mb-4 animate-fadeIn">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo mã KH, tên, MST, địa chỉ, SĐT..."
                                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-blue-700 mb-1">Tổng khách hàng</h3>
                                    <p className="text-2xl font-bold text-blue-900">{customers.length}</p>
                                </div>
                                <div className="p-2 bg-blue-200 rounded-lg">
                                    <Users className="w-5 h-5 text-blue-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-green-700 mb-1">Có MST</h3>
                                    <p className="text-2xl font-bold text-green-900">
                                        {customers.filter(c => c['MST']).length}
                                    </p>
                                </div>
                                <div className="p-2 bg-green-200 rounded-lg">
                                    <Building className="w-5 h-5 text-green-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-purple-700 mb-1">Có TK ngân hàng</h3>
                                    <p className="text-2xl font-bold text-purple-900">
                                        {customers.filter(c => c['SO_TAIKHOAN']).length}
                                    </p>
                                </div>
                                <div className="p-2 bg-purple-200 rounded-lg">
                                    <CreditCard className="w-5 h-5 text-purple-700" />
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
                                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="text-xs text-gray-600">
                            <span className="font-semibold text-gray-800">{indexOfFirstItem + 1}</span> - <span className="font-semibold text-gray-800">{Math.min(indexOfLastItem, filteredCustomers.length)}</span> / <span className="font-semibold text-gray-800">{filteredCustomers.length}</span>
                        </div>
                    </div>

                    {/* Table Section - Desktop */}
                    <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
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
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('MA_KH')}>
                                            <div className="flex items-center gap-1">Mã KH {getSortIcon('MA_KH')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('TEN_KHACHHANG')}>
                                            <div className="flex items-center gap-1">Tên KH {getSortIcon('TEN_KHACHHANG')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('MST')}>
                                            <div className="flex items-center gap-1">MST {getSortIcon('MST')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Địa chỉ</th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SĐT</th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Người liên hệ</th>
                                        <th scope="col" className="px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((customer, index) => (
                                            <tr key={customer['MA_KH']} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className="px-2 py-1 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded text-xs font-semibold">
                                                        {customer['MA_KH']}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                                                    {customer['TEN_KHACHHANG']}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {customer['MST'] || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                                                    {customer['DIACHI'] || '—'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {customer['SO_DT'] || '—'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {customer['NGUOI_LIENHE'] || '—'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex justify-center space-x-2">
                                                        <button
                                                            onClick={() => handleOpenModal(customer)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-100 transition-all transform hover:scale-110"
                                                            title="Sửa"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteConfirmation(customer)}
                                                            className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-100 transition-all transform hover:scale-110"
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
                                            <td colSpan="7" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Users className="w-16 h-16 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">Không tìm thấy khách hàng nào</p>
                                                    <p className="text-sm mt-1">Thử thay đổi từ khóa tìm kiếm</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Card View - Mobile */}
                    <div className="lg:hidden space-y-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((customer) => (
                                <div key={customer['MA_KH']} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded text-xs font-semibold">
                                                    {customer['MA_KH']}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-gray-900 text-sm">{customer['TEN_KHACHHANG']}</h3>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleOpenModal(customer)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-100 transition-all"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenDeleteConfirmation(customer)}
                                                className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-100 transition-all"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5 text-xs text-gray-600">
                                        {customer['MST'] && (
                                            <div className="flex items-center gap-2">
                                                <Building className="w-3.5 h-3.5 text-gray-400" />
                                                <span>MST: {customer['MST']}</span>
                                            </div>
                                        )}
                                        {customer['SO_DT'] && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{customer['SO_DT']}</span>
                                            </div>
                                        )}
                                        {customer['DIACHI'] && (
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="flex-1">{customer['DIACHI']}</span>
                                            </div>
                                        )}
                                        {customer['NGUOI_LIENHE'] && (
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                <span>Liên hệ: {customer['NGUOI_LIENHE']}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-500 py-12">
                                <Users className="w-16 h-16 text-gray-300 mb-4" />
                                <p className="text-base font-medium">Không tìm thấy khách hàng nào</p>
                                <p className="text-sm mt-1">Thử thay đổi từ khóa tìm kiếm</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredCustomers.length > 0 && (
                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-xs text-gray-600">
                                Trang <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
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
                                                className={`min-w-[32px] px-2 py-1 rounded-lg border font-medium transition-all text-xs ${
                                                    currentPage === page
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-4 md:p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                {isEditMode ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Thông tin cơ bản */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-blue-500" />
                                    Thông tin cơ bản
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Mã khách hàng <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['MA_KH']}
                                            onChange={(e) => handleInputChange('MA_KH', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập mã KH"
                                            disabled={isEditMode}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Tên khách hàng <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['TEN_KHACHHANG']}
                                            onChange={(e) => handleInputChange('TEN_KHACHHANG', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập tên KH"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Mã số thuế
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['MST']}
                                            onChange={(e) => handleInputChange('MST', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập MST"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['SO_DT']}
                                            onChange={(e) => handleInputChange('SO_DT', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập SĐT"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Địa chỉ
                                        </label>
                                        <textarea
                                            value={currentCustomer['DIACHI']}
                                            onChange={(e) => handleInputChange('DIACHI', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập địa chỉ"
                                            rows="2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Ngày thành lập
                                        </label>
                                        <input
                                            type="date"
                                            value={currentCustomer['NGAY_THANHLAP']}
                                            onChange={(e) => handleInputChange('NGAY_THANHLAP', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin liên hệ */}
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-500" />
                                    Thông tin liên hệ
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Người liên hệ
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['NGUOI_LIENHE']}
                                            onChange={(e) => handleInputChange('NGUOI_LIENHE', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập người liên hệ"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Người đại diện
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['NGUOI_DAIDIEN']}
                                            onChange={(e) => handleInputChange('NGUOI_DAIDIEN', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập người đại diện"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Chức vụ
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['CHUC_VU']}
                                            onChange={(e) => handleInputChange('CHUC_VU', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập chức vụ"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin ngân hàng */}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-green-500" />
                                    Thông tin ngân hàng
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Số tài khoản
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['SO_TAIKHOAN']}
                                            onChange={(e) => handleInputChange('SO_TAIKHOAN', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập số TK"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Ngân hàng
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['NGANHANG']}
                                            onChange={(e) => handleInputChange('NGANHANG', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập tên ngân hàng"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer with buttons */}
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center gap-2 text-sm"
                                disabled={isSubmitting}
                            >
                                <X className="h-4 w-4" />
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveCustomer}
                                disabled={isSubmitting}
                                className={`px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transform hover:-translate-y-0.5'
                                    } flex items-center gap-2 transition-all shadow-md font-medium text-sm`}
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
                                        Lưu
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && customerToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Trash className="w-4 h-4 text-red-600" />
                                </div>
                                Xác nhận xóa
                            </h2>
                            <button onClick={handleCloseDeleteConfirmation} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                                <p className="text-red-700 mb-2 font-medium text-sm">
                                    Bạn có chắc chắn muốn xóa khách hàng này?
                                </p>
                                <div className="bg-white rounded-lg p-3 mt-2 space-y-2 shadow-sm">
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[80px]">Mã KH:</span>
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                            {customerToDelete['MA_KH']}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[80px]">Tên:</span>
                                        <span>{customerToDelete['TEN_KHACHHANG']}</span>
                                    </p>
                                    {customerToDelete['MST'] && (
                                        <p className="text-xs text-gray-700 flex items-center gap-2">
                                            <span className="font-semibold min-w-[80px]">MST:</span>
                                            <span>{customerToDelete['MST']}</span>
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
                                    onClick={handleDeleteCustomer}
                                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                                >
                                    <Trash className="h-4 w-4" />
                                    Xóa
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
                    width: 6px;
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

export default DSKHManagement;
