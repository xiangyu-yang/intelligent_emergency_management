#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件增量更新脚本
定期更新政策文件
"""

import json
import argparse
import time
from pathlib import Path

class IncrementalUpdater:
    def __init__(self, config_path: str = None):
        pass
    
    def update(self, last_update_date: str = None) -> dict:
        """执行增量更新"""
        print(f"🚀 开始增量更新，上次更新日期: {last_update_date or '首次更新'}")
        
        search_results = self._search_new_policies(last_update_date)
        
        if search_results['totalCount'] > 0:
            print(f"📊 发现 {search_results['totalCount']} 条新政策")
            
            download_results = self._download_policies(search_results['policies'])
            
            if download_results['successCount'] > 0:
                parse_results = self._parse_policies()
                
                if parse_results['successCount'] > 0:
                    import_results = self._import_policies()
                    return import_results
        
        return {
            "totalCount": 0,
            "downloadedCount": 0,
            "parsedCount": 0,
            "importedCount": 0
        }
    
    def _search_new_policies(self, last_update_date: str) -> dict:
        """搜索新政策"""
        import subprocess
        
        cmd = ['python', 'scripts/search_policies.py', '--output', 'search_results.json']
        
        if last_update_date:
            cmd.extend(['--dateRange', last_update_date])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            with open('search_results.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return {"totalCount": 0, "policies": []}
    
    def _download_policies(self, policies: list) -> dict:
        """下载政策文件"""
        import subprocess
        
        with open('new_policies.json', 'w', encoding='utf-8') as f:
            json.dump({"policies": policies}, f, ensure_ascii=False)
        
        result = subprocess.run(
            ['python', 'scripts/download_policies.py', '--json', 'new_policies.json', '--output', 'downloads'],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            with open('downloads/download_results.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return {"totalCount": 0, "successCount": 0, "results": []}
    
    def _parse_policies(self) -> dict:
        """解析政策文件"""
        import subprocess
        
        result = subprocess.run(
            ['python', 'scripts/parse_policies.py', '--input', 'downloads', '--output', 'parsed'],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            with open('parsed/parsed_results.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return {"totalCount": 0, "successCount": 0, "results": []}
    
    def _import_policies(self) -> dict:
        """导入政策文件"""
        import subprocess
        
        result = subprocess.run(
            ['python', 'scripts/import_to_db.py', '--input', 'parsed/parsed_results.json', '--db', 'policies.db'],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            return {"totalCount": 0, "downloadedCount": 0, "parsedCount": 0, "importedCount": 0}
        
        return {"totalCount": 0, "downloadedCount": 0, "parsedCount": 0, "importedCount": 0}

def main():
    parser = argparse.ArgumentParser(description='应急政策文件增量更新脚本')
    parser.add_argument('--lastUpdate', type=str, help='上次更新日期（格式：YYYY-MM-DD）')
    parser.add_argument('--config', type=str, help='配置文件路径')
    
    args = parser.parse_args()
    
    updater = IncrementalUpdater(args.config)
    
    results = updater.update(args.lastUpdate)
    
    print(f"\n📊 增量更新完成")
    print(f"   下载: {results.get('downloadedCount', 0)}")
    print(f"   解析: {results.get('parsedCount', 0)}")
    print(f"   入库: {results.get('importedCount', 0)}")
    
    print("✅ 增量更新操作完成")

if __name__ == '__main__':
    main()
