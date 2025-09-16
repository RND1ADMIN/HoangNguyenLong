import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Filter, Search, X, List } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import * as XLSX from 'xlsx';

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatNumber = (number) => {
  if (!number || isNaN(number)) return '0';
  return new Intl.NumberFormat('vi-VN').format(number);
};

const TongHop = () => {
  const [reports, setReports] = useState([]);
  const [teamWorkStages, setTeamWorkStages] = useState([]);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null
  });

  // Fetch data
  useEffect(() => {
    fetchReports();
    fetchTeamWorkStages();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await authUtils.apiRequest('BC2', 'Find', {});
      setReports(response);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Lỗi khi tải danh sách báo cáo');
    }
  };

  const fetchTeamWorkStages = async () => {
    try {
      const response = await authUtils.apiRequest('TO_PBNS', 'Find', {});
      setTeamWorkStages(response);
    } catch (error) {
      console.error('Error fetching team work stages:', error);
      toast.error('Lỗi khi tải danh sách tổ công đoạn');
    }
  };

  // Process data
  const processedData = useMemo(() => {
    // Group reports by date
    const reportsByDate = {};
    reports.forEach(report => {
      const date = report['NGÀY'].split('T')[0]; // Get YYYY-MM-DD format
      if (!reportsByDate[date]) {
        reportsByDate[date] = [];
      }
      reportsByDate[date].push(report);
    });

    // Get active work stages
    const today = new Date();
    const activeStages = teamWorkStages.filter(stage => {
      const startDate = new Date(stage['HIỆU LỰC TỪ']);
      const endDate = new Date(stage['HIỆU LỰC ĐẾN']);
      return today >= startDate && today <= endDate;
    });

    // Get unique work stage codes from reports
    const workStageCodes = [...new Set(reports.map(report => report['CÔNG ĐOẠN']))];

    // Process each date
    const processedResults = [];
    Object.keys(reportsByDate).sort().forEach(date => {
      const dayReports = reportsByDate[date];
      
      // Group by work stage
      workStageCodes.forEach(stageCode => {
        const stageReports = dayReports.filter(report => report['CÔNG ĐOẠN'] === stageCode);
        
        if (stageReports.length === 0) return;

        // Group reports by team (TỔ)
        const teamData = {};
        stageReports.forEach(report => {
          const team = report['TỔ'];
          if (!teamData[team]) {
            teamData[team] = {
              team: team,
              totalQuantity: 0,
              staffSet: new Set(),
              staffCount: 0,
              items: []
            };
          }

          // Add quantity and staff info
          const quantity = parseFloat(report['KHỐI LƯỢNG']) || 0;
          teamData[team].totalQuantity += quantity;

          // Collect staff information
          const staffCount = parseInt(report['SỐ LƯỢNG NHÂN SỰ']) || 0;
          teamData[team].staffCount = Math.max(teamData[team].staffCount, staffCount);

          if (report['NHÂN SỰ']) {
            const staffList = report['NHÂN SỰ'].split(',');
            staffList.forEach(staff => {
              teamData[team].staffSet.add(staff.trim());
            });
          }

          // Store item details
          teamData[team].items.push({
            name: report['TÊN HÀNG'],
            quantity: quantity,
            unit: report['ĐƠN VỊ TÍNH'],
            unitPrice: parseFloat(report['ĐƠN GIÁ']) || 0,
            amount: parseFloat(report['THÀNH TIỀN']) || 0
          });
        });

        // Calculate totals and get stage info
        Object.values(teamData).forEach(team => {
          // Use actual staff count or unique staff count, whichever is higher
          team.actualStaffCount = Math.max(team.staffCount, team.staffSet.size);
          
          // Find corresponding work stage for this team and work stage code
          const workStage = activeStages.find(stage => 
            stage['TỔ'] === team.team && stage['MÃ CÔNG ĐOẠN'] === stageCode
          );
          
          team.unitPrice = workStage ? parseFloat(workStage['ĐƠN GIÁ NĂNG SUẤT']) || 0 : 0;
          team.totalAmount = team.items.reduce((sum, item) => sum + item.amount, 0);
          team.unit = workStage ? workStage['ĐƠN VỊ TÍNH'] : 
                      (team.items.length > 0 ? team.items[0].unit : '');
          team.workStageName = workStage ? workStage['TÊN CÔNG ĐOẠN'] : stageCode;
        });

        processedResults.push({
          date: date,
          workStage: {
            code: stageCode,
            name: Object.values(teamData)[0]?.workStageName || stageCode
          },
          teams: Object.values(teamData),
          totalQuantity: Object.values(teamData).reduce((sum, team) => sum + team.totalQuantity, 0),
          totalStaff: Object.values(teamData).reduce((sum, team) => sum + team.actualStaffCount, 0),
          totalAmount: Object.values(teamData).reduce((sum, team) => sum + team.totalAmount, 0)
        });
      });
    });

    return processedResults;
  }, [reports, teamWorkStages]);

  // Apply filters
  const filteredData = useMemo(() => {
    return processedData.filter(item => {
      const itemDate = new Date(item.date);
      
      // Date filter
      let dateMatch = true;
      if (filters.startDate) {
        dateMatch = itemDate >= new Date(filters.startDate);
      }
      if (filters.endDate && dateMatch) {
        dateMatch = itemDate <= new Date(filters.endDate);
      }

      // Search filter
      const searchMatch = !search || 
        item.date.includes(search) ||
        item.workStage.name.toLowerCase().includes(search.toLowerCase()) ||
        item.workStage.code.toLowerCase().includes(search.toLowerCase()) ||
        item.teams.some(team => team.team.toLowerCase().includes(search.toLowerCase()));

      return dateMatch && searchMatch;
    });
  }, [processedData, filters, search]);

  const handleFilterDateChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value ? new Date(value) : null
    }));
  };

  const handleExport = () => {
    const exportData = filteredData.map(item => ({
      'Ngày': item.date,
      'Công đoạn': `${item.workStage.code} - ${item.workStage.name}`,
      'Tổng khối lượng': item.totalQuantity,
      'Tổng nhân sự': item.totalStaff,
      'Tổng thành tiền': item.totalAmount,
      'Chi tiết tổ': item.teams.map(team => 
        `${team.team}: ${team.totalQuantity}${team.unit} (${team.actualStaffCount} người) - ${formatNumber(team.totalAmount)} VNĐ`
      ).join('; ')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo năng suất theo ngày');
    XLSX.writeFile(wb, `bao-cao-nang-suat-theo-ngay-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Báo cáo năng suất theo ngày</h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
              </button>
              
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="date"
                      value={filters.startDate ? formatDateForInput(filters.startDate) : ''}
                      onChange={(e) => handleFilterDateChange('startDate', e.target.value)}
                      className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="date"
                      value={filters.endDate ? formatDateForInput(filters.endDate) : ''}
                      onChange={(e) => handleFilterDateChange('endDate', e.target.value)}
                      className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={() => setFilters({ startDate: null, endDate: null })}
                    className="w-full px-4 py-2 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo ngày, công đoạn, tổ..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Công đoạn</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng KL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng NS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng TT</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi tiết các tổ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item, index) => (
                  <tr key={`${item.date}-${item.workStage.code}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(item.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {item.workStage.code} - {item.workStage.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.totalQuantity)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.totalStaff)} người
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatNumber(item.totalAmount)} VNĐ
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="space-y-1">
                        {item.teams.map((team, teamIndex) => (
                          <div key={teamIndex} className="p-2 bg-gray-50 rounded border">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-blue-600">{team.team}:</span>
                              <span>{formatNumber(team.totalQuantity)}{team.unit}</span>
                              <span className="text-gray-500">({team.actualStaffCount} người)</span>
                              <span className="text-green-600 font-medium">{formatNumber(team.totalAmount)} VNĐ</span>
                            </div>
                            {team.items.length > 1 && (
                              <div className="ml-4 space-y-1">
                                {team.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="text-xs text-gray-600">
                                    • {item.name}: {formatNumber(item.quantity)}{item.unit} - {formatNumber(item.amount)} VNĐ
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredData.length === 0 && (
              <div className="text-center py-8">
                <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Không tìm thấy dữ liệu phù hợp</p>
              </div>
            )}
          </div>
        </div>
      </div>

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

export default TongHop;