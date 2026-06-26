import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, FileText, Filter } from 'lucide-react';
import { generateId, classNames } from '../../utils';

interface PlanTemplate {
  id: string;
  name: string;
  eventType: string;
  description: string;
  content: string;
  version: string;
  status: 'enabled' | 'disabled';
  createdAt: string;
}

const mockData: PlanTemplate[] = [
  { id: '1', name: '火灾事故应急预案', eventType: '火灾事故', description: '火灾事故应急处置预案模板', content: '1. 火情上报\n2. 人员疏散\n3. 火灾扑救\n4. 善后处理', version: 'v1.2', status: 'enabled', createdAt: '2024-01-15 10:30:00' },
  { id: '2', name: '洪涝灾害应急预案', eventType: '洪涝灾害', description: '暴雨洪水灾害应急处置预案', content: '1. 监测预警\n2. 群众转移\n3. 抢险救援\n4. 灾后重建', version: 'v2.0', status: 'enabled', createdAt: '2024-01-16 09:20:00' },
  { id: '3', name: '交通事故应急预案', eventType: '交通事故', description: '道路交通事故应急处置预案', content: '1. 现场保护\n2. 伤员救治\n3. 交通疏导\n4. 事故调查', version: 'v1.0', status: 'enabled', createdAt: '2024-01-17 14:45:00' },
  { id: '4', name: '公共卫生应急预案', eventType: '公共卫生事件', description: '突发公共卫生事件应急预案', content: '1. 疫情报告\n2. 隔离管控\n3. 医疗救治\n4. 物资保障', version: 'v3.1', status: 'disabled', createdAt: '2024-01-18 11:00:00' },
  { id: '5', name: '地震灾害应急预案', eventType: '地震灾害', description: '地震及次生灾害应急预案', content: '1. 速报灾情\n2. 紧急救援\n3. 灾民安置\n4. 恢复重建', version: 'v1.5', status: 'enabled', createdAt: '2024-01-19 08:30:00' },
];

const eventTypes = ['火灾事故', '洪涝灾害', '交通事故', '公共卫生事件', '地震灾害'];
const statusOptions = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' },
];

function PlanTemplatePage() {
  const [data, setData] = useState<PlanTemplate[]>(mockData);
  const [searchName, setSearchName] = useState('');
  const [searchEventType, setSearchEventType] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanTemplate | null>(null);
  const [deleteItem, setDeleteItem] = useState<PlanTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    eventType: '',
    description: '',
    content: '',
    version: '',
    status: 'enabled' as 'enabled' | 'disabled',
  });

  const filteredData = data.filter((item) => {
    if (searchName && !item.name.includes(searchName)) return false;
    if (searchEventType && item.eventType !== searchEventType) return false;
    if (searchStatus && item.status !== searchStatus) return false;
    return true;
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', eventType: '', description: '', content: '', version: 'v1.0', status: 'enabled' });
    setModalOpen(true);
  };

  const handleEdit = (item: PlanTemplate) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      eventType: item.eventType,
      description: item.description,
      content: item.content,
      version: item.version,
      status: item.status,
    });
    setModalOpen(true);
  };

  const handleDelete = (item: PlanTemplate) => {
    setDeleteItem(item);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteItem) {
      setData((prev) => prev.filter((item) => item.id !== deleteItem.id));
    }
    setDeleteModalOpen(false);
    setDeleteItem(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.eventType || !formData.version) {
      alert('请填写必填项');
      return;
    }

    if (editingItem) {
      setData((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, ...formData } : item
        )
      );
    } else {
      const newItem: PlanTemplate = {
        id: generateId(),
        ...formData,
        createdAt: new Date().toLocaleString('zh-CN'),
      };
      setData((prev) => [newItem, ...prev]);
    }
    setModalOpen(false);
  };

  const resetSearch = () => {
    setSearchName('');
    setSearchEventType('');
    setSearchStatus('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">预案模板管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理各类应急事件的处置预案模板</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          新增预案
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">筛选条件</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">名称</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="请输入名称"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">事件类型</label>
              <select
                value={searchEventType}
                onChange={(e) => setSearchEventType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">全部类型</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">状态</label>
              <select
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">全部状态</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={resetSearch}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                重置
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关联事件类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">版本</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText size={16} className="text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.eventType}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {item.version}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={classNames(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      item.status === 'enabled' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {item.status === 'enabled' ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">
              暂无数据
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {filteredData.length} 条记录</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">上一页</button>
            <button className="px-3 py-1 bg-primary-600 text-white rounded text-sm">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">下一页</button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? '编辑预案模板' : '新增预案模板'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入预案名称"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    版本 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="请输入版本号"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事件类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">请选择事件类型</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入预案描述"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预案内容</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="请输入预案详细内容"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <div className="flex items-center gap-4">
                  {statusOptions.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={opt.value}
                        checked={formData.status === opt.value}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'enabled' | 'disabled' })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">确认删除</h3>
              <p className="text-sm text-gray-500 text-center">
                确定要删除「{deleteItem?.name}」吗？此操作不可恢复。
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanTemplatePage;
