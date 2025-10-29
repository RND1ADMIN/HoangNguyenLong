import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, DollarSign, Calendar, RefreshCw, Info, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const GiaBanManagement = () => {
    // State Management
    const [giaBanItems, setGiaBanItems] = useState([]);
    const [dmhhItems, setDmhhItems] = useState([]);
    const [nhomHangList, setNhomHangList] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        'HIEULUC_TU': '',
        'HIEULUC_DEN': '',
        'NHOMHANG': '',
        'GIABAN_DEXUAT': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [filterNhomHang, setFilterNhomHang] = useState('TẤT CẢ');
    const [filterStatus, setFilterStatus] = useState('TẤT CẢ');
    const [isLoading, setIsLoading] = useState(false);

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

    // Fetch data
    const fetchGiaBan = async () => {
        try {
            setIsLoading(true);
            const response = await authUtils.apiRequestKHO('CD_GIABAN', 'Find', {});
            setGiaBanItems(response);
        } catch (error) {
            console.error('Error fetching gia ban list:', error);
            toast.error('Lỗi khi tải danh sách giá bán');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDMHH = async () => {
        try {
            const response = await authUtils.apiRequestKHO('DMHH', 'Find', {});
            setDmhhItems(response);

            // Lấy danh sách nhóm hàng unique
            const uniqueNhomHang = [...new Set(response.map(item => item['NHOM_HANG']).filter(Boolean))];
            setNhomHangList(uniqueNhomHang);
        } catch (error) {
            console.error('Error fetching DMHH list:', error);
            toast.error('Lỗi khi tải danh mục hàng hóa');
        }
    };

    useEffect(() => {
        fetchGiaBan();
        fetchDMHH();
    }, []);

    // Check if price is currently active
    const isPriceActive = (hieuLucTu, hieuLucDen) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset time to start of day

        const startDate = hieuLucTu ? new Date(hieuLucTu) : null;
        const endDate = hieuLucDen ? new Date(hieuLucDen) : null;

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(0, 0, 0, 0);

        if (startDate && now < startDate) return 'upcoming'; // Sắp có hiệu lực
        if (endDate && now > endDate) return 'expired'; // Đã hết hiệu lực
        if (startDate && now >= startDate && (!endDate || now <= endDate)) return 'active'; // Đang có hiệu lực

        return 'unknown';
    };

    // Update DONGIA_HIEULUC in DMHH
    const updateDonGiaHieuLuc = async (nhomHang, donGia, shouldUpdate = true) => {
        try {
            // Lấy tất cả sản phẩm thuộc nhóm hàng này
            const productsInGroup = dmhhItems.filter(
                item => item['NHOM_HANG'] === nhomHang
            );

            if (productsInGroup.length === 0) {
                console.log(`Không tìm thấy sản phẩm nào thuộc nhóm hàng: ${nhomHang}`);
                return;
            }

            // Chuẩn bị danh sách cập nhật
            const updateRows = productsInGroup.map(product => ({
                'NHOM_HANG': product['NHOM_HANG'],
                'DAY': product['DAY'],
                'RONG': product['RONG'],
                'DAI': product['DAI'],
                'CHATLUONG': product['CHATLUONG'],
                'DONGIA_HIEULUC': shouldUpdate ? donGia : 0 // Nếu không update thì set về 0
            }));

            // Gọi API cập nhật hàng loạt
            await authUtils.apiRequestKHO('DMHH', 'Edit', {
                "Rows": updateRows
            });

            if (shouldUpdate) {
                toast.success(
                    `Đã cập nhật giá hiệu lực cho ${productsInGroup.length} sản phẩm thuộc nhóm "${nhomHang}"`,
                    { autoClose: 2000 }
                );
            } else {
                toast.info(
                    `Đã xóa giá hiệu lực cho ${productsInGroup.length} sản phẩm thuộc nhóm "${nhomHang}"`,
                    { autoClose: 2000 }
                );
            }
        } catch (error) {
            console.error('Error updating DONGIA_HIEULUC in DMHH:', error);
            throw error;
        }
    };

    // Modal handlers
    const handleOpenModal = (item = null) => {
        if (item) {
            setIsEditMode(true);
            setCurrentItem({
                'ID': item['ID'] || '',
                'HIEULUC_TU': item['HIEULUC_TU'] ? formatDateForInput(item['HIEULUC_TU']) : '',
                'HIEULUC_DEN': item['HIEULUC_DEN'] ? formatDateForInput(item['HIEULUC_DEN']) : '',
                'NHOMHANG': item['NHOMHANG'] || '',
                'GIABAN_DEXUAT': item['GIABAN_DEXUAT'] || ''
            });
        } else {
            setIsEditMode(false);
            setCurrentItem({
                'HIEULUC_TU': '',
                'HIEULUC_DEN': '',
                'NHOMHANG': '',
                'GIABAN_DEXUAT': ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setCurrentItem({
            'HIEULUC_TU': '',
            'HIEULUC_DEN': '',
            'NHOMHANG': '',
            'GIABAN_DEXUAT': ''
        });
    };

    // Format date for input field (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Format date for display (DD/MM/YYYY)
    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
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

        if (!item['HIEULUC_TU']) {
            errors.push('Ngày hiệu lực từ không được để trống');
        }

        if (!item['NHOMHANG']) {
            errors.push('Nhóm hàng không được để trống');
        }

        if (!item['GIABAN_DEXUAT'] || isNaN(item['GIABAN_DEXUAT']) || parseFloat(item['GIABAN_DEXUAT']) <= 0) {
            errors.push('Giá bán đề xuất phải là số dương');
        }

        // Validate date range
        if (item['HIEULUC_TU'] && item['HIEULUC_DEN']) {
            const startDate = new Date(item['HIEULUC_TU']);
            const endDate = new Date(item['HIEULUC_DEN']);

            if (endDate < startDate) {
                errors.push('Ngày hiệu lực đến phải sau ngày hiệu lực từ');
            }
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
                ...currentItem,
                'GIABAN_DEXUAT': parseFloat(currentItem['GIABAN_DEXUAT'])
            };

            // Kiểm tra trạng thái giá
            const status = isPriceActive(itemToSave['HIEULUC_TU'], itemToSave['HIEULUC_DEN']);

            if (isEditMode) {
                // Edit existing item
                await authUtils.apiRequestKHO('CD_GIABAN', 'Edit', {
                    "Rows": [itemToSave]
                });
                toast.success('Cập nhật giá bán thành công!');

                // Xử lý cập nhật DONGIA_HIEULUC
                if (status === 'active') {
                    await updateDonGiaHieuLuc(itemToSave['NHOMHANG'], itemToSave['GIABAN_DEXUAT'], true);
                } else if (status === 'expired') {
                    // Nếu giá đã hết hạn, xóa giá hiệu lực
                    await updateDonGiaHieuLuc(itemToSave['NHOMHANG'], 0, false);
                    toast.warning('Giá đã hết hiệu lực. Đã xóa giá hiệu lực khỏi danh mục hàng hóa.');
                } else if (status === 'upcoming') {
                    toast.info('Giá chưa có hiệu lực. Giá sẽ được áp dụng tự động khi đến ngày hiệu lực.');
                }
            } else {
                // Create new item
                const { ID, ...newItem } = itemToSave;
                await authUtils.apiRequestKHO('CD_GIABAN', 'Add', {
                    "Rows": [newItem]
                });
                toast.success('Thêm giá bán mới thành công!');

                // Xử lý cập nhật DONGIA_HIEULUC cho giá mới
                if (status === 'active') {
                    await updateDonGiaHieuLuc(itemToSave['NHOMHANG'], itemToSave['GIABAN_DEXUAT'], true);
                } else if (status === 'upcoming') {
                    toast.info('Giá chưa có hiệu lực. Giá sẽ được áp dụng tự động khi đến ngày hiệu lực.');
                } else if (status === 'expired') {
                    toast.warning('Giá đã hết hiệu lực ngay khi tạo. Vui lòng kiểm tra lại ngày hiệu lực.');
                }
            }

            await fetchGiaBan();
            await fetchDMHH(); // Refresh lại DMHH để hiển thị giá mới
            handleCloseModal();
        } catch (error) {
            console.error('Error saving gia ban:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu giá bán'));
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
            // Kiểm tra xem giá này có đang active không
            const status = isPriceActive(itemToDelete['HIEULUC_TU'], itemToDelete['HIEULUC_DEN']);

            await authUtils.apiRequestKHO('CD_GIABAN', 'Delete', {
                "Rows": [{ "ID": itemToDelete['ID'] }]
            });
            toast.success('Xóa giá bán thành công!');

            // Nếu giá đang active, xóa giá hiệu lực khỏi DMHH
            if (status === 'active') {
                await updateDonGiaHieuLuc(itemToDelete['NHOMHANG'], 0, false);
            }

            await fetchGiaBan();
            await fetchDMHH();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting gia ban:', error);
            toast.error('Có lỗi xảy ra khi xóa giá bán');
        }
    };

    // Refresh data
    const handleRefresh = async () => {
        toast.info('Đang tải lại dữ liệu...');
        await fetchGiaBan();
        await fetchDMHH();
        toast.success('Đã tải lại dữ liệu thành công!');
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
        const sortableItems = [...giaBanItems];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const keyA = a[sortConfig.key] || '';
                const keyB = b[sortConfig.key] || '';

                // Handle numeric sorting
                if (sortConfig.key === 'GIABAN_DEXUAT') {
                    const numA = parseFloat(keyA) || 0;
                    const numB = parseFloat(keyB) || 0;
                    return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
                }

                // Handle date sorting
                if (sortConfig.key === 'HIEULUC_TU' || sortConfig.key === 'HIEULUC_DEN') {
                    const dateA = new Date(keyA);
                    const dateB = new Date(keyB);
                    return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
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
    }, [giaBanItems, sortConfig]);

    // Filtering
    const filteredItems = getSortedItems().filter(item => {
        const matchesSearch =
            (item['NHOMHANG']?.toLowerCase().includes(search.toLowerCase()) ||
                item['GIABAN_DEXUAT']?.toString().includes(search));

        const matchesNhomHang = filterNhomHang === 'TẤT CẢ' || item['NHOMHANG'] === filterNhomHang;

        const status = isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']);
        const matchesStatus = filterStatus === 'TẤT CẢ' || status === filterStatus;

        return matchesSearch && matchesNhomHang && matchesStatus;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterNhomHang, filterStatus, itemsPerPage]);

    // Get sort direction icon
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <span className="text-gray-400 ml-1">⇅</span>;
        }
        return sortConfig.direction === 'ascending' ?
            <span className="text-blue-600 ml-1">↑</span> :
            <span className="text-blue-600 ml-1">↓</span>;
    };

    // Get status badge
    const getStatusBadge = (hieuLucTu, hieuLucDen) => {
        const status = isPriceActive(hieuLucTu, hieuLucDen);

        switch (status) {
            case 'active':
                return (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Đang áp dụng
                    </span>
                );
            case 'upcoming':
                return (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 w-fit">
                        <Clock className="w-3.5 h-3.5" />
                        Sắp áp dụng
                    </span>
                );
            case 'expired':
                return (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 w-fit">
                        <XCircle className="w-3.5 h-3.5" />
                        Đã hết hạn
                    </span>
                );
            default:
                return (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Không xác định
                    </span>
                );
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Cài Đặt Giá Bán</h1>
                                <p className="text-sm text-gray-500 mt-1">Quản lý giá bán theo thời gian hiệu lực</p>
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
                                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow ${showFilters
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm giá bán
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
                                    placeholder="Tìm kiếm theo nhóm hàng hoặc giá bán..."
                                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Lọc theo nhóm hàng:
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilterNhomHang('TẤT CẢ')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterNhomHang === 'TẤT CẢ'
                                                ? 'bg-green-600 text-white shadow-md transform scale-105'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                                }`}
                                        >
                                            Tất cả ({giaBanItems.length})
                                        </button>
                                        {nhomHangList.map((nhom) => (
                                            <button
                                                key={nhom}
                                                onClick={() => setFilterNhomHang(nhom)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterNhomHang === nhom
                                                    ? 'bg-green-600 text-white shadow-md transform scale-105'
                                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                                    }`}
                                            >
                                                {nhom} ({giaBanItems.filter(item => item['NHOMHANG'] === nhom).length})
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Lọc theo trạng thái:
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilterStatus('TẤT CẢ')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === 'TẤT CẢ'
                                                ? 'bg-green-600 text-white shadow-md transform scale-105'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                                }`}
                                        >
                                            Tất cả
                                        </button>
                                        <button
                                            onClick={() => setFilterStatus('active')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filterStatus === 'active'
                                                ? 'bg-green-600 text-white shadow-md transform scale-105'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                                }`}
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Đang áp dụng ({giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'active').length})
                                        </button>
                                        <button
                                            onClick={() => setFilterStatus('upcoming')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filterStatus === 'upcoming'
                                                ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                                }`}
                                        >
                                            <Clock className="w-3.5 h-3.5" />
                                            Sắp áp dụng ({giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'upcoming').length})
                                        </button>
                                        <button
                                            onClick={() => setFilterStatus('expired')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filterStatus === 'expired'
                                                ? 'bg-gray-600 text-white shadow-md transform scale-105'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                                }`}
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Đã hết hạn ({giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'expired').length})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-blue-700 mb-1">Tổng số giá bán</h3>
                                    <p className="text-3xl font-bold text-blue-900">{giaBanItems.length}</p>
                                </div>
                                <div className="p-3 bg-blue-200 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-blue-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-green-700 mb-1">Đang áp dụng</h3>
                                    <p className="text-3xl font-bold text-green-900">
                                        {giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'active').length}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-200 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-purple-700 mb-1">Sắp áp dụng</h3>
                                    <p className="text-3xl font-bold text-purple-900">
                                        {giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'upcoming').length}
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-200 rounded-lg">
                                    <Clock className="w-6 h-6 text-purple-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-1">Đã hết hạn</h3>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'expired').length}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-200 rounded-lg">
                                    <XCircle className="w-6 h-6 text-gray-700" />
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
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
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
                                    <RefreshCw className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('NHOMHANG')}>
                                            <div className="flex items-center gap-1">
                                                Nhóm hàng {getSortIcon('NHOMHANG')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('HIEULUC_TU')}>
                                            <div className="flex items-center gap-1">
                                                Hiệu lực từ {getSortIcon('HIEULUC_TU')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('HIEULUC_DEN')}>
                                            <div className="flex items-center gap-1">
                                                Hiệu lực đến {getSortIcon('HIEULUC_DEN')}
                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => requestSort('GIABAN_DEXUAT')}>
                                            <div className="flex items-center gap-1">
                                                Giá bán đề xuất {getSortIcon('GIABAN_DEXUAT')}
                                            </div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((item, index) => (
                                            <tr key={item['ID']} className={`hover:bg-green-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded-lg text-sm font-semibold shadow-sm">
                                                        {item['NHOMHANG']}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium">{formatDateForDisplay(item['HIEULUC_TU'])}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium">{formatDateForDisplay(item['HIEULUC_DEN'])}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <span className="font-bold text-green-600 text-base">
                                                        {formatCurrency(item['GIABAN_DEXUAT'])}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    {getStatusBadge(item['HIEULUC_TU'], item['HIEULUC_DEN'])}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex justify-center space-x-2">
                                                        <button
                                                            onClick={() => handleOpenModal(item)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-100 transition-all transform hover:scale-110"
                                                            title="Sửa giá bán"
                                                        >
                                                            <Edit className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteConfirmation(item)}
                                                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-100 transition-all transform hover:scale-110"
                                                            title="Xóa giá bán"
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
                                                    <DollarSign className="w-16 h-16 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">Không tìm thấy giá bán nào</p>
                                                    <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination - Tương tự như DMHH */}
                    {filteredItems.length > 0 && totalPages > 1 && (
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-600">
                                Trang <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg border transition-all ${currentPage === 1
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                >
                                    «
                                </button>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg border transition-all ${currentPage === 1
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                >
                                    ‹
                                </button>

                                <span className="px-4 py-2 text-sm text-gray-700">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg border transition-all ${currentPage === totalPages
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                >
                                    ›
                                </button>

                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg border transition-all ${currentPage === totalPages
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                                {isEditMode ? 'Cập nhật giá bán' : 'Thêm giá bán mới'}
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
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                                    <p className="text-sm text-blue-700 flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        <span className="font-medium">ID:</span> #{currentItem['ID']}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nhóm hàng <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={currentItem['NHOMHANG']}
                                    onChange={(e) => handleInputChange('NHOMHANG', e.target.value)}
                                    className="p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                    required
                                >
                                    <option value="">-- Chọn nhóm hàng --</option>
                                    {nhomHangList.map((nhom) => (
                                        <option key={nhom} value={nhom}>
                                            {nhom}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Danh sách nhóm hàng được lấy từ Danh mục hàng hóa
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Hiệu lực từ <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="date"
                                            value={currentItem['HIEULUC_TU']}
                                            onChange={(e) => handleInputChange('HIEULUC_TU', e.target.value)}
                                            className="pl-10 p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Hiệu lực đến
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="date"
                                            value={currentItem['HIEULUC_DEN']}
                                            onChange={(e) => handleInputChange('HIEULUC_DEN', e.target.value)}
                                            className="pl-10 p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        Để trống nếu không có ngày kết thúc
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Giá bán đề xuất (VNĐ) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        step="1000"
                                        value={currentItem['GIABAN_DEXUAT']}
                                        onChange={(e) => handleInputChange('GIABAN_DEXUAT', e.target.value)}
                                        className="pl-10 pr-12 p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                        placeholder="Nhập giá bán"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <span className="text-gray-500 font-medium">₫</span>
                                    </div>
                                </div>
                                {currentItem['GIABAN_DEXUAT'] && (
                                    <p className="text-sm text-green-600 mt-2 font-semibold">
                                        {formatCurrency(parseFloat(currentItem['GIABAN_DEXUAT']))}
                                    </p>
                                )}
                            </div>

                            {/* Preview status */}
                            {currentItem['HIEULUC_TU'] && (
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
                                    <p className="text-sm text-gray-700 mb-3 font-semibold flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        Trạng thái dự kiến:
                                    </p>
                                    {getStatusBadge(currentItem['HIEULUC_TU'], currentItem['HIEULUC_DEN'])}

                                    {/* Thông báo về việc cập nhật DONGIA_HIEULUC */}
                                    <div className="mt-3 pt-3 border-t border-gray-300">
                                        {isPriceActive(currentItem['HIEULUC_TU'], currentItem['HIEULUC_DEN']) === 'active' && (
                                            <p className="text-xs text-green-700 flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>
                                                    Giá này <strong>đang có hiệu lực</strong>. Khi lưu, giá sẽ được tự động cập nhật vào trường <strong>DONGIA_HIEULUC</strong> của tất cả sản phẩm thuộc nhóm hàng này trong Danh mục hàng hóa.
                                                </span>
                                            </p>
                                        )}
                                        {isPriceActive(currentItem['HIEULUC_TU'], currentItem['HIEULUC_DEN']) === 'upcoming' && (
                                            <p className="text-xs text-blue-700 flex items-start gap-2">
                                                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>
                                                    Giá này <strong>chưa có hiệu lực</strong>. Giá sẽ được tự động áp dụng vào <strong>DONGIA_HIEULUC</strong> khi đến ngày hiệu lực.
                                                </span>
                                            </p>
                                        )}
                                        {isPriceActive(currentItem['HIEULUC_TU'], currentItem['HIEULUC_DEN']) === 'expired' && (
                                            <p className="text-xs text-gray-700 flex items-start gap-2">
                                                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>
                                                    Giá này <strong>đã hết hiệu lực</strong>. Khi lưu, giá hiệu lực sẽ được xóa khỏi <strong>DONGIA_HIEULUC</strong> của các sản phẩm thuộc nhóm hàng này.
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Note */}
                            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
                                <p className="text-sm text-yellow-800 flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <span>
                                        <strong>Lưu ý:</strong> Hệ thống sẽ tự động cập nhật giá hiệu lực vào Danh mục hàng hóa dựa trên ngày hiệu lực.
                                        Chỉ có giá <strong>đang có hiệu lực</strong> mới được áp dụng vào trường <strong>DONGIA_HIEULUC</strong>.
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
                                className={`px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:from-green-700 hover:to-green-800 hover:shadow-lg transform hover:-translate-y-0.5'
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
                                        Lưu giá bán
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
                                <p className="text-red-700 mb-3 font-medium flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Bạn có chắc chắn muốn xóa giá bán này?
                                </p>
                                <div className="bg-white rounded-lg p-4 mt-3 space-y-2.5 shadow-sm">
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Nhóm hàng:</span>
                                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                            {itemToDelete['NHOMHANG']}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[100px]">Giá bán:</span>
                                        <span className="font-bold text-green-600">
                                            {formatCurrency(itemToDelete['GIABAN_DEXUAT'])}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-700 flex items-start gap-2">
                                        <span className="font-semibold min-w-[100px]">Hiệu lực:</span>
                                        <span>
                                            {formatDateForDisplay(itemToDelete['HIEULUC_TU'])}
                                            {itemToDelete['HIEULUC_DEN'] && ` - ${formatDateForDisplay(itemToDelete['HIEULUC_DEN'])}`}
                                        </span>
                                    </p>
                                    <div className="pt-2">
                                        {getStatusBadge(itemToDelete['HIEULUC_TU'], itemToDelete['HIEULUC_DEN'])}
                                    </div>
                                </div>

                                {/* Cảnh báo về việc xóa giá hiệu lực */}
                                {isPriceActive(itemToDelete['HIEULUC_TU'], itemToDelete['HIEULUC_DEN']) === 'active' && (
                                    <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-3">
                                        <p className="text-sm text-red-800 flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                            <span>
                                                <strong>Cảnh báo:</strong> Giá này đang có hiệu lực. Khi xóa, giá hiệu lực sẽ bị xóa khỏi trường <strong>DONGIA_HIEULUC</strong> của tất cả sản phẩm thuộc nhóm hàng <strong>{itemToDelete['NHOMHANG']}</strong> trong Danh mục hàng hóa.
                                            </span>
                                        </p>
                                    </div>
                                )}

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
                                    Xóa giá bán
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

export default GiaBanManagement;

