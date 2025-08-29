import React, { useState, useEffect, useMemo } from 'react';
import { Package, Users, Save, Plus, Minus, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import authUtils from '../utils/authUtils';

// Utility function để generate unique ID
const generateUniqueId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const timeBase = Date.now().toString(36).toUpperCase().slice(-4);
    result += timeBase.padStart(4, chars.charAt(Math.floor(Math.random() * chars.length)));
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const PhanBoBaoBi = ({ record, onClose, onSuccess }) => {
    const [teamData, setTeamData] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        // Tự động chọn tab dựa trên dữ liệu có sẵn
        const hasAnh = parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0) > 0;
        const hasEm = parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0) > 0;
        return hasAnh ? 'anh' : (hasEm ? 'em' : 'anh');
    });

    // Tính toán số lượng còn lại
    const remaining = useMemo(() => {
        const totalAnh = parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0);
        const totalEm = parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0);

        const allocatedAnh = allocations
            .filter(a => a.type === 'anh')
            .reduce((sum, a) => sum + parseFloat(a.totalQuantity || 0), 0);

        const allocatedEm = allocations
            .filter(a => a.type === 'em')
            .reduce((sum, a) => sum + parseFloat(a.totalQuantity || 0), 0);

        return {
            anh: totalAnh - allocatedAnh,
            em: totalEm - allocatedEm
        };
    }, [allocations, record]);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        try {
            setLoading(true);
            const response = await authUtils.apiRequest('TO_PBNS', 'Find', {});

            // Lọc theo ngày hiệu lực
            const currentDate = new Date(record['NGÀY THÁNG']);
            const validTeams = response.filter(team => {
                const startDate = new Date(team['HIỆU LỰC TỪ']);
                const endDate = new Date(team['HIỆU LỰC ĐẾN']);
                return currentDate >= startDate && currentDate <= endDate;
            });

            const grouped = groupTeamData(validTeams);
            setTeamData(grouped);
        } catch (error) {
            console.error('Error fetching team data:', error);
            toast.error('Lỗi khi tải dữ liệu tổ công đoạn');
        } finally {
            setLoading(false);
        }
    };

    const groupTeamData = (data) => {
        const grouped = {};
        data.forEach(item => {
            const teamId = item['TỔ'];
            const group = item['NHÓM'];

            if (!grouped[teamId]) {
                grouped[teamId] = {
                    teamName: teamId,
                    anh: [],
                    em: []
                };
            }

            // Chỉ lọc đúng theo nhóm bao bì
            if (group === 'Bao bì anh') {
                grouped[teamId].anh.push(item);
            } else if (group === 'Bao bì em') {
                grouped[teamId].em.push(item);
            }
            // Bỏ qua các nhóm khác như 'Bãi', 'Thợ - Mũi cưa', etc.
        });

        return Object.values(grouped);
    };

    const addAllocation = (teamData, type) => {
        // Kiểm tra xem tổ này đã được phân bổ cho loại bao bì này chưa
        const existingAllocation = allocations.find(a => a.teamId === teamData.teamName && a.type === type);
        if (existingAllocation) {
            toast.warning(`Tổ ${teamData.teamName} đã được phân bổ cho ${type === 'anh' ? 'bao bì anh' : 'bao bì em'}`);
            return;
        }

        const newAllocation = {
            id: Date.now().toString(),
            type: type,
            teamId: teamData.teamName,
            teamName: teamData.teamName,
            processes: teamData[type].map(process => ({
                ...process,
                quantity: 0
            })),
            totalQuantity: 0
        };
        setAllocations([...allocations, newAllocation]);
    };

    const updateAllocation = (allocationId, quantity) => {
        const numQuantity = parseFloat(quantity || 0);
        setAllocations(prev =>
            prev.map(allocation => {
                if (allocation.id === allocationId) {
                    const updatedProcesses = allocation.processes.map(process => ({
                        ...process,
                        quantity: numQuantity
                    }));

                    return {
                        ...allocation,
                        processes: updatedProcesses,
                        totalQuantity: numQuantity
                    };
                }
                return allocation;
            })
        );
    };

    const removeAllocation = (allocationId) => {
        setAllocations(prev => prev.filter(a => a.id !== allocationId));
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // Validate phân bổ
            if (remaining.anh < -0.001 || remaining.em < -0.001) {
                toast.error('Số lượng phân bổ vượt quá số lượng có sẵn');
                return;
            }

            const bc2Records = [];

            // Tính tổng đã phân bổ cho từng loại
            const totalAllocatedAnh = allocations
                .filter(a => a.type === 'anh')
                .reduce((sum, a) => sum + parseFloat(a.totalQuantity || 0), 0);

            const totalAllocatedEm = allocations
                .filter(a => a.type === 'em')
                .reduce((sum, a) => sum + parseFloat(a.totalQuantity || 0), 0);

            // Tạo records cho BC2
            allocations.forEach(allocation => {
                allocation.processes.forEach(process => {
                    if (process.quantity > 0) {
                        const donGia = parseFloat(process['ĐƠN GIÁ NĂNG SUẤT'] || 0);
                        const thanhTien = process.quantity * donGia;

                        bc2Records.push({
                            IDBC: generateUniqueId(),
                            NGÀY: record['NGÀY THÁNG'],
                            ID_NHAPBAOBI: record.ID,
                            'TÊN HÀNG': allocation.type === 'anh' ? 'Bao bì anh' : 'Bao bì em',
                            TỔ: process['TỔ'],
                            'CÔNG ĐOẠN': process['TÊN CÔNG ĐOẠN'],
                            'ĐƠN VỊ TÍNH': process['ĐƠN VỊ TÍNH'] || 'Tấn',
                            'PP TÍNH NĂNG SUẤT': process['PP TÍNH NĂNG SUẤT'] || 'Tấn',
                            'KHỐI LƯỢNG': process.quantity,
                            'NHÂN SỰ THAM GIA': process['SỐ LƯỢNG NHÂN SỰ'] || '',
                            'SỐ DÂY': '',
                            'GHI CHÚ': `Phân bổ từ ${record['SỐ XE']} - ${record['KHÁCH HÀNG']}`,
                            'NGƯỜI NHẬP': authUtils.getUserData()?.['Họ và Tên'] || 'Hệ thống',
                            'ĐƠN GIÁ': donGia,
                            'THÀNH TIỀN': thanhTien,
                            'LỊCH SỬ': `[${new Date().toLocaleString('vi-VN')}] Tạo từ phân bổ bao bì`
                        });
                    }
                });
            });

            if (bc2Records.length === 0) {
                toast.warning('Không có dữ liệu để lưu. Vui lòng nhập số lượng cho các tổ.');
                return;
            }

            // Cập nhật bảng NHAPBAOBI với thông tin phân bổ
            const currentAllocatedAnh = parseFloat(record['ĐÃ PHÂN BỔ (ANH)'] || 0);
            const currentAllocatedEm = parseFloat(record['ĐÃ PHÂN BỔ (EM)'] || 0);

            const newAllocatedAnh = currentAllocatedAnh + totalAllocatedAnh;
            const newAllocatedEm = currentAllocatedEm + totalAllocatedEm;

            const thucNhanAnh = parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0);
            const thucNhanEm = parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0);

            const baiAnh = thucNhanAnh - newAllocatedAnh;
            const baiEm = thucNhanEm - newAllocatedEm;

            const updatedRecord = {
                ...record,
                'ĐÃ PHÂN BỔ (ANH)': newAllocatedAnh.toFixed(2),
                'BÃI (ANH)': baiAnh.toFixed(2),
                'ĐÃ PHÂN BỔ (EM)': newAllocatedEm.toFixed(2),
                'BÃI (EM)': baiEm.toFixed(2)
            };

            // Lưu BC2 records theo batch
            const batchSize = 20;
            let successCount = 0;

            for (let i = 0; i < bc2Records.length; i += batchSize) {
                const batch = bc2Records.slice(i, i + batchSize);
                try {
                    await authUtils.apiRequest('BC2', 'Add', { Rows: batch });
                    successCount += batch.length;
                } catch (error) {
                    console.error('Error saving batch:', error);
                    throw new Error(`Lỗi khi lưu batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
                }
            }

            // Cập nhật bảng NHAPBAOBI
            await authUtils.apiRequest('NHAPBAOBI', 'Edit', {
                Rows: [updatedRecord]
            });

            toast.success(`Đã lưu thành công ${successCount} bản ghi phân bổ và cập nhật thông tin bao bì`);
            onSuccess?.();
            onClose();

        } catch (error) {
            console.error('Error saving allocation:', error);
            toast.error('Lỗi khi lưu phân bổ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const currentTabAllocations = allocations.filter(a => a.type === activeTab);

    // Kiểm tra có dữ liệu để phân bổ
    const hasAnhData = parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0) > 0;
    const hasEmData = parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0) > 0;
    const hasAnyData = hasAnhData || hasEmData;

    if (!hasAnyData) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                    <div className="text-center">
                        <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                            Không có dữ liệu để phân bổ
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Bản ghi này không có thực nhận bao bì anh hoặc em.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Package className="h-6 w-6 text-indigo-600" />
                                Phân bổ bao bì - {record['SỐ XE']}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Khách hàng: {record['KHÁCH HÀNG']} | Ngày: {new Date(record['NGÀY THÁNG']).toLocaleDateString('vi-VN')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Tab Navigation - chỉ hiển thị tab có dữ liệu */}
                    <div className="flex space-x-1 mt-4">
                        {hasAnhData && (
                            <button
                                onClick={() => setActiveTab('anh')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'anh'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Bao bì Anh ({parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0).toFixed(2)} tấn)
                                <span className="ml-2 text-xs">
                                    Còn: {remaining.anh.toFixed(2)} tấn
                                </span>
                            </button>
                        )}
                        {hasEmData && (
                            <button
                                onClick={() => setActiveTab('em')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'em'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Bao bì Em ({parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0).toFixed(2)} tấn)
                                <span className="ml-2 text-xs">
                                    Còn: {remaining.em.toFixed(2)} tấn
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="ml-2 text-gray-600">Đang tải dữ liệu...</span>
                        </div>
                    ) : (
                        <>
                            {/* Team Selection */}
                            <div className="mb-6">
                                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Chọn tổ để phân bổ {activeTab === 'anh' ? 'bao bì anh' : 'bao bì em'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {teamData
                                        .filter(team => team[activeTab].length > 0) // Chỉ hiển thị tổ có công đoạn tương ứng
                                        .map(team => (
                                            <div key={team.teamName} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-medium text-gray-800">{team.teamName}</h4>
                                                    <button
                                                        onClick={() => addAllocation(team, activeTab)}
                                                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Chọn
                                                    </button>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {team[activeTab].length} công đoạn {activeTab === 'anh' ? 'bao bì anh' : 'bao bì em'}
                                                </div>
                                                <div className="mt-2 text-xs text-gray-500">
                                                    {team[activeTab].slice(0, 3).map(p => p['TÊN CÔNG ĐOẠN']).join(', ')}
                                                    {team[activeTab].length > 3 && '...'}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {teamData.filter(team => team[activeTab].length > 0).length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                        <p>Không có tổ nào có công đoạn {activeTab === 'anh' ? 'bao bì anh' : 'bao bì em'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Current Allocations */}
                            <div className="mb-6">
                                <h3 className="text-lg font-medium mb-3">Phân bổ hiện tại</h3>
                                <div className="space-y-4">
                                    {currentTabAllocations.map(allocation => (
                                        <div key={allocation.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-medium text-gray-800">Tổ: {allocation.teamName}</h4>
                                                    <p className="text-sm text-gray-600">
                                                        {allocation.processes.length} công đoạn sẽ nhận đều nhau
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        max={activeTab === 'anh' ? remaining.anh + allocation.totalQuantity : remaining.em + allocation.totalQuantity}
                                                        placeholder="Số lượng (tấn)"
                                                        value={allocation.totalQuantity || ''}
                                                        onChange={(e) => updateAllocation(allocation.id, e.target.value)}
                                                        className="w-32 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                    <button
                                                        onClick={() => removeAllocation(allocation.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                        title="Xóa phân bổ"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Process List */}
                                            <div className="bg-white rounded p-3 border">
                                                <div className="text-sm font-medium mb-2 text-gray-700">Các công đoạn sẽ nhận:</div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                    {allocation.processes.map((process, idx) => {
                                                        const donGia = parseFloat(process['ĐƠN GIÁ NĂNG SUẤT'] || 0);
                                                        const thanhTien = process.quantity * donGia;
                                                        return (
                                                            <div key={idx} className="bg-gray-50 p-2 rounded border-l-2 border-indigo-200">
                                                                <div className="font-medium text-gray-800">{process['TÊN CÔNG ĐOẠN']}</div>
                                                                <div className="text-gray-600 mt-1">
                                                                    {process.quantity.toFixed(2)} tấn × {donGia.toLocaleString()} = {thanhTien.toLocaleString()} VNĐ
                                                                </div>
                                                                <div className="text-gray-500 text-xs mt-1">
                                                                    Nhân sự: {process['SỐ LƯỢNG NHÂN SỰ'] || 'Chưa xác định'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {currentTabAllocations.length === 0 && (
                                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                                            <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                            <p>Chưa có phân bổ nào cho {activeTab === 'anh' ? 'bao bì anh' : 'bao bì em'}</p>
                                            <p className="text-sm">Chọn tổ từ danh sách trên để thêm phân bổ</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4 mb-6">
                                <h3 className="text-lg font-medium text-indigo-800 mb-3">Tổng kết phân bổ</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {hasAnhData && (
                                        <>
                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <div className="text-sm text-gray-600">Tổng Anh</div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0).toFixed(2)} tấn
                                                </div>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <div className="text-sm text-gray-600">Còn lại Anh</div>
                                                <div className={`text-lg font-bold ${remaining.anh >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {remaining.anh.toFixed(2)} tấn
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {hasEmData && (
                                        <>
                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <div className="text-sm text-gray-600">Tổng Em</div>
                                                <div className="text-lg font-bold text-purple-600">
                                                    {parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0).toFixed(2)} tấn
                                                </div>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <div className="text-sm text-gray-600">Còn lại Em</div>
                                                <div className={`text-lg font-bold ${remaining.em >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {remaining.em.toFixed(2)} tấn
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {(remaining.anh < -0.001 || remaining.em < -0.001) && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center text-red-800">
                                            <AlertCircle className="h-4 w-4 mr-2" />
                                            <span className="text-sm font-medium">
                                                Cảnh báo: Số lượng phân bổ vượt quá số lượng có sẵn!
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || allocations.length === 0 || remaining.anh < -0.001 || remaining.em < -0.001}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Lưu phân bổ ({allocations.reduce((sum, a) => sum + a.processes.length, 0)} bản ghi)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default PhanBoBaoBi;