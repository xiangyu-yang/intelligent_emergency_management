#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件全文检索脚本
从数据库中检索政策文件
"""

import sqlite3
import json
import argparse
import re
from typing import List, Dict

class PolicySearchEngine:
    def __init__(self, db_path: str = 'policies.db'):
        self.db_path = db_path
    
    def search(self, query: str, category: str = None, limit: int = 10) -> List[Dict]:
        """全文检索政策文件"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query_pattern = f'%{query}%'
        
        sql = '''
            SELECT id, title, summary, category, source, publishDate, url, documentType, keywords
            FROM policies 
            WHERE (title LIKE ? OR content LIKE ? OR summary LIKE ? OR keywords LIKE ?)
        '''
        
        params = [query_pattern, query_pattern, query_pattern, query_pattern]
        
        if category:
            sql += ' AND category = ?'
            params.append(category)
        
        sql += ' ORDER BY publishDate DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(sql, params)
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "id": row[0],
                "title": row[1],
                "summary": row[2],
                "category": row[3],
                "source": row[4],
                "publishDate": row[5],
                "url": row[6],
                "documentType": row[7],
                "keywords": row[8]
            })
        
        conn.close()
        return results
    
    def search_by_category(self, category: str, limit: int = 10) -> List[Dict]:
        """按分类检索"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, title, summary, category, source, publishDate, url, documentType, keywords
            FROM policies 
            WHERE category = ?
            ORDER BY publishDate DESC LIMIT ?
        ''', (category, limit))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "id": row[0],
                "title": row[1],
                "summary": row[2],
                "category": row[3],
                "source": row[4],
                "publishDate": row[5],
                "url": row[6],
                "documentType": row[7],
                "keywords": row[8]
            })
        
        conn.close()
        return results
    
    def get_policy_by_id(self, policy_id: str) -> Dict:
        """按ID获取政策详情"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, title, content, summary, category, source, publishDate, url, documentType, keywords
            FROM policies 
            WHERE id = ?
        ''', (policy_id,))
        
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "title": row[1],
                "content": row[2],
                "summary": row[3],
                "category": row[4],
                "source": row[5],
                "publishDate": row[6],
                "url": row[7],
                "documentType": row[8],
                "keywords": row[9]
            }
        
        return {}
    
    def get_statistics(self) -> Dict:
        """获取统计信息"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM policies')
        total_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT category, COUNT(*) FROM policies GROUP BY category')
        category_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        cursor.execute('SELECT documentType, COUNT(*) FROM policies GROUP BY documentType')
        type_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        cursor.execute('SELECT COUNT(*) FROM policies WHERE publishDate LIKE "2026%"')
        this_year_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "totalCount": total_count,
            "categoryStats": category_stats,
            "typeStats": type_stats,
            "thisYearCount": this_year_count
        }

def main():
    parser = argparse.ArgumentParser(description='应急政策文件全文检索脚本')
    parser.add_argument('--query', type=str, help='检索关键词')
    parser.add_argument('--category', type=str, help='政策分类')
    parser.add_argument('--id', type=str, help='政策ID')
    parser.add_argument('--stats', action='store_true', help='获取统计信息')
    parser.add_argument('--limit', type=int, default=10, help='返回数量限制')
    parser.add_argument('--db', type=str, default='policies.db', help='数据库文件路径')
    
    args = parser.parse_args()
    
    search_engine = PolicySearchEngine(args.db)
    
    if args.stats:
        stats = search_engine.get_statistics()
        print(json.dumps(stats, ensure_ascii=False, indent=2))
        return
    
    if args.id:
        policy = search_engine.get_policy_by_id(args.id)
        print(json.dumps(policy, ensure_ascii=False, indent=2))
        return
    
    if args.category:
        results = search_engine.search_by_category(args.category, args.limit)
    elif args.query:
        results = search_engine.search(args.query, args.category, args.limit)
    else:
        print("❌ 请提供 --query 或 --category 参数")
        return
    
    print(f"📊 检索到 {len(results)} 条结果")
    
    for i, policy in enumerate(results, 1):
        print(f"\n{i}. [{policy['category']}] {policy['title']}")
        print(f"   📅 {policy['publishDate']}")
        print(f"   📝 {policy['summary'][:100]}...")
        print(f"   🔗 {policy['url']}")
    
    print(f"\n✅ 检索完成，共 {len(results)} 条结果")

if __name__ == '__main__':
    main()
