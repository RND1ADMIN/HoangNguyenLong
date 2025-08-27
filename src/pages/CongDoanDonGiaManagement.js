import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Check, X, Filter, Calendar } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const CongDoanDonGiaManagement = () => {
    // State Management
    const [congDoanDonGias, setCongDoanDonGias] = useState([]);
    const [currentCongDoanDonGia, setCurrentCongDoanDonGia] = useState({
        'NGÀY CÀI ĐẶT': '',
        'HIỆU LỰC TỪ': '',
        'HIỆU LỰC ĐẾN': '',
        'MÃ CÔNG ĐOẠN': '',
        'TÊN CÔNG ĐOẠN': '',
        'NHÓM': '',
        'CHI TIẾT CÔNG ĐOẠN': '',
        'ĐƠN VỊ TÍNH': '',
        'PP TÍNH NĂNG SUẤT': '',
        'ĐƠN GIÁ NĂNG SUẤT': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [congDoanToDelete, setCongDoanToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [dateFilter, setDateFilter] = useState('');
    const [nhomFilter, setNhomFilter] = useState('');

    // Fetch data
    const fetchCongDoanDonGias = async () => {
        try {
            const response = await authUtils.apiRequest('CONGDOAN_DONGIA', 'Find', {});
            setCongDoanDonGias(response);
        } catch (error) {
            console.error('Error fetching cong doan don gia list:', error);
            toast.error('Lỗi khi tải danh sách công đoạn đơn giá');
        }
    };

    useEffect(() => {
        fetchCongDoanDonGias();
    }, []);

    // Generate mã công đoạn from nhóm and chi tiết công đoạn
    const generateMaCongDoan = (nhom, chiTiet) => {
        if (!nhom || !chiTiet) return '';

        // Function to get first letter of each word, handling Vietnamese characters
        const getFirstLetters = (text) => {
            return text
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese accents
                .toUpperCase()
                .split(/[\s,]+/) // Split by spaces and commas
                .filter(word => word.length > 0)
                .map(word => word.charAt(0))
                .join('');
        };

        // Get code from nhóm
        const nhomCode = getFirstLetters(nhom);

        // Get code from chi tiết - need to handle this differently
        // For "Cưa, cắt" we want "CUACAT" not "CC"
        const chiTietCode = chiTiet
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese accents
            .toUpperCase()
            .replace(/[^A-Z]/g, '') // Remove all non-letter characters (spaces, commas, etc.)
            .split('')
            .join('');

        return `${nhomCode}-${chiTietCode}`;
    };

    // Update tên công đoạn and mã công đoạn when nhóm or chi tiết changes
    const updateTenCongDoanAndMa = (nhom, chiTiet) => {
        const tenCongDoan = nhom && chiTiet ? `${nhom} - ${chiTiet}` : '';
        const maCongDoan = generateMaCongDoan(nhom, chiTiet);

        setCurrentCongDoanDonGia(prev => ({
            ...prev,
            'TÊN CÔNG ĐOẠN': tenCongDoan,
            'MÃ CÔNG ĐOẠN': maCongDoan
        }));
    };

    // Modal handlers
    const handleOpenModal = (congDoanDonGia = null) => {
        if (congDoanDonGia) {
            setIsEditMode(true);
            setCurrentCongDoanDonGia({
                'NGÀY CÀI ĐẶT': congDoanDonGia['NGÀY CÀI ĐẶT'] || '',
                'HIỆU LỰC TỪ': congDoanDonGia['HIỆU LỰC TỪ'] || '',
                'HIỆU LỰC ĐẾN': congDoanDonGia['HIỆU LỰC ĐẾN'] || '',
                'MÃ CÔNG ĐOẠN': congDoanDonGia['MÃ CÔNG ĐOẠN'] || '',
                'TÊN CÔNG ĐOẠN': congDoanDonGia['TÊN CÔNG ĐOẠN'] || '',
                'NHÓM': congDoanDonGia['NHÓM'] || '',
                'CHI TIẾT CÔNG ĐOẠN': congDoanDonGia['CHI TIẾT CÔNG ĐOẠN'] || '',
                'ĐƠN VỊ TÍNH': congDoanDonGia['ĐƠN VỊ TÍNH'] || '',
                'PP TÍNH NĂNG SUẤT': congDoanDonGia['PP TÍNH NĂNG SUẤT'] || '',
                'ĐƠN GIÁ NĂNG SUẤT': congDoanDonGia['ĐƠN GIÁ NĂNG SUẤT'] || ''
            });
        } else {
            setIsEditMode(false);
            const today = new Date().toISOString().split('T')[0];
            setCurrentCongDoanDonGia({
                'NGÀY CÀI ĐẶT': today,
                'HIỆU LỰC TỪ': today,
                'HIỆU LỰC ĐẾN': '',
                'MÃ CÔNG ĐOẠN': '',
                'TÊN CÔNG ĐOẠN': '',
                'NHÓM': '',
                'CHI TIẾT CÔNG ĐOẠN': '',
                'ĐƠN VỊ TÍNH': '',
                'PP TÍNH NĂNG SUẤT': '',
                'ĐƠN GIÁ NĂNG SUẤT': ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setCurrentCongDoanDonGia({
            'NGÀY CÀI ĐẶT': '',
            'HIỆU LỰC TỪ': '',
            'HIỆU LỰC ĐẾN': '',
            'MÃ CÔNG ĐOẠN': '',
            'TÊN CÔNG ĐOẠN': '',
            'NHÓM': '',
            'CHI TIẾT CÔNG ĐOẠN': '',
            'ĐƠN VỊ TÍNH': '',
            'PP TÍNH NĂNG SUẤT': '',
            'ĐƠN GIÁ NĂNG SUẤT': ''
        });
    };

    // Form handlers
    const handleInputChange = (field, value) => {
        setCurrentCongDoanDonGia(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-generate tên công đoạn và mã công đoạn khi nhóm hoặc chi tiết thay đổi
            if (field === 'NHÓM' || field === 'CHI TIẾT CÔNG ĐOẠN') {
                const nhom = field === 'NHÓM' ? value : updated['NHÓM'];
                const chiTiet = field === 'CHI TIẾT CÔNG ĐOẠN' ? value : updated['CHI TIẾT CÔNG ĐOẠN'];

                if (nhom && chiTiet) {
                    const tenCongDoan = `${nhom} - ${chiTiet}`;
                    const maCongDoan = generateMaCongDoan(nhom, chiTiet);
                    updated['TÊN CÔNG ĐOẠN'] = tenCongDoan;
                    updated['MÃ CÔNG ĐOẠN'] = maCongDoan;
                }
            }

            return updated;
        });
    };

    const validateCongDoanDonGia = (congDoanDonGia) => {
        const errors = [];
        if (!congDoanDonGia['NGÀY CÀI ĐẶT']) errors.push('Ngày cài đặt không được để trống');
        if (!congDoanDonGia['HIỆU LỰC TỪ']) errors.push('Hiệu lực từ không được để trống');
        if (!congDoanDonGia['NHÓM']) errors.push('Nhóm không được để trống');
        if (!congDoanDonGia['CHI TIẾT CÔNG ĐOẠN']) errors.push('Chi tiết công đoạn không được để trống');
        if (!congDoanDonGia['ĐƠN VỊ TÍNH']) errors.push('Đơn vị tính không được để trống');
        if (!congDoanDonGia['ĐƠN GIÁ NĂNG SUẤT']) errors.push('Đơn giá năng suất không được để trống');

        // Validate dates
        if (congDoanDonGia['HIỆU LỰC ĐẾN'] && congDoanDonGia['HIỆU LỰC TỪ']) {
            if (new Date(congDoanDonGia['HIỆU LỰC ĐẾN']) < new Date(congDoanDonGia['HIỆU LỰC TỪ'])) {
                errors.push('Hiệu lực đến phải sau hiệu lực từ');
            }
        }

        return errors;
    };

    // Save công đoạn đơn giá
    const handleSaveCongDoanDonGia = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateCongDoanDonGia(currentCongDoanDonGia);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                setIsSubmitting(false);
                return;
            }

            if (isEditMode) {
                await authUtils.apiRequest('CONGDOAN_DONGIA', 'Edit', {
                    "Rows": [currentCongDoanDonGia]
                });
                toast.success('Cập nhật công đoạn đơn giá thành công!');
            } else {
                // Check if mã công đoạn already exists
                const existingRecords = await authUtils.apiRequest('CONGDOAN_DONGIA', 'Find', {});
                const exists = existingRecords.some(item =>
                    item['MÃ CÔNG ĐOẠN'] === currentCongDoanDonGia['MÃ CÔNG ĐOẠN']
                );

                if (exists) {
                    toast.error('Mã công đoạn này đã tồn tại!');
                    setIsSubmitting(false);
                    return;
                }

                await authUtils.apiRequest('CONGDOAN_DONGIA', 'Add', {
                    "Rows": [currentCongDoanDonGia]
                });
                toast.success('Thêm công đoạn đơn giá mới thành công!');
            }

            await fetchCongDoanDonGias();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving cong doan don gia:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu công đoạn đơn giá'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handlers
    const handleOpenDeleteConfirmation = (congDoanDonGia) => {
        setCongDoanToDelete(congDoanDonGia);
        setShowDeleteConfirmation(true);
    };

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
        setCongDoanToDelete(null);
    };

    const handleDeleteCongDoanDonGia = async () => {
        if (!congDoanToDelete) return;

        try {
            await authUtils.apiRequest('CONGDOAN_DONGIA', 'Delete', {
                "Rows": [{ "MÃ CÔNG ĐOẠN": congDoanToDelete['MÃ CÔNG ĐOẠN'] }]
            });
            toast.success('Xóa công đoạn đơn giá thành công!');
            await fetchCongDoanDonGias();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting cong doan don gia:', error);
            toast.error('Có lỗi xảy ra khi xóa công đoạn đơn giá');
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

    const getSortedCongDoanDonGias = useCallback(() => {
        const sortableRecords = [...congDoanDonGias];
        if (sortConfig.key) {
            sortableRecords.sort((a, b) => {
                const keyA = a[sortConfig.key];
                const keyB = b[sortConfig.key];

                if (sortConfig.key === 'ĐƠN GIÁ NĂNG SUẤT') {
                    // Sort numerically for đơn giá
                    const numA = parseFloat(keyA) || 0;
                    const numB = parseFloat(keyB) || 0;
                    if (numA < numB) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (numA > numB) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                } else if (sortConfig.key.includes('NGÀY') || sortConfig.key.includes('HIỆU LỰC')) {
                    // Sort by date
                    const dateA = new Date(keyA || '1900-01-01');
                    const dateB = new Date(keyB || '1900-01-01');
                    if (dateA < dateB) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (dateA > dateB) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                } else {
                    // Sort alphabetically for other fields
                    if (keyA < keyB) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (keyA > keyB) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                }
            });
        }
        return sortableRecords;
    }, [congDoanDonGias, sortConfig]);

    // Filtering
    const filteredCongDoanDonGias = getSortedCongDoanDonGias().filter(item => {
        const matchesSearch = (
            item['TÊN CÔNG ĐOẠN']?.toLowerCase().includes(search.toLowerCase()) ||
            item['MÃ CÔNG ĐOẠN']?.toLowerCase().includes(search.toLowerCase()) ||
            item['NHÓM']?.toLowerCase().includes(search.toLowerCase()) ||
            item['CHI TIẾT CÔNG ĐOẠN']?.toLowerCase().includes(search.toLowerCase())
        );

        const matchesDateFilter = !dateFilter ||
            item['NGÀY CÀI ĐẶT']?.includes(dateFilter) ||
            item['HIỆU LỰC TỪ']?.includes(dateFilter);

        const matchesNhomFilter = !nhomFilter ||
            item['NHÓM']?.toLowerCase().includes(nhomFilter.toLowerCase());

        return matchesSearch && matchesDateFilter && matchesNhomFilter;
    });

    // Get sort direction icon
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    // Get unique nhóms for filter
    const uniqueNhoms = [...new Set(congDoanDonGias.map(item => item['NHÓM']).filter(Boolean))];

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-bold text-gray-800">Quản lý Công Đoạn & Đơn Giá</h1>
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
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm công đoạn
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên công đoạn, mã công đoạn, nhóm, chi tiết..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo ngày</label>
                                    <input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo nhóm</label>
                                    <select
                                        value={nhomFilter}
                                        onChange={(e) => setNhomFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Tất cả nhóm</option>
                                        {uniqueNhoms.map(nhom => (
                                            <option key={nhom} value={nhom}>{nhom}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setDateFilter('');
                                            setNhomFilter('');
                                            setSearch('');
                                        }}
                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Xóa bộ lọc
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <h3 className="text-sm text-blue-700 mb-1">Tổng số công đoạn</h3>
                            <p className="text-2xl font-bold text-blue-800">{congDoanDonGias.length}</p>
                        </div>

                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                            <h3 className="text-sm text-green-700 mb-1">Đơn giá cao nhất</h3>
                            <p className="text-2xl font-bold text-green-800">
                                {congDoanDonGias.length > 0
                                    ? Math.max(...congDoanDonGias.map(c => parseFloat(c['ĐƠN GIÁ NĂNG SUẤT']) || 0)).toLocaleString('vi-VN')
                                    : 0}
                            </p>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                            <h3 className="text-sm text-purple-700 mb-1">Số nhóm</h3>
                            <p className="text-2xl font-bold text-purple-800">{uniqueNhoms.length}</p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                            <h3 className="text-sm text-yellow-700 mb-1">Đơn giá trung bình</h3>
                            <p className="text-2xl font-bold text-yellow-800">
                                {congDoanDonGias.length > 0
                                    ? (congDoanDonGias.reduce((sum, c) => sum + (parseFloat(c['ĐƠN GIÁ NĂNG SUẤT']) || 0), 0) / congDoanDonGias.length).toLocaleString('vi-VN', { maximumFractionDigits: 0 })
                                    : 0}
                            </p>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col"
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('MÃ CÔNG ĐOẠN')}>
                                        Mã CD {getSortIcon('MÃ CÔNG ĐOẠN')}
                                    </th>
                                    <th scope="col"
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('TÊN CÔNG ĐOẠN')}>
                                        Tên công đoạn {getSortIcon('TÊN CÔNG ĐOẠN')}
                                    </th>
                                    <th scope="col"
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('NHÓM')}>
                                        Nhóm {getSortIcon('NHÓM')}
                                    </th>
                                    <th scope="col"
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('ĐƠN GIÁ NĂNG SUẤT')}>
                                        Đơn giá {getSortIcon('ĐƠN GIÁ NĂNG SUẤT')}
                                    </th>
                                    <th scope="col"
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('HIỆU LỰC TỪ')}>
                                        Hiệu lực từ {getSortIcon('HIỆU LỰC TỪ')}
                                    </th>
                                    <th scope="col"
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('HIỆU LỰC ĐẾN')}>
                                        Hiệu lực đến {getSortIcon('HIỆU LỰC ĐẾN')}
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredCongDoanDonGias.length > 0 ? (
                                    filteredCongDoanDonGias.map((item, index) => (
                                        <tr key={`${item['MÃ CÔNG ĐOẠN']}-${index}`} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {item['MÃ CÔNG ĐOẠN']}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900">
                                                <div className="max-w-xs truncate" title={item['TÊN CÔNG ĐOẠN']}>
                                                    {item['TÊN CÔNG ĐOẠN']}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {item['NHÓM']}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                {parseFloat(item['ĐƠN GIÁ NĂNG SUẤT']).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {item['HIỆU LỰC TỪ']}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {item['HIỆU LỰC ĐẾN'] || '—'}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                                        title="Sửa công đoạn"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDeleteConfirmation(item)}
                                                        className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                                        title="Xóa công đoạn"
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-3 py-6 text-center text-sm text-gray-500">
                                            Không tìm thấy công đoạn nào phù hợp với tiêu chí tìm kiếm
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
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditMode ? 'Cập nhật công đoạn đơn giá' : 'Thêm công đoạn đơn giá mới'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ngày cài đặt <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={currentCongDoanDonGia['NGÀY CÀI ĐẶT']}
                                        onChange={(e) => handleInputChange('NGÀY CÀI ĐẶT', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hiệu lực từ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={currentCongDoanDonGia['HIỆU LỰC TỪ']}
                                        onChange={(e) => handleInputChange('HIỆU LỰC TỪ', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hiệu lực đến
                                    </label>
                                    <input
                                        type="date"
                                        value={currentCongDoanDonGia['HIỆU LỰC ĐẾN']}
                                        onChange={(e) => handleInputChange('HIỆU LỰC ĐẾN', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nhóm <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={currentCongDoanDonGia['NHÓM']}
                                        onChange={(e) => handleInputChange('NHÓM', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập nhóm công đoạn"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Chi tiết công đoạn <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={currentCongDoanDonGia['CHI TIẾT CÔNG ĐOẠN']}
                                        onChange={(e) => handleInputChange('CHI TIẾT CÔNG ĐOẠN', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập chi tiết công đoạn"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tên công đoạn (tự động tạo)
                                    </label>
                                    <input
                                        type="text"
                                        value={currentCongDoanDonGia['TÊN CÔNG ĐOẠN']}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100"
                                        readOnly
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tự động tạo từ: Nhóm - Chi tiết công đoạn
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mã công đoạn (tự động tạo)
                                    </label>
                                    <input
                                        type="text"
                                        value={currentCongDoanDonGia['MÃ CÔNG ĐOẠN']}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100"
                                        readOnly
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tự động tạo từ chữ cái đầu của tên công đoạn
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đơn vị tính <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={currentCongDoanDonGia['ĐƠN VỊ TÍNH']}
                                        onChange={(e) => handleInputChange('ĐƠN VỊ TÍNH', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    >
                                        <option value="">Chọn đơn vị tính</option>
                                        <option value="Tấn">Tấn</option>
                                        <option value="Kg">Kg</option>
                                        <option value="M2">M2</option>
                                        <option value="M3">M3</option>
                                        <option value="Cái">Cái</option>
                                        <option value="Lần">Lần</option>
                                        <option value="Giờ">Giờ</option>
                                        <option value="Ngày">Ngày</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phương pháp tính năng suất
                                    </label>
                                    <input
                                        type="text"
                                        value={currentCongDoanDonGia['PP TÍNH NĂNG SUẤT']}
                                        onChange={(e) => handleInputChange('PP TÍNH NĂNG SUẤT', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập phương pháp tính năng suất"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đơn giá năng suất <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={currentCongDoanDonGia['ĐƠN GIÁ NĂNG SUẤT']}
                                        onChange={(e) => handleInputChange('ĐƠN GIÁ NĂNG SUẤT', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập đơn giá"
                                        min="0"
                                        step="1000"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                disabled={isSubmitting}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveCongDoanDonGia}
                                disabled={isSubmitting}
                                className={`px-4 py-2 bg-indigo-600 text-white rounded-lg ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-indigo-700'
                                    } flex items-center gap-2 transition-colors shadow-sm`}
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
                                        <Check className="h-4 w-4" />
                                        {isEditMode ? 'Cập nhật' : 'Thêm mới'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && congDoanToDelete && (
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
                                <p className="text-red-700">
                                    Bạn có chắc chắn muốn xóa công đoạn <span className="font-bold">{congDoanToDelete['TÊN CÔNG ĐOẠN']}</span>?
                                </p>
                                <div className="mt-3 text-sm text-red-600">
                                    <p><strong>Mã:</strong> {congDoanToDelete['MÃ CÔNG ĐOẠN']}</p>
                                    <p><strong>Đơn giá:</strong> {parseFloat(congDoanToDelete['ĐƠN GIÁ NĂNG SUẤT']).toLocaleString('vi-VN')} VNĐ</p>
                                </div>
                                <p className="text-sm text-red-600 mt-2">
                                    Hành động này không thể hoàn tác và có thể ảnh hưởng đến các báo cáo đã sử dụng công đoạn này.
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
                                    onClick={handleDeleteCongDoanDonGia}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Trash className="h-4 w-4" />
                                    Xóa công đoạn
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

export default CongDoanDonGiaManagement;