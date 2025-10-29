import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, DollarSign, Calendar } from 'lucide-react';
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

    // Fetch data
    const fetchGiaBan = async () => {
        try {
            const response = await authUtils.apiRequestKHO('CD_GIABAN', 'Find', {});
            setGiaBanItems(response);
        } catch (error) {
            console.error('Error fetching gia ban list:', error);
            toast.error('Lỗi khi tải danh sách giá bán');
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
        const startDate = hieuLucTu ? new Date(hieuLucTu) : null;
        const endDate = hieuLucDen ? new Date(hieuLucDen) : null;

        if (startDate && now < startDate) return 'upcoming'; // Sắp có hiệu lực
        if (endDate && now > endDate) return 'expired'; // Đã hết hiệu lực
        if (startDate && now >= startDate && (!endDate || now <= endDate)) return 'active'; // Đang có hiệu lực

        return 'unknown';
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

            if (isEditMode) {
                // Edit existing item
                await authUtils.apiRequestKHO('CD_GIABAN', 'Edit', {
                    "Rows": [itemToSave]
                });
                toast.success('Cập nhật giá bán thành công!');
            } else {
                // Create new item
                const { ID, ...newItem } = itemToSave;
                await authUtils.apiRequestKHO('CD_GIABAN', 'Add', {
                    "Rows": [newItem]
                });
                toast.success('Thêm giá bán mới thành công!');
            }

            // ===== LOGIC MỚI: Cập nhật DONGIA_HIEULUC vào DMHH =====
            try {
                // Kiểm tra xem giá này có đang hiệu lực không
                const status = isPriceActive(itemToSave['HIEULUC_TU'], itemToSave['HIEULUC_DEN']);

                if (status === 'active') {
                    // Lấy tất cả sản phẩm thuộc nhóm hàng này
                    const productsInGroup = dmhhItems.filter(
                        item => item['NHOM_HANG'] === itemToSave['NHOMHANG']
                    );

                    if (productsInGroup.length > 0) {
                        // Chuẩn bị danh sách cập nhật
                        const updateRows = productsInGroup.map(product => ({
                            'MÃ HÀNG': product['MÃ HÀNG'],
                            'TÊN HÀNG': product['TÊN HÀNG'],
                            'LOẠI': product['LOẠI'],
                            'HÌNH ẢNH': product['HÌNH ẢNH'],
                            'QUY CÁCH': product['QUY CÁCH'],
                            'GHI CHÚ': product['GHI CHÚ'],
                            'ĐƠN GIÁ': product['ĐƠN GIÁ'],
                            'NHOM_HANG': product['NHOM_HANG'],
                            'DONGIA_HIEULUC': itemToSave['GIABAN_DEXUAT'] // Cập nhật giá hiệu lực
                        }));

                        // Gọi API cập nhật hàng loạt
                        await authUtils.apiRequestKHO('DMHH', 'Edit', {
                            "Rows": updateRows
                        });

                        toast.success(
                            `Đã cập nhật giá hiệu lực cho ${productsInGroup.length} sản phẩm thuộc nhóm "${itemToSave['NHOMHANG']}"`,
                            { autoClose: 5000 }
                        );
                    }
                } else if (status === 'upcoming') {
                    toast.info(
                        'Giá bán chưa có hiệu lực. Giá sẽ được áp dụng tự động khi đến ngày hiệu lực.',
                        { autoClose: 5000 }
                    );
                }
            } catch (updateError) {
                console.error('Error updating DONGIA_HIEULUC in DMHH:', updateError);
                toast.warning(
                    'Đã lưu giá bán nhưng có lỗi khi cập nhật giá hiệu lực vào danh mục hàng hóa',
                    { autoClose: 5000 }
                );
            }
            // ===== KẾT THÚC LOGIC MỚI =====

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
            await authUtils.apiRequestKHO('CD_GIABAN', 'Delete', {
                "Rows": [{ "ID": itemToDelete['ID'] }]
            });
            toast.success('Xóa giá bán thành công!');
            await fetchGiaBan();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting gia ban:', error);
            toast.error('Có lỗi xảy ra khi xóa giá bán');
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
        const sortableItems = [...giaBanItems];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
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

    // Get sort direction icon
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    // Get status badge
    const getStatusBadge = (hieuLucTu, hieuLucDen) => {
        const status = isPriceActive(hieuLucTu, hieuLucDen);

        switch (status) {
            case 'active':
                return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Đang áp dụng</span>;
            case 'upcoming':
                return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Sắp áp dụng</span>;
            case 'expired':
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Đã hết hạn</span>;
            default:
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Không xác định</span>;
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-800">Cài Đặt Giá Bán</h1>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm giá bán
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    {showFilters && (
                        <div className="mb-6 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo nhóm hàng hoặc giá bán..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-3">Lọc theo nhóm hàng:</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilterNhomHang('TẤT CẢ')}
                                            className={`px-3 py-1.5 rounded-full text-sm ${filterNhomHang === 'TẤT CẢ'
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            Tất cả
                                        </button>
                                        {nhomHangList.map((nhom) => (
                                            <button
                                                key={nhom}
                                                onClick={() => setFilterNhomHang(nhom)}
                                                className={`px-3 py-1.5 rounded-full text-sm ${filterNhomHang === nhom
                                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {nhom}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-3">Lọc theo trạng thái:</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilterStatus('TẤT CẢ')}
                                            className={`px-3 py-1.5 rounded-full text-sm ${filterStatus === 'TẤT CẢ'
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            Tất cả
                                        </button>
                                        <button
                                            onClick={() => setFilterStatus('active')}
                                            className={`px-3 py-1.5 rounded-full text-sm ${filterStatus === 'active'
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            Đang áp dụng
                                        </button>
                                        <button
                                            onClick={() => setFilterStatus('upcoming')}
                                            className={`px-3 py-1.5 rounded-full text-sm ${filterStatus === 'upcoming'
                                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            Sắp áp dụng
                                        </button>
                                        <button
                                            onClick={() => setFilterStatus('expired')}
                                            className={`px-3 py-1.5 rounded-full text-sm ${filterStatus === 'expired'
                                                ? 'bg-gray-100 text-gray-800 border border-gray-200'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            Đã hết hạn
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <h3 className="text-sm text-blue-700 mb-1">Tổng số giá bán</h3>
                            <p className="text-2xl font-bold text-blue-800">{giaBanItems.length}</p>
                        </div>

                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                            <h3 className="text-sm text-green-700 mb-1">Đang áp dụng</h3>
                            <p className="text-2xl font-bold text-green-800">
                                {giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'active').length}
                            </p>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                            <h3 className="text-sm text-purple-700 mb-1">Sắp áp dụng</h3>
                            <p className="text-2xl font-bold text-purple-800">
                                {giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'upcoming').length}
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                            <h3 className="text-sm text-gray-700 mb-1">Đã hết hạn</h3>
                            <p className="text-2xl font-bold text-gray-800">
                                {giaBanItems.filter(item => isPriceActive(item['HIEULUC_TU'], item['HIEULUC_DEN']) === 'expired').length}
                            </p>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('NHOMHANG')}>
                                        Nhóm hàng {getSortIcon('NHOMHANG')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('HIEULUC_TU')}>
                                        Hiệu lực từ {getSortIcon('HIEULUC_TU')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('HIEULUC_DEN')}>
                                        Hiệu lực đến {getSortIcon('HIEULUC_DEN')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('GIABAN_DEXUAT')}>
                                        Giá bán đề xuất {getSortIcon('GIABAN_DEXUAT')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredItems.length > 0 ? (
                                    filteredItems.map((item) => (
                                        <tr key={item['ID']} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                                                    {item['NHOMHANG']}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {formatDateForDisplay(item['HIEULUC_TU'])}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {formatDateForDisplay(item['HIEULUC_DEN'])}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-semibold text-green-600">
                                                    {item['GIABAN_DEXUAT']?.toLocaleString('vi-VN')} đ
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                {getStatusBadge(item['HIEULUC_TU'], item['HIEULUC_DEN'])}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                                        title="Sửa giá bán"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDeleteConfirmation(item)}
                                                        className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                                        title="Xóa giá bán"
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-6 text-center text-sm text-gray-500">
                                            Không tìm thấy giá bán nào phù hợp với tiêu chí tìm kiếm
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                {isEditMode ? 'Cập nhật giá bán' : 'Thêm giá bán mới'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {isEditMode && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                    <p className="text-sm text-blue-700">
                                        <span className="font-medium">ID:</span> #{currentItem['ID']}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nhóm hàng <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={currentItem['NHOMHANG']}
                                    onChange={(e) => handleInputChange('NHOMHANG', e.target.value)}
                                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-green-500 focus:border-green-500"
                                    required
                                >
                                    <option value="">-- Chọn nhóm hàng --</option>
                                    {nhomHangList.map((nhom) => (
                                        <option key={nhom} value={nhom}>
                                            {nhom}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Danh sách nhóm hàng được lấy từ Danh mục hàng hóa
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hiệu lực từ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={currentItem['HIEULUC_TU']}
                                        onChange={(e) => handleInputChange('HIEULUC_TU', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-green-500 focus:border-green-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hiệu lực đến
                                    </label>
                                    <input
                                        type="date"
                                        value={currentItem['HIEULUC_DEN']}
                                        onChange={(e) => handleInputChange('HIEULUC_DEN', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-green-500 focus:border-green-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Để trống nếu không có ngày kết thúc
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Giá bán đề xuất (VNĐ) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="1000"
                                        value={currentItem['GIABAN_DEXUAT']}
                                        onChange={(e) => handleInputChange('GIABAN_DEXUAT', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-green-500 focus:border-green-500 pr-12"
                                        placeholder="Nhập giá bán"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <span className="text-gray-500">đ</span>
                                    </div>
                                </div>
                                {currentItem['GIABAN_DEXUAT'] && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {parseFloat(currentItem['GIABAN_DEXUAT']).toLocaleString('vi-VN')} VNĐ
                                    </p>
                                )}
                            </div>

                            {/* Preview status */}
                            {currentItem['HIEULUC_TU'] && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 mb-2">Trạng thái dự kiến:</p>
                                    {getStatusBadge(currentItem['HIEULUC_TU'], currentItem['HIEULUC_DEN'])}
                                </div>
                            )}
                        </div>

                        {/* Footer with buttons */}
                        <div className="flex justify-end gap-3 pt-5 mt-6 border-t border-gray-200">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center"
                                disabled={isSubmitting}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveItem}
                                disabled={isSubmitting}
                                className={`px-5 py-2 bg-green-600 text-white rounded-lg ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-green-700 hover:shadow-md'
                                    } flex items-center gap-2 transition-all`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">Xác nhận xóa</h2>
                            <button
                                onClick={handleCloseDeleteConfirmation}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                                <p className="text-red-700 mb-2">
                                    Bạn có chắc chắn muốn xóa giá bán này?
                                </p>
                                <div className="bg-white rounded p-3 mt-2 space-y-2">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Nhóm hàng:</span> {itemToDelete['NHOMHANG']}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Giá bán:</span> {itemToDelete['GIABAN_DEXUAT']?.toLocaleString('vi-VN')} đ
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Hiệu lực:</span> {formatDateForDisplay(itemToDelete['HIEULUC_TU'])} - {formatDateForDisplay(itemToDelete['HIEULUC_DEN'])}
                                    </p>
                                    <div className="pt-2">
                                        {getStatusBadge(itemToDelete['HIEULUC_TU'], itemToDelete['HIEULUC_DEN'])}
                                    </div>
                                </div>
                                <p className="text-sm text-red-600 mt-3">
                                    Hành động này không thể hoàn tác.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleCloseDeleteConfirmation}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleDeleteItem}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm"
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
        </div>
    );
};

export default GiaBanManagement;
