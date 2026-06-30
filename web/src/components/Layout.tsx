import { Outlet } from 'react-router-dom';
import { Menu, Bell, User } from 'lucide-react';
import Nav from './Nav';
import FloatingAssistant from './FloatingAssistant';
import { useAppStore } from '../stores/appStore';

function Layout() {
  const { collapsed, toggleCollapsed } = useAppStore();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <h1 className={`font-bold text-lg text-primary-600 ${collapsed ? 'hidden' : 'block'}`}>
            智能应急管理
          </h1>
          {collapsed && (
            <span className="font-bold text-lg text-primary-600">应急</span>
          )}
        </div>
        <Nav />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} className="text-gray-600" />
          </button>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <span className="text-sm text-gray-700">管理员</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <FloatingAssistant />
    </div>
  );
}

export default Layout;
