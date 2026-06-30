#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件入库脚本
将解析后的政策文件存入SQLite数据库
"""

import sqlite3
import json
import argparse
import uuid
import time
from pathlib import Path
from typing import Dict, List

class PolicyImporter:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """初始化数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS policies (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                summary TEXT,
                category TEXT,
                source TEXT,
                publishDate TEXT,
                url TEXT,
                documentType TEXT,
                filePath TEXT,
                keywords TEXT,
                status TEXT DEFAULT 'active',
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_policies_category ON policies(category)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_policies_publishDate ON policies(publishDate)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_policies_title ON policies(title)
        ''')
        
        conn.commit()
        conn.close()
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4()).replace('-', '')[:16]
    
    def _extract_keywords(self, content: str, max_count: int = 10) -> str:
        """提取关键词"""
        if not content:
            return ""
        
        keyword_patterns = [
            r'(应急|安全|生产|事故|灾害|预案|救援|管理)',
            r'(煤矿|危险化学品|烟花爆竹|矿山)',
            r'(国家标准|行业标准|规范|规定)',
            r'(通报|公告|通知|意见|函)',
            r'(安全生产|应急预案|事故调查|隐患排查)'
        ]
        
        keywords = []
        for pattern in keyword_patterns:
            matches = re.findall(pattern, content)
            keywords.extend(matches)
        
        return ','.join(list(set(keywords))[:max_count])
    
    def _generate_summary(self, content: str, max_length: int = 300) -> str:
        """生成摘要"""
        if not content:
            return ""
        return content[:max_length]
    
    def import_policy(self, policy: Dict) -> bool:
        """导入单条政策"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            policy_id = self._generate_id()
            summary = self._generate_summary(policy.get('content', ''))
            
            cursor.execute('''
                INSERT OR REPLACE INTO policies 
                (id, title, content, summary, category, source, publishDate, 
                 url, documentType, filePath, keywords, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                policy_id,
                policy.get('title', ''),
                policy.get('content', ''),
                summary,
                policy.get('category', ''),
                policy.get('source', ''),
                policy.get('publishDate', ''),
                policy.get('url', ''),
                policy.get('documentType', ''),
                policy.get('filePath', ''),
                self._extract_keywords(policy.get('content', '')),
                time.strftime('%Y-%m-%d %H:%M:%S'),
                time.strftime('%Y-%m-%d %H:%M:%S')
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ 入库失败: {policy.get('title', '')} - {str(e)}")
            return False
    
    def import_policies(self, policies: List[Dict]) -> int:
        """批量导入政策"""
        success_count = 0
        
        for i, policy in enumerate(policies, 1):
            if policy.get('success', False):
                print(f"[{i}/{len(policies)}] 正在入库: {policy.get('title', '')}")
                if self.import_policy(policy):
                    success_count += 1
        
        return success_count
    
    def get_policy_count(self) -> int:
        """获取政策总数"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM policies')
        count = cursor.fetchone()[0]
        conn.close()
        return count

def main():
    parser = argparse.ArgumentParser(description='应急政策文件入库脚本')
    parser.add_argument('--input', type=str, required=True, help='输入JSON文件路径')
    parser.add_argument('--db', type=str, default='policies.db', help='数据库文件路径')
    
    args = parser.parse_args()
    
    print("🚀 开始导入应急政策文件...")
    
    importer = PolicyImporter(args.db)
    
    with open(args.input, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    policies = data.get('results', data)
    
    if isinstance(policies, dict):
        policies = [policies]
    
    success_count = importer.import_policies(policies)
    total_count = importer.get_policy_count()
    
    print(f"\n📊 入库完成，成功 {success_count}/{len(policies)}")
    print(f"📚 数据库中共有 {total_count} 条政策记录")
    
    print("✅ 入库操作完成")

if __name__ == '__main__':
    import re
    main()
