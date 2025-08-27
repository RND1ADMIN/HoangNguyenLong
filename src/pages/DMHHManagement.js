import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash, Search, Filter, Image, X, Upload } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const DMHHManagement = () => {
    // State Management
    const [dmhhItems, setDmhhItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        'MÃ HÀNG': '',
        'TÊN HÀNG': '',
        'LOẠI': 'THÀNH PHẨM', // Default value
        'HÌNH ẢNH': '',
        'QUY CÁCH': '',
        'GHI CHÚ': '',
        'ĐƠN GIÁ': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [filterType, setFilterType] = useState('TẤT CẢ');
    const [selectedImage, setSelectedImage] = useState(null);
    // Add a ref for the drop zone
    const dropZoneRef = useRef(null);
    // Add drag state to show visual feedback
    const [isDragging, setIsDragging] = useState(false);
    // Fetch data
    const fetchDMHH = async () => {
        try {
            const response = await authUtils.apiRequest('DMHH', 'Find', {});
            setDmhhItems(response);
        } catch (error) {
            console.error('Error fetching DMHH list:', error);
            toast.error('Lỗi khi tải danh mục hàng hóa');
        }
    };

    useEffect(() => {
        fetchDMHH();
    }, []);
    // Thêm hàm xử lý tải ảnh lên
    const handleImageUpload = async (file) => {
        if (!file) return;

        try {
            // Hiển thị trước ảnh ngay lập tức để UX tốt hơn
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);

            // Hiển thị thông báo đang tải
            const toastId = toast.loading("Đang tải ảnh lên...");

            // Gọi API upload ảnh
            const result = await authUtils.uploadImage(file);

            if (result && result.success && result.url) {
                // Cập nhật URL ảnh từ kết quả upload
                handleInputChange('HÌNH ẢNH', result.url);
                setSelectedImage(result.url);
                toast.update(toastId, {
                    render: "Tải ảnh thành công",
                    type: "success",
                    isLoading: false,
                    autoClose: 2000
                });
            } else {
                throw new Error("Không thể lấy URL ảnh");
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Lỗi khi tải ảnh: ' + error.message);
            // Nếu upload thất bại, xóa ảnh preview
            setSelectedImage(null);
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];

            // Validate file before proceeding
            const validation = authUtils.validateImage(file);

            if (!validation.isValid) {
                toast.error(validation.errors.join('\n'));
                return;
            }

            // Handle the dropped file
            setCurrentItem(prev => ({
                ...prev,
                'FILE_IMAGE': file
            }));

            // Show preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);

            // Upload the image right away if needed
            if (authUtils.shouldUploadImmediately) {
                handleImageUpload(file);
            }
        }
    };
    // Modal handlers
    const handleOpenModal = (item = null) => {
        if (item) {
            setIsEditMode(true);
            setCurrentItem({
                'MÃ HÀNG': item['MÃ HÀNG'] || '',
                'TÊN HÀNG': item['TÊN HÀNG'] || '',
                'LOẠI': item['LOẠI'] || 'THÀNH PHẨM',
                'HÌNH ẢNH': item['HÌNH ẢNH'] || '',
                'QUY CÁCH': item['QUY CÁCH'] || '',
                'GHI CHÚ': item['GHI CHÚ'] || '',
                'ĐƠN GIÁ': item['ĐƠN GIÁ'] || ''
            });
            setSelectedImage(item['HÌNH ẢNH'] || null);
        } else {
            setIsEditMode(false);
            setCurrentItem({
                'MÃ HÀNG': '',
                'TÊN HÀNG': '',
                'LOẠI': 'THÀNH PHẨM',
                'HÌNH ẢNH': '',
                'QUY CÁCH': '',
                'GHI CHÚ': '',
                'ĐƠN GIÁ': ''
            });
            setSelectedImage(null);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setSelectedImage(null);
        setCurrentItem({
            'MÃ HÀNG': '',
            'TÊN HÀNG': '',
            'LOẠI': 'THÀNH PHẨM',
            'HÌNH ẢNH': '',
            'QUY CÁCH': '',
            'GHI CHÚ': '',
            'ĐƠN GIÁ': ''
        });
    };

    // Form handlers
    const handleInputChange = (field, value) => {
        setCurrentItem(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Cập nhật lại hàm handleImageChange
    const handleImageChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            // Validate file trước khi lưu vào state
            const validation = authUtils.validateImage(file);

            if (!validation.isValid) {
                toast.error(validation.errors.join('\n'));
                return;
            }

            // Lưu file vào state
            setCurrentItem(prev => ({
                ...prev,
                'FILE_IMAGE': file // Lưu file để upload sau
            }));

            // Hiển thị preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    const validateItem = (item) => {
        const errors = [];
        if (!item['MÃ HÀNG']) errors.push('Mã hàng không được để trống');
        if (!item['TÊN HÀNG']) errors.push('Tên hàng không được để trống');
        if (!item['LOẠI']) errors.push('Loại hàng không được để trống');
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

            // Tạo một bản sao của item để xử lý
            let itemToSave = { ...currentItem };

            // Nếu có file ảnh mới, upload lên server
            if (itemToSave['FILE_IMAGE']) {
                try {
                    const uploadResult = await authUtils.uploadImage(itemToSave['FILE_IMAGE']);
                    if (uploadResult && uploadResult.success && uploadResult.url) {
                        // Cập nhật URL ảnh từ kết quả upload
                        itemToSave['HÌNH ẢNH'] = uploadResult.url;
                    } else {
                        throw new Error("Không thể lấy URL ảnh");
                    }
                } catch (error) {
                    toast.error('Lỗi khi tải ảnh: ' + error.message);
                    setIsSubmitting(false);
                    return;
                }
            }

            // Xóa trường FILE_IMAGE trước khi gửi đến API
            delete itemToSave['FILE_IMAGE'];

            if (isEditMode) {
                // Edit existing item
                await authUtils.apiRequest('DMHH', 'Edit', {
                    "Rows": [itemToSave]
                });
                toast.success('Cập nhật hàng hóa thành công!');
            } else {
                // Create new item
                const existingItems = await authUtils.apiRequest('DMHH', 'Find', {});

                // Check if item code already exists
                const exists = existingItems.some(item =>
                    item['MÃ HÀNG'].toLowerCase() === itemToSave['MÃ HÀNG'].toLowerCase()
                );

                if (exists) {
                    toast.error('Mã hàng này đã tồn tại!');
                    setIsSubmitting(false);
                    return;
                }

                await authUtils.apiRequest('DMHH', 'Add', {
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
            await authUtils.apiRequest('DMHH', 'Delete', {
                "Rows": [{ "MÃ HÀNG": itemToDelete['MÃ HÀNG'] }]
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
            (item['MÃ HÀNG']?.toLowerCase().includes(search.toLowerCase()) ||
                item['TÊN HÀNG']?.toLowerCase().includes(search.toLowerCase()) ||
                item['GHI CHÚ']?.toLowerCase().includes(search.toLowerCase()));

        const matchesType = filterType === 'TẤT CẢ' || item['LOẠI'] === filterType;

        return matchesSearch && matchesType;
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
                        <h1 className="text-2xl font-bold text-gray-800">Danh Mục Hàng Hóa</h1>
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
                                Thêm hàng hóa
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo mã hàng, tên hàng hoặc ghi chú..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {showFilters && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Lọc theo loại:</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setFilterType('TẤT CẢ')}
                                        className={`px-3 py-1.5 rounded-full text-sm ${filterType === 'TẤT CẢ'
                                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        Tất cả
                                    </button>
                                    <button
                                        onClick={() => setFilterType('THÀNH PHẨM')}
                                        className={`px-3 py-1.5 rounded-full text-sm ${filterType === 'THÀNH PHẨM'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        Thành phẩm
                                    </button>
                                    <button
                                        onClick={() => setFilterType('NGUYÊN VẬT LIỆU')}
                                        className={`px-3 py-1.5 rounded-full text-sm ${filterType === 'NGUYÊN VẬT LIỆU'
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        Nguyên vật liệu
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <h3 className="text-sm text-blue-700 mb-1">Tổng số hàng hóa</h3>
                            <p className="text-2xl font-bold text-blue-800">{dmhhItems.length}</p>
                        </div>

                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                            <h3 className="text-sm text-green-700 mb-1">Số lượng thành phẩm</h3>
                            <p className="text-2xl font-bold text-green-800">
                                {dmhhItems.filter(item => item['LOẠI'] === 'THÀNH PHẨM').length}
                            </p>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                            <h3 className="text-sm text-purple-700 mb-1">Số lượng nguyên vật liệu</h3>
                            <p className="text-2xl font-bold text-purple-800">
                                {dmhhItems.filter(item => item['LOẠI'] === 'NGUYÊN VẬT LIỆU').length}
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
                                        onClick={() => requestSort('MÃ HÀNG')}>
                                        Mã hàng {getSortIcon('MÃ HÀNG')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('TÊN HÀNG')}>
                                        Tên hàng {getSortIcon('TÊN HÀNG')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('LOẠI')}>
                                        Loại {getSortIcon('LOẠI')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hình ảnh
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quy cách
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
                                {filteredItems.length > 0 ? (
                                    filteredItems.map((item) => (
                                        <tr key={item['MÃ HÀNG']} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {item['MÃ HÀNG']}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item['TÊN HÀNG']}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item['LOẠI'] === 'THÀNH PHẨM'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {item['LOẠI']}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item['HÌNH ẢNH'] ? (
                                                    <div className="w-12 h-12 relative">
                                                        <img
                                                            src={item['HÌNH ẢNH']}
                                                            alt={item['TÊN HÀNG']}
                                                            className="w-full h-full object-cover rounded-md border border-gray-200"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-md border border-gray-200">
                                                        <Image className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                <div className="max-w-xs truncate">{item['QUY CÁCH'] || '—'}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {item['ĐƠN GIÁ'] ? `${item['ĐƠN GIÁ'].toLocaleString()} đ` : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                <div className="max-w-xs truncate">{item['GHI CHÚ'] || '—'}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                                        title="Sửa hàng hóa"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDeleteConfirmation(item)}
                                                        className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                                        title="Xóa hàng hóa"
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-6 text-center text-sm text-gray-500">
                                            Không tìm thấy hàng hóa nào phù hợp với tiêu chí tìm kiếm
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit DMHH Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditMode ? 'Cập nhật hàng hóa' : 'Thêm hàng hóa mới'}
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
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mã hàng <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={currentItem['MÃ HÀNG']}
                                        onChange={(e) => handleInputChange('MÃ HÀNG', e.target.value)}
                                        className={`p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 ${isEditMode ? 'bg-gray-100' : ''}`}
                                        placeholder="Nhập mã hàng"
                                        readOnly={isEditMode}
                                        required
                                    />
                                    {isEditMode && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Mã hàng không thể thay đổi sau khi đã tạo.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tên hàng <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={currentItem['TÊN HÀNG']}
                                        onChange={(e) => handleInputChange('TÊN HÀNG', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập tên hàng"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Loại <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex space-x-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="THÀNH PHẨM"
                                                checked={currentItem['LOẠI'] === 'THÀNH PHẨM'}
                                                onChange={(e) => handleInputChange('LOẠI', e.target.value)}
                                                className="mr-2 h-4 w-4 text-indigo-600"
                                            />
                                            <span className="text-gray-800">Thành phẩm</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="NGUYÊN VẬT LIỆU"
                                                checked={currentItem['LOẠI'] === 'NGUYÊN VẬT LIỆU'}
                                                onChange={(e) => handleInputChange('LOẠI', e.target.value)}
                                                className="mr-2 h-4 w-4 text-indigo-600"
                                            />
                                            <span className="text-gray-800">Nguyên vật liệu</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quy cách
                                    </label>
                                    <input
                                        type="text"
                                        value={currentItem['QUY CÁCH']}
                                        onChange={(e) => handleInputChange('QUY CÁCH', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập quy cách (nếu có)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đơn giá
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={currentItem['ĐƠN GIÁ']}
                                            onChange={(e) => handleInputChange('ĐƠN GIÁ', e.target.value)}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 pr-12"
                                            placeholder="Nhập đơn giá"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <span className="text-gray-500">đ</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-5">
                                <div className="h-full flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hình ảnh
                                    </label>
                                    <div
                                        ref={dropZoneRef}
                                        onDragEnter={handleDragEnter}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`flex-1 p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-gray-50 transition-all cursor-pointer hover:bg-gray-100 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                                            }`}
                                    >
                                        <div className="w-full flex items-center justify-center mb-3">
                                            <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-white overflow-hidden">
                                                {selectedImage ? (
                                                    <img
                                                        src={selectedImage}
                                                        alt="Product preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Image className="h-12 w-12 text-gray-300" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            <Upload className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                                            <p className="text-sm text-gray-600 mb-1">
                                                {isDragging ? 'Thả ảnh vào đây' : 'Kéo và thả ảnh vào đây hoặc'}
                                            </p>
                                            <label className="cursor-pointer px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm inline-flex items-center">
                                                <Upload className="h-4 w-4 mr-2" />
                                                Chọn ảnh
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                />
                                            </label>
                                        </div>

                                        <p className="text-xs text-gray-500 mt-3">
                                            Hình ảnh nên có kích thước vuông, tối đa 5MB.
                                        </p>
                                    </div>

                                    {selectedImage && (
                                        <div className="mt-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedImage(null);
                                                    handleInputChange('HÌNH ẢNH', '');
                                                }}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors shadow-sm flex items-center"
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Xóa ảnh
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-auto">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Ghi chú
                                        </label>
                                        <textarea
                                            value={currentItem['GHI CHÚ']}
                                            onChange={(e) => handleInputChange('GHI CHÚ', e.target.value)}
                                            rows={4}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Nhập ghi chú (nếu có)"
                                        />
                                    </div>
                                </div>
                            </div>
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
                                className={`px-5 py-2 bg-indigo-600 text-white rounded-lg ${isSubmitting
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-indigo-700 hover:shadow-md'
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
                                    Bạn có chắc chắn muốn xóa hàng hóa <span className="font-bold">{itemToDelete['MÃ HÀNG']} - {itemToDelete['TÊN HÀNG']}</span>?
                                </p>
                                <p className="text-sm text-red-600 mt-2">
                                    Hành động này không thể hoàn tác và có thể ảnh hưởng đến các dữ liệu liên quan.
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
        </div>
    );
};

export default DMHHManagement;