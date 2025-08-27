import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash, Search, Filter, Image, X, Upload, Eye, EyeOff } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const DSNVManagement = () => {
    // State Management
    const [employees, setEmployees] = useState([]);
    const [currentEmployee, setCurrentEmployee] = useState({
        'Họ và Tên': '',
        'Chức vụ': '',
        'Phòng': '',
        'username': '',
        'password': '',
        'Phân quyền': 'User', // Default value
        'Email': '',
        'Image': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [filterPosition, setFilterPosition] = useState('TẤT CẢ');
    const [filterDepartment, setFilterDepartment] = useState('TẤT CẢ');
    const [selectedImage, setSelectedImage] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    // Add a ref for the drop zone
    const dropZoneRef = useRef(null);
    // Add drag state to show visual feedback
    const [isDragging, setIsDragging] = useState(false);
    useEffect(() => {
        const checkAdminPermission = () => {
            const userData = authUtils.getUserData();
            const isAdminUser = userData && userData['Phân quyền'] === 'Admin';
            setIsAdmin(isAdminUser);
        };

        checkAdminPermission();
        fetchEmployees();
    }, []);
    // Fetch data
    const fetchEmployees = async () => {
        try {
            const response = await authUtils.apiRequest('DSNV', 'Find', {});
            setEmployees(response);
        } catch (error) {
            console.error('Error fetching employee list:', error);
            toast.error('Lỗi khi tải danh sách nhân viên');
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Image upload handler
    const handleImageUpload = async (file) => {
        if (!file) return;

        try {
            // Show preview for better UX
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);

            // Show loading toast
            const toastId = toast.loading("Đang tải ảnh lên...");

            // Call API to upload image
            const result = await authUtils.uploadImage(file);

            if (result && result.success && result.url) {
                // Update image URL from upload result
                handleInputChange('Image', result.url);
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
            // If upload fails, remove preview
            setSelectedImage(null);
        }
    };

    // Drag and drop handlers
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
            setCurrentEmployee(prev => ({
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
    const handleOpenModal = (employee = null) => {
        // Nếu không phải admin thì không cho phép mở modal
        if (!isAdmin) {
            toast.error('Bạn không có quyền thực hiện chức năng này!');
            return;
        }

        if (employee) {
            setIsEditMode(true);
            setCurrentEmployee({
                'Họ và Tên': employee['Họ và Tên'] || '',
                'Chức vụ': employee['Chức vụ'] || '',
                'Phòng': employee['Phòng'] || '',
                'username': employee['username'] || '',
                'password': employee['password'] || '',
                'Phân quyền': employee['Phân quyền'] || 'User',
                'Email': employee['Email'] || '',
                'Image': employee['Image'] || ''
            });
            setSelectedImage(employee['Image'] || null);
        } else {
            setIsEditMode(false);
            setCurrentEmployee({
                'Họ và Tên': '',
                'Chức vụ': '',
                'Phòng': '',
                'username': '',
                'password': '',
                'Phân quyền': 'User',
                'Email': '',
                'Image': ''
            });
            setSelectedImage(null);
        }
        setShowPassword(false);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setSelectedImage(null);
        setCurrentEmployee({
            'Họ và Tên': '',
            'Chức vụ': '',
            'Phòng': '',
            'username': '',
            'password': '',
            'Phân quyền': 'User',
            'Email': '',
            'Image': ''
        });
    };

    // Form handlers
    const handleInputChange = (field, value) => {
        setCurrentEmployee(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleImageChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            // Validate file before saving to state
            const validation = authUtils.validateImage(file);

            if (!validation.isValid) {
                toast.error(validation.errors.join('\n'));
                return;
            }

            // Save file to state
            setCurrentEmployee(prev => ({
                ...prev,
                'FILE_IMAGE': file
            }));

            // Show preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateEmployee = (employee) => {
        const errors = [];
        if (!employee['Họ và Tên']) errors.push('Họ và tên không được để trống');
        if (!employee['username']) errors.push('Tên đăng nhập không được để trống');
        if (!isEditMode && !employee['password']) errors.push('Mật khẩu không được để trống');
        if (!employee['Email']) errors.push('Email không được để trống');

        // Basic email validation
        if (employee['Email'] && !/\S+@\S+\.\S+/.test(employee['Email'])) {
            errors.push('Email không hợp lệ');
        }

        return errors;
    };

    // Save employee
    const handleSaveEmployee = async () => {
        if (isSubmitting || !isAdmin) {
            if (!isAdmin) {
                toast.error('Bạn không có quyền thực hiện chức năng này!');
            }
            return;
        }

        try {
            setIsSubmitting(true);
            const errors = validateEmployee(currentEmployee);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                setIsSubmitting(false);
                return;
            }

            // Create a copy of employee to process
            let employeeToSave = { ...currentEmployee };

            // If there's a new image file, upload to server
            if (employeeToSave['FILE_IMAGE']) {
                try {
                    const uploadResult = await authUtils.uploadImage(employeeToSave['FILE_IMAGE']);
                    if (uploadResult && uploadResult.success && uploadResult.url) {
                        // Update image URL from upload result
                        employeeToSave['Image'] = uploadResult.url;
                    } else {
                        throw new Error("Không thể lấy URL ảnh");
                    }
                } catch (error) {
                    toast.error('Lỗi khi tải ảnh: ' + error.message);
                    setIsSubmitting(false);
                    return;
                }
            }

            // Remove FILE_IMAGE field before sending to API
            delete employeeToSave['FILE_IMAGE'];

            if (isEditMode) {
                // Edit existing employee
                await authUtils.apiRequest('DSNV', 'Edit', {
                    "Rows": [employeeToSave]
                });
                toast.success('Cập nhật thông tin nhân viên thành công!');
            } else {
                // Create new employee
                const existingEmployees = await authUtils.apiRequest('DSNV', 'Find', {});

                // Check if username already exists
                const exists = existingEmployees.some(emp =>
                    emp['username'].toLowerCase() === employeeToSave['username'].toLowerCase()
                );

                if (exists) {
                    toast.error('Tên đăng nhập này đã tồn tại!');
                    setIsSubmitting(false);
                    return;
                }

                await authUtils.apiRequest('DSNV', 'Add', {
                    "Rows": [employeeToSave]
                });
                toast.success('Thêm nhân viên mới thành công!');
            }

            await fetchEmployees();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving employee:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu thông tin nhân viên'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handlers
    const handleOpenDeleteConfirmation = (employee) => {
        if (!isAdmin) {
            toast.error('Bạn không có quyền xóa nhân viên!');
            return;
        }
        setEmployeeToDelete(employee);
        setShowDeleteConfirmation(true);
    };

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
        setEmployeeToDelete(null);
    };

    const handleDeleteEmployee = async () => {
        if (!employeeToDelete) return;

        try {
            await authUtils.apiRequest('DSNV', 'Delete', {
                "Rows": [{ "username": employeeToDelete['username'] }]
            });
            toast.success('Xóa nhân viên thành công!');
            await fetchEmployees();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting employee:', error);
            toast.error('Có lỗi xảy ra khi xóa nhân viên');
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
        const sortableItems = [...employees];
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
    }, [employees, sortConfig]);

    // Get unique departments and positions for filtering
    const departments = ['TẤT CẢ', ...new Set(employees.map(emp => emp['Phòng']).filter(Boolean))];
    const positions = ['TẤT CẢ', ...new Set(employees.map(emp => emp['Chức vụ']).filter(Boolean))];

    // Filtering
    const filteredItems = getSortedItems().filter(employee => {
        const matchesSearch =
            (employee['Họ và Tên']?.toLowerCase().includes(search.toLowerCase()) ||
                employee['username']?.toLowerCase().includes(search.toLowerCase()) ||
                employee['Email']?.toLowerCase().includes(search.toLowerCase()));

        const matchesDepartment = filterDepartment === 'TẤT CẢ' || employee['Phòng'] === filterDepartment;
        const matchesPosition = filterPosition === 'TẤT CẢ' || employee['Chức vụ'] === filterPosition;

        return matchesSearch && matchesDepartment && matchesPosition;
    });

    // Get sort direction icon
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    {/* Header Section */}
                 
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-bold text-gray-800">Quản Lý Nhân Viên</h1>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Thêm nhân viên
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên, username hoặc email..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {showFilters && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Department filter */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700 mb-3">Lọc theo phòng ban:</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {departments.map((dept, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setFilterDepartment(dept)}
                                                    className={`px-3 py-1.5 rounded-full text-sm ${filterDepartment === dept
                                                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {dept}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Position filter */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700 mb-3">Lọc theo chức vụ:</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {positions.map((pos, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setFilterPosition(pos)}
                                                    className={`px-3 py-1.5 rounded-full text-sm ${filterPosition === pos
                                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {pos}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <h3 className="text-sm text-blue-700 mb-1">Tổng số nhân viên</h3>
                            <p className="text-2xl font-bold text-blue-800">{employees.length}</p>
                        </div>

                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                            <h3 className="text-sm text-green-700 mb-1">Số lượng quản trị viên</h3>
                            <p className="text-2xl font-bold text-green-800">
                                {employees.filter(emp => emp['Phân quyền'] === 'Admin').length}
                            </p>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                            <h3 className="text-sm text-purple-700 mb-1">Số lượng người dùng</h3>
                            <p className="text-2xl font-bold text-purple-800">
                                {employees.filter(emp => emp['Phân quyền'] === 'User').length}
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
                                        onClick={() => requestSort('Họ và Tên')}>
                                        Họ và Tên {getSortIcon('Họ và Tên')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('Chức vụ')}>
                                        Chức Vụ {getSortIcon('Chức vụ')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('Phòng')}>
                                        Phòng {getSortIcon('Phòng')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('username')}>
                                        Username {getSortIcon('username')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('Phân quyền')}>
                                        Phân Quyền {getSortIcon('Phân quyền')}
                                    </th>
                                    <th scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('Email')}>
                                        Email {getSortIcon('Email')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hình ảnh
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredItems.length > 0 ? (
                                    filteredItems.map((employee, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {employee['Họ và Tên']}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {employee['Chức vụ'] || '—'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {employee['Phòng'] || '—'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {employee['username']}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${employee['Phân quyền'] === 'Admin'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {employee['Phân quyền']}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <div className="max-w-xs truncate">{employee['Email'] || '—'}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {employee['Image'] ? (
                                                    <div className="w-10 h-10 relative">
                                                        <img
                                                            src={employee['Image']}
                                                            alt={employee['Họ và Tên']}
                                                            className="w-full h-full object-cover rounded-full border border-gray-200"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full border border-gray-200">
                                                        <Image className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    {isAdmin && (
                                                        <>
                                                            <button
                                                                onClick={() => handleOpenModal(employee)}
                                                                className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                                                title="Sửa thông tin nhân viên"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenDeleteConfirmation(employee)}
                                                                className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                                                title="Xóa nhân viên"
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-4 py-6 text-center text-sm text-gray-500">
                                            Không tìm thấy nhân viên nào phù hợp với tiêu chí tìm kiếm
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Employee Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditMode ? 'Cập nhật thông tin nhân viên' : 'Thêm nhân viên mới'}
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
                                        Họ và tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={currentEmployee['Họ và Tên']}
                                        onChange={(e) => handleInputChange('Họ và Tên', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập họ và tên"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Chức vụ
                                    </label>
                                    <input
                                        type="text"
                                        value={currentEmployee['Chức vụ']}
                                        onChange={(e) => handleInputChange('Chức vụ', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập chức vụ"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phòng
                                    </label>
                                    <input
                                        type="text"
                                        value={currentEmployee['Phòng']}
                                        onChange={(e) => handleInputChange('Phòng', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập phòng ban"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={currentEmployee['Email']}
                                        onChange={(e) => handleInputChange('Email', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập địa chỉ email"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phân quyền <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex space-x-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="Admin"
                                                checked={currentEmployee['Phân quyền'] === 'Admin'}
                                                onChange={(e) => handleInputChange('Phân quyền', e.target.value)}
                                                className="mr-2 h-4 w-4 text-indigo-600"
                                            />
                                            <span className="text-gray-800">Admin</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="User"
                                                checked={currentEmployee['Phân quyền'] === 'User'}
                                                onChange={(e) => handleInputChange('Phân quyền', e.target.value)}
                                                className="mr-2 h-4 w-4 text-indigo-600"
                                            />
                                            <span className="text-gray-800">User</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tên đăng nhập <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={currentEmployee['username']}
                                        onChange={(e) => handleInputChange('username', e.target.value)}
                                        className={`p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 ${isEditMode ? 'bg-gray-100' : ''}`}
                                        placeholder="Nhập tên đăng nhập"
                                        readOnly={isEditMode}
                                        required
                                    />
                                    {isEditMode && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Tên đăng nhập không thể thay đổi sau khi đã tạo.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mật khẩu {!isEditMode && <span className="text-red-500">*</span>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword && isAdmin ? "text" : "password"}
                                            value={currentEmployee['password']}
                                            onChange={(e) => handleInputChange('password', e.target.value)}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                                            placeholder={isEditMode ? "Nhập để thay đổi mật khẩu" : "Nhập mật khẩu"}
                                            required={!isEditMode}
                                            readOnly={!isAdmin}
                                        />
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={togglePasswordVisibility}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-400" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-400" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {isEditMode && isAdmin && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Để trống nếu không muốn thay đổi mật khẩu.
                                        </p>
                                    )}
                                    {!isAdmin && (
                                        <p className="text-xs text-red-500 mt-1">
                                            Chỉ Admin mới có quyền xem và sửa mật khẩu.
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hình ảnh
                                    </label>
                                    <div
                                        ref={dropZoneRef}
                                        onDragEnter={handleDragEnter}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-gray-50 transition-all cursor-pointer hover:bg-gray-100 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}
                                    >
                                        <div className="w-full flex items-center justify-center mb-3">
                                            <div className="w-24 h-24 border rounded-full flex items-center justify-center bg-white overflow-hidden">
                                                {selectedImage ? (
                                                    <img
                                                        src={selectedImage}
                                                        alt="Employee preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Image className="h-10 w-10 text-gray-300" />
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
                                                    handleInputChange('Image', '');
                                                }}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors shadow-sm flex items-center"
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Xóa ảnh
                                            </button>
                                        </div>
                                    )}
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
                                onClick={handleSaveEmployee}
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
                                        Lưu nhân viên
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && employeeToDelete && (
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
                                    Bạn có chắc chắn muốn xóa nhân viên <span className="font-bold">{employeeToDelete['Họ và Tên']}</span>?
                                </p>
                                <p className="text-sm text-red-600 mt-2">
                                    Hành động này không thể hoàn tác và sẽ xóa tất cả thông tin của nhân viên này.
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
                                    onClick={handleDeleteEmployee}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Trash className="h-4 w-4" />
                                    Xóa nhân viên
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

export default DSNVManagement;