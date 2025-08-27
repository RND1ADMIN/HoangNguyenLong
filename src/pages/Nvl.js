import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Search, Image as ImageIcon, ChevronLeft, ChevronRight, Filter, Printer, Download, Check, Upload } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import * as XLSX from 'xlsx';

const NVLManagement = () => {
    // State Management
    const [materials, setMaterials] = useState([]);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        type: ''
    });
    const [imagePreview, setImagePreview] = useState('');
    const [currentMaterial, setCurrentMaterial] = useState({
        IDNVL: '',
        'TÊN GỖ': '',
        'HÌNH ẢNH': '',
        'QUY CÁCH': '',
        'GHI CHÚ': ''
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

        // Trường hợp 2: Nếu là đường dẫn dạng NVL_Images/...
        if (imagePath.startsWith('NVL_Images/')) {
            const appName = encodeURIComponent('DUNGHÒAPHÁT-852393027');
            const tableName = encodeURIComponent('NVL');
            const fileName = encodeURIComponent(imagePath);

            return `https://www.appsheet.com/template/gettablefileurl?appName=${appName}&tableName=${tableName}&fileName=${fileName}`;
        }

        // Nếu là dạng khác, trả về đường dẫn gốc
        return imagePath;
    };

    // Component để hiển thị ảnh với fallback
    const MaterialImage = ({ src, alt, className }) => {
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
    const validateMaterial = (material) => {
        const errors = [];
        if (!material['TÊN GỖ']) errors.push('TÊN GỖ không được để trống');
        if (!material['QUY CÁCH']) errors.push('QUY CÁCH không được để trống');
        return errors;
    };

    // Fetch Materials
    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const response = await authUtils.apiRequest('NVL', 'Find', {});
            setMaterials(response);
        } catch (error) {
            console.error('Error fetching materials:', error);
            toast.error('Lỗi khi tải danh sách nguyên vật liệu');
        }
    };

    // Handle Material Modal
    const handleOpen = (material = null) => {
        if (material) {
            setCurrentMaterial({
                IDNVL: material.IDNVL || '',
                'TÊN GỖ': material['TÊN GỖ'] || '',
                'HÌNH ẢNH': material['HÌNH ẢNH'] || '',
                'QUY CÁCH': material['QUY CÁCH'] || '',
                'GHI CHÚ': material['GHI CHÚ'] || ''
            });
            setImagePreview(material['HÌNH ẢNH'] || '');
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentMaterial({
            IDNVL: '',
            'TÊN GỖ': '',
            'HÌNH ẢNH': '',
            'QUY CÁCH': '',
            'GHI CHÚ': ''
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
            setCurrentMaterial(prev => ({
                ...prev,
                'HÌNH ẢNH': file // Lưu trực tiếp file thay vì tên file
            }));
        } catch (error) {
            console.error('Error handling image:', error);
            toast.error('Không thể đọc file ảnh');
            setImagePreview('');
            setCurrentMaterial(prev => ({
                ...prev,
                'HÌNH ẢNH': ''
            }));
        }
    };

    // Handle Form Input
    const handleInputChange = (field, value) => {
        setCurrentMaterial(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Save Material
    const handleSave = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateMaterial(currentMaterial);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                return;
            }

            let imageUrl = currentMaterial['HÌNH ẢNH'];

            // Kiểm tra nếu HÌNH ẢNH là File object (ảnh mới được chọn)
            if (currentMaterial['HÌNH ẢNH'] instanceof File) {
                toast.info('Đang tải ảnh lên...', { autoClose: false, toastId: 'uploadingImage' });

                try {
                    const uploadResult = await authUtils.uploadImage(currentMaterial['HÌNH ẢNH']);
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

            const materialData = {
                ...currentMaterial,
                'HÌNH ẢNH': imageUrl
            };

            if (materialData.IDNVL) {
                await authUtils.apiRequest('NVL', 'Edit', {
                    "Rows": [materialData]
                });
                toast.success('Cập nhật nguyên vật liệu thành công!');
            } else {
                const existingMaterials = await authUtils.apiRequest('NVL', 'Find', {});
                const maxID = existingMaterials.reduce((max, material) => {
                    const id = parseInt(material.IDNVL.replace('NVL', '')) || 0;
                    return id > max ? id : max;
                }, 0);

                const newID = maxID + 1;
                const newIDNVL = `NVL${newID.toString().padStart(3, '0')}`;
                materialData.IDNVL = newIDNVL;

                await authUtils.apiRequest('NVL', 'Add', {
                    "Rows": [materialData]
                });
                toast.success('Thêm nguyên vật liệu thành công!');
            }

            await fetchMaterials();
            handleClose();
        } catch (error) {
            console.error('Error saving material:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu nguyên vật liệu'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Material
    const handleDelete = async (IDNVL) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa nguyên vật liệu này?')) {
            try {
                await authUtils.apiRequest('NVL', 'Delete', {
                    "Rows": [{ "IDNVL": IDNVL }]
                });
                toast.success('Xóa nguyên vật liệu thành công!');
                await fetchMaterials();
            } catch (error) {
                console.error('Error deleting material:', error);
                toast.error('Có lỗi xảy ra khi xóa nguyên vật liệu');
            }
        }
    };

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (selectedMaterials.length === 0) {
            toast.warning('Vui lòng chọn nguyên vật liệu để xóa');
            return;
        }

        if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedMaterials.length} nguyên vật liệu đã chọn?`)) {
            try {
                const deletePromises = selectedMaterials.map(id =>
                    authUtils.apiRequest('NVL', 'Delete', {
                        "Rows": [{ "IDNVL": id }]
                    })
                );

                await Promise.all(deletePromises);
                toast.success('Xóa nguyên vật liệu thành công!');
                setSelectedMaterials([]);
                await fetchMaterials();
            } catch (error) {
                toast.error('Có lỗi xảy ra khi xóa nguyên vật liệu');
            }
        }
    };

    const handleExportSelected = () => {
        if (selectedMaterials.length === 0) {
            toast.warning('Vui lòng chọn nguyên vật liệu để xuất file');
            return;
        }

        const selectedItems = materials.filter(m => selectedMaterials.includes(m.IDNVL));
        const csv = [
            ['IDNVL', 'TÊN GỖ', 'QUY CÁCH', 'GHI CHÚ'],
            ...selectedItems.map(item => [
                item.IDNVL,
                item['TÊN GỖ'],
                item['QUY CÁCH'],
                item['GHI CHÚ']
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nguyen-vat-lieu-${new Date().toISOString().slice(0, 10)}.csv`;
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
                const requiredColumns = ['TÊN GỖ', 'QUY CÁCH'];

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

                    // Get existing materials for ID generation
                    const existingMaterials = await authUtils.apiRequest('NVL', 'Find', {});
                    const maxID = existingMaterials.reduce((max, material) => {
                        const id = parseInt(material.IDNVL.replace('NVL', '')) || 0;
                        return id > max ? id : max;
                    }, 0);

                    let newIdCounter = maxID + 1;

                    // Process each row
                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];

                        // Basic validation
                        if (!row['TÊN GỖ'] || !row['QUY CÁCH']) {
                            invalidRows.push(i + 2); // +2 because of 0-indexing and header row
                            continue;
                        }

                        // Create material object
                        const material = {
                            IDNVL: row.IDNVL || `NVL${newIdCounter.toString().padStart(3, '0')}`,
                            'TÊN GỖ': row['TÊN GỖ'],
                            'QUY CÁCH': row['QUY CÁCH'],
                            'GHI CHÚ': row['GHI CHÚ'] || '',
                            'HÌNH ẢNH': row['HÌNH ẢNH'] || ''
                        };

                        validatedData.push(material);
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

                    // Import materials in batches to avoid timeout
                    const batchSize = 25;
                    let successCount = 0;

                    for (let i = 0; i < validatedData.length; i += batchSize) {
                        const batch = validatedData.slice(i, i + batchSize);
                        try {
                            await authUtils.apiRequest('NVL', 'Add', {
                                "Rows": batch
                            });
                            successCount += batch.length;
                        } catch (error) {
                            console.error('Error importing batch:', error);
                        }
                    }

                    toast.dismiss('importing');
                    toast.success(`Đã nhập thành công ${successCount} nguyên vật liệu`);
                    await fetchMaterials();
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
            ['TÊN GỖ', 'QUY CÁCH', 'GHI CHÚ', 'HÌNH ẢNH'],
            ['Gỗ Sồi', '20x30x40cm', 'Gỗ sồi nhập khẩu', ''],
            ['Gỗ Tràm', '30x40x50cm', 'Gỗ tràm chất lượng cao', '']
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');

        // Generate file
        XLSX.writeFile(wb, 'mau_nhap_nvl.xlsx');
    };

    // Filtering and Pagination
    const filteredMaterials = materials.filter(material => {
        const matchesSearch =
            material['TÊN GỖ']?.toLowerCase().includes(search.toLowerCase()) ||
            material.IDNVL?.toLowerCase().includes(search.toLowerCase());

        const matchesType = !filters.type || material['QUY CÁCH'] === filters.type;

        return matchesSearch && matchesType;
    });

    const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);

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
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Quản lý Nguyên Vật Liệu</h1>
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

                        {selectedMaterials.length > 0 && (
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
                                    Xóa ({selectedMaterials.length})
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleOpen()}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm NVL
                        </button>
                    </div>
                </div>

                {/* Filter Section */}
                {showFilters && (
                    <div className="mb-4 p-3 md:p-4 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="p-2 border rounded-lg"
                            >
                                <option value="">Tất cả QUY CÁCH</option>
                                {Array.from(new Set(materials.map(m => m['QUY CÁCH']))).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setFilters({ type: '' })}
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
                            placeholder="Tìm kiếm theo mã hoặc TÊN GỖ..."
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
                                        checked={selectedMaterials.length === filteredMaterials.length && filteredMaterials.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedMaterials(filteredMaterials.map(m => m.IDNVL));
                                            } else {
                                                setSelectedMaterials([]);
                                            }
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">ID</th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">TÊN GỖ</th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">HÌNH ẢNH</th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">QUY CÁCH</th>
                                <th className="px-4 py-3 border-b text-left text-sm font-medium text-gray-600">GHI CHÚ</th>
                                <th className="px-4 py-3 border-b text-right text-sm font-medium text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((material) => (
                                <tr key={material.IDNVL} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 border-b">
                                        <input
                                            type="checkbox"
                                            checked={selectedMaterials.includes(material.IDNVL)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedMaterials([...selectedMaterials, material.IDNVL]);
                                                } else {
                                                    setSelectedMaterials(selectedMaterials.filter(id => id !== material.IDNVL));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3 border-b">{material.IDNVL}</td>
                                    <td className="px-4 py-3 border-b">{material['TÊN GỖ']}</td>
                                    <td className="px-4 py-3 border-b">
                                        <MaterialImage
                                            src={material['HÌNH ẢNH']}
                                            alt={material['TÊN GỖ']}
                                            className="w-12 h-12 object-cover rounded-lg"
                                        />
                                    </td>
                                    <td className="px-4 py-3 border-b">{material['QUY CÁCH']}</td>
                                    <td className="px-4 py-3 border-b">{material['GHI CHÚ']}</td>
                                    <td className="px-4 py-3 border-b text-right">
                                        <button
                                            onClick={() => handleOpen(material)}
                                            className="text-blue-500 hover:text-blue-700 p-1"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(material.IDNVL)}
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

            {/* Modal Add/Edit Material */}
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4 md:p-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">
                                {currentMaterial.IDNVL ? 'Cập nhật nguyên vật liệu' : 'Thêm nguyên vật liệu mới'}
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
                                    placeholder="TÊN GỖ"
                                    className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={currentMaterial['TÊN GỖ']}
                                    onChange={(e) => handleInputChange('TÊN GỖ', e.target.value)}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="QUY CÁCH"
                                    className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={currentMaterial['QUY CÁCH']}
                                    onChange={(e) => handleInputChange('QUY CÁCH', e.target.value)}
                                    required
                                />
                            </div>

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
                                {(imagePreview || currentMaterial['HÌNH ẢNH']) && (
                                    <div className="relative w-32 h-32">
                                        <MaterialImage
                                            src={imagePreview || currentMaterial['HÌNH ẢNH']}
                                            alt="Preview"
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => {
                                                setImagePreview('');
                                                setCurrentMaterial(prev => ({ ...prev, 'HÌNH ẢNH': '' }));
                                            }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>

                            <textarea
                                placeholder="GHI CHÚ"
                                rows={4}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={currentMaterial['GHI CHÚ']}
                                onChange={(e) => handleInputChange('GHI CHÚ', e.target.value)}
                            />

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
                            <h2 className="text-xl font-semibold">Nhập nguyên vật liệu từ Excel</h2>
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
                                Tải lên file Excel (.xlsx, .xls) hoặc CSV có chứa dữ liệu nguyên vật liệu.
                                File cần có các cột: TÊN GỖ, QUY CÁCH.
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

export default NVLManagement;