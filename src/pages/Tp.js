import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Search, Image as ImageIcon, ChevronLeft, ChevronRight, Filter, Printer, Download, Check, Upload } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import * as XLSX from 'xlsx';

const TPManagement = () => {
    // State Management
    const [products, setProducts] = useState([]);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        quyCache: ''
    });
    const [imagePreview, setImagePreview] = useState('');
    const [currentProduct, setCurrentProduct] = useState({
        IDTP: '',
        'TÊN THÀNH PHẨM': '',
        'HÌNH ẢNH': '',
        'M3': '',
        'QUY CÁCH': ''
    });
    // Add import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    const getImageUrl = (imagePath) => {
        if (!imagePath) return '';

        // Trường hợp 1: Nếu là URL đầy đủ hoặc base64
        if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
            return imagePath;
        }

        // Trường hợp 2: Nếu là đường dẫn dạng TP_Images/...
        if (imagePath.startsWith('TP_Images/')) {
            const appName = encodeURIComponent('DUNGHÒAPHÁT-852393027');
            const tableName = encodeURIComponent('TP');
            const fileName = encodeURIComponent(imagePath);

            return `https://www.appsheet.com/template/gettablefileurl?appName=${appName}&tableName=${tableName}&fileName=${fileName}`;
        }

        // Nếu là dạng khác, trả về đường dẫn gốc
        return imagePath;
    };

    // Component để hiển thị ảnh với fallback
    const ProductImage = ({ src, alt, className }) => {
        const [error, setError] = useState(false);

        if (!src || error) {
            return (
                <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
            );
        }

        // Nếu src là File object, hiển thị preview
        if (src instanceof File) {
            return (
                <img
                    src={imagePreview}
                    alt={alt}
                    className={className}
                    onError={() => setError(true)}
                />
            );
        }

        // Nếu là URL
        return (
            <img
                src={getImageUrl(src)}
                alt={alt}
                className={className}
                onError={() => setError(true)}
            />
        );
    };

    // Validation Function
    const validateProduct = (product) => {
        const errors = [];
        if (!product['TÊN THÀNH PHẨM']) errors.push('TÊN THÀNH PHẨM không được để trống');
        if (!product['QUY CÁCH']) errors.push('QUY CÁCH không được để trống');
        if (!product['M3']) errors.push('M3 không được để trống');
        return errors;
    };

    // Fetch Products
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await authUtils.apiRequest('TP', 'Find', {});
            setProducts(response);
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Lỗi khi tải danh sách thành phẩm');
        }
    };

    // Handle Product Modal
    const handleOpen = (product = null) => {
        if (product) {
            setCurrentProduct({
                IDTP: product.IDTP || '',
                'TÊN THÀNH PHẨM': product['TÊN THÀNH PHẨM'] || '',
                'HÌNH ẢNH': product['HÌNH ẢNH'] || '',
                'M3': product['M3'] || '',
                'QUY CÁCH': product['QUY CÁCH'] || ''
            });
            setImagePreview(product['HÌNH ẢNH'] || '');
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentProduct({
            IDTP: '',
            'TÊN THÀNH PHẨM': '',
            'HÌNH ẢNH': '',
            'M3': '',
            'QUY CÁCH': ''
        });
        setImagePreview('');
    };

    // Handle Image Upload
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Validate file
            const validation = authUtils.validateImage(file);
            if (!validation.isValid) {
                toast.error(validation.errors[0]);
                return;
            }

            // Chỉ tạo preview và lưu file để đợi upload
            const base64Preview = await authUtils.getImageAsBase64(file);
            setImagePreview(base64Preview);
            setCurrentProduct(prev => ({
                ...prev,
                'HÌNH ẢNH': file // Lưu trực tiếp file thay vì tên file
            }));
        } catch (error) {
            console.error('Error handling image:', error);
            toast.error('Không thể đọc file ảnh');
            setImagePreview('');
            setCurrentProduct(prev => ({
                ...prev,
                'HÌNH ẢNH': ''
            }));
        }
    };

    // Handle Form Input
    const handleInputChange = (field, value) => {
        setCurrentProduct(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Save Product
    const handleSave = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateProduct(currentProduct);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                return;
            }

            let imageUrl = currentProduct['HÌNH ẢNH'];

            // Kiểm tra nếu HÌNH ẢNH là File object (ảnh mới được chọn)
            if (currentProduct['HÌNH ẢNH'] instanceof File) {
                toast.info('Đang tải ảnh lên...', { autoClose: false, toastId: 'uploadingImage' });

                try {
                    const uploadResult = await authUtils.uploadImage(currentProduct['HÌNH ẢNH']);
                    if (!uploadResult.success) {
                        throw new Error('Upload failed');
                    }
                    imageUrl = uploadResult.url;
                    toast.dismiss('uploadingImage');
                } catch (error) {
                    toast.dismiss('uploadingImage');
                    toast.error('Không thể tải ảnh lên. Vui lòng thử lại.');
                    setIsSubmitting(false);
                    return;
                }
            }

            const productData = {
                ...currentProduct,
                'HÌNH ẢNH': imageUrl
            };

            if (productData.IDTP) {
                await authUtils.apiRequest('TP', 'Edit', {
                    "Rows": [productData]
                });
                toast.success('Cập nhật thành phẩm thành công!');
            } else {
                const existingProducts = await authUtils.apiRequest('TP', 'Find', {});
                const maxID = existingProducts.reduce((max, product) => {
                    const id = parseInt(product.IDTP.replace('TP', '')) || 0;
                    return id > max ? id : max;
                }, 0);

                const newID = maxID + 1;
                const newIDTP = `TP${newID.toString().padStart(3, '0')}`;
                productData.IDTP = newIDTP;

                await authUtils.apiRequest('TP', 'Add', {
                    "Rows": [productData]
                });
                toast.success('Thêm thành phẩm thành công!');
            }

            await fetchProducts();
            handleClose();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu thành phẩm'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Product
    const handleDelete = async (IDTP) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa thành phẩm này?')) {
            try {
                await authUtils.apiRequest('TP', 'Delete', {
                    "Rows": [{ "IDTP": IDTP }]
                });
                toast.success('Xóa thành phẩm thành công!');
                await fetchProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
                toast.error('Có lỗi xảy ra khi xóa thành phẩm');
            }
        }
    };

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (selectedProducts.length === 0) {
            toast.warning('Vui lòng chọn thành phẩm để xóa');
            return;
        }

        if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedProducts.length} thành phẩm đã chọn?`)) {
            try {
                const deletePromises = selectedProducts.map(id =>
                    authUtils.apiRequest('TP', 'Delete', {
                        "Rows": [{ "IDTP": id }]
                    })
                );

                await Promise.all(deletePromises);
                toast.success('Xóa thành phẩm thành công!');
                setSelectedProducts([]);
                await fetchProducts();
            } catch (error) {
                toast.error('Có lỗi xảy ra khi xóa thành phẩm');
            }
        }
    };

    const handleExportSelected = () => {
        if (selectedProducts.length === 0) {
            toast.warning('Vui lòng chọn thành phẩm để xuất file');
            return;
        }

        const selectedItems = products.filter(p => selectedProducts.includes(p.IDTP));
        const csv = [
            ['IDTP', 'TÊN THÀNH PHẨM', 'M3', 'QUY CÁCH'],
            ...selectedItems.map(item => [
                item.IDTP,
                item['TÊN THÀNH PHẨM'],
                item['M3'],
                item['QUY CÁCH']
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thanh-pham-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Import Excel functionality
    const handleImportFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check if file is Excel
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
            toast.error('Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV');
            return;
        }

        setImportFile(file);

        // Parse Excel file for preview
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const binaryData = evt.target.result;
                const workbook = XLSX.read(binaryData, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON with headers
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    toast.error('File không có dữ liệu hoặc không đúng định dạng');
                    setImportFile(null);
                    return;
                }

                // Extract headers and data
                const headers = jsonData[0];
                const requiredColumns = ['TÊN THÀNH PHẨM', 'M3', 'QUY CÁCH'];

                // Check if all required columns exist
                const missingColumns = requiredColumns.filter(col => !headers.includes(col));
                if (missingColumns.length > 0) {
                    toast.error(`File thiếu các cột bắt buộc: ${missingColumns.join(', ')}`);
                    setImportFile(null);
                    return;
                }

                // Create preview data (first 5 rows)
                const previewData = jsonData.slice(1, 6).map(row => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index] || '';
                    });
                    return rowData;
                });

                setImportPreview(previewData);
            } catch (error) {
                console.error('Error parsing Excel file:', error);
                toast.error('Không thể đọc file. Vui lòng kiểm tra định dạng file.');
                setImportFile(null);
            }
        };

        reader.onerror = () => {
            toast.error('Không thể đọc file');
            setImportFile(null);
        };

        reader.readAsBinaryString(file);
    };

    const handleImportData = async () => {
        if (!importFile) return;

        setIsImporting(true);
        toast.info('Đang xử lý dữ liệu...', { autoClose: false, toastId: 'importing' });

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const binaryData = evt.target.result;
                    const workbook = XLSX.read(binaryData, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to JSON with headers
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    // Validate data
                    const invalidRows = [];
                    const validatedData = [];

                    // Get existing products for ID generation
                    const existingProducts = await authUtils.apiRequest('TP', 'Find', {});
                    const maxID = existingProducts.reduce((max, product) => {
                        const id = parseInt(product.IDTP.replace('TP', '')) || 0;
                        return id > max ? id : max;
                    }, 0);

                    let newIdCounter = maxID + 1;

                    // Process each row
                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];

                        // Basic validation
                        if (!row['TÊN THÀNH PHẨM'] || !row['M3'] || !row['QUY CÁCH']) {
                            invalidRows.push(i + 2); // +2 because of 0-indexing and header row
                            continue;
                        }

                        // Create product object
                        const product = {
                            IDTP: row.IDTP || `TP${newIdCounter.toString().padStart(3, '0')}`,
                            'TÊN THÀNH PHẨM': row['TÊN THÀNH PHẨM'],
                            'M3': row['M3'],
                            'QUY CÁCH': row['QUY CÁCH'],
                            'HÌNH ẢNH': row['HÌNH ẢNH'] || ''
                        };

                        validatedData.push(product);
                        newIdCounter++;
                    }

                    if (invalidRows.length > 0) {
                        toast.warning(`Có ${invalidRows.length} dòng dữ liệu không hợp lệ: ${invalidRows.join(', ')}`);
                    }

                    if (validatedData.length === 0) {
                        toast.error('Không có dữ liệu hợp lệ để nhập');
                        setIsImporting(false);
                        toast.dismiss('importing');
                        return;
                    }

                    // Import products in batches to avoid timeout
                    const batchSize = 25;
                    let successCount = 0;

                    for (let i = 0; i < validatedData.length; i += batchSize) {
                        const batch = validatedData.slice(i, i + batchSize);
                        try {
                            await authUtils.apiRequest('TP', 'Add', {
                                "Rows": batch
                            });
                            successCount += batch.length;
                        } catch (error) {
                            console.error('Error importing batch:', error);
                        }
                    }

                    toast.dismiss('importing');
                    toast.success(`Đã nhập thành công ${successCount} thành phẩm`);
                    await fetchProducts();
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                } catch (error) {
                    console.error('Error processing import:', error);
                    toast.dismiss('importing');
                    toast.error('Có lỗi xảy ra khi xử lý dữ liệu');
                } finally {
                    setIsImporting(false);
                }
            };

            reader.onerror = () => {
                toast.dismiss('importing');
                toast.error('Không thể đọc file');
                setIsImporting(false);
            };

            reader.readAsBinaryString(importFile);
        } catch (error) {
            toast.dismiss('importing');
            toast.error('Có lỗi xảy ra');
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            ['TÊN THÀNH PHẨM', 'M3', 'QUY CÁCH', 'HÌNH ẢNH'],
            ['Bàn gỗ sồi', '0.24', '120x60x40cm', ''],
            ['Ghế gỗ tràm', '0.18', '45x45x90cm', '']
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');

        // Generate file
        XLSX.writeFile(wb, 'mau_nhap_tp.xlsx');
    };

    // Filtering and Pagination
    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product['TÊN THÀNH PHẨM']?.toLowerCase().includes(search.toLowerCase()) ||
            product.IDTP?.toLowerCase().includes(search.toLowerCase());

        const matchesQuyCache = !filters.quyCache || product['QUY CÁCH'] === filters.quyCache;

        return matchesSearch && matchesQuyCache;
    });

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Pagination Component
    const Pagination = () => {
        return (
            <div className="flex flex-wrap justify-center items-center space-x-1 md:space-x-2 mt-4">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50'}`}
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                        <button
                            key={number}
                            onClick={() => handlePageChange(number)}
                            className={`px-3 py-1 rounded-lg ${currentPage === number ? 'bg-blue-500 text-white'
                                : 'text-gray-600 hover:bg-blue-50'
                                }`}
                        >
                            {number}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50'}`}
                >
                    <ChevronRight className="h-5 w-5" />
                </button>

                <span className="text-gray-600 ml-4">
                    Trang {currentPage} / {totalPages || 1}
                </span>
            </div>
        );
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-sm p-3 md:p-6 mb-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-3 md:space-y-0">
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Quản lý Thành Phẩm</h1>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            Bộ lọc
                        </button>

                        {/* Import button */}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Nhập Excel
                        </button>

                        {selectedProducts.length > 0 && (
                            <>
                                <button
                                    onClick={handleExportSelected}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Xuất file
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                                >
                                    <Trash className="w-4 h-4" />
                                    Xóa ({selectedProducts.length})
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleOpen()}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm TP
                        </button>
                    </div>
                </div>

                {/* Filter Section */}
                {showFilters && (
                    <div className="mb-4 p-3 md:p-4 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <select
                                value={filters.quyCache}
                                onChange={(e) => setFilters({ ...filters, quyCache: e.target.value })}
                                className="p-2 border rounded-lg"
                            >
                                <option value="">Tất cả QUY CÁCH</option>
                                {Array.from(new Set(products.map(p => p['QUY CÁCH']))).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setFilters({ quyCache: '' })}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                )}

                {/* Search Section */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã hoặc TÊN THÀNH PHẨM..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto -mx-3 md:mx-0">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 border-b">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedProducts(filteredProducts.map(p => p.IDTP));
                                            } else {
                                                setSelectedProducts([]);
                                            }
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">ID</th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">TÊN THÀNH PHẨM</th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">HÌNH ẢNH</th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">M3</th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">QUY CÁCH</th>
                                <th className="px-4 py-3 border-b text-right text-sm font-medium text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((product) => (
                                <tr key={product.IDTP} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 border-b">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.includes(product.IDTP)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProducts([...selectedProducts, product.IDTP]);
                                                } else {
                                                    setSelectedProducts(selectedProducts.filter(id => id !== product.IDTP));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3 border-b">{product.IDTP}</td>
                                    <td className="px-4 py-3 border-b">{product['TÊN THÀNH PHẨM']}</td>
                                    <td className="px-4 py-3 border-b">
                                    <ProductImage
                                            src={product['HÌNH ẢNH']}
                                            alt={product['TÊN THÀNH PHẨM']}
                                            className="w-12 h-12 object-cover rounded-lg"
                                        />
                                    </td>
                                    <td className="px-4 py-3 border-b">{product['M3']}</td>
                                    <td className="px-4 py-3 border-b">{product['QUY CÁCH']}</td>
                                    <td className="px-4 py-3 border-b text-right">
                                        <button
                                            onClick={() => handleOpen(product)}
                                            className="text-blue-500 hover:text-blue-700 p-1"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.IDTP)}
                                            className="text-red-500 hover:text-red-700 p-1 ml-1"
                                        >
                                            <Trash className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination />
            </div>

            {/* Modal Add/Edit Product */}
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4 md:p-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">
                                {currentProduct.IDTP ? 'Cập nhật thành phẩm' : 'Thêm thành phẩm mới'}
                            </h2>
                            <button
                                onClick={handleClose}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="TÊN THÀNH PHẨM"
                                    className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={currentProduct['TÊN THÀNH PHẨM']}
                                    onChange={(e) => handleInputChange('TÊN THÀNH PHẨM', e.target.value)}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="QUY CÁCH"
                                    className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={currentProduct['QUY CÁCH']}
                                    onChange={(e) => handleInputChange('QUY CÁCH', e.target.value)}
                                    required
                                />
                            </div>
                            
                            <input
                                type="number"
                                step="0.01"
                                placeholder="M3"
                                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                value={currentProduct['M3']}
                                onChange={(e) => handleInputChange('M3', e.target.value)}
                                required
                            />

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                    <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                        <ImageIcon className="h-4 w-4" />
                                        <span>Chọn HÌNH ẢNH</span>
                                    </div>
                                </label>
                                {(imagePreview || currentProduct['HÌNH ẢNH']) && (
                                    <div className="relative w-32 h-32">
                                        <ProductImage
                                            src={imagePreview || currentProduct['HÌNH ẢNH']}
                                            alt="Preview"
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => {
                                                setImagePreview('');
                                                setCurrentProduct(prev => ({ ...prev, 'HÌNH ẢNH': '' }));
                                            }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className={`px-4 py-2 bg-blue-500 text-white rounded-lg ${isSubmitting
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-blue-600'
                                        } flex items-center gap-2`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Đang lưu...
                                        </>
                                    ) : 'Lưu'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Excel Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-4 md:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Nhập thành phẩm từ Excel</h2>
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportFile(null);
                                    setImportPreview([]);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                Tải lên file Excel (.xlsx, .xls) hoặc CSV có chứa dữ liệu thành phẩm.
                                File cần có các cột: TÊN THÀNH PHẨM, M3, QUY CÁCH.
                            </p>
                            <div className="flex gap-2">
                                <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={handleImportFileChange}
                                    />
                                    <Upload className="h-4 w-4" />
                                    <span>Chọn file</span>
                                </label>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="px-4 py-2 text-blue-500 border border-blue-500 rounded-lg hover:bg-blue-50 flex items-center gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    Tải mẫu nhập
                                </button>
                            </div>
                            {importFile && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Đã chọn: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                                </div>
                            )}
                        </div>

                        {importPreview.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2">Xem trước dữ liệu (5 dòng đầu tiên):</h3>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {Object.keys(importPreview[0]).map((header, index) => (
                                                    <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {importPreview.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {Object.values(row).map((cell, cellIndex) => (
                                                        <td key={cellIndex} className="px-3 py-2 text-sm text-gray-500 truncate">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportFile(null);
                                    setImportPreview([]);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                disabled={isImporting}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleImportData}
                                disabled={!importFile || isImporting}
                                className={`px-4 py-2 bg-blue-500 text-white rounded-lg ${(!importFile || isImporting)
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-blue-600'
                                    } flex items-center gap-2`}
                            >
                                {isImporting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang nhập...
                                    </>
                                ) : 'Nhập dữ liệu'}
                            </button>
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
            />
        </div>
    );
};

export default TPManagement;