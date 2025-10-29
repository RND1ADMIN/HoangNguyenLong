import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, FileText, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Calendar, Droplet, User, ChevronDown } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const HopDongNguyenTacManagement = () => {
    // State Management
    const [contracts, setContracts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [currentContract, setCurrentContract] = useState({
        'SOHOPDONG': '',
        'NGAY_HOPDONG': new Date().toISOString().split('T')[0],
        'TEN_KHACHHANG': '',
        'DO_AM': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [contractToDelete, setContractToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [originalSoHopDong, setOriginalSoHopDong] = useState('');

    // Autocomplete states
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const dropdownRef = useRef(null);

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
    const fetchHopDong = async () => {
        try {
            setIsLoading(true);
            const response = await authUtils.apiRequestKHO('HOPDONG_NGUYENTAC', 'Find', {});
            setContracts(response);
        } catch (error) {
            console.error('Error fetching contracts:', error);
            toast.error('Lỗi khi tải danh sách hợp đồng');
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

    useEffect(() => {
        fetchHopDong();
        fetchCustomers();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowCustomerDropdown(false);
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

    // Handle customer selection
    const handleSelectCustomer = (customerName) => {
        setCurrentContract(prev => ({
            ...prev,
            'TEN_KHACHHANG': customerName
        }));
        setCustomerSearchTerm(customerName);
        setShowCustomerDropdown(false);
    };

    // Modal handlers
    const handleOpenModal = (contract = null) => {
        if (contract) {
            setIsEditMode(true);
            setOriginalSoHopDong(contract['SOHOPDONG']);
            const contractDate = contract['NGAY_HOPDONG'] ? 
                new Date(contract['NGAY_HOPDONG']).toISOString().split('T')[0] : 
                new Date().toISOString().split('T')[0];
            
            setCurrentContract({
                'SOHOPDONG': contract['SOHOPDONG'] || '',
                'NGAY_HOPDONG': contractDate,
                'TEN_KHACHHANG': contract['TEN_KHACHHANG'] || '',
                'DO_AM': contract['DO_AM'] || ''
            });
            setCustomerSearchTerm(contract['TEN_KHACHHANG'] || '');
        } else {
            setIsEditMode(false);
            setOriginalSoHopDong('');
            setCurrentContract({
                'SOHOPDONG': '',
                'NGAY_HOPDONG': new Date().toISOString().split('T')[0],
                'TEN_KHACHHANG': '',
                'DO_AM': ''
            });
            setCustomerSearchTerm('');
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setOriginalSoHopDong('');
        setCurrentContract({
            'SOHOPDONG': '',
            'NGAY_HOPDONG': new Date().toISOString().split('T')[0],
            'TEN_KHACHHANG': '',
            'DO_AM': ''
        });
        setCustomerSearchTerm('');
        setShowCustomerDropdown(false);
    };

    // Form handlers
    const handleInputChange = (field, value) => {
        setCurrentContract(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCustomerInputChange = (value) => {
        setCustomerSearchTerm(value);
        setCurrentContract(prev => ({
            ...prev,
            'TEN_KHACHHANG': value
        }));
        setShowCustomerDropdown(true);
    };

    const validateContract = (contract) => {
        const errors = [];
        
        if (!contract['SOHOPDONG']) {
            errors.push('Số hợp đồng không được để trống');
        }
        
        if (!contract['NGAY_HOPDONG']) {
            errors.push('Ngày hợp đồng không được để trống');
        }

        if (!contract['TEN_KHACHHANG']) {
            errors.push('Tên khách hàng không được để trống');
        }

        return errors;
    };

    // Save contract
    const handleSaveContract = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateContract(currentContract);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                setIsSubmitting(false);
                return;
            }

            const contractToSave = { ...currentContract };

            if (isEditMode) {
                if (originalSoHopDong !== contractToSave['SOHOPDONG']) {
                    const existingContract = contracts.find(
                        c => c['SOHOPDONG'] === contractToSave['SOHOPDONG']
                    );
                    
                    if (existingContract) {
                        toast.error('Số hợp đồng mới này đã tồn tại!');
                        setIsSubmitting(false);
                        return;
                    }

                    await authUtils.apiRequestKHO('HOPDONG_NGUYENTAC', 'Delete', {
                        "Rows": [{ "SOHOPDONG": originalSoHopDong }]
                    });
                    
                    await authUtils.apiRequestKHO('HOPDONG_NGUYENTAC', 'Add', {
                        "Rows": [contractToSave]
                    });
                    toast.success('Cập nhật hợp đồng thành công!');
                } else {
                    await authUtils.apiRequestKHO('HOPDONG_NGUYENTAC', 'Edit', {
                        "Rows": [contractToSave]
                    });
                    toast.success('Cập nhật hợp đồng thành công!');
                }
            } else {
                const existingContract = contracts.find(
                    c => c['SOHOPDONG'] === contractToSave['SOHOPDONG']
                );
                
                if (existingContract) {
                    toast.error('Số hợp đồng này đã tồn tại!');
                    setIsSubmitting(false);
                    return;
                }

                await authUtils.apiRequestKHO('HOPDONG_NGUYENTAC', 'Add', {
                    "Rows": [contractToSave]
                });
                toast.success('Thêm hợp đồng mới thành công!');
            }

            await fetchHopDong();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving contract:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu hợp đồng'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handlers
    const handleOpenDeleteConfirmation = (contract) => {
        setContractToDelete(contract);
        setShowDeleteConfirmation(true);
    };

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
        setContractToDelete(null);
    };

    const handleDeleteContract = async () => {
        if (!contractToDelete) return;

        try {
            await authUtils.apiRequestKHO('HOPDONG_NGUYENTAC', 'Delete', {
                "Rows": [{ "SOHOPDONG": contractToDelete['SOHOPDONG'] }]
            });
            toast.success('Xóa hợp đồng thành công!');
            await fetchHopDong();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting contract:', error);
            toast.error('Có lỗi xảy ra khi xóa hợp đồng');
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

    const getSortedContracts = useCallback(() => {
        const sortableContracts = [...contracts];
        if (sortConfig.key) {
            sortableContracts.sort((a, b) => {
                const keyA = a[sortConfig.key] || '';
                const keyB = b[sortConfig.key] || '';

                // Handle date sorting
                if (sortConfig.key === 'NGAY_HOPDONG') {
                    const dateA = new Date(keyA);
                    const dateB = new Date(keyB);
                    return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
                }

                // Handle numeric sorting for DO_AM
                if (sortConfig.key === 'DO_AM') {
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
        return sortableContracts;
    }, [contracts, sortConfig]);

    // Filtering
    const filteredContracts = getSortedContracts().filter(contract => {
        const searchLower = search.toLowerCase();
        return (
            contract['SOHOPDONG']?.toLowerCase().includes(searchLower) ||
            contract['TEN_KHACHHANG']?.toLowerCase().includes(searchLower) ||
            contract['DO_AM']?.toString().includes(search)
        );
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredContracts.slice(indexOfFirstItem, indexOfLastItem);

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
        await fetchHopDong();
        await fetchCustomers();
        toast.success('Đã tải lại dữ liệu thành công!');
    };

    return (
        <div className="p-3 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-4 md:p-5 mb-4 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Hợp Đồng Nguyên Tắc</h1>
                                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Quản lý hợp đồng nguyên tắc với khách hàng</p>
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
                                        ? 'bg-green-50 text-green-700 border border-green-200' 
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn tìm kiếm" : "Tìm kiếm"}
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm HĐ
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
                                    placeholder="Tìm kiếm theo số HĐ, tên khách hàng, độ ẩm..."
                                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-green-700 mb-1">Tổng hợp đồng</h3>
                                    <p className="text-2xl font-bold text-green-900">{contracts.length}</p>
                                </div>
                                <div className="p-2 bg-green-200 rounded-lg">
                                    <FileText className="w-5 h-5 text-green-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-blue-700 mb-1">Tháng này</h3>
                                    <p className="text-2xl font-bold text-blue-900">
                                        {contracts.filter(c => {
                                            const contractDate = new Date(c['NGAY_HOPDONG']);
                                            const now = new Date();
                                            return contractDate.getMonth() === now.getMonth() && 
                                                   contractDate.getFullYear() === now.getFullYear();
                                        }).length}
                                    </p>
                                </div>
                                <div className="p-2 bg-blue-200 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-purple-700 mb-1">Khách hàng</h3>
                                    <p className="text-2xl font-bold text-purple-900">
                                        {new Set(contracts.map(c => c['TEN_KHACHHANG'])).size}
                                    </p>
                                </div>
                                <div className="p-2 bg-purple-200 rounded-lg">
                                    <User className="w-5 h-5 text-purple-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-orange-700 mb-1">Có độ ẩm</h3>
                                    <p className="text-2xl font-bold text-orange-900">
                                        {contracts.filter(c => c['DO_AM']).length}
                                    </p>
                                </div>
                                <div className="p-2 bg-orange-200 rounded-lg">
                                    <Droplet className="w-5 h-5 text-orange-700" />
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
                                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xs bg-white"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="text-xs text-gray-600">
                            <span className="font-semibold text-gray-800">{indexOfFirstItem + 1}</span> - <span className="font-semibold text-gray-800">{Math.min(indexOfLastItem, filteredContracts.length)}</span> / <span className="font-semibold text-gray-800">{filteredContracts.length}</span>
                        </div>
                    </div>

                    {/* Table Section - Desktop */}
                    <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <RefreshCw className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('SOHOPDONG')}>
                                            <div className="flex items-center gap-1">Số HĐ {getSortIcon('SOHOPDONG')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('NGAY_HOPDONG')}>
                                            <div className="flex items-center gap-1">Ngày HĐ {getSortIcon('NGAY_HOPDONG')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('TEN_KHACHHANG')}>
                                            <div className="flex items-center gap-1">Khách hàng {getSortIcon('TEN_KHACHHANG')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('DO_AM')}>
                                            <div className="flex items-center gap-1">Độ ẩm {getSortIcon('DO_AM')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((contract, index) => (
                                            <tr key={contract['SOHOPDONG']} className={`hover:bg-green-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded text-xs font-semibold">
                                                        {contract['SOHOPDONG']}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {formatDate(contract['NGAY_HOPDONG'])}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                                    {contract['TEN_KHACHHANG']}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {contract['DO_AM'] ? (
                                                        <div className="flex items-center gap-1">
                                                            <Droplet className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="font-medium">{contract['DO_AM']}%</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex justify-center space-x-2">
                                                        <button
                                                            onClick={() => handleOpenModal(contract)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-100 transition-all transform hover:scale-110"
                                                            title="Sửa"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteConfirmation(contract)}
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
                                            <td colSpan="5" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">Không tìm thấy hợp đồng nào</p>
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
                                    <RefreshCw className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((contract) => (
                                <div key={contract['SOHOPDONG']} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded text-xs font-semibold">
                                                    {contract['SOHOPDONG']}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-gray-900 text-sm">{contract['TEN_KHACHHANG']}</h3>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleOpenModal(contract)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-100 transition-all"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenDeleteConfirmation(contract)}
                                                className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-100 transition-all"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5 text-xs text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            <span>{formatDate(contract['NGAY_HOPDONG'])}</span>
                                        </div>
                                        {contract['DO_AM'] && (
                                            <div className="flex items-center gap-2">
                                                <Droplet className="w-3.5 h-3.5 text-blue-500" />
                                                <span>Độ ẩm: <span className="font-medium">{contract['DO_AM']}%</span></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-500 py-12">
                                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                                <p className="text-base font-medium">Không tìm thấy hợp đồng nào</p>
                                <p className="text-sm mt-1">Thử thay đổi từ khóa tìm kiếm</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredContracts.length > 0 && (
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
                                                        ? 'bg-green-600 text-white border-green-600 shadow-md'
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
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-4 md:p-6 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <FileText className="w-5 h-5 text-green-600" />
                                </div>
                                {isEditMode ? 'Cập nhật hợp đồng' : 'Thêm hợp đồng mới'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Thông tin hợp đồng */}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-green-500" />
                                    Thông tin hợp đồng
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Số hợp đồng <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentContract['SOHOPDONG']}
                                            onChange={(e) => handleInputChange('SOHOPDONG', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập số HĐ"
                                            disabled={isEditMode}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Ngày hợp đồng <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={currentContract['NGAY_HOPDONG']}
                                            onChange={(e) => handleInputChange('NGAY_HOPDONG', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                                        />
                                    </div>

                                    <div className="md:col-span-2" ref={dropdownRef}>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Tên khách hàng <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={customerSearchTerm}
                                                onChange={(e) => handleCustomerInputChange(e.target.value)}
                                                onFocus={() => setShowCustomerDropdown(true)}
                                                className="p-2 pr-8 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                                                placeholder="Nhập để tìm khách hàng..."
                                            />
                                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            
                                            {showCustomerDropdown && filteredCustomers.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredCustomers.map((customer) => (
                                                        <div
                                                            key={customer['MA_KH']}
                                                            onClick={() => handleSelectCustomer(customer['TEN_KHACHHANG'])}
                                                            className="px-3 py-2 hover:bg-green-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {customer['TEN_KHACHHANG']}
                                                                </span>
                                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                                    {customer['MA_KH']}
                                                                </span>
                                                            </div>
                                                            {customer['DIACHI'] && (
                                                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                                    {customer['DIACHI']}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Nhập tên hoặc mã KH để tìm kiếm
                                        </p>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Độ ẩm (%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={currentContract['DO_AM']}
                                                onChange={(e) => handleInputChange('DO_AM', e.target.value)}
                                                className="p-2 pr-8 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                                                placeholder="Nhập độ ẩm"
                                            />
                                            <Droplet className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                                        </div>
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
                                onClick={handleSaveContract}
                                disabled={isSubmitting}
                                className={`px-5 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:from-green-700 hover:to-green-800 hover:shadow-lg transform hover:-translate-y-0.5'
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
            {showDeleteConfirmation && contractToDelete && (
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
                                    Bạn có chắc chắn muốn xóa hợp đồng này?
                                </p>
                                <div className="bg-white rounded-lg p-3 mt-2 space-y-2 shadow-sm">
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Số HĐ:</span>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                                            {contractToDelete['SOHOPDONG']}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Ngày HĐ:</span>
                                        <span>{formatDate(contractToDelete['NGAY_HOPDONG'])}</span>
                                    </p>
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Khách hàng:</span>
                                        <span>{contractToDelete['TEN_KHACHHANG']}</span>
                                    </p>
                                    {contractToDelete['DO_AM'] && (
                                        <p className="text-xs text-gray-700 flex items-center gap-2">
                                            <span className="font-semibold min-w-[100px]">Độ ẩm:</span>
                                            <span className="font-medium">{contractToDelete['DO_AM']}%</span>
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
                                    onClick={handleDeleteContract}
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

export default HopDongNguyenTacManagement;
