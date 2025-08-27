import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Check, X, Filter } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const CongDoanManagement = () => {
    // State Management
    const [congDoans, setCongDoans] = useState([]);
    const [currentCongDoan, setCurrentCongDoan] = useState({
        'CÔNG ĐOẠN': '',
        'ĐƠN GIÁ': '',
        'GHI CHÚ': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [congDoanToDelete, setCongDoanToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);

    // Fetch data
    const fetchCongDoans = async () => {
        try {
            const response = await authUtils.apiRequest('CONGDOAN', 'Find', {});
            setCongDoans(response);
        } catch (error) {
            console.error('Error fetching cong doan list:', error);
            toast.error('Lỗi khi tải danh sách công đoạn');
        }
    };

    useEffect(() => {
        fetchCongDoans();
    }, []);

    // Modal handlers
    const handleOpenModal = (congDoan = null) => {
        if (congDoan) {
            setIsEditMode(true);
            setCurrentCongDoan({
                'CÔNG ĐOẠN': congDoan['CÔNG ĐOẠN'] || '',
                'ĐƠN GIÁ': congDoan['ĐƠN GIÁ'] || '',
                'GHI CHÚ': congDoan['GHI CHÚ'] || ''
            });
        } else {
            setIsEditMode(false);
            setCurrentCongDoan({
                'CÔNG ĐOẠN': '',
                'ĐƠN GIÁ': '',
                'GHI CHÚ': ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setCurrentCongDoan({
            'CÔNG ĐOẠN': '',
            'ĐƠN GIÁ': '',
            'GHI CHÚ': ''
        });
    };

    // Form handlers
    const handleInputChange = (field, value) => {
        setCurrentCongDoan(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateCongDoan = (congDoan) => {
        const errors = [];
        if (!isEditMode && !congDoan['CÔNG ĐOẠN']) errors.push('Tên công đoạn không được để trống');
        if (!congDoan['ĐƠN GIÁ']) errors.push('Đơn giá không được để trống');
        return errors;
    };

    // Save công đoạn
    const handleSaveCongDoan = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateCongDoan(currentCongDoan);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                setIsSubmitting(false);
                return;
            }

            if (isEditMode) {
                // Edit existing công đoạn - chỉ cập nhật đơn giá và ghi chú
                await authUtils.apiRequest('CONGDOAN', 'Edit', {
                    "Rows": [currentCongDoan]
                });
                toast.success('Cập nhật công đoạn thành công!');
            } else {
                // Create new công đoạn
                const existingCongDoans = await authUtils.apiRequest('CONGDOAN', 'Find', {});

                // Check if công đoạn already exists
                const exists = existingCongDoans.some(item =>
                    item['CÔNG ĐOẠN'].toLowerCase() === currentCongDoan['CÔNG ĐOẠN'].toLowerCase()
                );

                if (exists) {
                    toast.error('Công đoạn này đã tồn tại!');
                    setIsSubmitting(false);
                    return;
                }

                const newCongDoan = {
                    ...currentCongDoan
                };

                await authUtils.apiRequest('CONGDOAN', 'Add', {
                    "Rows": [newCongDoan]
                });
                toast.success('Thêm công đoạn mới thành công!');
            }

            await fetchCongDoans();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving cong doan:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu công đoạn'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handlers
    const handleOpenDeleteConfirmation = (congDoan) => {
        setCongDoanToDelete(congDoan);
        setShowDeleteConfirmation(true);
    };

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
        setCongDoanToDelete(null);
    };

    const handleDeleteCongDoan = async () => {
        if (!congDoanToDelete) return;

        try {
            await authUtils.apiRequest('CONGDOAN', 'Delete', {
                "Rows": [{ "CÔNG ĐOẠN": congDoanToDelete['CÔNG ĐOẠN'] }]
            });
            toast.success('Xóa công đoạn thành công!');
            await fetchCongDoans();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting cong doan:', error);
            toast.error('Có lỗi xảy ra khi xóa công đoạn');
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

    const getSortedCongDoans = useCallback(() => {
        const sortableCongDoans = [...congDoans];
        if (sortConfig.key) {
            sortableCongDoans.sort((a, b) => {
                const keyA = a[sortConfig.key];
                const keyB = b[sortConfig.key];

                if (sortConfig.key === 'ĐƠN GIÁ') {
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
        return sortableCongDoans;
    }, [congDoans, sortConfig]);

    // Filtering
    const filteredCongDoans = getSortedCongDoans().filter(congDoan => {
        return (
            congDoan['CÔNG ĐOẠN'].toLowerCase().includes(search.toLowerCase()) ||
            congDoan['GHI CHÚ']?.toLowerCase().includes(search.toLowerCase())
        );
    });

    // Get sort direction icon
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-bold text-gray-800">Quản lý Công Đoạn</h1>
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

                    {/* Search Section */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên công đoạn hoặc ghi chú..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <h3 className="text-sm text-blue-700 mb-1">Tổng số công đoạn</h3>
                            <p className="text-2xl font-bold text-blue-800">{congDoans.length}</p>
                        </div>

                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                            <h3 className="text-sm text-green-700 mb-1">Đơn giá cao nhất</h3>
                            <p className="text-2xl font-bold text-green-800">
                                {congDoans.length > 0
                                    ? Math.max(...congDoans.map(c => parseFloat(c['ĐƠN GIÁ']) || 0)).toLocaleString('vi-VN')
                                    : 0}
                            </p>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                            <h3 className="text-sm text-purple-700 mb-1">Đơn giá trung bình</h3>
                            <p className="text-2xl font-bold text-purple-800">
                                {congDoans.length > 0
                                    ? (congDoans.reduce((sum, c) => sum + (parseFloat(c['ĐƠN GIÁ']) || 0), 0) / congDoans.length).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
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
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('CÔNG ĐOẠN')}>
                                        Công đoạn {getSortIcon('CÔNG ĐOẠN')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('ĐƠN GIÁ')}>
                                        Đơn giá {getSortIcon('ĐƠN GIÁ')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ghi chú
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredCongDoans.length > 0 ? (
                                    filteredCongDoans.map((congDoan) => (
                                        <tr key={congDoan['CÔNG ĐOẠN']} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {congDoan['CÔNG ĐOẠN']}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                {congDoan['ĐƠN GIÁ']}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                <div className="max-w-xs truncate">{congDoan['GHI CHÚ'] || '—'}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <button
                                                        onClick={() => handleOpenModal(congDoan)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                                        title="Sửa công đoạn"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDeleteConfirmation(congDoan)}
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
                                        <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">
                                            Không tìm thấy công đoạn nào phù hợp với tiêu chí tìm kiếm
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Công Đoạn Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditMode ? 'Cập nhật công đoạn' : 'Thêm công đoạn mới'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên công đoạn <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={currentCongDoan['CÔNG ĐOẠN']}
                                    onChange={(e) => handleInputChange('CÔNG ĐOẠN', e.target.value)}
                                    className={`p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 ${isEditMode ? 'bg-gray-100' : ''}`}
                                    placeholder="Nhập tên công đoạn"
                                    readOnly={isEditMode}
                                    required
                                />
                                {isEditMode && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tên công đoạn không thể thay đổi, chỉ có thể cập nhật đơn giá và ghi chú.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Đơn giá <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={currentCongDoan['ĐƠN GIÁ']}
                                    onChange={(e) => handleInputChange('ĐƠN GIÁ', e.target.value)}
                                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Nhập đơn giá"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                <textarea
                                    value={currentCongDoan['GHI CHÚ']}
                                    onChange={(e) => handleInputChange('GHI CHÚ', e.target.value)}
                                    rows={3}
                                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Nhập ghi chú (nếu có)"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSaveCongDoan}
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
                                    ) : 'Lưu công đoạn'}
                                </button>
                            </div>
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
                                    Bạn có chắc chắn muốn xóa công đoạn <span className="font-bold">{congDoanToDelete['CÔNG ĐOẠN']}</span>?
                                </p>
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
                                    onClick={handleDeleteCongDoan}
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

export default CongDoanManagement;