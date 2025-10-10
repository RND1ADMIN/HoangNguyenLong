import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Filter, Search, X, List, TrendingUp, Users, DollarSign, Package, BarChart3, ChevronDown } from 'lucide-react';
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

const splitStageCode = (fullCode) => {
  if (!fullCode) return { code: '', name: '' };
  const parts = fullCode.split(' - ');
  if (parts.length >= 2) {
    const code = parts[0].trim();
    const name = parts.slice(1).join(' - ').trim();
    return { code, name };
  } else {
    return { code: fullCode, name: fullCode };
  }
};

const TongHop = () => {
  const [activeTab, setActiveTab] = useState('by-date');
  const [reports, setReports] = useState([]);
  const [teamWorkStages, setTeamWorkStages] = useState([]);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    congDoan: '',
    team: ''
  });

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

  // Process data by date
  const processedDataByDate = useMemo(() => {
    const reportsByDate = {};
    reports.forEach(report => {
      const date = report['NGÀY'].split('T')[0];
      if (!reportsByDate[date]) {
        reportsByDate[date] = [];
      }
      reportsByDate[date].push(report);
    });

    const today = new Date();
    const activeStages = teamWorkStages.filter(stage => {
      const startDate = new Date(stage['HIỆU LỰC TỪ']);
      const endDate = new Date(stage['HIỆU LỰC ĐẾN']);
      return today >= startDate && today <= endDate;
    });

    const workStageCodes = [...new Set(reports.map(report => report['CÔNG ĐOẠN']))];
    const processedResults = [];

    Object.keys(reportsByDate).sort().forEach(date => {
      const dayReports = reportsByDate[date];

      workStageCodes.forEach(stageCode => {
        const { code: workStageCode, name: workStageName } = splitStageCode(stageCode);
        const stageReports = dayReports.filter(report => report['CÔNG ĐOẠN'] === stageCode);

        if (stageReports.length === 0) return;

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

          const quantity = parseFloat(report['KHỐI LƯỢNG']) || 0;
          teamData[team].totalQuantity += quantity;

          const staffCount = parseInt(report['SỐ LƯỢNG NHÂN SỰ']) || 0;
          teamData[team].staffCount = Math.max(teamData[team].staffCount, staffCount);

          if (report['NHÂN SỰ']) {
            const staffList = report['NHÂN SỰ'].split(',');
            staffList.forEach(staff => {
              teamData[team].staffSet.add(staff.trim());
            });
          }

          teamData[team].items.push({
            name: report['TÊN HÀNG'],
            quantity: quantity,
            unit: report['ĐƠN VỊ TÍNH'],
            unitPrice: parseFloat(report['ĐƠN GIÁ']) || 0,
            amount: parseFloat(report['THÀNH TIỀN']) || 0
          });
        });

        Object.values(teamData).forEach(team => {
          team.actualStaffCount = Math.max(team.staffCount, team.staffSet.size);

          const workStage = activeStages.find(stage =>
            stage['TỔ'] === team.team && stage['MÃ CÔNG ĐOẠN'] === stageCode
          );

          team.unitPrice = workStage ? parseFloat(workStage['ĐƠN GIÁ NĂNG SUẤT']) || 0 : 0;
          team.totalAmount = team.items.reduce((sum, item) => sum + item.amount, 0);
          team.unit = workStage ? workStage['ĐƠN VỊ TÍNH'] :
            (team.items.length > 0 ? team.items[0].unit : '');
          team.workStageName = workStage ? workStage['TÊN CÔNG ĐOẠN'] : workStageName;
        });

        const uniqueStaffSet = new Set();
        Object.values(teamData).forEach(team => {
          team.staffSet.forEach(staff => {
            if (staff) uniqueStaffSet.add(staff);
          });
        });

        processedResults.push({
          date: date,
          workStage: {
            code: workStageCode,
            name: workStageName,
            fullCode: stageCode
          },
          teams: Object.values(teamData),
          totalQuantity: Object.values(teamData).reduce((sum, team) => sum + team.totalQuantity, 0),
          totalStaff: uniqueStaffSet.size,
          totalAmount: Object.values(teamData).reduce((sum, team) => sum + team.totalAmount, 0),
          uniqueStaffList: Array.from(uniqueStaffSet)
        });
      });
    });

    return processedResults;
  }, [reports, teamWorkStages]);

  // Process data by team
  const processedDataByTeam = useMemo(() => {
    const teamDataMap = {};

    reports.forEach(report => {
      const team = report['TỔ'];
      const stageCode = report['CÔNG ĐOẠN'];
      const date = report['NGÀY'].split('T')[0];

      if (!teamDataMap[team]) {
        teamDataMap[team] = {
          team: team,
          stages: {},
          staffSet: new Set(),
          dates: new Set()
        };
      }

      if (!teamDataMap[team].stages[stageCode]) {
        const { code, name } = splitStageCode(stageCode);
        teamDataMap[team].stages[stageCode] = {
          stageCode: code,
          stageName: name,
          fullCode: stageCode,
          totalQuantity: 0,
          totalAmount: 0,
          staffSet: new Set(),
          details: []
        };
      }

      const quantity = parseFloat(report['KHỐI LƯỢNG']) || 0;
      const amount = parseFloat(report['THÀNH TIỀN']) || 0;

      teamDataMap[team].dates.add(date);
      teamDataMap[team].stages[stageCode].totalQuantity += quantity;
      teamDataMap[team].stages[stageCode].totalAmount += amount;

      if (report['NHÂN SỰ']) {
        const staffList = report['NHÂN SỰ'].split(',');
        staffList.forEach(staff => {
          const trimmedStaff = staff.trim();
          if (trimmedStaff) {
            teamDataMap[team].staffSet.add(trimmedStaff);
            teamDataMap[team].stages[stageCode].staffSet.add(trimmedStaff);
          }
        });
      }

      teamDataMap[team].stages[stageCode].details.push({
        date: date,
        itemName: report['TÊN HÀNG'],
        quantity: quantity,
        unit: report['ĐƠN VỊ TÍNH'],
        amount: amount,
        staff: report['NHÂN SỰ'] || ''
      });
    });

    const processedResults = Object.values(teamDataMap).map(teamData => ({
      team: teamData.team,
      stages: Object.values(teamData.stages).map(stage => ({
        ...stage,
        totalStaff: stage.staffSet.size,
        staffList: Array.from(stage.staffSet)
      })),
      staffList: Array.from(teamData.staffSet),
      dateCount: teamData.dates.size
    }));

    return processedResults.sort((a, b) => a.team.localeCompare(b.team));
  }, [reports]);

  // Get unique values for filters
  const uniqueCongDoan = useMemo(() => {
    const stages = [...new Set(reports.map(item => item['CÔNG ĐOẠN']))];
    return stages.sort();
  }, [reports]);

  const uniqueTeams = useMemo(() => {
    const teams = [...new Set(reports.map(item => item['TỔ']))];
    return teams.sort();
  }, [reports]);

  // Apply filters for date view
  const filteredDataByDate = useMemo(() => {
    return processedDataByDate.filter(item => {
      let dateMatch = true;
      if (filters.startDate || filters.endDate) {
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);

        if (filters.startDate && filters.endDate) {
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          dateMatch = itemDate >= startDate && itemDate <= endDate;
        } else if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          dateMatch = itemDate >= startDate;
        } else if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          dateMatch = itemDate <= endDate;
        }
      }

      const congDoanMatch = !filters.congDoan || item.workStage.fullCode === filters.congDoan;

      const searchMatch = !search ||
        item.date.includes(search) ||
        item.workStage.name.toLowerCase().includes(search.toLowerCase()) ||
        item.workStage.code.toLowerCase().includes(search.toLowerCase()) ||
        item.teams.some(team => team.team.toLowerCase().includes(search.toLowerCase()));

      return dateMatch && congDoanMatch && searchMatch;
    });
  }, [processedDataByDate, filters, search]);

  // Apply filters for team view
  const filteredDataByTeam = useMemo(() => {
    return processedDataByTeam.filter(teamData => {
      const teamMatch = !filters.team || teamData.team === filters.team;

      const congDoanMatch = !filters.congDoan ||
        teamData.stages.some(stage => stage.fullCode === filters.congDoan);

      const searchMatch = !search ||
        teamData.team.toLowerCase().includes(search.toLowerCase()) ||
        teamData.stages.some(stage =>
          stage.stageName.toLowerCase().includes(search.toLowerCase()) ||
          stage.stageCode.toLowerCase().includes(search.toLowerCase())
        );

      return teamMatch && congDoanMatch && searchMatch;
    }).map(teamData => {
      let filteredStages = teamData.stages;

      if (filters.congDoan) {
        filteredStages = filteredStages.filter(stage => stage.fullCode === filters.congDoan);
      }

      if (filters.startDate || filters.endDate) {
        filteredStages = filteredStages.map(stage => {
          const filteredDetails = stage.details.filter(detail => {
            const detailDate = new Date(detail.date);
            detailDate.setHours(0, 0, 0, 0);

            let dateMatch = true;
            if (filters.startDate && filters.endDate) {
              const startDate = new Date(filters.startDate);
              startDate.setHours(0, 0, 0, 0);
              const endDate = new Date(filters.endDate);
              endDate.setHours(23, 59, 59, 999);
              dateMatch = detailDate >= startDate && detailDate <= endDate;
            } else if (filters.startDate) {
              const startDate = new Date(filters.startDate);
              startDate.setHours(0, 0, 0, 0);
              dateMatch = detailDate >= startDate;
            } else if (filters.endDate) {
              const endDate = new Date(filters.endDate);
              endDate.setHours(23, 59, 59, 999);
              dateMatch = detailDate <= endDate;
            }
            return dateMatch;
          });

          const newTotalQuantity = filteredDetails.reduce((sum, detail) => sum + detail.quantity, 0);
          const newTotalAmount = filteredDetails.reduce((sum, detail) => sum + detail.amount, 0);
          const newStaffSet = new Set();
          filteredDetails.forEach(detail => {
            if (detail.staff) {
              detail.staff.split(',').forEach(s => newStaffSet.add(s.trim()));
            }
          });

          return {
            ...stage,
            details: filteredDetails,
            totalQuantity: newTotalQuantity,
            totalAmount: newTotalAmount,
            totalStaff: newStaffSet.size,
            staffList: Array.from(newStaffSet)
          };
        }).filter(stage => stage.details.length > 0);
      }

      const totalQuantity = filteredStages.reduce((sum, stage) => sum + stage.totalQuantity, 0);
      const totalAmount = filteredStages.reduce((sum, stage) => sum + stage.totalAmount, 0);
      const allStaffSet = new Set();
      filteredStages.forEach(stage => {
        stage.staffList.forEach(staff => allStaffSet.add(staff));
      });

      return {
        ...teamData,
        stages: filteredStages,
        totalQuantity,
        totalAmount,
        totalStaff: allStaffSet.size,
        staffList: Array.from(allStaffSet)
      };
    }).filter(teamData => teamData.stages.length > 0);
  }, [processedDataByTeam, filters, search]);

  // Calculate summary stats
  const summaryStatsByDate = useMemo(() => {
    if (filteredDataByDate.length === 0) {
      return {
        totalRecords: 0,
        totalQuantity: 0,
        totalStaff: 0,
        totalAmount: 0
      };
    }

    const allUniqueStaff = new Set();
    filteredDataByDate.forEach(item => {
      item.uniqueStaffList.forEach(staff => {
        if (staff) allUniqueStaff.add(staff);
      });
    });

    return {
      totalRecords: filteredDataByDate.length,
      totalQuantity: filteredDataByDate.reduce((sum, item) => sum + item.totalQuantity, 0),
      totalStaff: allUniqueStaff.size,
      totalAmount: filteredDataByDate.reduce((sum, item) => sum + item.totalAmount, 0)
    };
  }, [filteredDataByDate]);

  const summaryStatsByTeam = useMemo(() => {
    if (filteredDataByTeam.length === 0) {
      return {
        totalTeams: 0,
        totalQuantity: 0,
        totalStaff: 0,
        totalAmount: 0
      };
    }

    const allUniqueStaff = new Set();
    filteredDataByTeam.forEach(item => {
      item.staffList.forEach(staff => {
        if (staff) allUniqueStaff.add(staff);
      });
    });

    return {
      totalTeams: filteredDataByTeam.length,
      totalQuantity: filteredDataByTeam.reduce((sum, item) => sum + item.totalQuantity, 0),
      totalStaff: allUniqueStaff.size,
      totalAmount: filteredDataByTeam.reduce((sum, item) => sum + item.totalAmount, 0)
    };
  }, [filteredDataByTeam]);

  const handleFilterDateChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || null
    }));
  };

  const handleExportByDate = () => {
    const exportData = filteredDataByDate.map(item => ({
      'Ngày': item.date,
      'Công đoạn': `${item.workStage.code} - ${item.workStage.name}`,
      'Tổng khối lượng': item.totalQuantity,
      'Tổng nhân sự': item.totalStaff,
      'Tổng thành tiền': item.totalAmount,
      'Danh sách nhân sự': item.uniqueStaffList.join(', '),
      'Chi tiết tổ': item.teams.map(team =>
        `${team.team}: ${team.totalQuantity}${team.unit} (${team.actualStaffCount} người) - ${formatNumber(team.totalAmount)} VNĐ`
      ).join('; ')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo theo ngày');
    XLSX.writeFile(wb, `bao-cao-nang-suat-theo-ngay-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportByTeam = () => {
    const exportData = [];
    filteredDataByTeam.forEach(teamData => {
      teamData.stages.forEach(stage => {
        exportData.push({
          'Tổ': teamData.team,
          'Công đoạn': `${stage.stageCode} - ${stage.stageName}`,
          'Tổng khối lượng': stage.totalQuantity,
          'Tổng nhân sự': stage.totalStaff,
          'Tổng thành tiền': stage.totalAmount,
          'Danh sách nhân sự': stage.staffList.join(', ')
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo theo tổ');
    XLSX.writeFile(wb, `bao-cao-nang-suat-theo-to-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      congDoan: '',
      team: ''
    });
    setSearch('');
  };

  const currentStats = activeTab === 'by-date' ? summaryStatsByDate : summaryStatsByTeam;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Báo cáo năng suất tổng hợp</h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
              </button>

              <button
                onClick={activeTab === 'by-date' ? handleExportByDate : handleExportByTeam}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('by-date')}
                  className={`
                    py-3 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === 'by-date'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Báo cáo theo ngày
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('by-team')}
                  className={`
                    py-3 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === 'by-team'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Báo cáo theo tổ
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Filters - ĐÃ SỬA */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Filter 1: Team hoặc Start Date */}
                {activeTab === 'by-team' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tổ</label>
                    <select
                      value={filters.team}
                      onChange={(e) => setFilters(prev => ({ ...prev, team: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Tất cả các tổ</option>
                      {uniqueTeams.map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                      <input
                        type="date"
                        value={filters.startDate ? formatDateForInput(filters.startDate) : ''}
                        onChange={(e) => handleFilterDateChange('startDate', e.target.value)}
                        className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Filter 2: Start Date (team view) hoặc End Date (date view) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {activeTab === 'by-team' ? 'Từ ngày' : 'Đến ngày'}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                    <input
                      type="date"
                      value={activeTab === 'by-team'
                        ? (filters.startDate ? formatDateForInput(filters.startDate) : '')
                        : (filters.endDate ? formatDateForInput(filters.endDate) : '')
                      }
                      onChange={(e) => handleFilterDateChange(activeTab === 'by-team' ? 'startDate' : 'endDate', e.target.value)}
                      className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Filter 3: End Date (team view) hoặc Công đoạn (date view) */}
                {activeTab === 'by-team' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                      <input
                        type="date"
                        value={filters.endDate ? formatDateForInput(filters.endDate) : ''}
                        onChange={(e) => handleFilterDateChange('endDate', e.target.value)}
                        className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Công đoạn</label>
                    <select
                      value={filters.congDoan}
                      onChange={(e) => setFilters(prev => ({ ...prev, congDoan: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Tất cả công đoạn</option>
                      {uniqueCongDoan.map(cd => (
                        <option key={cd} value={cd}>{cd}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filter 4: Công đoạn (luôn hiển thị cho team view) */}
                {activeTab === 'by-team' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Công đoạn</label>
                    <select
                      value={filters.congDoan}
                      onChange={(e) => setFilters(prev => ({ ...prev, congDoan: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Tất cả công đoạn</option>
                      {uniqueCongDoan.map(cd => (
                        <option key={cd} value={cd}>{cd}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Nút xóa bộ lọc - Đặt cùng hàng */}
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
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
                placeholder={activeTab === 'by-date' ? "Tìm kiếm theo ngày, công đoạn, tổ..." : "Tìm kiếm theo tổ, công đoạn..."}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 mb-1">
                    {activeTab === 'by-date' ? 'Tổng số bản ghi' : 'Tổng số tổ'}
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {activeTab === 'by-date' ? currentStats.totalRecords : currentStats.totalTeams}
                  </h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <List className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-gray-600">
                  {activeTab === 'by-date' ? 'Số bản ghi trong kỳ' : 'Số tổ tham gia'}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 mb-1">Tổng khối lượng</p>
                  <h3 className="text-2xl font-bold text-gray-900">{formatNumber(currentStats.totalQuantity)}</h3>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-gray-600">Khối lượng sản xuất</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 mb-1">Tổng nhân sự</p>
                  <h3 className="text-2xl font-bold text-gray-900">{formatNumber(currentStats.totalStaff)}</h3>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-gray-600">Người tham gia</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 mb-1">Tổng thành tiền</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentStats.totalAmount)}
                  </h3>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-gray-600">Giá trị sản xuất</span>
              </div>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'by-date' ? (
            <ByDateView data={filteredDataByDate} />
          ) : (
            <ByTeamView data={filteredDataByTeam} />
          )}
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

// Component for Date View
const ByDateView = ({ data }) => {
  return (
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
          {data.map((item, index) => (
            <tr key={`${item.date}-${item.workStage.code}-${index}`} className="hover:bg-gray-50">
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

      {data.length === 0 && (
        <div className="text-center py-8">
          <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Không tìm thấy dữ liệu phù hợp</p>
        </div>
      )}
    </div>
  );
};

// Component for Team View - ĐÃ SỬA THEO YÊU CẦU
// Component for Team View - ĐÃ SỬA gộp thành 1 hàng
const ByTeamView = ({ data }) => {
  const [expandedTeams, setExpandedTeams] = useState({});
  const [expandedStages, setExpandedStages] = useState({});

  const toggleTeam = (team) => {
    setExpandedTeams(prev => ({
      ...prev,
      [team]: !prev[team]
    }));
  };

  const toggleStage = (teamStageKey) => {
    setExpandedStages(prev => ({
      ...prev,
      [teamStageKey]: !prev[teamStageKey]
    }));
  };

  return (
    <div className="space-y-4">
      {data.map((teamData, index) => (
        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          {/* Team Header - Gộp thành 1 hàng */}
          <div
            className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 cursor-pointer hover:from-indigo-100 hover:to-blue-100 transition-all border-b border-gray-200"
            onClick={() => toggleTeam(teamData.team)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-800">{teamData.team}</h4>
                <span className="text-sm text-gray-600">•</span>
                <span className="text-sm text-gray-600">{teamData.stages.length} công đoạn</span>
                <span className="text-sm text-gray-600">•</span>
                <span className="text-sm text-gray-600">{teamData.totalStaff} nhân sự</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-sm text-gray-500">Tổng thành tiền: </span>
                  <span className="text-lg font-semibold text-green-600">{formatNumber(teamData.totalAmount)} ₫</span>
                </div>

                <ChevronDown
                  className={`w-5 h-5 text-gray-600 transition-transform ${expandedTeams[teamData.team] ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Expanded Team Details */}
          {expandedTeams[teamData.team] && (
            <div className="p-4 bg-gray-50">
              {/* Stages */}
              <div className="space-y-3">
                {teamData.stages.map((stage, stageIndex) => {
                  const stageKey = `${teamData.team}-${stage.stageCode}`;
                  return (
                    <div key={stageIndex} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {/* Stage Header */}
                      <div
                        className="bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleStage(stageKey)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4 flex-1">
                            <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-800">
                              {stage.stageCode} - {stage.stageName}
                            </span>
                            <span className="text-sm text-gray-600">
                              👥 {stage.totalStaff} nhân sự
                            </span>
                            <span className="text-sm text-gray-600">
                              📦 {formatNumber(stage.totalQuantity)}
                            </span>
                            <span className="text-sm text-green-600 font-medium">
                              💰 {formatNumber(stage.totalAmount)} ₫
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-gray-600 transition-transform ${expandedStages[stageKey] ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Stage Details */}
                      {expandedStages[stageKey] && stage.details.length > 0 && (
                        <div className="p-3 bg-white">
                          {/* Staff in this stage */}
                          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-100">
                            <p className="text-xs text-gray-600">
                              <strong>Nhân sự:</strong> {stage.staffList.join(', ')}
                            </p>
                          </div>

                          {/* Details Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-100 border-b border-gray-200">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Ngày</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Tên hàng</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Khối lượng</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Thành tiền</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {stage.details.map((detail, detailIndex) => (
                                  <tr key={detailIndex} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                      {new Date(detail.date).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">{detail.itemName}</td>
                                    <td className="px-3 py-2 text-right text-gray-900 font-medium">
                                      {formatNumber(detail.quantity)} {detail.unit}
                                    </td>
                                    <td className="px-3 py-2 text-right text-green-600 font-semibold">
                                      {formatNumber(detail.amount)} ₫
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {data.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Không tìm thấy dữ liệu phù hợp</p>
        </div>
      )}
    </div>
  );
};

export default TongHop;