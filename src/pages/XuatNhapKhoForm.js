import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Save, Trash, FileText, ShoppingCart, Package, ArrowDownCircle, X, Check, AlertCircle, Grid, ArrowLeft } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const XuatNhapKhoForm = () => {
    // Thêm hooks cho việc điều hướng và lấy tham số
    const { maPhieu } = useParams();
    const navigate = useNavigate();
    const [isEditMode, setIsEditMode] = useState(false);

    // State Management for form
    const [phieuData, setPhieuData] = useState({
        'MÃ PHIẾU': '',
        'LOẠI PHIẾU': 'NHẬP KHO',
        'MỤC ĐÍCH': 'NHẬP NVL',
        'NGÀY GD': new Date().toISOString().split('T')[0],
        'ĐỐI TÁC': '',
        'NGƯỜI TẠO': '',
        'TỔNG TIỀN': 0,
        'GHI CHÚ': '',
        'TRẠNG THÁI': 'DRAFT'
    });

    // State for detail items
    const [chiTietItems, setChiTietItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        'MÃ HÀNG': '',
        'TÊN HÀNG': '',
        'SỐ LƯỢNG': 1,
        'ĐƠN GIÁ': 0,
        'THÀNH TIỀN': 0,
        'GHI CHÚ': ''
    });

    // State for product list and search
    const [danhSachHangHoa, setDanhSachHangHoa] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [filteredByType, setFilteredByType] = useState([]); // Sản phẩm được lọc theo loại
    const [searchQuery, setSearchQuery] = useState('');
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userData, setUserData] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'search' hoặc 'grid'

    const dropdownRef = useRef(null);

    // Fetch initial data
    useEffect(() => {
        fetchDanhSachHangHoa();
        const currentUser = authUtils.getUserData();
        if (currentUser) {
            setUserData(currentUser);
            setPhieuData(prev => ({
                ...prev,
                'NGƯỜI TẠO': currentUser?.['Họ và Tên']
            }));
        }

        // Nếu có mã phiếu, tải dữ liệu phiếu để chỉnh sửa
        if (maPhieu) {
            fetchPhieuData(maPhieu);
            setIsEditMode(true);
        } else {
            // Generate unique ID for new form
            generateMaPhieu();
        }

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProductSearch(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [maPhieu]);

    // Thêm hàm để tải dữ liệu phiếu
    const fetchPhieuData = async (id) => {
        try {
            // Tải thông tin phiếu
            const phieuResponse = await authUtils.apiRequest('XUATNHAPKHO', 'Find', {

                Properties: {
                    Selector: `Filter(XUATNHAPKHO, [MÃ PHIẾU] = "${id}" )`
                }
            });

            if (phieuResponse && phieuResponse.length > 0) {
                const phieu = phieuResponse[0];
                setPhieuData(phieu);

                // Tải chi tiết phiếu
                const chiTietResponse = await authUtils.apiRequest('XUATNHAPKHO_CHITIET', 'Find', {
                    Properties: {
                        Selector: `Filter(XUATNHAPKHO_CHITIET, [MÃ PHIẾU] = "${id}" )`
                    }
                });

                if (chiTietResponse && chiTietResponse.length > 0) {
                    // Cần lấy thông tin tên hàng từ danh sách hàng hóa
                    const items = await Promise.all(chiTietResponse.map(async (item) => {
                        const productInfo = await getProductInfo(item['MÃ HÀNG']);
                        return {
                            ...item,
                            'TÊN HÀNG': productInfo?.['TÊN HÀNG'] || 'Không xác định'
                        };
                    }));

                    setChiTietItems(items);
                }

                toast.info('Đã tải thông tin phiếu để chỉnh sửa');
            } else {
                toast.error('Không tìm thấy phiếu');
                navigate('/xuatnhapkho');
            }
        } catch (error) {
            console.error('Error fetching document:', error);
            toast.error('Lỗi khi tải thông tin phiếu');
        }
    };

    // Hàm để lấy thông tin sản phẩm
    const getProductInfo = async (maHang) => {
        try {
            const response = await authUtils.apiRequest('DMHH', 'Find', {
                "Where": {
                    "MÃ HÀNG": maHang
                }
            });

            if (response && response.length > 0) {
                return response[0];
            }
            return null;
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    };

    // Generate phieu ID
    const generateMaPhieu = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

        const prefix = phieuData['LOẠI PHIẾU'] === 'NHẬP KHO' ? 'NK' : 'XK';
        const newMaPhieu = `${prefix}${year}${month}${day}${randomNum}`;

        setPhieuData(prev => ({
            ...prev,
            'MÃ PHIẾU': newMaPhieu
        }));
    };

    // Update mã phiếu when loại phiếu changes
    useEffect(() => {
        // Chỉ tạo mã phiếu mới khi không ở chế độ chỉnh sửa
        if (!isEditMode) {
            generateMaPhieu();
            updateMucDich(phieuData['LOẠI PHIẾU']);
        }
    }, [phieuData['LOẠI PHIẾU'], isEditMode]);

    // Auto update mục đích based on loại phiếu
    const updateMucDich = (loaiPhieu) => {
        if (loaiPhieu === 'NHẬP KHO') {
            setPhieuData(prev => ({
                ...prev,
                'MỤC ĐÍCH': 'NHẬP NVL'
            }));
        } else {
            setPhieuData(prev => ({
                ...prev,
                'MỤC ĐÍCH': 'XUẤT CHẾ BIẾN'
            }));
        }
    };

    // Fetch products
    const fetchDanhSachHangHoa = async () => {
        try {
            const response = await authUtils.apiRequest('DMHH', 'Find', {});
            setDanhSachHangHoa(response);
        } catch (error) {
            console.error('Error fetching product list:', error);
            toast.error('Lỗi khi tải danh mục hàng hóa');
        }
    };

    // Filter products based on search query and current purpose
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProducts([]);
            return;
        }

        const isNhap = phieuData['LOẠI PHIẾU'] === 'NHẬP KHO';
        const isThanhPham = phieuData['MỤC ĐÍCH'] === 'NHẬP THÀNH PHẨM' || phieuData['MỤC ĐÍCH'] === 'XUẤT BÁN';

        let filtered = danhSachHangHoa.filter(item => {
            // Match search query
            const matchesSearch = (
                item['MÃ HÀNG']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item['TÊN HÀNG']?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            // Filter by type based on purpose
            const isCorrectType = isThanhPham
                ? item['LOẠI'] === 'THÀNH PHẨM'
                : item['LOẠI'] === 'NGUYÊN VẬT LIỆU';

            return matchesSearch && isCorrectType;
        });

        setFilteredProducts(filtered);
    }, [searchQuery, danhSachHangHoa, phieuData['MỤC ĐÍCH'], phieuData['LOẠI PHIẾU']]);

    // Filter by type for grid view
    const filterProductsByType = () => {
        const isThanhPham = phieuData['MỤC ĐÍCH'] === 'NHẬP THÀNH PHẨM' || phieuData['MỤC ĐÍCH'] === 'XUẤT BÁN';

        const filtered = danhSachHangHoa.filter(item => {
            const isCorrectType = isThanhPham
                ? item['LOẠI'] === 'THÀNH PHẨM'
                : item['LOẠI'] === 'NGUYÊN VẬT LIỆU';

            return isCorrectType;
        });

        setFilteredByType(filtered);
    };

    // Update filtered products when mục đích changes
    useEffect(() => {
        if (danhSachHangHoa.length > 0) {
            filterProductsByType();
        }
    }, [danhSachHangHoa, phieuData['MỤC ĐÍCH']]);

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setPhieuData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle search input changes
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setShowProductSearch(true);
    };

    // Handle selecting a product from dropdown
    const handleSelectProduct = (product) => {
        setCurrentItem({
            'MÃ HÀNG': product['MÃ HÀNG'],
            'TÊN HÀNG': product['TÊN HÀNG'],
            'SỐ LƯỢNG': 1,
            'ĐƠN GIÁ': product['ĐƠN GIÁ'] || 0,
            'THÀNH TIỀN': product['ĐƠN GIÁ'] || 0,
            'GHI CHÚ': ''
        });
        setSearchQuery(`${product['MÃ HÀNG']} - ${product['TÊN HÀNG']}`);
        setShowProductSearch(false);
    };

    // Handle item quantity and price changes
    const handleItemChange = (field, value) => {
        setCurrentItem(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calculate total price when quantity or unit price changes
            if (field === 'SỐ LƯỢNG' || field === 'ĐƠN GIÁ') {
                const quantity = field === 'SỐ LƯỢNG' ? parseFloat(value) || 0 : parseFloat(prev['SỐ LƯỢNG']) || 0;
                const price = field === 'ĐƠN GIÁ' ? parseFloat(value) || 0 : parseFloat(prev['ĐƠN GIÁ']) || 0;
                updated['THÀNH TIỀN'] = quantity * price;
            }

            return updated;
        });
    };

    // Add item to detail list
    const handleAddItem = () => {
        if (!currentItem['MÃ HÀNG']) {
            toast.warning('Vui lòng chọn hàng hóa');
            return;
        }

        if (!currentItem['SỐ LƯỢNG'] || currentItem['SỐ LƯỢNG'] <= 0) {
            toast.warning('Số lượng phải lớn hơn 0');
            return;
        }

        // Check if item already exists
        const existingItemIndex = chiTietItems.findIndex(item => item['MÃ HÀNG'] === currentItem['MÃ HÀNG']);

        if (existingItemIndex >= 0) {
            // Update existing item
            const updatedItems = [...chiTietItems];
            const existingItem = updatedItems[existingItemIndex];

            const newQuantity = parseFloat(existingItem['SỐ LƯỢNG']) + parseFloat(currentItem['SỐ LƯỢNG']);
            const newTotal = newQuantity * parseFloat(existingItem['ĐƠN GIÁ']);

            updatedItems[existingItemIndex] = {
                ...existingItem,
                'SỐ LƯỢNG': newQuantity,
                'THÀNH TIỀN': newTotal
            };

            setChiTietItems(updatedItems);
        } else {
            // Add as new item
            setChiTietItems(prev => [...prev, { ...currentItem }]);
        }

        // Reset current item and search
        setCurrentItem({
            'MÃ HÀNG': '',
            'TÊN HÀNG': '',
            'SỐ LƯỢNG': 1,
            'ĐƠN GIÁ': 0,
            'THÀNH TIỀN': 0,
            'GHI CHÚ': ''
        });
        setSearchQuery('');
    };

    // Add product directly to detail list from grid
    const handleAddProductDirectly = (product) => {
        // Check if item already exists
        const existingItemIndex = chiTietItems.findIndex(item => item['MÃ HÀNG'] === product['MÃ HÀNG']);

        if (existingItemIndex >= 0) {
            // Update existing item
            const updatedItems = [...chiTietItems];
            const existingItem = updatedItems[existingItemIndex];

            const newQuantity = parseFloat(existingItem['SỐ LƯỢNG']) + 1;
            const newTotal = newQuantity * parseFloat(existingItem['ĐƠN GIÁ']);

            updatedItems[existingItemIndex] = {
                ...existingItem,
                'SỐ LƯỢNG': newQuantity,
                'THÀNH TIỀN': newTotal
            };

            setChiTietItems(updatedItems);
        } else {
            // Add as new item
            const newItem = {
                'MÃ HÀNG': product['MÃ HÀNG'],
                'TÊN HÀNG': product['TÊN HÀNG'],
                'SỐ LƯỢNG': 1,
                'ĐƠN GIÁ': product['ĐƠN GIÁ'] || 0,
                'THÀNH TIỀN': product['ĐƠN GIÁ'] || 0,
                'GHI CHÚ': ''
            };
            setChiTietItems(prev => [...prev, newItem]);
        }

    };

    // Update item quantity directly in the table
    const handleUpdateItemQuantity = (index, newQuantity) => {
        if (newQuantity <= 0) {
            // Nếu số lượng <= 0, có thể xóa hoặc đặt thành 1
            return;
        }

        const updatedItems = [...chiTietItems];
        const item = updatedItems[index];

        const newTotal = newQuantity * parseFloat(item['ĐƠN GIÁ']);

        updatedItems[index] = {
            ...item,
            'SỐ LƯỢNG': newQuantity,
            'THÀNH TIỀN': newTotal
        };

        setChiTietItems(updatedItems);
    };

    // Remove item from detail list
    const handleRemoveItem = (index) => {
        setChiTietItems(prev => {
            const updated = [...prev];
            updated.splice(index, 1);
            return updated;
        });
    };

    // Update total amount when items change
    useEffect(() => {
        updateTotalAmount();
    }, [chiTietItems]);

    const updateTotalAmount = () => {
        const total = chiTietItems.reduce((sum, item) => sum + parseFloat(item['THÀNH TIỀN'] || 0), 0);

        setPhieuData(prev => ({
            ...prev,
            'TỔNG TIỀN': total
        }));
    };

    // Handle form submission
    const handleSubmit = async (finalStatus = 'CONFIRMED') => {
        if (isSubmitting) return;

        if (chiTietItems.length === 0) {
            toast.error('Phiếu phải có ít nhất một mặt hàng');
            return;
        }

        try {
            setIsSubmitting(true);

            // Update final status
            const finalPhieuData = {
                ...phieuData,
                'TRẠNG THÁI': finalStatus
            };

            // Add document (hệ thống sẽ tự ghi đè nếu đã tồn tại)
            await authUtils.apiRequest('XUATNHAPKHO', 'Add', {
                "Rows": [finalPhieuData]
            });
            const detailRows1 = chiTietItems.map(item => ({
                'MÃ PHIẾU': phieuData['MÃ PHIẾU'],
                'MÃ HÀNG': item['MÃ HÀNG'],
                'SỐ LƯỢNG': item['SỐ LƯỢNG'],
                'ĐƠN GIÁ': item['ĐƠN GIÁ'],
                'THÀNH TIỀN': item['THÀNH TIỀN'],
                'GHI CHÚ': item['GHI CHÚ'] || ''
            }));

            // Đối với chi tiết phiếu, cũng sử dụng phương pháp tương tự
            // Trước tiên xóa tất cả chi tiết cũ (nếu đang ở chế độ chỉnh sửa)
            if (isEditMode) {
                await authUtils.apiRequest('XUATNHAPKHO_CHITIET', 'Delete', {
                    "Rows": detailRows1
                });
            }

            // Thêm chi tiết mới
            const detailRows = chiTietItems.map(item => ({
                'MÃ PHIẾU': phieuData['MÃ PHIẾU'],
                'MÃ HÀNG': item['MÃ HÀNG'],
                'SỐ LƯỢNG': item['SỐ LƯỢNG'],
                'ĐƠN GIÁ': item['ĐƠN GIÁ'],
                'THÀNH TIỀN': item['THÀNH TIỀN'],
                'GHI CHÚ': item['GHI CHÚ'] || ''
            }));

            await authUtils.apiRequest('XUATNHAPKHO_CHITIET', 'Add', {
                "Rows": detailRows
            });

            toast.success(
                isEditMode
                    ? 'Phiếu đã được cập nhật thành công!'
                    : (finalStatus === 'CONFIRMED'
                        ? 'Phiếu đã được xác nhận và lưu thành công!'
                        : 'Phiếu đã được lưu thành công!')
            );

            // Quay lại trang quản lý sau khi lưu
            navigate('/xuatnhapkho');
        } catch (error) {
            console.error('Error submitting form:', error);
            toast.error('Lỗi khi lưu phiếu: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };
    // Nút quay lại trang quản lý
    const handleReturn = () => {
        navigate('/xuatnhapkho');
    };

    // Reset form to initial state
    const resetForm = () => {
        if (isEditMode) {
            // Nếu đang chỉnh sửa, load lại dữ liệu ban đầu
            fetchPhieuData(maPhieu);
            return;
        }

        setChiTietItems([]);
        setCurrentItem({
            'MÃ HÀNG': '',
            'TÊN HÀNG': '',
            'SỐ LƯỢNG': 1,
            'ĐƠN GIÁ': 0,
            'THÀNH TIỀN': 0,
            'GHI CHÚ': ''
        });
        setSearchQuery('');

        // Reset phieu data but keep the user and generate new ID
        setPhieuData({
            'MÃ PHIẾU': '',
            'LOẠI PHIẾU': phieuData['LOẠI PHIẾU'],
            'MỤC ĐÍCH': phieuData['MỤC ĐÍCH'],
            'NGÀY GD': new Date().toISOString().split('T')[0],
            'ĐỐI TÁC': '',
            'NGƯỜI TẠO': phieuData['NGƯỜI TẠO'],
            'TỔNG TIỀN': 0,
            'GHI CHÚ': '',
            'TRẠNG THÁI': 'DRAFT'
        });

        // Generate new ID
        generateMaPhieu();
    };

    // Purpose options based on form type
    const getPurposeOptions = () => {
        if (phieuData['LOẠI PHIẾU'] === 'NHẬP KHO') {
            return [
                { value: 'NHẬP NVL', label: 'Nhập nguyên vật liệu' },
                { value: 'NHẬP THÀNH PHẨM', label: 'Nhập thành phẩm' }
            ];
        } else {
            return [
                { value: 'XUẤT CHẾ BIẾN', label: 'Xuất cho chế biến' },
                { value: 'XUẤT BÁN', label: 'Xuất bán thành phẩm' }
            ];
        }
    };

    // Get icon for form type
    const getPurposeIcon = () => {
        switch (phieuData['MỤC ĐÍCH']) {
            case 'NHẬP NVL':
                return <ArrowDownCircle className="h-5 w-5 text-blue-500" />;
            case 'XUẤT CHẾ BIẾN':
                return <Package className="h-5 w-5 text-orange-500" />;
            case 'NHẬP THÀNH PHẨM':
                return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
            case 'XUẤT BÁN':
                return <ShoppingCart className="h-5 w-5 text-purple-500" />;
            default:
                return <FileText className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className=" mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            {getPurposeIcon()}
                            <h1 className="text-2xl font-bold text-gray-800">
                                {isEditMode ? 'Chỉnh sửa phiếu' : 'Tạo phiếu'} {phieuData['LOẠI PHIẾU']}
                            </h1>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleReturn}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Quay lại
                            </button>
                            <button
                                onClick={() => handleSubmit('DRAFT')}
                                disabled={isSubmitting}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Save className="h-4 w-4" />
                                Lưu nháp
                            </button>
                            <button
                                onClick={() => handleSubmit('CONFIRMED')}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Check className="h-4 w-4" />
                                Xác nhận
                            </button>
                        </div>
                    </div>

                    {/* Form Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Loại phiếu
                            </label>
                            <div className="flex gap-4">
                                <label className={`flex items-center ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <input
                                        type="radio"
                                        name="formType"
                                        value="NHẬP KHO"
                                        checked={phieuData['LOẠI PHIẾU'] === 'NHẬP KHO'}
                                        onChange={(e) => handleInputChange('LOẠI PHIẾU', e.target.value)}
                                        className="mr-2"
                                        disabled={isEditMode}
                                    />
                                    Nhập kho
                                </label>
                                <label className={`flex items-center ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <input
                                        type="radio"
                                        name="formType"
                                        value="XUẤT KHO"
                                        checked={phieuData['LOẠI PHIẾU'] === 'XUẤT KHO'}
                                        onChange={(e) => handleInputChange('LOẠI PHIẾU', e.target.value)}
                                        className="mr-2"
                                        disabled={isEditMode}
                                    />
                                    Xuất kho
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mục đích
                            </label>
                            <select
                                value={phieuData['MỤC ĐÍCH']}
                                onChange={(e) => handleInputChange('MỤC ĐÍCH', e.target.value)}
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {getPurposeOptions().map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mã phiếu
                            </label>
                            <input
                                type="text"
                                value={phieuData['MÃ PHIẾU']}
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ngày giao dịch
                            </label>
                            <input
                                type="date"
                                value={phieuData['NGÀY GD']}
                                onChange={(e) => handleInputChange('NGÀY GD', e.target.value)}
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Đối tác
                            </label>
                            <input
                                type="text"
                                value={phieuData['ĐỐI TÁC']}
                                onChange={(e) => handleInputChange('ĐỐI TÁC', e.target.value)}
                                placeholder={phieuData['LOẠI PHIẾU'] === 'NHẬP KHO' ? "Nhà cung cấp" : "Khách hàng"}
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Người tạo
                            </label>
                            <input
                                type="text"
                                value={phieuData['NGƯỜI TẠO']}
                                onChange={(e) => handleInputChange('NGƯỜI TẠO', e.target.value)}
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ghi chú
                        </label>
                        <textarea
                            value={phieuData['GHI CHÚ']}
                            onChange={(e) => handleInputChange('GHI CHÚ', e.target.value)}
                            rows={2}
                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Nhập ghi chú nếu cần"
                        ></textarea>
                    </div>

                    {/* Product Selection */}
                    <div className="border-t border-gray-200 pt-6 mb-4">
                        {/* Thêm các nút chuyển đổi chế độ hiển thị */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Danh sách hàng hóa</h2>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setViewMode('search')}
                                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 
                                            ${viewMode === 'search'
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                            : 'bg-white text-gray-600 border border-gray-300'}`}
                                >
                                    <Search className="h-4 w-4" />
                                    Tìm kiếm
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 
                                            ${viewMode === 'grid'
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                            : 'bg-white text-gray-600 border border-gray-300'}`}
                                >
                                    <Grid className="h-4 w-4" />
                                    Danh sách hàng hóa
                                </button>
                            </div>
                        </div>

                        {/* Phần thêm hàng hóa theo dạng tìm kiếm */}
                        {viewMode === 'search' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div className="md:col-span-2 relative" ref={dropdownRef}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Chọn hàng hóa
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            onFocus={() => setShowProductSearch(true)}
                                            placeholder="Tìm theo mã hoặc tên hàng hóa..."
                                            className="p-2.5 pl-10 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    {showProductSearch && filteredProducts.length > 0 && (
                                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                            {filteredProducts.map((product) => (
                                                <div
                                                    key={product['MÃ HÀNG']}
                                                    className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                                    onClick={() => handleSelectProduct(product)}
                                                >
                                                    <div className="w-8 h-8 mr-2 flex-shrink-0">
                                                        {product['HÌNH ẢNH'] ? (
                                                            <img src={product['HÌNH ẢNH']} alt={product['TÊN HÀNG']} className="w-full h-full object-cover rounded" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                                                <Package className="h-4 w-4 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{product['MÃ HÀNG']}</div>
                                                        <div className="text-sm text-gray-600">{product['TÊN HÀNG']}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {showProductSearch && searchQuery && filteredProducts.length === 0 && (
                                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-2">
                                            <div className="text-center text-gray-500">Không tìm thấy hàng hóa phù hợp</div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Số lượng
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={currentItem['SỐ LƯỢNG']}
                                        onChange={(e) => handleItemChange('SỐ LƯỢNG', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đơn giá
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={currentItem['ĐƠN GIÁ']}
                                        onChange={(e) => handleItemChange('ĐƠN GIÁ', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ghi chú mặt hàng
                                    </label>
                                    <input
                                        type="text"
                                        value={currentItem['GHI CHÚ']}
                                        onChange={(e) => handleItemChange('GHI CHÚ', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Ghi chú cho mặt hàng này"
                                    />
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={handleAddItem}
                                        className="w-full p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Thêm vào phiếu
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Thêm phần hiển thị dạng grid */}
                        {viewMode === 'grid' && (
                            <div className="mb-4">
                                <div className="mb-3">
                                    <input
                                        type="text"
                                        placeholder="Lọc theo tên hoặc mã hàng hóa..."
                                        className="p-2 w-full border border-gray-300 rounded-lg"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                                    {filteredByType
                                        .filter(item =>
                                            !searchQuery ||
                                            item['MÃ HÀNG']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            item['TÊN HÀNG']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            item['QUY CÁCH']?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map(product => (
                                            <div
                                                key={product['MÃ HÀNG']}
                                                className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all"
                                                onClick={() => handleAddProductDirectly(product)}
                                            >
                                                <div className="aspect-square mb-2 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
                                                    {product['HÌNH ẢNH'] ? (
                                                        <img
                                                            src={product['HÌNH ẢNH']}
                                                            alt={product['TÊN HÀNG']}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <Package className="h-10 w-10 text-gray-300" />
                                                    )}
                                                </div>
                                                <div className="text-sm font-medium truncate">{product['MÃ HÀNG']}</div>
                                                <div className="text-xs text-gray-600 truncate">{product['TÊN HÀNG']}  </div>
                                                <div className="text-xs font-semibold text-indigo-600 mt-1">
                                                    {product['ĐƠN GIÁ'] ? parseFloat(product['ĐƠN GIÁ']).toLocaleString('vi-VN') : 0} đ
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>

                                {filteredByType.filter(item =>
                                    !searchQuery ||
                                    item['MÃ HÀNG']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    item['TÊN HÀNG']?.toLowerCase().includes(searchQuery.toLowerCase())
                                ).length === 0 && (
                                        <div className="text-center py-10 text-gray-500">
                                            Không tìm thấy sản phẩm nào phù hợp
                                        </div>
                                    )}
                            </div>
                        )}

                        {/* Items Table */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            STT
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mã hàng
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tên hàng
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Số lượng
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Đơn giá
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thành tiền
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {chiTietItems.length > 0 ? (
                                        chiTietItems.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item['MÃ HÀNG']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {item['TÊN HÀNG']}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            onClick={() => handleUpdateItemQuantity(index, parseFloat(item['SỐ LƯỢNG']) - 1)}
                                                            disabled={parseFloat(item['SỐ LƯỢNG']) <= 1}
                                                            className={`px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-l ${parseFloat(item['SỐ LƯỢNG']) <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item['SỐ LƯỢNG']}
                                                            onChange={(e) => handleUpdateItemQuantity(index, parseFloat(e.target.value) || 1)}
                                                            className="w-12 py-0.5 text-center border-y border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateItemQuantity(index, parseFloat(item['SỐ LƯỢNG']) + 1)}
                                                            className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-r"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {parseFloat(item['ĐƠN GIÁ']).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {parseFloat(item['THÀNH TIỀN']).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                                        title="Xóa mặt hàng"
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-4 text-center text-gray-500 italic">
                                                Chưa có mặt hàng nào trong phiếu
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan="5" className="px-4 py-3 text-right font-semibold text-gray-700">
                                            Tổng cộng:
                                        </td>
                                        <td className="px-4 py-3 text-left font-bold text-gray-900">
                                            {parseFloat(phieuData['TỔNG TIỀN']).toLocaleString('vi-VN')}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Warning message when no items */}
                        {chiTietItems.length === 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-700">
                                    Vui lòng thêm ít nhất một mặt hàng vào phiếu trước khi lưu.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Submit Buttons */}
                    <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            <X className="h-4 w-4" />
                            {isEditMode ? 'Hủy thay đổi' : 'Làm mới phiếu'}
                        </button>
                        <button
                            onClick={() => handleSubmit('DRAFT')}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-indigo-500 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Save className="h-4 w-4" />
                            Lưu nháp
                        </button>
                        <button
                            onClick={() => handleSubmit('CONFIRMED')}
                            disabled={isSubmitting || chiTietItems.length === 0}
                            className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors ${(isSubmitting || chiTietItems.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    Lưu và xác nhận
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast Container */}
            <ToastContainer
                position="top-right"
                autoClose={1500}
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

export default XuatNhapKhoForm;